import type { Gate, GateView } from "./confirmation";
// The records of the target the pages are built from: what the shape-target skill writes, narrowed to what the pages
// read. Nothing here imports the skill; the contract is the files.
export type Step = {
    readonly id: string;
    readonly intent: string;
    readonly system: string;
    readonly confidence: string;
    readonly touches: readonly string[];
    readonly honours: readonly string[];
    readonly link:
        | { readonly _tag: "legacy"; readonly from: readonly string[]; readonly change: string; readonly reason: string; readonly keeps: readonly string[] }
        | { readonly _tag: "new"; readonly reason: string };
};
export type Journey = {
    readonly id: string;
    readonly task: string;
    readonly actor: string;
    readonly name: string;
    readonly strategy: string;
    readonly idea: string;
    readonly tradeoff: string;
    readonly recommended?: string | undefined;
    readonly baseline: boolean;
    readonly steps: readonly Step[];
    readonly drops: readonly { readonly actions: readonly string[]; readonly rules: readonly string[]; readonly reason: string }[];
};
export type CurrentStep = { readonly intent: string; readonly system: string; readonly from: readonly string[]; readonly confidence: string };
export type Task = {
    readonly id: string;
    readonly outcome: string;
    readonly actor: string;
    readonly actions: readonly string[];
    readonly rules: readonly string[];
    readonly facts: readonly string[];
    readonly needs: readonly string[];
    readonly current: readonly CurrentStep[];
};
export type Fact = { readonly name: string; readonly from: readonly string[]; readonly keys: readonly string[]; readonly relates: readonly { readonly to: string; readonly how: string }[] };
export type Domain = { readonly name: string; readonly concept: string; readonly facts: readonly Fact[]; readonly rules: readonly string[]; readonly dependsOn: readonly string[]; readonly why: string };
export type Container = { readonly name: string; readonly kind: string; readonly tech: string; readonly holds: readonly string[] };
export type Component = {
    readonly name: string;
    readonly domain: string;
    readonly responsibility: string;
    readonly module: string;
    readonly uses: readonly string[];
    readonly serves: readonly string[];
    readonly enforces: readonly string[];
    readonly adapts?: string | undefined;
    readonly platform?: string | undefined;
};
export type Architecture = {
    readonly name: string;
    readonly idea: string;
    readonly risks: readonly string[];
    readonly tradeoff: string;
    readonly recommended?: string | undefined;
    readonly integrations: readonly { readonly need: string; readonly domain: string; readonly how: string }[];
    readonly domains: readonly Domain[];
    readonly containers: readonly Container[];
    readonly components?: readonly Component[] | undefined;
    readonly score?: { readonly steps: number; readonly stepsServed: number; readonly rules: number; readonly rulesAssigned: number; readonly idleDomains: readonly string[] } | undefined;
};
export type Legacy = {
    readonly actions: Readonly<Record<string, { readonly what: string; readonly surface: string }>>;
    readonly rules: Readonly<Record<string, { readonly statement: string }>>;
    readonly entities: Readonly<Record<string, { readonly name: string; readonly states: readonly string[] }>>;
    readonly externals: Readonly<Record<string, { readonly name: string; readonly kind: string }>>;
};
export type Choice = { readonly decision: string; readonly picks: readonly { readonly of: string; readonly variant: string }[]; readonly reason: string; readonly confirmedAt: string; readonly marks?: readonly { readonly of: string; readonly verdict: string; readonly note?: string }[] };
export type TargetData = {
    readonly legacy: Legacy | undefined;
    readonly tasks: readonly Task[];
    readonly variants: readonly Journey[];
    readonly journeys: readonly Journey[];
    readonly architectureVariants: readonly Architecture[];
    readonly architecture: Architecture | undefined;
    readonly choiceAsIs: Choice | undefined;
    readonly choiceJourneys: Choice | undefined;
    readonly choiceArchitecture: Choice | undefined;
    readonly gates: Record<Gate, GateView>;
    readonly root: string;
};
