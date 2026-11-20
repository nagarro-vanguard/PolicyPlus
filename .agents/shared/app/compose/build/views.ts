import { coverageGaps, limitGaps, textOf } from "../../../../skills/code-analysis/shared/views/guard";
import { ComposeError } from "../errors";
import type { AuthoredView } from "../inputs/view";
import type { Target } from "../inputs/target";
import type { Facts } from "./facts";

/*
 * The pictures of a case, as the model wrote them: the briefing's views of the system as it is, the chosen or recommended
 * variant's views, and each other variant's. Compose adds only what a script can: the text version of each, the name each
 * cited record goes by and, where the cited record is a place of the hierarchy, that place. Nothing is derived, named or
 * worded here about any system.
 */

const order = ["functional", "technical", "deployment"] as const;

export type Picture = {
    key: string;
    /** Where it sits: `today`, `target` or `variant.<name>`. */
    section: string;
    viewpoint: AuthoredView["viewpoint"];
    title: string;
    caption: string;
    boxes: {
        id: string;
        label: string;
        note: string | null;
        group: string | null;
        cites: { id: string; text: string; node: string | null }[];
    }[];
    arrows: { from: string; to: string; label: string | null }[];
    text: string[];
};

/**
 * What a cited id is called, from the facts, the target's own names and its steps.
 * @param facts the facts
 * @param target the target, when there is one
 * @returns the name of an id, when anything knows it
 */
const namesOf = (facts: Facts, target: Target | undefined) => {
    const names = new Map<string, string>();
    for (const list of [facts.parts, facts.layers, facts.outside, facts.entities, facts.capabilities])
        for (const each of list) names.set(each.id, each.name);
    for (const journey of target?.journeys ?? [])
        for (const step of journey.steps) names.set(step.id, step.intent);
    return names;
};

/**
 * Every picture of the case, in section and viewpoint order.
 * @param facts the facts
 * @param nodeOf the place of the hierarchy a record belongs to
 * @param target the target, when there is one
 * @returns the pictures
 */
export const viewsOf = (facts: Facts, nodeOf: ReadonlyMap<string, string>, target: Target | undefined): Picture[] => {
    const names = namesOf(facts, target);
    const picture = (section: string, number: number, view: AuthoredView): Picture => ({
        key: `${section}/${number}`,
        section,
        viewpoint: view.viewpoint,
        title: view.title,
        caption: view.caption,
        boxes: view.boxes.map((box) => ({
            id: box.id,
            label: box.label,
            note: box.note ?? null,
            group: box.group ?? null,
            cites: (box.cites ?? []).map((id) => ({ id, text: names.get(id) ?? id, node: nodeOf.get(id) ?? null })),
        })),
        arrows: view.arrows.map((arrow) => ({ from: arrow.from, to: arrow.to, label: arrow.label ?? null })),
        text: textOf(view),
    });
    const sections: [string, readonly AuthoredView[]][] = [
        ["today", facts.views],
        ["target", target?.architecture?.views ?? []],
        ...(target?.alternatives ?? [])
            .filter((each) => each.name !== target?.architecture?.name)
            .map((each) => [`variant.${each.name}`, each.views ?? []] as [string, readonly AuthoredView[]]),
    ];
    const pictures = sections.flatMap(([section, views]) =>
        order
            .flatMap((viewpoint) => views.filter((view) => view.viewpoint === viewpoint))
            .map((view, number) => picture(section, number, view)),
    );
    // What a script can check without drawing: every text is short enough to be placed, and the text version holds every
    // box and arrow. That no label covers another is the renderer's layout, which places each label in room it reserved.
    const gaps = pictures.flatMap((each) => {
        const view = {
            viewpoint: each.viewpoint,
            title: each.title,
            caption: each.caption,
            boxes: each.boxes.map((box) => ({ id: box.id, label: box.label, note: box.note ?? undefined })),
            arrows: each.arrows.map((arrow) => ({ from: arrow.from, to: arrow.to, label: arrow.label ?? undefined })),
        };
        const where = `${each.section} view "${each.title}"`;
        return [...limitGaps(view, where), ...coverageGaps(view, each.text, where)];
    });
    if (gaps.length > 0) throw new ComposeError("build", `a view cannot be drawn as written:\n${gaps.join("\n")}`);
    return pictures;
};
