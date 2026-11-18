import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { LayerChecks, Manifest } from "../core/documents";
import { runPhase } from "../core/layer-checks";
import { readRecords } from "../core/record-files";
import { readRun } from "../core/run-context";
import { runLayout } from "../core/run-layout";
import { servicesLayer, type Services } from "../core/services";
import { nextAction, openBatch } from "../progress-console";
import { git, writeFiles } from "./support/codebase-fixture";
import { scenarios, planAgents, storyNumber, type Scenario } from "./support/delivery-scenarios";
import { deliver, deliveryCodebase, driveRun, startStory, type Delivery } from "./support/drive-delivery";
import { present } from "./support/fixtures";

const quiet = () => undefined;

const onSystem = <A, E>(effect: Effect.Effect<A, E, Services>) =>
    Effect.runPromise(effect.pipe(Effect.provide(servicesLayer)));

const layoutOf = (delivered: Delivery) => runLayout(delivered.codebase, storyNumber);

/**
 * Decode a JSON document a run wrote.
 * @param path the file
 * @param schema its schema
 * @returns the document
 */
const documentAt = <S extends Schema.Decoder<unknown>>(path: string, schema: S) =>
    Schema.decodeUnknownSync(Schema.fromJsonString(schema))(readFileSync(path, "utf8"));

const e2eAgents = (verify: string) => `# e2e\n\n## Owns\n\nSome code.\n\n## Verify\n\n- \`${verify}\`\n`;

const proofOf = (tests: readonly { title: string; acs: readonly string[]; passed: boolean }[]) =>
    JSON.stringify({ tests, thresholds: [] });

/**
 * Make the e2e layer's Verify write one JUnit file, as a test runner would.
 * @param codebase the codebase
 * @param testcases the file's `testcase` elements
 */
const junitWith = (codebase: string, testcases: string) =>
    writeFiles(codebase, {
        "tests/e2e/prove.sh": `#!/bin/sh\nprintf '%s' '<testsuite name="s">${testcases}</testsuite>' > "$EVIDENCE_DIR/junit.xml"\n`,
    });

/**
 * Make the e2e layer's Verify write the given proof, as a layer's own run would.
 * @param codebase the codebase
 * @param proof the proof it writes
 */
const proveWith = (codebase: string, proof: string) =>
    writeFiles(codebase, {
        "tests/e2e/prove.sh": `#!/bin/sh\nprintf '%s' '${proof}' > "$EVIDENCE_DIR/proof.json"\n`,
    });

describe(
    "a criterion is proved only by a passing test that names it, from a run the skill made",
    { timeout: 120_000 },
    () => {
        const gapsAfterCode = async (delivered: Delivery) => {
            const outcome = await onSystem(runPhase(delivered.runFolder, "afterCode"));
            return { outcome: outcome.outcome, gaps: outcome.gaps };
        };

        it("holds when the criterion's test passes", async () => {
            const delivered = await deliver(scenarios.feature, true);
            expect(await gapsAfterCode(delivered)).toEqual({ outcome: "passed", gaps: undefined });
            const manifest = documentAt(layoutOf(delivered).manifest("afterCode"), Manifest);
            expect(
                manifest.layers.flatMap(({ proof }) => proof.tests.filter((test) => test.acs.includes("AC-1"))),
            ).toEqual([expect.objectContaining({ passed: true })]);
        });

        it.each([
            ["a test that names it fails", [{ title: "runs", acs: ["AC-1"], passed: false }]],
            ["a passing test names another criterion", [{ title: "other", acs: ["AC-9"], passed: true }]],
        ])("fails when %s", async (_name, tests) => {
            const delivered = await deliver(scenarios.feature, true);
            proveWith(delivered.codebase, proofOf(tests));
            expect(await gapsAfterCode(delivered)).toEqual({ outcome: "fix", gaps: ["AC-1 has no passing test"] });
        });

        it("stops as an unavailable environment, with no repair feedback, when a check exits 69", async () => {
            const delivered = await deliver(scenarios.feature, true);
            writeFiles(delivered.codebase, { "tests/e2e/AGENTS.md": e2eAgents("exit 69") });
            const outcome = await onSystem(runPhase(delivered.runFolder, "afterCode"));
            expect(outcome).toMatchObject({ outcome: "stop", kind: "environment" });
            expect(existsSync(layoutOf(delivered).fix.feedback)).toBe(false);
        });

        it.each(["environment", "existing-checks", "branch"])(
            "repeats a held %s stop on the next step",
            async (kind) => {
                const delivered = await deliver(scenarios.feature, true);
                writeFileSync(layoutOf(delivered).stopped, JSON.stringify({ kind, said: "held" }));
                const action = await nextAction(delivered.runFolder, undefined, quiet);
                expect(action.next).toBe("stop");
                expect("said" in action ? action.said : "").toContain("held");
            },
        );

        it("is credited by the planned title, with no planning identifier in the test's title", async () => {
            const delivered = await deliver(scenarios.feature, true);
            junitWith(delivered.codebase, '<testcase classname="the runs page" name="it runs are listed for me"/>');
            expect(await gapsAfterCode(delivered)).toEqual({ outcome: "passed", gaps: undefined });
        });

        it("is not credited to a failing test with the planned title", async () => {
            const delivered = await deliver(scenarios.feature, true);
            junitWith(
                delivered.codebase,
                '<testcase classname="the runs page" name="runs are listed"><failure/></testcase>',
            );
            expect(await gapsAfterCode(delivered)).toEqual({ outcome: "fix", gaps: ["AC-1 has no passing test"] });
        });

        it("is not borrowed from a proof or JUnit file the run did not write", async () => {
            const delivered = await deliver(scenarios.feature, true);
            const layout = layoutOf(delivered);
            writeFiles(delivered.codebase, {
                "tests/e2e/AGENTS.md": e2eAgents("true"),
                [join(layout.evidenceOf("afterCode", "e2e"), "proof.json").slice(delivered.codebase.length + 1)]:
                    proofOf([{ title: "runs", acs: ["AC-1"], passed: true }]),
                [join(layout.evidenceOf("afterCode", "e2e"), "junit.xml").slice(delivered.codebase.length + 1)]:
                    '<testsuite><testcase name="runs are listed" classname="e2e"/></testsuite>',
            });
            expect(await gapsAfterCode(delivered)).toEqual({
                outcome: "fix",
                gaps: ["AC-1 has no passing test"],
            });
            expect(existsSync(join(layout.evidenceOf("afterCode", "e2e"), "proof.json"))).toBe(false);
            expect(existsSync(join(layout.evidenceOf("afterCode", "e2e"), "junit.xml"))).toBe(false);
        });
    },
);

describe("a stopped or crashed run resumes from disk", { timeout: 120_000 }, () => {
    /**
     * Plan a feature until its `changes` agent has written its output, then lose the driver before it reports.
     * @returns the run, and the batch the dead driver left open
     */
    const crashedAfterChanges = async () => {
        const codebase = deliveryCodebase();
        const storyFile = join(codebase, ".artifacts", "story.md");
        writeFiles(codebase, { ".artifacts/story.md": scenarios.feature.story });
        const runFolder = await startStory(codebase, scenarios.feature, false, storyFile);
        const agents = planAgents(scenarios.feature);
        const dies = async (args: Readonly<Record<string, string>>, round: number) => {
            await present(agents.changes, "the changes agent")(args, round);
            throw new Error("the driver died");
        };
        await expect(driveRun(runFolder, { ...agents, changes: dies })).rejects.toThrow("the driver died");
        return { codebase, runFolder, agents };
    };

    it("closes that batch on what its agent wrote, and does none of the finished work again", async () => {
        const { codebase, runFolder, agents } = await crashedAfterChanges();
        const layout = runLayout(codebase, storyNumber);
        const before = {
            orient: readFileSync(layout.orient.records, "utf8"),
            trace: readFileSync(layout.trace.records, "utf8"),
            changes: readFileSync(layout.changes.records, "utf8"),
        };
        const held = present(await openBatch(runFolder), "the open batch");
        const resumed = await driveRun(runFolder, agents, held.batch);
        expect(resumed.jobs).toEqual(["tests", "plan-review"]);
        expect(resumed.last.next).toBe("done");
        expect(readFileSync(layout.orient.records, "utf8")).toBe(before.orient);
        expect(readFileSync(layout.trace.records, "utf8")).toBe(before.trace);
        expect(readFileSync(layout.changes.records, "utf8")).toBe(before.changes);
        expect(existsSync(join(layout.changes.folder, "rounds", "2"))).toBe(false);
    });
});

describe("nothing is built before the plan is approved", { timeout: 120_000 }, () => {
    /**
     * Start a feature's plan and drive it to its end, for the codebase and its story file.
     * @returns the codebase, the run and the story file
     */
    const planned = async () => {
        const delivered = await deliver(scenarios.feature, false);
        return { ...delivered, storyFile: join(delivered.codebase, ".artifacts", "story.md") };
    };

    it("refuses an approval while the plan has not passed its review", async () => {
        const codebase = deliveryCodebase();
        const storyFile = join(codebase, ".artifacts", "story.md");
        writeFiles(codebase, { ".artifacts/story.md": scenarios.feature.story });
        await startStory(codebase, scenarios.feature, false, storyFile);
        await expect(startStory(codebase, scenarios.feature, true, storyFile)).rejects.toThrow(
            "has no plan that passed review",
        );
    });

    it("approves a plan whose planned file was edited and committed after it was launched", async () => {
        const { codebase, storyFile, runFolder } = await planned();
        writeFiles(codebase, { "apps/api/runs.ts": "export const runs = ['NEWER'];\n" });
        git(codebase, "commit", "-q", "-am", "newer work");
        expect(await startStory(codebase, scenarios.feature, true, storyFile)).toBe(runFolder);
        expect(existsSync(runLayout(codebase, storyNumber).buildRequest)).toBe(true);
    });
});

describe(
    "the approved plan is committed as approved, tests before code where the layer says so",
    {
        timeout: 120_000,
    },
    () => {
        const commitsOf = (codebase: string) =>
            git(codebase, "log", "--reverse", "--format=%H", "main..HEAD").trim().split("\n");

        it("commits a test layer's tests alone first, then the code, each file whole as the plan proposed it", async () => {
            const delivered = await deliver(scenarios.feature, true);
            const feature = present(scenarios.feature.test, "the feature's test");
            const [tests, code, ...rest] = commitsOf(delivered.codebase);
            expect(rest).toEqual([]);
            const show = (commit: string | undefined, path: string) =>
                git(delivered.codebase, "show", `${present(commit, "a commit")}:${path}`);
            expect(
                git(delivered.codebase, "show", "--name-only", "--format=", present(tests, "the tests commit")).trim(),
            ).toBe(feature.file);
            expect(show(tests, feature.file)).toBe(feature.text);
            expect(show(code, "apps/api/runs.ts")).toBe(
                present(scenarios.feature.code["apps/api/runs.ts"], "the code"),
            );
            expect(git(delivered.codebase, "rev-parse", `${present(code, "the code commit")}^`).trim()).toBe(tests);
        });

        it("shows a bug's reproducing test failing in the tests-first commit and passing after the fix", async () => {
            const delivered = await deliver(scenarios.bug, true);
            const layout = layoutOf(delivered);
            const acTests = (phase: "afterTests" | "afterCode") =>
                documentAt(layout.manifest(phase), Manifest).layers.flatMap(({ proof }) =>
                    proof.tests.filter((test) => test.acs.includes("AC-1")).map((test) => test.passed),
                );
            expect(acTests("afterTests")).toEqual([false]);
            expect(acTests("afterCode")).toEqual([true]);
            expect(documentAt(layout.layerChecks("afterTests"), LayerChecks).outcome).toBe("passed");
        });
    },
);

describe("a reviewer is its own dispatch, by the review agent, never by an agent that produced the work", () => {
    it("dispatches both reviews to review-delivery and gives no dispatch an independent flag", async () => {
        const delivered = await deliver(scenarios.feature, true);
        const dispatches = [...delivered.plan.turns, ...present(delivered.build, "the build").turns].flatMap(
            ({ action }) => (action.next === "dispatch" ? action.dispatch : []),
        );
        const reviews = dispatches.filter(({ job }) => job === "plan-review" || job === "change-review");
        expect(reviews.map(({ job, agent }) => [job, agent])).toEqual([
            ["plan-review", "review-delivery"],
            ["change-review", "review-delivery"],
        ]);
        expect(dispatches.every((dispatch) => !("independent" in dispatch))).toBe(true);
    });
});

describe("writes and deletes stay in the run folder and the files the plan names", { timeout: 120_000 }, () => {
    const retiring: Scenario = { ...scenarios.feature, deletes: ["apps/api/old.ts"] };
    const bystanders = { "apps/api/old.ts": "export const old = 1;\n", "apps/api/keep.ts": "export const keep = 1;\n" };

    it("changes the planned files only, and a delete removes just its file", async () => {
        const delivered = await deliver(retiring, true, bystanders);
        const { codebase } = delivered;
        expect(git(codebase, "diff", "--name-only", "main..HEAD").trim().split("\n").toSorted()).toEqual([
            "apps/api/old.ts",
            "apps/api/runs.ts",
            "tests/e2e/runs.spec",
        ]);
        expect(existsSync(join(codebase, "apps/api/old.ts"))).toBe(false);
        expect(readFileSync(join(codebase, "apps/api/keep.ts"), "utf8")).toBe(bystanders["apps/api/keep.ts"]);
        expect(git(codebase, "status", "--porcelain").trim()).toBe("");
    });

    it("shows a file's diff against the branch before the plan's first commit, once the plan is applied", async () => {
        const delivered = await deliver(scenarios.feature, true);
        const { files } = await onSystem(readRun(delivered.runFolder));
        expect(files.get("apps/api/runs.ts")?.before).toBe("export const runs = [];\n");
        expect(files.get("apps/api/runs.ts")?.after).not.toBe("export const runs = [];\n");
    });

    it("stops with an operator's own uncommitted file in the tree, and leaves it alone", async () => {
        const planned = await deliver(scenarios.feature, false);
        const { codebase, runFolder } = planned;
        const storyFile = join(codebase, ".artifacts", "story.md");
        writeFileSync(join(codebase, "notes.txt"), "mine\n");
        await startStory(codebase, scenarios.feature, true, storyFile);
        const action = await nextAction(runFolder, undefined, quiet);
        expect(action.next).toBe("stop");
        expect(readFileSync(join(codebase, "notes.txt"), "utf8")).toBe("mine\n");
        expect(git(codebase, "log", "--format=%s", "main..HEAD")).toBe("");
        expect(await onSystem(readRecords(runLayout(codebase, storyNumber).changes.records))).not.toEqual([]);
    });
});
