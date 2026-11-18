import { join } from "node:path";
import { Effect, Result, Schema } from "effect";
import type { Layer } from "./codebase";
import { Proof } from "./documents";
import { criteriaPlanned, readJunit, type JunitTest, type PlannedTest } from "./junit";
import { System } from "./system";

/** One Verify command or command check that ran: its exit code and the end of its output. */
export type CommandRun = {
    readonly layer: string;
    readonly command: string;
    readonly exitCode: number;
    readonly outputEnd: string;
};

/**
 * One layer's run: its commands, and its proof as read: the proof it reported, absent (a layer that reported none),
 * or a result file that is not in shape-and-deliver's shape, with why.
 */
export type LayerRun = {
    readonly layer: Layer;
    readonly runs: readonly CommandRun[];
    readonly proof: Proof | undefined;
    readonly malformedProof: string | undefined;
};

/** What a layer's run left in its evidence folder, as shape-and-deliver reads it. */
type LayerProof = {
    /** The tests and load limits the layer reported, or undefined when it reported none. */
    readonly proof: Proof | undefined;
    /** Which result file is not in shape-and-deliver's shape, and why, or undefined when every file read. */
    readonly malformedProof: string | undefined;
};

const none: LayerProof = { proof: undefined, malformedProof: undefined };

/**
 * Reads the JUnit XML files at the top of an evidence folder.
 * @param evidenceDir the evidence folder
 * @param planned the plan's acceptance tests
 * @returns the tests of every file, or the first file that is not in shape, with why; undefined when there is no XML
 * Fails: FileUnreadable.
 */
const readJunitFiles = Effect.fnUntraced(function* (evidenceDir: string, planned: readonly PlannedTest[]) {
    const system = yield* System;
    const names = (yield* system.listFiles(evidenceDir)).filter((file) => file.endsWith(".xml") && !file.includes("/"));
    if (names.length === 0) {
        return undefined;
    }
    const tests: JunitTest[] = [];
    for (const name of names) {
        const read = readJunit(yield* system.readText(join(evidenceDir, name)), planned);
        if (Result.isFailure(read)) {
            return { malformed: `${name} that is not in shape-and-deliver's shape: ${read.failure}` };
        }
        tests.push(...read.success);
    }
    return { tests };
});

/**
 * Credits a `proof.json` test that names no criterion by the plan, as a JUnit test is: the criteria whose planned title
 * its title contains. A test that names its criteria keeps them.
 * @param proof what the layer reported
 * @param planned the plan's acceptance tests
 * @returns the proof with each unnamed test credited
 * @public
 */
export const creditByTitle = (proof: Proof, planned: readonly PlannedTest[]): Proof => ({
    ...proof,
    tests: proof.tests.map((test) =>
        test.acs.length > 0 ? test : { ...test, acs: criteriaPlanned(test.title, planned) },
    ),
});

/**
 * Joins what a layer's proof.json and its JUnit XML files each reported: a layer may run more than one runner, one
 * writing proof.json (with videos) and another only JUnit. A JUnit test whose title proof.json already holds is the
 * same test and is dropped, so proof.json's entry, with its video, stands.
 * @param proof what the layer's proof.json reported, if any
 * @param junit the tests of the layer's JUnit XML files, if any
 * @returns the layer's proof, or undefined when it reported neither
 * @public
 */
export const joinProofs = (proof: Proof | undefined, junit: readonly JunitTest[] | undefined): Proof | undefined => {
    if (proof === undefined && junit === undefined) {
        return undefined;
    }
    const held = new Set((proof?.tests ?? []).map((test) => test.title));
    return {
        tests: [...(proof?.tests ?? []), ...(junit ?? []).filter((test) => !held.has(test.title))],
        thresholds: proof?.thresholds ?? [],
    };
};

/**
 * Reads what one layer's run proved, by convention: the proof.json in the evidence folder and the JUnit XML files in
 * it, joined, since a layer's runners each report in their own way. A layer that reports nothing proves no criterion,
 * and its commands are still judged by exit status.
 * @param evidenceDir the folder the layer wrote its evidence into
 * @param planned the plan's acceptance tests, which credit a JUnit test, or a `proof.json` test that names none, to a criterion by title
 * @returns the layer's proof, or why a result file is unreadable
 * Fails: FileUnreadable.
 */
export const readLayerProof = Effect.fn("LayerProof.readLayerProof")(function* (
    evidenceDir: string,
    planned: readonly PlannedTest[],
) {
    const system = yield* System;
    const proofPath = join(evidenceDir, "proof.json");
    let fromProofJson: Proof | undefined;
    if (yield* system.exists(proofPath)) {
        const read = Schema.decodeUnknownResult(Schema.fromJsonString(Proof))(yield* system.readText(proofPath));
        if (Result.isFailure(read)) {
            return {
                proof: undefined,
                malformedProof: `a proof.json that is not in shape-and-deliver's shape: ${read.failure.message}`,
            };
        }
        fromProofJson = creditByTitle(read.success, planned);
    }
    const junit = yield* readJunitFiles(evidenceDir, planned);
    if (junit !== undefined && "malformed" in junit) {
        return { proof: undefined, malformedProof: `a ${junit.malformed}` };
    }
    const proof = joinProofs(fromProofJson, junit?.tests);
    return proof === undefined ? none : { proof, malformedProof: undefined };
});
