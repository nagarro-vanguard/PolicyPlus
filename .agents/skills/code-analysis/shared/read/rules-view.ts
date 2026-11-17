import { Effect } from "effect";
import { getOrCreate } from "../run/collections";
import { CodeGraph } from "../graph/code-graph";
import { readRecordsById } from "./records-by-id";
import type { LifeShown, RuleShown } from "./rules-shown";
import {
    readStageRules,
    readStudiedCapabilities,
    readRefusedWork,
    rulesDecidedIn,
    showLife,
    showRules,
} from "./rules-of";
import { readSecondReadings } from "../jobs/second-readings";
import type { Entity } from "../model/schemas/entity";
import { Block } from "../model/schemas/map";
import type { Lines } from "../model/shared-fields";

/**
 * The capabilities whose rules read incomplete (D224): those whose entry points run a block a refused rules job held, and
 * those saving a kind of data whose life was refused, since the rules gating its changes could not be attached. Per
 * capability, never by a count across the stage.
 * @param refused what was refused: the lives' entities and the refused rules jobs' blocks' lines
 * @param refused.lives the entities whose life was refused
 * @param refused.rules the lines of every block a refused rules job held
 * @param entryPointsOf each capability's entry points, by its record id
 * @param saversOf the capabilities saving each kind of data, by its record id
 * @returns the incomplete capabilities' record ids
 */
const incompleteOf = Effect.fnUntraced(function* (
    refused: { readonly lives: ReadonlySet<string>; readonly rules: readonly Lines[] },
    entryPointsOf: ReadonlyMap<string, readonly string[]>,
    saversOf: ReadonlyMap<string, readonly string[]>,
) {
    const holder = new Map<string, string>();
    entryPointsOf.forEach((entryPoints, capability) =>
        entryPoints.forEach((entryPoint) => holder.set(entryPoint, capability)),
    );
    const incomplete = new Set<string>();
    if (refused.rules.length) {
        for (const reached of yield* (yield* CodeGraph).findEntryPointsReachingEach(refused.rules)) {
            const capability = holder.get(reached.id);
            if (capability !== undefined) {
                incomplete.add(capability);
            }
        }
    }
    for (const entity of refused.lives) {
        const savers = saversOf.get(entity);
        (savers === undefined ? [] : savers).forEach((capability) => incomplete.add(capability));
    }
    return incomplete;
});

/**
 * What Capability rules found, as the capability and kind-of-data pages show it (5.6, D123): each studied
 * capability's rules, those decided in the code its entry points run (read through the reach of every entry point, D214); each
 * kind of data's life; where a second reading left each rule and change of state (D223); and which capabilities read
 * incomplete. None before Capability rules has accepted records, which is that state.
 * @param root the analysis root
 * @param entryPointsOf each capability's entry points, by its record id
 * @param entities every kind of data
 * @param saversOf the capabilities saving each kind of data, by its record id
 * @returns the rules by capability, the rules decided in code no studied capability's entry point reaches, the lives by
 * entity, the studied capabilities and what was refused; or undefined
 */
export const readRulesView = Effect.fnUntraced(function* (
    root: string,
    entryPointsOf: ReadonlyMap<string, readonly string[]>,
    entities: readonly Entity[],
    saversOf: ReadonlyMap<string, readonly string[]>,
) {
    const studied = yield* readStudiedCapabilities(root);
    if (!studied.size) {
        return undefined;
    }
    const accepted = yield* readStageRules();
    const readings = new Map([
        ...(yield* readSecondReadings(root, "BusinessRule")),
        ...(yield* readSecondReadings(root, "Transition")),
    ]);
    const graph = yield* CodeGraph;
    const rulesOf = new Map<string, readonly RuleShown[]>();
    for (const capability of studied) {
        const own = entryPointsOf.get(capability);
        const blockIds = yield* graph.findBlocksReachedBy(own === undefined ? [] : own);
        const blocks = yield* readRecordsById("Block", blockIds, Block);
        rulesOf.set(capability, yield* showRules(rulesDecidedIn(accepted.rules, [...blocks.values()]), readings));
    }
    const attributed = new Set([...rulesOf.values()].flatMap((shown) => shown.map((rule) => rule.id)));
    const unattributed = yield* showRules(
        accepted.rules.filter((rule) => !attributed.has(rule.id)),
        readings,
    );
    const studiedEntryPoints = new Set(
        [...studied].flatMap((capability) => {
            const own = entryPointsOf.get(capability);
            return own === undefined ? [] : own;
        }),
    );
    const livesOf = new Map<string, LifeShown>();
    for (const life of accepted.lives) {
        const entity = entities.find((each) => each.id === life.entity);
        if (entity !== undefined) {
            livesOf.set(entity.id, yield* showLife(life, entity.name, accepted, { readings, studiedEntryPoints }));
        }
    }
    const refused = yield* readRefusedWork(root);
    return {
        studied,
        rulesOf,
        unattributed,
        livesOf,
        refused: { lives: refused.lives, capabilities: yield* incompleteOf(refused, entryPointsOf, saversOf) },
    };
});

/**
 * The capabilities saving each kind of data, from the kinds of data each capability's flows use.
 * @param uses each capability's kinds of data, with how it uses each
 * @returns the savers, by the kind of data's record id
 */
export const saversOf = (
    uses: ReadonlyArray<{
        readonly capability: { readonly id: string };
        readonly entities: ReadonlyArray<{
            readonly entity: { readonly id: string };
            readonly kinds: readonly string[];
        }>;
    }>,
) => {
    const savers = new Map<string, string[]>();
    for (const view of uses) {
        for (const use of view.entities) {
            if (use.kinds.includes("saves")) {
                getOrCreate(savers, use.entity.id).push(view.capability.id);
            }
        }
    }
    return savers;
};
