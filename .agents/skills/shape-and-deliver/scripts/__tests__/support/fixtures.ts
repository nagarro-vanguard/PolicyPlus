import { Effect } from "effect";
import type { WorkItem } from "../../core/documents";
import { servicesLayer, type Services } from "../../core/services";

/**
 * Run an effect that needs the real system.
 * @param effect the effect
 * @returns the effect with the system provided
 */
export const run = <A, E>(effect: Effect.Effect<A, E, Services>) => effect.pipe(Effect.provide(servicesLayer));

/**
 * A value a lookup was expected to find.
 * @param value the lookup's result
 * @param what what was looked up, for the failure
 * @returns the value; a lookup that found nothing throws
 */
export function present<T>(value: T | null | undefined, what: string): T {
    if (value === null || value === undefined) {
        throw new Error(`expected ${what}, found nothing`);
    }
    return value;
}

/** A feature with two criteria, as the gates read it. */
export const workItem: WorkItem = {
    id: "SHOP-1",
    kind: "feature",
    title: "Runs",
    criteria: [
        { ac: "AC-1", text: "I see my runs." },
        { ac: "AC-2", text: "I do not see other workspaces' runs." },
    ],
};
