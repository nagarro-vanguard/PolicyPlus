import { sha1Hex } from "../../shared/run/hashing-and-random";
import { decodeBytes, logicalLines, looksBinary, normalisedText } from "../../shared/read/reading-layer";
import type { ReadsAs } from "../../shared/model/schemas/file-listing";

export type UnreadRange = {
    readonly firstLine: number;
    readonly lastLine: number;
    readonly why: "minified" | "encodedData";
    readonly evidence: string;
};

export interface Measured {
    readonly lines: number;
    readonly bytes: number;
    readonly binary: boolean;
    readonly utf8: boolean;
    readonly longestLine: number;
    readonly hash: string;
    readonly readsAs: ReadsAs;
    readonly encoding: string;
    readonly encodingUncertain: boolean;
    readonly decodedText?: string;
    readonly unread: readonly UnreadRange[];
}

export type MeasureLimits = {
    readonly longLineMax: number;
    readonly minifiedLineMin: number;
    readonly encodedRunMin: number;
};

const lineFeed = 0x0a;
const carriageReturn = 0x0d;

const minifiedWhitespaceShare = 0.08;

/**
 * How the agent's Read tool sees a file, one reason only, the first that holds (D184): binary; UTF-16 (a mark); a
 * carriage return and no line feed, so Read shows it as one line (classic Mac text, some exports); a line longer than
 * `longLineMax` (minified, generated, or a record-format export with no line breaks); text that is not UTF-8, read
 * with some characters lost; else text.
 * @param bytes the file's content
 * @param encoding the encoding the reading layer found
 * @param longestLine its longest line, in bytes, as Read splits lines
 * @param longLineMax the longest line an agent reads whole
 * @returns the reason
 */
function readsAsOf(bytes: Uint8Array, encoding: string, longestLine: number, longLineMax: number): ReadsAs {
    if (encoding.startsWith("UTF-16") || encoding.startsWith("UTF-32")) {
        return "utf16";
    }
    if (!bytes.includes(lineFeed) && bytes.includes(carriageReturn)) {
        return "crOnly";
    }
    if (longestLine > longLineMax) {
        return "longLine";
    }
    return encoding === "UTF-8" ? "text" : "notUtf8";
}

/**
 * A text's lines as Read numbers them: one per line feed, plus a last line with no line feed after it.
 * @param text the text
 * @returns its lines
 */
const lineFeedLines = (text: string) => {
    const lines = text.split("\n");
    return lines.at(-1) === "" ? lines.slice(0, -1) : lines;
};

/**
 * The longest base64-like run in a line: letters, digits, plus and slash, closed by up to two equals signs.
 * @param line the line
 * @returns the run's length in characters
 */
function longestEncodedRun(line: string): number {
    let longest = 0;
    let run = 0;
    for (const char of line) {
        const inAlphabet = (char >= "A" && char <= "Z") || (char >= "a" && char <= "z") || (char >= "0" && char <= "9");
        if (inAlphabet || char === "+" || char === "/" || (char === "=" && run > 0)) {
            run += 1;
            longest = Math.max(longest, run);
        } else {
            run = 0;
        }
    }
    return longest;
}

/**
 * The lines no reader can read, found by a script: a line over `minifiedLineMin` characters with little whitespace is
 * minified code or data, and a line holding a base64-like run over `encodedRunMin` characters is encoded data. Lines
 * of one kind that touch are one range.
 * @param lines the file's lines, as numbered
 * @param limits the lengths that decide
 * @returns the ranges, in line order
 */
function unreadIn(lines: readonly string[], limits: MeasureLimits): UnreadRange[] {
    const ranges: UnreadRange[] = [];
    lines.forEach((line, at) => {
        const number = at + 1;
        const whitespace = [...line].filter((char) => char.trim() === "").length;
        const why =
            line.length > limits.minifiedLineMin && whitespace / line.length < minifiedWhitespaceShare
                ? ("minified" as const)
                : longestEncodedRun(line) > limits.encodedRunMin
                  ? ("encodedData" as const)
                  : undefined;
        if (why === undefined) {
            return;
        }
        const evidence =
            why === "minified"
                ? `a line of ${line.length} characters with little whitespace`
                : `a base64-like run of ${longestEncodedRun(line)} characters`;
        const last = ranges.at(-1);
        if (last !== undefined && last.why === why && last.lastLine === number - 1) {
            ranges[ranges.length - 1] = { ...last, lastLine: number };
        } else {
            ranges.push({ firstLine: number, lastLine: number, why, evidence });
        }
    });
    return ranges;
}

/**
 * Measure a file's bytes: its encoding by the reading layer, its lines as an agent will number them, and what no one can
 * read. A NUL in the first bytes means binary: no line is read. A file the agent's Read tool would show wrongly (another
 * encoding, UTF-16, or carriage returns alone) is measured on its decoded text with every line break made one line feed,
 * and that text is returned, so the lister writes the copy the agent reads instead; any other file is measured as Read
 * numbers it.
 * @param bytes the file's content
 * @param limits the longest line an agent reads whole, and the lengths that make a line unread
 * @returns its line count, size, encoding, hash for exact copies and job identity, how Read sees it, and its unread ranges
 */
export function measureFile(bytes: Uint8Array, limits: MeasureLimits): Measured {
    const hash = sha1Hex(bytes);
    const decoding = looksBinary(bytes) ? undefined : decodeBytes(bytes);
    if (decoding === undefined) {
        return {
            lines: 0,
            bytes: bytes.length,
            binary: true,
            utf8: false,
            longestLine: 0,
            hash,
            readsAs: "binary",
            encoding: "binary",
            encodingUncertain: false,
            unread: [],
        };
    }
    const { encoding, uncertain, text } = decoding;
    const asRead = encoding === "UTF-8" && (bytes.includes(lineFeed) || !bytes.includes(carriageReturn));
    const lines = asRead ? lineFeedLines(text) : logicalLines(text);
    const longestLine = lines.reduce((longest, line) => Math.max(longest, Buffer.byteLength(line)), 0);
    return {
        lines: lines.length,
        bytes: bytes.length,
        binary: false,
        utf8: encoding === "UTF-8",
        longestLine,
        hash,
        readsAs: readsAsOf(bytes, encoding, longestLine, limits.longLineMax),
        encoding,
        encodingUncertain: uncertain,
        ...(asRead ? {} : { decodedText: normalisedText(text) }),
        unread: unreadIn(lines, limits),
    };
}
