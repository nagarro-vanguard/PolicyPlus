import { Effect, Stream } from "effect";
import { known } from "../run/collections";
import { EntryPointAssignment } from "../model/schemas/assignment";
import { Capability } from "../model/schemas/capability";
import type { Block } from "../model/schemas/map";
import { DocumentInvalid } from "../run/script-errors";
import { readCodeKinds } from "../read/code-kinds";
import { CodeGraph } from "./code-graph";
import { RecordStore } from "../store/database";
import { RecordReads } from "../read/record-reads";

type BlockRecord = typeof Block.Type;

export type EntryPointFacts = {
    readonly block: BlockRecord;
    readonly entryPoint: NonNullable<BlockRecord["entryPoint"]>;
};

/**
 * Every entry point, in the order written. Bounded by the entry points, never by the code.
 * @returns the entry points and the code kinds; DocumentInvalid naming the store and the first entry point refused
 */
export const readEntryPoints = Effect.fnUntraced(function* () {
    const blocks = yield* readCodeKinds();
    const path = (yield* RecordStore).path;
    const entryPoints: EntryPointFacts[] = [];
    yield* Stream.runForEach((yield* CodeGraph).entryPointBlocks, (block) =>
        Effect.suspend(() => {
            const { entryPoint } = block;
            if (entryPoint === undefined) {
                return Effect.fail(
                    new DocumentInvalid({
                        path,
                        issue: `${block.id} is stored as an entry point but says nothing of how it is reached: run the Map's finish again`,
                    }),
                );
            }
            entryPoints.push({ block, entryPoint });
            return Effect.void;
        }),
    );
    return { entryPoints, blocks };
});

type CapabilityRecord = Capability;

/**
 * Each capability with the entry points it holds, and the entry points none holds yet: membership is the entry-point assignments
 * (D30), each entry point assigned once by its identity, so what none holds is every entry point no assignment gives a
 * capability (its job not run yet, refused, or no entry fitting it). An assignment of what is no entry point is an issue,
 * never guessed.
 * @param capabilities the capabilities, in the order accepted
 * @param assignments the entry-point assignments
 * @param entryPoints every entry point, by its block's record id, in the order written
 * @returns each capability with its entry points (in the entry points's order), the capability holding each entry point, the entry points
 * none holds, and every assignment refused
 */
function holdingsOf<W extends { readonly block: { readonly id: string } }>(
    capabilities: readonly CapabilityRecord[],
    assignments: ReadonlyArray<typeof EntryPointAssignment.Type>,
    entryPoints: ReadonlyMap<string, W>,
) {
    const byId = new Map(capabilities.map((capability) => [capability.id, capability]));
    const holder = new Map<string, CapabilityRecord>();
    const issues: string[] = [];
    for (const assignment of assignments) {
        if (assignment.capability === undefined) {
            continue;
        }
        if (!entryPoints.has(assignment.entryPoint)) {
            issues.push(`${assignment.id} assigns ${assignment.entryPoint}, which is no entry point`);
            continue;
        }
        holder.set(
            assignment.entryPoint,
            known(byId, assignment.capability, "the store's foreign keys hold every capability"),
        );
    }
    const own = new Map<CapabilityRecord, Array<W & { readonly capability: CapabilityRecord }>>(
        capabilities.map((capability) => [capability, []]),
    );
    const unheld: W[] = [];
    for (const entryPoint of entryPoints.values()) {
        const capability = holder.get(entryPoint.block.id);
        if (capability === undefined) {
            unheld.push(entryPoint);
        } else {
            known(own, capability, "every capability has its list").push({ ...entryPoint, capability });
        }
    }
    return { held: [...own], holder, unheld, issues };
}

/**
 * Which capability holds each entry point, read from the accepted records: the capabilities, the entry-point assignments and
 * every entry point, joined by `holdingsOf`. One read for every reader of holdings. Bounded by the capabilities and entry points,
 * never by the code.
 * @returns the capabilities, each with its entry points, the holder of each entry point, the entry points none holds, and the
 *  blocks; DocumentInvalid naming the store when an assignment gives a capability what is no entry point
 */
export const readHoldings = Effect.fnUntraced(function* () {
    const reads = yield* RecordReads;
    const capabilities = yield* Stream.runCollect(reads.recordsOfType("Capability", Capability));
    const assignments = yield* Stream.runCollect(reads.recordsOfType("EntryPointAssignment", EntryPointAssignment));
    const { entryPoints, blocks } = yield* readEntryPoints();
    const held = holdingsOf(
        capabilities,
        assignments,
        new Map(entryPoints.map((entryPoint) => [entryPoint.block.id, entryPoint])),
    );
    if (held.issues.length) {
        return yield* new DocumentInvalid({ path: (yield* RecordStore).path, issue: held.issues.join("; ") });
    }
    return { capabilities, held: held.held, holder: held.holder, unheld: held.unheld, blocks };
});
