import { caseData } from "./data";
import { theCase } from "./loader";
import { holdsOf, navOf, referenceLabelOf, type Section, sectionsOf } from "./sections";

// What every page's frame shows: the system's name and the sections, made once per build from the case.

export type Site = { name: string; sections: Section[]; nav: Section[] };

let cached: Promise<Site> | undefined;

/**
 * The frame of the site.
 * @returns the system's name, the sections present and those a reader can open
 */
export const siteOf = (): Promise<Site> => {
    cached ??= (async () => {
        const data = await caseData();
        const sections = sectionsOf(
            holdsOf(theCase()),
            referenceLabelOf(data.number("system/capabilities"), data.number("system/places")),
        );
        return { name: data.node("overview")?.name ?? "", sections, nav: navOf(sections) };
    })();
    return cached;
};
