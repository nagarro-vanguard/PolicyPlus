import { severityOrder } from "./words";
import type { Knowledge, Risk } from "./types";

/**
 * The risks whose observations lie in any of some files: the risks a place carries.
 * @param knowledge what the analysis knows of the system as a whole
 * @param files the place's files
 * @returns the risks, most serious first
 */
export const risksInFiles = (knowledge: Knowledge, files: readonly string[]): Risk[] => {
    const own = new Set(files);
    return knowledge.risks.filter((risk) => risk.places.files.some((file) => own.has(file)));
};

/**
 * The risks that reach a capability, by the capabilities the script found from each risk's lines.
 * @param knowledge what the analysis knows of the system as a whole
 * @param id the capability's id
 * @returns the risks, most serious first
 */
export const risksOfCapability = (knowledge: Knowledge, id: string): Risk[] =>
    knowledge.risks.filter((risk) => risk.places.capabilities.some((place) => place.id === id));

/**
 * How many risks of each severity.
 * @param risks the risks
 * @returns the counts
 */
export const severityCounts = (risks: readonly Risk[]) => ({
    high: risks.filter((risk) => risk.severity === "high").length,
    medium: risks.filter((risk) => risk.severity === "medium").length,
    low: risks.filter((risk) => risk.severity === "low").length,
});

/**
 * The risks grouped by severity and, within each, by kind of risk, most serious first.
 * @param risks the risks
 * @returns the groups
 */
export const groupedRisks = (risks: readonly Risk[]) =>
    severityOrder.flatMap((severity) => {
        const here = risks.filter((risk) => risk.severity === severity);
        return here.length === 0
            ? []
            : [
                  {
                      severity,
                      kinds: [...Map.groupBy(here, (risk) => risk.categoryWords)].map(([words, list]) => ({
                          words,
                          risks: list,
                      })),
                  },
              ];
    });
