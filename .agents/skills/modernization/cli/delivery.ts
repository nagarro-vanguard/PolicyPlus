import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Action, Paths, Settings } from "./steps";

type Item = {
    key: string;
    kind: "epic" | "story";
    title: string;
    parent: string | null;
    blockedBy: string[];
    comesAfter: string[];
    sequence: number;
    builder: string;
};
type Entry = { status: string; item?: string };
type Ledger = { reviewed?: string; items: Record<string, Entry> };

const read = <T>(path: string) => JSON.parse(readFileSync(path, "utf8")) as T;
const prompts = (skills: string, paths: Paths, args: string, settings: Settings) =>
    `bun ${join(skills, "plan-modernization-backlog/cli/prompts.ts")} ${paths.root} ${args} --worktrees ${settings.worktrees} --base ${settings.base}`;

/**
 * Review, creating the work items epic by epic, scaffolding, and delivering stories one at a time, all from the ledger.
 * Creating items and merging are the person's; the conductor says which is next and why it waits.
 */
export const deliveryAction = ({
    paths,
    skills,
    settings,
}: {
    paths: Paths;
    skills: string;
    settings: Settings;
}): Action => {
    const ledger: Ledger = existsSync(paths.ledger) ? read<Ledger>(paths.ledger) : { items: {} };
    const manifest = read<{ items: Item[] }>(paths.manifest);
    if (ledger.reviewed === undefined) {
        return {
            action: "wait",
            step: "review",
            message: `Open ${paths.app}/index.html, review the plan, then record it: bun ${join(skills, "plan-modernization-backlog/cli/ledger.ts")} ${paths.root} reviewed`,
        };
    }
    const status = (key: string) => ledger.items[key]?.status ?? "planned";
    const created = (key: string) => status(key) !== "planned";
    const epics = manifest.items.filter((item) => item.kind === "epic").sort((a, b) => a.sequence - b.sequence);
    const stories = manifest.items.filter((item) => item.kind === "story").sort((a, b) => a.sequence - b.sequence);
    const storiesOf = (epic: string) => stories.filter((story) => story.parent === epic);
    const epicDone = (epic: string) => created(epic) && storiesOf(epic).every((story) => created(story.key));
    const openEpic = epics.find((epic) => !epicDone(epic.key));
    if (openEpic !== undefined) {
        const blocking = openEpic.comesAfter.find((key) => !epicDone(key));
        if (blocking !== undefined)
            return {
                action: "stop",
                step: "create-epics",
                message: `epic ${openEpic.title} comes after ${blocking}, which is not fully created`,
            };
        return {
            action: "prompt",
            step: "create-epics",
            why: `Create the epic "${openEpic.title}" and its stories, in order. The tracker is written only when the person pastes this.`,
            text: `run: ${prompts(skills, paths, `epic "${openEpic.key}"`, settings)}`,
        };
    }
    const scaffold = stories.find((story) => story.builder === "scaffold-codebase");
    if (scaffold !== undefined && status(scaffold.key) !== "merged") {
        if (status(scaffold.key) === "blocked" || status(scaffold.key) === "failed")
            return {
                action: "wait",
                step: "scaffold",
                message: `The scaffold is ${status(scaffold.key)}: look at it, fix it, and record the new status with the ledger.`,
            };
        return {
            action: "prompt",
            step: "scaffold",
            why: "Scaffold the codebase in its own worktree; then `ready` must print ok, and the change be merged.",
            text: `run: ${prompts(skills, paths, "scaffold", settings)}`,
        };
    }
    const merged = (key: string) => status(key) === "merged";
    const inFlight = stories.filter((story) =>
        ["branched", "approved", "built", "blocked", "failed"].includes(status(story.key)),
    );
    const current =
        inFlight[0] ??
        stories.find(
            (story) =>
                !merged(story.key) &&
                story.blockedBy.every(merged) &&
                epics
                    .find((epic) => epic.key === story.parent)
                    ?.comesAfter.every((key) => storiesOf(key).every((each) => merged(each.key))),
        );
    if (current === undefined) {
        return stories.every((story) => merged(story.key))
            ? { action: "done", message: "every story is merged" }
            : {
                  action: "stop",
                  step: "deliver",
                  message: "no story is ready: each unmerged story waits for one that is not merged",
              };
    }
    const s = status(current.key);
    if (s === "blocked" || s === "failed")
        return {
            action: "wait",
            step: "deliver",
            message: `"${current.title}" is ${s}: answer what shape-and-deliver asks, then record the new status.`,
        };
    if (s === "built")
        return {
            action: "wait",
            step: "deliver",
            message: `"${current.title}" is built: merge its pull request, then record it: ledger set ${current.key} --status merged --pr <address>`,
        };
    if (s === "approved")
        return {
            action: "wait",
            step: "deliver",
            message: `"${current.title}" has an approved plan: it is being built.`,
        };
    return {
        action: "prompt",
        step: "deliver",
        why: `Deliver "${current.title}" (story ${current.sequence} of ${stories.length}); one worktree at a time.`,
        text: `run: ${prompts(skills, paths, `deliver "${current.key}"`, settings)}`,
    };
};
