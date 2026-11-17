export type Listed = { readonly path: string; readonly lines: number };

export type FileArea = {
    readonly folders: readonly string[];
    readonly files: readonly string[];
    readonly held: readonly Listed[];
};

/**
 * The lines of a set of files.
 * @param files the files
 * @returns their lines
 */
export const linesOf = (files: readonly Listed[]) => files.reduce((sum, file) => sum + file.lines, 0);

/**
 * Files in path order cut into runs of at most the budget, a file over it alone: each run an area of files named one
 * by one.
 * @param files the files
 * @param budget L
 * @returns the areas
 */
function runsOf(files: readonly Listed[], budget: number): FileArea[] {
    const runs: Listed[][] = [];
    let lines = 0;
    for (const file of files) {
        const last = runs.at(-1);
        if (last === undefined || lines + file.lines > budget) {
            runs.push([file]);
            lines = file.lines;
        } else {
            last.push(file);
            lines += file.lines;
        }
    }
    return runs.map((run) => ({ folders: [], files: run.map((file) => file.path), held: run }));
}

/**
 * A folder's files cut into units of at most the budget along the folders below it (H1): a folder within the budget is
 * one unit, whole; a larger one is its own files, in runs, then each folder below it, cut the same way.
 * @param files the files below the folder, in path order
 * @param depth how many segments of their paths name the folder
 * @param budget L
 * @returns the units, in path order
 */
function unitsOf(files: readonly Listed[], depth: number, budget: number): FileArea[] {
    const [first] = files;
    if (first === undefined) {
        return [];
    }
    if (depth > 0 && linesOf(files) <= budget) {
        return [{ folders: [first.path.split("/").slice(0, depth).join("/")], files: [], held: files }];
    }
    const own = files.filter((file) => file.path.split("/").length === depth + 1);
    const below = new Map<string, Listed[]>();
    for (const file of files.filter((each) => each.path.split("/").length > depth + 1)) {
        const segment = file.path.split("/")[depth];
        const group = below.get(`${segment}`);
        if (group === undefined) {
            below.set(`${segment}`, [file]);
        } else {
            group.push(file);
        }
    }
    return [...runsOf(own, budget), ...[...below.values()].flatMap((group) => unitsOf(group, depth + 1, budget))];
}

/**
 * A part over L cut into areas along its folders (H1, D7): units of at most L, then neighbouring units joined while
 * they stay within L. Every file of the part lies in exactly one area; an area over L is one file over it.
 * @param files the part's files in scope
 * @param budget L
 * @returns the areas, in path order
 */
export function areasOf(files: readonly Listed[], budget: number): FileArea[] {
    const sorted = files.toSorted((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
    const groups: FileArea[][] = [];
    let lines = 0;
    for (const unit of unitsOf(sorted, 0, budget)) {
        const last = groups.at(-1);
        if (last === undefined || lines + linesOf(unit.held) > budget) {
            groups.push([unit]);
            lines = linesOf(unit.held);
        } else {
            last.push(unit);
            lines += linesOf(unit.held);
        }
    }
    return groups.map((group) => ({
        folders: group.flatMap((unit) => unit.folders),
        files: group.flatMap((unit) => unit.files),
        held: group.flatMap((unit) => unit.held),
    }));
}
