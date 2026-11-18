import type { Analysis } from "../read/analysis";
import type { ModernizationRequest } from "../model/request";
import type { Decision, Story, TargetLayer } from "../model/records";
import type { Facts } from "./facts";

const brand = <T>(value: unknown) => value as T;
const chunks = <T>(items: readonly T[], size: number) =>
    Array.from({ length: Math.ceil(items.length / size) }, (_, at) => items.slice(at * size, at * size + size));

/**
 * Records written without agents, so the rest of the pipeline can be run and tested on a real analysis: one layer per
 * stack line, one decision of every kind the gates ask for, and stories that cover every action and rule with generic
 * wording. The wording is deliberately plain; agents write the real ones.
 */
export const standin = (analysis: Analysis, facts: Facts, request: ModernizationRequest) => {
    const layers: TargetLayer[] = request.stack.map((line, at) =>
        brand<TargetLayer>({
            id: `layer-standin-${at + 1}`,
            name: `layer ${at + 1}`,
            path: `layers/layer-${at + 1}`,
            kind: "code",
            purpose: `stand-in for the stack line: ${line.slice(0, 40)}`,
            carries: [at + 1],
            check: "true",
            dependsOn: [],
        }),
    );
    let n = 0;
    const decision = (topic: Decision["topic"], chose: string, layer: Decision["layer"] = "workspace"): Decision =>
        brand<Decision>({
            id: `decision-standin-${++n}`,
            topic,
            layer,
            chose,
            reason: "A stand-in decision, made without an agent, so the pipeline can be exercised.",
        });
    const decisions: Decision[] = [
        ...analysis.capabilities.map((c) => decision({ _tag: "scope", capability: c.capability.name }, "carry")),
        ...analysis.system.externals.map((e) =>
            decision({ _tag: "integration", system: e.name }, "an adapter in its own layer"),
        ),
        ...request.notes.map((_, at) => decision({ _tag: "note", number: at + 1 }, "honoured by the stand-in")),
        ...layers.map((layer) =>
            decision({ _tag: "convention" }, "Keep this layer free of other layers' details.", layer.id),
        ),
        decision({ _tag: "area", name: "libraries" }, "the libraries the stack names"),
        decision({ _tag: "area", name: "environment" }, "build, checks and local setup"),
    ];
    const stories: Story[] = [];
    for (const area of decisions.filter((d) => d.topic._tag === "area")) {
        const name = area.topic._tag === "area" ? area.topic.name : "";
        stories.push(
            brand<Story>({
                title: `Set up ${name}`,
                what: `${name} are in place as decided`,
                why: `later stories rely on ${name}`,
                actions: [],
                terms: [],
                criteria: [
                    {
                        says: `Given a fresh checkout, when the ${name} are used, then they work as decided.`,
                        from: [{ _tag: "decision", id: area.id }],
                    },
                ],
            }),
        );
    }
    for (const [at, group] of chunks(facts.shared, 36).entries()) {
        stories.push(
            brand<Story>({
                title: `Build the shared rules, part ${at + 1}`,
                what: "the rules several capabilities share",
                why: "every capability can rely on them",
                actions: [],
                terms: [],
                criteria: chunks(group, 3).map((rules) => ({
                    says: `Given the shared behaviour, when it is used, then ${rules.length} related rules hold as they do today.`,
                    from: rules.map((id) => ({ _tag: "rule", id })),
                })),
            }),
        );
    }
    const transitionsLeft = new Map(facts.transitions.map((t) => [t.id, t]));
    for (const capability of facts.capabilities) {
        const entities = new Set(capability.data.map((d) => d.id));
        for (const [number, surface] of capability.surfaces.entries()) {
            const mine = [...transitionsLeft.values()].filter((t) => entities.has(t.entity)).slice(0, 5);
            for (const t of mine) transitionsLeft.delete(t.id);
            const owned = chunks(
                surface.owned,
                Math.max(1, Math.ceil(surface.owned.length / Math.max(1, 12 - mine.length))),
            );
            const criteria = [
                ...owned.map((rules) => ({
                    says: `Given the existing behaviour of part ${number + 1}, when someone uses it, then ${rules.length} related rules hold as they do today.`,
                    from: rules.map((id) => ({ _tag: "rule", id })),
                })),
                ...mine.map((t) => ({
                    says: `Given a ${t.entityName.toLowerCase()} that is ${t.from}, when it moves on, then it becomes ${t.to}.`,
                    from: [{ _tag: "transition", id: t.id }],
                })),
            ];
            if (criteria.length === 0)
                criteria.push({
                    says: `Given part ${number + 1}, when someone uses it, then it behaves as it does today.`,
                    from: [],
                });
            stories.push(
                brand<Story>({
                    title: `Carry over ${capability.name.toLowerCase()}, part ${number + 1}`.slice(0, 72),
                    what: `use part ${number + 1} of ${capability.name.toLowerCase()} as people do today`,
                    why: "they keep working as they always have",
                    actions: surface.actions.map((a) => a.id),
                    terms: [],
                    criteria: criteria.slice(0, 12),
                }),
            );
        }
    }
    return { layers, decisions, stories };
};
