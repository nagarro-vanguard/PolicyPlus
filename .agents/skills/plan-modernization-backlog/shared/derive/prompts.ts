import { join } from "node:path";
import type { Layout } from "../model/layout";
import type { ManifestItem } from "./publish";

export type Manifest = { analysis: { root: string; fingerprint: string }; items: ManifestItem[] };

const ledgerSet = (skillRoot: string, layout: Layout, key: string, rest: string) =>
    `bun ${join(skillRoot, "cli/ledger.ts")} ${layout.outputRoot} set "${key}" ${rest}`;

/**
 * The prompt that creates one epic and then its stories, one at a time, with the create-work-item skill. Every value in
 * it is read from the manifest; nothing is reworded. The ledger carries what was already created.
 * @param layout the run's folders
 * @param skillRoot this skill's folder
 * @param manifest the manifest of work items
 * @param epicKey the epic to create
 * @returns the prompt text
 */
export const createEpicPrompt = (layout: Layout, skillRoot: string, manifest: Manifest, epicKey: string) => {
    const epic = manifest.items.find((item) => item.kind === "epic" && item.key === epicKey);
    if (epic === undefined) throw new Error(`no epic ${epicKey}`);
    const titleOf = new Map(manifest.items.map((item) => [item.key, item.title]));
    const stories = manifest.items
        .filter((item) => item.kind === "story" && item.parent === epicKey)
        .sort((a, b) => a.sequence - b.sequence);
    const after = epic.comesAfter.map((key) => titleOf.get(key) ?? key);
    const line = (item: ManifestItem, n: number) =>
        [
            `${n}. ${item.kind === "epic" ? "Epic" : "Story"} "${item.title}" (key ${item.key})`,
            `   - tags: ${item.tags.join(", ")}`,
            `   - body: ${join(layout.items, item.body)} (pass it as the \`body\` argument; do not edit it)`,
            ...(item.kind === "story" ? [`   - parent: the epic created in step 1`] : []),
            ...(item.blockedBy.length > 0
                ? [
                      `   - blocked by: ${item.blockedBy.map((key) => `"${titleOf.get(key) ?? key}" (key ${key}; its item address is in the ledger)`).join("; ")}`,
                  ]
                : []),
            ...(item.attachment ? [`   - attachment: ${join(layout.items, item.attachment)}`] : []),
            `   - then record it: ${ledgerSet(skillRoot, layout, item.key, "--status created --item <the item's address>")}`,
        ].join("\n");
    return [
        `Create the work items of the epic "${epic.title}" with the create-work-item skill, one at a time, in this order.`,
        ...(after.length > 0 ? [`Its epic comes after: ${after.join("; ")}. They must already be created.`] : []),
        `First read the ledger ${layout.ledger}. Skip any item it already lists as created, and stop and say which epic to create first if a blocker has no item address in it.`,
        "",
        [epic, ...stories].map((item, at) => line(item, at + 1)).join("\n\n"),
        "",
        "Stop at the first failure and say what failed. Do not create anything not listed here.",
    ].join("\n");
};

/** The prompt that makes the scaffold story's branch in its own worktree and scaffolds the codebase there. */
export const scaffoldPrompt = (
    layout: Layout,
    skillRoot: string,
    manifest: Manifest,
    worktrees: string,
    base: string,
) => {
    const story = manifest.items.find((item) => item.builder === "scaffold-codebase");
    if (story === undefined) throw new Error("no scaffold story");
    return [
        `Scaffold the codebase with the scaffold-codebase skill, in a worktree of its own work item.`,
        `1. Read the ledger ${layout.ledger} for the work item of "${story.title}" (key ${story.key}); it must be created.`,
        `2. Use the create-branch skill in worktree mode: worktree folder ${join(worktrees, `scaffold`)}, base branch ${base}.`,
        `3. In that worktree run the scaffold-codebase skill for the Output Root ${layout.outputRoot}: \`workspace\`, then one \`scaffold-layer\` agent per layer from \`layers\`, then \`ready\` until it prints ok.`,
        `4. Record it: ${ledgerSet(skillRoot, layout, story.key, "--status branched --branch <branch> --worktree <worktree>")}, and when ready passes and the change is merged: ${ledgerSet(skillRoot, layout, story.key, "--status merged --pr <address>")}.`,
    ].join("\n");
};

/** The prompt that delivers one story: its branch in a worktree, then shape-and-deliver with the story's attachment. */
export const deliverPrompt = (
    layout: Layout,
    skillRoot: string,
    manifest: Manifest,
    storyKey: string,
    worktrees: string,
    base: string,
) => {
    const story = manifest.items.find((item) => item.kind === "story" && item.key === storyKey);
    if (story === undefined) throw new Error(`no story ${storyKey}`);
    return [
        `Deliver the story "${story.title}" (key ${story.key}).`,
        `1. Read the ledger ${layout.ledger}: the story must be created and every blocker merged.`,
        `2. Use the create-branch skill in worktree mode: worktree folder ${join(worktrees, story.key)}, base branch ${base}.`,
        `3. Run the shape-and-deliver skill from that worktree on the story's address${story.attachment ? `, reading its attachment ${join(layout.items, story.attachment)} into a file and passing it as \`--reference\`` : ""}.`,
        `4. Record progress: ${ledgerSet(skillRoot, layout, story.key, "--status <branched|approved|built|merged|blocked> --branch <branch> --worktree <worktree> --pr <address>")}; before removing the worktree copy evidence.html and result.json to ${join(layout.results, story.key)} and record --result.`,
    ].join("\n");
};
