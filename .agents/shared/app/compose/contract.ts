import { z } from "zod";
import { viewpoints } from "./build/views";
import { foldKinds, levels } from "./build/hierarchy";
import { workLabels, type WorkLabel } from "./build/work";

/*
 * The contract of `case/`: one schema per file. `compose` checks every file against its schema before writing it, and
 * writes the JSON Schema of each beside the files, so the app's loader reads `case/` alone. CONTRACT.md explains each.
 * The version goes up when a file changes in a way an older reader would misread.
 */

export const caseContractVersion = 1;

const S = z.string();
const N = z.number();
const Ids = z.array(z.string());
const Noun = z.strictObject({ one: S, many: S });
const Place = z.strictObject({ file: S, firstLine: N, lastLine: N });

export const NumberEntry = z.strictObject({
    key: S,
    value: N,
    noun: Noun,
    scope: S.min(1),
    source: S.min(1),
    parts: z.array(z.strictObject({ kind: S, value: N, noun: Noun })).optional(),
});

const Row = z.strictObject({
    node: S.optional(),
    fact: z.strictObject({ collection: S, id: S }).optional(),
    text: S.optional(),
    count: S.optional(),
    risk: S.optional(),
    kind: S.optional(),
});

export const Node = z.strictObject({
    key: S,
    level: z.enum(levels),
    name: S,
    summary: S,
    noun: Noun,
    ref: z.strictObject({ collection: S, id: S }).nullable(),
    crumbs: Ids,
    up: S.nullable(),
    prev: S.nullable(),
    next: S.nullable(),
    facts: Ids.max(3),
    children: z.strictObject({ level: z.enum(levels).nullable(), rows: z.array(Row) }),
    folds: z.array(z.strictObject({ kind: z.enum(foldKinds), rows: z.array(Row) })),
    lateral: z.array(
        z.strictObject({
            relation: z.enum(["alsoUsedBy", "livesIn", "usedBy", "reachedFrom", "decidedFor"]),
            node: S,
            count: S.optional(),
        }),
    ),
});

const facts = {
    system: z.strictObject({
        name: S,
        repository: S.nullable(),
        commit: S.nullable(),
        purpose: S,
        summary: S,
        technologies: Ids,
    }),
    kinds: z.array(z.strictObject({ id: S, noun: Noun, means: S })),
    areas: z.array(z.strictObject({ id: S, slug: S, name: S, purpose: S, summary: S, capabilities: Ids })),
    capabilities: z.array(
        z.strictObject({
            id: S,
            slug: S,
            name: S,
            purpose: S,
            summary: S,
            area: S.nullable(),
            actions: Ids,
            rules: Ids,
            surfaces: Ids,
            data: z.array(z.strictObject({ entity: S, name: S, access: S })),
            openPoints: Ids,
            declared: z.strictObject({ actions: N, rules: N, totalsActions: N, totalsRules: N }),
        }),
    ),
    surfaces: z.array(
        z.strictObject({
            key: S,
            slug: S,
            name: S,
            purpose: S,
            summary: S,
            kind: S,
            noun: Noun,
            unnamed: z.boolean(),
            product: z.boolean(),
            test: z.boolean(),
            files: Ids,
            capabilities: Ids,
            actions: Ids,
            reachedByTests: Ids,
            part: S.nullable(),
            declared: z.strictObject({ actions: N, rules: N }),
        }),
    ),
    actions: z.array(
        z.strictObject({
            id: S,
            slug: S,
            name: S,
            purpose: S,
            summary: S,
            startedBy: S,
            capability: S.nullable(),
            surface: S.nullable(),
            layer: S.nullable(),
            path: Ids,
            rules: Ids,
            place: Place,
            tooling: z.boolean(),
            part: S.nullable(),
        }),
    ),
    rules: z.array(
        z.strictObject({
            id: S,
            slug: S,
            says: S,
            gates: z.boolean(),
            place: Place,
            alsoRestsOn: z.array(Place),
            reading: S,
            why: S,
            capabilities: Ids,
            layer: S.nullable(),
            reachedByTests: Ids,
            actions: Ids,
        }),
    ),
    risks: z.array(
        z.strictObject({
            id: S,
            statement: S,
            summary: S,
            severity: S,
            category: S,
            categoryWords: S,
            capabilities: Ids,
            parts: Ids,
            files: Ids,
            surfaces: Ids,
            breadth: N,
            rank: N,
        }),
    ),
    entities: z.array(z.strictObject({ id: S, slug: S, name: S, purpose: S, capabilities: Ids })),
    layers: z.array(z.strictObject({ id: S, name: S, role: S, purpose: S, group: S, product: z.boolean() })),
    outside: z.array(
        z.strictObject({
            id: S,
            name: S,
            kind: S,
            links: N,
            reach: z.array(z.strictObject({ layer: S, access: S, links: N })),
        }),
    ),
    parts: z.array(
        z.strictObject({
            id: S,
            slug: S,
            name: S,
            kind: S,
            purpose: S,
            summary: S,
            folders: Ids,
            product: z.boolean(),
        }),
    ),
    terms: z.array(z.strictObject({ term: S, means: S, from: S })),
    lifecycles: z.array(
        z.strictObject({ entity: S, name: S, states: Ids, transitions: z.array(z.strictObject({ from: S, to: S })) }),
    ),
};

const View = z.strictObject({
    key: S,
    section: S,
    viewpoint: z.enum(viewpoints),
    title: S,
    caption: S.nullable(),
    nodes: z.array(
        z.strictObject({
            id: S,
            label: S,
            kind: z.enum(["system", "store", "outside", "plain"]),
            kindWords: S,
            group: S.nullable(),
            sentence: S.nullable(),
        }),
    ),
    groups: z.array(z.strictObject({ id: S, words: S })),
    edges: z.array(z.strictObject({ from: S, to: S, relation: S })),
    legend: z.array(z.strictObject({ relation: S, words: S })),
    text: Ids,
    shown: z.boolean(),
});

const TodayJourney = z.strictObject({
    id: S,
    slug: S,
    title: S,
    capability: S.nullable(),
    outcome: S,
    actor: S,
    actions: Ids,
    rules: Ids,
    steps: z.array(z.strictObject({ number: N, intent: S, system: S, from: Ids, confidence: S })),
});

const RuleChange = z.strictObject({ rule: S, to: S });
const ProposedJourney = z.strictObject({
    id: S,
    task: S,
    slug: S,
    name: S,
    actor: S,
    strategy: S,
    idea: S,
    tradeoff: S,
    recommended: S.nullable(),
    steps: z.array(
        z.strictObject({
            id: S,
            number: N,
            intent: S,
            system: S,
            confidence: S,
            change: S,
            reason: S,
            from: Ids,
            touches: Ids,
            honours: Ids,
            kept: Ids,
            changes: z.array(RuleChange),
        }),
    ),
    drops: z.array(z.strictObject({ actions: Ids, rules: Ids, reason: S })),
    dropped: Ids,
    /** Each step of today and the steps of this way that do its work. */
    pairs: z.array(z.strictObject({ today: N, proposed: N })),
    hasChanges: z.boolean(),
    alternatives: z.array(z.strictObject({ name: S, strategy: S, idea: S, tradeoff: S })),
});

const Since = z.strictObject({ added: Ids, removed: Ids, changed: Ids, names: z.record(S, S) });
const Score = z.strictObject({ steps: N, stepsServed: N, rules: N, rulesAssigned: N });
const Pair = z.strictObject({ from: S, to: S });

const Architecture = z.strictObject({
    /** Whether the person confirmed it with its components; otherwise it is the recommended variant, proposed. */
    confirmed: z.boolean(),
    name: S,
    idea: S,
    tradeoff: S,
    recommended: S.nullable(),
    domains: z.array(
        z.strictObject({ name: S, slug: S, concept: S, why: S, rules: Ids, dependsOn: Ids, facts: Ids, components: N }),
    ),
    containers: z.array(
        z.strictObject({
            name: S,
            kind: S,
            tech: S,
            holds: Ids,
            does: S.nullable(),
            runsOn: S.nullable(),
            runsOnWords: S.nullable(),
        }),
    ),
    components: z.array(
        z.strictObject({
            name: S,
            domain: S,
            responsibility: S,
            uses: Ids,
            serves: Ids,
            enforces: Ids,
            adapts: S.nullable(),
            platform: S.nullable(),
            kind: S.nullable(),
        }),
    ),
    integrations: z.array(z.strictObject({ outside: S, name: S, domain: S, how: S })),
    risks: z.array(
        z.strictObject({ statement: S, summary: S, kind: S.nullable(), cites: Ids, containedBy: S.nullable() }),
    ),
    talks: z.array(Pair),
    domainEdges: z.array(Pair),
    alternatives: z.array(
        z.strictObject({
            name: S,
            idea: S,
            tradeoff: S,
            score: Score.nullable(),
            containers: z.array(
                z.strictObject({
                    name: S,
                    kind: S,
                    tech: S.nullable(),
                    holds: Ids,
                    does: S.nullable(),
                    runsOn: S.nullable(),
                    runsOnWords: S.nullable(),
                }),
            ),
            domains: z.array(z.strictObject({ name: S, concept: S.nullable() })),
            integrations: z.array(z.strictObject({ outside: S, name: S, domain: S, how: S })),
        }),
    ),
    score: Score.nullable(),
    landing: z.strictObject({
        layers: z.array(z.strictObject({ layer: S.nullable(), name: S, rules: N, number: S })),
        domains: Ids,
        cells: z.array(z.strictObject({ layer: S.nullable(), domain: S, rules: Ids, number: S })),
    }),
    unplaced: z.array(z.strictObject({ rule: S, reason: S.nullable() })),
});

const Story = z.strictObject({
    key: S,
    title: S,
    what: S,
    why: S,
    kind: S,
    tags: Ids,
    work: z
        .strictObject({ profile: S, reference: z.boolean(), label: z.enum(Object.keys(workLabels) as [WorkLabel]), words: S })
        .nullable(),
    phase: N,
    epic: S,
    sequence: N,
    blockedBy: Ids,
    unblocks: Ids,
    builds: Ids,
    reliesOn: Ids,
    actions: Ids,
    steps: Ids,
    components: Ids,
    domains: Ids,
    layers: Ids,
    capability: S.nullable(),
    surface: S.nullable(),
    criteria: z.array(
        z.strictObject({
            says: S,
            given: S.nullable(),
            when: S.nullable(),
            then: S.nullable(),
            from: z.array(z.strictObject({ kind: S, id: S })),
        }),
    ),
    open: Ids,
    challenges: Ids,
    status: S,
    split: z.strictObject({ part: S, from: S }).nullable(),
});

const Brief = z.strictObject({
    system: z.strictObject({ name: S, purpose: S, summary: S }),
    goals: z.strictObject({ provided: z.boolean(), text: S.nullable() }),
    changes: z
        .strictObject({
            stack: z.array(z.strictObject({ line: S, layers: Ids })),
            containers: z.array(
                z.strictObject({ name: S, does: S.nullable(), runsOn: S.nullable(), tech: S, holds: Ids }),
            ),
            talks: z.array(Pair),
        })
        .nullable(),
    risks: z.strictObject({ rule: S, top: Ids, ranked: Ids }),
    plan: z.strictObject({ phases: S, epics: S, stories: S, readyFirst: S, phaseNames: Ids }).nullable(),
    numbers: Ids,
});

const Excerpt = z.strictObject({ file: S, firstLine: N, lastLine: N, lines: Ids, cut: z.boolean() });

const Inputs = z.strictObject({
    payloads: z.strictObject({ contractVersion: N, writer: S, fingerprint: S }),
    target: z
        .strictObject({
            contractVersion: N.nullable(),
            /** Where the target stands: `journeys-proposed`, `architecture-proposed` or `architecture-confirmed`. */
            state: S,
            fingerprint: S,
            gates: z.array(z.strictObject({ gate: S, state: S })),
        })
        .nullable(),
    plan: z.strictObject({ fingerprint: S }).nullable(),
    request: z.strictObject({ goals: z.boolean(), stackLines: N }).nullable(),
    source: z.strictObject({ readable: z.boolean() }),
});

export const Manifest = z.strictObject({
    contractVersion: z.literal(caseContractVersion),
    inputs: Inputs,
    files: z.array(z.strictObject({ path: S, schema: S, sha256: S, bytes: N })),
});

/** Every file of `case/` with its schema; a file that is not always written is marked optional. */
export const caseFiles = {
    "facts/system.json": facts.system,
    "facts/kinds.json": facts.kinds,
    "facts/areas.json": facts.areas,
    "facts/capabilities.json": facts.capabilities,
    "facts/surfaces.json": facts.surfaces,
    "facts/actions.json": facts.actions,
    "facts/rules.json": facts.rules,
    "facts/risks.json": facts.risks,
    "facts/entities.json": facts.entities,
    "facts/layers.json": facts.layers,
    "facts/outside.json": facts.outside,
    "facts/parts.json": facts.parts,
    "facts/terms.json": facts.terms,
    "facts/lifecycles.json": facts.lifecycles,
    ...Object.fromEntries(levels.map((level) => [`nodes/${level}.json`, z.array(Node)])),
    "numbers.json": z.array(NumberEntry),
    "views.json": z.array(View),
    "evidence.json": z.record(S, Excerpt),
    "search.json": z.array(
        z.strictObject({
            node: S,
            name: S,
            level: S,
            parent: S,
            text: S,
            section: z.enum(["journeys", "plan", "risks", "architecture"]).optional(),
        }),
    ),
    "brief.json": Brief,
    "journeys/today.json": z.array(TodayJourney),
    "journeys/proposed.json": z.array(ProposedJourney),
    "journeys/trace.json": z.array(
        z.strictObject({
            journey: S,
            step: S,
            stories: Ids,
            components: Ids,
            domains: Ids,
            primaryDomain: S.nullable(),
            kept: Ids,
            changed: z.array(RuleChange),
            dropped: Ids,
            alsoUsedBy: Ids,
        }),
    ),
    "journeys/dropped.json": z.array(z.strictObject({ journey: S, actions: Ids, rules: Ids, reason: S })),
    "journeys/changed.json": z.array(z.strictObject({ gate: S, state: S, since: Since.nullable() })),
    "architecture.json": Architecture,
    "plan/stories.json": z.array(Story),
    "plan/epics.json": z.array(
        z.strictObject({
            key: S,
            kind: S,
            title: S,
            outcome: S,
            journey: S.nullable(),
            label: S,
            comesAfter: Ids,
            stories: Ids,
            sequence: N,
        }),
    ),
    "plan/phases.json": z.array(
        z.strictObject({ number: N, name: S, why: S, stories: Ids, epics: Ids, builtIn: Ids }),
    ),
    "plan/layers.json": z.array(
        z.strictObject({
            id: S,
            name: S,
            path: S,
            kind: S,
            purpose: S,
            role: S.nullable(),
            container: S.nullable(),
            dependsOn: Ids,
            stack: Ids,
            stories: Ids,
        }),
    ),
    "plan/decisions.json": z.array(z.strictObject({ id: S, layer: S, chose: S, reason: S })),
    "plan/ready.json": Ids,
    "plan/matrix.json": z
        .strictObject({
            journeys: Ids,
            domains: Ids,
            cells: z.array(z.strictObject({ journey: S, domain: S, steps: Ids, stories: Ids })),
            rowTotals: z.record(S, N),
            columnTotals: z.record(S, N),
            total: N,
        })
        .nullable(),
    "plan/unplanned.json": z.array(z.strictObject({ name: S, file: S, firstLine: N, lastLine: N })),
    "plan/stale.json": z.boolean().nullable(),
    "plan/conflicts.json": z.array(z.strictObject({ stage: S, variant: S, says: S, resolved: z.boolean().nullable() })),
    "assistant/index.json": z.record(S, z.record(S, N)),
    ...Object.fromEntries(
        ["system", "capability", "surface", "action", "rule", "story", "journey"].map((kind) => [
            `assistant/${kind}.json`,
            z.record(S, S),
        ]),
    ),
} as Record<string, z.ZodType>;

/** The JSON Schema file of a case file. */
export const schemaPathOf = (path: string) => `schema/${path.replace(/\//g, ".").replace(/\.json$/, "")}.schema.json`;
