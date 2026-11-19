import catalogue from "../../catalogue/runs-on.json" with { type: "json" };

/*
 * Where a part of the target runs: a closed list kept in `catalogue/runs-on.json`, so a reader is told the same words
 * for the same place in every run.
 */
export type RunsOnEntry = { readonly id: string; readonly words: string; readonly means: string };

export const runsOnCatalogue: readonly RunsOnEntry[] = catalogue.runsOn;
export const runsOnIds = runsOnCatalogue.map((entry) => entry.id);
/** The list as one line, `id` (what it means), for the description of the field. */
export const runsOnMeanings = runsOnCatalogue.map((entry) => `\`${entry.id}\` (${entry.means})`).join("; ");
/** The plain words of a place, or nothing when it is not in the catalogue. */
export const runsOnWords = (id: string) => runsOnCatalogue.find((entry) => entry.id === id)?.words;
