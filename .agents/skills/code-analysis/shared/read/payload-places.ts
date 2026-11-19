import { Effect } from "effect";
import { analysisPaths, sourceBase } from "../run/analysis-layout";
import { AnalysisRequest } from "../run/analysis-request";
import type { Catalogue } from "../run/catalogue";
import { readDocumentStrictly } from "../run/json-files";
import { FileAccess } from "../source/file-access";
import type { RecordStore } from "../store/database";
import { readAddresses, readTestReach } from "./entry-facts";
import { readingOf, type Readings } from "./payload-bundle";
import type { PayloadFacts } from "./payload-layers";
import { addressGaps } from "./addresses";
import { readSurfaceModel, surfaceGaps } from "./surfaces";

/**
 * The folder the analysed source is in, from the run's request; none when the request is not in `work/`.
 * @param root the analysis root
 * @returns the folder, or none
 */
const sourceFolderOf = Effect.fnUntraced(function* (root: string) {
    const path = analysisPaths(root).analysisRequest;
    if (!(yield* (yield* FileAccess).exists(path))) {
        return undefined;
    }
    return sourceBase((yield* readDocumentStrictly(path, AnalysisRequest)).sourceRoots);
});

/**
 * What the payloads know of the places, entry points and rules across the whole system, derived by code once: the
 * places of every starter, each entry point's key, place, address and whether tooling starts it, and each rule's second
 * reading and the test suites reaching it; with the gates on the places and the addresses.
 * @param store the record store, read only
 * @param root the analysis root
 * @param catalogue the catalogue, for the kinds' nouns
 * @param readings where a second reading left each rule
 * @returns the places, the facts the capability payloads take, the tests reaching each rule and the gaps
 */
export const readPlaces = Effect.fnUntraced(function* (
    store: RecordStore["Service"],
    root: string,
    catalogue: Catalogue,
    readings: Readings,
) {
    const model = yield* readSurfaceModel(store, catalogue);
    const addresses = yield* readAddresses(model, yield* sourceFolderOf(root));
    const tests = yield* readTestReach(store, model);
    const surfaceByKey = new Map(model.surfaces.map((surface) => [surface.key, surface] as const));
    const entryById = new Map(model.entries.map((entry) => [entry.id, entry] as const));
    const testsOf = (rule: string) => {
        const found = tests.get(rule);
        return found === undefined ? [] : found;
    };
    const facts: PayloadFacts = {
        entryKey: (id) => model.keys.get(id),
        surfaceOf: (id) => {
            const surface = model.surfaceOf.get(id);
            return surface === undefined ? undefined : surface.key;
        },
        surfaceNamed: (key) => {
            const surface = surfaceByKey.get(key);
            return surface === undefined
                ? undefined
                : {
                      name: surface.name,
                      kind: surface.kind,
                      noun: model.nounOf(surface.kind),
                      unnamed: surface.unnamed,
                  };
        },
        addressOf: (id) => {
            const found = addresses.get(id);
            return found === undefined ? undefined : found.address;
        },
        toolingOf: (id) => {
            const entry = entryById.get(id);
            if (entry === undefined) {
                return false;
            }
            const kind = model.kindOf(entry);
            return kind === "test" || kind === "buildStep" || entry.partKind === "tests" || entry.partKind === "tool";
        },
        testsOf,
        readingOf: (rule) => readingOf(readings, rule),
    };
    const gaps = [
        ...surfaceGaps(
            model.entries.map((entry) => entry.id),
            model,
        ),
        ...addressGaps([...addresses].map(([id, found]) => ({ id, ...found }))),
    ];
    return { model, facts, testsOf, addressed: addresses.size, gaps };
});
