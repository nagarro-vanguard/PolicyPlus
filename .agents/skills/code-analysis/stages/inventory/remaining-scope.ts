import { compareText } from "../../shared/run/collections";
import { byFolder } from "../../shared/source/scope-counts";
import type { ManifestFile } from "../../shared/model/schemas/file-listing";
import { manifestOf } from "./scope-rules";

/**
 * What is still in scope, by the folder each file sits in directly, largest first: the whole a decision about scope is
 * judged against, counted the same way for any stack and medium. A copy is counted once, as the Map reads it once:
 * only while its original is kept (`manifestOf`). Ties are put in path order, so the list is the same on every run.
 * @param inventory every listed file
 * @param isLeftOut whether a file is left out
 * @param count how many folders to give, the largest
 * @returns the lines and files still in scope, and the largest folders, each with its lines and files
 */
export function remainingByFolder(
    inventory: ReadonlyArray<typeof ManifestFile.Type>,
    isLeftOut: (path: string) => boolean,
    count: number,
) {
    const read = manifestOf(inventory, isLeftOut).filter((file) => file.copyOf === undefined && file.lines > 0);
    return {
        lines: read.reduce((total, file) => total + file.lines, 0),
        files: read.length,
        largest: byFolder(read).slice(0, count),
    };
}

/**
 * What each Leave Out rule leaves out (D115): for every rule deciding at least one file, the lines and files it leaves
 * out and its largest folders, the rules with the most lines first. The other side of `remainingByFolder`, counted the same
 * way, so the producer, the reviewer and the person can judge a rule against everything it matches, not only the lines
 * it cites.
 * @param inventory every listed file
 * @param leaving the rule that leaves a file out, or undefined when it is in scope
 * @param count how many folders to give per rule, the largest
 * @returns each rule with its lines, its files and its largest folders
 */
export function leftOutByRule(
    inventory: ReadonlyArray<typeof ManifestFile.Type>,
    leaving: (path: string) => { readonly pattern: string } | undefined,
    count: number,
) {
    const byRule = new Map<string, Array<typeof ManifestFile.Type>>();
    for (const file of inventory.filter((each) => each.lines > 0)) {
        const rule = leaving(file.path);
        if (rule !== undefined) {
            const held = byRule.get(rule.pattern);
            if (held === undefined) {
                byRule.set(rule.pattern, [file]);
            } else {
                held.push(file);
            }
        }
    }
    return [...byRule.entries()]
        .map(([pattern, held]) => ({
            pattern,
            lines: held.reduce((total, file) => total + file.lines, 0),
            files: held.length,
            largest: byFolder(held).slice(0, count),
        }))
        .sort((left, right) => right.lines - left.lines || compareText(left.pattern, right.pattern));
}
