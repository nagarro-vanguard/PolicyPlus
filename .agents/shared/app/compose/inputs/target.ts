import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { loadDisputes } from "../../../../skills/shape-target/shared/disputes";
import { gates, gateState, proposalOf, snapshotOf, subjectOf, type Gate } from "../../../../skills/shape-target/shared/gates";
import { layoutOf } from "../../../../skills/shape-target/shared/model/layout";
import { changedSince, itemsOf, type Since } from "../../../../skills/shape-target/shared/since";
import { ComposeError } from "../errors";
import { AuthoredView } from "./view";
import { readJson, readText, sha256 } from "../io";

/*
 * What shape-target wrote under `<root>/target/`, read with shape-target's own readers where it exports them (what
 * changed since a decision was confirmed, the surviving disputes). A target is optional; when one is given its chosen
 * journeys and architecture are required.
 */

/** The target contract versions compose reads; a target written before its manifest existed has none. */
export const knownTargetVersions = [2] as const;

const Text = z.string();
const Ids = z.array(z.string());

const Step = z.looseObject({
    id: Text,
    intent: Text,
    system: Text,
    confidence: Text,
    touches: Ids,
    honours: Ids,
    changes: z.array(z.looseObject({ rule: Text, to: Text })).optional(),
    link: z.union([
        z.looseObject({ _tag: z.literal("legacy"), from: Ids, change: Text, reason: Text, keeps: Ids }),
        z.looseObject({ _tag: z.literal("new"), reason: Text }),
    ]),
});

const Journey = z.looseObject({
    id: Text,
    task: Text,
    actor: Text,
    name: Text,
    strategy: Text,
    idea: Text,
    tradeoff: Text,
    recommended: Text.optional(),
    steps: z.array(Step),
    drops: z.array(z.looseObject({ actions: Ids, rules: Ids, reason: Text })),
});

const Architecture = z.looseObject({
    name: Text,
    idea: Text,
    tradeoff: Text,
    recommended: Text.optional(),
    risks: z.array(Text),
    integrations: z.array(z.looseObject({ need: Text, domain: Text, how: Text })),
    views: z.array(AuthoredView),
    domains: z.array(
        z.looseObject({
            name: Text,
            concept: Text,
            rules: Ids,
            dependsOn: Ids,
            facts: z.array(z.looseObject({ name: Text })),
        }),
    ),
    containers: z.array(
        z.looseObject({
            name: Text,
            kind: Text,
            tech: Text,
            holds: Ids,
        }),
    ),
    components: z
        .array(
            z.looseObject({
                name: Text,
                domain: Text,
                responsibility: Text,
                uses: Ids,
                serves: Ids,
                enforces: Ids,
                adapts: Text.optional(),
                platform: Text.optional(),
                kind: Text.optional(),
            }),
        )
        .optional(),
});

const Choice = z.looseObject({
    decision: Text,
    picks: z.array(z.looseObject({ of: Text, variant: Text, id: Text.optional() })),
    reason: Text,
    subject: Text.optional(),
});

const Tasks = z.looseObject({
    tasks: z.array(
        z.looseObject({
            id: Text,
            title: Text.optional(),
            capability: Text.optional(),
            outcome: Text,
            actor: Text,
            actions: Ids,
            rules: Ids,
            current: z.array(z.looseObject({ intent: Text, system: Text, from: Ids, confidence: Text })),
        }),
    ),
});

const Variants = z.array(
    z.looseObject({ id: Text, task: Text, name: Text, strategy: Text, idea: Text, tradeoff: Text }),
);
const ArchitectureVariants = z.array(
    z.looseObject({
        name: Text,
        idea: Text,
        tradeoff: Text,
        score: z
            .looseObject({ steps: z.number(), stepsServed: z.number(), rules: z.number(), rulesAssigned: z.number() })
            .optional(),
        risks: z.array(Text).optional(),
        views: z.array(AuthoredView).optional(),
    }),
);
const TargetManifest = z.looseObject({ contractVersion: z.number(), files: z.record(Text, Text) });

/**
 * What a target holds, in the order it is made: today's tasks only, with the journeys proposed and not confirmed; the
 * journeys confirmed, with the architecture proposed and not confirmed; the architecture confirmed with its components.
 */
export type TargetState = "journeys-proposed" | "architecture-proposed" | "architecture-confirmed";

export type TargetJourney = z.output<typeof Journey>;
export type TargetStep = z.output<typeof Step>;
export type TargetArchitecture = z.output<typeof Architecture>;
export type TargetTask = z.output<typeof Tasks>["tasks"][number];

export type GateRecord = {
    readonly gate: Gate;
    /** The name of each item the decision is about, now and as confirmed, by its key; for what changed since. */
    readonly names?: ReadonlyMap<string, string>;
    /** confirmed: a decision is recorded; changed: the file it was made about differs from the hash it kept. */
    readonly state: "not made" | "confirmed" | "changed" | "confirmed, no hash kept";
    readonly since: Since | undefined;
};

export type Target = {
    readonly root: string;
    readonly contractVersion: number | undefined;
    readonly fingerprint: string;
    readonly tasks: readonly TargetTask[];
    readonly journeys: readonly TargetJourney[];
    readonly variants: z.output<typeof Variants>;
    readonly picks: z.output<typeof Choice>["picks"];
    /** Where the target stands: the case states the app renders what exists of. */
    readonly state: TargetState;
    /** The architecture the target stands on: the confirmed one, or, until one is confirmed, the recommended variant as a proposal. */
    readonly architecture: TargetArchitecture | undefined;
    /** Whether `architecture` is confirmed with its components, or only proposed. */
    readonly architectureConfirmed: boolean;
    readonly alternatives: z.output<typeof ArchitectureVariants>;
    readonly gates: readonly GateRecord[];
    readonly disputes: readonly { stage: string; variant: string; says: string }[];
};

/** The name of each item of a decision, from the confirmed copy first and the file now after it. */
const namesOf = (layout: ReturnType<typeof layoutOf>, gate: Gate): Map<string, string> => {
    const names = new Map<string, string>();
    for (const path of [snapshotOf(layout, gate), proposalOf(layout, gate)]) {
        if (!existsSync(path)) continue;
        let value: unknown;
        try {
            value = JSON.parse(readText(path)) as unknown;
        } catch {
            continue;
        }
        for (const item of itemsOf(gate, value)) {
            const record = item.value as Record<string, unknown> | null;
            const name = record?.title ?? record?.name;
            if (typeof name === "string" && name.trim() !== "") names.set(item.key, name);
        }
    }
    return names;
};

/**
 * Read the target of a modernization.
 * @param root the run's output root, which holds `target/`
 * @returns the target
 */
export const readTarget = (root: string): Target => {
    const layout = layoutOf(root);
    if (!existsSync(layout.target)) throw new ComposeError("input", `${root} holds no target/ folder`);
    let contractVersion: number | undefined;
    const digests: string[] = [];
    if (existsSync(layout.manifest)) {
        const manifest = readJson(layout.manifest, TargetManifest);
        if (!(knownTargetVersions as readonly number[]).includes(manifest.contractVersion)) {
            throw new ComposeError(
                "version",
                `${layout.target} follows target contract version ${manifest.contractVersion}; compose reads version ${knownTargetVersions.join(", ")}`,
            );
        }
        for (const [name, digest] of Object.entries(manifest.files)) {
            if (!existsSync(join(layout.target, name)) || subjectOf(join(layout.target, name)) !== digest) {
                throw new ComposeError("version", `target/${name} differs from target/manifest.json`);
            }
        }
        contractVersion = manifest.contractVersion;
    }
    const need = (path: string) => {
        if (!existsSync(path)) throw new ComposeError("missing", `missing fact: ${path} (the target is not finished)`);
        digests.push(`${path.slice(root.length)} ${sha256(readText(path))}`);
        return path;
    };
    const tasks = readJson(need(layout.current), Tasks).tasks;
    // Until the journeys are confirmed there are none to read; the variants file holds what is proposed.
    const journeysChosen = existsSync(layout.journeys) && existsSync(layout.choiceJourneys);
    const journeys = journeysChosen ? readJson(need(layout.journeys), z.array(Journey)) : [];
    const choice = journeysChosen ? readJson(need(layout.choiceJourneys), Choice) : undefined;
    // The architecture is the confirmed one while its decision holds; otherwise the recommended variant, as a proposal.
    const architectureHolds = existsSync(layout.architecture) && gateState(layout, "architecture") === "confirmed";
    const proposedVariants = existsSync(layout.architectureVariants)
        ? readJson(layout.architectureVariants, z.array(Architecture))
        : [];
    const proposal = journeysChosen ? (proposedVariants.find((each) => each.recommended !== undefined) ?? proposedVariants[0]) : undefined;
    if (proposal !== undefined && !architectureHolds) need(layout.architectureVariants);
    const architecture = architectureHolds
        ? readJson(need(layout.architecture), Architecture)
        : proposal === undefined
          ? undefined
          : { ...proposal, components: [] };
    const state: TargetState = !journeysChosen
        ? "journeys-proposed"
        : architectureHolds
          ? "architecture-confirmed"
          : "architecture-proposed";
    const variants = existsSync(layout.journeyVariants) ? readJson(layout.journeyVariants, Variants) : [];
    const alternatives = existsSync(layout.architectureVariants)
        ? readJson(layout.architectureVariants, ArchitectureVariants)
        : [];
    const recordFile = (gate: Gate) => join(layout.target, `choice-${gate}.json`);
    const gateRecords: GateRecord[] = gates.map((gate) => {
        const file = recordFile(gate);
        if (!existsSync(file)) return { gate, state: "not made", since: undefined };
        const record = readJson(file, Choice);
        const about = {
            "as-is": layout.current,
            journeys: layout.journeyVariants,
            architecture: layout.architectureVariants,
            components: layout.architecture,
        }[gate];
        const state =
            record.subject === undefined
                ? "confirmed, no hash kept"
                : existsSync(about) && subjectOf(about) === record.subject
                  ? "confirmed"
                  : "changed";
        return { gate, state, since: changedSince(layout, gate), names: namesOf(layout, gate) };
    });
    // Every decision's stage keeps its surviving challenges in `disputes-<stage>.json`; the as-is decision's file is
    // read by the same reader although shape-target's stage type does not name it.
    const disputes = gates.flatMap((stage) =>
        loadDisputes(layout, stage as Parameters<typeof loadDisputes>[1]).map((each) => ({
            stage,
            variant: each.variant,
            says: each.says,
        })),
    );
    return {
        root,
        contractVersion,
        fingerprint: sha256(digests.sort().join("\n")),
        tasks,
        journeys,
        variants,
        picks: choice?.picks ?? [],
        state,
        architecture,
        architectureConfirmed: architectureHolds,
        alternatives,
        gates: gateRecords,
        disputes,
    };
};
