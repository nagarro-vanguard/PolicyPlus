import type { Catalogue } from "../run/catalogue";
import { scopeGaps } from "../read/record-writing";
import type { Fact } from "../model/schemas/fact";

export type FactContext = {
    readonly catalogue: Catalogue;
    readonly lineCounts: ReadonlyMap<string, number>;
};

/**
 * The gate on a set of facts, for every stage that writes them, on coordinates and ids only: the lines they cite lie in
 * the manifest, and each id they name in the catalogue (the question, a risk category and severity, a way to confirm)
 * is one the catalogue lists. That the subjects they name exist, and the facts a conclusion rests on, are the shared rule
 * on references. Whether a fact is true is the review's.
 * @param facts the facts, each as last written
 * @param context the catalogue and the manifest's line counts of the lines they cite
 * @returns one line per gap
 */
export function factGaps(facts: readonly (typeof Fact.Type)[], context: FactContext): string[] {
    const { catalogue } = context;
    const listed = (list: ReadonlyArray<{ readonly id: string }>, id: string) => list.some((each) => each.id === id);
    return [
        ...scopeGaps(facts, context.lineCounts, "manifest", (fact) => fact.id),
        ...facts.flatMap((fact) => [
            ...(listed(catalogue.aspects, fact.aspect)
                ? []
                : [`${fact.id} answers ${fact.aspect}, which is no aspect of the catalogue`]),
            ...(fact.risk === undefined || listed(catalogue.riskCategories, fact.risk.category)
                ? []
                : [`${fact.id}: ${fact.risk.category} is no risk category of the catalogue`]),
            ...(fact.risk === undefined || listed(catalogue.severities, fact.risk.severity)
                ? []
                : [`${fact.id}: ${fact.risk.severity} is no severity of the catalogue`]),
            ...("assumed" in fact.basis && !listed(catalogue.confirmWith, fact.basis.assumed.confirmWith)
                ? [`${fact.id}: ${fact.basis.assumed.confirmWith} is no way to confirm of the catalogue`]
                : []),
        ]),
    ];
}
