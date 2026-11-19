import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { describeEntry, editChange, isLocked, loadEntries, messageOf, moveChange, moveTargets, renameChange, reviseBody, send, splitChange } from "../src/lib/plan-edit";

describe("the change a form describes", () => {
    test("rename trims and refuses an empty title", () => {
        expect(renameChange("k", "  New title ")).toEqual({ _tag: "rename", story: "k", title: "New title" });
        expect(renameChange("k", "   ")).toBeUndefined();
    });
    test("an edit of what or why carries no index; a criterion is picked by its number from 1", () => {
        expect(editChange("k", "what", "x")).toEqual({ _tag: "edit", story: "k", field: "what", text: "x" });
        expect(editChange("k", "criterion", "x", 2, 3)).toEqual({ _tag: "edit", story: "k", field: "criterion", index: 1, text: "x" });
        expect(editChange("k", "criterion", "x", 4, 3)).toBeUndefined();
        expect(editChange("k", "criterion", "x", undefined, 3)).toBeUndefined();
        expect(editChange("k", "why", " ")).toBeUndefined();
    });
    test("a split sends sorted positions from 0, needs a title and must leave one criterion", () => {
        expect(splitChange("k", [3, 1], "New", 4)).toEqual({ _tag: "split", story: "k", criteria: [0, 2], title: "New" });
        expect(splitChange("k", [], "New", 4)).toBeUndefined();
        expect(splitChange("k", [1, 2], "New", 2)).toBeUndefined();
        expect(splitChange("k", [1], "", 2)).toBeUndefined();
    });
    test("a move needs an action and a target; the body carries the note", () => {
        expect(moveChange("a", "")).toBeUndefined();
        const change = moveChange("a", "t");
        expect(JSON.parse(reviseBody(change!, " why "))).toEqual({ revision: { _tag: "moveAction", action: "a", to: "t" }, note: "why" });
    });
    test("an action may move only to another story of the same surface", () => {
        const s = (key: string, capability: string, surface?: string) => ({ key, capability, surface });
        const all = [s("a", "C", "Main"), s("b", "C", "Main"), s("c", "C", "Other"), s("d", "D", "Main"), s("e", "C")];
        expect(moveTargets(all, all[0]!).map((x) => x.key)).toEqual(["b"]);
        expect(moveTargets(all, all[4]!)).toEqual([]);
    });
});

describe("what the server's answer means", () => {
    test("accepted tells the person to rebuild", () => {
        const said = messageOf(200, { ok: true, message: "renamed" });
        expect(said.accepted).toBe(true);
        expect(said.text).toContain("Build the app again");
    });
    test("a refusal names its reason and every gap", () => {
        const said = messageOf(422, { ok: false, message: "the change would break the plan", gaps: ["one", "two"] });
        expect(said).toEqual({ accepted: false, text: "Refused: the change would break the plan.", gaps: ["one", "two"] });
    });
    test("no answer is said in words", () => {
        expect(messageOf(0, undefined).text).toContain("did not answer");
        expect(messageOf(200, { ok: false }).accepted).toBe(false);
    });
});

describe("locked stories", () => {
    const ledger = { items: { a: { status: "planned" }, b: { status: "created" }, c: { status: "merged" } } };
    test("any status but planned locks; a story the ledger lacks is open", () => {
        expect([isLocked(ledger, "a"), isLocked(ledger, "b"), isLocked(ledger, "c"), isLocked(ledger, "z"), isLocked(undefined, "a")]).toEqual([false, true, true, false, false]);
    });
});

describe("the list of changes", () => {
    test("each reads as a sentence with the note", () => {
        const titleOf = (key: string) => (key === "k" ? "Old" : "Other");
        expect(describeEntry({ revision: { _tag: "rename", story: "k", title: "New" }, at: "", note: "clearer" }, titleOf)).toBe('Renamed "Old" to "New" (clearer)');
        expect(describeEntry({ revision: { _tag: "moveAction", action: "a", to: "t" }, at: "", note: "" }, titleOf)).toBe('Moved an action to "Other"');
    });
    test("a server that is not there is no entries, not an error", async () => {
        expect(await loadEntries("http://127.0.0.1:1", fetch)).toBeUndefined();
        expect((await send("http://127.0.0.1:1", "/api/undo")).accepted).toBe(false);
    });
});

// Through the island's own fetch code against the real server, on a COPY of an Output Root (PLAN_EDIT_COPY), never the real one. The copy must hold a complete set of records (`plan.ts standin <copy>` writes one): the server refuses every change to a plan that already fails a gate.
const copy = process.env.PLAN_EDIT_COPY;
describe.skipIf(copy === undefined || !existsSync(`${copy}/.modernization-backlog/payloads/plan.json`))("the real editing server", () => {
    test("a rename is accepted and an invalid change is refused with gaps", async () => {
        const { serveEdits } = await import("../../../skills/plan-modernization-backlog/cli/serve-edits");
        const server = serveEdits(copy ?? "", 0);
        const base = `http://127.0.0.1:${server.port}`;
        try {
            expect(await loadEntries(base)).toEqual([]);
            // The server edits the plan's records, whose keys it derives itself; ask the plan skill for them.
            const { storyKeyOf } = await import("../../../skills/plan-modernization-backlog/shared/derive/plan");
            const records = JSON.parse(readFileSync(`${copy}/.modernization-backlog/work/records/stories.json`, "utf8")) as Parameters<typeof storyKeyOf>[0][];
            const key = storyKeyOf(records[0]!);
            const ok = await send(base, "/api/revise", reviseBody(renameChange(key, "Set up the workspace again")!, "test"));
            expect(ok).toMatchObject({ accepted: true });
            expect(ok.text).toContain("Build the app again");
            expect((await loadEntries(base))?.length).toBe(1);
            // A title over 72 characters breaks a gate of the plan: refused, with the gaps named.
            const bad = await send(base, "/api/revise", reviseBody(renameChange(key, "x".repeat(90))!, ""));
            expect(bad.accepted).toBe(false);
            expect(bad.text).toStartWith("Refused");
            expect(bad.gaps.length).toBeGreaterThan(0);
            // A story the plan does not have is refused too.
            expect((await send(base, "/api/revise", reviseBody(renameChange("story-000000000000", "New")!, ""))).accepted).toBe(false);
            expect((await send(base, "/api/undo")).accepted).toBe(true);
            expect(await loadEntries(base)).toEqual([]);
        } finally {
            server.stop(true);
        }
    });
});
