import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Schema } from "effect";
import type { Layout } from "../model/layout";
import { Plan } from "../model/plan";
import type { ModernizationRequest } from "../model/request";
import { layerAgentsMd, rootAgentsMd } from "./agents-md";
import { contextOf, sourceReaderOf } from "./attachment";
import { epicBody, storyBody } from "./bodies";
import { choicesText } from "./choices-text";
import type { Facts } from "./facts";
import type { Target } from "../read/target";

type ManifestItem = {
    readonly key: string;
    readonly file: string;
    readonly kind: "epic" | "story";
    readonly title: string;
    readonly parent: string | null;
    readonly blockedBy: readonly string[];
    readonly comesAfter: readonly string[];
    readonly sequence: number;
    readonly phase: number;
    readonly body: string;
    readonly attachment: string | null;
};

const slug = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
/** The name a bundle file has for one surface of one capability: the contract with code-analysis's batch mode. */
/**
 * The texts the analysis wrote for the places of one kind, by the capability and the place they belong to.
 * @param layout the run's folders
 * @param kind the kind of place (a screen is `surface`)
 * @returns each text by `<capability id>|<place key>`; empty when the analysis wrote none
 */
export const analysisContexts = (layout: Layout, kind: string) => {
    const folder = join(layout.analysis, "contexts");
    const out = new Map<string, string>();
    if (!existsSync(join(folder, "index.json"))) return out;
    const index = JSON.parse(readFileSync(join(folder, "index.json"), "utf8")) as {
        kind: string;
        keys: Record<string, string>;
        file: string;
    }[];
    for (const entry of index)
        if (entry.kind === kind) out.set(`${entry.keys.capability}|${entry.keys.surface}`, readFileSync(join(folder, entry.file), "utf8"));
    return out;
};

export const bundleName = (surface: string, capability: string) => `screen-${slug(surface)}--${slug(capability)}.md`;
const write = (path: string, text: string) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`);
};

/** Removes the markdown files of a folder that this build did not write. */
const prune = (folder: string, written: ReadonlySet<string>) => {
    if (!existsSync(folder)) return;
    for (const name of readdirSync(folder))
        if (name.endsWith(".md") && !written.has(name)) rmSync(join(folder, name), { force: true });
};

/**
 * The context of every story, written once from the plan, the analysis facts, the legacy code and the readings of the
 * analysis, and what is wrong with any of them.
 * @returns each story's text by key, the problems that stop the plan, and what could not be checked
 */
export const contextsOf = (
    layout: Layout,
    plan: Plan,
    facts: Facts,
    request: ModernizationRequest,
    target?: Target,
) => {
    const source = sourceReaderOf(request.sourceRoots);
    const surfaceContexts = analysisContexts(layout, "surface");
    const surfaceOf = new Map(
        facts.capabilities.flatMap((c) =>
            c.surfaces.flatMap((s) =>
                s.actions.map((a) => [a.id, { name: s.name, key: `${c.id}|${s.key}` }] as const),
            ),
        ),
    );
    const texts = new Map<string, string>();
    const problems: string[] = [];
    for (const story of plan.stories) {
        const surfaces = [
            ...new Map(
                story.actions.flatMap((id) => surfaceOf.get(id as string) ?? []).map((each) => [each.key, each]),
            ).values(),
        ];
        const readings = surfaces.flatMap(({ name, key }) => {
            const text = surfaceContexts.get(key);
            return text === undefined ? [] : [{ title: name, text }];
        });
        const made = contextOf(story, { plan, facts, request, target, source, readings });
        texts.set(story.key, made.text);
        problems.push(...made.problems);
    }
    return {
        texts,
        problems,
        advisory: source.readable
            ? []
            : ["the legacy code could not be read, so the places the contexts cite were not checked"],
    };
};

/**
 * Writes everything the plan hands on: `plan.json`, the manifest of stories with their bodies and contexts, and the
 * AGENTS.md of every layer as a preview. The bodies and contexts of stories no longer in the plan are removed.
 * Nothing here is written by an agent.
 * @param layout the run's folders
 * @param plan the plan
 * @param contexts each story's context, by key
 * @param request the request
 * @returns the manifest's items
 */
export const publishPlan = (
    layout: Layout,
    plan: Plan,
    contexts: ReadonlyMap<string, string>,
    request: ModernizationRequest,
) => {
    write(layout.plan, JSON.stringify(Schema.encodeSync(Plan)(plan), null, 2));
    const items: ManifestItem[] = [];
    const bodies = new Set<string>();
    const attachments = new Set<string>();
    for (const epic of plan.epics) {
        const key = `epic-${slug(epic.key)}`;
        items.push({
            key: epic.key,
            file: key,
            kind: "epic",
            title: epic.title,
            parent: null,
            blockedBy: [],
            comesAfter: epic.comesAfter,
            sequence: epic.sequence,
            phase: 0,
            body: `bodies/${key}.md`,
            attachment: null,
        });
        write(join(layout.bodies, `${key}.md`), `# ${epic.title}\n\n${epicBody(epic, plan)}`);
        bodies.add(`${key}.md`);
    }
    for (const story of plan.stories) {
        write(join(layout.bodies, `${story.key}.md`), `# ${story.title}\n\n${storyBody(story, plan)}`);
        write(join(layout.attachments, `${story.key}.md`), contexts.get(story.key) ?? "");
        bodies.add(`${story.key}.md`);
        attachments.add(`${story.key}.md`);
        items.push({
            key: story.key,
            file: story.key,
            kind: "story",
            title: story.title,
            parent: story.epic,
            blockedBy: story.blockedBy,
            comesAfter: [],
            sequence: story.sequence,
            phase: story.phase,
            body: `bodies/${story.key}.md`,
            attachment: `attachments/${story.key}.md`,
        });
    }
    write(layout.manifest, JSON.stringify({ analysis: plan.analysis, items }, null, 2));
    for (const layer of plan.layers)
        write(join(layout.agentsFiles, slug(layer.name), "AGENTS.md"), layerAgentsMd(layer, request, plan.decisions));
    write(join(layout.agentsFiles, "AGENTS.md"), rootAgentsMd(request, plan.layers, plan.decisions));
    prune(layout.bodies, bodies);
    prune(layout.attachments, attachments);
    return items;
};

/**
 * Writes the choices text and its index beside the stories' contexts, where the app collects it.
 * @param layout the run's folders
 * @param plan the plan
 */
export const writeChoices = (layout: Layout, plan: Plan) => {
    const folder = join(layout.outputRoot, "work-items", "contexts");
    mkdirSync(join(folder, "choices"), { recursive: true });
    writeFileSync(join(folder, "choices", "00001.md"), choicesText(layout, plan));
    writeFileSync(
        join(folder, "index.json"),
        `${JSON.stringify([{ kind: "choices", keys: { id: "choices" }, file: "choices/00001.md" }], null, 2)}\n`,
    );
};
