import { Database } from "bun:sqlite";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { copyFileSync } from "node:fs";
import { deriveGraphTables } from "../shared/graph/derive";
import { modelStatements } from "../shared/store/model-schema";
import { relationStatements } from "../shared/read/relations";

/**
 * Not a test: compares what the relation views return on a stored run before and after the derived tables replace their
 * joins. Usage: bun tests/compare-b0.ts <analysis.sqlite of an older run>. Works on a copy.
 */
const [, , source] = process.argv;
if (source === undefined) throw new Error("usage: compare-b0.ts <analysis.sqlite>");
const copy = `${source}.compare`;
copyFileSync(source, copy);
const db = new Database(copy);
const views = [
    "v_block",
    "v_block_capabilities",
    "v_capability_blocks",
    "v_entry_point_capability",
    "v_block_part",
    "v_rule",
    "v_unknown",
    "v_capability_coupling",
    "v_entry_point",
    "v_part_blocks",
    "v_capability_entities",
];
const snapshot = () =>
    Object.fromEntries(
        views.map((view) => [
            view,
            (db.query(`SELECT * FROM ${view}`).all() as object[]).map((row) => JSON.stringify(row)).toSorted(),
        ]),
    );
const before = snapshot();
const names = (db.query("SELECT name FROM sqlite_master WHERE type = 'view'").all() as Array<{ name: string }>).map(
    (row) => row.name,
);
for (const name of names) db.run(`DROP VIEW ${name}`);
for (const statement of modelStatements.filter((text) =>
    /^CREATE (TABLE|INDEX) (filePart|blockCapability|layerEdge|entryPointLayer|blockFanIn)/.test(text.trim()),
))
    db.run(statement);
db.close();
await Effect.runPromise(
    Effect.scoped(
        Effect.gen(function* () {
            const client = yield* SqliteClient.make({ filename: copy });
            yield* client.unsafe("PRAGMA foreign_keys = ON");
            yield* deriveGraphTables(client);
        }),
    ).pipe(Effect.provide(Reactivity.layer)),
);
const after = new Database(copy);
for (const statement of relationStatements()) after.run(statement);
let differ = 0;
for (const view of views) {
    const now = (after.query(`SELECT * FROM ${view}`).all() as object[]).map((row) => JSON.stringify(row)).toSorted();
    const old = before[view] ?? [];
    const same = now.length === old.length && now.every((row, i) => row === old[i]);
    if (!same) differ++;
    console.log(`${same ? "same " : "DIFF "} ${view} ${old.length} -> ${now.length}`);
}
for (const view of [
    "v_layer",
    "v_layer_edges",
    "v_layer_role",
    "v_capability_layers",
    "v_file_layers",
    "v_entry_point_path",
    "v_unresolved_link",
]) {
    console.log(view, (after.query(`SELECT count(*) AS n FROM ${view}`).get() as { n: number }).n);
}
console.log(differ === 0 ? "views unchanged" : `${differ} views differ`);
