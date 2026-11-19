import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { applyChanges, changeHistory, requestChanges } from "../shared/changes";
import { chooseArchitecture, chooseAsIs, chooseJourneys } from "../shared/choose";
import { gateState } from "../shared/gates";
import { done, next } from "../shared/jobs/driver";
import { finish } from "../shared/jobs/finish";
import { deriveCurrent } from "../shared/derive/current";
import { prepare } from "../shared/jobs/stages";
import { jobPaths, loadJobs } from "../shared/jobs/state";
import { layoutOf } from "../shared/model/layout";
import { build, legacy, stack } from "./fixture";

const write = (path: string, value: unknown) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const layout = layoutOf(mkdtempSync(join(tmpdir(), "shape-changes-")));
const f = build("browsing.");
type Dispatch = { action: string; agents: { job: string; role: string }[] };
const play = (outputs: Record<string, unknown>) => {
    for (let round = 0; round < 12; round++) {
        const action = next(layout, "/skill", "run", 4) as unknown as Dispatch;
        if (action.action !== "dispatch") return;
        for (const agent of action.agents) {
            const p = jobPaths(layout, agent.job);
            if (agent.role === "writer") write(p.output, outputs[agent.job]);
            else {
                const out = JSON.parse(readFileSync(p.output, "utf8")) as Record<string, unknown[]>;
                write(p.review, {
                    read: Object.values(out).reduce((sum, list) => sum + list.length, 0),
                    challenges: [],
                });
            }
            done(layout, agent.job);
        }
    }
};
const states = () => Object.fromEntries(loadJobs(layout).jobs.map((job) => [job.id, job.state]));

describe("a request for changes", () => {
    test("withdraws the confirmation and blocks what follows", () => {
        write(layout.requestJson, { stack, notes: [] });
        write(layout.legacy, legacy);
        write(join(layout.payloads, "journeys.json"), { journeys: f.tasks });
        deriveCurrent(layout);
        chooseAsIs(layout, [], "ok");
        prepare(layout, "journeys");
        play({ "variants-1": { journeys: f.variants } });
        finish(layout, "journeys");
        const chosen = chooseJourneys(layout, {}, true, "ok");
        expect(chosen.text).toContain("confirmed");
        expect(chosen.ok).toBe(true);
        expect(existsSync(layout.journeys)).toBe(true);
        expect(requestChanges(layout, "journeys", " ", {}).ok).toBe(false);
        const asked = requestChanges(layout, "journeys", "make the second step optional", {
            task: "browsing.t1",
        });
        expect(asked.ok).toBe(true);
        expect(asked.text).toContain("apply-changes journeys");
        expect(existsSync(layout.choiceJourneys)).toBe(false);
        expect(existsSync(layout.journeys)).toBe(false);
        expect(gateState(layout, "journeys")).toBe("waiting");
        expect(gateState(layout, "architecture")).toBe("not made");
        const [entry] = changeHistory(layout, "journeys");
        expect(entry).toMatchObject({ gate: "journeys", applied: false, scope: { task: "browsing.t1" } });
        expect(entry?.subject).toMatch(/^[0-9a-f]{64}$/);
        expect(chooseArchitecture(layout, "modular", "x").ok).toBe(false);
    });
    test("apply-changes hands back only the jobs of the scope, once, with the text", () => {
        const refused = applyChanges(layout, "journeys");
        expect(refused.ok).toBe(true);
        expect(states()["variants-1"]).toBe("toFix");
        const again = next(layout, "/skill", "run", 4) as unknown as { agents: { prompt: string }[] };
        expect(again.agents[0]?.prompt).toContain("customInstructions: make the second step optional");
        expect(changeHistory(layout, "journeys")[0]?.applied).toBe(true);
        expect(applyChanges(layout, "journeys").ok).toBe(false);
        write(jobPaths(layout, "variants-1").output, { journeys: f.variants });
        done(layout, "variants-1");
        play({ "variants-1": { journeys: f.variants } });
        expect(finish(layout, "journeys").ok).toBe(true);
    });
    test("as-is: today's tasks are the analysis's, so the request is answered there and marked applied", () => {
        expect(requestChanges(layout, "as-is", "split the first task", { task: "browsing.t1" }).ok).toBe(true);
        expect(readFileSync(join(layout.records, "changes-as-is.json"), "utf8")).toContain("split the first task");
        const applied = applyChanges(layout, "as-is");
        expect(applied.ok).toBe(true);
        expect(applied.text).toContain("journeys-of-browsing");
        expect(applied.text).toContain("journeys-merge");
        expect(applied.text).toContain("derive.ts current");
        expect(changeHistory(layout, "as-is").filter((each) => !each.applied)).toEqual([]);
        expect(applyChanges(layout, "as-is").ok).toBe(false);
        expect(states()["variants-1"]).toBe("decided");
    });
});
