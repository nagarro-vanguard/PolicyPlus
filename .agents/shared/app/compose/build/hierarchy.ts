import { compareText, distinct } from "../io";
import type { Action, Capability, Facts, Rule, Surface } from "./facts";
import type { Noun, NumberPart, Numbers } from "./numbers";
import { sortByText } from "./text";

/*
 * The progressive path. One primary path, area > capability > surface > action > rule, where a surface is shown once
 * per capability that uses it with that capability's own counts and "also used by" the others; one side path for the
 * structure, part > place > action; and an explicit node for what is in no capability, no surface or no part. Every
 * count a node shows is a key into the numbers table, scoped to the path that reached the node.
 */

export const levels = [
    "overview",
    "area",
    "capability",
    "surface",
    "action",
    "rule",
    "part",
    "place",
    "unplaced",
] as const;
export type Level = (typeof levels)[number];

/** What a fold holds; the app owns its title. */
export const foldKinds = [
    "parts",
    "checkFirst",
    "unplaced",
    "tooling",
    "tests",
    "data",
    "risks",
    "openPoints",
    "sharedRules",
    "rulesOnNoEntryPoint",
    "entryPointsOnNoSurface",
    "layers",
    "rulesInNoCapability",
    "entryPointsInNoSurface",
    "entryPointsInNoCapability",
    "entryPointsInNoPart",
    "capabilitiesInNoArea",
] as const;
export type FoldKind = (typeof foldKinds)[number];

export type Row = {
    /** The node the row opens, when it opens one. */
    node?: string;
    /** The fact the row shows, when it shows one: its collection in `facts/` and its id there. */
    fact?: { collection: string; id: string };
    /** A text of the facts, shown as it is (an open point, a data access). */
    text?: string;
    /** The number shown beside it. */
    count?: string;
    /** The highest severity of the risks on it. */
    risk?: string;
    /** The kind of surface, for rows of places. */
    kind?: string;
};

export type Node = {
    key: string;
    level: Level;
    name: string;
    summary: string;
    noun: Noun;
    /** The record the node shows, for looking it up in `facts/`. */
    ref: { collection: string; id: string } | null;
    crumbs: string[];
    up: string | null;
    prev: string | null;
    next: string | null;
    /** At most three number keys. */
    facts: string[];
    children: { level: Level | null; rows: Row[] };
    folds: { kind: FoldKind; rows: Row[] }[];
    lateral: {
        relation: "alsoUsedBy" | "livesIn" | "usedBy" | "reachedFrom" | "decidedFor";
        node: string;
        count?: string;
    }[];
};

export type Hierarchy = {
    nodes: Map<string, Node>;
    /** The rule threshold: a rule reached from at least this many product places folds as shared. */
    sharedAt: number;
    sharedRules: string[];
    /** The canonical node of each record, by id. */
    nodeOf: Map<string, string>;
    /** The node of a surface as one capability uses it, by `<capability id>|<surface key>`. */
    surfaceNode: Map<string, string>;
};

const one = (noun: string, many: string): Noun => ({ one: noun, many });
const levelNouns = {
    overview: one("system", "systems"),
    area: one("area", "areas"),
    capability: one("capability", "capabilities"),
    rule: one("business rule", "business rules"),
    part: one("part", "parts"),
    unplaced: one("Not placed", "Not placed"),
    entryPoint: one("action", "actions"),
    place: one("place", "places"),
    risk: one("risk", "risks"),
    highRisk: one("high risk", "high risks"),
    test: one("test suite", "test suites"),
    starter: one("starter", "starters"),
} as const;

/**
 * Build the hierarchy and register every number it shows.
 * @param facts the facts
 * @param numbers the numbers table
 * @returns the nodes
 */
export const hierarchyOf = (facts: Facts, numbers: Numbers): Hierarchy => {
    const nodes = new Map<string, Node>();
    const nodeOf = new Map<string, string>();
    const surfaceNode = new Map<string, string>();
    const capabilities = new Map(facts.capabilities.map((each) => [each.id, each]));
    const surfaces = new Map(facts.surfaces.map((each) => [each.key, each]));
    const actions = new Map(facts.actions.map((each) => [each.id, each]));
    const rules = new Map(facts.rules.map((each) => [each.id, each]));
    const parts = new Map(facts.parts.map((each) => [each.id, each]));
    const kinds = new Map(facts.kinds.map((each) => [each.id, each]));
    const layers = new Map(facts.layers.map((each) => [each.id, each]));
    const testNoun = kinds.get("test")?.noun ?? levelNouns.test;

    const productSurfaces = facts.surfaces.filter((each) => each.product);
    const sharedAt = Math.max(5, Math.ceil(0.1 * productSurfaces.length));
    const placesOfRule = new Map(
        facts.rules.map((rule) => [
            rule.id,
            distinct(
                rule.actions
                    .map((id) => actions.get(id)?.surface)
                    .filter(
                        (key): key is string =>
                            key !== null && key !== undefined && surfaces.get(key)?.product === true,
                    ),
            ),
        ]),
    );
    const shared = (rule: string) => (placesOfRule.get(rule)?.length ?? 0) >= sharedAt;
    const risksOf = (capability: string) => facts.risks.filter((risk) => risk.capabilities.includes(capability));
    const worst = (capability: string) => risksOf(capability)[0]?.severity;

    const perKind = (list: readonly Surface[]): NumberPart[] => {
        const counts = new Map<string, number>();
        for (const surface of list) counts.set(surface.kind, (counts.get(surface.kind) ?? 0) + 1);
        return [...counts].map(([kind, value]) => ({ kind, value, noun: kinds.get(kind)?.noun ?? levelNouns.place }));
    };
    const testsOf = (keys: Iterable<string>) => distinct([...keys].filter((key) => surfaces.get(key)?.test === true));

    const add = (node: Omit<Node, "up" | "prev" | "next">) => {
        nodes.set(node.key, { ...node, facts: node.facts.slice(0, 3), up: null, prev: null, next: null });
        return node.key;
    };

    // Keys, given before any node is built so rows can refer to nodes built later.
    const areaKey = (id: string) => `area/${facts.areas.find((each) => each.id === id)?.slug ?? ""}`;
    const capabilityKey = (capability: Capability) => `capability/${capability.slug}`;
    const surfaceKey = (capability: Capability, surface: Surface) => `surface/${capability.slug}--${surface.slug}`;
    const actionKey = (action: Action) => `action/${action.slug}`;
    const ruleKey = (rule: Rule) => `rule/${rule.slug}`;
    const partKey = (id: string) => `part/${parts.get(id)?.slug ?? ""}`;
    const placeKey = (surface: Surface) => `place/${surface.slug}`;
    for (const action of facts.actions) nodeOf.set(action.id, actionKey(action));
    for (const rule of facts.rules) nodeOf.set(rule.id, ruleKey(rule));
    for (const capability of facts.capabilities) nodeOf.set(capability.id, capabilityKey(capability));
    for (const surface of facts.surfaces) nodeOf.set(surface.key, placeKey(surface));
    for (const part of facts.parts) nodeOf.set(part.id, partKey(part.id));
    for (const area of facts.areas) nodeOf.set(area.id, areaKey(area.id));

    const ruleRows = (ids: readonly string[]) =>
        sortByText(
            ids.map((id) => rules.get(id)).filter((rule): rule is Rule => rule !== undefined),
            (rule) => rule.says,
            (rule) => rule.id,
        ).map((rule) => ({ node: ruleKey(rule) }));
    const actionRows = (ids: readonly string[], countOf?: (action: Action) => string) =>
        sortByText(
            ids.map((id) => actions.get(id)).filter((action): action is Action => action !== undefined),
            (action) => action.name,
            (action) => action.id,
        ).map((action) => ({ node: actionKey(action), ...(countOf === undefined ? {} : { count: countOf(action) }) }));
    const actionRulesKey = (action: Action) =>
        numbers.add({
            key: `${actionKey(action)}/rules`,
            value: action.rules.length,
            noun: levelNouns.rule,
            scope: "business rules this action applies",
            source: "the analysis's capabilities",
        });

    // Unplaced: what no capability, surface or part holds, never dropped.
    const rulesInNoCapability = facts.rules.filter((rule) => rule.capabilities.length === 0).map((rule) => rule.id);
    const inNoSurface = facts.actions.filter((action) => action.surface === null).map((action) => action.id);
    const inNoCapability = facts.actions.filter((action) => action.capability === null).map((action) => action.id);
    const inNoPart = facts.actions.filter((action) => action.part === null).map((action) => action.id);

    // Overview.
    const productParts = perKind(productSurfaces);
    const toolingSurfaces = facts.surfaces.filter((each) => !each.product && !each.test);
    const testSurfaces = facts.surfaces.filter((each) => each.test);
    const overviewFacts = [
        numbers.add({
            key: "system/capabilities",
            value: facts.capabilities.length,
            noun: levelNouns.capability,
            scope: "capabilities of the whole system",
            source: "the analysis's capabilities",
        }),
        numbers.combined(
            "system/places",
            levelNouns.place,
            productParts,
            "places people and other systems use, across the whole system, each counted once",
            "the analysis's places",
        ),
        numbers.add({
            key: "system/risks/high",
            value: facts.risks.filter((risk) => risk.severity === "high").length,
            noun: levelNouns.highRisk,
            scope: "risks the analysis rates high, across the whole system",
            source: "the risks of the analysis",
        }),
    ];
    numbers.combined(
        "system/tooling",
        levelNouns.place,
        perKind(toolingSurfaces),
        "places that build, release or run the system but are not used by its people, each counted once",
        "the analysis's places",
    );
    numbers.add({
        key: "system/tests",
        value: testSurfaces.length,
        noun: testNoun,
        scope: "groups of automated tests across the whole system",
        source: "the analysis's tests",
    });
    numbers.add({
        key: "system/rules",
        value: facts.rules.length,
        noun: levelNouns.rule,
        scope: "business rules of the whole system, each counted once, those in no capability included",
        source: "the analysis's capabilities and the rules it found in none",
    });
    numbers.add({
        key: "system/rules/owned",
        value: facts.rules.length - rulesInNoCapability.length,
        noun: levelNouns.rule,
        scope: "business rules some capability decides, each counted once",
        source: "the analysis's capabilities",
    });
    numbers.add({
        key: "system/entryPoints",
        value: facts.actions.length,
        noun: levelNouns.entryPoint,
        scope: "actions of the whole system, tests and build steps included",
        source: "the analysis's capabilities and places",
    });
    numbers.add({
        key: "system/entryPoints/product",
        value: facts.actions.filter(
            (action) => action.surface !== null && surfaces.get(action.surface)?.product === true,
        ).length,
        noun: levelNouns.entryPoint,
        scope: "actions people and other systems use",
        source: "the analysis's places",
    });
    numbers.add({
        key: "system/areas",
        value: facts.areas.length,
        noun: levelNouns.area,
        scope: "areas of the whole system",
        source: "the analysis's areas",
    });
    numbers.add({
        key: "system/risks",
        value: facts.risks.length,
        noun: levelNouns.risk,
        scope: "risks of the whole system",
        source: "the risks of the analysis",
    });
    numbers.add({
        key: "system/parts",
        value: facts.parts.length,
        noun: levelNouns.part,
        scope: "parts the code is organised in",
        source: "the parts of the analysis",
    });

    const unplacedFacts = [
        numbers.add({
            key: "unplaced/rules",
            value: rulesInNoCapability.length,
            noun: levelNouns.rule,
            scope: "business rules no capability decides",
            source: "the analysis's rules in no capability",
        }),
        numbers.add({
            key: "unplaced/entryPoints/noSurface",
            value: inNoSurface.length,
            noun: levelNouns.entryPoint,
            scope: "actions in no place",
            source: "the analysis's places",
        }),
        numbers.add({
            key: "unplaced/entryPoints/noCapability",
            value: inNoCapability.length,
            noun: levelNouns.entryPoint,
            scope: "actions in no capability",
            source: "the analysis's capabilities",
        }),
    ];
    numbers.add({
        key: "unplaced/entryPoints/noPart",
        value: inNoPart.length,
        noun: levelNouns.entryPoint,
        scope: "actions whose code is in no part",
        source: "the analysis's parts",
    });

    add({
        key: "overview",
        level: "overview",
        name: facts.system.name,
        summary: facts.system.summary,
        noun: levelNouns.overview,
        ref: null,
        crumbs: [],
        facts: overviewFacts,
        children: {
            level: "area",
            rows: facts.areas.map((area) => ({
                node: areaKey(area.id),
                count: `${areaKey(area.id)}/capabilities`,
            })),
        },
        folds: [
            {
                kind: "checkFirst",
                rows: facts.risks
                    .slice(0, 5)
                    .map((risk) => ({ fact: { collection: "risks", id: risk.id }, risk: risk.severity })),
            },
            {
                kind: "parts",
                rows: facts.parts.map((part) => ({ node: partKey(part.id), count: `${partKey(part.id)}/places` })),
            },
            { kind: "unplaced", rows: [{ node: "unplaced", count: "unplaced/rules" }] },
        ],
        lateral: [],
    });

    // Areas.
    for (const area of facts.areas) {
        const key = areaKey(area.id);
        const members = area.capabilities
            .map((id) => capabilities.get(id))
            .filter((each): each is Capability => each !== undefined);
        const areaSurfaces = distinct(members.flatMap((each) => each.surfaces))
            .map((surfaceId) => surfaces.get(surfaceId))
            .filter((each): each is Surface => each?.product === true);
        add({
            key,
            level: "area",
            name: area.name,
            summary: area.summary,
            noun: levelNouns.area,
            ref: { collection: "areas", id: area.id },
            crumbs: ["overview"],
            facts: [
                numbers.add({
                    key: `${key}/capabilities`,
                    value: members.length,
                    noun: levelNouns.capability,
                    scope: "capabilities in this area",
                    source: "the analysis's areas",
                }),
                numbers.combined(
                    `${key}/places`,
                    levelNouns.place,
                    perKind(areaSurfaces),
                    "places the capabilities of this area use, each counted once",
                    "the analysis's places",
                ),
                numbers.add({
                    key: `${key}/rules`,
                    value: distinct(members.flatMap((each) => each.rules)).length,
                    noun: levelNouns.rule,
                    scope: "business rules the capabilities of this area decide, each counted once",
                    source: "the analysis's capabilities",
                }),
            ],
            children: {
                level: "capability",
                rows: sortByText(members, (each) => each.name).map((capability) => ({
                    node: capabilityKey(capability),
                    count: `${capabilityKey(capability)}/places`,
                    ...(worst(capability.id) === undefined ? {} : { risk: worst(capability.id) }),
                })),
            },
            folds: [],
            lateral: [],
        });
    }

    // Capabilities and the surfaces each uses.
    for (const capability of facts.capabilities) {
        const key = capabilityKey(capability);
        const area = capability.area;
        const crumbs = area === null ? ["overview", "unplaced"] : ["overview", areaKey(area)];
        const used = capability.surfaces
            .map((id) => surfaces.get(id))
            .filter((each): each is Surface => each !== undefined);
        const product = used.filter((each) => each.product);
        const tooling = used.filter((each) => !each.product && !each.test);
        const tests = testsOf([
            ...used.filter((each) => each.test).map((each) => each.key),
            ...product.flatMap((each) => each.reachedByTests),
        ]);
        const actionsHere = (surface: Surface) =>
            capability.actions.filter((id) => actions.get(id)?.surface === surface.key);
        const inNoPlace = capability.actions.filter((id) => actions.get(id)?.surface === null);
        const reached = new Set(capability.actions.flatMap((id) => actions.get(id)?.rules ?? []));
        const onNoEntryPoint = capability.rules.filter((rule) => !reached.has(rule));
        const risks = risksOf(capability.id);
        add({
            key,
            level: "capability",
            name: capability.name,
            summary: capability.summary,
            noun: levelNouns.capability,
            ref: { collection: "capabilities", id: capability.id },
            crumbs,
            facts: [
                numbers.combined(
                    `${key}/places`,
                    levelNouns.place,
                    perKind(product),
                    "places this capability's people and callers use, each counted once",
                    "the analysis's places",
                ),
                numbers.add({
                    key: `${key}/rules`,
                    value: capability.rules.length,
                    noun: levelNouns.rule,
                    scope: "business rules this capability decides, each counted once",
                    source: "the analysis's capabilities",
                }),
                numbers.add({
                    key: `${key}/risks`,
                    value: risks.length,
                    noun: levelNouns.risk,
                    scope: "risks that name this capability",
                    source: "the risks of the analysis",
                }),
            ],
            children: {
                level: "surface",
                rows: sortByText(
                    product,
                    (each) => each.noun.one,
                    (each) => each.name,
                    (each) => each.key,
                ).map((surface) => ({
                    node: surfaceKey(capability, surface),
                    count: `${surfaceKey(capability, surface)}/actions`,
                    kind: surface.kind,
                })),
            },
            folds: [
                {
                    kind: "tooling",
                    rows: sortByText(
                        tooling,
                        (each) => each.noun.one,
                        (each) => each.name,
                    ).map((surface) => ({
                        node: surfaceKey(capability, surface),
                        count: `${surfaceKey(capability, surface)}/actions`,
                        kind: surface.kind,
                    })),
                },
                {
                    kind: "tests",
                    rows: tests.map((test) => ({ node: placeKey(surfaces.get(test) as Surface), kind: "test" })),
                },
                { kind: "entryPointsOnNoSurface", rows: actionRows(inNoPlace) },
                { kind: "rulesOnNoEntryPoint", rows: ruleRows(onNoEntryPoint) },
                {
                    kind: "data",
                    rows: capability.data.map((each) => ({
                        text: `${each.name}: ${each.access}`,
                        ...(each.entity === "" ? {} : { fact: { collection: "entities", id: each.entity } }),
                    })),
                },
                {
                    kind: "risks",
                    rows: risks.map((risk) => ({ fact: { collection: "risks", id: risk.id }, risk: risk.severity })),
                },
                { kind: "openPoints", rows: capability.openPoints.map((text) => ({ text })) },
            ].filter((fold) => fold.rows.length > 0) as Node["folds"],
            lateral: [],
        });
        numbers.add({
            key: `${key}/tests`,
            value: tests.length,
            noun: testNoun,
            scope: "groups of automated tests that check this capability",
            source: "the analysis's tests",
        });
        numbers.add({
            key: `${key}/actions`,
            value: capability.actions.length,
            noun: levelNouns.entryPoint,
            scope: "actions of this capability, tests and build steps included",
            source: "the analysis's capabilities",
        });
        numbers.combined(
            `${key}/tooling`,
            levelNouns.place,
            perKind(tooling),
            "places of this capability that build, release or run it, each counted once",
            "the analysis's places",
        );

        for (const surface of [...product, ...tooling]) {
            const here = actionsHere(surface);
            const node = surfaceKey(capability, surface);
            surfaceNode.set(`${capability.id}|${surface.key}`, node);
            const others = surface.capabilities
                .filter((id) => id !== capability.id)
                .map((id) => capabilities.get(id))
                .filter((each): each is Capability => each !== undefined);
            add({
                key: node,
                level: "surface",
                name: surface.name,
                summary: surface.summary,
                noun: surface.noun,
                ref: { collection: "surfaces", id: surface.key },
                crumbs: [...crumbs, key],
                facts: [
                    numbers.add({
                        key: `${node}/actions`,
                        value: here.length,
                        noun: levelNouns.entryPoint,
                        scope: `actions of this ${surface.noun.one} that this capability uses`,
                        source: "the analysis's capabilities and places",
                    }),
                    numbers.add({
                        key: `${node}/rules`,
                        value: distinct(here.flatMap((id) => actions.get(id)?.rules ?? [])).length,
                        noun: levelNouns.rule,
                        scope: `business rules those actions apply, each counted once`,
                        source: "the analysis's capabilities and places",
                    }),
                    numbers.add({
                        key: `${node}/tests`,
                        value: testsOf(surface.reachedByTests).length,
                        noun: testNoun,
                        scope: `groups of automated tests that reach this ${surface.noun.one}`,
                        source: "the analysis's tests",
                    }),
                ],
                children: { level: "action", rows: actionRows(here, actionRulesKey) },
                folds: [],
                lateral: [
                    ...sortByText(others, (each) => each.name).map((other) => ({
                        relation: "alsoUsedBy" as const,
                        node: surfaceKey(other, surface),
                        count: `${surfaceKey(other, surface)}/actions`,
                    })),
                    { relation: "livesIn" as const, node: placeKey(surface) },
                ],
            });
        }
    }

    // Actions: one canonical node each, reached from its surface, its place, or the unplaced node.
    for (const action of facts.actions) {
        const surface = action.surface === null ? undefined : surfaces.get(action.surface);
        const capability = action.capability === null ? undefined : capabilities.get(action.capability);
        const primary = capability !== undefined && surface !== undefined && !surface.test;
        const capabilityCrumbs = capability === undefined ? [] : (nodes.get(capabilityKey(capability))?.crumbs ?? []);
        const crumbs = primary
            ? [...capabilityCrumbs, capabilityKey(capability), surfaceKey(capability, surface)]
            : surface !== undefined
              ? surface.part === null
                  ? ["overview", "unplaced", placeKey(surface)]
                  : ["overview", partKey(surface.part), placeKey(surface)]
              : capability !== undefined
                ? [...capabilityCrumbs, capabilityKey(capability)]
                : ["overview", "unplaced"];
        const own = action.rules.filter((rule) => !shared(rule));
        const common = action.rules.filter((rule) => shared(rule));
        add({
            key: actionKey(action),
            level: "action",
            name: action.name,
            summary: action.summary,
            noun: levelNouns.entryPoint,
            ref: { collection: "actions", id: action.id },
            crumbs,
            facts: [
                actionRulesKey(action),
                numbers.add({
                    key: `${actionKey(action)}/sharedRules`,
                    value: common.length,
                    noun: levelNouns.rule,
                    scope: `business rules this action applies that at least ${sharedAt} places share`,
                    source: "the analysis's places and actions",
                }),
            ],
            children: { level: "rule", rows: ruleRows(own) },
            folds: [
                { kind: "sharedRules" as const, rows: ruleRows(common) },
                {
                    kind: "layers" as const,
                    rows: action.path
                        .filter((id) => layers.has(id))
                        .map((id) => ({ fact: { collection: "layers", id } })),
                },
            ].filter((fold) => fold.rows.length > 0),
            lateral: surface === undefined ? [] : [{ relation: "livesIn", node: placeKey(surface) }],
        });
    }

    // Rules: one canonical node each, with every entry point that reaches it.
    for (const rule of facts.rules) {
        const reachedFrom = sortByText(
            rule.actions.map((id) => actions.get(id)).filter((each): each is Action => each !== undefined),
            (each) => capabilities.get(each.capability ?? "")?.name ?? "￿",
            (each) => each.name,
            (each) => each.id,
        );
        const first = reachedFrom[0];
        const firstCapability = rule.capabilities.map((id) => capabilities.get(id)).find((each) => each !== undefined);
        const crumbs =
            first !== undefined
                ? [...(nodes.get(actionKey(first))?.crumbs ?? []), actionKey(first)]
                : firstCapability !== undefined
                  ? [...(nodes.get(capabilityKey(firstCapability))?.crumbs ?? []), capabilityKey(firstCapability)]
                  : ["overview", "unplaced"];
        add({
            key: ruleKey(rule),
            level: "rule",
            name: rule.says,
            summary: "",
            noun: levelNouns.rule,
            ref: { collection: "rules", id: rule.id },
            crumbs,
            facts: [
                numbers.add({
                    key: `${ruleKey(rule)}/places`,
                    value: placesOfRule.get(rule.id)?.length ?? 0,
                    noun: levelNouns.place,
                    scope: "places whose actions reach this rule, each counted once",
                    source: "the analysis's places and actions",
                }),
                numbers.add({
                    key: `${ruleKey(rule)}/capabilities`,
                    value: rule.capabilities.length,
                    noun: levelNouns.capability,
                    scope: "capabilities that hold this rule",
                    source: "the analysis's capabilities",
                }),
                numbers.add({
                    key: `${ruleKey(rule)}/tests`,
                    value: testsOf(rule.reachedByTests).length,
                    noun: testNoun,
                    scope: "groups of automated tests that reach this rule",
                    source: "the analysis's tests",
                }),
            ],
            children: { level: null, rows: [] },
            folds: [],
            lateral: [
                ...reachedFrom.map((action) => ({ relation: "reachedFrom" as const, node: actionKey(action) })),
                ...rule.capabilities
                    .map((id) => capabilities.get(id))
                    .filter((each): each is Capability => each !== undefined)
                    .map((each) => ({ relation: "decidedFor" as const, node: capabilityKey(each) })),
            ],
        });
    }

    // Structure: part > place, and the places in no part.
    const placesOf = (part: string | null) => facts.surfaces.filter((surface) => surface.part === part);
    for (const part of facts.parts) {
        const key = partKey(part.id);
        const held = placesOf(part.id);
        add({
            key,
            level: "part",
            name: part.name,
            summary: part.summary,
            noun: levelNouns.part,
            ref: { collection: "parts", id: part.id },
            crumbs: ["overview"],
            facts: [
                numbers.combined(
                    `${key}/places`,
                    levelNouns.place,
                    perKind(held),
                    "places in this part's folders, tests and build steps included, each counted once",
                    "the analysis's parts and places",
                ),
                numbers.add({
                    key: `${key}/actions`,
                    value: facts.actions.filter((action) => action.part === part.id).length,
                    noun: levelNouns.entryPoint,
                    scope: "actions whose code is in this part",
                    source: "the analysis's parts",
                }),
            ],
            children: {
                level: "place",
                rows: sortByText(
                    held,
                    (each) => each.noun.one,
                    (each) => each.name,
                    (each) => each.key,
                ).map((surface) => ({
                    node: placeKey(surface),
                    count: `${placeKey(surface)}/actions`,
                    kind: surface.kind,
                })),
            },
            folds: [],
            lateral: [],
        });
    }
    for (const surface of facts.surfaces) {
        const key = placeKey(surface);
        const users = surface.capabilities
            .map((id) => capabilities.get(id))
            .filter((each): each is Capability => each !== undefined);
        add({
            key,
            level: "place",
            name: surface.name,
            summary: surface.summary,
            noun: surface.noun,
            ref: { collection: "surfaces", id: surface.key },
            crumbs: surface.part === null ? ["overview", "unplaced"] : ["overview", partKey(surface.part)],
            facts: [
                numbers.add({
                    key: `${key}/actions`,
                    value: surface.actions.length,
                    noun: levelNouns.entryPoint,
                    scope: `actions of this ${surface.noun.one}, for every capability`,
                    source: "the analysis's places",
                }),
                numbers.add({
                    key: `${key}/capabilities`,
                    value: users.length,
                    noun: levelNouns.capability,
                    scope: `capabilities that use this ${surface.noun.one}`,
                    source: "the analysis's places",
                }),
            ],
            children: { level: "action", rows: actionRows(surface.actions, actionRulesKey) },
            folds: [],
            lateral: sortByText(users, (each) => each.name)
                .filter((each) => surfaceNode.has(`${each.id}|${surface.key}`))
                .map((each) => ({
                    relation: "usedBy" as const,
                    node: surfaceKey(each, surface),
                    count: `${surfaceKey(each, surface)}/actions`,
                })),
        });
    }

    add({
        key: "unplaced",
        level: "unplaced",
        name: levelNouns.unplaced.one,
        summary: facts.unplacedWhy,
        noun: levelNouns.unplaced,
        ref: null,
        crumbs: ["overview"],
        facts: unplacedFacts,
        children: { level: null, rows: [] },
        folds: [
            { kind: "rulesInNoCapability" as const, rows: ruleRows(rulesInNoCapability) },
            { kind: "entryPointsInNoSurface" as const, rows: actionRows(inNoSurface) },
            { kind: "entryPointsInNoCapability" as const, rows: actionRows(inNoCapability) },
            { kind: "entryPointsInNoPart" as const, rows: actionRows(inNoPart) },
            {
                kind: "parts" as const,
                rows: sortByText(placesOf(null), (each) => each.name).map((surface) => ({
                    node: placeKey(surface),
                    kind: surface.kind,
                })),
            },
            {
                kind: "capabilitiesInNoArea" as const,
                rows: sortByText(
                    facts.capabilities.filter((each) => each.area === null),
                    (each) => each.name,
                ).map((each) => ({ node: capabilityKey(each) })),
            },
        ].filter((fold) => fold.rows.length > 0),
        lateral: [],
    });

    linkSiblings(nodes);
    return {
        nodes,
        sharedAt,
        sharedRules: facts.rules.filter((rule) => shared(rule.id)).map((rule) => rule.id),
        nodeOf,
        surfaceNode,
    };
};

/**
 * Up, previous and next for each node, from the first parent that lists it (children first, then folds).
 * @param nodes the nodes
 */
const linkSiblings = (nodes: Map<string, Node>) => {
    const order = [...nodes.values()].sort(
        (one, other) => levels.indexOf(one.level) - levels.indexOf(other.level) || compareText(one.key, other.key),
    );
    for (const parent of order) {
        const lists = [parent.children.rows, ...parent.folds.map((fold) => fold.rows)];
        for (const rows of lists) {
            const keys = rows
                .map((row) => row.node)
                .filter((key): key is string => key !== undefined && nodes.has(key));
            keys.forEach((key, number) => {
                const node = nodes.get(key) as Node;
                if (node.up !== null) return;
                node.up = parent.key;
                node.prev = keys[number - 1] ?? null;
                node.next = keys[number + 1] ?? null;
            });
        }
    }
};
