import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveFacts } from "../shared/derive/facts";
import { storyKeyOf } from "../shared/derive/plan";
import { revert, revise, undo } from "../shared/derive/revise";
import { loadRecords, loadRevisions, recordFiles, runBuild, writeJson } from "../shared/derive/run";
import { standin } from "../shared/derive/standin";
import { layoutOf } from "../shared/model/layout";
import { parseRequest } from "../shared/model/request";
import { readAnalysis } from "../shared/read/analysis";

const seed = join(import.meta.dir, "../../../../.modernization/.code-analysis");
const have = existsSync(join(seed, "payloads/system.json"));

const setup = () => {
    const root = mkdtempSync(`${tmpdir()}/revise-`);
    cpSync(join(seed, "payloads"), join(root, ".code-analysis/payloads"), { recursive: true });
    const request = parseRequest(
        `## Output Root\n${root}\n## Source Roots\n- ${root}\n## Leave Out\nNone\n## Target Codebase\n- ${root}/Web\n## Target Stack\n- TypeScript\n## Documents\nNone\n## Additional Notes\nNone\n`,
        root,
    );
    const layout = layoutOf(root);
    writeJson(layout.requestJson, request);
    const analysis = readAnalysis(layout.analysis);
    const records = standin(analysis, deriveFacts(analysis), request);
    writeJson(recordFiles(layout).layers, records.layers);
    writeJson(recordFiles(layout).decisions, records.decisions);
    writeJson(recordFiles(layout).stories, records.stories);
    expect(runBuild(layout).written).toBe(true);
    return { layout, stories: loadRecords(layout).stories };
};
const planOf = (layout: ReturnType<typeof layoutOf>) =>
    JSON.parse(readFileSync(layout.plan, "utf8")) as {
        stories: { key: string; title: string; actions: string[]; criteria: unknown[] }[];
    };

describe.skipIf(!have)("editing the plan", () => {
    test("a rename is accepted, shows in the plan and the work item, and can be undone", () => {
        const { layout, stories } = setup();
        const target = stories.find((s) => s.actions.length > 0)!;
        const key = storyKeyOf(target);
        const outcome = revise(layout, { _tag: "rename", story: key, title: "Open the policy list" }, "clearer");
        expect(outcome.ok).toBe(true);
        expect(planOf(layout).stories.find((s) => s.key === key)?.title).toBe("Open the policy list");
        expect(readFileSync(join(layout.bodies, `${key}.md`), "utf8")).toContain("# Open the policy list");
        expect(loadRevisions(layout)).toHaveLength(1);
        expect(undo(layout).ok).toBe(true);
        expect(planOf(layout).stories.find((s) => s.key === key)?.title).not.toBe("Open the policy list");
    });
    test("a change that would break a gate is refused with the gaps and nothing is saved", () => {
        const { layout, stories } = setup();
        const key = storyKeyOf(stories.find((s) => s.actions.length > 0)!);
        const outcome = revise(layout, { _tag: "rename", story: key, title: "Carry over FindByText" });
        expect(outcome.ok).toBe(false);
        expect(outcome.gaps?.join(" ")).toMatch(/shows the code/);
        expect(loadRevisions(layout)).toHaveLength(0);
    });
    test("an action cannot be moved to a story of another surface", () => {
        const { layout, stories } = setup();
        const functional = stories.filter((s) => s.actions.length > 0);
        const a = functional[0]!;
        const b = functional.find(
            (s) => s.title !== a.title && s.actions.length > 0 && !s.actions.some((id) => a.actions.includes(id)),
        )!;
        const outcome = revise(layout, { _tag: "moveAction", action: a.actions[0], to: storyKeyOf(b) });
        expect(outcome.ok).toBe(false);
    });
    test("a story whose work item is already created is locked", () => {
        const { layout, stories } = setup();
        const key = storyKeyOf(stories.find((s) => s.actions.length > 0)!);
        const ledger = JSON.parse(readFileSync(layout.ledger, "utf8"));
        ledger.items[key] = { status: "created", item: "#7" };
        writeJson(layout.ledger, ledger);
        const outcome = revise(layout, { _tag: "rename", story: key, title: "Open it" });
        expect(outcome.ok).toBe(false);
        expect(outcome.message).toMatch(/already created/);
    });
    test("an unknown story and a malformed change are refused plainly", () => {
        const { layout } = setup();
        expect(revise(layout, { _tag: "rename", story: "story-nope", title: "x" }).ok).toBe(false);
        expect(revise(layout, { _tag: "explode" }).ok).toBe(false);
    });
    test("a criterion can be reworded, and revert puts everything back", () => {
        const { layout, stories } = setup();
        const target = stories.find((s) => s.actions.length > 0)!;
        const key = storyKeyOf(target);
        expect(
            revise(layout, {
                _tag: "edit",
                story: key,
                field: "criterion",
                index: 0,
                text: "Given a list, when someone filters it, then it narrows.",
            }).ok,
        ).toBe(true);
        expect(revert(layout).ok).toBe(true);
        expect(loadRevisions(layout)).toHaveLength(0);
    });
});
