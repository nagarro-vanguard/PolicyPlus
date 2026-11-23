import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { Schema } from "effect";
import type { Layout } from "../model/layout";
import { Plan } from "../model/plan";
import type { ModernizationRequest } from "../model/request";
import { layerAgentsMd, rootAgentsMd } from "./agents-md";
import { attachmentText, headerFor } from "./attachment";
import { epicBody, storyBody } from "./bodies";
import type { Facts } from "./facts";
import type { Target } from "../read/target";

type Manifest = { analysis: { root: string; fingerprint: string }; items: ManifestItem[] };

type ManifestItem = {
    readonly key: string;
    readonly file: string;
    readonly kind: "epic" | "story";
    readonly title: string;
    readonly parent: string | null;
    readonly blockedBy: readonly string[];
    readonly comesAfter: readonly string[];
    readonly sequence: number;
    readonly phase: number;
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

/** Removes the markdown files of a folder that this build did not write. */
const prune = (folder: string, written: ReadonlySet<string>) => {
    if (!existsSync(folder)) return;
    for (const name of readdirSync(folder))
        if (name.endsWith(".md") && !written.has(name)) rmSync(join(folder, name), { force: true });
};

/**
 * Writes everything the plan hands on: `plan.json`, the manifest of stories with their bodies and attachments, and the
 * AGENTS.md of every layer as a preview. The bodies and attachments of stories
 * no longer in the plan are removed. Nothing here is written by an agent.
 * @param layout the run's folders
 * @param plan the plan
 * @param facts the analysis facts
 * @param request the request
 * @returns the manifest
 */
export const publishPlan = (
    layout: Layout,
    plan: Plan,
    facts: Facts,
    request: ModernizationRequest,
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
            parent: null,
            blockedBy: [],
            comesAfter: epic.comesAfter,
            sequence: epic.sequence,
            phase: 0,
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
            parent: story.epic,
            blockedBy: story.blockedBy,
            comesAfter: [],
            sequence: story.sequence,
            phase: story.phase,
            body: `bodies/${story.key}.md`,
            attachment: attached ? `attachments/${story.key}.md` : null,
        });
    }
    const manifest: Manifest = { analysis: plan.analysis, items };
    write(layout.manifest, JSON.stringify(manifest, null, 2));
    for (const layer of plan.layers)
        write(join(layout.agentsFiles, slug(layer.name), "AGENTS.md"), layerAgentsMd(layer, request, plan.decisions));
    write(join(layout.agentsFiles, "AGENTS.md"), rootAgentsMd(request, plan.layers, plan.decisions));
    prune(layout.bodies, bodies);
    prune(layout.attachments, attachments);
    return items;
};
