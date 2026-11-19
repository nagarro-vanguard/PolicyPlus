import { Effect } from "effect";
import type { CapabilityPayload } from "../model/schemas/payloads";
import type { RecordStore } from "../store/database";
import { contextOf } from "./payload-context";
import { gapLines, layersOf, lookups, pointLines, type PayloadFacts, type Rows } from "./payload-layers";
import { capabilityRows, read } from "./payload-queries";
import { commitOf } from "./provenance";
import { layersTouchedOf } from "./payload-screens";
import { StoreRow } from "./system-queries";
import { placeOf, plural, ruleLine, textOf } from "./payload-words";
import { compareText, getOrCreate } from "../run/collections";

type Layers = CapabilityPayload["layers"];

/**
 * A concern's verdict as the payload's closed set.
 * @param verdict the stored verdict
 * @returns the verdict
 */
const verdictOf = (verdict: string): "crossCutting" | "sharedDomain" | "neither" =>
    verdict === "crossCutting" || verdict === "sharedDomain" ? verdict : "neither";

/**
 * The screens of a capability, each with its controls, the layers its actions touch, its rules and its context.
 * @param rows the capability's rows
 * @param layers the capability's layers
 * @param commit the commit the analysis describes
 * @returns the screens
 */
const screensOf = (rows: Rows, layers: Layers, commit: string): CapabilityPayload["screens"] => {
    const { filesOf, dataOf } = lookups(rows);
    const byRule = new Map(layers.flatMap((layer) => layer.rules.map((rule) => [rule.id, rule] as const)));
    const layerOfRule = new Map(layers.flatMap((layer) => layer.rules.map((rule) => [rule.id, layer.id] as const)));
    const groupOfLayer = new Map(layers.map((layer) => [layer.id, layer.group] as const));
    return rows.screens.map((screen) => {
        const name = textOf(screen.screen);
        const acts = layers.flatMap((layer) => layer.actions).filter((action) => action.screen === name);
        const ruleIds = [...new Set(acts.flatMap((action) => action.rules))];
        const files = acts.flatMap((action) =>
            rows.actionFiles.filter((each) => each.entryPoint === action.id).map((each) => each.file),
        );
        const controls = rows.controls
            .filter((control) => control.screen === screen.screen)
            .map((control) => ({ name: control.control, declaredAs: control.declaredAs }));
        return {
            name,
            actions: screen.actions,
            controls,
            layersTouched: name === "" ? [] : layersTouchedOf(acts, layerOfRule, groupOfLayer),
            rules: ruleIds,
            context: contextOf({
                scope: `${name === "" ? "Actions no screen holds" : `Screen ${name}`} of ${rows.capability.name}: ${plural(screen.actions, "action", "actions")}, ${plural(controls.length, "control", "controls")}.`,
                inside: { label: "Its actions", lines: acts.map((action) => action.purpose) },
                files: filesOf(files),
                ...dataOf(acts.flatMap((action) => rows.actionData.filter((each) => each.entryPoint === action.id))),
                rules: ruleIds.flatMap((rid) => {
                    const rule = byRule.get(rid);
                    return rule === undefined ? [] : [ruleLine(rule)];
                }),
                unconfirmed: pointLines(rows, "For the capability: "),
                notFollowed: gapLines(rows, new Set(files)),
                commit,
            }),
        };
    });
};

/**
 * The places (surfaces) a capability's entry points are in, each with the capability's entry points there and the rules
 * they reach, by key.
 * @param layers the capability's layers
 * @param facts what is known across the system of the entry points
 * @returns the places
 */
const surfacesOf = (layers: Layers, facts: PayloadFacts): NonNullable<CapabilityPayload["surfaces"]> => {
    const byKey = new Map<string, Layers[number]["actions"][number][]>();
    for (const action of layers.flatMap((layer) => layer.actions)) {
        const key = facts.surfaceOf(action.id);
        if (key !== undefined) {
            getOrCreate(byKey, key).push(action);
        }
    }
    return [...byKey]
        .toSorted(([one], [other]) => compareText(one, other))
        .flatMap(([key, actions]) => {
            const named = facts.surfaceNamed(key);
            return named === undefined
                ? []
                : [
                      {
                          key,
                          name: named.name,
                          kind: named.kind,
                          noun: { ...named.noun },
                          unnamed: named.unnamed,
                          actions: actions.map((action) => action.id),
                          rules: [...new Set(actions.flatMap((action) => action.rules))],
                      },
                  ];
        });
};

/**
 * The kinds of data a capability uses, each with how it is reached and the stores it is kept in.
 * @param store the record store, read only
 * @param rows the capability's rows
 * @returns the kinds of data
 */
const dataOfCapability = Effect.fnUntraced(function* (store: RecordStore["Service"], rows: Rows) {
    const storeRows = yield* read(
        store,
        StoreRow,
        (sql) => sql`SELECT DISTINCT entity, externalSystemName AS store FROM v_entity_stores`,
    );
    return rows.data.map((kind) => ({
        id: kind.id,
        name: kind.name,
        access: kind.kinds.split(",").toSorted().join(" and "),
        stores: storeRows
            .filter((each) => each.entity === kind.id)
            .map((each) => each.store)
            .toSorted(),
    }));
});

/**
 * The capability's own context: its screens and layers, the data it saves and reads, its rules and what is unsettled.
 * @param input the rows, layers, screens, data and commit it is made from
 * @param input.rows the capability's rows
 * @param input.layers the capability's layers
 * @param input.screens the capability's screens
 * @param input.data the capability's kinds of data
 * @param input.commit the commit the analysis describes
 * @returns the context
 */
const capabilityContext = (input: {
    readonly rows: Rows;
    readonly layers: Layers;
    readonly screens: CapabilityPayload["screens"];
    readonly data: CapabilityPayload["data"];
    readonly commit: string;
}) => {
    const { rows, layers, screens, data, commit } = input;
    const named = (access: string) =>
        data
            .filter((kind) => kind.access.includes(access))
            .map((kind) => kind.name)
            .toSorted();
    return contextOf({
        scope: `Capability ${rows.capability.name}: ${rows.capability.purpose}`,
        inside: {
            label: "Its screens and layers",
            lines: [
                ...screens.map(
                    (screen) =>
                        `${screen.name === "" ? "Actions no screen holds" : `Screen ${screen.name}`}: ${plural(screen.actions, "action", "actions")}`,
                ),
                ...layers.map(
                    (layer) =>
                        `Layer ${layer.name}: ${plural(layer.actions.length, "action", "actions")}, ${plural(layer.rules.length, "rule", "rules")}`,
                ),
            ],
        },
        files: rows.fileUse,
        saves: named("saves"),
        reads: named("reads"),
        rules: layers.flatMap((layer) => layer.rules).map(ruleLine),
        unconfirmed: pointLines(rows, ""),
        notFollowed: gapLines(rows),
        commit,
    });
};

/**
 * One capability's payload: its layers with what it does and decides in each, its screens and their controls, the
 * judged shared code it passes through, its kinds of data, what it leaves unsettled and the links it could not follow,
 * each place with its context, each read by the capability so a store of any size reads only what it needs.
 * @param store the record store, read only
 * @param id the capability's record id
 * @param areaName the name of the area the capability belongs to; empty when none
 * @param facts what is known across the system of the entry points and rules (keys, places, addresses, readings,
 * tests); none leaves those fields and `surfaces` out
 * @returns the payload
 */
export const capabilityPayload = Effect.fnUntraced(function* (
    store: RecordStore["Service"],
    id: string,
    areaName: string,
    facts?: PayloadFacts,
) {
    const rows = yield* capabilityRows(store, id);
    const commit = yield* commitOf(store);
    const layers = layersOf(rows, commit, facts);
    const screens = screensOf(rows, layers, commit);
    const data = yield* dataOfCapability(store, rows);
    const allRules = layers.flatMap((layer) => layer.rules);
    const reachedByScreen = new Set(screens.filter((screen) => screen.name !== "").flatMap((screen) => screen.rules));
    const payload: CapabilityPayload = {
        capability: rows.capability,
        area: areaName,
        layers,
        screens,
        ...(facts === undefined ? {} : { surfaces: surfacesOf(layers, facts) }),
        concerns: rows.concerns.map((concern) => ({ ...concern, verdict: verdictOf(concern.verdict) })),
        data,
        gaps: rows.gaps.map((gap) => ({
            kind: gap.kind,
            reason: textOf(gap.reason),
            layer: textOf(gap.layer),
            place: placeOf(gap),
        })),
        openPoints: rows.openPoints.map((point) => ({
            statement: point.statement,
            why: point.why,
            ifWrong: point.ifWrong,
        })),
        totals: {
            actions: rows.actions.length,
            rules: rows.rules.length,
            blocks: rows.blocks,
            rulesOnNoScreen: allRules.filter((rule) => !reachedByScreen.has(rule.id)).length,
        },
        context: capabilityContext({ rows, layers, screens, data, commit }),
    };
    return payload;
});
