import { slugify } from "./slugs";
import { severityOrder } from "./words";

// The risks as headings: severity, then kind, each with a count and an address in the page. No filter: the page is short
// enough to read, and the search finds a risk by its words.

type Grouped = { readonly severity: string; readonly categoryWords: string };
export type RiskKind<R extends Grouped> = { readonly id: string; readonly words: string; readonly risks: readonly R[] };
export type RiskSeverity<R extends Grouped> = { readonly id: string; readonly severity: string; readonly count: number; readonly kinds: readonly RiskKind<R>[] };

/**
 * The risks grouped by severity (most serious first), then by kind of risk (most risks first).
 * @param risks the risks
 * @returns the groups; a severity with no risk is left out
 */
export const riskGroups = <R extends Grouped>(risks: readonly R[]): RiskSeverity<R>[] =>
    severityOrder.flatMap((severity) => {
        const here = risks.filter((risk) => risk.severity === severity);
        if (here.length === 0) return [];
        const kinds = [...Map.groupBy(here, (risk) => risk.categoryWords)]
            .map(([words, list]): RiskKind<R> => ({ id: `${severity}-${slugify(words)}`, words, risks: list }))
            .toSorted((one, other) => other.risks.length - one.risks.length || one.words.localeCompare(other.words));
        return [{ id: severity, severity, count: here.length, kinds }];
    });

/**
 * A risk's statement up to the end of its first sentence, whole: never cut and never ended with an ellipsis.
 * @param statement the statement
 * @returns the first sentence
 */
export const sentenceOf = (statement: string) => {
    const flat = statement.replaceAll(/\s+/g, " ").trim();
    return /^.+?[.!?](?=\s|$)/.exec(flat)?.[0] ?? flat;
};
