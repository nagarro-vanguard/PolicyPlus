import { join } from "node:path";
import { Effect } from "effect";
import { expect } from "vitest";
import { pickVariant } from "../../core/pick";
import { launchStory } from "../../core/story";
import { servicesLayer } from "../../core/services";
import { launch, nextAction, openBatch, type RunActions } from "../../progress-console";
import { codebaseWithChecks, codebaseWithKnowledge, git, writeFiles } from "./codebase-fixture";
import { present } from "./fixtures";
import {
    buildAgents,
    builtAfterDesign,
    pickedPlace,
    planAgents,
    storyNumber,
    storyUrl,
    type DeliveryAgents,
    type Scenario,
} from "./delivery-scenarios";

/** The skill's own folder, which the briefs and the scripts sit in. */
export const skillRoot = join(import.meta.dirname, "..", "..", "..");

/** What a driver saw of one `next`: its action, and the progress lines the step wrote while it ran. */
type Turn = { readonly action: RunActions; readonly progress: readonly string[] };

/** What a driver saw of a whole mode of a run, from its first `next` to its last. */
export type Transcript = {
    readonly turns: readonly Turn[];
    /** The job of each agent handed out, in order. */
    readonly jobs: readonly string[];
    /** The last action: the mode's end or a stop. */
    readonly last: RunActions;
};

/** A story's run: where it is, and what was seen of each mode driven. */
export type Delivery = {
    readonly codebase: string;
    readonly runFolder: string;
    readonly plan: Transcript;
    /** Present when the build was driven. */
    readonly build?: Transcript;
};

/** Each `next` ends with an action; a run that has not ended after this many is not going to. */
const turnLimit = 40;

/**
 * A codebase for a story of the scenario: the fixture's, with real checks and a knowledge base unless told otherwise,
 * on a branch for the story.
 * @param overrides files the codebase starts with besides the fixture's
 * @param knowledge whether the codebase declares a knowledge base
 * @returns the codebase root
 */
export function deliveryCodebase(overrides: Record<string, string> = {}, knowledge = true) {
    const codebase = knowledge ? codebaseWithKnowledge(overrides) : codebaseWithChecks(overrides);
    git(codebase, "checkout", "-q", "-b", `feat/${storyNumber}-the-story`);
    return codebase;
}

/**
 * Launch a story as `start.ts` does: read the story file the driver wrote, decide the profile, and record the typed
 * launch in-process, as the app's adapter does.
 * @param codebase the codebase
 * @param scenario the story's profile
 * @param approve whether to approve the plan that passed review instead of planning
 * @param storyFile where the story file is written
 * @returns the run folder
 */
export async function startStory(codebase: string, scenario: Scenario, approve: boolean, storyFile: string) {
    const launched = await Effect.runPromise(
        launchStory({
            url: storyUrl,
            storyFile: approve ? undefined : storyFile,
            epicFile: undefined,
            instructions: undefined,
            approve,
            codebase,
        }).pipe(Effect.provide(servicesLayer)),
    );
    expect(launched.kind).toBe(scenario.profile);
    return launch(launched.launch, () => undefined);
}

/**
 * Drive a run with `next` until it ends or stops, running each agent it hands out with the scripted one for its job,
 * as a coding agent or the app would, and checking that the open batch is the one handed out.
 * @param runFolder the run folder
 * @param agents the scripted agent for each job
 * @param finished the batch a driver restarted by the run folder alone already ran, to close first
 * @returns every turn, the jobs handed out, and the last action
 */
export async function driveRun(runFolder: string, agents: DeliveryAgents, finished?: string): Promise<Transcript> {
    const turns: Turn[] = [];
    const jobs: string[] = [];
    let after = finished;
    for (let count = 0; count < turnLimit; count += 1) {
        const progress: string[] = [];
        const action = await nextAction(runFolder, after, (line) => progress.push(line));
        turns.push({ action, progress });
        if (action.next !== "dispatch") {
            return { turns, jobs, last: action };
        }
        const [dispatched] = action.dispatch;
        expect((await openBatch(runFolder))?.batch, "the held batch is the one handed out").toBe(action.batch);
        jobs.push(dispatched.job);
        const agent = agents[dispatched.job];
        expect(agent, `no scripted agent for ${dispatched.job}`).toBeDefined();
        await present(agent, `a scripted agent for ${dispatched.job}`)(
            dispatched.arguments,
            jobs.filter((job) => job === dispatched.job).length,
        );
        after = action.batch;
    }
    throw new Error(`the run did not end within ${turnLimit} actions`);
}

/**
 * Deliver a story with scripted agents: plan it to its `done`, then, when asked, approve the plan as
 * `start.ts <url> --approve` does and build it to its `done`: the tests committed first and checked, the code
 * committed and checked, the change reviewed.
 * @param scenario the story's profile
 * @param build whether to approve the plan and drive the build
 * @param overrides files the codebase starts with besides the fixture's
 * @returns the codebase, the run folder and what each mode showed its driver
 */
export async function deliver(
    scenario: Scenario,
    build: boolean,
    overrides: Record<string, string> = {},
): Promise<Delivery> {
    const codebase = deliveryCodebase(overrides);
    const storyFile = join(codebase, ".artifacts", "story.md");
    writeFiles(codebase, { ".artifacts/story.md": scenario.story });
    const runFolder = await startStory(codebase, scenario, false, storyFile);
    const plan = await driveRun(runFolder, planAgents(scenario));
    if (!build) {
        return { codebase, runFolder, plan };
    }
    expect(plan.last.next, "the plan ends with the approver's turn").toBe("done");
    expect(await startStory(codebase, scenario, true, storyFile)).toBe(runFolder);
    return { codebase, runFolder, plan, build: await driveRun(runFolder, buildAgents(scenario)) };
}

/**
 * Carry a designed story on: pick the design's first variant, then plan and build the feature that follows the
 * picked design, as `start.ts` launches it once a variant is picked.
 * @param designed the story's design, planned and built
 * @returns the story's run, with the plan and the build of the feature that follows the design
 */
export async function buildAfterPick(designed: Delivery): Promise<Delivery> {
    const { codebase, runFolder } = designed;
    await Effect.runPromise(
        pickVariant({ codebase, story: storyNumber, variant: "a", to: pickedPlace, commands: [] }).pipe(
            Effect.provide(servicesLayer),
        ),
    );
    const storyFile = join(codebase, ".artifacts", "story.md");
    expect(await startStory(codebase, builtAfterDesign, false, storyFile)).toBe(runFolder);
    const plan = await driveRun(runFolder, planAgents(builtAfterDesign));
    expect(plan.last.next, "the plan ends with the approver's turn").toBe("done");
    expect(await startStory(codebase, builtAfterDesign, true, storyFile)).toBe(runFolder);
    return { codebase, runFolder, plan, build: await driveRun(runFolder, buildAgents(builtAfterDesign)) };
}
