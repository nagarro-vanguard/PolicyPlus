export type Place = { readonly file: string; readonly firstLine: number; readonly lastLine: number };
export type Range = { readonly first: number; readonly last: number };

/**
 * A short, stable id for a record: a prefix and the last digits of its record id.
 * @param prefix the kind of record
 * @param id the record id
 * @returns the short id
 */
export const shortId = (prefix: string, id: string) =>
    `${prefix}-${[...id]
        .filter((char) => char >= "0" && char <= "9")
        .join("")
        .slice(-8)}`;

/**
 * A place as `file:first-last`, or `file:line` for one line.
 * @param place the place
 * @returns the pointer
 */
export const at = (place: Place) =>
    `${place.file}:${place.firstLine}${place.lastLine > place.firstLine ? `-${place.lastLine}` : ""}`;

/**
 * Ranges as text.
 * @param ranges the ranges
 * @returns `a-b, c-d`
 */
export const rangesText = (ranges: readonly Range[]) =>
    ranges.map((range) => (range.last > range.first ? `${range.first}-${range.last}` : `${range.first}`)).join(", ");

/**
 * The file a window's generated layout lives in, for a window's own file.
 * @param file a source file
 * @returns the designer file that goes with it
 */
export const designerOf = (file: string) => (file.endsWith(".vb") ? `${file.slice(0, -3)}.Designer.vb` : file);

/**
 * Whether a file is generated layout code.
 * @param file the file
 * @returns true for a designer file
 */
export const isGenerated = (file: string) => file.endsWith(".Designer.vb");

/**
 * Whether two places touch the same lines of one file.
 * @param one a place
 * @param other another place
 * @returns true when they overlap
 */
export const overlaps = (one: Place, other: Place) =>
    one.file === other.file && one.firstLine <= other.lastLine && other.firstLine <= one.lastLine;

/**
 * Join ranges that overlap, touch or lie a line or two apart, in order.
 * @param ranges the ranges
 * @param gap how many lines apart two ranges may be and still join
 * @returns the merged ranges
 */
export const mergeRanges = (ranges: readonly Range[], gap = 2): Range[] => {
    const merged: Range[] = [];
    for (const range of ranges.toSorted((one, other) => one.first - other.first || one.last - other.last)) {
        const last = merged.at(-1);
        if (last !== undefined && range.first <= last.last + gap) {
            merged[merged.length - 1] = { first: last.first, last: Math.max(last.last, range.last) };
        } else {
            merged.push(range);
        }
    }
    return merged;
};
