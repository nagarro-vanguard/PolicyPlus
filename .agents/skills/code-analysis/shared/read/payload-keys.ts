import { addToCount, compareText } from "../run/collections";
import { sha1Hex } from "../run/hashing-and-random";

type Keyed = {
    readonly id: string;
    readonly file: string;
    readonly name: string | null;
    readonly container: string | null;
    readonly firstLine: number;
};

/**
 * Each entry point's key, which stays the same when a stage is run again from nothing: its file and its name as the
 * code writes it (its class and routine), or its first line when the code gives it none; two entry points of one key
 * in one file add their first line.
 * @param entries every entry point
 * @returns each entry point's key, by record id
 */
export const entryKeysOf = (entries: readonly Keyed[]) => {
    const baseOf = (entry: (typeof entries)[number]) => {
        const named = [entry.container, entry.name].filter((part) => part !== null && part !== "").join(".");
        return `${entry.file}#${named === "" ? `line-${entry.firstLine}` : named}`;
    };
    const times = new Map<string, number>();
    entries.forEach((entry) => addToCount(times, baseOf(entry), 1));
    const keys = new Map<string, string>();
    const used = new Map<string, number>();
    for (const entry of entries.toSorted(
        (one, other) => one.firstLine - other.firstLine || compareText(one.id, other.id),
    )) {
        const base = baseOf(entry);
        const plain = times.get(base) === 1 ? base : `${base}@${entry.firstLine}`;
        addToCount(used, plain, 1);
        const count = used.get(plain);
        keys.set(entry.id, count === undefined || count === 1 ? plain : `${plain}~${count}`);
    }
    return keys;
};

/**
 * A rule's key, which stays the same when a stage is run again from nothing and the rule says the same: where it is
 * decided and a short digest of its words.
 * @param rule the rule's file, first line and words
 * @param rule.file the file it is decided in
 * @param rule.firstLine its first line
 * @param rule.says its words
 * @returns the key
 */
export const ruleKeyOf = (rule: { readonly file: string; readonly firstLine: number; readonly says: string }) =>
    `${rule.file}:${rule.firstLine}#${sha1Hex(rule.says).slice(0, 8)}`;
