import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { ComposeError } from "../errors";
import { namesIn, readJson, readText, sha256 } from "../io";

/*
 * What the plan skill wrote under the run's output root: the plan and its prompts, the ledger of work items, the legacy
 * attachments, and the person's request. Only `plan.json` and `prompts.json` are required once a plan is given.
 */

/** Plan contract versions compose reads; plans written so far carry none and are read as they are. */
export const knownPlanVersions = [1] as const;

const Text = z.string();
const Ids = z.array(z.string());

const Story = z.looseObject({
    key: Text,
    title: Text,
    what: Text,
    why: Text,
    kind: Text,
    tags: Ids,
    phase: z.number(),
    epic: Text,
    sequence: z.number(),
    blockedBy: Ids,
    builds: Ids,
    reliesOn: z.array(z.looseObject({ rule: Text, builtBy: Text })),
    actions: Ids,
    criteria: z.array(z.looseObject({ says: Text })),
    steps: Ids.optional(),
    components: Ids.optional(),
    layers: Ids.optional(),
    capability: Text.optional(),
    surface: Text.optional(),
    part: Text.optional(),
    splitFrom: Text.optional(),
});

const Plan = z.looseObject({
    contractVersion: z.number().optional(),
    layers: z.array(
        z.looseObject({
            id: Text,
            name: Text,
            path: Text,
            kind: Text,
            purpose: Text,
            carries: z.array(z.number()),
            dependsOn: Ids,
            role: Text.optional(),
            container: Text.optional(),
        }),
    ),
    decisions: z.array(z.looseObject({ id: Text, layer: Text, chose: Text, reason: Text })),
    epics: z.array(
        z.looseObject({
            key: Text,
            kind: Text,
            title: Text,
            outcome: Text,
            task: Text.optional(),
            comesAfter: Ids,
            stories: Ids,
            sequence: z.number(),
        }),
    ),
    phases: z.array(z.looseObject({ number: z.number(), name: Text, why: Text, stories: Ids })),
    stories: z.array(Story),
    coverage: z.looseObject({ rulesBuilt: z.number(), rulesTotal: z.number() }),
    conflicts: z
        .array(z.looseObject({ stage: Text, variant: z.string(), says: Text, resolved: z.boolean() }))
        .optional(),
});

const Prompts = z.looseObject({
    epics: z.record(Text, Text),
    scaffold: Text.optional(),
    deliver: z.record(Text, Text),
});

const Ledger = z.looseObject({ items: z.record(Text, z.looseObject({ status: Text })) });

const Request = z.looseObject({ goals: Text.optional(), stack: Ids.optional() });

export type PlanFile = z.output<typeof Plan>;
export type PlanStory = PlanFile["stories"][number];

export type PlanInput = {
    readonly root: string;
    readonly fingerprint: string;
    readonly plan: PlanFile;
    readonly prompts: z.output<typeof Prompts>;
    readonly status: ReadonlyMap<string, string>;
    /** Each story's legacy attachment text, by story key. */
    readonly attachments: ReadonlyMap<string, string>;
};

export type RequestInput = { readonly goals: string | undefined; readonly stack: readonly string[] };

/**
 * Read the plan of a modernization.
 * @param root the run's output root
 * @returns the plan, its prompts, the ledger's statuses and the attachments
 */
export const readPlan = (root: string): PlanInput => {
    const payloads = join(root, ".modernization-backlog", "payloads");
    const planPath = join(payloads, "plan.json");
    const promptsPath = join(payloads, "prompts.json");
    for (const path of [planPath, promptsPath]) {
        if (!existsSync(path)) throw new ComposeError("missing", `missing fact: ${path} (the plan is not written)`);
    }
    const planText = readText(planPath);
    const plan = readJson(planPath, Plan, planText);
    if (
        plan.contractVersion !== undefined &&
        !(knownPlanVersions as readonly number[]).includes(plan.contractVersion)
    ) {
        throw new ComposeError(
            "version",
            `${planPath} follows plan contract version ${plan.contractVersion}; compose reads version ${knownPlanVersions.join(", ")}`,
        );
    }
    const promptsText = readText(promptsPath);
    const ledgerPath = join(root, "work-items", "ledger.json");
    const ledger = existsSync(ledgerPath) ? readJson(ledgerPath, Ledger) : { items: {} };
    const folder = join(root, "work-items", "attachments");
    const attachments = new Map(
        namesIn(folder)
            .filter((name) => name.endsWith(".md"))
            .map((name) => [name.slice(0, -3), readText(join(folder, name))] as const),
    );
    return {
        root,
        fingerprint: sha256(`${sha256(planText)}\n${sha256(promptsText)}`),
        plan,
        prompts: readJson(promptsPath, Prompts, promptsText),
        status: new Map(Object.entries(ledger.items).map(([key, item]) => [key, item.status])),
        attachments,
    };
};

/**
 * The person's request: the Goals they wrote, kept verbatim, and the target stack lines.
 * @param root the run's output root
 * @returns the request, or nothing when the root holds none
 */
export const readRequest = (root: string): RequestInput | undefined => {
    const path = join(root, "request.json");
    if (!existsSync(path)) return undefined;
    const request = readJson(path, Request);
    const goals = request.goals === undefined || request.goals.trim() === "" ? undefined : request.goals;
    return { goals, stack: request.stack ?? [] };
};
