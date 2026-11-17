import { Effect, Stream } from "effect";
import type { Stage } from "../run/analysis-layout";
import { readCatalogue } from "../run/catalogue";
import { FileAccess } from "../source/file-access";
import { RecordReads } from "../read/record-reads";
import { StageRecords } from "./stage-records";
import { Fact, basisOf, evidenceOf } from "../model/schemas/fact";
import { howItIsReached, ExternalSystem } from "../model/schemas/external-system";
import { Layer } from "../model/schemas/layer";
import { SystemPart } from "../model/schemas/system-part";
import { Technology } from "../model/schemas/technology";

/**
 * Every subject: a brief that carries every fact its stage reads.
 * @returns true
 */
export const everySubject = () => true;

/**
 * What every reviewed stage's brief carries: the layers, the external systems (with how the code reaches each, and the code
 * without source it is reached through), and every accepted fact whose question names the stage among its readers
 * (D174), each with its question, what it is about, and the lines it rests on; and the digest of each stage it is built
 * from (D230), so a change to any of their records makes today's brief differ and the stage's jobs stale, while the
 * same records written again, as a rebuilt store writes them, leave it current.
 * Nothing else is carried. A job reads only the facts about the subjects its own work touches, so a brief may keep
 * fewer (plan 0006, decision A).
 * @param stage the stage the brief is for
 * @param inputs the stages whose accepted records the stage's jobs are cut from
 * @param keeps whether a fact about a subject is carried
 * @returns the brief's shared parts
 */
export const readBriefParts = Effect.fnUntraced(function* (
    stage: Stage,
    inputs: readonly Stage[],
    keeps: (subject: (typeof Fact.Type)["subject"]) => boolean,
) {
    const catalogue = yield* readCatalogue();
    const questions = new Map(
        catalogue.aspects.filter((aspect) => aspect.readers.includes(stage)).map((aspect) => [aspect.id, aspect.words]),
    );
    const reads = yield* RecordReads;
    const layers = yield* Stream.runCollect(reads.recordsOfType("Layer", Layer));
    const externalSystems = yield* Stream.runCollect(reads.recordsOfType("ExternalSystem", ExternalSystem));
    const facts = yield* Stream.runCollect(reads.recordsOfType("Fact", Fact));
    const names = new Map<string, string>([
        ...(yield* Stream.runCollect(reads.recordsOfType("SystemPart", SystemPart))).map((part): [string, string] => [
            part.id,
            part.name,
        ]),
        ...(yield* Stream.runCollect(reads.recordsOfType("Technology", Technology))).map(
            (technology): [string, string] => [technology.id, technology.name],
        ),
    ]);
    const about = (subject: (typeof Fact.Type)["subject"]) => {
        if (subject === "system") {
            return "the system";
        }
        const name = names.get(subject.key);
        return name === undefined ? subject.key : name;
    };
    return {
        preparedFrom: yield* (yield* StageRecords).digestsOf(inputs),
        layers: layers.map((layer) => ({ id: layer.id, name: layer.name })),
        externalSystems: externalSystems.map((externalSystem) => ({
            id: externalSystem.id,
            name: externalSystem.name,
            kind: externalSystem.kind,
            reachedBy: howItIsReached(externalSystem),
        })),
        facts: facts.flatMap((fact) => {
            const question = questions.get(fact.aspect);
            return question === undefined || !keeps(fact.subject)
                ? []
                : [
                      {
                          id: fact.id,
                          about: about(fact.subject),
                          question,
                          statement: fact.statement,
                          basis: basisOf(fact),
                          evidence: evidenceOf(fact).map((place) => ({ lines: place.lines, shows: place.shows })),
                      },
                  ];
        }),
    };
});

/**
 * Refuse while the brief built today differs from the one a stage's jobs were prepared with: an earlier stage ran
 * again since, so the jobs would finish on facts that no longer hold.
 * @param path the brief the jobs were prepared with
 * @param today the brief built today, as its text
 * @param stage the stage, as a reader names it, and the command that prepares it
 * @param stage.name the stage's name, such as `the Map`
 * @param stage.prepare the command that prepares it, such as `map-codebase.ts prepare`
 * @returns nothing when the brief is current; the gap otherwise
 */
export const staleBriefGap = Effect.fnUntraced(function* (
    path: string,
    today: string,
    stage: { readonly name: string; readonly prepare: string },
) {
    const fs = yield* FileAccess;
    if (!(yield* fs.exists(path))) {
        return [`${stage.name} was never prepared: run ${stage.prepare}`];
    }
    return (yield* fs.readText(path)) === today
        ? []
        : [
              `an earlier stage changed since ${stage.name}'s jobs were prepared: run ${stage.prepare}, which writes the brief again, then prepare --path . to run every job on it`,
          ];
});
