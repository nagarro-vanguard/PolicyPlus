import { join } from "node:path";
import { z } from "zod";
import { ComposeError } from "../errors";
import { compareText, distinct, readJson } from "../io";
import type { Payloads } from "../inputs/payloads";
import type { Noun } from "./numbers";
import { firstSentence, Slugs, sortByText } from "./text";

/*
 * The analysis's payloads as one set of neutral facts: every record once, keyed by its id, with the joins the payloads
 * leave to the reader made here (which surface and part an entry point is in, which capabilities hold a rule, which
 * entry points reach it). Nouns come from the analysis's catalogue of surface kinds, never from code.
 */

const catalogueFolder = join(import.meta.dir, "..", "..", "..", "..", "skills", "code-analysis", "shared", "catalogue");
const SurfaceKinds = z.looseObject({
    surfaceKinds: z.array(z.looseObject({ id: z.string(), one: z.string(), many: z.string(), means: z.string() })),
});
const Severities = z.looseObject({ severities: z.array(z.looseObject({ id: z.string(), words: z.string() })) });

export type Kind = { readonly id: string; readonly noun: Noun; readonly means: string };
export type Place = { readonly file: string; readonly firstLine: number; readonly lastLine: number };

export type Area = { id: string; slug: string; name: string; purpose: string; summary: string; capabilities: string[] };
export type Capability = {
    id: string;
    slug: string;
    name: string;
    purpose: string;
    summary: string;
    area: string | null;
    actions: string[];
    rules: string[];
    surfaces: string[];
    data: { entity: string; name: string; access: string }[];
    openPoints: string[];
    declared: { actions: number; rules: number; totalsActions: number; totalsRules: number };
};
export type Surface = {
    key: string;
    slug: string;
    name: string;
    purpose: string;
    summary: string;
    kind: string;
    noun: Noun;
    unnamed: boolean;
    product: boolean;
    test: boolean;
    files: string[];
    capabilities: string[];
    actions: string[];
    reachedByTests: string[];
    part: string | null;
    declared: { actions: number; rules: number };
};
export type Action = {
    id: string;
    slug: string;
    name: string;
    purpose: string;
    summary: string;
    startedBy: string;
    capability: string | null;
    surface: string | null;
    layer: string | null;
    path: string[];
    rules: string[];
    place: Place;
    tooling: boolean;
    part: string | null;
};
export type Rule = {
    id: string;
    slug: string;
    says: string;
    gates: boolean;
    place: Place;
    alsoRestsOn: Place[];
    reading: string;
    why: string;
    capabilities: string[];
    layer: string | null;
    reachedByTests: string[];
    actions: string[];
};
export type Risk = {
    id: string;
    statement: string;
    summary: string;
    severity: string;
    category: string;
    categoryWords: string;
    capabilities: string[];
    parts: string[];
    files: string[];
    breadth: number;
    rank: number;
};
export type Part = {
    id: string;
    slug: string;
    name: string;
    kind: string;
    purpose: string;
    summary: string;
    folders: string[];
    product: boolean;
};
export type Layer = { id: string; name: string; role: string; purpose: string; group: string; product: boolean };
export type Outside = {
    id: string;
    name: string;
    kind: string;
    links: number;
    reach: { layer: string; access: string; links: number }[];
};
export type Entity = { id: string; slug: string; name: string; purpose: string; capabilities: string[] };
export type Term = { term: string; means: string; from: string };
export type Lifecycle = { entity: string; name: string; states: string[]; transitions: { from: string; to: string }[] };

export type Facts = {
    system: {
        name: string;
        repository: string | null;
        commit: string | null;
        purpose: string;
        summary: string;
        technologies: string[];
    };
    kinds: Kind[];
    areas: Area[];
    capabilities: Capability[];
    surfaces: Surface[];
    actions: Action[];
    rules: Rule[];
    risks: Risk[];
    entities: Entity[];
    layers: Layer[];
    outside: Outside[];
    parts: Part[];
    terms: Term[];
    lifecycles: Lifecycle[];
    dataUse: { capability: string; entity: string; reads: boolean; saves: boolean }[];
    figures: { kind: string; question: string; caption: string }[];
    unplacedWhy: string;
    /** Every rule id the analysis indexed, owned by a capability or not. */
    ruleIndex: string[];
};

/** The catalogue of surface kinds: each kind's noun for one and for many. */
export const surfaceKinds = (): Kind[] =>
    readJson(join(catalogueFolder, "surface-kinds.json"), SurfaceKinds).surfaceKinds.map((kind) => ({
        id: kind.id,
        noun: { one: kind.one, many: kind.many },
        means: kind.means,
    }));

const severityOrder = () =>
    readJson(join(catalogueFolder, "severity.json"), Severities).severities.map((each) => each.id);

/**
 * The part a file belongs to: the part with the longest folder that holds it.
 * @param file the file, relative to the source root
 * @param parts the parts
 * @returns the part's id, or null when no part holds it
 */
export const partOf = (file: string, parts: readonly Part[]) => {
    let best: { length: number; id: string } | undefined;
    for (const part of parts) {
        for (const folder of part.folders) {
            const clean = folder.replace(/\/+$/, "");
            const holds = clean === "" || clean === "." || file === clean || file.startsWith(`${clean}/`);
            if (holds && (best === undefined || clean.length > best.length))
                best = { length: clean.length, id: part.id };
        }
    }
    return best?.id ?? null;
};

/**
 * Build the facts from the payloads.
 * @param payloads the analysis's payloads
 * @returns the facts
 */
export const factsOf = (payloads: Payloads): Facts => {
    const { system, knowledge, index } = payloads;
    const slugs = new Slugs();
    const kinds = surfaceKinds();
    const kindOf = new Map(kinds.map((kind) => [kind.id, kind]));

    const parts: Part[] = sortByText(
        knowledge.parts,
        (part) => part.name,
        (part) => part.id,
    ).map((part) => ({
        id: part.id,
        slug: slugs.of("part", part.id, part.name),
        name: part.name,
        kind: part.kind,
        purpose: part.purpose,
        summary: firstSentence(part.purpose),
        folders: [...part.folders],
        product: part.product ?? part.kind !== "tests",
    }));

    const layers: Layer[] = system.layers.map((layer) => ({
        id: layer.id,
        name: layer.name,
        role: layer.role,
        purpose: layer.purpose,
        group: layer.group,
        product: layer.product,
    }));

    // Capabilities with their actions and rules, every rule kept once.
    const ruleRecords = new Map<string, Rule>();
    const actionRecords = new Map<string, Action>();
    const capabilities: Capability[] = [];
    const areaOfCapability = new Map<string, string>();
    for (const area of system.areas) for (const id of area.capabilities) areaOfCapability.set(id, area.id);
    const declared = new Map(system.capabilities.map((each) => [each.id, each]));
    for (const payload of sortByText(
        payloads.capabilities,
        (each) => each.capability.name,
        (each) => each.capability.id,
    )) {
        const id = payload.capability.id;
        const actions: string[] = [];
        const rules = new Set<string>();
        for (const layer of payload.layers) {
            for (const action of layer.actions) {
                if (actionRecords.has(action.id)) {
                    throw new ComposeError("reconcile", `entry point ${action.id} is in two capabilities' payloads`);
                }
                actions.push(action.id);
                actionRecords.set(action.id, {
                    id: action.id,
                    slug: "",
                    name: action.name,
                    purpose: action.purpose,
                    summary: firstSentence(action.purpose),
                    startedBy: action.startedBy,
                    capability: id,
                    surface: null,
                    layer: layer.id,
                    path: distinct(
                        action.path
                            .toSorted((a, b) => a.depth - b.depth || compareText(a.layer, b.layer))
                            .map((each) => each.layer),
                    ),
                    rules: distinct(action.rules),
                    place: {
                        file: action.place.file,
                        firstLine: action.place.firstLine,
                        lastLine: action.place.lastLine,
                    },
                    tooling: action.tooling ?? false,
                    part: null,
                });
            }
            for (const rule of layer.rules) {
                rules.add(rule.id);
                const known = ruleRecords.get(rule.id);
                if (known !== undefined) {
                    if (!known.capabilities.includes(id)) known.capabilities.push(id);
                    continue;
                }
                ruleRecords.set(rule.id, {
                    id: rule.id,
                    slug: "",
                    says: rule.says,
                    gates: rule.gates,
                    place: { file: rule.place.file, firstLine: rule.place.firstLine, lastLine: rule.place.lastLine },
                    alsoRestsOn: (rule.alsoRestsOn ?? []).map((each) => ({
                        file: each.file,
                        firstLine: each.firstLine,
                        lastLine: each.lastLine,
                    })),
                    reading: rule.reading ?? "",
                    why: rule.why ?? "",
                    capabilities: [id],
                    layer: layer.id,
                    reachedByTests: distinct(rule.reachedByTests ?? []),
                    actions: [],
                });
            }
        }
        const counted = declared.get(id);
        capabilities.push({
            id,
            slug: slugs.of("capability", id, payload.capability.name),
            name: payload.capability.name,
            purpose: payload.capability.purpose,
            summary: firstSentence(payload.capability.purpose),
            area: areaOfCapability.get(id) ?? null,
            actions: distinct(actions),
            rules: distinct(rules),
            surfaces: [],
            data: sortByText(payload.data, (each) => each.name).map((each) => ({
                entity: each.id ?? "",
                name: each.name,
                access: each.access,
            })),
            openPoints: (payload.openPoints ?? []).map((each) => each.statement),
            declared: {
                actions: counted?.actions ?? -1,
                rules: counted?.rules ?? -1,
                totalsActions: payload.totals.actions,
                totalsRules: payload.totals.rules,
            },
        });
    }

    // Rules no capability holds are kept, never dropped.
    for (const rule of system.rulesInNoCapability.rules) {
        if (ruleRecords.has(rule.id)) continue;
        ruleRecords.set(rule.id, {
            id: rule.id,
            slug: "",
            says: rule.says,
            gates: false,
            place: { file: rule.file, firstLine: rule.firstLine, lastLine: rule.firstLine },
            alsoRestsOn: [],
            reading: "",
            why: "",
            capabilities: [],
            layer: null,
            reachedByTests: [],
            actions: [],
        });
    }

    // Surfaces; an entry point a surface names that no capability holds is kept, from the analysis's index of blocks.
    const blocks = new Map(index.blocks.map((block) => [block.id, block]));
    const surfaceOf = new Map<string, string>();
    const surfaces: Surface[] = [];
    for (const surface of sortByText(
        system.surfaces,
        (each) => each.name,
        (each) => each.key,
    )) {
        const kind = kindOf.get(surface.kind);
        if (kind === undefined) {
            throw new ComposeError(
                "missing",
                `missing fact: surface kind "${surface.kind}" is not in the catalogue of surface kinds`,
            );
        }
        for (const id of surface.actionIds) {
            if (surfaceOf.has(id)) throw new ComposeError("reconcile", `entry point ${id} is in two surfaces`);
            surfaceOf.set(id, surface.key);
            if (!actionRecords.has(id)) {
                const block = blocks.get(id);
                if (block === undefined)
                    throw new ComposeError(
                        "missing",
                        `missing fact: entry point ${id} of surface ${surface.key} is in no payload`,
                    );
                actionRecords.set(id, {
                    id,
                    slug: "",
                    name: block.name,
                    purpose: "",
                    summary: "",
                    startedBy: "",
                    capability: null,
                    surface: null,
                    layer: block.layer ?? null,
                    path: block.layer === undefined ? [] : [block.layer],
                    rules: [],
                    place: {
                        file: block.file,
                        firstLine: Number(block.firstLine ?? 0),
                        lastLine: Number(block.lastLine ?? 0),
                    },
                    tooling: !surface.product,
                    part: null,
                });
            }
        }
        surfaces.push({
            key: surface.key,
            slug: slugs.of("place", surface.key, surface.name),
            name: surface.name,
            purpose: surface.purpose,
            summary: firstSentence(surface.purpose),
            kind: surface.kind,
            noun: kind.noun,
            unnamed: surface.unnamed,
            product: surface.product,
            test: surface.kind === "test",
            files: [...surface.files],
            capabilities: distinct(surface.capabilities),
            actions: distinct(surface.actionIds),
            reachedByTests: distinct(surface.reachedByTests),
            part: null,
            declared: { actions: surface.actions, rules: surface.rules },
        });
    }
    for (const id of system.unplaced.entryPoints) {
        if (actionRecords.has(id)) continue;
        const block = blocks.get(id);
        if (block === undefined)
            throw new ComposeError("missing", `missing fact: unplaced entry point ${id} is in no payload`);
        actionRecords.set(id, {
            id,
            slug: "",
            name: block.name,
            purpose: "",
            summary: "",
            startedBy: "",
            capability: null,
            surface: null,
            layer: block.layer ?? null,
            path: [],
            rules: [],
            place: { file: block.file, firstLine: Number(block.firstLine ?? 0), lastLine: Number(block.lastLine ?? 0) },
            tooling: false,
            part: null,
        });
    }

    for (const surface of surfaces) surface.part = partOf(surface.files[0] ?? surface.key, parts);
    const actions = sortByText(
        [...actionRecords.values()],
        (each) => each.name,
        (each) => each.place.file,
        (each) => each.id,
    );
    for (const action of actions) {
        action.surface = surfaceOf.get(action.id) ?? null;
        action.part = partOf(action.place.file, parts);
        action.slug = slugs.of("action", action.id, action.name);
        for (const rule of action.rules) {
            const record = ruleRecords.get(rule);
            if (record === undefined)
                throw new ComposeError(
                    "missing",
                    `missing fact: rule ${rule} of entry point ${action.id} is in no payload`,
                );
            record.actions.push(action.id);
        }
    }
    for (const capability of capabilities) {
        capability.surfaces = distinct(
            capability.actions.map((id) => surfaceOf.get(id)).filter((key): key is string => key !== undefined),
        );
    }
    const rules = sortByText(
        [...ruleRecords.values()],
        (each) => each.place.file,
        (each) => String(each.place.firstLine).padStart(8, "0"),
        (each) => each.id,
    );
    for (const rule of rules) {
        rule.slug = slugs.of("rule", rule.id, rule.says.split(/\s+/).slice(0, 8).join(" "));
        rule.capabilities.sort(compareText);
        rule.actions = distinct(rule.actions);
    }

    const areas: Area[] = sortByText(
        system.areas,
        (each) => each.name,
        (each) => each.id,
    ).map((area) => ({
        id: area.id,
        slug: slugs.of("area", area.id, area.name),
        name: area.name,
        purpose: area.purpose,
        summary: firstSentence(area.purpose),
        capabilities: [...area.capabilities],
    }));

    const severities = severityOrder();
    const risks: Risk[] = knowledge.risks
        .map((risk) => {
            const capabilitiesOf = distinct((risk.places?.capabilities ?? []).map((each) => each.id));
            const partsOf = distinct((risk.places?.parts ?? []).map((each) => each.id));
            return {
                id: risk.id,
                statement: risk.statement,
                summary: firstSentence(risk.statement),
                severity: risk.severity,
                category: risk.category,
                categoryWords: risk.categoryWords ?? "",
                capabilities: capabilitiesOf,
                parts: partsOf,
                files: distinct(risk.places?.files ?? []),
                breadth: capabilitiesOf.length + partsOf.length,
                rank: 0,
            };
        })
        .toSorted((one, other) => {
            const bySeverity = rankOf(severities, one.severity) - rankOf(severities, other.severity);
            return (
                bySeverity ||
                other.breadth - one.breadth ||
                compareText(one.statement, other.statement) ||
                compareText(one.id, other.id)
            );
        });
    risks.forEach((risk, number) => {
        risk.rank = number + 1;
    });

    return {
        system: {
            name: system.name,
            repository: system.repository ?? null,
            commit: system.commit ?? null,
            purpose: system.purpose,
            summary: firstSentence(system.purpose),
            technologies: distinct((knowledge.technologies ?? []).map((each) => each.name)),
        },
        kinds,
        areas,
        capabilities,
        surfaces,
        actions,
        rules,
        risks,
        entities: sortByText(
            knowledge.entities,
            (each) => each.name,
            (each) => each.id,
        ).map((entity) => ({
            id: entity.id,
            slug: slugs.of("entity", entity.id, entity.name),
            name: entity.name,
            purpose: entity.purpose,
            capabilities: distinct(entity.capabilities ?? []),
        })),
        layers,
        outside: sortByText(
            system.externals,
            (each) => each.name,
            (each) => each.id,
        ).map((each) => ({
            id: each.id,
            name: each.name,
            kind: each.kind,
            links: each.links,
            reach: each.reach.map((reach) => ({ layer: reach.layer, access: reach.access, links: reach.links })),
        })),
        parts,
        terms: sortByText(knowledge.terms ?? [], (each) => each.term).map((each) => ({
            term: each.term,
            means: each.means,
            from: each.from ?? "",
        })),
        lifecycles: sortByText(knowledge.lifecycles, (each) => each.entity.name).map((each) => ({
            entity: each.entity.id,
            name: each.entity.name,
            states: [...each.states],
            transitions: each.transitions.flatMap((transition) => {
                const to = each.states[transition.to] ?? "";
                return transition.from.length === 0
                    ? [{ from: "", to }]
                    : transition.from.map((from) => ({ from: each.states[from] ?? "", to }));
            }),
        })),
        dataUse: knowledge.dataUse.map((each) => ({
            capability: each.capability.id,
            entity: each.entity.id,
            reads: each.reads,
            saves: each.saves,
        })),
        figures: (knowledge.figures ?? []).map((each) => ({
            kind: each.kind,
            question: each.question,
            caption: each.caption,
        })),
        unplacedWhy: system.unplaced.why,
        ruleIndex: distinct([...index.rules.map((each) => each.id), ...ruleRecords.keys()]),
    };
};

const rankOf = (order: readonly string[], severity: string) => {
    const found = order.indexOf(severity);
    return found === -1 ? order.length : found;
};
