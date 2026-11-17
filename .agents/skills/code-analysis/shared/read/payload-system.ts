import { Effect, Schema } from "effect";
import type { CapabilityPayload } from "../model/schemas/payloads";
import type { SystemPayload } from "../model/schemas/system-payload";
import { compareText, known } from "../run/collections";
import type { RecordStore } from "../store/database";
import { contextOf, pagePathOf, screenKeyOf } from "./payload-context";
import { judgeLayers, externalsOf } from "./payload-facts";
import {
    AreaRow,
    CapabilityIndexRow,
    EdgeRow,
    LayerRecordRow,
    ListOfText,
    PurposeRow,
    ScreenRecordRow,
    commitOf,
    layerRoles,
    numberOf,
    read,
} from "./payload-queries";
import { layersTouchedOf, screenContext } from "./payload-screens";
import { groupOf, plural, ruleLine, slugOf, type Group } from "./payload-words";
import { externalUse, layerPartUse } from "./system-queries";

type Capabilities = readonly CapabilityPayload[];

type ActionOf = CapabilityPayload["layers"][number]["actions"][number] & { readonly capability: string };

type IndexEntry = Schema.Schema.Type<typeof CapabilityIndexRow>;

/**
 * The longest run of leading characters every page path shares, cut back to a folder, so screens are told apart by what
 * is left.
 * @param pages the pages' paths
 * @returns the shared folders, with the trailing slash; empty when they share none
 */
const sharedFolders = (pages: readonly string[]) => {
    const [first] = pages;
    const shared = pages.reduce(
        (prefix, page) => {
            let length = 0;
            while (length < prefix.length && length < page.length && prefix[length] === page[length]) {
                length++;
            }
            return prefix.slice(0, length);
        },
        first === undefined ? "" : first,
    );
    return shared.includes("/") ? shared.slice(0, shared.lastIndexOf("/") + 1) : "";
};

/**
 * Every action of every capability, with the capability that holds it.
 * @param payloads every capability's payload
 * @returns the actions
 */
const everyActionOf = (payloads: Capabilities): ActionOf[] =>
    payloads.flatMap((each) =>
        each.layers.flatMap((layer) => layer.actions.map((action) => ({ ...action, capability: each.capability.id }))),
    );

/**
 * The layer that decides each rule, and the group of each layer.
 * @param payloads every capability's payload
 * @param roles the layers with their roles
 * @returns lookups by rule id and by layer id
 */
const layerLookups = (payloads: Capabilities, roles: readonly { readonly layer: string; readonly role: string }[]) => ({
    layerOfRule: new Map(
        payloads.flatMap((each) =>
            each.layers.flatMap((layer) => layer.rules.map((rule) => [rule.id, layer.id] as const)),
        ),
    ),
    groupOfLayer: new Map<string, Group>(roles.map((each) => [each.layer, groupOf(each.role)] as const)),
});

type Grouped = Map<string, { record: typeof ScreenRecordRow.Type | undefined; actions: ActionOf[]; key: string }>;

/**
 * Group the actions of the candidate screens into the screens the briefing named; a candidate it did not name stays
 * a screen of its own, and one it judged no screen is left out.
 * @param screenActions the actions of each candidate screen, by its key
 * @param named the screens the briefing named
 * @param folders the folders every page shares
 * @returns the screens, each with its actions and its address
 */
const groupScreens = (
    screenActions: ReadonlyMap<string, ActionOf[]>,
    named: ReadonlyArray<typeof ScreenRecordRow.Type>,
    folders: string,
): Grouped => {
    const nameOfKey = new Map(named.flatMap((record) => record.places.map((place) => [place, record] as const)));
    const grouped: Grouped = new Map();
    for (const [key, actions] of screenActions) {
        const record = nameOfKey.get(key);
        if (record !== undefined && record.kind === "other") {
            continue;
        }
        const groupKey = record === undefined ? `path:${key}` : `record:${record.id}`;
        const own = key.startsWith(folders) ? key.slice(folders.length) : key;
        if (grouped.has(groupKey)) {
            known(grouped, groupKey, "checked").actions.push(...actions);
        } else {
            grouped.set(groupKey, {
                record,
                actions: [...actions],
                key: record === undefined ? own : slugOf(record.name),
            });
        }
    }
    return grouped;
};

/**
 * The screens of the system, merged by page across capabilities, each with the layers it touches and its context.
 * @param payloads every capability's payload
 * @param roles the layers with their roles
 * @param commit the commit the analysis describes
 * @param named the screens the briefing named
 * @returns the screens, ordered by key
 */
const screensOfSystem = (
    payloads: Capabilities,
    roles: readonly { readonly layer: string; readonly role: string }[],
    commit: string,
    named: ReadonlyArray<typeof ScreenRecordRow.Type> = [],
): SystemPayload["screens"] => {
    const { layerOfRule, groupOfLayer } = layerLookups(payloads, roles);
    const everyAction = everyActionOf(payloads);
    const pages = [
        ...new Set(
            everyAction
                .filter((action) => action.startedBy === "person")
                .flatMap((action) => {
                    const page = pagePathOf(action.place.file);
                    return page === undefined ? [] : [page];
                }),
        ),
    ];
    const folders = sharedFolders(pages);
    const screenActions = new Map<string, ActionOf[]>();
    for (const action of everyAction) {
        const key = screenKeyOf(action, pages);
        if (key !== undefined) {
            screenActions.set(key, [...(screenActions.has(key) ? known(screenActions, key, "checked") : []), action]);
        }
    }
    const grouped = groupScreens(screenActions, named, folders);
    const used = new Map<string, number>();
    return [...grouped.values()]
        .map(({ record, actions, key }) => {
            const last = key.split("/").at(-1);
            const before = used.get(key);
            const times = (before === undefined ? 0 : before) + 1;
            used.set(key, times);
            const unique = times === 1 ? key : `${key}-${times}`;
            return {
                key: unique,
                name: record === undefined ? (last === undefined ? key : last) : record.name,
                purpose: record === undefined ? "" : record.purpose,
                files: [...new Set(actions.map((action) => action.place.file))].toSorted(),
                capabilities: [...new Set(actions.map((action) => action.capability))].toSorted(),
                actionIds: actions.map((action) => action.id),
                actions: actions.length,
                rules: new Set(actions.flatMap((action) => action.rules)).size,
                layersTouched: layersTouchedOf(actions, layerOfRule, groupOfLayer),
                context: screenContext({ key: unique, actions, payloads, layerOfRule, groupOfLayer, commit }),
            };
        })
        .toSorted((one, other) => compareText(one.key, other.key));
};

/**
 * One line that says what a capability holds, for a context.
 * @param entry the capability's index entry
 * @returns the line
 */
const lineOf = (entry: IndexEntry) =>
    `Capability ${entry.name}: ${plural(entry.screens, "screen", "screens")}, ${plural(entry.actions, "action", "actions")}, ${plural(entry.rules, "rule", "rules")}`;

/**
 * The rules of some capabilities as context lines, each once.
 * @param payloads every capability's payload
 * @param ids the capabilities' record ids
 * @returns the lines
 */
const rulesOf = (payloads: Capabilities, ids: readonly string[]) => {
    const seen = new Map<string, string>();
    for (const each of payloads.filter((payload) => ids.includes(payload.capability.id))) {
        for (const layer of each.layers) {
            layer.rules.forEach((rule) => seen.set(rule.id, ruleLine(rule)));
        }
    }
    return [...seen.values()];
};

type AreaRowType = Schema.Schema.Type<typeof AreaRow>;

/**
 * The areas of the system, each with the capabilities it groups and its context.
 * @param areas the area rows
 * @param capabilities the capabilities' index entries
 * @param payloads every capability's payload
 * @param commit the commit the analysis describes
 * @returns the areas
 */
const areasOfSystem = (
    areas: readonly AreaRowType[],
    capabilities: readonly IndexEntry[],
    payloads: Capabilities,
    commit: string,
): SystemPayload["areas"] =>
    areas.map((area) => {
        const ids = [...Schema.decodeUnknownSync(ListOfText)(area.capabilities)];
        return {
            id: area.id,
            name: area.name,
            purpose: area.purpose,
            capabilities: ids,
            context: contextOf({
                scope: `Area ${area.name}: ${area.purpose}`,
                inside: {
                    label: "Its capabilities",
                    lines: capabilities.filter((entry) => ids.includes(entry.id)).map(lineOf),
                },
                files: [],
                saves: [],
                reads: [],
                rules: rulesOf(payloads, ids),
                unconfirmed: [],
                notFollowed: [],
                commit,
            }),
        };
    });

/**
 * The rows the system payload is read from the store as.
 * @param store the record store, read only
 * @returns the areas, layer records, layer edges, capabilities and purpose
 */
const systemRows = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const areas = yield* read(
        store,
        AreaRow,
        (
            sql,
        ) => sql`SELECT g.id AS id, json_extract(g.body, '$.name') AS name, json_extract(g.body, '$.purpose') AS purpose,
                json_extract(g.body, '$.capabilities') AS capabilities
            FROM record g WHERE g.type = 'CapabilityGroup' ORDER BY g.recordNumber`,
    );
    const layerRecords = yield* read(
        store,
        LayerRecordRow,
        (
            sql,
        ) => sql`SELECT id, coalesce(json_extract(body, '$.purpose'), '') AS purpose, coalesce(json_extract(body, '$.evidence'), '[]') AS evidence
            FROM record WHERE type = 'Layer'`,
    );
    const edges = yield* read(
        store,
        EdgeRow,
        (sql) => sql`SELECT fromLayer, toLayer, kind, links FROM v_layer_edges ORDER BY fromLayer, toLayer, kind`,
    );
    const capabilities = yield* read(
        store,
        CapabilityIndexRow,
        (sql) => sql`SELECT c.capability AS id, c.name AS name, c.purpose AS purpose,
                (SELECT count(*) FROM v_capability_screens s WHERE s.capability = c.capability) AS screens,
                (SELECT count(*) FROM v_entry_point_capability e WHERE e.capability = c.capability) AS actions,
                (SELECT count(DISTINCT rb.rule) FROM blockCapability bc JOIN ruleBlock rb ON rb.block = bc.block
                    WHERE bc.capability = (SELECT recordNumber FROM record WHERE id = c.capability)) AS rules
            FROM v_capability c ORDER BY c.name`,
    );
    const [purposeRow] = yield* read(
        store,
        PurposeRow,
        (sql) => sql`SELECT statement FROM v_fact WHERE subjectRegistry = 'system' AND aspect = 'purpose' LIMIT 1`,
    );
    const screenRecords = yield* read(
        store,
        ScreenRecordRow,
        (sql) => sql`SELECT id, json_extract(body, '$.name') AS name, json_extract(body, '$.purpose') AS purpose,
                json_extract(body, '$.kind') AS kind, json_extract(body, '$.places') AS places
            FROM record WHERE type = 'Screen' ORDER BY recordNumber`,
    );
    return {
        areas,
        layerRecords,
        edges,
        capabilities,
        screenRecords,
        purpose: purposeRow === undefined ? "" : purposeRow.statement,
    };
});

/**
 * How many entry points each kind of starter has, in the layers of the product only, so tests do not make the system
 * look driven by other systems.
 * @param payloads every capability's payload
 * @param product the ids of the layers of the product
 * @returns the counts
 */
const entriesOf = (payloads: Capabilities, product: ReadonlySet<string>) => {
    const starters = payloads.flatMap((each) =>
        each.layers
            .filter((layer) => product.has(layer.id))
            .flatMap((layer) => layer.actions.map((action) => action.startedBy)),
    );
    const count = (who: string) => starters.filter((each) => each === who).length;
    return { person: count("person"), otherSystem: count("otherSystem"), schedule: count("schedule") };
};

/**
 * The whole system's payload: its purpose, capabilities, areas, layers with the role of each, the links between
 * layers, and what could not be followed; each area and the system carry their context.
 * @param store the record store, read only
 * @param payloads every capability's payload, for what the areas and the system hold together
 * @returns the payload
 */
export const systemPayload = Effect.fnUntraced(function* (store: RecordStore["Service"], payloads: Capabilities) {
    const layers = (yield* layerRoles(store)).toSorted(
        (one, other) => compareText(one.name, other.name) || compareText(one.layer, other.layer),
    );
    const { areas, layerRecords, edges, capabilities, screenRecords, purpose } = yield* systemRows(store);
    const commit = yield* commitOf(store);
    const unresolved = yield* numberOf(store, (sql) => sql`SELECT count(*) AS number FROM v_unresolved_link`);
    const unattributed = yield* numberOf(
        store,
        (sql) => sql`SELECT count(*) AS number FROM v_block WHERE capabilities = 0`,
    );
    const judged = judgeLayers(layers, yield* layerPartUse(store));
    const purposeOfLayer = new Map(layerRecords.map((each) => [each.id, each.purpose] as const));
    const payload: SystemPayload = {
        purpose,
        capabilities: capabilities.map((each) => ({ ...each })),
        areas: areasOfSystem(areas, capabilities, payloads, commit),
        layers: judged.map((layer) => ({
            id: layer.layer,
            name: layer.name,
            role: layer.role,
            purpose: purposeOfLayer.has(layer.layer) ? known(purposeOfLayer, layer.layer, "checked") : "",
            group: groupOf(layer.role),
            blocks: layer.blocks,
            product: layer.product,
        })),
        screens: screensOfSystem(payloads, layers, commit, screenRecords),
        edges: edges.map((edge) => ({ from: edge.fromLayer, to: edge.toLayer, kind: edge.kind, links: edge.links })),
        entries: entriesOf(payloads, new Set(judged.filter((each) => each.product).map((each) => each.layer))),
        externals: externalsOf(yield* externalUse(store)),
        gaps: { unresolvedLinks: unresolved, unattributedBlocks: unattributed },
        context: contextOf({
            scope: `The whole system. ${purpose}`,
            inside: {
                label: "Its areas and capabilities",
                lines: [...areas.map((area) => `Area ${area.name}`), ...capabilities.map(lineOf)],
            },
            files: [],
            saves: [],
            reads: [],
            rules: rulesOf(
                payloads,
                capabilities.map((entry) => entry.id),
            ),
            unconfirmed: [],
            notFollowed: [
                `${plural(unresolved, "call", "calls")} go somewhere the code does not show`,
                `${plural(unattributed, "routine", "routines")} are reached by no action (mostly generated screen layout)`,
            ],
            commit,
        }),
    };
    return payload;
});
