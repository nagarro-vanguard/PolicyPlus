import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { AuthoredView } from "./view";
import { ComposeError } from "../errors";
import { compareText, readJson, readText, sha1, sha256 } from "../io";

/*
 * The analysis's payloads, read through its manifest only: a folder with no manifest, a contract version compose does
 * not know, a file whose digest differs from the manifest's or a fact compose needs and does not find stops compose.
 * Each schema names only the fields compose reads; the rest of each record is kept as it is, for the bundle functions.
 */

/** The payload contract versions compose reads. */
export const knownPayloadVersions = [1] as const;

const Text = z.string();
const Ids = z.array(z.string());
const Place = z.looseObject({ file: Text, firstLine: z.number(), lastLine: z.number() });

const Manifest = z.looseObject({
    contractVersion: z.number(),
    writer: z.looseObject({ skill: Text, version: Text }),
    files: z.array(z.looseObject({ path: Text, kind: Text, digest: Text })),
});

const Surface = z.looseObject({
    key: Text,
    name: Text,
    purpose: Text,
    kind: Text,
    noun: z.looseObject({ one: Text, many: Text }),
    unnamed: z.boolean(),
    product: z.boolean(),
    files: Ids,
    capabilities: Ids,
    actionIds: Ids,
    actions: z.number(),
    rules: z.number(),
    reachedByTests: Ids,
});

const System = z.looseObject({
    name: Text,
    repository: Text.nullable().optional(),
    commit: Text.nullable().optional(),
    purpose: Text,
    capabilities: z.array(
        z.looseObject({ id: Text, file: Text.optional(), name: Text, actions: z.number(), rules: z.number() }),
    ),
    areas: z.array(z.looseObject({ id: Text, name: Text, purpose: Text, capabilities: Ids })),
    layers: z.array(
        z.looseObject({ id: Text, name: Text, role: Text, purpose: Text, group: Text, product: z.boolean() }),
    ),
    surfaces: z.array(Surface),
    unplaced: z.looseObject({ entryPoints: Ids, why: Text }),
    rulesInNoCapability: z.looseObject({
        count: z.number(),
        rules: z.array(z.looseObject({ id: Text, says: Text, file: Text, firstLine: z.number() })),
    }),
    edges: z.array(z.looseObject({ from: Text, to: Text, kind: Text, links: z.number() })),
    externals: z.array(
        z.looseObject({
            id: Text,
            name: Text,
            kind: Text,
            links: z.number(),
            reach: z.array(z.looseObject({ layer: Text, access: Text, links: z.number() })),
        }),
    ),
});

const Action = z.looseObject({
    id: Text,
    name: Text,
    purpose: Text,
    startedBy: Text,
    surface: Text.optional(),
    tooling: z.boolean().optional(),
    place: Place,
    path: z.array(z.looseObject({ layer: Text, depth: z.number() })),
    rules: Ids,
});

const Rule = z.looseObject({
    id: Text,
    says: Text,
    gates: z.boolean(),
    place: Place,
    alsoRestsOn: z.array(Place).optional(),
    reading: Text.optional(),
    why: Text.optional(),
    reachedByTests: Ids.optional(),
});

const Capability = z.looseObject({
    capability: z.looseObject({ id: Text, name: Text, purpose: Text }),
    area: Text,
    layers: z.array(z.looseObject({ id: Text, name: Text, actions: z.array(Action), rules: z.array(Rule) })),
    data: z.array(z.looseObject({ id: Text.optional(), name: Text, access: Text })),
    openPoints: z.array(z.looseObject({ statement: Text })).optional(),
    totals: z.looseObject({ actions: z.number(), rules: z.number() }),
});

const Knowledge = z.looseObject({
    parts: z.array(
        z.looseObject({
            id: Text,
            name: Text,
            kind: Text,
            purpose: Text,
            folders: Ids,
            product: z.boolean().optional(),
        }),
    ),
    technologies: z.array(z.looseObject({ name: Text, kind: Text.optional() })).optional(),
    lifecycles: z.array(
        z.looseObject({
            entity: z.looseObject({ id: Text, name: Text }),
            states: Ids,
            transitions: z.array(z.looseObject({ from: z.array(z.number()), to: z.number() })),
        }),
    ),
    partLinks: z.array(z.looseObject({ from: Text, to: Text, kind: Text, links: z.number() })).optional(),
    dataUse: z.array(
        z.looseObject({
            capability: z.looseObject({ id: Text, name: Text }),
            entity: z.looseObject({ id: Text, name: Text }),
            saves: z.boolean(),
            reads: z.boolean(),
        }),
    ),
    views: z.array(AuthoredView.extend({ id: Text })).optional(),
    entities: z.array(z.looseObject({ id: Text, name: Text, purpose: Text, capabilities: Ids.optional() })),
    terms: z.array(z.looseObject({ term: Text, means: Text, from: Text.optional() })).optional(),
    risks: z.array(
        z.looseObject({
            id: Text,
            statement: Text,
            category: Text,
            categoryWords: Text.optional(),
            severity: Text,
            places: z
                .looseObject({
                    capabilities: z.array(z.looseObject({ id: Text })),
                    parts: z.array(z.looseObject({ id: Text })),
                    files: Ids,
                })
                .optional(),
        }),
    ),
});

const Bundle = z.looseObject({
    blocks: z.array(z.looseObject({ id: Text, name: Text, file: Text, layer: Text.optional() })),
    links: z.array(z.looseObject({ from: Text, to: Text, kind: Text })),
    rules: z.array(z.looseObject({ id: Text })),
});

const Journeys = z.looseObject({
    journeys: z.array(
        z.looseObject({
            id: Text,
            title: Text.optional(),
            capability: Text.optional(),
            outcome: Text,
            actor: Text,
            actions: Ids,
            rules: Ids,
            current: z.array(z.looseObject({ intent: Text, system: Text, from: Ids, confidence: Text })),
        }),
    ),
});

const AnalysisRequest = z.looseObject({ sourceRoots: Ids });

export type SystemPayload = z.output<typeof System>;
export type CapabilityPayload = z.output<typeof Capability>;
export type KnowledgePayload = z.output<typeof Knowledge>;
export type BundlePayload = z.output<typeof Bundle>;
export type JourneysPayload = z.output<typeof Journeys>;

export type Payloads = {
    readonly folder: string;
    readonly contractVersion: number;
    readonly writer: string;
    /** The SHA-256 of the manifest's text: what the payloads were, as one value. */
    readonly fingerprint: string;
    readonly system: SystemPayload;
    readonly capabilities: readonly CapabilityPayload[];
    readonly knowledge: KnowledgePayload;
    readonly index: BundlePayload;
    readonly journeys: JourneysPayload | undefined;
    /** The folder the analysed code was read from, when the analysis names one. */
    readonly sourceRoot: string | undefined;
};

/**
 * Read the payloads of one analysis through their manifest.
 * @param folder the payloads' folder
 * @returns every payload, checked
 */
export const readPayloads = (folder: string): Payloads => {
    const manifestPath = join(folder, "manifest.json");
    if (!existsSync(manifestPath)) {
        throw new ComposeError(
            "version",
            `${folder} has no manifest.json: the payloads were written before payloads were versioned; write them again with the analysis's write-payloads`,
        );
    }
    const manifestText = readText(manifestPath);
    const manifest = readJson(manifestPath, Manifest, manifestText);
    if (!(knownPayloadVersions as readonly number[]).includes(manifest.contractVersion)) {
        throw new ComposeError(
            "version",
            `${folder} follows payload contract version ${manifest.contractVersion}; compose reads version ${knownPayloadVersions.join(", ")}`,
        );
    }
    const texts = new Map<string, string>();
    for (const file of manifest.files) {
        const text = readText(join(folder, file.path));
        if (sha1(text) !== file.digest) {
            throw new ComposeError(
                "version",
                `${file.path} differs from the manifest's digest: the payloads were changed after they were written`,
            );
        }
        texts.set(file.path, text);
    }
    const ofKind = (kind: string) =>
        manifest.files.filter((file) => file.kind === kind).sort((one, other) => compareText(one.path, other.path));
    const one = <T extends z.ZodType>(kind: string, schema: T, required: boolean): z.output<T> | undefined => {
        const [file, extra] = ofKind(kind);
        if (extra !== undefined) throw new ComposeError("input", `the manifest lists two ${kind} payloads`);
        if (file === undefined) {
            if (required) throw new ComposeError("missing", `missing fact: the manifest lists no ${kind} payload`);
            return undefined;
        }
        return readJson(join(folder, file.path), schema, texts.get(file.path));
    };
    const system = one("system", System, true) as z.output<typeof System>;
    const capabilities = ofKind("capability").map((file) =>
        readJson(join(folder, file.path), Capability, texts.get(file.path)),
    );
    const named = new Set(capabilities.map((each) => each.capability.id));
    const absent = system.capabilities.filter((each) => !named.has(each.id));
    if (absent.length > 0) {
        throw new ComposeError(
            "missing",
            `missing fact: no capability payload for ${absent.map((each) => each.name).join(", ")}`,
        );
    }
    const requestPath = join(folder, "..", "work", "analysis-request.json");
    const request = existsSync(requestPath) ? readJson(requestPath, AnalysisRequest) : undefined;
    return {
        folder,
        contractVersion: manifest.contractVersion,
        writer: manifest.writer.version,
        fingerprint: sha256(manifestText),
        system,
        capabilities: capabilities.sort((a, b) => compareText(a.capability.id, b.capability.id)),
        knowledge: one("knowledge", Knowledge, true) as z.output<typeof Knowledge>,
        index: one("bundle", Bundle, true) as z.output<typeof Bundle>,
        journeys: one("journeys", Journeys, false),
        sourceRoot: request?.sourceRoots[0],
    };
};
