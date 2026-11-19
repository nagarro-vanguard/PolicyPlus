import type { Criterion } from "../model/records";
import type { Target } from "../read/target";

/*
 * Whether a story says what the chosen journey does. A journey step may apply a legacy rule differently from today
 * (shape-target's step `changes: [{ rule, to }]`); a criterion that cites such a rule must then also cite the step and
 * state the new behaviour, or it builds the old one. Deterministic: the step must be cited, and the criterion must
 * carry most of the words of what the rule does now.
 */

/** What a journey step does now with a rule, by rule id. */
export type RuleChanges = ReadonlyMap<string, readonly { readonly step: string; readonly to: string }[]>;

/**
 * Every rule a chosen journey's step changes, with the step and what the rule does now.
 * @param target the confirmed target
 * @returns the changes by rule id; empty for journeys written before steps could change a rule
 */
export const ruleChangesOf = (target: Target): RuleChanges => {
    const changes = new Map<string, { step: string; to: string }[]>();
    for (const journey of target.journeys)
        for (const step of journey.steps)
            for (const change of step.changes ?? [])
                changes.set(change.rule, [...(changes.get(change.rule) ?? []), { step: step.id, to: change.to }]);
    return changes;
};

const STOP = new Set(
    "about after again also because been before being both does from have into just like more most much must only other over same some such than that them then there these they this those through very what when where which while with without would your".split(
        " ",
    ),
);
const stem = (word: string) => word.replace(/(ings?|ed|es|s)$/, "");
const wordsOf = (text: string) =>
    new Set(
        (text.toLowerCase().match(/[a-z]+/g) ?? []).filter((word) => word.length >= 4 && !STOP.has(word)).map(stem),
    );

/**
 * Whether a criterion states a new behaviour: it carries at least half of the content words of what the rule does now.
 * @param says the criterion
 * @param to what the rule does now
 * @returns true when the behaviour is stated
 */
export const statesChange = (says: string, to: string) => {
    const wanted = [...wordsOf(to)];
    if (wanted.length === 0) return true;
    const have = wordsOf(says);
    return wanted.filter((word) => have.has(word)).length * 2 >= wanted.length;
};

/**
 * What is wrong with criteria that cite a rule a journey step changes: the step is not cited, or the new behaviour is
 * not said.
 * @param criteria the story's criteria
 * @param changes the rules the journeys change
 * @returns one line per problem, each naming the criterion by its number
 */
export const changedRuleProblems = (criteria: readonly Criterion[], changes: RuleChanges): string[] =>
    criteria.flatMap((criterion, at) => {
        const cited = new Set(criterion.from.flatMap((ref) => (ref._tag === "step" ? [ref.id] : [])));
        return criterion.from.flatMap((ref) =>
            ref._tag !== "rule"
                ? []
                : (changes.get(ref.id) ?? []).flatMap((change) => [
                      ...(cited.has(change.step)
                          ? []
                          : [`criterion ${at + 1} cites a rule that step ${change.step} changes, but not the step`]),
                      ...(statesChange(criterion.says, change.to)
                          ? []
                          : [`criterion ${at + 1} does not say what the rule does now: "${change.to}"`]),
                  ]),
        );
    });
