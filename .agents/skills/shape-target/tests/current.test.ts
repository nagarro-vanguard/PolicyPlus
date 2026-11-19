import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { chooseAsIs } from "../shared/choose";
import { deriveCurrent, journeyGaps } from "../shared/derive/current";
import { gateState } from "../shared/gates";
import { layoutOf } from "../shared/model/layout";
import { build, legacy, stack } from "./fixture";

const write = (path: string, value: unknown) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const fresh = () => {
    const layout = layoutOf(mkdtempSync(join(tmpdir(), "shape-current-")));
    write(layout.requestJson, { stack, notes: [] });
    write(layout.legacy, legacy);
    return layout;
};
const f = build("browsing.");
const journeysOf = (layout: ReturnType<typeof fresh>) => join(layout.payloads, "journeys.json");
const run = (script: string, ...args: string[]) => {
    const child = Bun.spawnSync(["bun", join(import.meta.dir, "..", "cli", script), ...args], {
        stdout: "pipe",
        stderr: "pipe",
    });
    return { out: `${child.stdout}${child.stderr}`, code: child.exitCode };
};

describe("today's tasks are the analysis's journeys", () => {
    test("target/current.json, the tasks record and the essence are made from payloads/journeys.json", () => {
        const layout = fresh();
        write(journeysOf(layout), { journeys: f.tasks });
        const result = deriveCurrent(layout);
        expect(result).toMatchObject({ ok: true });
        const current = JSON.parse(readFileSync(layout.current, "utf8")) as { tasks: { id: string }[] };
        expect(current.tasks.map((task) => task.id)).toEqual(["browsing.t1", "browsing.t2"]);
        const essence = JSON.parse(readFileSync(layout.essence, "utf8")) as { tasks: { id: string }[] };
        expect(essence.tasks.map((task) => task.id)).toEqual(["browsing.t1", "browsing.t2"]);
    });

    test("deriving again changes nothing, so a confirmed decision stays confirmed", () => {
        const layout = fresh();
        write(journeysOf(layout), { journeys: f.tasks });
        deriveCurrent(layout);
        expect(chooseAsIs(layout, [], "reads right").ok).toBe(true);
        const past = new Date(Date.now() - 60_000);
        utimesSync(layout.current, past, past);
        const before = statSync(layout.current).mtimeMs;
        const again = deriveCurrent(layout);
        expect(again.text).toContain("already holds them");
        expect(statSync(layout.current).mtimeMs).toBe(before);
        expect(gateState(layout, "as-is")).toBe("confirmed");
        write(journeysOf(layout), { journeys: [f.tasks[0]] });
        expect(deriveCurrent(layout).ok).toBe(false);
        expect(statSync(layout.current).mtimeMs).toBe(before);
    });

    test("journeys that leave out an entry point or rule, or name one the analysis lacks, are refused and write nothing", () => {
        const layout = fresh();
        write(journeysOf(layout), { journeys: [f.tasks[0]] });
        const result = deriveCurrent(layout);
        expect(result.ok).toBe(false);
        expect(result.text).toContain("belong to no task");
        expect(() => readFileSync(layout.current)).toThrow();
        const [t1] = f.tasks;
        const stray = { ...t1, id: "x.y", actions: [...(t1?.actions ?? []), "block-999"] };
        expect(journeyGaps([...f.tasks, stray as never], legacy).join("\n")).toContain(
            "block-999 is in a task but is not in the analysis",
        );
    });

    test("a run made before the analysis wrote journeys keeps its target/current.json as it is", () => {
        const layout = fresh();
        write(layout.current, { tasks: f.tasks });
        const past = new Date(Date.now() - 60_000);
        utimesSync(layout.current, past, past);
        const before = statSync(layout.current).mtimeMs;
        const result = deriveCurrent(layout);
        expect(result.ok).toBe(true);
        expect(result.text).toContain("kept");
        expect(statSync(layout.current).mtimeMs).toBe(before);
    });

    test("with neither the analysis's journeys nor a current.json, there is nothing to read", () => {
        const result = deriveCurrent(fresh());
        expect(result.ok).toBe(false);
        expect(result.text).toContain("journeys.json does not exist");
    });

    test("`derive.ts current` and `stage.ts finish as-is` do it, `stage.ts prepare as-is` says there is nothing to prepare", () => {
        const layout = fresh();
        write(journeysOf(layout), { journeys: f.tasks });
        const derived = run("derive.ts", "current", layout.outputRoot);
        expect(derived.code).toBe(0);
        expect(derived.out).toContain("2 tasks");
        const finished = run("stage.ts", "finish", "as-is", "--root", layout.outputRoot);
        expect(finished.code).toBe(0);
        const prepared = run("stage.ts", "prepare", "as-is", "--root", layout.outputRoot);
        expect(prepared.code).toBe(1);
        expect(prepared.out).toContain("has no jobs");
    });
});
