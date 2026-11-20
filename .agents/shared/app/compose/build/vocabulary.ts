import { ComposeError } from "../errors";

/*
 * The words of the case's views, written on the producing side so the app prints and holds none: what each kind of
 * line says, what each kind of box and frame is called, and the question each default view answers. A value no table
 * holds fails the build instead of printing a stored word.
 */

const lookup = (table: Readonly<Record<string, string>>, what: string) => (value: string) => {
    const words = table[value];
    if (words === undefined)
        throw new ComposeError("build", `a view holds ${what} "${value}", which compose has no words for`);
    return words;
};

/** What each kind of line says; every kind of line a view draws is one of these. */
export const relationWords = lookup(
    {
        call: "calls",
        dispatches: "hands work to",
        renders: "shows",
        request: "sends requests to",
        reads: "reads",
        saves: "saves",
        "reads and saves": "reads and saves",
        leadsTo: "leads to",
        uses: "uses",
        becomes: "becomes",
        keeps: "keeps its data in",
        reaches: "reaches",
    },
    "a line of the kind",
);

/** The frame of a layer, by the group the analysis gives it. */
export const layerGroupWords = lookup(
    {
        ui: "Faces people",
        api: "Faces other systems", // allowed by the neutrality scan: the analysis stores this group value
        data: "Reaches stored data",
        batch: "Runs on a schedule or as tooling",
        mixed: "Faces people and other systems",
        logic: "Decides",
        checks: "Checks the code",
    },
    "a layer group",
);

/** What a kind of outside system is called, for one box and for the frame of several. */
export const outsideKindWords = lookup(
    {
        dataStore: "Data store",
        messaging: "Messaging service",
        outsideService: "Outside service",
        library: "Code kept elsewhere",
    },
    "an outside system of the kind",
);
export const outsideFrameWords = lookup(
    {
        dataStore: "Data stores",
        messaging: "Messaging services",
        outsideService: "Outside services",
        library: "Code kept elsewhere",
    },
    "an outside system of the kind",
);
/** The style of a box for an outside system: a store looks like one. */
export const outsideStyle = (kind: string): "store" | "outside" => {
    outsideKindWords(kind);
    return kind === "dataStore" ? "store" : "outside";
};

/** What a part of today is, by the kind the analysis gives it. */
export const partKindWords = lookup(
    {
        program: "Program",
        site: "Site",
        service: "Service",
        database: "Database",
        library: "Library",
        tool: "Tool",
        tests: "Tests",
    },
    "a part of the kind",
);

/** What a part of the new system is, by its kind. */
export const containerKindWords = lookup(
    {
        interface: "Used by people or other systems",
        service: "Runs logic",
        job: "Runs in the background",
        store: "Holds data",
        library: "Shared code",
    },
    "a part of the kind",
);

/** What a component of the new system is, by its kind. */
export const componentKindWords = lookup(
    {
        rules: "Decides rules",
        adapter: "Reaches an outside system",
        data: "Keeps data",
        flow: "Carries a step through",
        interface: "Where people take part",
    },
    "a component of the kind",
);

export const words = {
    system: "This system",
    capability: "Capability",
    layer: "Layer",
    kindOfData: "Kind of data",
    state: "State",
    domain: "Domain",
    anotherDomain: "Another domain",
    capabilities: "Capabilities",
    dataItKeeps: "Data it keeps",
    domains: "Domains",
    parts: "Parts of the system",
    unstatedPlace: "Where it runs is not stated",
};

/** The question each default view answers; an agent's own question replaces it. */
export const questions = {
    layers: "How is the code layered?",
    integration: "What does it reach outside itself?",
    parts: "What is it made of?",
    data: "Which capabilities keep which data?",
    states: "How does the data change over time?",
    functional: "What does the system do?",
    targetFunctional: "How is the new system cut into domains?",
    targetDeployment: "Where does each part of the new system run?",
    targetIntegration: "What does the new system reach outside itself?",
    targetInformation: "Which part keeps the data of which domain?",
    inside: (domain: string) => `What is inside ${domain}?`,
    variantDeployment: "Where does each part of this option run?",
};
