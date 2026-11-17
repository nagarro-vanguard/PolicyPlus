import { Effect, Stream } from "effect";
import { known } from "../run/collections";
import { Layer } from "../model/schemas/layer";
import { CodeKind } from "../model/schemas/code-kind";
import { RecordReads } from "./record-reads";

type Piece = { readonly codeKind?: string };

type Entry = typeof CodeKind.Type;

/**
 * The Map's code-kinds registry as readers use it (D173): every layer and code kind the Map accepted, by
 * record id, and what a block or a data definition takes from its entry: its layer and that layer's name. A named whole-set read, bounded by the registry, never by the code.
 * @returns the code kinds and what is read through them
 */
export const readCodeKinds = Effect.fnUntraced(function* () {
    const reads = yield* RecordReads;
    const entries = yield* Stream.runCollect(reads.recordsOfType("CodeKind", CodeKind));
    const layers = yield* Stream.runCollect(reads.recordsOfType("Layer", Layer));
    const layerName = new Map(layers.map((layer) => [layer.id, layer.name]));
    const byId = new Map<string, Entry>(entries.map((entry) => [entry.id, entry]));
    const entry = (recordId: string) => {
        const found = byId.get(recordId);
        if (found === undefined) {
            throw new Error(`${recordId} is cited as a code kind but is none: the store's foreign keys forbid it`);
        }
        return found;
    };
    const entryOf = (piece: Piece) => (piece.codeKind === undefined ? undefined : entry(piece.codeKind));
    const layerOf = (piece: Piece) => {
        const found = entryOf(piece);
        return found === undefined ? undefined : found.layer;
    };
    const nameOfLayer = (layer: string) => known(layerName, layer, "a code kind's layer is a layer");
    return {
        entries: byId,
        entry,
        layers,
        layerName: nameOfLayer,
        layerOf,
        layerNameOf: (piece: Piece) => {
            const layer = layerOf(piece);
            return layer === undefined ? undefined : nameOfLayer(layer);
        },
    };
});

export type CodeKinds = Effect.Success<ReturnType<typeof readCodeKinds>>;
