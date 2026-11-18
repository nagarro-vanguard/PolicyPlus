import { compareText } from "../run/collections";
import { dataOf, howUsed, inSlice, lifeDiagram } from "./bundle-diagrams";
import { actionLine, controlsLine, ruleLine } from "./bundle-lines";
import { at, designerOf, shortId } from "./bundle-places";
import {
    coreFrom,
    screensByFile,
    specificCapabilities,
    type ActionEntry,
    type Payloads,
    type RuleEntry,
    type Slice,
} from "./bundle-slice";

type Group = {
    readonly files: Set<string>;
    purpose: string;
    readonly actions: ActionEntry[];
    readonly rules: RuleEntry[];
};

/**
 * The groups the contract is told in: each screen of the slice, then each layer of logic that decides rules it owns,
 * with the actions and owned rules of each.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the groups by name
 */
const groupsOf = (payloads: Payloads, slice: Slice) => {
    const byFile = screensByFile(payloads);
    const groups = new Map<string, Group>();
    const group = (name: string) => {
        const found = groups.get(name);
        if (found !== undefined) {
            return found;
        }
        const fresh: Group = { files: new Set(), purpose: "", actions: [], rules: [] };
        groups.set(name, fresh);
        return fresh;
    };
    for (const screen of slice.screens) {
        const each = group(screen.name);
        each.purpose = screen.purpose;
        screen.files.forEach((file) => each.files.add(file).add(designerOf(file)));
    }
    for (const entry of slice.actions) {
        const screen = byFile.get(entry.action.place.file);
        group(screen === undefined ? entry.layer : screen.name).actions.push(entry);
    }
    for (const entry of slice.rules.filter((each) => each.owned)) {
        group(entry.group).rules.push(entry);
    }
    return groups;
};

/**
 * The contract: for each screen or layer of logic the slice owns, what it is, its controls, its actions and its rules.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the lines
 */
export const contractLines = (payloads: Payloads, slice: Slice) =>
    [...groupsOf(payloads, slice)].flatMap(([name, each]) => {
        const controls = controlsLine(payloads, each.files);
        const rules = each.rules.toSorted(
            (one, other) =>
                compareText(one.rule.place.file, other.rule.place.file) ||
                one.rule.place.firstLine - other.rule.place.firstLine,
        );
        return [
            `### ${name}`,
            ...(each.purpose === "" ? [] : [each.purpose]),
            ...(controls === "" ? [] : [controls]),
            ...(each.actions.length === 0 ? [] : ["", "Actions", ...each.actions.map(actionLine)]),
            ...(rules.length === 0 ? [] : ["", "Rules", ...rules.map((entry) => ruleLine(entry, true))]),
            "",
        ];
    });

/**
 * Lines that list rules under the file that decides them.
 * @param heading the heading of the part
 * @param entries the rules
 * @param named whether to name the capabilities that also run the code
 * @returns the lines
 */
const reliedPart = (heading: string, entries: readonly RuleEntry[], named: boolean) => {
    const byFile = new Map<string, RuleEntry[]>();
    for (const entry of entries) {
        const list = byFile.get(entry.rule.place.file);
        if (list === undefined) {
            byFile.set(entry.rule.place.file, [entry]);
        } else {
            list.push(entry);
        }
    }
    const also = (entry: RuleEntry) =>
        named && entry.sharedWith.length > 0 ? ` (also used by ${entry.sharedWith.join(", ")})` : "";
    return entries.length === 0
        ? []
        : [
              `**${heading}**`,
              ...[...byFile]
                  .toSorted(([one], [other]) => compareText(one, other))
                  .flatMap(([file, list]) => [
                      `- \`${file}\``,
                      ...list
                          .toSorted((one, other) => one.rule.place.firstLine - other.rule.place.firstLine)
                          .map((entry) => `  ${ruleLine(entry, false)}${also(entry)}`),
                  ]),
              "",
          ];
};

/**
 * The rules the slice relies on but does not own: first those of code most capabilities run, then those of code shared
 * with a few, named; each grouped by the file that decides them.
 * @param slice the slice
 * @returns the lines
 */
export const reliedLines = (slice: Slice) => {
    const relied = slice.rules.filter((entry) => !entry.owned);
    return [
        ...reliedPart(
            `Core code, run by ${coreFrom} or more other capabilities`,
            relied.filter((entry) => entry.sharedWith.length >= coreFrom),
            false,
        ),
        ...reliedPart(
            "Code shared with a few capabilities",
            relied.filter((entry) => entry.sharedWith.length < coreFrom),
            true,
        ),
    ];
};

/**
 * The name of a state of a life by its number.
 * @param states the life's states
 * @param number the state's number, from 1
 * @returns the name
 */
const stateName = (states: readonly string[], number: number) => {
    const name = states[number - 1];
    return name === undefined ? `state ${number}` : name;
};

/**
 * The data the slice touches, with how it is used and where it is kept, and the life of each kind that has one.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the lines
 */
export const dataLines = (payloads: Payloads, slice: Slice) => {
    const used = dataOf(payloads, slice);
    const stores = new Map(
        slice.capabilities.flatMap((each) => each.data.map((kind) => [kind.id, kind.stores] as const)),
    );
    const lines = [...used].map(([id, use]) => {
        const kept = stores.get(id);
        return `- ${use.name}: ${howUsed(use)}${kept === undefined || kept.length === 0 ? "" : `; kept in ${kept.join(", ")}`}`;
    });
    const short = (id: string) => shortId("TR", id);
    for (const life of payloads.index.lifecycles.filter((each) => used.has(each.entity.id))) {
        lines.push("", `Life of ${life.entity.name}`, ...lifeDiagram(life, short), "");
        lines.push(
            "| Change | From | To | Written at | In this code | Reading |",
            "| --- | --- | --- | --- | --- | --- |",
        );
        for (const transition of life.transitions) {
            const from =
                transition.from.length === 0
                    ? "created"
                    : transition.from.map((number) => stateName(life.states, number)).join(" or ");
            lines.push(
                `| ${short(transition.id)} | ${from} | ${stateName(life.states, transition.to)} | \`${at(transition)}\` | ${inSlice(slice, transition) ? "yes" : "no"} | ${transition.reading} |`,
            );
        }
    }
    return lines;
};

/**
 * The neighbours: the screens the slice opens and is opened by, or the capabilities a capability shares code with.
 * @param slice the slice
 * @returns the lines
 */
export const boundaryLines = (slice: Slice) => {
    if (slice.kind === "screen") {
        return [
            ...slice.openedBy.map(
                (each) =>
                    `- ${each.how === "opens" ? "Opened by" : "Called from"} **${each.screen.name}** (bundle: screen ${each.screen.key}), at \`${at(each.via)}\``,
            ),
            ...slice.opens.map(
                (each) =>
                    `- ${each.how === "opens" ? "Opens" : "Calls into"} **${each.screen.name}** (bundle: screen ${each.screen.key}), at \`${at(each.via)}\``,
            ),
        ];
    }
    const core = slice.rules.filter((entry) => !entry.owned && entry.sharedWith.length >= coreFrom).length;
    return [
        ...[...specificCapabilities(slice)]
            .toSorted(([one], [other]) => compareText(one, other))
            .map(
                ([name, rules]) =>
                    `- Shares code with **${name}**: ${rules} rule${rules === 1 ? "" : "s"} (bundle: capability ${name})`,
            ),
        ...(core === 0
            ? []
            : [`- Runs core code the other capabilities also run: ${core} rules, listed under Relied on`]),
    ];
};
