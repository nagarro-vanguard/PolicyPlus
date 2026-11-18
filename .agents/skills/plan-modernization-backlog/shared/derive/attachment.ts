import type { AttachmentHeader } from "../model/header";
import type { Plan, StoryView } from "../model/plan";
import type { Facts, Place } from "./facts";
import type { Target } from "../read/target";
import type { ModernizationRequest } from "../model/request";

const placeText = (place: Place) => `${place.file}:${place.firstLine}-${place.lastLine}`;

/**
 * The typed front of a story's attachment, written from the analysis facts: each criterion with the rules it backs, what
 * the story relies on, its data, its changes of state, the outside systems, and every place cited.
 */
/** The folder of the layer that carries a component: the one carrying the stack line that names its container's technology. */
const layerFolderOf = (name: string, target: Target, request: ModernizationRequest, plan: Plan) => {
    const component = target.architecture.components.find((each) => each.name === name);
    const container = target.architecture.containers.find(
        (each) => each.kind !== "store" && each.holds.includes(component?.domain ?? ""),
    );
    const tech = container?.tech.trim().toLowerCase() ?? "";
    const lines = request.stack.flatMap((line, at) =>
        tech !== "" && line.toLowerCase().includes(tech) ? [at + 1] : [],
    );
    return plan.layers.find((layer) => layer.carries.some((n) => lines.includes(n)))?.path ?? "";
};

export const headerFor = (
    view: StoryView,
    plan: Plan,
    facts: Facts,
    extras?: { readonly target: Target; readonly request: ModernizationRequest },
): AttachmentHeader => {
    const titleOf = new Map(plan.stories.map((story) => [story.key as string, story.title]));
    const capability = facts.capabilities.find((each) => each.name === view.capability);
    const transitions = view.criteria.flatMap((c) =>
        c.from.flatMap((r) => (r._tag === "transition" ? [r.id as string] : [])),
    );
    const transitionFacts = facts.transitions.filter((t) => transitions.includes(t.id));
    const rule = (id: string) => facts.rules.get(id);
    const actionPlaces = view.actions.flatMap(
        (id) => capability?.surfaces.flatMap((s) => s.actions.filter((a) => a.id === id).map((a) => a.place)) ?? [],
    );
    const rulePlaces = view.builds.flatMap((id) => {
        const fact = rule(id);
        return fact ? [fact.place, ...fact.alsoRestsOn] : [];
    });
    return {
        story: view.key,
        fingerprint: plan.analysis.fingerprint,
        criteria: view.criteria.map((criterion, at) => ({
            ac: `AC-${at + 1}`,
            rules: criterion.from.flatMap((ref) => {
                const fact = ref._tag === "rule" ? rule(ref.id) : undefined;
                return fact ? [{ says: fact.says, where: fact.place, doubt: fact.doubt }] : [];
            }),
        })),
        reliesOn: view.reliesOn
            .map((each) => ({ says: rule(each.rule)?.says ?? "", builtBy: titleOf.get(each.builtBy) ?? "" }))
            .filter((each) => each.says !== ""),
        data: (capability?.data ?? []).map((each) => ({ kind: each.name, access: each.access })),
        transitions: transitionFacts.map((t) => ({ entity: t.entityName, from: t.from, to: t.to, where: t.place })),
        outsideSystems: [...new Set((capability?.data ?? []).flatMap((each) => each.stores))],
        ...(extras === undefined
            ? {}
            : {
                  steps: (view.steps ?? []).flatMap((id) =>
                      extras.target.journeys.flatMap((journey) =>
                          journey.steps
                              .filter((step) => step.id === id)
                              .map((step) => ({
                                  intent: step.intent,
                                  change: step.link._tag === "legacy" ? step.link.change : "new",
                                  reason: step.link.reason,
                              })),
                      ),
                  ),
                  components: (view.components ?? []).flatMap((name) => {
                      const component = extras.target.architecture.components.find((each) => each.name === name);
                      return component
                          ? [
                                {
                                    name,
                                    module: component.module,
                                    layer: layerFolderOf(name, extras.target, extras.request, plan),
                                },
                            ]
                          : [];
                  }),
              }),
        cited: [...actionPlaces, ...rulePlaces, ...transitionFacts.map((t) => t.place)],
    } as unknown as AttachmentHeader;
};

/**
 * The attachment as one markdown file: the typed header, then the same facts in words, then the screen's bundle.
 * @param header the typed header
 * @param bundle the bundle's text for the story's surface, when it was built
 * @returns the markdown
 */
export const attachmentText = (title: string, header: AttachmentHeader, bundle?: string) =>
    [
        `# Legacy reference: ${title}`,
        "",
        "The typed header below maps each criterion of the work item to the rules of the existing system it backs. The reading of the existing code follows it.",
        "",
        "## Header",
        "",
        "```json",
        JSON.stringify(header, null, 2),
        "```",
        "",
        "## What each criterion must keep",
        "",
        ...header.criteria.flatMap((criterion) => [
            `### ${criterion.ac}`,
            "",
            ...(criterion.rules.length === 0
                ? ["No single legacy rule: it describes the behaviour as a whole.", ""]
                : criterion.rules.flatMap((rule) => [
                      `- ${rule.says} (${placeText(rule.where)})${rule.doubt === "" ? "" : ` Doubt: ${rule.doubt}`}`,
                  ])),
            "",
        ]),
        ...(header.reliesOn.length === 0
            ? []
            : [
                  "## Relies on, built elsewhere",
                  "",
                  ...header.reliesOn.map((each) => `- ${each.says} Built by: ${each.builtBy}.`),
                  "",
              ]),
        "## Reading of the existing code",
        "",
        bundle ?? "The bundle for this part of the product was not built when this was written.",
        "",
    ].join("\n");
