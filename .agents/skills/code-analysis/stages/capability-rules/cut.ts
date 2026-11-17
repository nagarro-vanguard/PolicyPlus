import { Effect, Schema, Stream } from "effect";
import { AnalysisConfig } from "../../shared/run/analysis-limits";
import { compareText, getOrCreate, known, unique } from "../../shared/run/collections";
import { titleOf } from "../../shared/model/code-names";
import { holds } from "../../shared/model/line-ranges";
import { readCodeKinds } from "../../shared/read/code-kinds";
import { CodeGraph } from "../../shared/graph/code-graph";
import { readFileHeads, readHolderHeads } from "../../shared/graph/holder-heads";
import { RecordReads } from "../../shared/read/record-reads";
import { readRecordsById } from "../../shared/read/records-by-id";
import { ExternalSystem } from "../../shared/model/schemas/external-system";
import { Block, Link } from "../../shared/model/schemas/map";
import { CapabilityRulesJob } from "../../shared/model/schemas/capability-rules-jobs";
import type { Job } from "./jobs";
import type { Studied } from "./scope";
import type { Lines } from "../../shared/model/shared-fields";
import { resourceIdOf } from "../../shared/model/resource-ids";

type BlockRecord = typeof Block.Type;

type Resource = { readonly externalSystem: string; readonly resource: string };

type Group = { readonly outer: BlockRecord; readonly inner: readonly Group[] };

const entryPointsNamed = 5;

/**
 * A job as the cut composes it, decoded by the job's schema: its facts come from accepted records, so a job the schema
 * refuses is a defect in the cut, never the person's.
 * @param units the job's kind and units, in their first state
 * @returns the job
 */
const asJob = (units: object): Job => Schema.decodeUnknownSync(CapabilityRulesJob)(units);

/**
 * The code the chosen capabilities run (D121, D214): every block their entry points run, read through the reach of every way
 * in, each once, with the head of each block holding them (`readHolderHeads`) and of each file whose members they are
 * (`readFileHeads`, D241), and every resource that code saves, each once. No chain is walked: the reach is the Map's index.
 * @param studied the capabilities chosen, each with its entry points
 * @returns the blocks, and the resources saved
 */
export const readStudiedCode = Effect.fnUntraced(function* (studied: readonly Studied[]) {
    const graph = yield* CodeGraph;
    const entryPoints = studied.flatMap(([, own]) => own.map((entryPoint) => entryPoint.block.id));
    const reached = yield* graph.findBlocksReachedBy(entryPoints);
    const blocks = yield* readRecordsById("Block", reached, Block);
    const heads = yield* readHolderHeads(reached);
    const fileHeads = yield* readFileHeads(reached);
    const withHead = (block: BlockRecord) => {
        const headFirst = fileHeads.get(block.id);
        return headFirst === undefined ? block : { ...block, lines: { ...block.lines, firstLine: headFirst } };
    };
    const saved = new Map<string, Resource>();
    for (const use of yield* graph.findResourcesReachedFromEach(entryPoints)) {
        if (use.kind === "saves") {
            saved.set(resourceIdOf(use.externalSystem, use.resource), use);
        }
    }
    return { blocks: [...[...blocks.values()].map(withHead), ...heads], saved: [...saved.values()], entryPoints };
});

/**
 * Every block the Map holds, reached by an entry point or not: what `--all` reads, since reach decides what a capability
 * serves, not what the study reads.
 * @returns the blocks
 */
export const readEveryBlock = Effect.fnUntraced(function* () {
    return Array.from(yield* Stream.runCollect((yield* RecordReads).recordsOfType("Block", Block)));
});

/**
 * The lines a block spans, less one: enough to tell an inner block from the block that holds it.
 * @param block the block
 * @returns the span
 */
const sizeOf = (block: BlockRecord) => block.lines.lastLine - block.lines.firstLine;

/**
 * The blocks that hold the lines some transitions are written at and that the scope lacks: the innermost block holding
 * each, since a rule belongs to the block whose lines decide it. A life is written wherever the system saves the
 * entity, so a rule gating its transition may lie in code no chosen capability reaches.
 * @param scope the blocks the scope holds
 * @param every every block the Map holds
 * @param writtenAt the lines the accepted transitions are written at
 * @returns the blocks to add, each once
 */
export const blocksWritingTransitions = (
    scope: readonly BlockRecord[],
    every: readonly BlockRecord[],
    writtenAt: readonly Lines[],
) => {
    const held = new Set(scope.map((block) => block.id));
    const added = new Map<string, BlockRecord>();
    for (const lines of writtenAt) {
        const holding = every
            .filter((block) => block.lines.file === lines.file && holds(block.lines, lines))
            .sort((left, right) => sizeOf(left) - sizeOf(right));
        const [innermost] = holding;
        if (innermost !== undefined && !held.has(innermost.id)) {
            added.set(innermost.id, innermost);
        }
    }
    return [...added.values()];
};

/**
 * A file's blocks as nested groups (D121): each block not held by another, with the groups of the blocks it holds.
 * @param blocks one file's blocks, in reading order
 * @returns the top groups, in line order
 */
const nestedGroups = (blocks: readonly BlockRecord[]): Group[] => {
    const roots: Group[] = [];
    const stack: Array<{ readonly outer: BlockRecord; readonly inner: Group[] }> = [];
    for (const block of blocks) {
        for (let top = stack.at(-1); top !== undefined && !holds(top.outer.lines, block.lines); top = stack.at(-1)) {
            stack.pop();
        }
        const group: { readonly outer: BlockRecord; readonly inner: Group[] } = { outer: block, inner: [] };
        const parent = stack.at(-1);
        (parent === undefined ? roots : parent.inner).push(group);
        stack.push(group);
    }
    return roots;
};

/**
 * The lines a block reads itself: its span, less the spans of the blocks it holds directly.
 * @param group the block and the groups it holds
 * @returns the line count
 */
const ownLines = (group: Group) =>
    group.outer.lines.lastLine -
    group.outer.lines.firstLine +
    1 -
    group.inner.reduce((sum, each) => sum + each.outer.lines.lastLine - each.outer.lines.firstLine + 1, 0);

/**
 * The lines a whole group takes to read: its outer block's.
 * @param group the group
 * @returns the line count
 */
const spanOf = (group: Group) => group.outer.lines.lastLine - group.outer.lines.firstLine + 1;

/**
 * Every block of a group, the outer first, in reading order.
 * @param group the group
 * @returns the blocks
 */
const blocksOf = (group: Group): BlockRecord[] => [group.outer, ...group.inner.flatMap(blocksOf)];

type Placed = { readonly block: BlockRecord; readonly readInOtherJobs: readonly string[] };

/**
 * The units of the rules jobs over one file's groups (D224): groups packed whole to the budget; a group larger than it
 * split along its nested blocks: its outer block read in a job of its own, by its own lines, listing the blocks it
 * holds as read elsewhere, and each held group packed the same way, recursively. A block whose own lines exceed the
 * budget is a job alone, and counted, for the person. A rule is decided within one block, so splitting at a block's
 * edge never cuts one in two.
 * @param groups the file's top groups
 * @param budget the read budget, in lines
 * @returns the jobs' blocks, the lines they read, and how many blocks are larger than the budget alone
 */
const packGroups = (groups: readonly Group[], budget: number) => {
    const jobs: Placed[][] = [];
    let open: Placed[] = [];
    let openLines = 0;
    let lines = 0;
    let overBudget = 0;
    const close = () => {
        if (open.length) {
            jobs.push(open);
        }
        open = [];
        openLines = 0;
    };
    const place = (group: Group) => {
        const size = spanOf(group);
        if (size <= budget) {
            if (openLines + size > budget) {
                close();
            }
            open.push(...blocksOf(group).map((block) => ({ block, readInOtherJobs: [] })));
            openLines += size;
            lines += size;
            return;
        }
        const own = ownLines(group);
        close();
        overBudget += own > budget ? 1 : 0;
        open = [{ block: group.outer, readInOtherJobs: group.inner.map((each) => each.outer.id) }];
        lines += own;
        close();
        group.inner.forEach(place);
    };
    groups.forEach(place);
    close();
    return { jobs, lines, overBudget };
};

/**
 * Blocks in reading order: by first line, the outer block before the blocks it holds.
 * @param left one block
 * @param right another
 * @returns their order
 */
const byPlace = (left: BlockRecord, right: BlockRecord) =>
    left.lines.firstLine - right.lines.firstLine || right.lines.lastLine - left.lines.lastLine;

/**
 * Where each block's work leaves it, as a rules job tells it (D224): each link out, by kind, what it reaches (a piece
 * of code by its title, or a resource at an external system), and the fields it names.
 * @param ids the blocks' record ids
 * @returns the links out, by block
 */
const outgoingLinksOf = Effect.fnUntraced(function* (ids: readonly string[]) {
    const graph = yield* CodeGraph;
    const ends = yield* graph.findLinkEndsFrom(ids);
    const links = yield* readRecordsById("Link", unique(ends.map((end) => end.link)), Link);
    const targets = yield* readRecordsById(
        "Block",
        unique(ends.flatMap((end) => (end.toBlock === undefined ? [] : [end.toBlock]))),
        Block,
    );
    const systems = yield* readRecordsById(
        "ExternalSystem",
        unique(ends.flatMap((end) => (end.externalSystem === undefined ? [] : [end.externalSystem]))),
        ExternalSystem,
    );
    const linksFrom = new Map<string, object[]>();
    for (const end of ends) {
        const link = links.get(end.link);
        const target = end.toBlock === undefined ? undefined : targets.get(end.toBlock);
        const system = end.externalSystem === undefined ? undefined : systems.get(end.externalSystem);
        const to =
            target !== undefined
                ? titleOf(target)
                : system !== undefined && end.resource !== undefined
                  ? system.kind === "library"
                      ? `${end.resource} in ${system.name}, code with no source here: what it does there is not shown`
                      : `${end.resource} at ${system.name}`
                  : link === undefined || link.unresolvedTarget === undefined
                    ? "a target the code does not show"
                    : `a target chosen while the system runs: ${link.unresolvedTarget}`;
        if (end.fromBlock !== undefined && link !== undefined) {
            getOrCreate(linksFrom, end.fromBlock).push({
                kind: end.kind,
                to,
                ...(link.fieldsUsed === undefined ? {} : { fieldsUsed: link.fieldsUsed }),
            });
        }
    }
    return linksFrom;
});

/**
 * What a rules job tells of each of its blocks (D224): its code kind and layer, the chosen capabilities and the
 * entry points that run it, and where its work leaves it, each from fields the Map holds. Read for every block of the scope
 * in a few statements.
 * @param blocks the blocks
 * @param studied the capabilities chosen, each with its entry points
 * @returns what to tell of a block, by its record id
 */
const evidenceOf = Effect.fnUntraced(function* (blocks: readonly BlockRecord[], studied: readonly Studied[]) {
    const graph = yield* CodeGraph;
    const registry = yield* readCodeKinds();
    const ids = blocks.map((block) => block.id);
    const capabilityOf = new Map<string, string>();
    const titleOfEntryPoint = new Map<string, string>();
    for (const [capability, own] of studied) {
        own.forEach((entryPoint) => {
            capabilityOf.set(entryPoint.block.id, capability.name);
            titleOfEntryPoint.set(entryPoint.block.id, titleOf(entryPoint.block));
        });
    }
    const runBy = new Map<string, string[]>();
    for (const row of yield* graph.findEntryPointsRunningEach(ids)) {
        getOrCreate(runBy, row.block).push(row.entryPoint);
    }
    const named = [...runBy.values()].flatMap((each) => each.slice(0, entryPointsNamed));
    const unnamed = unique(named.filter((entryPoint) => !titleOfEntryPoint.has(entryPoint)));
    for (const entryPoint of (yield* readRecordsById("Block", unnamed, Block)).values()) {
        titleOfEntryPoint.set(entryPoint.id, titleOf(entryPoint));
    }
    const linksFrom = yield* outgoingLinksOf(ids);
    return (block: BlockRecord) => {
        const entryPoints = runBy.get(block.id);
        const running = entryPoints === undefined ? [] : entryPoints;
        const layer = registry.layerNameOf(block);
        const from = linksFrom.get(block.id);
        return {
            codeKindName: block.codeKind === undefined ? "none" : registry.entry(block.codeKind).name,
            ...(layer === undefined ? {} : { layerName: layer }),
            serves: {
                capabilities: unique(
                    running.flatMap((entryPoint) =>
                        [capabilityOf.get(entryPoint)].flatMap((name) => (name === undefined ? [] : [name])),
                    ),
                ),
                entryPoints: running
                    .slice(0, entryPointsNamed)
                    .map((entryPoint) => known(titleOfEntryPoint, entryPoint, "every entry point named is read")),
                moreEntryPoints: Math.max(0, running.length - entryPointsNamed),
            },
            outgoingLinks: from === undefined ? [] : from,
        };
    };
});

/**
 * The rules jobs' blocks (D121, D224): file by file, packed across files by the read budget as nested groups
 * (`packGroups`). Files are ordered by their name, then their folder (D241), so copies of one file kept in several
 * folders (a client's own version of a view) sit side by side in one job, whose agent sees them as copies. Pure, so
 * the packing is tested on its own.
 * @param blocks the blocks the chosen capabilities reach
 * @param budget the read budget, in lines
 * @returns each job's blocks, the lines they read, and how many blocks are larger than the budget alone
 */
function packRulesBlocks(blocks: readonly BlockRecord[], budget: number) {
    const byFile = new Map<string, BlockRecord[]>();
    for (const block of blocks) {
        getOrCreate(byFile, block.lines.file).push(block);
    }
    const nameOf = (file: string) => file.slice(file.lastIndexOf("/") + 1);
    const groups = [...byFile.keys()]
        .sort((left, right) => compareText(nameOf(left), nameOf(right)) || compareText(left, right))
        .flatMap((file) => nestedGroups([...known(byFile, file, "every file listed has its blocks")].sort(byPlace)));
    return packGroups(groups, budget);
}

/**
 * The rules jobs (D121, D224): the packed blocks (`packRulesBlocks`), each with what the Map holds of it
 * (`evidenceOf`).
 * @param blocks the blocks the chosen capabilities reach
 * @param studied the capabilities chosen, each with its entry points
 * @returns the jobs, in their first state, the lines they read, and how many blocks are larger than the budget alone
 */
export const cutRulesJobs = Effect.fnUntraced(function* (blocks: readonly BlockRecord[], studied: readonly Studied[]) {
    const { readBudget } = yield* AnalysisConfig;
    const packed = packRulesBlocks(blocks, readBudget);
    const evidence = yield* evidenceOf(blocks, studied);
    const jobs = packed.jobs.map((placed) =>
        asJob({
            kind: "rules",
            blocks: placed.map(({ block, readInOtherJobs }) => {
                const [first, ...rest] = readInOtherJobs;
                return {
                    block: block.id,
                    ...(block.writtenAs === undefined ? {} : { writtenAs: block.writtenAs }),
                    lines: block.lines,
                    ...evidence(block),
                    ...(first === undefined ? {} : { readInOtherJobs: [first, ...rest] }),
                };
            }),
        }),
    );
    return { jobs, lines: packed.lines, overBudget: packed.overBudget };
});
