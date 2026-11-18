import { Effect, Schema } from "effect";
import { about } from "./annotations";
import { withoutComments, withoutFrontMatter } from "./markdown";

const Text = Schema.String.check(Schema.isMinLength(1));

export const Kind = Schema.Literals(["feature", "bug", "technical"]).annotate(
    about("The kind of work: a new feature, a bug fix, or a technical change to the code."),
);

export type Kind = typeof Kind.Type;

/** An acceptance criterion's id: `AC-` and a number, as the parser numbers them in order. */
export const AcId = Schema.String.check(
    Schema.makeFilter(
        (text: string) =>
            (text.startsWith("AC-") &&
                text.length > 3 &&
                [...text.slice(3)].every((char) => char >= "0" && char <= "9")) ||
            "an acceptance criterion id: AC- and a number, as work-item.json numbers them",
    ),
);

const Criterion = Schema.Struct({ ac: AcId, text: Text });

export const WorkItem = Schema.Struct({
    id: Text,
    kind: Kind,
    title: Text,
    criteria: Schema.NonEmptyArray(Criterion),
    reproduce: Schema.optionalKey(Text),
    expected: Schema.optionalKey(Text),
    actual: Schema.optionalKey(Text),
    screens: Schema.optionalKey(Text),
}).annotate(about("The work item as its parser checked it, with its criteria numbered AC-1, AC-2 and so on."));

export type WorkItem = typeof WorkItem.Type;

export class WorkItemIncomplete extends Schema.TaggedError<WorkItemIncomplete>()("WorkItemIncomplete", {
    workItem: Schema.String,
    missing: Schema.Array(Schema.String),
}) {
    override get message() {
        return `The work item ${this.workItem} has no ${this.missing.join(", ")}. Add them to the work item and run again.`;
    }
}

/**
 * The headings a field may sit under, compared without case, the first being how it is named to a person: a team keeps
 * its own wording, and a work item is read in whichever of these it uses.
 */
const headings = {
    criteria: ["acceptance criteria", "acceptance", "criteria", "scenarios"],
    reproduce: ["steps to reproduce", "repro steps", "reproduction steps", "reproduction", "how to reproduce"],
    expected: ["expected", "expected behaviour", "expected behavior", "expected result", "expected results"],
    actual: ["actual", "actual behaviour", "actual behavior", "actual result", "actual results"],
    screens: ["screens"],
} as const;

type Field = keyof typeof headings;

/** The fields each kind must hold; a feature's criteria may also be written as Gherkin scenarios. */
const requiredFields: Record<Kind, readonly Field[]> = {
    feature: [],
    bug: ["reproduce", "expected", "actual"],
    technical: [],
};

/**
 * Reads a heading line: its words without the leading `#` marks, in lower case.
 * @param line a line of markdown
 * @returns the heading's words, or undefined when the line is no heading
 */
function headingOf(line: string): string | undefined {
    const trimmed = line.trim();
    const marks = [...trimmed].findIndex((char) => char !== "#");
    if (marks <= 0 || trimmed[marks] !== " ") {
        return undefined;
    }
    return trimmed.slice(marks).trim().toLowerCase();
}

/**
 * Splits a work item's markdown, with its HTML comments removed, into its title and the text under each heading at
 * any level. A trailing `:` is dropped from a heading, a repeated heading starts its text again, and the title is the
 * first top heading or else the first non-empty line.
 * @param text the work item's markdown
 * @returns the title, and each heading's trimmed text by its lower-case words
 */
function partsOf(text: string): { title: string; byHeading: Map<string, string> } {
    const byHeading = new Map<string, string>();
    let title = "";
    let current: string | undefined;
    for (const line of withoutComments(withoutFrontMatter(text)).split("\n")) {
        const heading = headingOf(line);
        if (heading !== undefined && line.trim().startsWith("# ") && !title) {
            title = line.trim().slice(2).trim();
            current = undefined;
        } else if (heading !== undefined) {
            current = heading.endsWith(":") ? heading.slice(0, -1) : heading;
            byHeading.set(current, "");
        } else if (current !== undefined) {
            byHeading.set(current, `${byHeading.get(current) ?? ""}${line}\n`);
        } else if (!title && line.trim()) {
            title = line.trim();
        }
    }
    return { title, byHeading: new Map([...byHeading].map(([key, value]) => [key, value.trim()])) };
}

/**
 * Reads a list item from a line that starts with `- `, `* ` or a number followed by `.` or `)`.
 * @param line the line, trimmed
 * @returns the item's text, or undefined when the line starts no item
 */
function itemOf(line: string): string | undefined {
    if (line.startsWith("- ") || line.startsWith("* ")) {
        return line.slice(2).trim();
    }
    const digits = [...line].findIndex((char) => char < "0" || char > "9");
    const marker = line[digits];
    return digits > 0 && (marker === "." || marker === ")") ? line.slice(digits + 1).trim() : undefined;
}

/**
 * Splits a block of text into statements: its list items when it has any (continuation lines join their item),
 * otherwise its paragraphs, so Given, When and Then lines written together stay one criterion.
 * @param text the block
 * @returns the statements, in order
 */
function statementsOf(text: string): string[] {
    const lines = text.split("\n").map((line) => line.trim());
    const hasItems = lines.some((line) => itemOf(line) !== undefined);
    const out: string[] = [];
    let joining = false;
    for (const line of lines) {
        const item = hasItems ? itemOf(line) : undefined;
        if (item !== undefined) {
            out.push(item);
            joining = true;
        } else if (!line) {
            joining = hasItems && joining;
        } else if (joining && out.length > 0) {
            out[out.length - 1] = `${out[out.length - 1]} ${line}`;
        } else {
            out.push(line);
            joining = true;
        }
        if (!line && !hasItems) {
            joining = false;
        }
    }
    return out.filter((statement) => statement.length > 0);
}

/**
 * Reads the fields only one kind has: a bug's reproduction, expected and actual, and the screens of a feature.
 * @param kind the work item's kind
 * @param field looks up the text under a field's headings, or undefined when there is none
 * @returns the kind's own fields, leaving out any that are absent
 */
function kindFields(kind: Kind, field: (name: Field) => string | undefined) {
    const own: Record<Kind, readonly Field[]> = {
        feature: ["screens"],
        bug: ["reproduce", "expected", "actual"],
        technical: [],
    };
    return Object.fromEntries(own[kind].flatMap((name) => (field(name) === undefined ? [] : [[name, field(name)]])));
}

/**
 * Reads the criteria a text states as Gherkin scenarios: each `Scenario:` or `Scenario Outline:` line with the lines
 * under it up to the next blank line, heading or scenario.
 * @param text the work item's markdown
 * @returns one statement per scenario, in order, in the text's own words
 */
function gherkinOf(text: string): string[] {
    const out: string[] = [];
    let current: string[] | undefined;
    for (const line of text.split("\n").map((each) => each.trim())) {
        const starts = line.startsWith("Scenario:") || line.startsWith("Scenario Outline:");
        if (starts || line === "" || line.startsWith("#")) {
            if (current !== undefined) {
                out.push(current.join(" "));
            }
            current = starts ? [line] : undefined;
        } else if (current !== undefined) {
            current.push(line);
        }
    }
    if (current !== undefined) {
        out.push(current.join(" "));
    }
    return out;
}

/**
 * Derives the criteria a bug gets when it gives none: what it expects.
 * @param kind the kind of work
 * @param field looks up the text under a field's headings
 * @returns the statements; none for a feature or a technical story, which must give their own
 */
const derivedStatements = (kind: Kind, field: (name: Field) => string | undefined): string[] => {
    if (kind === "bug") {
        return [field("expected") ?? ""];
    }
    return [];
};

/**
 * Checks a work item's markdown has what its kind needs and numbers its criteria AC-1, AC-2 and so on. A bug that
 * gives no acceptance criteria gets its expected behaviour instead.
 * @param text the work item's markdown
 * @param id the work item's id
 * @param kind its kind
 * @returns the checked work item
 * Fails: WorkItemIncomplete, naming every missing field.
 */
export const parseWorkItem = Effect.fn("WorkItem.parseWorkItem")(function* (text: string, id: string, kind: Kind) {
    const { title, byHeading } = partsOf(text);
    const field = (name: Field) => headings[name].map((heading) => byHeading.get(heading)).find((found) => found);
    const missing = requiredFields[kind].filter((name) => field(name) === undefined);
    if (missing.length > 0) {
        return yield* new WorkItemIncomplete({
            workItem: id,
            missing: missing.map((name) => `"${headings[name][0]}" section`),
        });
    }
    const given = statementsOf(field("criteria") ?? "");
    const scenarios = given.length > 0 ? [] : gherkinOf(text);
    const statements =
        given.length > 0 || scenarios.length > 0 ? [...given, ...scenarios] : derivedStatements(kind, field);
    const [first, ...rest] = statements.map((statement, i) => ({ ac: `AC-${i + 1}`, text: statement }));
    if (first === undefined) {
        return yield* new WorkItemIncomplete({ workItem: id, missing: ["acceptance criteria"] });
    }
    const workItem: WorkItem = {
        id,
        kind,
        title: title || id,
        criteria: [first, ...rest],
        ...kindFields(kind, field),
    };
    return workItem;
});
