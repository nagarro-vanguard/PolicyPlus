import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/*
 * A small made-up modernization: two capabilities in one area, three places of three kinds (one of them tests), five
 * rules (one in no capability, one shared by both capabilities), two journeys with their chosen ways, an architecture
 * of two domains, and a plan of three stories. Each test corrupts one thing.
 */

const context = {
    scope: "",
    inside: [],
    insideNotShown: 0,
    insideLabel: "",
    lookFirst: [],
    lookFirstNotShown: 0,
    layers: [],
    saves: [],
    reads: [],
    rules: [],
    rulesNotShown: 0,
    rulesTotal: 0,
    unconfirmed: [],
    notFollowed: [],
    commit: "",
    text: "",
};
const place = (file: string, line: number) => ({ file, firstLine: line, lastLine: line + 2 });
const rule = (id: string, says: string, line: number, extra: Record<string, unknown> = {}) => ({
    id,
    says,
    gates: false,
    place: place("src/rules.txt", line),
    alsoRestsOn: [],
    key: `src/rules.txt:${line}`,
    reading: "reviewed",
    why: "",
    reachedByTests: [],
    screens: [],
    context,
    ...extra,
});
const action = (
    id: string,
    name: string,
    surface: string,
    rules: string[],
    startedBy = "person",
    file = "src/one.txt",
) => ({
    id,
    name,
    purpose: `Does ${name}.`,
    startedBy,
    screen: name,
    key: `${file}#${name}`,
    surface,
    tooling: false,
    place: place(file, 1),
    path: [{ layer: "layer-1", depth: 0 }],
    rules,
    context,
});

/** Everything the fixture writes, as values a test may change before the files are written. */
export const inputs = () => {
    const capabilities = {
        "capability-a.json": {
            capability: { id: "cap-a", name: "Keeping records", purpose: "Keep the records people need." },
            area: "Records",
            layers: [
                {
                    id: "layer-1",
                    name: "What people use",
                    purpose: "",
                    evidence: [],
                    role: "facesPerson",
                    group: "ui",
                    blocks: 3,
                    sharedBlocks: 0,
                    actions: [
                        action("a1", "Save record", "src/one.txt", ["r1", "r2"]),
                        action("a2", "Open record", "src/one.txt", ["r3"]),
                    ],
                    rules: [
                        rule("r1", "A record needs a name.", 1, { reachedByTests: ["test/one.txt"] }),
                        rule("r2", "A record is saved only once.", 5),
                        rule("r3", "A record opens read only.", 9),
                    ],
                    shapes: [],
                    context,
                },
                {
                    id: "layer-2",
                    name: "Checks",
                    purpose: "",
                    evidence: [],
                    role: "facesOtherSystems",
                    group: "checks",
                    blocks: 1,
                    sharedBlocks: 0,
                    actions: [action("t1", "checks a record", "test/one.txt", ["r1"], "otherSystem", "test/one.txt")],
                    rules: [],
                    shapes: [],
                    context,
                },
            ],
            screens: [],
            surfaces: [],
            concerns: [],
            data: [{ id: "entity-1", name: "Record", access: "reads and saves", stores: [] }],
            gaps: [],
            openPoints: [{ statement: "Whether names may repeat.", why: "", ifWrong: "" }],
            totals: { actions: 3, rules: 3, blocks: 4, rulesOnNoScreen: 0 },
            context,
        },
        "capability-b.json": {
            capability: { id: "cap-b", name: "Sending records", purpose: "Send records to another system." },
            area: "Records",
            layers: [
                {
                    id: "layer-1",
                    name: "What people use",
                    purpose: "",
                    evidence: [],
                    role: "facesPerson",
                    group: "ui",
                    blocks: 1,
                    sharedBlocks: 0,
                    actions: [action("a3", "Send record", "src/two.txt", ["r3", "r4"], "otherSystem", "src/two.txt")],
                    rules: [
                        rule("r3", "A record opens read only.", 9),
                        rule("r4", "A sent record is marked sent.", 13),
                    ],
                    shapes: [],
                    context,
                },
            ],
            screens: [],
            surfaces: [],
            concerns: [],
            data: [],
            gaps: [],
            openPoints: [],
            totals: { actions: 1, rules: 2, blocks: 1, rulesOnNoScreen: 0 },
            context,
        },
    };
    const surface = (
        key: string,
        name: string,
        kind: string,
        product: boolean,
        capabilities: string[],
        actionIds: string[],
        rules: number,
        reachedByTests: string[] = [],
    ) => ({
        key,
        name,
        purpose: `${name} for people.`,
        kind,
        noun: { one: kind, many: `${kind}s` },
        unnamed: false,
        product,
        places: [key],
        files: [key],
        capabilities,
        actionIds,
        actions: actionIds.length,
        startedBy: { person: 0, schedule: 0, otherSystem: 0 },
        rules,
        reachedByTests,
        layersTouched: [],
        context,
    });
    const system = {
        name: "Sample",
        repository: "https://example.invalid/sample",
        commit: "0".repeat(40),
        purpose: "Sample keeps records. It sends them on.",
        capabilities: [
            {
                id: "cap-a",
                file: "capability-a.json",
                name: "Keeping records",
                purpose: "",
                screens: 1,
                actions: 3,
                rules: 3,
            },
            {
                id: "cap-b",
                file: "capability-b.json",
                name: "Sending records",
                purpose: "",
                screens: 1,
                actions: 1,
                rules: 2,
            },
        ],
        areas: [
            {
                id: "area-1",
                name: "Records",
                purpose: "Everything about records.",
                capabilities: ["cap-a", "cap-b"],
                context,
            },
        ],
        layers: [
            {
                id: "layer-1",
                name: "What people use",
                role: "facesPerson",
                purpose: "",
                group: "ui",
                blocks: 4,
                product: true,
                entryPoints: 3,
            },
            {
                id: "layer-2",
                name: "Checks",
                role: "facesOtherSystems",
                purpose: "",
                group: "checks",
                blocks: 1,
                product: false,
                entryPoints: 1,
            },
        ],
        screens: [],
        surfaces: [
            surface("src/one.txt", "Record page", "page", true, ["cap-a"], ["a1", "a2"], 3, ["test/one.txt"]),
            surface("src/two.txt", "Record service", "service", true, ["cap-b"], ["a3"], 2),
            surface("test/one.txt", "Record checks", "test", false, ["cap-a"], ["t1"], 1),
        ],
        unplaced: { entryPoints: [], why: "Every entry point is in a place." },
        rulesInNoCapability: {
            count: 1,
            rules: [
                {
                    id: "r9",
                    key: "src/rules.txt:30",
                    says: "Old records are never read.",
                    file: "src/rules.txt",
                    firstLine: 30,
                },
            ],
        },
        edges: [{ from: "layer-2", to: "layer-1", kind: "call", links: 1 }],
        entries: { person: 2, otherSystem: 2, schedule: 0 },
        externals: [
            {
                id: "external-1",
                name: "Mail service",
                kind: "outsideService",
                links: 1,
                reach: [{ layer: "layer-1", access: "call", links: 1 }],
            },
        ],
        gaps: { unresolvedLinks: 0, unattributedBlocks: 0 },
        context,
    };
    const knowledge = {
        parts: [
            {
                id: "part-1",
                name: "The program",
                kind: "program",
                purpose: "Runs it.",
                folders: ["src"],
                technologies: [],
                files: 2,
                product: true,
            },
            {
                id: "part-2",
                name: "Its checks",
                kind: "tests",
                purpose: "Checks it.",
                folders: ["test"],
                technologies: [],
                files: 1,
                product: false,
            },
        ],
        technologies: [],
        answers: [],
        assumptions: [],
        lifecycles: [
            {
                id: "lifecycle-1",
                entity: { id: "entity-1", name: "Record" },
                states: ["Draft", "Sent"],
                transitions: [{ from: [0], to: 1, file: "src/two.txt", line: 1 }],
            },
        ],
        partLinks: [],
        dataUse: [
            {
                capability: { id: "cap-a", name: "Keeping records" },
                entity: { id: "entity-1", name: "Record" },
                saves: true,
                reads: true,
            },
        ],
        figures: [
            {
                id: "figure-1",
                kind: "integration",
                question: "What does it reach?",
                caption: "It sends mail.",
                records: [],
            },
        ],
        entities: [
            { id: "entity-1", name: "Record", purpose: "What people keep.", stores: [], capabilities: ["cap-a"] },
        ],
        terms: [{ term: "Record", means: "What people keep.", from: "entity" }],
        risks: [
            {
                id: "risk-1",
                statement: "A record can be saved twice. Nothing stops it.",
                category: "data-integrity",
                categoryWords: "",
                severity: "high",
                subject: { kind: "system", id: "", name: "" },
                findings: [],
                places: { capabilities: [{ id: "cap-a", name: "" }], parts: [], files: [] },
            },
            {
                id: "risk-2",
                statement: "Mail can fail silently.",
                category: "operations",
                categoryWords: "",
                severity: "low",
                subject: { kind: "system", id: "", name: "" },
                findings: [],
                places: {
                    capabilities: [
                        { id: "cap-b", name: "" },
                        { id: "cap-a", name: "" },
                    ],
                    parts: [],
                    files: [],
                },
            },
        ],
    };
    const block = (id: string, name: string, file: string) => ({
        id,
        name,
        container: name,
        layer: "layer-1",
        file,
        firstLine: 1,
        lastLine: 3,
        capabilities: [],
    });
    const bundle = {
        blocks: [
            block("a1", "Save record", "src/one.txt"),
            block("a2", "Open record", "src/one.txt"),
            block("a3", "Send record", "src/two.txt"),
            block("t1", "checks a record", "test/one.txt"),
        ],
        links: [{ from: "a1", to: "a3", kind: "leadsTo" }],
        access: [],
        rules: ["r1", "r2", "r3", "r4", "r9"].map((id) => ({
            id,
            block: "a1",
            capabilities: [],
            reading: "reviewed",
            why: "",
            gates: "",
        })),
        lifecycles: [],
        controls: [],
        unreached: [],
    };
    const step = (
        id: string,
        intent: string,
        from: string[],
        honours: string[],
        changes?: { rule: string; to: string }[],
    ) => ({
        id,
        intent,
        system: `The system ${intent.toLowerCase()}`,
        confidence: "sure",
        touches: [],
        honours,
        ...(changes === undefined ? {} : { changes }),
        link: { _tag: "legacy", from, change: "kept", reason: "Same as today.", keeps: honours },
    });
    const target = {
        current: {
            tasks: [
                {
                    id: "keeping-records.keep-a-record",
                    outcome: "Keep a record.",
                    actor: "person",
                    actions: ["a1", "a2"],
                    rules: ["r1", "r2", "r3"],
                    facts: [],
                    needs: [],
                    current: [
                        { intent: "Save it", system: "Saves it", from: ["a1"], confidence: "sure" },
                        { intent: "Open it", system: "Opens it", from: ["a2"], confidence: "sure" },
                    ],
                },
                {
                    id: "sending-records.send-a-record",
                    outcome: "Send a record.",
                    actor: "person",
                    actions: ["a3"],
                    rules: ["r4"],
                    facts: [],
                    needs: [],
                    current: [{ intent: "Send it", system: "Sends it", from: ["a3"], confidence: "sure" }],
                },
            ],
        },
        journeys: [
            {
                id: "keeping-records.keep-a-record:one-step",
                task: "keeping-records.keep-a-record",
                actor: "person",
                name: "One step",
                strategy: "task first",
                idea: "Save and open in one go.",
                tradeoff: "Less control.",
                recommended: "Fewer steps.",
                steps: [
                    step(
                        "keeping-records.keep-a-record:one-step#1",
                        "Keep it",
                        ["a1", "a2"],
                        ["r1", "r3"],
                        [{ rule: "r3", to: "A record opens for editing." }],
                    ),
                ],
                drops: [{ actions: [], rules: ["r2"], reason: "Saving twice cannot happen any more." }],
                baseline: false,
            },
            {
                id: "sending-records.send-a-record:as-today",
                task: "sending-records.send-a-record",
                actor: "person",
                name: "As today",
                strategy: "guided",
                idea: "Send it.",
                tradeoff: "None.",
                steps: [step("sending-records.send-a-record:as-today#1", "Send it", ["a3"], ["r4"])],
                drops: [],
                baseline: true,
            },
        ],
        choiceJourneys: {
            decision: "journeys",
            picks: [
                { of: "keeping-records.keep-a-record", variant: "One step" },
                { of: "sending-records.send-a-record", variant: "As today" },
            ],
            reason: "Recommended.",
            confirmedAt: "2026-01-01T00:00:00.000Z",
        },
        architecture: {
            name: "Two parts",
            idea: "Records apart from sending.",
            tradeoff: "Two things to run.",
            risks: [{ statement: "Sending can lag.", kind: "accepted", cites: ["Sending"] }, "An older plain risk."],
            integrations: [{ need: "external-1", domain: "Sending", how: "It calls the mail service." }],
            domains: [
                {
                    name: "Records",
                    concept: "records",
                    facts: [{ name: "Record", from: ["entity-1"], keys: ["name"], relates: [] }],
                    rules: ["r1", "r3"],
                    dependsOn: [],
                    why: "x",
                },
                { name: "Sending", concept: "sending", facts: [], rules: ["r4"], dependsOn: ["Records"], why: "y" },
            ],
            containers: [
                {
                    name: "Application",
                    kind: "interface",
                    tech: "line one",
                    holds: ["Records", "Sending"],
                    does: "Lets people keep and send records.",
                    runsOn: "server",
                },
                { name: "Store", kind: "store", tech: "line two", holds: ["Records"] },
            ],
            components: [
                {
                    name: "Record keeper",
                    domain: "Records",
                    responsibility: "Keeps records.",
                    module: "record-keeper",
                    uses: ["Record sender"],
                    serves: ["keeping-records.keep-a-record:one-step#1"],
                    enforces: ["r1", "r3"],
                },
                {
                    name: "Record sender",
                    domain: "Sending",
                    responsibility: "Sends records.",
                    module: "record-sender",
                    uses: [],
                    serves: ["sending-records.send-a-record:as-today#1"],
                    enforces: ["r4"],
                    adapts: "external-1",
                },
            ],
        },
    };
    type Story = {
        title: string;
        what: string;
        why: string;
        actions: string[];
        terms: never[];
        criteria: { says: string; from: never[] }[];
        key: string;
        sequence: number;
        phase: number;
        epic: string;
        kind: string;
        builder: string;
        tags: string[];
        blockedBy: string[];
        builds: string[];
        reliesOn: { rule: string; builtBy: string }[];
        steps?: string[];
        components?: string[];
        layers?: string[];
    };
    const story = (key: string, sequence: number, kind: string, tags: string[], extra: Partial<Story>): Story => ({
        title: `Story ${sequence}`,
        what: "Something.",
        why: "Because.",
        actions: [],
        terms: [],
        criteria: [{ says: "Given a record, when saved, then it has a name.", from: [] }],
        key,
        sequence,
        phase: sequence === 1 ? 0 : 3,
        epic: sequence === 1 ? "area:codebase" : "journey:keeping-records.keep-a-record",
        kind,
        builder: sequence === 1 ? "scaffold-codebase" : "shape-and-deliver",
        tags,
        blockedBy: sequence === 1 ? [] : ["story-1"],
        builds: [],
        reliesOn: [],
        ...extra,
    });
    const plan = {
        analysis: { root: "", fingerprint: "" },
        layers: [
            {
                id: "layer-app",
                name: "Application",
                path: "apps/app",
                kind: "code",
                purpose: "the app",
                carries: [1],
                check: "true",
                dependsOn: [],
            },
            {
                id: "layer-store",
                name: "Store",
                path: "packages/store",
                kind: "code",
                purpose: "the store",
                carries: [2],
                check: "true",
                dependsOn: [],
            },
        ],
        decisions: [],
        epics: [
            {
                key: "area:codebase",
                kind: "technical",
                title: "Set up",
                outcome: "Set up.",
                area: "codebase",
                comesAfter: [],
                stories: ["story-1"],
                sequence: 1,
            },
            {
                key: "journey:keeping-records.keep-a-record",
                kind: "functional",
                title: "Keep a record.",
                outcome: "Kept.",
                task: "keeping-records.keep-a-record",
                comesAfter: ["area:codebase"],
                stories: ["story-2", "story-3"],
                sequence: 2,
            },
        ],
        phases: [
            { number: 0, name: "Set up the codebase", why: "First.", stories: ["story-1"] },
            { number: 3, name: "Journeys", why: "Then.", stories: ["story-2", "story-3"] },
        ],
        stories: [
            story("story-1", 1, "technical", ["story", "technical"], { layers: ["layer-app", "layer-store"] }),
            story("story-2", 2, "functional", ["story", "functional", "modernize"], {
                builds: ["r1", "r3"],
                steps: ["keeping-records.keep-a-record:one-step#1"],
                components: ["Record keeper"],
                layers: ["layer-app"],
            }),
            story("story-3", 3, "functional", ["story", "functional"], {
                builds: ["r4"],
                steps: ["sending-records.send-a-record:as-today#1"],
                components: ["Record sender"],
                layers: ["layer-app"],
            }),
        ],
        coverage: { capabilities: [], rulesBuilt: 3, rulesTotal: 4, unplanned: [] },
    };
    const prompts: { epics: Record<string, string>; scaffold: string; deliver: Record<string, string> } = {
        epics: { "area:codebase": "Create it.", "journey:keeping-records.keep-a-record": "Create it." },
        scaffold: "Scaffold it.",
        deliver: { "story-1": "Deliver it.", "story-2": "Deliver it.", "story-3": "Deliver it." },
    };
    const request = { sourceRoots: [], goals: "Run anywhere.", stack: ["language: one", "data: two"] };
    const source = { "src/rules.txt": Array.from({ length: 40 }, (_, number) => `line ${number + 1}`).join("\n") };
    return { system, capabilities, knowledge, bundle, target, plan, prompts, request, source, manifestVersion: 1 };
};

export type Inputs = ReturnType<typeof inputs>;

const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const put = (path: string, text: string) => {
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, text);
};

/**
 * Write the fixture to a new folder.
 * @param change a change to make to the inputs before they are written
 * @returns the folders to give compose
 */
export const writeFixture = (change: (inputs: Inputs) => void = () => {}) => {
    const given = inputs();
    change(given);
    const root = mkdtempSync(join(tmpdir(), "compose-fixture-"));
    const payloads = join(root, "analysis", "payloads");
    const source = join(root, "source");
    const files: { path: string; kind: string; text: string }[] = [
        { path: "system.json", kind: "system", text: json(given.system) },
        ...Object.entries(given.capabilities).map(([path, value]) => ({ path, kind: "capability", text: json(value) })),
        { path: "knowledge.json", kind: "knowledge", text: json(given.knowledge) },
        { path: "bundle.json", kind: "bundle", text: json(given.bundle) },
    ];
    for (const file of files) put(join(payloads, file.path), file.text);
    put(
        join(payloads, "manifest.json"),
        json({
            contractVersion: given.manifestVersion,
            writer: { skill: "code-analysis", version: "fixture" },
            files: files.map((file) => ({
                path: file.path,
                kind: file.kind,
                schema: `schema/${file.kind}.schema.json`,
                digest: createHash("sha1").update(file.text).digest("hex"),
            })),
        }),
    );
    put(join(root, "analysis", "work", "analysis-request.json"), json({ sourceRoots: [source], leaveOut: [] }));
    for (const [path, text] of Object.entries(given.source)) put(join(source, path), text);
    const run = join(root, "run");
    put(join(run, "target", "current.json"), json(given.target.current));
    put(join(run, "target", "journeys.json"), json(given.target.journeys));
    put(join(run, "target", "choice-journeys.json"), json(given.target.choiceJourneys));
    put(join(run, "target", "architecture.json"), json(given.target.architecture));
    put(join(run, ".modernization-backlog", "payloads", "plan.json"), json(given.plan));
    put(join(run, ".modernization-backlog", "payloads", "prompts.json"), json(given.prompts));
    put(join(run, "request.json"), json(given.request));
    put(join(run, "work-items", "attachments", "story-2.md"), "# Legacy reference\n\nThe rules it rests on.\n");
    return { root, payloads, run, source };
};
