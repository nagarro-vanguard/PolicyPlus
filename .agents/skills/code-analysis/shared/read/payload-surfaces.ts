import { Effect, Schema } from "effect";
import type { CapabilityPayload } from "../model/schemas/payloads";
import type { SystemPayload } from "../model/schemas/system-payload";
import { addToCount, compareText, unique } from "../run/collections";
import type { RecordStore } from "../store/database";
import { read } from "./payload-queries";
import { layersTouchedOf, screenContext } from "./payload-screens";
import type { Group } from "./payload-words";
import { plural } from "./payload-words";
import { ruleKeyOf } from "./payload-keys";
import type { SurfaceModel } from "./surfaces";

type Capabilities = readonly CapabilityPayload[];

type ActionOf = CapabilityPayload["layers"][number]["actions"][number] & { readonly capability: string };

export type Places = {
    readonly model: SurfaceModel;
    readonly testsOf: (rule: string) => readonly string[];
};

/**
 * Whether a place is part of the product: not a test suite or a build step, and not mostly in tests or tool parts.
 * @param surface the place
 * @returns true when it is the product's
 */
const productOf = (surface: SurfaceModel["surfaces"][number]) => {
    const outside = surface.entries.filter((entry) => entry.partKind === "tests" || entry.partKind === "tool").length;
    return surface.kind !== "test" && surface.kind !== "buildStep" && outside * 2 < surface.entries.length;
};

type Lookups = {
    readonly layerOfRule: ReadonlyMap<string, string>;
    readonly groupOfLayer: ReadonlyMap<string, Group>;
    readonly commit: string;
};

/**
 * How many of some entry points a person, a schedule and another system start.
 * @param entries the entry points
 * @returns the counts
 */
const startersOf = (entries: ReadonlyArray<{ readonly startedBy: string }>) => {
    const count = (who: string) => entries.filter((entry) => entry.startedBy === who).length;
    return { person: count("person"), schedule: count("schedule"), otherSystem: count("otherSystem") };
};

/**
 * One place of the system, with its entry points across capabilities, the layers they touch, the test suites that
 * reach its rules and its context.
 * @param surface the place
 * @param actions its entry points as the capability payloads hold them
 * @param input everything else a place is made from
 * @param input.payloads every capability's payload
 * @param input.places the places and the tests reaching each rule
 * @param input.lookups the layer deciding each rule, the group of each layer and the commit
 * @returns the place
 */
const surfaceOf = (
    surface: SurfaceModel["surfaces"][number],
    actions: readonly ActionOf[],
    input: { readonly payloads: Capabilities; readonly places: Places; readonly lookups: Lookups },
): NonNullable<SystemPayload["surfaces"]>[number] => {
    const { payloads, places, lookups } = input;
    const rules = unique(actions.flatMap((action) => action.rules));
    const product = productOf(surface);
    const noun = places.model.nounOf(surface.kind);
    return {
        key: surface.key,
        name: surface.name,
        purpose: surface.purpose,
        kind: surface.kind,
        noun: { ...noun },
        unnamed: surface.unnamed,
        product,
        places: [...surface.places],
        files: unique(surface.entries.map((entry) => entry.file)).toSorted(compareText),
        capabilities: unique(
            surface.entries.flatMap((entry) => (entry.capability === null ? [] : [entry.capability])),
        ).toSorted(compareText),
        actionIds: surface.entries.map((entry) => entry.id),
        actions: surface.entries.length,
        startedBy: startersOf(surface.entries),
        rules: rules.length,
        reachedByTests: product ? unique(rules.flatMap((rule) => places.testsOf(rule))).toSorted(compareText) : [],
        layersTouched: layersTouchedOf(actions, lookups.layerOfRule, lookups.groupOfLayer),
        context: screenContext({
            key: surface.key,
            actions,
            payloads,
            layerOfRule: lookups.layerOfRule,
            groupOfLayer: lookups.groupOfLayer,
            commit: lookups.commit,
            scope: `The ${noun.one} ${surface.name} of the whole system: ${plural(surface.entries.length, "action", "actions")}${surface.unnamed ? ", named after its code because no one named it" : ""}. ${surface.purpose}`.trim(),
        }),
    };
};

/**
 * Every place of the system, by key, and the entry points none holds.
 * @param payloads every capability's payload
 * @param places the places and the tests reaching each rule
 * @param lookups the layer deciding each rule, the group of each layer and the commit
 * @returns the places and the unplaced entry points
 */
const surfacesOfSystem = (
    payloads: Capabilities,
    places: Places,
    lookups: Lookups,
): Pick<SystemPayload, "surfaces" | "unplaced"> => {
    const actionOf = new Map<string, ActionOf>(
        payloads.flatMap((each) =>
            each.layers.flatMap((layer) =>
                layer.actions.map((action) => [action.id, { ...action, capability: each.capability.id }] as const),
            ),
        ),
    );
    const { model } = places;
    return {
        surfaces: model.surfaces.map((surface) =>
            surfaceOf(
                surface,
                surface.entries.flatMap((entry) => {
                    const action = actionOf.get(entry.id);
                    return action === undefined ? [] : [action];
                }),
                { payloads, places, lookups },
            ),
        ),
        unplaced: {
            entryPoints: model.unplaced.map((entry) => entry.id),
            why:
                model.unplaced.length === 0
                    ? "Every entry point is in a place."
                    : "The briefing judged their candidates to be no place a reader visits.",
        },
    };
};

/**
 * What the system payload holds of its places: the places and the unplaced entry points, how many entry points each
 * layer holds, and the rules no capability reaches. Without the places, only the rules.
 * @param store the record store, read only
 * @param payloads every capability's payload
 * @param places the places and the tests reaching each rule; none for a payload written without them
 * @param lookups the layer deciding each rule, the group of each layer and the commit
 * @returns the fields to add to the system payload, and each layer's count to add to it
 */
export const placesOfSystem = Effect.fnUntraced(function* (
    store: RecordStore["Service"],
    payloads: Capabilities,
    places: Places | undefined,
    lookups: Lookups,
) {
    const perLayer = places === undefined ? undefined : entryPointsByLayer(places.model);
    return {
        fields: {
            ...(places === undefined ? {} : surfacesOfSystem(payloads, places, lookups)),
            rulesInNoCapability: yield* rulesInNoCapability(store),
        },
        countOf: (layer: string) => {
            if (perLayer === undefined) {
                return {};
            }
            const found = perLayer.get(layer);
            return { entryPoints: found === undefined ? 0 : found };
        },
    };
});

/**
 * How many entry points each layer holds, whoever starts them.
 * @param model the places, holding every entry point
 * @returns the count by layer id
 */
const entryPointsByLayer = (model: SurfaceModel) => {
    const counts = new Map<string, number>();
    model.entries.forEach((entry) => {
        if (entry.layer !== null) {
            addToCount(counts, entry.layer, 1);
        }
    });
    return counts;
};

const LoneRule = Schema.Struct({
    id: Schema.String,
    says: Schema.String,
    file: Schema.String,
    firstLine: Schema.Number,
});

/**
 * The rules no capability's flows reach: decided in blocks no entry point assigned to a capability reaches. They are
 * in no capability payload, so the system lists them.
 * @param store the record store, read only
 * @returns the count and each rule, by file and line
 */
const rulesInNoCapability = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const rows = yield* read(
        store,
        LoneRule,
        (sql) => sql`SELECT r.id AS id, coalesce(json_extract(r.body, '$.says'), '') AS says, f.path AS file,
                r.firstLine AS firstLine
            FROM record r JOIN file f ON f.fileNumber = r.fileNumber
            WHERE r.type = 'BusinessRule' AND NOT EXISTS (
                SELECT 1 FROM ruleBlock rb JOIN blockCapability bc ON bc.block = rb.block WHERE rb.rule = r.recordNumber)
            ORDER BY f.path, r.firstLine, r.id`,
    );
    return {
        count: rows.length,
        rules: rows.map((row) => ({ ...row, key: ruleKeyOf(row) })),
    };
});

/**
 * How many entry points each kind of starter has, in the layers of the product only, so tests do not make the system
 * look driven by other systems.
 * @param payloads every capability's payload
 * @param product the ids of the layers of the product
 * @returns the counts
 */
export const entriesOf = (payloads: Capabilities, product: ReadonlySet<string>) => {
    const starters = payloads.flatMap((each) =>
        each.layers
            .filter((layer) => product.has(layer.id))
            .flatMap((layer) => layer.actions.map((action) => action.startedBy)),
    );
    const count = (who: string) => starters.filter((each) => each === who).length;
    return { person: count("person"), otherSystem: count("otherSystem"), schedule: count("schedule") };
};
