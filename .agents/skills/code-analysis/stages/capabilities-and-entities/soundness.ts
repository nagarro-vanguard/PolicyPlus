import { Effect } from "effect";
import { readCapabilityView } from "../../shared/run/capability-view";
import { getOrCreate } from "../../shared/run/collections";

/**
 * The spread of some counts, in words: the least, the median and the most.
 * @param counts the counts
 * @returns the words, or none for no count
 */
const spreadOf = (counts: readonly number[]) => {
    const sorted = [...counts].sort((left, right) => left - right);
    const median = sorted[Math.floor(sorted.length / 2)];
    const [least] = sorted;
    const most = sorted.at(-1);
    return least === undefined || median === undefined || most === undefined
        ? "none"
        : `${least} to ${most}, median ${median}`;
};

/**
 * What the registries leave as signs of their grain, for the operator in `show` (D229): counted with no meaning, each
 * from the capability view every page reads, never a gate, since whether a grain is right is meaning (D208). Entry points
 * no capability holds, saved resources no kind of data keeps and entries not compared are also on the system page.
 * @param root the analysis root
 * @returns one line per count; none before the stage is accepted
 */
export const soundnessLines = Effect.fnUntraced(function* (root: string) {
    const view = yield* readCapabilityView(root);
    if (view === undefined) {
        return [];
    }
    const perPart = new Map<string, string[]>();
    for (const shown of view.capabilities) {
        for (const entryPoint of shown.entryPoints) {
            const part = entryPoint.part === undefined ? "no part" : entryPoint.part.name;
            getOrCreate(perPart, part).push(shown.capability.id);
        }
    }
    const savedBy = new Set(
        view.capabilities.flatMap((shown) =>
            shown.entities.filter((use) => use.kinds.includes("saves")).map((use) => use.entity.id),
        ),
    );
    return [
        "the grain, counted with no meaning (read it before the audit):",
        `  entry points held by no capability: ${view.unheld.length}`,
        `  capabilities holding no entry point: ${view.capabilities.filter((shown) => !shown.entryPoints.length).length}`,
        `  capabilities touching no data: ${view.capabilities.filter((shown) => !shown.entities.length).length}`,
        `  kinds of data no capability saves: ${view.entities.filter((shown) => !savedBy.has(shown.entity.id)).length}`,
        `  saved resources no kind of data keeps: ${view.unplaced.unkeptSaved.length}`,
        `  written entries not compared: ${view.unplaced.notCompared}`,
        `  entry points per capability: ${spreadOf(view.capabilities.map((shown) => shown.entryPoints.length))}`,
        `  capabilities per part: ${spreadOf([...perPart.values()].map((held) => new Set(held).size))}`,
    ];
});
