/**
 * Whether a character is one of the digits 0 to 9.
 * @param char one character
 * @returns true for a digit
 */
const isDigit = (char: string) => char >= "0" && char <= "9";

/**
 * Whether a text is one or more digits and nothing else.
 * @param text any text
 * @returns true for a whole number written in digits
 */
const isDigits = (text: string) => text.length > 0 && [...text].every(isDigit);

/**
 * Whether a character may stand unquoted in a name or a shell word: a letter, a digit or an underscore.
 * @param char one character
 * @returns true for a word character
 */
export const isWordCharacter = (char: string) =>
    (char >= "a" && char <= "z") || (char >= "A" && char <= "Z") || isDigit(char) || char === "_";

export const recordIdDigits = 20;

export const jobIdDigits = 16;

export const JobIdPrefix = {
    howItRuns: "job",
    map: "job",
    capabilitiesAndEntities: "job",
    capabilityRules: "job",
    conclusions: "job",
} as const;

/**
 * Whether a text is a record id of one prefix: the prefix, a hyphen and six digits or more.
 * @param prefix the record type's id prefix
 * @param text any text
 * @returns true for such a record id
 */
export function isRecordId(prefix: string, text: string): boolean {
    const digits = text.slice(prefix.length + 1);
    return text.startsWith(`${prefix}-`) && digits.length >= 6 && isDigits(digits);
}

/**
 * Whether a text is one or more lowercase letters and nothing else.
 * @param text any text
 * @returns true for a lowercase word
 */
const isLowercaseWord = (text: string) => text.length > 0 && [...text].every((char) => char >= "a" && char <= "z");

/**
 * An id split at its last hyphen into the part before and the number after, when the part after is all digits.
 * @param id any text
 * @returns the prefix and the digits, or undefined when the text ends in no number
 */
function idParts(id: string): { prefix: string; digits: string } | undefined {
    const dash = id.lastIndexOf("-");
    const digits = id.slice(dash + 1);
    return dash >= 0 && isDigits(digits) ? { prefix: id.slice(0, dash), digits } : undefined;
}

/**
 * The prefix of a record id, such as `block` for `block-000123`. A record id is a lowercase prefix, a hyphen and six
 * digits or more.
 * @param id a record id
 * @returns its prefix, or the whole text when it is not a record id
 */
export function prefixOf(id: string): string {
    const parts = idParts(id);
    return parts && parts.digits.length >= 6 && isLowercaseWord(parts.prefix) ? parts.prefix : id;
}
