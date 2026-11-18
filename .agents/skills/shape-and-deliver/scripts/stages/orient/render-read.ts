import type { Run } from "../../core/run-context";
import type { OrientFound } from "./render-model";

/**
 * Gathers what the story touches and, for each fact at risk, the changes that keep it and the tests that prove it, and
 * whether the codebase declares a knowledge base.
 * @param run the run
 * @returns the findings
 */
export const orientFound = (run: Run): typeof OrientFound.Type => ({
    knowledge: run.codebase.kbPath !== undefined,
    entities: run.records.entities,
    invariants: run.records.invariants.map((invariant) => {
        const changes = run.records.changes.filter(
            (change) => change.keeps !== undefined && change.keeps.includes(invariant.id),
        );
        const tests = run.records.tests.filter(
            (test) => test.proves !== undefined && test.proves.includes(invariant.id),
        );
        return {
            invariant,
            keptBy: changes.map((change) => change.reason),
            provenBy: tests.map((test) => test.outcome),
            files: changes.map((change) => change.path),
            titles: tests.map((test) => test.title),
        };
    }),
    journeys: run.records.journeys,
    seams: run.records.seams,
});
