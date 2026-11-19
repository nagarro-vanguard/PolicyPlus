import { Database } from "bun:sqlite";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { deriveGraphTables } from "../shared/graph/derive";
import { recordShapes } from "../shared/model/record-shapes";
import { analysisSchema } from "../shared/store/analysis-schema";

/**
 * A small analysis store built for a test: real table definitions, a few records, and a stored reach computed by a
 * plain walk written here (never the skill's own), so a test can break one fact and see which invariant notices.
 */
export type Spec = {
    readonly layers: ReadonlyArray<{ readonly id: string; readonly name: string }>;
    readonly codeKinds: ReadonlyArray<{ readonly id: string; readonly name: string; readonly layer: string }>;
    readonly blocks: ReadonlyArray<{
        readonly id: string;
        readonly first: number;
        readonly last: number;
        readonly codeKind: string;
        readonly entry?: boolean;
        readonly unassigned?: boolean;
        readonly startedBy?: string;
        readonly container?: string;
        readonly capability?: string;
        readonly name?: string;
    }>;
    readonly links?: ReadonlyArray<{
        readonly id: string;
        readonly from: string;
        readonly to?: string;
        readonly kind: string;
        readonly unresolved?: string;
        readonly toExternal?: string;
    }>;
    readonly externalSystems?: ReadonlyArray<{ readonly id: string; readonly kind: string }>;
    readonly definitions?: ReadonlyArray<{
        readonly id: string;
        readonly writtenAs: string;
        readonly fields: ReadonlyArray<{ readonly writtenAs: string; readonly declaredAs: string }>;
    }>;
    readonly rules?: ReadonlyArray<{ readonly id: string; readonly block: string; readonly says: string }>;
    readonly lines?: number;
    readonly capabilityNames?: Readonly<Record<string, string>>;
    readonly reach?: ReadonlyArray<readonly [string, string]>;
};

const followed = new Set(["call", "renders", "reads", "saves"]);

/**
 * The reach by a plain walk: from each entry point, each block once, over the followed kinds forward and `dispatches`
 * backward, stopping before another entry point.
 * @param spec the fixture
 * @returns each entry point with each block it reaches
 */
export const walked = (spec: Spec): Array<readonly [string, string]> => {
    const entries = new Set(spec.blocks.filter((block) => block.entry === true).map((block) => block.id));
    const out: Array<readonly [string, string]> = [];
    for (const entry of entries) {
        const seen = new Set([entry]);
        const queue = [entry];
        while (queue.length > 0) {
            const here = queue.shift() ?? "";
            for (const link of spec.links ?? []) {
                const forward = followed.has(link.kind) && link.from === here ? link.to : undefined;
                const backward = link.kind === "dispatches" && link.to === here ? link.from : undefined;
                const next = forward ?? backward;
                if (next !== undefined && !seen.has(next) && !entries.has(next)) {
                    seen.add(next);
                    queue.push(next);
                }
            }
        }
        for (const block of seen) {
            out.push([entry, block]);
        }
    }
    return out;
};

/**
 * Write the fixture store into a new folder.
 * @param spec the fixture
 * @returns the analysis root holding `analysis.sqlite`
 */
export const makeRoot = (spec: Spec): string => {
    const root = mkdtempSync(join(tmpdir(), "graph-fixture-"));
    const db = new Database(join(root, "analysis.sqlite"));
    for (const statement of analysisSchema.statements) {
        db.run(statement);
    }
    db.run(`PRAGMA user_version = ${analysisSchema.identity}`);
    db.run("INSERT INTO stageWrite (stage, rank, digest) VALUES ('map', 1, 'x')");
    db.run("INSERT INTO file (fileNumber, path, lines) VALUES (1, 'a.vb', ?)", [spec.lines ?? 100]);
    const numbers = new Map<string, number>();
    let next = 1;
    const record = (id: string, type: string, body: object, position?: readonly [number, number]) => {
        numbers.set(id, next);
        db.run(
            "INSERT INTO record (recordNumber, id, type, stage, fileNumber, firstLine, lastLine, body) VALUES (?, ?, ?, 'map', ?, ?, ?, ?)",
            [
                next++,
                id,
                type,
                position === undefined ? null : 1,
                position?.[0] ?? null,
                position?.[1] ?? null,
                JSON.stringify(body),
            ],
        );
    };
    for (const layer of spec.layers)
        record(layer.id, "Layer", {
            name: layer.name,
            purpose: `What the ${layer.name} layer does.`,
            evidence: [{ file: "src/a.ts", firstLine: 1, lastLine: 2 }],
        });
    for (const kind of spec.codeKinds)
        record(kind.id, "CodeKind", { name: kind.name, kind: "runs", layer: kind.layer });
    const capabilityIds = new Set([
        "capability-1",
        ...spec.blocks.flatMap((block) => (block.capability === undefined ? [] : [block.capability])),
    ]);
    for (const id of capabilityIds) {
        const names = spec.capabilityNames ?? {};
        record(id, "Capability", { name: names[id] ?? id, purpose: "A capability." });
    }
    for (const definition of spec.definitions ?? []) {
        record(
            definition.id,
            "DataDefinition",
            { writtenAs: definition.writtenAs, fields: definition.fields },
            [90, 99],
        );
    }
    for (const system of spec.externalSystems ?? []) {
        record(system.id, "ExternalSystem", { name: system.id, kind: system.kind });
    }
    for (const block of spec.blocks) {
        record(
            block.id,
            "Block",
            {
                codeKind: block.codeKind,
                ...(block.name === undefined ? {} : { writtenAs: block.name }),
                ...(block.container === undefined ? {} : { container: block.container }),
                ...(block.entry === true
                    ? { entryPoint: { startedBy: block.startedBy ?? "person", purpose: `Handles ${block.id}.` } }
                    : {}),
            },
            [block.first, block.last],
        );
        if (block.entry === true) {
            db.run("INSERT INTO entryPoint (recordNumber) VALUES (?)", [numbers.get(block.id) ?? 0]);
            if (block.unassigned !== true) {
                record(`assign-${block.id}`, "EntryPointAssignment", {
                    entryPoint: block.id,
                    capability: block.capability === undefined ? "capability-1" : block.capability,
                });
            }
        }
    }
    for (const link of spec.links ?? []) {
        record(link.id, "Link", link.unresolved === undefined ? {} : { unresolvedTarget: link.unresolved }, [1, 1]);
        db.run(
            "INSERT INTO linkEnd (linkRecord, kind, fromBlock, toBlock, toExternalSystem, resource) VALUES (?, ?, ?, ?, ?, ?)",
            [
                numbers.get(link.id) ?? 0,
                link.kind,
                numbers.get(link.from) ?? 0,
                link.to === undefined ? null : (numbers.get(link.to) ?? null),
                link.toExternal === undefined ? null : (numbers.get(link.toExternal) ?? null),
                link.toExternal === undefined ? null : "table",
            ],
        );
    }
    for (const rule of spec.rules ?? []) {
        const holder = spec.blocks.find((block) => block.id === rule.block);
        record(rule.id, "BusinessRule", { says: rule.says }, [
            holder === undefined ? 1 : holder.first,
            holder === undefined ? 1 : holder.first + 1,
        ]);
        db.run("INSERT INTO ruleBlock (rule, block) VALUES (?, ?)", [
            numbers.get(rule.id) ?? 0,
            numbers.get(rule.block) ?? 0,
        ]);
    }
    const ref = (from: string, role: string, to: string) =>
        db.run("INSERT OR IGNORE INTO ref (fromRecord, role, toRecord) VALUES (?, ?, ?)", [
            numbers.get(from) ?? 0,
            role,
            numbers.get(to) ?? 0,
        ]);
    for (const kind of spec.codeKinds) ref(kind.id, "layer", kind.layer);
    for (const block of spec.blocks) {
        ref(block.id, "codeKind", block.codeKind);
        if (block.entry === true && block.unassigned !== true) {
            ref(`assign-${block.id}`, "entryPoint", block.id);
            ref(`assign-${block.id}`, "capability", block.capability === undefined ? "capability-1" : block.capability);
        }
    }
    for (const [entry, block] of spec.reach ?? walked(spec)) {
        db.run("INSERT INTO entryPointReach (entryPoint, block) VALUES (?, ?)", [
            numbers.get(entry) ?? 0,
            numbers.get(block) ?? 0,
        ]);
    }
    // the fixture's records are written by hand, not by the stages, so the store is stamped as checked: a test of the
    // record-shape check clears the stamp itself
    db.run("UPDATE analysis SET modelVersion = ?, recordShapes = ?", [
        analysisSchema.modelIdentity ?? 0,
        recordShapes().digest,
    ]);
    db.close();
    return root;
};

/**
 * Run the graph check on a root and return its outcome lines and exit code.
 * @param root the analysis root
 * @returns the printed lines and the exit code
 */
export const runCheck = async (root: string, options: { readonly derived?: boolean } = {}) => {
    if (options.derived !== false) {
        await derive(root);
    }
    const child = Bun.spawn(["bun", join(import.meta.dir, "..", "cli", "check-graph.ts")], {
        env: { ...process.env, CODE_ANALYSIS_ROOT: root },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return { out: out + err, code: await child.exited };
};

/** The smallest sound graph: one layer, one code kind, an entry point calling a helper. */
export const sound: Spec = {
    layers: [{ id: "layer-1", name: "Screens" }],
    codeKinds: [{ id: "codekind-1", name: "Handler", layer: "layer-1" }],
    blocks: [
        { id: "block-1", first: 1, last: 10, codeKind: "codekind-1", entry: true },
        { id: "block-2", first: 11, last: 20, codeKind: "codekind-1" },
    ],
    links: [{ id: "link-1", from: "block-1", to: "block-2", kind: "call" }],
};

/**
 * Fill the derived graph tables of a fixture the way a stage's write does.
 * @param root the analysis root
 * @returns nothing once filled
 */
export const derive = (root: string) =>
    Effect.runPromise(
        Effect.scoped(
            Effect.gen(function* () {
                const client = yield* SqliteClient.make({ filename: join(root, "analysis.sqlite") });
                yield* client.unsafe("PRAGMA foreign_keys = ON");
                yield* deriveGraphTables(client);
            }),
        ).pipe(Effect.provide(Reactivity.layer)),
    );

/**
 * Run a query on a fixture and return its rows.
 * @param root the analysis root
 * @param sql the statement
 * @returns the rows
 */
export const rowsOf = (root: string, sql: string): Array<Record<string, unknown>> => {
    const db = new Database(join(root, "analysis.sqlite"), { readonly: true });
    const rows = db.query(sql).all() as Array<Record<string, unknown>>;
    db.close();
    return rows;
};
