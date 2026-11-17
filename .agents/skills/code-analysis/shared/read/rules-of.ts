import { fiveAndCount } from "../model/list-words";
import { Effect, Stream } from "effect";
import { known } from "../run/collections";
import { canonicalFor } from "../jobs/capability-choice";
import { Capability } from "../model/schemas/capability";
import { analysisPaths } from "../run/analysis-layout";
import { titleOf } from "../model/code-names";
import type { LifeShown, Reading, RuleShown, TransitionShown } from "./rules-shown";
import { FileAccess } from "../source/file-access";
import { readDocumentStrictly } from "../run/json-files";
import { holds } from "../model/line-ranges";
import { BusinessRule } from "../model/schemas/business-rule";
import {
    CapabilityRulesJob,
    CapabilityRulesJobList,
    CapabilityRulesScope,
} from "../model/schemas/capability-rules-jobs";
import { isRefused } from "../jobs/job-outcome";
import { Lifecycle, Transition } from "../model/schemas/lifecycle";
import { Block } from "../model/schemas/map";
import type { Lines } from "../model/shared-fields";
import { CodeGraph } from "../graph/code-graph";
import { RecordReads } from "./record-reads";
import { readRecordsById } from "./records-by-id";
import { StageRecords } from "../store/stage-records";

const stage = ["capability-rules"] as const;

type Rule = typeof BusinessRule.Type;

/**
 * Everything Capability rules accepted: the lives, their transitions and the rules. Whole-set reads, named so,
 * bounded by the capabilities the person chose to study, never by the code (P1.25).
 * @returns the lives, the transitions and the rules
 */
export const readStageRules = Effect.fnUntraced(function* () {
    const reads = yield* RecordReads;
    return {
        lives: yield* Stream.runCollect(reads.recordsOfType("Lifecycle", Lifecycle, stage)),
        transitions: yield* Stream.runCollect(reads.recordsOfType("Transition", Transition, stage)),
        rules: yield* Stream.runCollect(reads.recordsOfType("BusinessRule", BusinessRule, stage)),
    };
});

export type StageRules = Effect.Success<ReturnType<typeof readStageRules>>;

/**
 * The capabilities whose rules are studied (D123): those the person chose, once Capability rules has written its
 * accepted records, each as the capability standing for it now (`canonicalFor`, D222), so a capability that merged a
 * chosen one shows its rules; none before, which is that state, so a page says "not studied" rather than show part of
 * a study.
 * @param root the analysis root
 * @returns the studied capabilities' record ids
 */
export const readStudiedCapabilities = Effect.fnUntraced(function* (root: string) {
    const path = analysisPaths(root).capabilityRules.scope;
    if (!(yield* (yield* StageRecords).stageHasAcceptedRecords("capability-rules"))) {
        return new Set<string>();
    }
    if (!(yield* (yield* FileAccess).exists(path))) {
        return new Set<string>();
    }
    const capabilities = yield* Stream.runCollect((yield* RecordReads).recordsOfType("Capability", Capability));
    return new Set<string>(
        (yield* readDocumentStrictly(path, CapabilityRulesScope)).capabilities.flatMap((chosen) => {
            const standing = canonicalFor(capabilities, chosen.id);
            return standing === undefined ? [] : [standing.id];
        }),
    );
});

/**
 * What Capability rules left unread because a job was refused, its checks still failing after its fix (P1.33): the
 * entities whose life was refused and how many rules jobs were, so a page says its rules are incomplete rather than
 * show a capability as studied with nothing found (P1.9). A job's report is read only while it keeps feedback, as a
 * refused job does.
 * @param root the analysis root
 * @returns the entities with a refused life, and the lines of every block a refused rules job held
 */
export const readRefusedWork = Effect.fnUntraced(function* (root: string) {
    const fs = yield* FileAccess;
    const paths = analysisPaths(root).capabilityRules;
    const lives = new Set<string>();
    const rules: Lines[] = [];
    if (!(yield* fs.exists(paths.jobs))) {
        return { lives, rules };
    }
    for (const { jobId } of yield* readDocumentStrictly(paths.jobs, CapabilityRulesJobList)) {
        if (!(yield* isRefused("capability-rules", jobId))) {
            continue;
        }
        const job = yield* readDocumentStrictly(paths.jobFile(jobId), CapabilityRulesJob);
        if (job.kind === "lifecycle") {
            lives.add(job.entity.id);
        } else {
            rules.push(...job.blocks.map((block) => block.lines));
        }
    }
    return { lives, rules };
});

/**
 * The rules decided inside some blocks (P10, the rules in a block): a rule belongs to the block holding its deciding
 * lines.
 * @param rules the rules
 * @param blocks the blocks
 * @param blocks.lines each block's lines
 * @returns the rules decided in them, in the order given
 */
export const rulesDecidedIn = (rules: readonly Rule[], blocks: ReadonlyArray<{ readonly lines: Lines }>) =>
    rules.filter((rule) => blocks.some((block) => holds(block.lines, rule.decidedAt)));

/**
 * Each item with the titles of the entry points whose chains reach the blocks holding its lines (P10: the entry points applying a
 * rule, or making a transition), all in one read however many items there are, by `titleOf`.
 * @param items the rules or transitions
 * @param linesOf the lines an item is decided or written at
 * @returns each item with the titles, in the order the entry points were accepted
 */
const withTitlesReaching = Effect.fnUntraced(function* <A>(items: readonly A[], linesOf: (item: A) => Lines) {
    if (!items.length) {
        return [];
    }
    const reached = yield* (yield* CodeGraph).findEntryPointsReachingEach(items.map(linesOf));
    const blocks = yield* readRecordsById("Block", [...new Set(reached.map((each) => each.id))], Block);
    const titlesOf = Map.groupBy(reached, (each) => each.wanted);
    return items.map((item, position) => {
        const reaching = titlesOf.get(position);
        const held = "the store gave only entry points whose blocks it holds";
        return {
            item,
            titles: reaching === undefined ? [] : reaching.map((each) => titleOf(known(blocks, each.id, held))),
            entryPoints: reaching === undefined ? [] : reaching.map((each) => each.id),
        };
    });
});

/**
 * Where a second reading left one rule or change of state (P1.36): its label, or unread where no review read it.
 * @param readings the labels, by record id
 * @param id the record id
 * @returns the reading
 */
const readingOf = (
    readings: ReadonlyMap<string, { readonly label: Exclude<Reading, "unread"> }>,
    id: string,
): Reading => {
    const found = readings.get(id);
    return found === undefined ? "unread" : found.label;
};

/**
 * Rules as a page shows them (D128, D223): what each says, where it is decided, the entry points that apply it, derived from
 * where it is decided (P10), never stored, and where its second reading left it. One read for all of them.
 * @param rules the rules
 * @param readings where a second reading left each rule read, by record id
 * @returns the rules shown, in the order given
 */
export const showRules = Effect.fnUntraced(function* (
    rules: readonly Rule[],
    readings: ReadonlyMap<string, { readonly label: Exclude<Reading, "unread"> }>,
) {
    return (yield* withTitlesReaching(rules, (rule) => rule.decidedAt)).map(({ item, titles }): RuleShown => ({
        id: item.id,
        reading: readingOf(readings, item.id),
        says: item.says,
        decidedAt: item.decidedAt,
        appliedBy: fiveAndCount(titles).named,
        moreAppliedBy: fiveAndCount(titles).more,
    }));
});

/**
 * One entity's life as a page shows it (D125, D128): its states, or why it has none, and every change of state with
 * the entry points that make it (P10) and what each rule gating it says.
 * @param life the life
 * @param entityName the entity's name
 * @param accepted everything Capability rules accepted
 * @param read where a second reading left each change, and which entry points were studied
 * @param read.readings where a second reading left each change of state read, by record id
 * @param read.studiedEntryPoints the entry points of the capabilities studied, whose rules were read: a change only other code makes
 *  has its gating rules unread, never "none" (D224)
 * @returns the life shown
 */
export const showLife = Effect.fnUntraced(function* (
    life: typeof Lifecycle.Type,
    entityName: string,
    accepted: StageRules,
    read: {
        readonly readings: ReadonlyMap<string, { readonly label: Exclude<Reading, "unread"> }>;
        readonly studiedEntryPoints: ReadonlySet<string>;
    },
) {
    const { readings, studiedEntryPoints } = read;
    const own = accepted.transitions.filter((each) => each.lifecycle === life.id);
    const nameOf = (number: number) => {
        const state = life.states === undefined ? undefined : life.states[number - 1];
        return state === undefined ? `state ${number}` : state.name;
    };
    const transitions = (yield* withTitlesReaching(own, (transition) => transition.writtenAt)).map(
        ({ item, titles, entryPoints }): TransitionShown => ({
            id: item.id,
            studied: entryPoints.some((entryPoint) => studiedEntryPoints.has(entryPoint)),
            reading: readingOf(readings, item.id),
            from: item.fromStates === "created" ? item.fromStates : item.fromStates.map(nameOf),
            to: nameOf(item.to),
            writtenAt: item.writtenAt,
            madeBy: fiveAndCount(titles).named,
            moreMadeBy: fiveAndCount(titles).more,
            gatedBy: accepted.rules.filter((rule) => rule.gates === item.id).map((rule) => rule.says),
        }),
    );
    if (life.noStates !== undefined) {
        const none: LifeShown = { entity: entityName, life: { _tag: "none", why: life.noStates }, transitions };
        return none;
    }
    if (life.states === undefined || life.stateFields === undefined) {
        return yield* Effect.die(`${life.id} has neither states nor why it has none, which its schema refuses`);
    }
    const shown: LifeShown = {
        entity: entityName,
        life: { _tag: "states", fields: life.stateFields, states: life.states },
        transitions,
    };
    return shown;
});
