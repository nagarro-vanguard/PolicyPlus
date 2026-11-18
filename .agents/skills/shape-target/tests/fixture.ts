import { Schema } from "effect";
import type { LegacySheet } from "../shared/derive/legacy";
import { journeyId, stepId } from "../shared/model/ids";
import { Architecture, Component, Journey, Task, type StoredJourney } from "../shared/model/records";

/** A small legacy system: two tasks, three entry points, three rules, two kinds of data, one outside system. */
export const legacy: LegacySheet = {
    fingerprint: "fixture",
    purpose: "Edits policy settings.",
    capabilities: [{ id: "capability-1", name: "Browsing", purpose: "Look through policies." }],
    actions: {
        "block-1": {
            what: "Opens the details of a policy.",
            name: "OpenDetail",
            startedBy: "person",
            surface: "DetailPolicy",
            owner: "capability-1",
            rules: ["businessrule-1"],
            place: { file: "A.vb", firstLine: 1, lastLine: 5 },
        },
        "block-2": {
            what: "Saves a comment on a policy.",
            name: "SaveComment",
            startedBy: "person",
            surface: "DetailPolicy",
            owner: "capability-1",
            rules: ["businessrule-2"],
            place: { file: "A.vb", firstLine: 6, lastLine: 9 },
        },
        "block-3": {
            what: "Loads the template files of a folder.",
            name: "LoadFolder",
            startedBy: "person",
            surface: "OpenFolder",
            owner: "capability-1",
            rules: ["businessrule-3"],
            place: { file: "B.vb", firstLine: 1, lastLine: 9 },
        },
    },
    rules: {
        "businessrule-1": {
            statement: "A policy shows its name and state.",
            owner: "capability-1",
            place: { file: "A.vb", firstLine: 2, lastLine: 3 },
        },
        "businessrule-2": {
            statement: "A comment longer than 200 characters is refused.",
            owner: "capability-1",
            place: { file: "A.vb", firstLine: 7, lastLine: 8 },
        },
        "businessrule-3": {
            statement: "A template file without a revision is refused as invalid.",
            owner: "capability-1",
            place: { file: "B.vb", firstLine: 3, lastLine: 4 },
        },
    },
    entities: {
        "entity-1": { name: "Policy", states: [] },
        "entity-2": { name: "Template file", states: ["Loaded", "Refused"] },
    },
    externals: { "external-1": { name: "Template files on disk", kind: "dataStore" } },
    unreached: 0,
    identifiers: ["DetailPolicy", "OpenFolder", "OpenDetail", "SaveComment", "LoadFolder", "A.vb", "B.vb"],
};

export const stack = ["language and runtime: TypeScript on Bun", "data: PostgreSQL through an ORM"];

const raw = (prefix: string) => {
    const t1 = `${prefix}t1`;
    const t2 = `${prefix}t2`;
    const tasks = [
        {
            id: t1,
            outcome: "Review a policy and note a comment on it",
            actor: "person",
            actions: ["block-1", "block-2"],
            rules: ["businessrule-1", "businessrule-2"],
            facts: ["entity-1"],
            needs: [],
            current: [
                { intent: "Open the policy", system: "Shows the policy", from: ["block-1"], confidence: "sure" },
                { intent: "Write the comment", system: "Stores the comment", from: ["block-2"], confidence: "sure" },
                { intent: "Check both", system: "Shows both", from: ["block-1", "block-2"], confidence: "inferred" },
            ],
        },
        {
            id: t2,
            outcome: "Make the templates of a folder available",
            actor: "person",
            actions: ["block-3"],
            rules: ["businessrule-3"],
            facts: ["entity-2"],
            needs: ["external-1"],
            current: [
                { intent: "Choose the folder", system: "Loads its templates", from: ["block-3"], confidence: "sure" },
            ],
        },
    ];
    const step = (over: Record<string, unknown>) => ({ confidence: "sure", touches: [], honours: [], ...over });
    const legacyLink = (from: string[], change: string, keeps: string[]) => ({
        _tag: "legacy",
        from,
        change,
        reason: "fewer steps for the same result",
        keeps,
    });
    const variant = (
        task: string,
        name: string,
        extra: Record<string, unknown>,
        steps: unknown[],
        drops: unknown[] = [],
    ) => ({
        task,
        actor: "person",
        name,
        strategy: "task first",
        idea: `${name} way of doing it`,
        tradeoff: "less visible detail",
        steps,
        drops,
        ...extra,
    });
    const journeys = [
        variant(t1, "streamlined", { recommended: "one step does what three did" }, [
            step({
                intent: "Review the policy and note a comment",
                system: "Shows the policy and stores a valid comment",
                touches: ["entity-1"],
                honours: ["businessrule-1", "businessrule-2"],
                link: legacyLink(["block-1", "block-2"], "merged", ["businessrule-1", "businessrule-2"]),
            }),
        ]),
        variant(t1, "guided", {}, [
            step({
                intent: "Review the policy",
                system: "Shows the policy",
                touches: ["entity-1"],
                honours: ["businessrule-1"],
                link: legacyLink(["block-1"], "kept", ["businessrule-1"]),
            }),
            step({
                intent: "Note a comment",
                system: "Stores a valid comment",
                touches: ["entity-1"],
                honours: ["businessrule-2"],
                link: legacyLink(["block-2"], "kept", ["businessrule-2"]),
            }),
        ]),
        variant(t2, "automatic", { recommended: "templates are found without being asked" }, [
            step({
                intent: "Make the templates available",
                system: "Reads the templates and refuses invalid ones",
                touches: ["entity-2"],
                honours: ["businessrule-3"],
                link: legacyLink(["block-3"], "inferred", ["businessrule-3"]),
            }),
        ]),
        variant(t2, "asked", {}, [
            step({
                intent: "Choose where the templates are",
                system: "Reads the templates and refuses invalid ones",
                touches: ["entity-2"],
                honours: ["businessrule-3"],
                link: legacyLink(["block-3"], "kept", ["businessrule-3"]),
            }),
        ]),
    ];
    const copyOfToday = variant(t1, "copy", {}, [
        step({
            intent: "Open the policy",
            system: "Shows the policy",
            touches: ["entity-1"],
            honours: ["businessrule-1"],
            link: legacyLink(["block-1"], "kept", ["businessrule-1"]),
        }),
        step({
            intent: "Write the comment",
            system: "Stores the comment",
            touches: ["entity-1"],
            honours: ["businessrule-2"],
            link: legacyLink(["block-2"], "kept", ["businessrule-2"]),
        }),
        step({
            intent: "Check both",
            system: "Shows both",
            touches: ["entity-1"],
            honours: ["businessrule-1"],
            link: legacyLink(["block-1", "block-2"], "kept", ["businessrule-1", "businessrule-2"]),
        }),
    ]);
    const architecture = (name: string, split: boolean, recommended: boolean) => ({
        name,
        idea: split ? "an interface and a service apart" : "one application with a module per domain",
        risks: ["more to run"],
        tradeoff: split ? "more parts" : "one deployment",
        ...(recommended ? { recommended: "fits a small team" } : {}),
        integrations: [{ need: "external-1", domain: "Templates", how: "reads the files of a folder" }],
        domains: [
            {
                name: "Policies",
                concept: "a policy and its comments",
                facts: [
                    {
                        name: "Policy",
                        from: ["entity-1"],
                        keys: ["policy name"],
                        relates: [{ to: "Template", how: "defined by" }],
                    },
                ],
                rules: ["businessrule-1", "businessrule-2"],
                dependsOn: ["Templates"],
                why: "owns what people edit",
            },
            {
                name: "Templates",
                concept: "the definitions policies come from",
                facts: [{ name: "Template", from: ["entity-2"], keys: ["file name"], relates: [] }],
                rules: ["businessrule-3"],
                dependsOn: [],
                why: "owns what is loaded",
            },
        ],
        containers: split
            ? [
                  { name: "interface", kind: "interface", tech: "TypeScript", holds: ["Policies"] },
                  { name: "service", kind: "service", tech: "TypeScript on Bun", holds: ["Templates"] },
              ]
            : [{ name: "application", kind: "service", tech: "TypeScript on Bun", holds: ["Policies", "Templates"] }],
    });
    return {
        tasks,
        journeys,
        copyOfToday,
        architectures: [architecture("modular", false, true), architecture("split", true, false)],
    };
};

export const build = (prefix = "") => {
    const r = raw(prefix);
    const tasks = Schema.decodeUnknownSync(Schema.Array(Task))(r.tasks);
    const variants = Schema.decodeUnknownSync(Schema.Array(Journey))(r.journeys);
    const store = (journey: (typeof variants)[number]): StoredJourney => {
        const id = journeyId(journey.task, journey.name);
        return {
            ...journey,
            id,
            task: journey.task as StoredJourney["task"],
            baseline: false,
            steps: journey.steps.map((each, at) => ({
                ...each,
                id: stepId(id, at + 1) as StoredJourney["steps"][number]["id"],
            })),
        };
    };
    const chosen = [variants[0], variants[2]].flatMap((each) => (each === undefined ? [] : [store(each)]));
    const architectures = Schema.decodeUnknownSync(Schema.Array(Architecture))(r.architectures);
    const [t1Step] = chosen[0]?.steps ?? [];
    const [t2Step] = chosen[1]?.steps ?? [];
    const components = Schema.decodeUnknownSync(Schema.Array(Component))([
        {
            name: "template-reader",
            domain: "Templates",
            responsibility: "reads and validates template files",
            module: "template-reader",
            uses: [],
            serves: [t2Step?.id],
            enforces: ["businessrule-3"],
            adapts: "external-1",
        },
        {
            name: "policy-service",
            domain: "Policies",
            responsibility: "shows policies and keeps their comments",
            module: "policy-service",
            uses: ["template-reader"],
            serves: [t1Step?.id],
            enforces: ["businessrule-1", "businessrule-2"],
        },
    ]);
    return {
        tasks,
        variants,
        chosen,
        architectures,
        components,
        copy: Schema.decodeUnknownSync(Journey)(r.copyOfToday),
    };
};
