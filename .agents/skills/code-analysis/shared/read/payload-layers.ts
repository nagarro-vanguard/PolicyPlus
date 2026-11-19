import { Schema } from "effect";
import type { CapabilityPayload } from "../model/schemas/payloads";
import { known } from "../run/collections";
import { contextOf, type FileUse } from "./payload-context";
import { FieldNames, type capabilityRows } from "./payload-queries";
import { Evidence, groupOf, groupRank, placeOf, plural, ruleLine, textOf } from "./payload-words";
import type { Effect } from "effect";
import { ruleKeyOf } from "./payload-keys";
import { withoutRecordIds } from "./payload-checks";
import type { SurfaceKind } from "../model/schemas/surface-kind";

export type Rows = Effect.Success<ReturnType<typeof capabilityRows>>;

/**
 * What the payloads know of the entry points and rules beyond one capability's rows, derived by code once for the
 * whole system: each entry point's key, place, address and whether tooling starts it, and each rule's second reading
 * and the test suites reaching it.
 */
export type PayloadFacts = {
    readonly entryKey: (id: string) => string | undefined;
    readonly surfaceOf: (id: string) => string | undefined;
    readonly surfaceNamed: (key: string) =>
        | {
              readonly name: string;
              readonly kind: SurfaceKind;
              readonly noun: { readonly one: string; readonly many: string };
              readonly unnamed: boolean;
          }
        | undefined;
    readonly addressOf: (id: string) => string | undefined;
    readonly toolingOf: (id: string) => boolean;
    readonly testsOf: (rule: string) => readonly string[];
    readonly readingOf: (rule: string) => {
        readonly reading: "reviewed" | "corrected" | "disputed" | "unread";
        readonly why: string;
    };
};

const AssumedPlaces = Schema.fromJsonString(
    Schema.Array(Schema.Struct({ lines: Schema.Struct({ file: Schema.String }) })),
);

/**
 * What is doubtful about one rule, derived from what is recorded: a second reading that disputes it, with the
 * reviewer's words, and what the capability assumes about the rules it applies at lines of the rule's own file.
 * @param rows the capability's rows
 * @param rule the rule's file
 * @param rule.file the file it is decided in
 * @param reading where a second reading left it
 * @param reading.reading the label
 * @param reading.why the reviewer's words
 * @returns the lines, none when nothing is in doubt
 */
const doubtOf = (
    rows: Rows,
    rule: { readonly file: string },
    reading: { readonly reading: string; readonly why: string } | undefined,
) => [
    ...(reading !== undefined && reading.reading === "disputed"
        ? [`Disputed in a second reading${reading.why === "" ? "" : `: ${withoutRecordIds(reading.why)}`}`]
        : []),
    ...rows.openPoints
        .filter(
            (point) =>
                point.aspect === "rules-it-applies" &&
                point.evidence !== null &&
                Schema.decodeUnknownSync(AssumedPlaces)(point.evidence).some((place) => place.lines.file === rule.file),
        )
        .map((point) => `Assumed: ${point.statement} If wrong: ${point.ifWrong}`),
];

/**
 * What a place's context is built from, gathered from the capability's rows once.
 * @param rows the capability's rows
 * @returns lookups by file and by data
 */
export const lookups = (rows: Rows) => {
    const use = new Map(rows.fileUse.map((row) => [row.file, row.capabilities] as const));
    const filesOf = (files: readonly string[]): FileUse[] =>
        [...new Set(files)].map((file) => ({ file, capabilities: use.has(file) ? known(use, file, "checked") : 1 }));
    const dataOf = (rowsOf: ReadonlyArray<{ readonly name: string; readonly kind: string }>) => ({
        saves: [...new Set(rowsOf.filter((row) => row.kind === "saves").map((row) => row.name))].toSorted(),
        reads: [...new Set(rowsOf.filter((row) => row.kind === "reads").map((row) => row.name))].toSorted(),
    });
    return { filesOf, dataOf };
};

/**
 * The open points of the capability as lines for a context.
 * @param rows the capability's rows
 * @param prefix words that say the point belongs to the capability, for a place inside it
 * @returns the lines
 */
export const pointLines = (rows: Rows, prefix: string) =>
    rows.openPoints.map((point) => `${prefix}${point.statement} If wrong: ${point.ifWrong}`);

/**
 * The links of the capability's flows that reach nothing, as lines for a context, those in some files only.
 * @param rows the capability's rows
 * @param inFiles the files of the place; every file when none is given
 * @returns the lines
 */
export const gapLines = (rows: Rows, inFiles?: ReadonlySet<string>) =>
    rows.gaps
        .filter((gap) => inFiles === undefined || inFiles.has(gap.file))
        .map((gap) => `a ${gap.kind} at ${gap.file}:${gap.firstLine}: ${textOf(gap.reason)}`);

/**
 * The lines of the rules an entry point's flow decides, found among every rule of the capability.
 * @param rows the capability's rows
 * @param ids the rules' record ids
 * @returns one line per rule, those that change a state first
 */
const rulesOfFlow = (rows: Rows, ids: readonly string[]) => {
    const wanted = new Set(ids);
    return rows.rules
        .filter((row) => wanted.has(row.id))
        .toSorted((one, other) => Number(other.gates !== null) - Number(one.gates !== null))
        .map((row) => ruleLine({ says: row.says, place: row }));
};

/**
 * The names of the screens each rule is reached from, by rule id.
 * @param rows the capability's rows
 * @returns the screens' names by rule id
 */
const screensOfRules = (rows: Rows) => {
    const screensOfRule = new Map<string, Set<string>>();
    for (const action of rows.actions) {
        const name = textOf(action.screen);
        if (name === "") {
            continue;
        }
        for (const each of rows.actionRules.filter((rule) => rule.entryPoint === action.id)) {
            const set = screensOfRule.get(each.rule);
            if (set === undefined) {
                screensOfRule.set(each.rule, new Set([name]));
            } else {
                set.add(name);
            }
        }
    }
    return screensOfRule;
};

type Where = { readonly layerName: string; readonly capabilityName: string; readonly commit: string };

/**
 * The rules of one layer, each with its context.
 * @param rows the capability's rows
 * @param layer the layer's id
 * @param where the layer's and capability's names and the commit
 * @param facts what is known across the system of the rules; none leaves their key, reading and tests out
 * @returns the layer's rules
 */
const rulesOfLayer = (rows: Rows, layer: string, where: Where, facts: PayloadFacts | undefined) => {
    const { filesOf } = lookups(rows);
    const screensOfRule = screensOfRules(rows);
    return rows.rules
        .filter((row) => row.layer === layer)
        .map((row) => {
            const place = placeOf(row);
            const evidence = row.evidence === null ? [] : Schema.decodeUnknownSync(Evidence)(row.evidence).map(placeOf);
            const screens = screensOfRule.has(row.id) ? [...known(screensOfRule, row.id, "checked")].toSorted() : [];
            const reading = facts === undefined ? undefined : facts.readingOf(row.id);
            return {
                id: row.id,
                says: row.says,
                gates: row.gates !== null,
                place,
                alsoRestsOn: evidence.filter((each) => each.file !== place.file || each.firstLine !== place.firstLine),
                ...(facts === undefined || reading === undefined
                    ? {}
                    : {
                          key: ruleKeyOf({ file: row.file, firstLine: row.firstLine, says: row.says }),
                          reading: reading.reading,
                          why: reading.why,
                          reachedByTests: [...facts.testsOf(row.id)],
                      }),
                screens,
                context: contextOf({
                    scope: `Business rule decided in the ${where.layerName} layer of ${where.capabilityName}: ${row.says}`,
                    startsAt: `${place.file}:${place.firstLine}`,
                    files: filesOf([place.file, ...evidence.map((each) => each.file)]),
                    saves: [],
                    reads: [],
                    rules: [],
                    unconfirmed: facts === undefined ? [] : doubtOf(rows, row, reading),
                    notFollowed: [],
                    commit: where.commit,
                }),
            };
        });
};

/**
 * Who starts the work, in words, for the scope of an action's context.
 * @param startedBy person, schedule or otherSystem
 * @returns the words
 */
const startersWords = (startedBy: string) =>
    startedBy === "person" ? "a person" : startedBy === "schedule" ? "a schedule" : "another system";

/**
 * The actions of one layer, each with its path, rules and context.
 * @param rows the capability's rows
 * @param layer the layer's id
 * @param where the layer's and capability's names and the commit
 * @param facts what is known across the system of the entry points; none leaves their key, place and address out
 * @returns the layer's actions
 */
const actionsOfLayer = (rows: Rows, layer: string, where: Where, facts: PayloadFacts | undefined) => {
    const { filesOf, dataOf } = lookups(rows);
    return rows.actions
        .filter((row) => row.layer === layer)
        .map((row) => {
            const files = rows.actionFiles.filter((each) => each.entryPoint === row.id).map((each) => each.file);
            const ruleIds = rows.actionRules.filter((each) => each.entryPoint === row.id).map((each) => each.rule);
            const screen = textOf(row.screen);
            const key = facts === undefined ? undefined : facts.entryKey(row.id);
            const surface = facts === undefined ? undefined : facts.surfaceOf(row.id);
            const address = facts === undefined ? undefined : facts.addressOf(row.id);
            return {
                id: row.id,
                name: textOf(row.name),
                purpose: row.purpose,
                startedBy: row.startedBy,
                screen,
                ...(key === undefined ? {} : { key }),
                ...(surface === undefined ? {} : { surface }),
                ...(address === undefined ? {} : { address }),
                ...(facts === undefined ? {} : { tooling: facts.toolingOf(row.id) }),
                place: placeOf(row),
                path: rows.paths
                    .filter((path) => path.entryPoint === row.id)
                    .map((path) => ({ layer: path.layer, depth: path.depth })),
                rules: ruleIds,
                context: contextOf({
                    scope: `Action started by ${startersWords(row.startedBy)}${screen === "" ? "" : ` in the ${screen} screen`} of ${where.capabilityName}: ${row.purpose}`,
                    startsAt: `${row.file}:${row.firstLine}`,
                    files: filesOf(files),
                    ...dataOf(rows.actionData.filter((each) => each.entryPoint === row.id)),
                    rules: rulesOfFlow(rows, ruleIds),
                    unconfirmed: pointLines(rows, "For the capability: "),
                    notFollowed: gapLines(rows, new Set(files)),
                    commit: where.commit,
                }),
            };
        });
};

/**
 * One layer of a capability's payload: what it does, the entry points, rules and shapes in it, and its context.
 * @param rows the capability's rows
 * @param use the layer's use: its id, its blocks and how many another capability's flows reach too
 * @param commit the commit the analysis describes
 * @param facts what is known across the system of the entry points and rules
 * @returns the layer
 */
const layerOf = (
    rows: Rows,
    use: Rows["uses"][number],
    commit: string,
    facts: PayloadFacts | undefined,
): CapabilityPayload["layers"][number] => {
    const roleRow = rows.roles.find((row) => row.layer === use.layer);
    const role = roleRow === undefined ? "decides" : roleRow.role;
    const layerName = roleRow === undefined ? use.layer : roleRow.name;
    const record = rows.layerRecords.find((row) => row.id === use.layer);
    const where = { layerName, capabilityName: rows.capability.name, commit };
    const rules = rulesOfLayer(rows, use.layer, where, facts);
    const actions = actionsOfLayer(rows, use.layer, where, facts);
    const layerFiles = rows.layerFiles.filter((row) => row.layer === use.layer).map((row) => row.file);
    const { filesOf, dataOf } = lookups(rows);
    return {
        id: use.layer,
        name: layerName,
        purpose: record === undefined ? "" : record.purpose,
        evidence: record === undefined ? [] : Schema.decodeUnknownSync(Evidence)(record.evidence).map(placeOf),
        role,
        group: groupOf(role),
        blocks: use.blocks,
        sharedBlocks: use.sharedBlocks,
        actions,
        rules,
        shapes: rows.shapes
            .filter((row) => row.layer === use.layer)
            .map((row) => ({
                id: row.id,
                name: row.name,
                fields: Schema.decodeUnknownSync(FieldNames)(row.fields).map((field) => field.writtenAs),
            })),
        context: contextOf({
            scope: `The ${layerName} layer of ${where.capabilityName}: ${plural(actions.length, "action", "actions")} and ${plural(rules.length, "rule", "rules")}${use.sharedBlocks > 0 ? "; part of its code is also used by other capabilities" : ""}.`,
            files: filesOf(layerFiles),
            ...dataOf(rows.layerData.filter((each) => each.layer === use.layer)),
            rules: rules.map(ruleLine),
            unconfirmed: pointLines(rows, "For the capability: "),
            notFollowed: gapLines(rows, new Set(layerFiles)),
            commit,
        }),
    };
};

/**
 * The layers of a capability's payload: each layer it runs through with the entry points, rules and shapes in it,
 * each with its context, entry layers first.
 * @param rows the capability's rows
 * @param commit the commit the analysis describes
 * @param facts what is known of the entry points and rules across the system; none leaves those fields out
 * @returns the layers
 */
export const layersOf = (rows: Rows, commit: string, facts?: PayloadFacts): CapabilityPayload["layers"] =>
    rows.uses
        .map((use) => layerOf(rows, use, commit, facts))
        .toSorted((one, other) => groupRank(one.group) - groupRank(other.group));
