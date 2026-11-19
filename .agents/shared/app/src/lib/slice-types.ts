// The shapes of the data the shell reads: one small index for the sidebar, the palette and the lists, and one slice per
// capability for the pages that open it. Written by `slice.ts` at build time, read by the scripts in the browser. No
// import of anything heavy: the scripts bundle this file.

export type Kind =
    | "system"
    | "area"
    | "capability"
    | "screen"
    | "risk"
    | "journey"
    | "gate"
    | "phase"
    | "epic"
    | "story"
    | "page";

/** One thing a person can navigate to. Empty fields are left out so the index stays small. */
export type IndexItem = {
    /** `kind:slug`, readable, never a record id. */
    readonly id: string;
    readonly kind: Kind;
    /** At most eight words. */
    readonly headline: string;
    /** At most 25 words; left out when the headline says it all. */
    readonly summary?: string;
    /** The id of the item it sits under. */
    readonly parent?: string;
    /** Other capabilities a screen belongs to, by capability item id. */
    readonly also?: readonly string[];
    /** The page, relative to the site's root. */
    readonly href: string;
    readonly counts?: Readonly<Record<string, number>>;
    readonly tags?: readonly string[];
};

export type AppIndex = {
    readonly version: 1;
    readonly hasPlan: boolean;
    readonly hasTarget: boolean;
    readonly items: readonly IndexItem[];
};

export type Severity = "high" | "medium" | "low";
export type Provenance = "stated" | "inferred" | "assumed";

/** A layer of one capability, with the places in the code that make it. */
export type SliceLayer = {
    readonly id: string;
    readonly name: string;
    readonly summary: string;
    readonly detail?: string;
    readonly product: boolean;
    readonly actions: number;
    readonly rules: number;
    readonly sharedBlocks: number;
    readonly evidence: readonly string[];
};

/** A business rule, stored once per slice and referred to by its id. */
export type SliceRule = {
    readonly id: string;
    readonly headline: string;
    /** Left out when the detail is short enough to be its own summary. */
    readonly summary?: string;
    /** The rule as the analysis wrote it, shown in the drawer and nowhere else. */
    readonly detail: string;
    /** True when the rule decides whether something is refused. */
    readonly gates: boolean;
    readonly layer: string;
    readonly place: string;
    readonly provenance: Provenance;
    /** Rules this one rests on (their count; the ids are in the code). */
    readonly restsOn: number;
};

export type SliceAction = {
    readonly id: string;
    readonly headline: string;
    readonly summary?: string;
    readonly detail: string;
    readonly startedBy: string;
    /** The screen's key, or empty when no screen starts it. */
    readonly screen: string;
    /** The layers it passes through, the first being where it starts. */
    readonly path: readonly string[];
    readonly rules: readonly string[];
    readonly place: string;
    /** Whether it saves data, only reads it, or neither. */
    readonly state: "changes-state" | "read-only" | "";
    readonly provenance: Provenance;
};

export type SliceScreen = {
    readonly key: string;
    readonly name: string;
    readonly summary: string;
    readonly files: readonly string[];
    readonly actions: readonly string[];
    /** Unique rules its actions pass. */
    readonly rules: readonly string[];
    /** Text on the control, and what kind of control it is. */
    readonly controls: readonly (readonly [string, string])[];
    readonly layers: readonly { readonly layer: string; readonly actions: number; readonly rules: number }[];
    /** The other capabilities this screen is part of, as `{ slug, name }`. */
    readonly otherCapabilities: readonly { readonly slug: string; readonly name: string }[];
};

export type SliceRisk = {
    readonly slug: string;
    readonly headline: string;
    readonly summary: string;
    readonly detail: string;
    readonly severity: Severity;
    readonly category: string;
    readonly files: readonly string[];
};

export type CapSlice = {
    readonly version: 1;
    readonly slug: string;
    readonly name: string;
    readonly purpose: string;
    readonly area: { readonly slug: string; readonly name: string } | undefined;
    readonly totals: { readonly screens: number; readonly actions: number; readonly rules: number; readonly blocks: number; readonly rulesOnNoScreen: number };
    readonly layers: readonly SliceLayer[];
    readonly rules: readonly SliceRule[];
    readonly actions: readonly SliceAction[];
    readonly screens: readonly SliceScreen[];
    /** The journeys that pass through this capability's actions, with the slice's own ids of the actions each uses. */
    readonly journeys: readonly { readonly slug: string; readonly title: string; readonly actions: readonly string[] }[];
    readonly data: readonly { readonly name: string; readonly access: string; readonly stores: readonly string[] }[];
    readonly concerns: readonly { readonly name: string; readonly verdict: string; readonly purpose: string }[];
    readonly assumptions: readonly { readonly statement: string; readonly why: string; readonly ifWrong: string }[];
    readonly gaps: readonly { readonly kind: string; readonly reason: string; readonly place: string }[];
    readonly risks: readonly SliceRisk[];
};

/** The texts that are copied, not read: a brief per capability, screen, action and rule, fetched when copied. */
export type CapBrief = {
    readonly capability: string;
    readonly screens: Readonly<Record<string, string>>;
    readonly actions: Readonly<Record<string, string>>;
    readonly rules: Readonly<Record<string, string>>;
};

/** What the diagram viewer draws: boxes in groups, and which box uses which. */
export type ViewerData = {
    readonly name: string;
    /** What a group and a box are called, for the words around the drawing. */
    readonly words: { readonly group: string; readonly groups: string; readonly box: string; readonly boxes: string };
    readonly groups: readonly { readonly name: string; readonly note?: string }[];
    /** `g` is the group's index; `u` the indexes of the boxes it uses; `ug` the indexes of other groups it uses. */
    readonly boxes: readonly { readonly n: string; readonly g: number; readonly u: readonly number[]; readonly ug?: readonly number[]; readonly note?: string }[];
};
