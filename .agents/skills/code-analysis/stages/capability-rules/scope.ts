import { Effect } from "effect";
import { readHoldings } from "../../shared/graph/entry-points";
import { canonicalFor } from "../../shared/jobs/capability-choice";
import { UsageInvalid } from "../../shared/run/script-errors";

type Holdings = Effect.Success<ReturnType<typeof readHoldings>>;

export type Studied = Holdings["held"][number];

/**
 * The capabilities a person named, each by its name as the overview shows it, or by its record id where two share a
 * name (D122). A name no capability has, or one two share, is refused with what would settle it: every name there is,
 * or each match with what it offers and its record id as a handle. A capability that holds no entry point has nothing to
 * read, so it is refused too.
 * @param holdings every capability with the entry points it holds
 * @param named the names or record ids the person gave, in their order
 * @returns each capability chosen, once, with its entry points; UsageInvalid naming every name that settles nothing
 */
export const resolveCapabilities = Effect.fnUntraced(function* (holdings: Holdings, named: readonly string[]) {
    const issues: string[] = [];
    const chosen: Studied[] = [];
    for (const name of named) {
        const byId = holdings.held.filter(([capability]) => capability.id === name);
        const matches = byId.length ? byId : holdings.held.filter(([capability]) => capability.name === name);
        const [only, ...others] = matches;
        if (only === undefined) {
            issues.push(
                `no capability is named "${name}": the names are ${holdings.held.map(([capability]) => `"${capability.name}"`).join(", ")}`,
            );
            continue;
        }
        if (others.length) {
            issues.push(
                `"${name}" names ${matches.length} capabilities; give one by its record id: ${matches.map(([capability]) => `${capability.id} (${capability.purpose})`).join("; ")}`,
            );
            continue;
        }
        if (!only[1].length) {
            issues.push(`"${only[0].name}" holds no entry point, so it has no code to read`);
            continue;
        }
        if (!chosen.some(([capability]) => capability.id === only[0].id)) {
            chosen.push(only);
        }
    }
    if (issues.length) {
        return yield* new UsageInvalid({ issue: issues.join("; ") });
    }
    return chosen;
});

/**
 * The capabilities a stored choice stands for now (D222): each by its record id, or by the capability that merged it
 * in a later run of Capabilities and entities (`canonicalFor`). A choice neither resolves is refused, naming it by the
 * name it was chosen under and every capability standing now, so the driver asks the run's one question again; never
 * matched by name, since a capability written again under one name may mean something else.
 * @param holdings every capability with the entry points it holds
 * @param chosen the stored choices, each with its record id and the name it was chosen under
 * @returns the record ids standing for them, in their order; UsageInvalid naming each choice no longer standing
 */
export const canonicalChoices = Effect.fnUntraced(function* (
    holdings: Holdings,
    chosen: ReadonlyArray<{ readonly id: string; readonly name: string }>,
) {
    const capabilities = holdings.held.map(([capability]) => capability);
    const ids: string[] = [];
    const gone: string[] = [];
    for (const choice of chosen) {
        const standing = canonicalFor(capabilities, choice.id);
        if (standing === undefined) {
            gone.push(`"${choice.name}"`);
        } else {
            ids.push(standing.id);
        }
    }
    if (gone.length) {
        return yield* new UsageInvalid({
            issue: `the capabilities chosen before no longer stand, since Capabilities and entities ran again: ${gone.join(", ")}; ask which capabilities to study among ${capabilities.map((capability) => `"${capability.name}"`).join(", ")}, then run prepare --capability with each`,
        });
    }
    return ids;
});
