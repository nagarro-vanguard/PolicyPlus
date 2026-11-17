import ignore from "ignore";
import type { AnalysisRequest } from "../run/analysis-request";

/**
 * Each rule of the request's Leave Out with the matcher of its own pattern, in .gitignore syntax, the last rule first,
 * as the last rule matching a file decides it.
 * @param request the run's settings
 * @returns each rule with its place in the order and whether a path matches it, the last first
 */
const lastFirst = (request: AnalysisRequest) =>
    request.leaveOut
        .map((rule, at) => {
            const matcher = ignore().add(rule.pattern);
            return { at, pattern: rule.pattern, matches: (path: string) => matcher.ignores(path) };
        })
        .reverse();

/**
 * The Leave Out rule that leaves a file out, when one does: the last rule of the request's Leave Out that matches it.
 * The Leave Out is the only exclusion: no rule is written by a model, so what is out of scope is the person's decision
 * and the same on every run. Read from the request every time, so an edit to it always takes effect.
 * @param request the run's settings
 * @returns for a path, relative to the roots' base, the rule that leaves it out, or undefined when it is in scope
 */
export function leavingRule(request: AnalysisRequest): (path: string) => { readonly pattern: string } | undefined {
    const matchers = lastFirst(request);
    return (path) => {
        const found = matchers.find((matcher) => matcher.matches(path));
        return found === undefined ? undefined : { pattern: found.pattern };
    };
}

/**
 * Whether a file is left out of the analysis: a rule of the request's Leave Out matches it. One rule, for the scope
 * Inventory writes and the pages.
 * @param request the run's settings
 * @returns whether a path, relative to the roots' base, is left out
 */
export function leftOut(request: AnalysisRequest): (path: string) => boolean {
    const leaving = leavingRule(request);
    return (path) => leaving(path) !== undefined;
}
