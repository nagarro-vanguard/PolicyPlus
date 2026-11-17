import { describe, expect, test } from "bun:test";
import { derive, makeRoot, rowsOf, type Spec } from "./fixture";

/**
 * A graph with three tiers: a screen handler a person starts, a rule in the middle, a table at the end. The views that
 * read the derived tables must say what each layer does, how the layers connect and in what order a flow meets them.
 */
const tiered: Spec = {
    layers: [
        { id: "layer-ui", name: "Screens" },
        { id: "layer-logic", name: "Logic" },
        { id: "layer-data", name: "Storage" },
    ],
    codeKinds: [
        { id: "codekind-ui", name: "Handler", layer: "layer-ui" },
        { id: "codekind-logic", name: "Rule", layer: "layer-logic" },
        { id: "codekind-data", name: "Reader", layer: "layer-data" },
    ],
    externalSystems: [{ id: "external-db", kind: "dataStore" }],
    blocks: [
        { id: "block-handler", first: 1, last: 9, codeKind: "codekind-ui", entry: true, startedBy: "person" },
        { id: "block-rule", first: 10, last: 19, codeKind: "codekind-logic" },
        { id: "block-reader", first: 20, last: 29, codeKind: "codekind-data" },
        { id: "block-lonely", first: 30, last: 39, codeKind: "codekind-logic" },
    ],
    links: [
        { id: "link-1", from: "block-handler", to: "block-rule", kind: "call" },
        { id: "link-2", from: "block-rule", to: "block-reader", kind: "call" },
        { id: "link-3", from: "block-reader", kind: "reads", toExternal: "external-db" },
        { id: "link-4", from: "block-rule", kind: "call", unresolved: "chosen at run time" },
    ],
};

const build = async (spec: Spec = tiered) => {
    const root = makeRoot(spec);
    await derive(root);
    return root;
};

describe("layer views", () => {
    test("layer edges count the links between layers by kind", async () => {
        const rows = rowsOf(
            await build(),
            "SELECT fromName, toName, kind, links FROM v_layer_edges ORDER BY fromName, toName",
        );
        expect(rows).toEqual([
            { fromName: "Logic", toName: "Storage", kind: "call", links: 1 },
            { fromName: "Screens", toName: "Logic", kind: "call", links: 1 },
        ]);
    });

    test("a layer's role comes from who starts its entry points and what its blocks reach", async () => {
        const rows = rowsOf(await build(), "SELECT name, role FROM v_layer_role ORDER BY name");
        expect(rows).toEqual([
            { name: "Logic", role: "decides" },
            { name: "Screens", role: "facesPerson" },
            { name: "Storage", role: "reachesStore" },
        ]);
    });

    test("a layer whose entry points are all started by a schedule runs on a schedule, with no screen layer at all", async () => {
        const batch: Spec = {
            ...tiered,
            blocks: tiered.blocks.map((block) => (block.entry === true ? { ...block, startedBy: "schedule" } : block)),
        };
        const roles = rowsOf(await build(batch), "SELECT name, role FROM v_layer_role ORDER BY name").map(
            (row) => row.role,
        );
        expect(roles).toContain("runsOnSchedule");
        expect(roles).not.toContain("facesPerson");
    });

    test("an entry point's layers come in the order its flow first meets them", async () => {
        const rows = rowsOf(await build(), "SELECT layerName, depth FROM v_entry_point_path ORDER BY depth");
        expect(rows).toEqual([
            { layerName: "Screens", depth: 0 },
            { layerName: "Logic", depth: 1 },
            { layerName: "Storage", depth: 2 },
        ]);
    });

    test("a capability's layers hold its blocks, its actions and its rules, and a block no entry point reaches is in none", async () => {
        const rows = rowsOf(
            await build(),
            "SELECT layerName, blocks, actions, sharedBlocks FROM v_capability_layers ORDER BY layerName",
        );
        expect(rows).toEqual([
            { layerName: "Logic", blocks: 1, actions: 0, sharedBlocks: 0 },
            { layerName: "Screens", blocks: 1, actions: 1, sharedBlocks: 0 },
            { layerName: "Storage", blocks: 1, actions: 0, sharedBlocks: 0 },
        ]);
        expect(rowsOf(await build(), "SELECT count(*) AS n FROM v_block WHERE capabilities = 0")).toEqual([{ n: 1 }]);
    });

    test("a link that reaches nothing is listed with its layer and capability", async () => {
        const rows = rowsOf(await build(), "SELECT kind, reason, layer, capability FROM v_unresolved_link");
        expect(rows).toEqual([
            { kind: "call", reason: "chosen at run time", layer: "layer-logic", capability: "capability-1" },
        ]);
    });

    test("the layer path matches the layers of the reach", async () => {
        const root = await build();
        const fromPath = rowsOf(root, "SELECT entryPoint, layer FROM v_entry_point_path ORDER BY 1, 2");
        const fromReach = rowsOf(
            root,
            `SELECT DISTINCT e.id AS entryPoint, l.id AS layer FROM entryPointReach w JOIN record e ON e.recordNumber = w.entryPoint
             JOIN ref rk ON rk.fromRecord = w.block AND rk.role = 'codeKind' JOIN ref rl ON rl.fromRecord = rk.toRecord AND rl.role = 'layer'
             JOIN record l ON l.recordNumber = rl.toRecord ORDER BY 1, 2`,
        );
        expect(fromPath).toEqual(fromReach);
    });
});

describe("query plans", () => {
    const views = [
        "v_block",
        "v_layer_edges",
        "v_layer_role",
        "v_capability_layers",
        "v_file_layers",
        "v_entry_point_path",
        "v_unresolved_link",
        "v_capability_blocks",
        "v_block_capabilities",
        "v_entry_point_capability",
        "v_block_part",
    ];

    test("no view builds a temporary index to answer a whole-view query", async () => {
        const root = await build();
        for (const view of views) {
            const plan = rowsOf(root, `EXPLAIN QUERY PLAN SELECT * FROM ${view}`)
                .map((row) => String(row.detail))
                .join("\n");
            expect(plan, view).not.toContain("AUTOMATIC");
        }
    });

    test("a lookup by capability or block searches an index and never scans a table", async () => {
        const root = await build();
        for (const query of [
            "SELECT * FROM v_capability_blocks WHERE capability = 'capability-1'",
            "SELECT * FROM v_capability_layers WHERE capability = 'capability-1'",
            "SELECT * FROM v_block_capabilities WHERE block = 'block-rule'",
            "SELECT * FROM v_block WHERE block = 'block-rule'",
            "SELECT * FROM v_entry_point_path WHERE entryPoint = 'block-handler'",
        ]) {
            const plan = rowsOf(root, `EXPLAIN QUERY PLAN ${query}`).map((row) => String(row.detail));
            expect(
                plan.filter(
                    (line) => line.startsWith("SCAN") && !line.includes("CO-ROUTINE") && !line.startsWith("SCAN v_"),
                ),
                query,
            ).toEqual([]);
        }
    });
});

describe("screens", () => {
    const screens: Spec = {
        ...tiered,
        blocks: [
            { id: "block-a1", first: 1, last: 4, codeKind: "codekind-ui", entry: true, container: "FindById" },
            { id: "block-a2", first: 5, last: 8, codeKind: "codekind-ui", entry: true, container: "FindById" },
            { id: "block-b1", first: 9, last: 12, codeKind: "codekind-ui", entry: true, container: "OpenPol" },
            { id: "block-c1", first: 13, last: 16, codeKind: "codekind-ui", entry: true },
            { id: "block-rule", first: 20, last: 29, codeKind: "codekind-logic" },
        ],
        links: [{ id: "link-1", from: "block-a1", to: "block-rule", kind: "call" }],
        definitions: [
            {
                id: "definition-layout",
                writtenAs: "FindById",
                fields: [
                    { writtenAs: "GoButton", declaredAs: "Button; caption Go; tab order 2" },
                    { writtenAs: "IdTextbox", declaredAs: "TextBox; tab order 1" },
                ],
            },
            { id: "definition-other", writtenAs: "Settings", fields: [{ writtenAs: "Value", declaredAs: "String" }] },
        ],
    };

    test("a capability's actions are grouped by the screen that holds them", async () => {
        const rows = rowsOf(await build(screens), "SELECT screen, actions FROM v_capability_screens ORDER BY screen");
        expect(rows).toEqual([
            { screen: null, actions: 1 },
            { screen: "FindById", actions: 2 },
            { screen: "OpenPol", actions: 1 },
        ]);
    });

    test("a screen's controls are the fields of the layout named for it, and no other definition's", async () => {
        const rows = rowsOf(
            await build(screens),
            "SELECT screen, control, declaredAs FROM v_screen_controls ORDER BY control",
        );
        expect(rows).toEqual([
            { screen: "FindById", control: "GoButton", declaredAs: "Button; caption Go; tab order 2" },
            { screen: "FindById", control: "IdTextbox", declaredAs: "TextBox; tab order 1" },
        ]);
    });
});
