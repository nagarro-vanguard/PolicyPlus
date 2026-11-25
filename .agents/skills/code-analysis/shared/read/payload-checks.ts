import type { CapabilityPayload } from "../model/schemas/payloads";

const idKinds = [
    "block",
    "capability",
    "layer",
    "rule",
    "businessrule",
    "fact",
    "codekind",
    "entity",
    "crosscutting",
    "capabilitygroup",
    "link",
    "definition",
];

/**
 * Every context of a capability payload with the place it belongs to, for the checks.
 * @param payload the payload
 * @returns each context and its place's name
 */
const contextsOf = (payload: CapabilityPayload) => [
    { place: "capability", context: payload.context, rules: payload.totals.rules },
    ...payload.screens.map((screen) => ({
        place: `screen ${screen.name}`,
        context: screen.context,
        rules: screen.rules.length,
    })),
    ...payload.layers.flatMap((layer) => [
        { place: `layer ${layer.name}`, context: layer.context, rules: layer.rules.length },
        ...layer.actions.map((action) => ({ place: "action", context: action.context, rules: action.rules.length })),
        ...layer.rules.map((rule) => ({ place: "rule", context: rule.context, rules: 0 })),
    ]),
];

/**
 * Whether a character is a word character: a letter, a digit or an underscore.
 * @param character one character, or none past the ends of the text
 * @returns true for a word character
 */
const isWordCharacter = (character: string | undefined) =>
    character !== undefined &&
    ((character >= "a" && character <= "z") ||
        (character >= "A" && character <= "Z") ||
        (character >= "0" && character <= "9") ||
        character === "_");

/**
 * Where a text names record ids: one of the kinds of record, a hyphen and eight or more digits, standing alone as a
 * word.
 * @param text the text
 * @returns the start and end of each, in order
 */
const recordIdSpans = (text: string) => {
    const spans: Array<readonly [number, number]> = [];
    for (const kind of idKinds) {
        const mark = `${kind}-`;
        for (let from = text.indexOf(mark); from !== -1; from = text.indexOf(mark, from + 1)) {
            let end = from + mark.length;
            while (text.charCodeAt(end) >= 48 && text.charCodeAt(end) <= 57) {
                end++;
            }
            if (end - from - mark.length >= 8 && !isWordCharacter(text[from - 1]) && !isWordCharacter(text[end])) {
                spans.push([from, end]);
            }
        }
    }
    return spans.toSorted((one, other) => one[0] - other[0]);
};

/**
 * Whether a text holds a record id.
 * @param text the text
 * @returns true when a record id is named
 */
const namesRecordId = (text: string) => recordIdSpans(text).length > 0;

/**
 * A text with each record id it names replaced by words, so a reviewer's words can be shown in a context, which names
 * no record id.
 * @param text the text
 * @returns the text, with `another finding` where a record id stood
 */
export const withoutRecordIds = (text: string) => {
    let out = "";
    let at = 0;
    for (const [from, end] of recordIdSpans(text)) {
        if (from >= at) {
            out += `${text.slice(at, from)}another finding`;
            at = end;
        }
    }
    return out + text.slice(at);
};

/**
 * The checks of a context's shape: it names its scope, its rules count is the place's, it names no record id in any
 * line, and it names the commit.
 * @param payload the payload
 * @returns one line per difference
 */
const contextGaps = (payload: CapabilityPayload): string[] =>
    contextsOf(payload).flatMap(({ place, context, rules }) => [
        ...(context.scope === "" ? [`${place}: the context lacks its scope`] : []),
        ...(context.rulesTotal === rules
            ? []
            : [`${place}: the context counts ${context.rulesTotal} rules, the place has ${rules}`]),
        ...(namesRecordId(
            [context.scope, ...context.inside, ...context.lookFirst, ...context.layers, ...context.rules].join("\n"),
        )
            ? [`${place}: the context names a record id`]
            : []),
        ...(context.commit === "" ? [`${place}: the context does not name the commit`] : []),
    ]);

/**
 * The lines for a list of ids that must each be named once: those named twice, and a count that differs.
 * @param what what the ids are
 * @param ids the ids as the layers hold them
 * @param total how many the capability has
 * @returns one line per difference
 */
const onceGaps = (what: string, ids: readonly string[], total: number) => {
    const seen = new Set<string>();
    const doubled = ids.filter((id) => (seen.has(id) ? true : (seen.add(id), false)));
    return [
        ...(doubled.length > 0 ? [`${what}: ${doubled.length} named under more than one layer`] : []),
        ...(seen.size !== total ? [`${what}: the layers hold ${seen.size}, the capability has ${total}`] : []),
    ];
};

/**
 * Whether a payload adds up: the layers hold every entry point and every rule of the capability exactly once, they
 * count the blocks the capability reaches, and every context has the shape the analysis documents.
 * @param payload the payload
 * @returns one line per difference; none when it adds up
 */
export const payloadGaps = (payload: CapabilityPayload): string[] => {
    const blocks = payload.layers.reduce((sum, layer) => sum + layer.blocks, 0);
    return [
        ...onceGaps(
            "entry points",
            payload.layers.flatMap((layer) => layer.actions.map((action) => action.id)),
            payload.totals.actions,
        ),
        ...onceGaps(
            "rules",
            payload.layers.flatMap((layer) => layer.rules.map((rule) => rule.id)),
            payload.totals.rules,
        ),
        ...(blocks === payload.totals.blocks
            ? []
            : [`blocks: the layers hold ${blocks}, the capability reaches ${payload.totals.blocks}`]),
        ...contextGaps(payload),
    ];
};
