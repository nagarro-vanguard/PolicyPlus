import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { Effect } from "effect";
import { appendRecords } from "../../core/record-files";
import { servicesLayer } from "../../core/services";
import { workItems, writeFiles } from "./codebase-fixture";
import { present } from "./fixtures";

/** The four profiles a story is delivered in: a feature with no screens, a bug, a technical story, and a feature's design. */
export type Profile = "feature" | "bug" | "technical" | "design";

/** What a story of one profile changes, and the story itself, so one set of scripted agents can deliver any of them. */
export type Scenario = {
    readonly profile: Profile;
    /** The story as the driver writes it to a file from the tracker: `# <title>`, then its body. */
    readonly story: string;
    /** The one step of the story's path: the file it runs through, and whether that file exists today. */
    readonly step: { readonly file: string; readonly status: "changes" | "new" };
    /** The whole new text of each file the plan proposes, by path. */
    readonly code: Readonly<Record<string, string>>;
    /** The proposed files that do not exist today; the others modify a file. */
    readonly added: readonly string[];
    /** The files the plan deletes; each exists today. */
    readonly deletes?: readonly string[];
    /** The proposed acceptance test: its file, in a test layer, and its text. A design proposes none. */
    readonly test?: { readonly file: string; readonly text: string };
    /** Whether the plan records a design decision, as a design must. */
    readonly decides: boolean;
};

/** The number the story has in the tracker, which its branch and its run folder carry. */
export const storyNumber = "24";

/** The tracker address of the story. */
export const storyUrl = `https://tracker.example/o/r/issues/${storyNumber}`;

/**
 * A fixture work item, which has its title on its first line, as the story file the driver writes.
 * @param kind which fixture work item
 * @returns the story file's text
 */
/** The tags the driver reads from the tracker for each kind of fixture story. */
const tagsOf = { feature: "story, functional", bug: "story, bug", technical: "story, technical" } as const;

const storyOf = (kind: "feature" | "bug" | "technical") => {
    const [title = "", ...body] = present(workItems[kind], "the work item").split("\n");
    return `---\ntags: ${tagsOf[kind]}\n---\n# ${title}\n${body.join("\n")}\n`;
};

/** The variants root the fixture's screens layer declares, for this story. */
const variants = `apps/web/src/routes/design/${storyNumber}`;

const designStory = `---
tags: story, functional, prototypes
---
# Runs list screens

## Screens

- The runs list

## Acceptance criteria

1. Given runs, when I open Runs, then they are listed.
`;

const fixed = "export const runs = ['FIXED'];\n";

/** The story of each profile and what its plan proposes: the fixture codebase's `runs.ts`, or, for a design, variants of its screen. */
export const scenarios: Readonly<Record<Profile, Scenario>> = {
    feature: {
        profile: "feature",
        story: storyOf("feature"),
        step: { file: "apps/api/runs.ts", status: "changes" },
        code: { "apps/api/runs.ts": fixed },
        added: [],
        test: { file: "tests/e2e/runs.spec", text: "runs are listed\n" },
        decides: false,
    },
    bug: {
        profile: "bug",
        story: storyOf("bug"),
        step: { file: "apps/api/runs.ts", status: "changes" },
        code: { "apps/api/runs.ts": fixed },
        added: [],
        test: { file: "tests/e2e/runs.spec", text: "runs are listed\n" },
        decides: false,
    },
    technical: {
        profile: "technical",
        story: storyOf("technical"),
        step: { file: "apps/api/runs.ts", status: "changes" },
        code: { "apps/api/runs.ts": "export const runs: string[] = [];\n" },
        added: [],
        test: { file: "tests/e2e/runs.spec", text: "PIN: runs are listed\n" },
        decides: false,
    },
    design: {
        profile: "design",
        story: designStory,
        step: { file: `${variants}/a/page.tsx`, status: "new" },
        code: {
            [`${variants}/a/page.tsx`]: "export const A = () => 'a table of runs';\n",
            [`${variants}/b/page.tsx`]: "export const B = () => 'cards of runs';\n",
            [`${variants}/index.tsx`]: "export const Compare = () => 'a, b';\n",
        },
        added: [`${variants}/a/page.tsx`, `${variants}/b/page.tsx`, `${variants}/index.tsx`],
        decides: true,
    },
};

/** Where the design's picked variant goes. */
export const pickedPlace = "apps/web/src/routes/runs";

/** The feature built once the design's variant is picked: the same story, and the picked variant's page changed. */
export const builtAfterDesign: Scenario = {
    profile: "feature",
    story: designStory,
    step: { file: `${pickedPlace}/page.tsx`, status: "changes" },
    code: { [`${pickedPlace}/page.tsx`]: "export const A = () => 'a table of runs, with a filter';\n" },
    added: [],
    test: { file: "tests/e2e/runs.spec", text: "PIN: runs are listed\n" },
    decides: false,
};

/** A scripted agent: given its dispatch's named arguments and its round for this job (1 for its first), it writes the output its brief demands. */
export type DeliveryAgent = (args: Readonly<Record<string, string>>, round: number) => Promise<void>;

/** The scripted agent for each job a run hands out. */
export type DeliveryAgents = Readonly<Record<string, DeliveryAgent>>;

/**
 * A dispatch's named argument.
 * @param args the dispatch's named arguments
 * @param name the argument
 * @returns its value; throws when the dispatch does not give it, since the scripted agent then cannot do its job
 */
const arg = (args: Readonly<Record<string, string>>, name: string) => {
    const value = args[name];
    if (value === undefined) {
        throw new Error(`the dispatch gives no ${name}; it gives ${Object.keys(args).join(", ")}`);
    }
    return value;
};

/**
 * Append one record to an agent's output as `append-records` does, in-process.
 * @param type the record's type
 * @param path the records file
 * @param record its properties
 * @returns the ids of what was written
 */
const append = (type: string, path: string, record: Readonly<Record<string, unknown>>) =>
    Effect.runPromise(appendRecords(type, path, JSON.stringify(record)).pipe(Effect.provide(servicesLayer)));

/**
 * Write a file as an agent does, making its folder.
 * @param path the file
 * @param text its text
 */
const put = (path: string, text: string) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
};

/**
 * What a plan agent hands back: its notes, as markdown.
 * @param args the dispatch's named arguments
 * @param text what the agent says it did
 * @returns nothing
 */
const handBack = (args: Readonly<Record<string, string>>, text: string) => put(arg(args, "handBackPath"), text);

/**
 * The agent that reads a story from the tracker: it writes the work item as the story file gave it.
 * @param scenario the story's profile
 * @returns the agent
 */
const fetchWorkItem =
    (scenario: Scenario): DeliveryAgent =>
    (args) => {
        put(arg(args, "outputPath"), scenario.story);
        return Promise.resolve();
    };

/**
 * The orientation: no knowledge base to read, one entity touched, one question.
 * @returns the agent
 */
const orient = (): DeliveryAgent => async (args) => {
    const output = arg(args, "outputPath");
    await append("EntityTouched", output, { entity: "Run", how: "read", states: "-", acs: ["AC-1"] });
    await append("Question", output, {
        question: "What is a Run?",
        whyItMatters: "The knowledge base does not say.",
        recommended: "One execution of a skill.",
    });
    handBack(args, "Oriented without a knowledge base.");
};

/**
 * The trace: it hands back nothing on its first round, so its gate sends it back once.
 * @param scenario the story's profile
 * @returns the agent
 */
const trace =
    (scenario: Scenario): DeliveryAgent =>
    async (args, round) => {
        if (round > 1) {
            handBack(args, "Traced the runs endpoint.\n\nGuessed: the list is the way in.");
            return;
        }
        const output = arg(args, "outputPath");
        await append("PathStep", output, {
            ac: "AC-1",
            order: 1,
            name: "runs endpoint",
            file: scenario.step.file,
            ...(scenario.step.status === "changes" ? { lines: { first: 1, last: 1 } } : {}),
            status: scenario.step.status,
            start: "A caller sends GET /runs",
        });
        await append("Question", output, {
            question: "Show archived runs?",
            whyItMatters: "It adds a filter.",
            recommended: "No.",
        });
    };

/**
 * The code changes: every file of the plan, whole, with its record, and a design decision where the profile owes one.
 * @param scenario the story's profile
 * @returns the agent
 */
const changes =
    (scenario: Scenario): DeliveryAgent =>
    async (args) => {
        const output = arg(args, "outputPath");
        writeFiles(arg(args, "filesFolder"), scenario.code);
        for (const path of Object.keys(scenario.code)) {
            await append("ChangedFile", output, {
                path,
                action: scenario.added.includes(path) ? "add" : "modify",
                steps: ["step-1"],
                reason: "List the runs.",
            });
        }
        for (const path of scenario.deletes ?? []) {
            await append("ChangedFile", output, { path, action: "delete", steps: ["step-1"], reason: "Retire it." });
        }
        if (scenario.decides) {
            await append("DesignDecision", output, {
                about: ["AC-1"],
                decision: "Two variants of the list: a table and cards.",
                instead: "One variant.",
                because: "The story leaves the look of the list open.",
                costs: "Two screens to build, one to throw away.",
            });
        }
        handBack(args, "Changed the runs; no doubt.");
    };

/**
 * The acceptance tests: one end-to-end test for the criterion.
 * @param test the proposed test
 * @returns the agent
 */
const tests =
    (test: NonNullable<Scenario["test"]>): DeliveryAgent =>
    async (args) => {
        writeFiles(arg(args, "filesFolder"), { [test.file]: test.text });
        await append("AcceptanceTest", arg(args, "outputPath"), {
            ac: "AC-1",
            file: test.file,
            title: "runs are listed",
            outcome: "The runs are listed.",
        });
        handBack(args, "One e2e test for AC-1.");
    };

/**
 * A review: one note about what it read, and its hand-back.
 * @param about what the finding is about: a record of the plan, or for a change review a file
 * @param evidence where it shows
 * @returns the agent
 */
const review =
    (about: string, evidence: string): DeliveryAgent =>
    async (args) => {
        await append("Finding", arg(args, "outputPath"), {
            about: [about],
            weight: "note",
            says: "Fine.",
            evidence: [evidence],
            fix: "None.",
        });
        handBack(args, "Read every record; nothing to send back.");
    };

/**
 * The scripted agents of a plan, for any profile: they write what each job's brief demands and pass its gate.
 * @param scenario the story's profile
 * @returns the scripted agent for each plan job
 */
export const planAgents = (scenario: Scenario): DeliveryAgents => ({
    "work-item": fetchWorkItem(scenario),
    orient: orient(),
    trace: trace(scenario),
    changes: changes(scenario),
    ...(scenario.test === undefined ? {} : { tests: tests(scenario.test) }),
    "plan-review": review("change-1", `${scenario.step.file}:1`),
});

/**
 * The scripted agents of a build: the plan's, and the change review, which reads the first file the plan changed.
 * @param scenario the story's profile
 * @returns the scripted agent for each job of a plan or a build
 */
export const buildAgents = (scenario: Scenario): DeliveryAgents => {
    const [first = scenario.step.file] = Object.keys(scenario.code);
    return { ...planAgents(scenario), "change-review": review(first, `${first}:1`) };
};
