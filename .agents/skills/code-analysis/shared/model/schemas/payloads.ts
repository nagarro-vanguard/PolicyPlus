import { Schema } from "effect";
import { CrossCuttingConcern } from "./briefing";
import { Text, about } from "../shared-fields";
import { CapabilitySurface } from "./surface-kind";

export const Count = Schema.Int.check(Schema.isGreaterThanOrEqualTo(0));

export const ContextShape = Schema.Struct({
    scope: Text.annotate(about("What the place is, in one sentence: its kind, its name and what it is for.")),
    inside: Schema.Array(Schema.String).annotate(
        about(
            "For a place that is a map (the system, an area, a capability, a screen): what lies inside it, one line each. Capped, with the count left out in `insideNotShown`; empty for a place with nothing inside it.",
        ),
    ),
    insideNotShown: Count.annotate(about("How many lines were left out of `inside`.")),
    insideLabel: Schema.String.annotate(about("What `inside` lists, as a heading; empty when `inside` is empty.")),
    lookFirst: Schema.Array(Schema.String).annotate(
        about(
            "Where to look first, as pointers and never a dump: the place the work starts as `file:line`, then the files the code is in with its own first and the shared ones after, the most widely shared first. Capped, with the count left out in `lookFirstNotShown`.",
        ),
    ),
    lookFirstNotShown: Count.annotate(about("How many pointers were left out of `lookFirst`.")),
    layers: Schema.Array(Schema.String).annotate(
        about(
            "For a screen: the layers it uses, one line each with what the layer does, `file:line` and how many of the screen's rules it decides, after where to look first; empty for any other place.",
        ),
    ),
    saves: Schema.Array(Schema.String).annotate(about("The kinds of data the place's code saves, by name.")),
    reads: Schema.Array(Schema.String).annotate(about("The kinds of data the place's code reads, by name.")),
    rules: Schema.Array(Schema.String).annotate(
        about(
            "The first rules decided there, each as its sentence with `file:line`; the rest are counted in `rulesNotShown`.",
        ),
    ),
    rulesNotShown: Count.annotate(about("How many rules were left out of `rules`.")),
    rulesTotal: Count.annotate(about("How many rules are decided in the place's code, all told.")),
    unconfirmed: Schema.Array(Schema.String).annotate(
        about(
            "What the code does not settle, as the capability's open points: what is assumed, and what would change if it is wrong. Capped.",
        ),
    ),
    notFollowed: Schema.Array(Schema.String).annotate(
        about(
            "The links in the place's code that reach nothing the code shows, each with what the code does show of where it goes. Capped.",
        ),
    ),
    commit: Schema.String.annotate(
        about("The commit the analysis describes, or a statement that it was not recorded."),
    ),
    text: Text.annotate(
        about(
            "The same context as plain text, compiled once by the analysis so every medium copies the same words. It has the lines in a fixed order, an `Ask:` line left for the reader to fill, and contains no record ids.",
        ),
    ),
}).annotate(
    about(
        "What a tool that reads code needs to continue from one place and no other: a map with pointers, capped, with a count of what was left out, in a fixed order. Every place has one, from the whole system down to a single rule.",
    ),
);

const Place = Schema.Struct({
    file: Schema.String.annotate(about("The file, relative to the source root.")),
    firstLine: Count.annotate(about("The first line of the place.")),
    lastLine: Count.annotate(about("The last line of the place.")),
}).annotate(about("Where something is in the code."));

const Action = Schema.Struct({
    id: Schema.String.annotate(about("The entry point's block record id.")),
    name: Schema.String.annotate(
        about("The entry point's name as the code writes it; empty when the code gives none."),
    ),
    purpose: Text.annotate(about("What it does, in one line, as the Map wrote it.")),
    startedBy: Schema.String.annotate(about("Who starts it: person, schedule or otherSystem.")),
    screen: Schema.String.annotate(about("The screen that holds it (its container); empty when it has none.")),
    key: Schema.optionalKey(
        Schema.String.annotate(
            about(
                "The entry point's key, which stays the same when a stage is run again from nothing: its file, `#`, and its class and routine as the code writes them (its first line when the code names none; `@<line>` added when two share a key). Prefer it to `id` when holding a reference across runs.",
            ),
        ),
    ),
    surface: Schema.optionalKey(
        Schema.String.annotate(
            about(
                "The key of the place (surface) that holds it, in the system payload's `surfaces`; absent when it is unplaced.",
            ),
        ),
    ),
    address: Schema.optionalKey(
        Schema.String.annotate(
            about(
                "For a web page or service operation: the address or route it is reached at, copied from how it is reached and kept only when it stands, character for character, in the lines that show it starts.",
            ),
        ),
    ),
    tooling: Schema.optionalKey(
        Schema.Boolean.annotate(
            about(
                "Whether tests or tooling start it rather than the product's users: true for a test, a build step, or an entry point in a tests or tool part.",
            ),
        ),
    ),
    place: Place,
    path: Schema.Array(
        Schema.Struct({
            layer: Schema.String.annotate(about("The layer's record id.")),
            depth: Count.annotate(
                about("The fewest links from the entry point to a block of this layer; 0 is its own layer."),
            ),
        }).annotate(about("One layer the entry point's flow reaches.")),
    ).annotate(about("The layers the entry point's flow reaches, in the order the flow first meets them.")),
    rules: Schema.Array(Schema.String).annotate(
        about(
            "The record ids of the rules decided in code the entry point's flow reaches, each once; the rules themselves are under their layers.",
        ),
    ),
    context: ContextShape,
}).annotate(about("One thing a person, a schedule or another system starts in this capability, in this layer."));

const Rule = Schema.Struct({
    id: Schema.String.annotate(about("The rule's record id.")),
    says: Text.annotate(about("The rule, as one sentence.")),
    gates: Schema.Boolean.annotate(about("Whether it decides a change of state of a kind of data.")),
    place: Place,
    alsoRestsOn: Schema.Array(Place).annotate(about("Further lines the rule rests on, besides where it is decided.")),
    key: Schema.optionalKey(
        Schema.String.annotate(
            about(
                "The rule's key, which stays the same when a stage is run again from nothing and the rule says the same: `<file>:<first line>#` and a short digest of its words.",
            ),
        ),
    ),
    reading: Schema.optionalKey(
        Schema.Literals(["reviewed", "corrected", "disputed", "unread"]).annotate(
            about(
                "Where a second reading left the rule: reviewed, corrected, disputed (challenged and unchanged since) or unread. A disputed rule's doubt is in its context's `unconfirmed`.",
            ),
        ),
    ),
    why: Schema.optionalKey(
        Schema.String.annotate(about("The reviewer's words when the rule is disputed; empty otherwise.")),
    ),
    reachedByTests: Schema.optionalKey(
        Schema.Array(Schema.String).annotate(
            about(
                "The keys of the test suites whose tests reach the code that decides it. Reaching is not checking: a test may pass through without asserting the rule.",
            ),
        ),
    ),
    screens: Schema.Array(Schema.String).annotate(
        about(
            "The screens whose actions reach the code that decides it, by name; empty only when no action of a named screen reaches it.",
        ),
    ),
    context: ContextShape,
}).annotate(about("One business rule decided in this layer by code this capability reaches."));

const Shape = Schema.Struct({
    id: Schema.String.annotate(about("The data definition's record id.")),
    name: Schema.String.annotate(about("The shape's declared name.")),
    fields: Schema.Array(Schema.String).annotate(about("The names of the fields it declares, in order.")),
}).annotate(about("One shape of data this capability's kinds of data are declared as, in this layer."));

const Layer = Schema.Struct({
    id: Schema.String.annotate(about("The layer's record id.")),
    name: Schema.String.annotate(about("The layer's name in plain words.")),
    purpose: Text.annotate(about("What the layer does for the system, as the layer record states it.")),
    evidence: Schema.Array(Place).annotate(
        about("Lines of the analysed code that show the layer, as the layer record cites them."),
    ),
    role: Schema.String.annotate(
        about(
            "What the layer does at the system's boundary, derived from the code: facesPerson, facesOtherSystems, runsOnSchedule, runsAsTooling, checksCode (every block is test code, which checks the rest), mixedEntry, reachesStore or decides.",
        ),
    ),
    group: Schema.Literals(["ui", "api", "data", "batch", "mixed", "logic", "checks"]).annotate(
        about(
            "The group a modernization reads the layer under, from its role: facesPerson is ui, facesOtherSystems api, reachesStore data, runsOnSchedule and runsAsTooling (entry points that are build or install scripts) batch, checksCode checks, mixedEntry mixed, decides logic. A group no layer fills is simply absent.",
        ),
    ),
    blocks: Count.annotate(about("How many blocks the capability's flows reach in this layer.")),
    sharedBlocks: Count.annotate(about("How many of those blocks another capability's flows reach too.")),
    actions: Schema.Array(Action).annotate(about("The capability's entry points in this layer.")),
    rules: Schema.Array(Rule).annotate(
        about("The rules decided in this layer by code the capability reaches, each once."),
    ),
    shapes: Schema.Array(Shape).annotate(
        about("The shapes of data declared in this layer for the capability's kinds of data."),
    ),
    context: ContextShape,
}).annotate(about("One layer a capability's flows run through, with what the capability does and decides in it."));

const Control = Schema.Struct({
    name: Schema.String.annotate(about("The control's name as the layout declares it.")),
    declaredAs: Schema.String.annotate(about("What the layout declares of it: type, caption and limits.")),
}).annotate(about("One control of a screen."));

export const LayerTouched = Schema.Struct({
    layerId: Schema.String.annotate(about("The layer's record id.")),
    actions: Count.annotate(about("How many of the screen's actions pass through the layer, as their paths show.")),
    rules: Count.annotate(
        about(
            "How many of the screen's distinct rules are decided in the layer; a rule is counted once, under the one layer that decides it.",
        ),
    ),
    sharedRules: Count.annotate(about("How many of those rules are reached by more than one of the screen's actions.")),
}).annotate(
    about(
        "One layer a screen touches: the layers its actions pass through and the layers that decide the rules its actions reach, in flow order (person-facing first, store last).",
    ),
);

const Screen = Schema.Struct({
    name: Schema.String.annotate(about("The screen's class or view name; empty for entry points no container holds.")),
    actions: Count.annotate(about("How many of the capability's entry points the screen holds.")),
    controls: Schema.Array(Control).annotate(
        about("The screen's controls, from its layout definition; none when no layout was read."),
    ),
    layersTouched: Schema.Array(LayerTouched).annotate(
        about("The layers the screen touches for this capability, with counts of its actions and rules in each."),
    ),
    rules: Schema.Array(Schema.String).annotate(
        about(
            "The record ids of the rules decided in code any of the screen's actions reach, each once; the rules are under their layers.",
        ),
    ),
    context: ContextShape,
}).annotate(about("One screen of a capability."));

const Concern = Schema.Struct({
    id: Schema.String.annotate(about("The concern's record id.")),
    name: Text.annotate(about("What the shared code does, in plain words.")),
    purpose: Text.annotate(about("What it does for the system and who leans on it.")),
    verdict: CrossCuttingConcern.fields.verdict,
    blocks: Count.annotate(about("How many of its blocks this capability reaches.")),
}).annotate(about("A judged cluster of shared blocks that this capability's flows pass through."));

const DataKind = Schema.Struct({
    id: Schema.String.annotate(about("The kind of data's record id.")),
    name: Schema.String.annotate(about("The kind of data's name.")),
    access: Schema.String.annotate(about("How the capability uses it: `reads`, `saves` or `reads and saves`.")),
    stores: Schema.Array(Schema.String).annotate(
        about("The names of the stores the kind of data is kept in; none when the code shows none."),
    ),
}).annotate(about("One kind of data a capability reads or saves."));

const Gap = Schema.Struct({
    kind: Schema.String.annotate(about("The link kind that reaches nothing: call, reads, saves or renders.")),
    reason: Schema.String.annotate(about("What the code does show of where it goes, as the Map wrote it.")),
    layer: Schema.String.annotate(about("The layer the link leaves; empty when it leaves no block of a layer.")),
    place: Place,
}).annotate(about("One link in the capability's flows that reaches nothing the code shows."));

const OpenPoint = Schema.Struct({
    statement: Text.annotate(about("What is assumed because the code does not settle it.")),
    why: Text.annotate(about("Why no file settles it.")),
    ifWrong: Text.annotate(about("What changes if the assumption is wrong.")),
}).annotate(about("One thing the code does not settle about the capability."));

export const CapabilityPayload = Schema.Struct({
    capability: Schema.Struct({
        id: Schema.String.annotate(about("The capability's record id.")),
        name: Text.annotate(about("The capability's name.")),
        purpose: Text.annotate(about("What it offers.")),
    }).annotate(about("The capability itself.")),
    area: Schema.String.annotate(about("The name of the area it belongs to; empty when the system has no areas.")),
    layers: Schema.Array(Layer).annotate(
        about("The layers its flows run through, entry layers first, then in the order the flows meet them."),
    ),
    screens: Schema.Array(Screen).annotate(
        about("Its screens: its entry points grouped by the screen that holds them."),
    ),
    surfaces: Schema.optionalKey(
        Schema.Array(CapabilitySurface).annotate(
            about(
                "The places (surfaces) its entry points are in, of every kind and starter, by key; `screens` is the older view of the screens alone, kept for one contract version.",
            ),
        ),
    ),
    concerns: Schema.Array(Concern).annotate(about("The judged shared code its flows pass through.")),
    data: Schema.Array(DataKind).annotate(about("The kinds of data it reads or saves.")),
    gaps: Schema.Array(Gap).annotate(about("What its flows could not follow; never left out.")),
    openPoints: Schema.Array(OpenPoint).annotate(
        about("What the code does not settle about the capability; never left out."),
    ),
    totals: Schema.Struct({
        actions: Count.annotate(about("The capability's entry points, each once.")),
        rules: Count.annotate(about("The rules decided in code it reaches, each once.")),
        blocks: Count.annotate(about("The blocks its flows reach, each once.")),
        rulesOnNoScreen: Count.annotate(
            about(
                "How many of its rules no action of a named screen reaches; they are reached from entry points no screen holds.",
            ),
        ),
    }).annotate(about("What the layers add up to, to check that nothing was counted twice or dropped.")),
    context: ContextShape,
}).annotate(
    about(
        "Everything a modernization needs to pick up one capability on its own: its layers with what it does and decides in each, its screens, the shared code it leans on, the data it uses, and what the analysis could not follow. Built only from the accepted records and the relation views, with no rendering decisions. Every place in it carries the context a tool that reads code starts from.",
    ),
);

export type CapabilityPayload = typeof CapabilityPayload.Type;
