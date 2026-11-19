import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { fingerprintOf } from "./fingerprint";

export { fingerprintOf };

/*
 * What the plan reads of a code analysis: only the payload files, by their JSON Schema's shape, and only the fields it
 * uses. Nothing here imports code-analysis; extra fields are ignored.
 */
const Place = Schema.Struct({ file: Schema.String, firstLine: Schema.Int, lastLine: Schema.Int });

const Action = Schema.Struct({
    id: Schema.String,
    name: Schema.String,
    purpose: Schema.String,
    startedBy: Schema.String,
    screen: Schema.String,
    place: Place,
    rules: Schema.Array(Schema.String),
});

const Rule = Schema.Struct({
    id: Schema.String,
    says: Schema.String,
    gates: Schema.Boolean,
    place: Place,
    alsoRestsOn: Schema.Array(Place),
    screens: Schema.Array(Schema.String),
});

const CapabilityPayload = Schema.Struct({
    capability: Schema.Struct({ id: Schema.String, name: Schema.String, purpose: Schema.String }),
    area: Schema.String,
    layers: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            name: Schema.String,
            actions: Schema.Array(Action),
            rules: Schema.Array(Rule),
        }),
    ),
    data: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            name: Schema.String,
            access: Schema.String,
            stores: Schema.Array(Schema.String),
        }),
    ),
    concerns: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String, purpose: Schema.String })),
});

const SystemPayload = Schema.Struct({
    purpose: Schema.String,
    externals: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String, kind: Schema.String })),
});

const BundlePayload = Schema.Struct({
    rules: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            capabilities: Schema.Array(Schema.String),
            reading: Schema.String,
            why: Schema.String,
            gates: Schema.String,
        }),
    ),
    lifecycles: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            entity: Schema.Struct({ id: Schema.String, name: Schema.String }),
            states: Schema.Array(Schema.String),
            transitions: Schema.Array(
                Schema.Struct({
                    id: Schema.String,
                    from: Schema.Array(Schema.Int),
                    to: Schema.Int,
                    file: Schema.String,
                    firstLine: Schema.Int,
                    lastLine: Schema.Int,
                    reading: Schema.String,
                    why: Schema.String,
                }),
            ),
        }),
    ),
    unreached: Schema.Array(
        Schema.Struct({ what: Schema.String, file: Schema.String, firstLine: Schema.Int, lastLine: Schema.Int }),
    ),
});

export type CapabilityPayload = typeof CapabilityPayload.Type;
export type SystemPayload = typeof SystemPayload.Type;
export type BundlePayload = typeof BundlePayload.Type;

export type Analysis = {
    readonly root: string;
    readonly fingerprint: string;
    readonly system: SystemPayload;
    readonly capabilities: readonly CapabilityPayload[];
    readonly bundle: BundlePayload;
};

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as unknown;

/**
 * Reads the analysis's payloads.
 * @param analysisRoot the folder holding `payloads/`
 * @returns the system, every capability, the bundle payload and the fingerprint
 */
export const readAnalysis = (analysisRoot: string): Analysis => {
    const payloads = join(analysisRoot, "payloads");
    const system = Schema.decodeUnknownSync(SystemPayload)(readJson(join(payloads, "system.json")));
    const capabilities = readdirSync(payloads)
        .filter((name) => name.startsWith("capability-") && name.endsWith(".json"))
        .sort()
        .map((name) => Schema.decodeUnknownSync(CapabilityPayload)(readJson(join(payloads, name))));
    const bundle = Schema.decodeUnknownSync(BundlePayload)(readJson(join(payloads, "bundle.json")));
    return { root: analysisRoot, fingerprint: fingerprintOf(payloads), system, capabilities, bundle };
};
