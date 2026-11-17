import { Database } from "bun:sqlite";
import { expect, test } from "bun:test";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveGraphTables } from "../shared/graph/derive";
import { fillEntryPointReach } from "../shared/graph/graph-walks";
import { analysisSchema } from "../shared/store/analysis-schema";

/**
 * A store about a hundred times the size of the PolicyPlus run: four layers, 40,000 blocks, 10,000 entry points of 20
 * capabilities, three links from each block to the next layer. Every derived table and every view must answer in
 * under a second, and what the walk stores is measured, not assumed.
 */
const blocks = 40_000;
const layers = 4;
const perLayer = blocks / layers;
const capabilities = 20;

const build = () => {
    const root = mkdtempSync(join(tmpdir(), "graph-scale-"));
    const db = new Database(join(root, "analysis.sqlite"));
    for (const statement of analysisSchema.statements) db.run(statement);
    db.run(`PRAGMA user_version = ${analysisSchema.identity}`);
    db.run("INSERT INTO stageWrite (stage, rank, digest) VALUES ('map', 1, 'x')");
    db.run("INSERT INTO file (fileNumber, path, lines) VALUES (1, 'a.vb', 100000000)");
    const insert = db.prepare(
        "INSERT INTO record (recordNumber, id, type, stage, fileNumber, firstLine, lastLine, body) VALUES (?, ?, ?, 'map', 1, ?, ?, ?)",
    );
    const ref = db.prepare("INSERT OR IGNORE INTO ref (fromRecord, role, toRecord) VALUES (?, ?, ?)");
    const link = db.prepare("INSERT INTO linkEnd (linkRecord, kind, fromBlock, toBlock) VALUES (?, 'call', ?, ?)");
    const entry = db.prepare("INSERT INTO entryPoint (recordNumber) VALUES (?)");
    db.transaction(() => {
        let number = 1;
        const layerNo: number[] = [];
        const kindNo: number[] = [];
        for (let l = 0; l < layers; l++) {
            layerNo.push(number);
            insert.run(number, `layer-${l}`, "Layer", null, null, JSON.stringify({ name: `Layer ${l}` }));
            number++;
        }
        for (let l = 0; l < layers; l++) {
            kindNo.push(number);
            insert.run(
                number,
                `codekind-${l}`,
                "CodeKind",
                null,
                null,
                JSON.stringify({ name: `Kind ${l}`, kind: "runs", layer: `layer-${l}` }),
            );
            ref.run(number, "layer", layerNo[l] ?? 0);
            number++;
        }
        const capNo: number[] = [];
        for (let c = 0; c < capabilities; c++) {
            capNo.push(number);
            insert.run(number, `capability-${c}`, "Capability", null, null, JSON.stringify({ name: `Cap ${c}` }));
            number++;
        }
        const first = number;
        const blockNo = (layer: number, i: number) => first + layer * perLayer + (i % perLayer);
        for (let b = 0; b < blocks; b++) {
            const layer = Math.floor(b / perLayer);
            const own = first + b;
            insert.run(
                own,
                `block-${b}`,
                "Block",
                b * 10 + 1,
                b * 10 + 9,
                JSON.stringify({
                    codeKind: `codekind-${layer}`,
                    ...(layer === 0 ? { entryPoint: { startedBy: "person" } } : {}),
                }),
            );
            ref.run(own, "codeKind", kindNo[layer] ?? 0);
        }
        number = first + blocks;
        for (let b = 0; b < perLayer; b++) entry.run(first + b);
        for (let b = 0; b < perLayer; b++) {
            insert.run(
                number,
                `assign-${b}`,
                "EntryPointAssignment",
                null,
                null,
                JSON.stringify({ entryPoint: `block-${b}`, capability: `capability-${b % capabilities}` }),
            );
            ref.run(number, "entryPoint", first + b);
            ref.run(number, "capability", capNo[b % capabilities] ?? 0);
            number++;
        }
        for (let b = 0; b < blocks - perLayer; b++) {
            const layer = Math.floor(b / perLayer);
            const i = b % perLayer;
            for (let j = 0; j < 3; j++) {
                insert.run(number, `link-${number}`, "Link", 1, 1, "{}");
                link.run(number, first + b, blockNo(layer + 1, i * 3 + j * 7));
                number++;
            }
        }
    })();
    db.close();
    return root;
};

const timed = async <T>(work: () => Promise<T> | T): Promise<[T, number]> => {
    const start = performance.now();
    const result = await work();
    return [result, performance.now() - start];
};

test("a store a hundred times the size answers every view in under a second", async () => {
    const root = build();
    const run = <A>(use: (client: SqliteClient.SqliteClient) => Effect.Effect<A, unknown>) =>
        Effect.runPromise(
            Effect.scoped(
                Effect.gen(function* () {
                    const client = yield* SqliteClient.make({ filename: join(root, "analysis.sqlite") });
                    yield* client.unsafe("PRAGMA foreign_keys = ON");
                    return yield* use(client);
                }),
            ).pipe(Effect.provide(Reactivity.layer)),
        );
    const [, reachMs] = await timed(() => run((client) => fillEntryPointReach(client)));
    const [, deriveMs] = await timed(() => run((client) => deriveGraphTables(client)));
    const db = new Database(join(root, "analysis.sqlite"), { readonly: true });
    const rows = (table: string) => (db.query(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
    const sizes = {
        entryPointReach: rows("entryPointReach"),
        blockCapability: rows("blockCapability"),
        entryPointLayer: rows("entryPointLayer"),
        layerEdge: rows("layerEdge"),
    };
    const slow: string[] = [];
    for (const view of [
        "v_block",
        "v_layer_edges",
        "v_layer_role",
        "v_capability_layers",
        "v_file_layers",
        "v_entry_point_path",
        "v_capability_blocks",
        "v_block_part",
    ]) {
        const [, ms] = await timed(() => db.query(`SELECT count(*) FROM ${view}`).get());
        if (ms > 1000) slow.push(`${view} ${Math.round(ms)} ms`);
    }
    db.close();
    console.log(`reach ${Math.round(reachMs)} ms, derive ${Math.round(deriveMs)} ms, rows ${JSON.stringify(sizes)}`);
    expect(slow).toEqual([]);
    expect(sizes.entryPointLayer).toBeGreaterThan(0);
}, 300_000);
