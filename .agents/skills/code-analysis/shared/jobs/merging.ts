import { getOrCreate } from "../run/collections";

/**
 * The merges the merge's jobs wrote (P1.38), each to the entry standing for it: every record id named in an entry's
 * `mergedFrom`, to that entry's record id.
 * @param entries every entry the merge's jobs keep, with what each merges
 * @returns each merge, from the merged record id to the entry merging it, in the order written
 */
export const mergesOf = (
    entries: ReadonlyArray<{ readonly id: string; readonly mergedFrom?: readonly string[] | undefined }>,
): ReadonlyArray<readonly [string, string]> =>
    entries.flatMap((entry) =>
        (entry.mergedFrom === undefined ? [] : entry.mergedFrom).map((merged) => [merged, entry.id] as const),
    );

/**
 * The merges of every merge job joined into one map, each merged entry to the entry finally standing for it (D215):
 * entries joined by any merge are one thing. The entry standing for them is the one that merges into nothing, as the
 * merge chose (A into B, B into C: A and B into C); where several merge into nothing (A into both B and C) the one
 * `prefer` ranks first; where every one merges into another, a ring (A into B, B into A), the one `prefer` ranks first,
 * and the ring is returned for the stage to disclose. Near-linear (a union of sets), so it grows with the merges.
 * @param merges each merge, from the merged record id to the entry merging it
 * @param prefer the order entries stand in: a seeded entry before a written one, then the earlier written
 * @returns each merged record id to the entry standing for it (the entries left standing are in no key), and each ring
 * broken, by its record ids
 */
export function resolveMerges(
    merges: ReadonlyArray<readonly [string, string]>,
    prefer: (left: string, right: string) => number,
) {
    const parent = new Map<string, string>();
    const rootOf = (id: string): string => {
        let at = id;
        for (let next = parent.get(at); next !== undefined && next !== at; next = parent.get(at)) {
            at = next;
        }
        parent.set(id, at);
        return at;
    };
    const merging = new Set<string>();
    for (const [from, to] of merges) {
        merging.add(from);
        const [fromRoot, toRoot] = [rootOf(from), rootOf(to)];
        if (fromRoot !== toRoot) {
            parent.set(toRoot, fromRoot);
        }
    }
    const members = new Map<string, string[]>();
    for (const id of new Set(merges.flatMap(([from, to]) => [from, to]))) {
        getOrCreate(members, rootOf(id)).push(id);
    }
    const first = (ids: readonly string[]) => [...ids].sort(prefer)[0];
    const resolved = new Map<string, string>();
    const rings: string[][] = [];
    for (const group of members.values()) {
        const terminal = group.filter((id) => !merging.has(id));
        const standing = first(terminal.length ? terminal : group);
        if (terminal.length === 0) {
            rings.push([...group].sort());
        }
        group.filter((id) => id !== standing).forEach((id) => resolved.set(id, String(standing)));
    }
    return { resolved, rings };
}
