import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Schema } from "effect";
import type { Layout } from "../model/layout";
import { Ledger } from "../model/ledger";
import { Plan } from "../model/plan";
import type { ModernizationRequest } from "../model/request";
import { layerAgentsMd, rootAgentsMd } from "./agents-md";
import { attachmentText, headerFor } from "./attachment";
import { epicBody, storyBody } from "./bodies";
import type { Facts } from "./facts";
import type { Target } from "../read/target";
import { createEpicPrompt, deliverPrompt, scaffoldPrompt, type Manifest } from "./prompts";

export type ManifestItem = {
    readonly key: string;
    readonly file: string;
    readonly kind: "epic" | "story";
    readonly title: string;
    readonly tags: readonly string[];
    readonly parent: string | null;
    readonly blockedBy: readonly string[];
    readonly comesAfter: readonly string[];
    readonly sequence: number;
    readonly phase: number;
    readonly builder: string;
    readonly body: string;
    readonly attachment: string | null;
};

const slug = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
/** The name a bundle file has for one surface of one capability: the contract with code-analysis's batch mode. */
export const bundleName = (surface: string, capability: string) => `screen-${slug(surface)}--${slug(capability)}.md`;
const write = (path: string, text: string) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text.endsWith("\n") ? text : `${text}\n`);
};

/**
 * The ledger made to match the plan: every story of the plan has an entry (a new one is `planned`), and an entry whose
 * story or epic left the plan is dropped while nothing was done with it yet. An entry that left the plan after its work
 * item was created cannot be dropped silently: it is named, and the plan is not written.
 * @param layout the run's folders
 * @param plan the plan
 * @returns the ledger to write, and what stops it
 */
export const syncLedger = (layout: Layout, plan: Plan): { ledger: Ledger; failing: string[] } => {
    const before: Ledger = existsSync(layout.ledger)
        ? Schema.decodeUnknownSync(Ledger)(JSON.parse(readFileSync(layout.ledger, "utf8")))
        : { items: {} };
    const keys = new Set<string>([...plan.stories.map((story) => story.key), ...plan.epics.map((epic) => epic.key)]);
    const failing: string[] = [];
    const items: Record<string, Ledger["items"][string]> = {};
    for (const [key, entry] of Object.entries(before.items)) {
        if (keys.has(key)) items[key] = entry;
        else if (entry.status !== "planned")
            failing.push(
                `work item ${key}${entry.item === undefined ? "" : ` (${entry.item})`} is ${entry.status} but its story is no longer in the plan: put the story back, or set it planned in the ledger once the work item is closed`,
            );
    }
    for (const story of plan.stories) items[story.key] ??= { status: "planned" };
    return { ledger: { ...before, items }, failing };
};

/** Removes the markdown files of a folder that this build did not write. */
const prune = (folder: string, written: ReadonlySet<string>) => {
    if (!existsSync(folder)) return;
    for (const name of readdirSync(folder))
        if (name.endsWith(".md") && !written.has(name)) rmSync(join(folder, name), { force: true });
};

/**
 * Writes everything the plan hands on: `plan.json`, the manifest of work items with their bodies and attachments, the
 * AGENTS.md of every layer as a preview, and the ledger made to match the plan. The bodies and attachments of stories
 * no longer in the plan are removed. Nothing here is written by an agent.
 * @param layout the run's folders
 * @param plan the plan
 * @param facts the analysis facts
 * @param request the request
 * @param workTracking the workspace's `Work tracking` text, copied verbatim into the root AGENTS.md preview
 * @returns the manifest
 */
export const publishPlan = (
    layout: Layout,
    plan: Plan,
    facts: Facts,
    request: ModernizationRequest,
    workTracking: string,
    skillRoot: string,
    target?: Target,
) => {
    write(layout.plan, JSON.stringify(Schema.encodeSync(Plan)(plan), null, 2));
    const items: ManifestItem[] = [];
    const bodies = new Set<string>();
    const attachments = new Set<string>();
    for (const epic of plan.epics) {
        const key = `epic-${slug(epic.key)}`;
        items.push({
            key: epic.key,
            file: key,
            kind: "epic",
            title: epic.title,
            tags: ["epic", epic.kind],
            parent: null,
            blockedBy: [],
            comesAfter: epic.comesAfter,
            sequence: epic.sequence,
            phase: 0,
            builder: "none",
            body: `bodies/${key}.md`,
            attachment: null,
        });
        write(join(layout.bodies, `${key}.md`), `# ${epic.title}\n\n${epicBody(epic, plan)}`);
        bodies.add(`${key}.md`);
    }
    for (const story of plan.stories) {
        // The bundle of every surface the story's entry points belong to, in the order they appear.
        const surfaceOf = new Map(
            facts.capabilities.flatMap((c) =>
                c.surfaces.flatMap((s) => s.actions.map((a) => [a.id, bundleName(s.name, c.name)] as const)),
            ),
        );
        const names = [...new Set(story.actions.flatMap((id) => surfaceOf.get(id as string) ?? []))];
        const texts = names
            .map((name) => join(layout.analysisBundles, name))
            .filter((file) => existsSync(file))
            .map((file) => readFileSync(file, "utf8"));
        const bundle = texts.length === 0 ? undefined : texts.join("\n\n---\n\n");
        const attached = story.builds.length > 0;
        write(join(layout.bodies, `${story.key}.md`), `# ${story.title}\n\n${storyBody(story, plan, facts)}`);
        bodies.add(`${story.key}.md`);
        if (attached) attachments.add(`${story.key}.md`);
        if (attached)
            write(
                join(layout.attachments, `${story.key}.md`),
                attachmentText(story.title, headerFor(story, plan, facts, target && { target }), bundle),
            );
        items.push({
            key: story.key,
            file: story.key,
            kind: "story",
            title: story.title,
            tags: story.tags,
            parent: story.epic,
            blockedBy: story.blockedBy,
            comesAfter: [],
            sequence: story.sequence,
            phase: story.phase,
            builder: story.builder,
            body: `bodies/${story.key}.md`,
            attachment: attached ? `attachments/${story.key}.md` : null,
        });
    }
    const manifest: Manifest = { analysis: plan.analysis, items };
    write(layout.manifest, JSON.stringify(manifest, null, 2));
    const worktrees = `${layout.outputRoot}-worktrees`;
    const base = "<the repository's default branch>";
    write(
        join(layout.payloads, "prompts.json"),
        JSON.stringify(
            {
                epics: Object.fromEntries(
                    plan.epics.map((epic) => [epic.key, createEpicPrompt(layout, skillRoot, manifest, epic.key)]),
                ),
                scaffold: scaffoldPrompt(layout, skillRoot, manifest, worktrees, base),
                deliver: Object.fromEntries(
                    plan.stories.map((story) => [
                        story.key,
                        deliverPrompt(layout, skillRoot, manifest, story.key, worktrees, base),
                    ]),
                ),
            },
            null,
            2,
        ),
    );
    for (const layer of plan.layers)
        write(join(layout.agentsFiles, slug(layer.name), "AGENTS.md"), layerAgentsMd(layer, request, plan.decisions));
    write(join(layout.agentsFiles, "AGENTS.md"), rootAgentsMd(request, plan.layers, plan.decisions, workTracking));
    prune(layout.bodies, bodies);
    prune(layout.attachments, attachments);
    write(layout.ledger, JSON.stringify(Schema.encodeSync(Ledger)(syncLedger(layout, plan).ledger), null, 2));
    return items;
};
