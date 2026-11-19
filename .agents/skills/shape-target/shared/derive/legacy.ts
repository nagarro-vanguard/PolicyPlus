import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { Schema } from "effect";

/*
 * What this skill reads of a code analysis: only the payload files, only the fields it uses, and never its code. Extra
 * fields are ignored. The analysis is renaming what holds a person's actions from screen to surface: for one version
 * either name is read (`screen` or `surface` on an action, `screens` or `surfaces` on the system), and neither is
 * required. The legacy sheet it writes is the one place the old system's own words are kept; designers never
 * receive it, only the challenger, the checks and the app's trace do.
 */
const Place = Schema.Struct({ file: Schema.String, firstLine: Schema.Int, lastLine: Schema.Int });
const Action = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    purpose: Schema.String,
    startedBy: Schema.String,
    screen: Schema.optionalKey(Schema.String),
    surface: Schema.optionalKey(Schema.String),
    place: Place,
    rules: Schema.Array(Schema.String),
});
const Rule = Schema.Struct({ id: Schema.String, says: Schema.String, place: Place });
const CapabilityPayload = Schema.Struct({
    capability: Schema.Struct({ id: Schema.String, name: Schema.String, purpose: Schema.String }),
    layers: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            name: Schema.String,
            actions: Schema.Array(Action),
            rules: Schema.Array(Rule),
        }),
    ),
    data: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
});
const SystemPayload = Schema.Struct({
    purpose: Schema.String,
    layers: Schema.Array(Schema.Struct({ name: Schema.String })),
    screens: Schema.optionalKey(Schema.Array(Schema.Struct({ name: Schema.String }))),
    surfaces: Schema.optionalKey(Schema.Array(Schema.Struct({ name: Schema.String }))),
    externals: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String, kind: Schema.String })),
    gaps: Schema.Struct({ unattributedBlocks: Schema.Int }),
});
const KnowledgePayload = Schema.Struct({
    lifecycles: Schema.Array(
        Schema.Struct({
            entity: Schema.Struct({ id: Schema.String, name: Schema.String }),
            states: Schema.Array(Schema.String),
        }),
    ),
});
const BundlePayload = Schema.Struct({
    blocks: Schema.Array(Schema.Struct({ container: Schema.String })),
    controls: Schema.Array(Schema.Struct({ name: Schema.String })),
});

export type LegacyAction = {
    what: string;
    name: string;
    startedBy: string;
    surface: string;
    owner: string;
    rules: string[];
    place: { file: string; firstLine: number; lastLine: number };
};
export type LegacyRule = {
    statement: string;
    owner: string;
    place: { file: string; firstLine: number; lastLine: number };
};
export type LegacySheet = {
    fingerprint: string;
    purpose: string;
    /** In the order that settles ownership: smallest first, then by name. */
    capabilities: { id: string; name: string; purpose: string }[];
    actions: Record<string, LegacyAction>;
    rules: Record<string, LegacyRule>;
    entities: Record<string, { name: string; states: string[] }>;
    externals: Record<string, { name: string; kind: string }>;
    unreached: number;
    /** Names of the old system's own structure, which a design must not carry. */
    identifiers: string[];
};

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as unknown;

/** What holds an action, under either name; empty when the analysis names none. */
const holderOf = (action: typeof Action.Type) => action.surface ?? action.screen ?? "";

/**
 * A fingerprint of the payload files, so a target can say which analysis it was made from.
 * @param payloads the payloads folder
 * @returns a hex digest
 */
export const fingerprintOf = (payloads: string) => {
    const hash = createHash("sha256");
    const walk = (folder: string): string[] =>
        readdirSync(folder, { withFileTypes: true })
            .sort((a, b) => a.name.localeCompare(b.name))
            .flatMap((entry) => (entry.isDirectory() ? walk(join(folder, entry.name)) : [join(folder, entry.name)]));
    for (const file of walk(payloads)) {
        hash.update(file.slice(payloads.length));
        hash.update(readFileSync(file));
    }
    return hash.digest("hex");
};

const isCodeName = (word: string) => word.length >= 4 && /[a-z][A-Z]|_|\./.test(word);

/**
 * Derives the legacy sheet from an analysis's payloads. Pure over the files.
 * @param payloads the payloads folder
 * @returns the sheet; throws when a payload does not hold what this skill reads
 */
export const deriveLegacy = (payloads: string): LegacySheet => {
    const capabilityFiles = readdirSync(payloads).filter((name) => /^capability-.*\.json$/.test(name));
    const system = Schema.decodeUnknownSync(SystemPayload)(readJson(join(payloads, "system.json")));
    const capabilities = capabilityFiles.map((name) =>
        Schema.decodeUnknownSync(CapabilityPayload)(readJson(join(payloads, name))),
    );
    const knowledge = Schema.decodeUnknownSync(KnowledgePayload)(readJson(join(payloads, "knowledge.json")));
    const bundlePath = join(payloads, "bundle.json");
    const bundle = existsSync(bundlePath)
        ? Schema.decodeUnknownSync(BundlePayload)(readJson(bundlePath))
        : { blocks: [], controls: [] };
    const sizeOf = (payload: (typeof capabilities)[number]) =>
        payload.layers.reduce((sum, layer) => sum + layer.actions.length, 0);
    const ordered = [...capabilities].sort(
        (a, b) => sizeOf(a) - sizeOf(b) || a.capability.name.localeCompare(b.capability.name),
    );
    const actions: Record<string, LegacyAction> = {};
    const rules: Record<string, LegacyRule> = {};
    const said = new Map(
        capabilities
            .flatMap((payload) => payload.layers.flatMap((layer) => layer.rules))
            .map((rule) => [rule.id, rule]),
    );
    for (const payload of ordered) {
        for (const layer of payload.layers) {
            for (const action of layer.actions) {
                if (actions[action.id] !== undefined) continue;
                actions[action.id] = {
                    what: action.purpose,
                    name: action.name,
                    startedBy: action.startedBy,
                    surface: holderOf(action),
                    owner: payload.capability.id,
                    rules: [...action.rules],
                    place: action.place,
                };
                for (const id of action.rules) {
                    const rule = said.get(id);
                    if (rule === undefined || rules[id] !== undefined) continue;
                    rules[id] = { statement: rule.says, owner: payload.capability.id, place: rule.place };
                }
            }
        }
    }
    const entities: Record<string, { name: string; states: string[] }> = {};
    for (const payload of capabilities)
        for (const each of payload.data) entities[each.id] = { name: each.name, states: [] };
    for (const life of knowledge.lifecycles)
        entities[life.entity.id] = { name: life.entity.name, states: [...life.states] };
    const files = Object.values(actions).map((action) => basename(action.place.file));
    const identifiers = [
        ...new Set([
            ...system.layers.map((layer) => layer.name),
            ...(system.surfaces ?? system.screens ?? []).map((each) => each.name).filter((name) => !name.includes(" ")),
            ...capabilities
                .flatMap((payload) => payload.layers.flatMap((layer) => layer.actions.map(holderOf)))
                .filter((name) => name !== "" && !name.includes(" ")),
            ...bundle.blocks.map((block) => block.container),
            ...bundle.controls.map((control) => control.name),
            ...files,
        ]),
    ].filter((word) => (word.includes(" ") ? word.length >= 8 : isCodeName(word)));
    return {
        fingerprint: fingerprintOf(payloads),
        purpose: system.purpose,
        capabilities: ordered.map((payload) => payload.capability),
        actions,
        rules,
        entities,
        externals: Object.fromEntries(system.externals.map((each) => [each.id, { name: each.name, kind: each.kind }])),
        unreached: system.gaps.unattributedBlocks,
        identifiers,
    };
};

/**
 * The identifiers of the old system that a text carries.
 * @param text the text
 * @param identifiers the sheet's identifiers
 * @returns each identifier found
 */
export const leaksIn = (text: string, identifiers: readonly string[]) =>
    identifiers.filter((word) => {
        const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?<![A-Za-z0-9_])${escaped}(?![A-Za-z0-9_])`, word.includes(" ") ? "i" : "").test(text);
    });
