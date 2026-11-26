import { existsSync, readFileSync } from "node:fs";
import { Schema } from "effect";
import type { Layout } from "../model/layout";

/*
 * What the plan reads of a confirmed target: only the files shape-target writes, only the fields it uses. Nothing here
 * imports that skill; the contract is the files.
 */
const Step = Schema.Struct({
    id: Schema.String,
    intent: Schema.String,
    system: Schema.String,
    touches: Schema.Array(Schema.String),
    honours: Schema.Array(Schema.String),
    // Written by shape-target since steps may change a rule; older journeys have none.
    changes: Schema.optionalKey(Schema.Array(Schema.Struct({ rule: Schema.String, to: Schema.String }))),
    link: Schema.Union([
        Schema.Struct({
            _tag: Schema.Literal("legacy"),
            from: Schema.Array(Schema.String),
            change: Schema.String,
            reason: Schema.String,
            keeps: Schema.Array(Schema.String),
        }),
        Schema.Struct({ _tag: Schema.Literal("new"), reason: Schema.String }),
    ]),
});
const Journey = Schema.Struct({
    id: Schema.String,
    task: Schema.String,
    name: Schema.String,
    idea: Schema.String,
    steps: Schema.Array(Step),
    drops: Schema.Array(
        Schema.Struct({
            actions: Schema.Array(Schema.String),
            rules: Schema.Array(Schema.String),
            reason: Schema.String,
        }),
    ),
});
const Component = Schema.Struct({
    name: Schema.String,
    domain: Schema.String,
    responsibility: Schema.String,
    module: Schema.String,
    uses: Schema.Array(Schema.String),
    serves: Schema.Array(Schema.String),
    enforces: Schema.Array(Schema.String),
    adapts: Schema.optionalKey(Schema.String),
    platform: Schema.optionalKey(Schema.String),
    // What kind of part it is (rules, adapter, data, flow, screen), when the architecture says; older ones do not.
    kind: Schema.optionalKey(Schema.String),
});
const Architecture = Schema.Struct({
    name: Schema.String,
    containers: Schema.Array(
        Schema.Struct({
            name: Schema.String,
            kind: Schema.String,
            tech: Schema.String,
            holds: Schema.Array(Schema.String),
        }),
    ),
    components: Schema.Array(Component),
    // Written by shape-target since the architecture answers each goal of the request; older ones have none.
    goals: Schema.optionalKey(
        Schema.Array(Schema.Struct({ goal: Schema.Int, how: Schema.String, where: Schema.Array(Schema.String) })),
    ),
});
const Tasks = Schema.Struct({ tasks: Schema.Array(Schema.Struct({ id: Schema.String, outcome: Schema.String })) });

export type TargetStep = typeof Step.Type;
export type TargetJourney = typeof Journey.Type;
export type TargetComponent = typeof Component.Type;
export type Target = {
    readonly journeys: readonly TargetJourney[];
    readonly architecture: typeof Architecture.Type;
    /** What each task gets done, by task id. */
    readonly outcomes: ReadonlyMap<string, string>;
};

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as unknown;

/**
 * The confirmed target, when there is one: the chosen journeys and the architecture with its components. A run without
 * `target/architecture.json` is planned from the analysis alone.
 * @param layout the run's folders
 * @returns the target, or nothing
 */
export const loadTarget = (layout: Layout): Target | undefined => {
    if (!existsSync(layout.targetArchitecture) || !existsSync(layout.targetJourneys)) return undefined;
    const tasks = existsSync(layout.targetTasks)
        ? Schema.decodeUnknownSync(Tasks)(readJson(layout.targetTasks)).tasks
        : [];
    return {
        journeys: Schema.decodeUnknownSync(Schema.Array(Journey))(readJson(layout.targetJourneys)),
        architecture: Schema.decodeUnknownSync(Architecture)(readJson(layout.targetArchitecture)),
        outcomes: new Map(tasks.map((task) => [task.id, task.outcome])),
    };
};
