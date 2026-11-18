import { join } from "node:path";
import { Effect } from "effect";
import type { Codebase } from "./codebase";
import type { WorkItem } from "./documents";
import { invariantFilesNamed } from "./policy";
import { readRecords, recordsOf, type RecordOf } from "./record-files";
import { System } from "./system";

/** The orientation records of a stage's file, each kind in its typed form. */
export type Orientation = {
    readonly entities: readonly RecordOf<"EntityTouched">[];
    readonly invariants: readonly RecordOf<"InvariantAtRisk">[];
    readonly journeys: readonly RecordOf<"JourneyAffected">[];
    readonly seams: readonly RecordOf<"SeamCrossed">[];
};

/** A record that cites ids of the orientation in one list: a path step's `cites`, a change's `keeps`, a test's `proves`. */
type Citing<P extends "cites" | "keeps" | "proves"> = { readonly id: string } & {
    readonly [K in P]?: readonly string[] | undefined;
};

/**
 * Reads the orientation from a stage's records file, leaving out the other records the file holds.
 * @param path the orientation's records file
 * @returns the entity, invariant, journey and seam records
 * Fails: RecordInvalid.
 */
export const orientationIn = Effect.fn("OrientGates.orientationIn")(function* (path: string) {
    const records = yield* readRecords(path);
    const orientation: Orientation = {
        entities: yield* recordsOf(records, "EntityTouched"),
        invariants: yield* recordsOf(records, "InvariantAtRisk"),
        journeys: yield* recordsOf(records, "JourneyAffected"),
        seams: yield* recordsOf(records, "SeamCrossed"),
    };
    return orientation;
});

/**
 * Checks the orientation covers the work item: every criterion is named by an entity record (asked for only when the
 * codebase has a knowledge base), no record names a criterion the work item lacks, and every file an entity, invariant
 * or journey record cites exists under the knowledge base (an entity's `domain` is checked as a path too). What the
 * files say is left to the reviewer.
 * @param codebase the codebase and its knowledge base folder, when it declares one
 * @param workItem the work item
 * @param orientation the orientation records
 * @returns one sentence per gap
 */
export const orientGaps = Effect.fn("OrientGates.orientGaps")(function* (
    codebase: Codebase,
    workItem: WorkItem,
    orientation: Orientation,
) {
    const system = yield* System;
    const known = new Set(workItem.criteria.map((criterion) => criterion.ac));
    const gaps: string[] = [];
    for (const record of [
        ...orientation.entities,
        ...orientation.invariants,
        ...orientation.journeys,
        ...orientation.seams,
    ]) {
        for (const ac of record.acs.filter((each) => !known.has(each))) {
            gaps.push(`${record.id} names ${ac}, which the work item does not have`);
        }
    }
    const covered = new Set(orientation.entities.flatMap((record) => record.acs));
    // Without a knowledge base there is nothing to orient in: the stage is skipped and no entity is asked for.
    const uncovered = codebase.kbPath === undefined ? [] : workItem.criteria.filter((each) => !covered.has(each.ac));
    for (const { ac } of uncovered) {
        gaps.push(`${ac} is named by no entity record; write one, with how \`touches none\` when it touches no entity`);
    }
    const citing = [
        ...orientation.entities.map((record) => ({ id: record.id, cited: [record.kbFile, record.domain] })),
        ...orientation.invariants.map((record) => ({ id: record.id, cited: [record.kbFile] })),
        ...orientation.journeys.map((record) => ({ id: record.id, cited: [record.kbFile] })),
    ];
    for (const { id, cited: files } of citing) {
        for (const cited of files.filter((file) => file !== undefined)) {
            if (codebase.kbPath === undefined) {
                gaps.push(`${id} cites ${cited}, but the codebase declares no knowledge base`);
            } else if (!(yield* system.exists(join(codebase.kbPath, cited)))) {
                gaps.push(`${id} cites ${cited}, which is not in the knowledge base`);
            }
        }
    }
    return gaps;
});

/**
 * Lists the invariant files in each domain the entity records name that no invariant record cites, for the agent to
 * judge; none is a gap.
 * @param codebase the codebase and its knowledge base folder, when it declares one
 * @param orientation the orientation records
 * @returns one line per domain with uncited invariant files, naming up to five; none when the codebase has no knowledge base
 */
export const orientView = Effect.fn("OrientGates.orientView")(function* (codebase: Codebase, orientation: Orientation) {
    if (codebase.kbPath === undefined) {
        return [];
    }
    const system = yield* System;
    const cited = new Set(orientation.invariants.map((record) => record.kbFile));
    const domains = [...new Set(orientation.entities.flatMap((record) => record.domain ?? []))];
    const lines: string[] = [];
    for (const domain of domains) {
        const files = (yield* system.listFiles(join(codebase.kbPath, domain, "invariants"))).map(
            (file) => `${domain}/invariants/${file}`,
        );
        const open = files.filter((file) => !cited.has(file));
        if (open.length > 0) {
            const named = open.slice(0, invariantFilesNamed).join(", ");
            lines.push(
                `${String(open.length)} invariant ${open.length === 1 ? "file" : "files"} of ${domain} cited by no fact at risk: ${named}${open.length > invariantFilesNamed ? `, and ${String(open.length - invariantFilesNamed)} more` : ""}`,
            );
        }
    }
    return lines;
});

/**
 * Finds the ids a record cites that no orientation record holds: `cites` may name any orientation record, while
 * `keeps` and `proves` may name only invariant records.
 * @param orientationPath the orientation's records file
 * @param records the citing records
 * @param property the name of the list to read on each record: `cites`, `keeps` or `proves`
 * @returns one sentence per id that resolves to nothing
 * Fails: RecordInvalid.
 */
export const citationGaps = Effect.fn("OrientGates.citationGaps")(function* <P extends "cites" | "keeps" | "proves">(
    orientationPath: string,
    records: readonly Citing<P>[],
    property: P,
) {
    const orientation = yield* orientationIn(orientationPath);
    const held = property === "cites" ? Object.values(orientation).flat() : orientation.invariants;
    const known = new Set(held.map((each) => each.id));
    return records.flatMap((record) => {
        const cited = record[property] ?? [];
        return cited
            .filter((id) => !known.has(id))
            .map((id) => `${record.id} ${property} ${id}, which is not a record of the orientation`);
    });
});

/**
 * Lists the invariants at risk that none of a stage's records names in the given list, for the agent to judge.
 * @param orientationPath the orientation's records file
 * @param records the stage's records
 * @param property the name of the list to read on each record: `cites`, `keeps` or `proves`
 * @param what what the stage lacks for an invariant, worded for the line, such as `change keeping it`
 * @returns one line per invariant at risk that no record names
 * Fails: RecordInvalid.
 */
export const uncitedInvariants = Effect.fn("OrientGates.uncitedInvariants")(function* <
    P extends "cites" | "keeps" | "proves",
>(orientationPath: string, records: readonly Citing<P>[], property: P, what: string) {
    const cited = new Set(records.flatMap((record) => record[property] ?? []));
    return (yield* orientationIn(orientationPath)).invariants
        .filter((each) => !cited.has(each.id))
        .map((each) => `${each.id} (${each.why}) has no ${what} yet`);
});
