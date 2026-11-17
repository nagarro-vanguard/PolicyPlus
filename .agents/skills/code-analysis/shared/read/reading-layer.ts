import chardet from "chardet";
import iconv from "iconv-lite";

export type Decoding = {
    readonly encoding: string;
    readonly uncertain: boolean;
    readonly text: string;
};

const wholeFileMax = 1_000_000;
const sampleBytes = 64 * 1024;
const binaryProbe = 8000;
const uncertainBelow = 50;

const strictUtf8 = new TextDecoder("utf-8", { fatal: true });

const marks: ReadonlyArray<{ readonly encoding: string; readonly bytes: readonly number[] }> = [
    { encoding: "UTF-8", bytes: [0xef, 0xbb, 0xbf] },
    { encoding: "UTF-32LE", bytes: [0xff, 0xfe, 0, 0] },
    { encoding: "UTF-32BE", bytes: [0, 0, 0xfe, 0xff] },
    { encoding: "UTF-16LE", bytes: [0xff, 0xfe] },
    { encoding: "UTF-16BE", bytes: [0xfe, 0xff] },
];

/**
 * The encoding a byte order mark announces, with the length of the mark.
 * @param bytes a file's content
 * @returns the encoding's name and the mark's length, or none when the file opens with no mark
 */
function markOf(bytes: Uint8Array): { readonly encoding: string; readonly length: number } | undefined {
    const found = marks.find((mark) => mark.bytes.every((byte, at) => bytes[at] === byte));
    return found === undefined ? undefined : { encoding: found.encoding, length: found.bytes.length };
}

/**
 * Whether a file holds a NUL in its first bytes and announces no wide encoding: bytes that are no text.
 * @param bytes a file's content
 * @returns true for a binary file
 */
export const looksBinary = (bytes: Uint8Array) =>
    markOf(bytes) === undefined && bytes.subarray(0, binaryProbe).includes(0);

/**
 * Whether bytes are valid UTF-8, strictly.
 * @param bytes the bytes
 * @returns the text when they are, none otherwise
 */
function utf8Text(bytes: Uint8Array): string | undefined {
    try {
        return strictUtf8.decode(bytes);
    } catch {
        return undefined;
    }
}

/**
 * The encodings a file may be in, best first, by a mature detector: the whole file under a megabyte, else its first
 * 64 KB. Only encodings the decoder knows are offered.
 * @param bytes the file's content
 * @returns the candidates, each with the detector's confidence out of 100
 */
function candidatesOf(bytes: Uint8Array): ReadonlyArray<{ readonly name: string; readonly confidence: number }> {
    const sample = bytes.length <= wholeFileMax ? bytes : bytes.subarray(0, sampleBytes);
    return chardet
        .analyse(sample)
        .filter((found) => found.name !== "UTF-8" && iconv.encodingExists(found.name))
        .map((found) => ({ name: found.name, confidence: found.confidence }));
}

/**
 * Decode a file's bytes to text by a library, never by a rule written here: a byte order mark decides first, then
 * valid UTF-8, then the detector's best encoding the decoder knows. A result the detector is unsure of, or one whose
 * tail does not decode cleanly in a file too large to detect whole, is marked uncertain, so the run page lists it.
 * @param bytes the file's content
 * @returns the encoding, whether it is uncertain, and the text with any mark dropped; none for a binary file
 */
export function decodeBytes(bytes: Uint8Array): Decoding | undefined {
    if (looksBinary(bytes)) {
        return undefined;
    }
    const mark = markOf(bytes);
    if (mark !== undefined) {
        const text = iconv.decode(Buffer.from(bytes.subarray(mark.length)), mark.encoding);
        return { encoding: mark.encoding, uncertain: false, text };
    }
    const plain = utf8Text(bytes);
    if (plain !== undefined) {
        return { encoding: "UTF-8", uncertain: false, text: plain };
    }
    const [best] = candidatesOf(bytes);
    const name = best === undefined ? "windows-1252" : best.name;
    const text = iconv.decode(Buffer.from(bytes), name);
    const tailBroken =
        bytes.length > wholeFileMax && iconv.decode(Buffer.from(bytes.subarray(-sampleBytes)), name).includes("�");
    return {
        encoding: name,
        uncertain: best === undefined || best.confidence < uncertainBelow || tailBroken,
        text,
    };
}

/**
 * A text's lines as a person counts them: one per line break, a carriage return and line feed, a line feed or a
 * carriage return alone each one break, and a last line with no break after it.
 * @param text the text
 * @returns its lines, none of them holding a line break
 */
export const logicalLines = (text: string): string[] => {
    const lines: string[] = [];
    let start = 0;
    let at = 0;
    while (at < text.length) {
        const char = text.charAt(at);
        if (char === "\n" || char === "\r") {
            lines.push(text.slice(start, at));
            at += char === "\r" && text.charAt(at + 1) === "\n" ? 2 : 1;
            start = at;
        } else {
            at += 1;
        }
    }
    return start < text.length ? [...lines, text.slice(start)] : lines;
};

/**
 * A text with every line break made one line feed, so the line numbers of the copy an agent reads are the logical line
 * numbers the scripts count.
 * @param text the text
 * @returns the text, ending in a line feed when it has any line
 */
export const normalisedText = (text: string) => {
    const lines = logicalLines(text);
    return lines.length ? `${lines.join("\n")}\n` : "";
};
