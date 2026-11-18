import { at, shortId } from "./bundle-places";
import type { ActionEntry, Payloads, RuleEntry } from "./bundle-slice";

/**
 * The first sentence of a rule, for rules the slice only relies on; the whole text is in the bundle of the code's owner.
 * @param text the rule's words
 * @returns its first sentence, marked as cut
 */
const firstSentence = (text: string) => {
    for (let found = text.indexOf(". "); found >= 0; found = text.indexOf(". ", found + 1)) {
        const before = text.charAt(found - 1);
        const after = text.charAt(found + 2);
        const endsWord = before !== "" && ((before >= "a" && before <= "z") || ")\"'".includes(before));
        if (endsWord && after >= "A" && after <= "Z") {
            return `${text.slice(0, found + 1)} …`;
        }
    }
    return text;
};

/**
 * How one rule reads in a bundle: its id, what it says, where it is decided, what else it rests on, the change of state
 * it gates and whether it is disputed.
 * @param entry the rule
 * @param whole whether to give the whole text or only the first sentence
 * @returns the line
 */
export const ruleLine = (entry: RuleEntry, whole: boolean) => {
    const rests = entry.rule.alsoRestsOn.map((place) => `\`${at(place)}\``).join(", ");
    const says = whole ? entry.rule.says : firstSentence(entry.rule.says);
    return [
        `- **${shortId("BR", entry.rule.id)}** ${says} — \`${at(entry.rule.place)}\``,
        rests === "" ? "" : `; also rests on ${rests}`,
        entry.info.gates === "" ? "" : `; gates ${shortId("TR", entry.info.gates)}`,
        entry.info.reading === "disputed" ? "; **disputed**" : "",
    ].join("");
};

/**
 * How one action reads in a bundle.
 * @param entry the action
 * @returns the line
 */
export const actionLine = (entry: ActionEntry) => {
    const by = entry.action.startedBy === "otherSystem" ? "another system" : entry.action.startedBy;
    return `- **${shortId("ACT", entry.action.id)}** ${entry.action.purpose} — \`${at(entry.action.place)}\`; started by ${by}`;
};

/**
 * The type of a control from its description: its type comes first.
 * @param declaredAs how the analysis describes the control
 * @returns the type's last name
 */
const controlType = (declaredAs: string) => {
    const [first] = declaredAs.split(";");
    const name = first === undefined ? "" : first.trim();
    const last = name.split(".").at(-1);
    return last === undefined || last === "" ? "Other" : last;
};

/**
 * The controls a window declares, grouped by type.
 * @param payloads everything the analysis wrote
 * @param files the window's files
 * @returns one line; empty when the window declares none
 */
export const controlsLine = (payloads: Payloads, files: ReadonlySet<string>) => {
    const containers = new Set(
        payloads.index.blocks.filter((block) => files.has(block.file)).map((block) => block.container),
    );
    const byType = new Map<string, string[]>();
    for (const control of payloads.index.controls) {
        if (containers.has(control.container) && control.name !== "Me" && control.name !== "components") {
            const type = controlType(control.declaredAs);
            const list = byType.get(type);
            if (list === undefined) {
                byType.set(type, [control.name]);
            } else {
                list.push(control.name);
            }
        }
    }
    const total = [...byType.values()].reduce((sum, list) => sum + list.length, 0);
    const text = [...byType]
        .toSorted(([one], [other]) => (one < other ? -1 : 1))
        .map(([type, names]) => `${type}: ${names.join(", ")}`)
        .join("; ");
    return total === 0 ? "" : `Controls (${total}): ${text}`;
};

/**
 * What the product is and what it is built with, in a few lines.
 * @param payloads everything the analysis wrote
 * @returns the lines
 */
export const productLines = (payloads: Payloads) => {
    const versions = new Map(
        payloads.knowledge.technologies.flatMap((technology) => {
            const stated = technology.versions.find((version) => version.label !== "");
            return stated === undefined ? [] : [[technology.name, `${technology.name} ${stated.label}`] as const];
        }),
    );
    const runs = payloads.knowledge.answers.find(
        (answer) => answer.aspect === "runs-where" && answer.subject.kind === "system",
    );
    return [
        payloads.system.purpose,
        ...payloads.knowledge.parts.map((part) => {
            const names = part.technologies.map((name) => {
                const stated = versions.get(name);
                return stated === undefined ? name : stated;
            });
            return `Built with: ${names.join(", ")} (${part.name}).`;
        }),
        ...(runs === undefined ? [] : [`Runs: ${runs.statement}`]),
        `Reaches outside itself: ${payloads.system.externals.map((external) => external.name).join("; ")}.`,
    ];
};
