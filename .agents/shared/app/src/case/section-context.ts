import type { CaseData } from "./view";

/**
 * The context control's data for a section's page (risks, architecture, choices): the text's file below the site's
 * root and its size; none when no producer wrote one.
 * @param data the case's lookups
 * @param name the section's name
 * @returns the page's context, or null
 */
export const sectionContextOf = (data: CaseData, name: string) => {
    const bytes = data.contextBytes(`section/${name}`);
    return bytes === undefined ? null : { file: `context/section/${name}.txt`, kilobytes: Math.max(1, Math.round(bytes / 1024)) };
};
