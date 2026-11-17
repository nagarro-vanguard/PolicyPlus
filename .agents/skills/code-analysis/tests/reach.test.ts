import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Effect } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { join } from "node:path";
import { fillEntryPointReach, requestsBetweenEntryPoints } from "../shared/graph/graph-walks";
import { makeRoot, runCheck, sound, walked, type Spec } from "./fixture";

/**
 * The skill's own reach walk against the plain walk written in the fixture, on graphs with and without dispatch.
 */
const storedReach = (root: string) => {
    const db = new Database(join(root, "analysis.sqlite"), { readonly: true });
    const rows = db
        .query(
            "SELECT e.id AS entry, b.id AS block FROM entryPointReach w JOIN record e ON e.recordNumber = w.entryPoint JOIN record b ON b.recordNumber = w.block",
        )
        .all() as Array<{ entry: string; block: string }>;
    db.close();
    return rows.map((row) => `${row.entry}>${row.block}`).toSorted();
};

const fill = (root: string) =>
    Effect.runPromise(
        Effect.scoped(
            Effect.gen(function* () {
                const client = yield* SqliteClient.make({ filename: join(root, "analysis.sqlite") });
                yield* client.unsafe("DELETE FROM entryPointReach");
                yield* fillEntryPointReach(client);
            }),
        ).pipe(Effect.provide(Reactivity.layer)),
    );

/** An interface member `iface`, two implementers that can run in its place, and a handler that calls the member. */
const dispatching: Spec = {
    layers: [
        { id: "layer-1", name: "Screens" },
        { id: "layer-2", name: "Logic" },
    ],
    codeKinds: [
        { id: "codekind-1", name: "Handler", layer: "layer-1" },
        { id: "codekind-2", name: "Member", layer: "layer-2" },
    ],
    blocks: [
        { id: "block-handler", first: 1, last: 9, codeKind: "codekind-1", entry: true },
        { id: "block-iface", first: 10, last: 12, codeKind: "codekind-2" },
        { id: "block-impl-a", first: 13, last: 20, codeKind: "codekind-2" },
        { id: "block-impl-b", first: 21, last: 30, codeKind: "codekind-2" },
        { id: "block-other", first: 31, last: 40, codeKind: "codekind-2" },
    ],
    links: [
        { id: "link-call", from: "block-handler", to: "block-iface", kind: "call" },
        { id: "link-a", from: "block-impl-a", to: "block-iface", kind: "dispatches" },
        { id: "link-b", from: "block-impl-b", to: "block-iface", kind: "dispatches" },
    ],
};

describe("reach", () => {
    test("without dispatch the skill's walk equals the plain walk", async () => {
        const root = makeRoot({ ...sound, reach: [] });
        await fill(root);
        expect(storedReach(root)).toEqual(
            walked(sound)
                .map(([e, b]) => `${e}>${b}`)
                .toSorted(),
        );
    });

    test("a flow reaching an interface member goes on into each implementer, and only those", async () => {
        const root = makeRoot({ ...dispatching, reach: [] });
        await fill(root);
        const reached = storedReach(root);
        expect(reached).toEqual(
            walked(dispatching)
                .map(([e, b]) => `${e}>${b}`)
                .toSorted(),
        );
        expect(reached).toContain("block-handler>block-impl-a");
        expect(reached).toContain("block-handler>block-impl-b");
        expect(reached).not.toContain("block-handler>block-other");
    });

    test("the graph check accepts the stored reach of a dispatching graph and refuses one that leaves implementers out", async () => {
        const good = (await runCheck(makeRoot(dispatching))).out;
        expect(good).not.toContain("FAIL");
        const missing = (
            await runCheck(
                makeRoot({
                    ...dispatching,
                    reach: [
                        ["block-handler", "block-handler"],
                        ["block-handler", "block-iface"],
                    ],
                }),
            )
        ).out;
        expect(missing).toContain("FAIL  8 stored reach equals recomputed reach");
    });

    test("a request from an implementer's chain finds the entry points above it through the interface member", async () => {
        const spec: Spec = {
            ...dispatching,
            blocks: [
                ...dispatching.blocks,
                { id: "block-entry2", first: 41, last: 50, codeKind: "codekind-1", entry: true },
            ],
            links: [
                ...(dispatching.links ?? []),
                { id: "link-req", from: "block-impl-a", to: "block-entry2", kind: "request" },
            ],
        };
        const root = makeRoot({ ...spec, reach: [] });
        const pairs = await Effect.runPromise(
            Effect.scoped(
                Effect.gen(function* () {
                    const client = yield* SqliteClient.make({ filename: join(root, "analysis.sqlite") });
                    return yield* requestsBetweenEntryPoints(client);
                }),
            ).pipe(Effect.provide(Reactivity.layer)),
        );
        expect(pairs).toEqual([{ one: "block-handler", other: "block-entry2" }]);
    });
});
