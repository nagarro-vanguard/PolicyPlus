import type { KnowledgePayload } from "../model/schemas/knowledge-payload";
import type { CapabilityPayload } from "../model/schemas/payloads";
import type { SystemPayload } from "../model/schemas/system-payload";

type Place = { readonly file: string; readonly firstLine: number; readonly lastLine: number };
type Rule = CapabilityPayload["layers"][number]["rules"][number];
type Action = CapabilityPayload["layers"][number]["actions"][number];

type Section = { readonly heading: string; readonly lines: readonly string[] };

export type Bundle = {
    readonly kind: "screen" | "capability";
    readonly title: string;
    readonly sections: readonly Section[];
    readonly files: ReadonlyArray<{ readonly path: string; readonly why: string }>;
};

export type Payloads = {
    readonly system: SystemPayload;
    readonly capabilities: readonly CapabilityPayload[];
    readonly knowledge: KnowledgePayload;
};

/**
 * A place as `file:line`.
 * @param place the place
 * @returns the pointer
 */
const at = (place: Place) => `${place.file}:${place.firstLine}`;

const cannotKnow = [
    "Settings kept outside the code (environment values, database contents, secrets stores) are not here: check them before relying on a default.",
    "Code with no source in scope is not here: where a rule rests on it, the open points say so.",
    "Behaviour kept in the database (triggers, procedures, constraints) appears only where the code shows it.",
    "Nothing here was run: it was read from the code. A statement marked unconfirmed is an assumption, not a fact.",
];

/**
 * Add a file once, keeping the reason it was first added for.
 * @param files the files so far, by path
 * @param path the file
 * @param why the reason
 */
const addFile = (files: Map<string, string>, path: string, why: string) => {
    if (!files.has(path)) {
        files.set(path, why);
    }
};

/**
 * The rule as a bundle line: what it says, where it is decided, and what else it rests on.
 * @param rule the rule
 * @returns the line
 */
const ruleLine = (rule: Rule) =>
    `- ${rule.says} (${at(rule.place)}${rule.alsoRestsOn.length === 0 ? "" : `; also rests on ${rule.alsoRestsOn.map(at).join(", ")}`})`;

/**
 * The action as a bundle line: what it does, who starts it, and where.
 * @param action the action
 * @param layerName the name of the layer that holds it
 * @returns the line
 */
const actionLine = (action: Action, layerName: string) =>
    `- ${action.purpose} (started by ${action.startedBy === "otherSystem" ? "another system" : action.startedBy}; ${layerName}; ${at(action.place)})`;

/**
 * The risks whose findings lie in any of some files, as bundle lines.
 * @param knowledge what the analysis knows of the system as a whole
 * @param files the bundle's files
 * @returns the lines
 */
const riskLines = (knowledge: KnowledgePayload, files: ReadonlySet<string>) =>
    knowledge.risks
        .filter((risk) => risk.places.files.some((file) => files.has(file)))
        .map(
            (risk) =>
                `- [${risk.severity}] ${risk.statement} (${risk.categoryWords}; in ${risk.places.files.filter((file) => files.has(file)).join(", ")})`,
        );

/**
 * The files rules and actions are decided in, with the reason each is in the bundle.
 * @param files the files so far
 * @param rules the rules
 * @param actions the actions
 */
const addCodeFiles = (files: Map<string, string>, rules: readonly Rule[], actions: readonly Action[]) => {
    for (const action of actions) {
        addFile(files, action.place.file, "where a person's action starts");
    }
    for (const rule of rules) {
        addFile(files, rule.place.file, "decides a rule");
        for (const place of rule.alsoRestsOn) {
            addFile(files, place.file, "a rule rests on it");
        }
    }
};

/**
 * A kind of data as a bundle line.
 * @param kind the kind of data
 * @returns the line
 */
const dataLine = (kind: CapabilityPayload["data"][number]) =>
    `- ${kind.name}: ${kind.access}${kind.stores.length === 0 ? "" : `; kept in ${kind.stores.join(", ")}`}`;

/**
 * The sections both kinds of bundle share, over the capabilities they draw from.
 * @param capabilities the capabilities
 * @param files the bundle's files by path
 * @param payloads everything the analysis wrote
 * @returns the sections
 */
const sharedSections = (
    capabilities: readonly CapabilityPayload[],
    files: ReadonlyMap<string, string>,
    payloads: Payloads,
): Section[] => {
    const set = new Set(files.keys());
    const data = new Map(capabilities.flatMap((each) => each.data.map((kind) => [kind.id, dataLine(kind)] as const)));
    const concerns = new Map(
        capabilities.flatMap((each) =>
            each.concerns.map(
                (concern) => [concern.id, `- ${concern.name}: ${concern.purpose} (${concern.verdict})`] as const,
            ),
        ),
    );
    const points = capabilities.flatMap((each) =>
        each.openPoints.map((point) => `- ${point.statement} Why unsettled: ${point.why} If wrong: ${point.ifWrong}`),
    );
    const gaps = capabilities.flatMap((each) =>
        each.gaps.filter((gap) => set.has(gap.place.file)).map((gap) => `- ${gap.reason} (${at(gap.place)})`),
    );
    return [
        { heading: "Data it keeps", lines: [...data.values()] },
        { heading: "Shared mechanisms it leans on", lines: [...concerns.values()] },
        { heading: "Risks in this code", lines: riskLines(payloads.knowledge, set) },
        { heading: "Unconfirmed", lines: [...new Set(points)] },
        { heading: "Not followed", lines: [...new Set(gaps)] },
        { heading: "What the code cannot tell you", lines: cannotKnow },
    ];
};

/**
 * The bundle of one screen: what a person does there, every action and rule behind it, the data, the shared
 * mechanisms, the risks and what is unsettled, and the files to read, the screen's own first.
 * @param payloads everything the analysis wrote
 * @param key the screen's address
 * @returns the bundle; undefined when no screen has that address
 */
export const screenBundle = (payloads: Payloads, key: string): Bundle | undefined => {
    const screen = payloads.system.screens.find((each) => each.key === key);
    if (screen === undefined) {
        return undefined;
    }
    const capabilities = payloads.capabilities.filter((each) => screen.capabilities.includes(each.capability.id));
    const layers = capabilities.flatMap((each) => each.layers);
    const wanted = new Set(screen.actionIds);
    const actions = layers.flatMap((layer) =>
        layer.actions.filter((action) => wanted.has(action.id)).map((action) => ({ action, layer: layer.name })),
    );
    const ruleIds = new Set(actions.flatMap((entry) => entry.action.rules));
    const rules = new Map(
        layers.flatMap((layer) =>
            layer.rules.filter((rule) => ruleIds.has(rule.id)).map((rule) => [rule.id, rule] as const),
        ),
    );
    const files = new Map<string, string>();
    for (const file of screen.files) {
        addFile(files, file, "the screen itself");
    }
    addCodeFiles(
        files,
        [...rules.values()],
        actions.map((entry) => entry.action),
    );
    return {
        kind: "screen",
        title: screen.name,
        sections: [
            {
                heading: "What it is",
                lines: [
                    `Screen ${screen.name}${screen.purpose === "" ? "" : `: ${screen.purpose}`}`,
                    `Part of: ${capabilities.map((each) => each.capability.name).join(", ")}.`,
                ],
            },
            {
                heading: "What a person can do here",
                lines: actions.map((entry) => actionLine(entry.action, entry.layer)),
            },
            { heading: "Rules it applies", lines: [...rules.values()].map(ruleLine) },
            ...sharedSections(capabilities, files, payloads),
        ],
        files: [...files].map(([path, why]) => ({ path, why })),
    };
};

/**
 * The bundle of one capability: what it offers, its screens, every action and rule in every layer, the data, the
 * shared mechanisms, the risks and what is unsettled, and the files to read. Each screen has a bundle of its own to
 * work through in turn.
 * @param payloads everything the analysis wrote
 * @param id the capability's record id
 * @returns the bundle; undefined when no capability has that id
 */
export const capabilityBundle = (payloads: Payloads, id: string): Bundle | undefined => {
    const capability = payloads.capabilities.find((each) => each.capability.id === id);
    if (capability === undefined) {
        return undefined;
    }
    const actions = capability.layers.flatMap((layer) =>
        layer.actions.map((action) => ({ action, layer: layer.name })),
    );
    const rules = capability.layers.flatMap((layer) => layer.rules);
    const files = new Map<string, string>();
    addCodeFiles(
        files,
        rules,
        actions.map((entry) => entry.action),
    );
    const screens = payloads.system.screens.filter((screen) => screen.capabilities.includes(id));
    return {
        kind: "capability",
        title: capability.capability.name,
        sections: [
            {
                heading: "What it is",
                lines: [
                    `Capability ${capability.capability.name}: ${capability.capability.purpose}`,
                    ...(capability.area === "" ? [] : [`Area: ${capability.area}.`]),
                ],
            },
            {
                heading: "Its screens, each with a bundle of its own",
                lines: screens.map(
                    (screen) => `- ${screen.name}${screen.purpose === "" ? "" : `: ${screen.purpose}`} (${screen.key})`,
                ),
            },
            { heading: "What it does, by layer", lines: actions.map((entry) => actionLine(entry.action, entry.layer)) },
            { heading: "Rules it applies", lines: rules.map(ruleLine) },
            ...sharedSections([capability], files, payloads),
        ],
        files: [...files].map(([path, why]) => ({ path, why })),
    };
};

/**
 * A bundle as one text a person can paste: its sections, then the files it names, each with its reason and, where the
 * source is given, its whole text.
 * @param bundle the bundle
 * @param sourceOf the source text of a file by its path; undefined when it is not to be embedded
 * @returns the text
 */
export const bundleText = (bundle: Bundle, sourceOf: (path: string) => string | undefined) => {
    const parts = [
        `# ${bundle.kind === "screen" ? "Screen" : "Capability"}: ${bundle.title}`,
        "Ask: (say what you want done here: modernise to a target stack, rewrite, test or explain)",
        ...bundle.sections
            .filter((section) => section.lines.length > 0)
            .map((section) => `## ${section.heading}\n${section.lines.join("\n")}`),
        `## Files to read (${bundle.files.length})\n${bundle.files.map((file) => `- ${file.path}: ${file.why}`).join("\n")}`,
        ...bundle.files.flatMap((file) => {
            const source = sourceOf(file.path);
            return source === undefined ? [] : [`### ${file.path}\n\`\`\`\n${source}\n\`\`\``];
        }),
    ];
    return `${parts.join("\n\n")}\n`;
};
