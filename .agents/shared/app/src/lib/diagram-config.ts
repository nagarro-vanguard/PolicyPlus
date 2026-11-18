import { z } from "zod";

const Settings = z.object({
    place: z.enum(["system", "capability", "screen"]),
    title: z.string(),
    question: z.string(),
    legend: z.string(),
    needs: z.record(z.string(), z.number().int().min(1)),
    renderer: z.enum(["html", "svg", "flow"]),
    layout: z.object({ algorithm: z.enum(["layered", "radial"]), direction: z.enum(["DOWN", "RIGHT"]) }).optional(),
    budget: z.object({ nodes: z.number().int().min(2), labelLines: z.number().int().min(1).max(3) }).optional(),
});

export type DiagramId =
    | "landscape"
    | "tiers"
    | "context"
    | "capability-layers"
    | "screen-trace"
    | "parts"
    | "integration"
    | "states"
    | "data";

export type DiagramSettings = z.infer<typeof Settings>;

// Which diagram goes where, what a place must hold for it to be drawn, how it is laid out and drawn, and how many nodes
// it may hold before it groups. Changing a diagram's drawing or threshold is an edit here, never in a page.
const config: Record<DiagramId, DiagramSettings> = {
    landscape: {
        place: "system",
        title: "What the product offers",
        question: "What does the product do for the people who use it, and how are its capabilities grouped?",
        legend: "Each card is a capability; the counts are its screens, the actions a person or system can start, and the business rules decided in its code.",
        needs: { capabilities: 2 },
        renderer: "html",
    },
    tiers: {
        place: "system",
        title: "How the system is layered",
        question: "Which layers does the system have and how do they depend on each other?",
        legend: "A layer is a group of code with one job. Each arrow is one layer using another, and the number is how many calls it makes. Layers near the top are used from outside; those near the bottom are used by the rest.",
        needs: { layerLinks: 1 },
        renderer: "flow",
        layout: { algorithm: "layered", direction: "DOWN" },
        budget: { nodes: 14, labelLines: 2 },
    },
    context: {
        place: "system",
        title: "What the system connects to",
        question: "Who or what starts work here, and which outside systems and stores does it use?",
        legend: "Each arrow joins the thing that starts work or is used to the system; where a number shows it is how many calls the code makes.",
        needs: { externals: 1 },
        renderer: "svg",
        layout: { algorithm: "layered", direction: "RIGHT" },
        budget: { nodes: 14, labelLines: 2 },
    },
    "capability-layers": {
        place: "capability",
        title: "How this capability runs",
        question: "Which layers do its flows cross, and what data does it read or keep?",
        legend: "Between layers, the number is how many actions go from one layer to the next. To data, it is how many actions save or read it.",
        needs: { layers: 1 },
        renderer: "svg",
        layout: { algorithm: "layered", direction: "RIGHT" },
        budget: { nodes: 14, labelLines: 2 },
    },
    "screen-trace": {
        place: "screen",
        title: "What this screen starts",
        question: "What does each action on this screen run through, and what data does it read or save?",
        legend: "An action points to the layer it starts in. Numbers say how many of this screen's actions take that step or save or read that data.",
        needs: { actions: 1 },
        renderer: "svg",
        layout: { algorithm: "layered", direction: "RIGHT" },
        budget: { nodes: 14, labelLines: 2 },
    },
    parts: {
        place: "system",
        title: "What the system is made of",
        question: "What is the system made of, and which parts use which?",
        legend: "Each box is a part: something that is built, run or shipped. An arrow is one part using another, with how many links the code makes. Parts that are only tests are left out.",
        needs: { parts: 2 },
        renderer: "svg",
        layout: { algorithm: "layered", direction: "RIGHT" },
        budget: { nodes: 14, labelLines: 2 },
    },
    integration: {
        place: "system",
        title: "What the parts reach outside the system",
        question: "Which outside systems and stores does each part use, and how?",
        legend: "An arrow joins a part to an outside system it uses; the words say how, and the number is how many links the code makes.",
        needs: { externals: 1 },
        renderer: "svg",
        layout: { algorithm: "layered", direction: "RIGHT" },
        budget: { nodes: 14, labelLines: 2 },
    },
    states: {
        place: "system",
        title: "How this data changes over time",
        question: "Which states can one record be in, and what moves it from one to the next?",
        legend: "Each box is a state. An arrow is a change the code makes, with the number of places in the code that make it. The first box shows where a record is created.",
        needs: { lifecycles: 1 },
        renderer: "svg",
        layout: { algorithm: "layered", direction: "DOWN" },
        budget: { nodes: 14, labelLines: 2 },
    },
    data: {
        place: "system",
        title: "Which capability keeps which data",
        question: "Which capabilities save and which only read each kind of data?",
        legend: "A row is a kind of data and a column a capability. S means the capability saves it, R that it reads it.",
        needs: { kinds: 2 },
        renderer: "html",
    },
};

export const diagrams: Readonly<Record<DiagramId, DiagramSettings>> = z
    .record(z.string(), Settings)
    .parse(config) as Record<DiagramId, DiagramSettings>;

const nouns: Record<string, string> = {
    capabilities: "capabilities",
    layerLinks: "links between layers",
    externals: "outside systems",
    layers: "layers",
    actions: "actions",
    parts: "parts",
    lifecycles: "kinds of data with states",
    kinds: "kinds of data",
};

/**
 * Whether a place holds enough for a diagram, and if not the count that fell short.
 * @param id the diagram
 * @param facts what is counted about the place, by name
 * @returns whether it is drawn and, when not, why
 */
export const applies = (id: DiagramId, facts: Readonly<Record<string, number>>) => {
    for (const [name, atLeast] of Object.entries(diagrams[id].needs)) {
        const held = name in facts ? facts[name] : 0;
        if (held === undefined || held < atLeast) {
            return {
                drawn: false,
                reason: `needs at least ${atLeast} ${name}; this ${diagrams[id].place} has ${held}`,
            };
        }
    }
    return { drawn: true, reason: "" };
};
