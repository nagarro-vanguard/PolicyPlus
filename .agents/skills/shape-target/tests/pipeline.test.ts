import { describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { chooseArchitecture, chooseAsIs, chooseComponents, chooseJourneys } from "../shared/choose";
import { deriveCurrent } from "../shared/derive/current";
import { gateState } from "../shared/gates";
import { finalGaps } from "../shared/derive/checks";
import { abandon, accept, done, next, redo } from "../shared/jobs/driver";
import { finish } from "../shared/jobs/finish";
import { designContext, prepare } from "../shared/jobs/stages";
import { jobPaths, loadJobs } from "../shared/jobs/state";
import { layoutOf } from "../shared/model/layout";
import { loadArchitecture } from "../shared/run";
import { build, legacy, stack } from "./fixture";

const write = (path: string, value: unknown) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
const root = mkdtempSync(join(tmpdir(), "shape-target-"));
const layout = layoutOf(root);
const f = build("browsing.");

type Dispatch = { action: "dispatch"; agents: { job: string; role: string; prompt: string }[] };
const step = () => next(layout, "/skill", "run", 4) as unknown as Dispatch;

/** Plays the agents of every job of the open batches with the given outputs until the stage is done. */
const play = (outputs: Record<string, unknown>, review = true): { action: string } => {
    for (let round = 0; round < 12; round++) {
        const action = step();
        if (action.action !== "dispatch") return action as { action: string };
        for (const agent of action.agents) {
            const p = jobPaths(layout, agent.job);
            if (agent.role === "writer") write(p.output, outputs[agent.job]);
            else {
                const out = JSON.parse(readFileSync(p.output, "utf8")) as Record<string, unknown[]>;
                const count = Object.values(out).reduce((sum, list) => sum + list.length, 0);
                write(p.review, { read: review ? count : 0, challenges: [] });
            }
            expect(done(layout, agent.job)).toMatch(/:/);
        }
    }
    throw new Error("the stage did not finish");
};

describe("the whole flow with scripted agents", () => {
    test("as-is: the analysis's journeys are read, then confirmed", () => {
        write(layout.requestJson, { stack, notes: [] });
        write(layout.legacy, legacy);
        write(join(layout.payloads, "journeys.json"), { journeys: f.tasks });
        const result = deriveCurrent(layout);
        expect(result.ok).toBe(true);
        expect(result.text).toContain("2 tasks");
        const current = JSON.parse(readFileSync(layout.current, "utf8")) as { tasks: { id: string }[] };
        expect(current.tasks.map((task) => task.id)).toEqual(["browsing.t1", "browsing.t2"]);
        expect(existsSync(layout.essence)).toBe(true);
        const wrong = chooseAsIs(layout, [{ of: "browsing.t1#3", verdict: "wrong", note: "not a step" }], "ok");
        expect(wrong.ok).toBe(false);
        expect(existsSync(layout.choiceAsIs)).toBe(false);
        const right = chooseAsIs(
            layout,
            [
                { of: "browsing.t1#1", verdict: "hurts", note: "slow" },
                { of: "browsing.gone#9", verdict: "unused" },
            ],
            "reads right",
        );
        expect(right.ok).toBe(true);
        expect(right.text).toContain("dropped 1 marks");
    });

    test("journeys need the as-is, and the essence carries the marks but no name of the old system", () => {
        expect(prepare(layout, "journeys")).toBe("1 jobs prepared for journeys");
        const essence = JSON.parse(readFileSync(layout.essence, "utf8")) as {
            tasks: { hurts: string[]; actions: unknown[] }[];
        };
        expect(essence.tasks[0]?.hurts).toEqual(["hurts: slow"]);
        expect(JSON.stringify(essence)).not.toContain("DetailPolicy");
        play({ "variants-1": { journeys: f.variants } });
        expect(finish(layout, "journeys").ok).toBe(true);
        expect(chooseJourneys(layout, { "browsing.t1": "nothing" }, true, "x").ok).toBe(false);
        expect(chooseJourneys(layout, {}, true, "take the recommendations").ok).toBe(true);
    });

    test("architecture and components, in the order of the dependencies", () => {
        expect(prepare(layout, "architecture")).toBe("1 jobs prepared for architecture");
        play({ shape: { architectures: f.architectures } });
        expect(finish(layout, "architecture").ok).toBe(true);
        expect(chooseArchitecture(layout, "nothing", "x").ok).toBe(false);
        expect(chooseArchitecture(layout, "modular", "a small team").ok).toBe(true);
        expect(prepare(layout, "components")).toBe("2 jobs prepared for components");
        const templates = f.components.filter((component) => component.domain === "Templates");
        const policies = f.components.filter((component) => component.domain === "Policies");
        const action = step();
        expect(action.agents.map((agent) => agent.job)).toEqual(["components-templates"]);
        write(jobPaths(layout, "components-templates").output, { components: templates });
        expect(done(layout, "components-templates")).toBe("components-templates: decided");
        const second = step();
        expect(second.agents.map((agent) => agent.job)).toEqual(["components-policies"]);
        const context = JSON.parse(readFileSync(jobPaths(layout, "components-policies").context, "utf8")) as {
            available: string[];
        };
        expect(context.available).toEqual(["template-reader"]);
        write(jobPaths(layout, "components-policies").output, { components: policies });
        expect(done(layout, "components-policies")).toBe("components-policies: decided");
        expect(finish(layout, "components").ok).toBe(true);
        const architecture = loadArchitecture(layout);
        expect(architecture?.components?.length).toBe(2);
        expect(finalGaps(architecture as never, designContext(layout))).toEqual([]);
        expect(gateState(layout, "components")).toBe("waiting");
        expect(chooseComponents(layout, "reads right").ok).toBe(true);
        expect(gateState(layout, "components")).toBe("confirmed");
    });

    test("a decision changes with what it rests on: a changed proposal or a decision before it confirmed later", () => {
        const later = new Date(Date.now() + 60_000);
        utimesSync(layout.architecture, later, later);
        expect(gateState(layout, "components")).toBe("confirmed");
        const text = readFileSync(layout.architecture, "utf8");
        writeFileSync(layout.architecture, `${text} `);
        expect(gateState(layout, "components")).toBe("changed");
        writeFileSync(layout.architecture, text);
        expect(gateState(layout, "components")).toBe("confirmed");
        Bun.sleepSync(5);
        expect(chooseArchitecture(layout, "modular", "same again").ok).toBe(true);
        expect(gateState(layout, "components")).toBe("changed");
        Bun.sleepSync(5);
        expect(chooseJourneys(layout, {}, true, "same again").ok).toBe(true);
        expect(gateState(layout, "architecture")).toBe("changed");
        expect(gateState(layout, "components")).toBe("blocked");
        expect(chooseComponents(layout, "too early").ok).toBe(false);
        Bun.sleepSync(5);
        expect(chooseArchitecture(layout, "modular", "after the journeys").ok).toBe(true);
        expect(gateState(layout, "architecture")).toBe("confirmed");
        Bun.sleepSync(5);
        expect(chooseComponents(layout, "after the architecture").ok).toBe(true);
        expect(gateState(layout, "components")).toBe("confirmed");
    });

    test("a gate failure gives one fix, then the job is refused; accept and abandon work", () => {
        prepare(layout, "components");
        const action = step();
        expect(action.agents.length).toBe(1);
        const job = action.agents[0]?.job ?? "";
        write(jobPaths(layout, job).output, { components: [] });
        expect(done(layout, job)).toBe(`${job}: toFix`);
        const again = step();
        expect(again.agents[0]?.prompt).toContain("customInstructions:");
        write(jobPaths(layout, job).output, { components: [] });
        expect(done(layout, job)).toBe(`${job}: refused`);
        expect((step() as unknown as { action: string }).action).toBe("stop");
        expect(abandon(layout, job)).toContain("not in the open batch");
        expect(accept(layout, job)).toContain("only a job waiting");
        expect(loadJobs(layout).jobs.filter((each) => each.state === "refused").length).toBe(1);
    });
});

describe("a gap found when the stage finishes", () => {
    test("redo hands a decided job back to its writer once, with the instructions", () => {
        const id = loadJobs(layout).jobs.find((job) => job.state === "refused")?.id ?? "";
        expect(redo(layout, id, "serve the steps too")).toContain("handed back");
        const again = step();
        expect(again.agents[0]?.job).toBe(id);
        expect(again.agents[0]?.prompt).toContain("customInstructions: serve the steps too");
    });
});
