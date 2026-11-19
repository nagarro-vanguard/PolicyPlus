import { copy, sectionWords } from "../lib/copy";
import { heading, type NumberRecord } from "./format";
import type { Case } from "./read";
import { pageOf } from "./routes";

// The section registry: the sections a reader can open, each answering one reader question, present only when the case
// holds the files it shows. The sidebar, the trail's first step, the pager between sections and the search's section
// entries are all made from this list; no page names another section by hand. Overview and Reference are required; the
// others appear when their files exist and hold something. A section whose page is not built yet in this version of the
// app is known to the registry but not linked (`built: false`).

export const sectionIds = ["overview", "reference", "journeys", "architecture", "choices", "plan", "risks"] as const;
export type SectionId = (typeof sectionIds)[number];

/** `folder`: the folder that holds the section's other pages (`journey/` for one page per journey), when it has one. */
type Spec = { id: SectionId; needs: readonly string[]; href: string; built: boolean; folder?: string };

/** What each section needs from the case, and where its page is. */
const specs: readonly Spec[] = [
    { id: "overview", needs: ["facts/system.json", "nodes/overview.json"], href: "index.html", built: true },
    { id: "reference", needs: ["nodes/overview.json"], href: pageOf("overview"), built: true },
    { id: "journeys", needs: ["journeys/today.json"], href: "journeys.html", built: true, folder: "journey/" },
    { id: "architecture", needs: ["facts/layers.json"], href: "architecture.html", built: true },
    { id: "choices", needs: ["journeys/changed.json"], href: "choices.html", built: true },
    { id: "plan", needs: ["plan/stories.json"], href: "plan.html", built: true },
    { id: "risks", needs: ["facts/risks.json"], href: "risks.html", built: true },
];

export type Section = { id: SectionId; label: string; question: string; href: string; built: boolean };

/**
 * The sections a case has, in reading order.
 * @param holds whether the case holds a file with something in it
 * @param referenceLabel the Reference section's label, made of the case's own nouns
 * @returns the sections present
 */
export const sectionsOf = (holds: (path: string) => boolean, referenceLabel: string): Section[] =>
    specs
        .filter((spec) => spec.needs.every(holds))
        .map((spec) => ({
            id: spec.id,
            label: spec.id === "reference" ? referenceLabel : sectionWords[spec.id].label,
            question: sectionWords[spec.id].question,
            href: spec.href,
            built: spec.built,
        }));

/** The sections a reader can open now: present and built. */
export const navOf = (sections: readonly Section[]) => sections.filter((section) => section.built);

/**
 * The section a page belongs to.
 * @param page the page's file below the root (`index.html`, `capability/x.html`)
 * @param sections the sections present
 * @returns the section, or none for a page outside every section (the kit)
 */
export const sectionOfPage = (page: string, sections: readonly Section[]): SectionId | undefined => {
    const own = sections.find((section) => section.href === page);
    if (own !== undefined) return own.id;
    const inFolder = specs.find((spec) => spec.folder !== undefined && page.startsWith(spec.folder));
    if (inFolder !== undefined && sections.some((section) => section.id === inFolder.id)) return inFolder.id;
    if (page === "unplaced.html" || /^[a-z]+\//.test(page)) return "reference";
    return undefined;
};

/**
 * The Reference section's label, from the nouns of the system's own numbers: its capabilities, and its places in the
 * one kind's noun when every place is of one kind.
 * @param capabilities the number of the system's capabilities
 * @param places the number of the system's places
 * @returns the label, such as "Capabilities and screens"
 */
export const referenceLabelOf = (capabilities: NumberRecord | undefined, places: NumberRecord | undefined) => {
    if (capabilities === undefined || places === undefined) return sectionWords.reference.label;
    const only = places.parts?.length === 1 ? places.parts[0] : undefined;
    return copy.reference.label(heading(capabilities.noun.many), only?.noun.many ?? places.noun.many);
};

/**
 * Whether a case holds a file with something in it: listed, and not an empty list or null.
 * @param kase the case
 * @returns the test
 */
export const holdsOf =
    (kase: Case) =>
    (path: string): boolean => {
        if (!kase.has(path)) return false;
        const value = kase.json(path);
        if (value === null) return false;
        if (Array.isArray(value)) return value.length > 0;
        return true;
    };
