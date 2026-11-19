import { existsSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { journeyId } from "./model/ids";
import type { Layout } from "./model/layout";
import { Dispute } from "./model/records";
import { outputOf, readJson, type JobDispute, type Stage } from "./jobs/state";

/*
 * The challenges a reviewer raised that survived the one fix a job gets. `stage.ts finish <stage>` writes them to
 * `.shape-target/work/records/disputes-<stage>.json` as a list of `Dispute` (`{ job, record, variant, says }`, the
 * schema is `dispute.schema.json`); `choose.ts` refuses a pick they are about until the person has seen and accepted
 * them. Other skills and the app read the file; `loadDisputes` reads it here, older files included.
 */
export const disputesPath = (layout: Layout, stage: Stage) => join(layout.records, `disputes-${stage}.json`);

type Output = {
    journeys?: { task?: string; name?: string }[];
    architectures?: { name?: string }[];
    components?: { name?: string }[];
};

/**
 * What a record of a job's output is: a journey's id, an architecture's or a component's name.
 * @param layout the run's folders
 * @param job the job
 * @param record the record's position in the output
 * @returns its id or name, or empty when the output no longer holds it
 */
export const variantOf = (layout: Layout, job: string, record: number): string => {
    const output = outputOf<Output>(layout, job);
    const journey = output?.journeys?.[record];
    if (journey?.task !== undefined && journey.name !== undefined) return journeyId(journey.task, journey.name);
    return output?.architectures?.[record]?.name ?? output?.components?.[record]?.name ?? "";
};

/** A dispute kept on a job, older ones as their line `Record <n>: <says>`. */
export const disputeOf = (layout: Layout, job: string, kept: JobDispute | string): Dispute => {
    const parsed = typeof kept === "string" ? /^Record (\d+)(?: \([^)]*\))?: ([\s\S]*)$/.exec(kept) : null;
    const record = typeof kept === "string" ? Number(parsed?.[1] ?? -1) : kept.record;
    const says = typeof kept === "string" ? (parsed?.[2] ?? kept) : kept.says;
    return { job, record, variant: record < 0 ? "" : variantOf(layout, job, record), says };
};

const Older = Schema.Struct({ job: Schema.String, says: Schema.String });

/**
 * The surviving challenges of a stage, each with what it is about. A file written before disputes named their variant
 * holds `{ job, says: "Record <n>: …" }`; the variant is then found from the job's output.
 * @param layout the run's folders
 * @param stage the stage
 * @returns the disputes, none when the stage has not finished
 */
export const loadDisputes = (layout: Layout, stage: Stage): Dispute[] => {
    const path = disputesPath(layout, stage);
    if (!existsSync(path)) return [];
    return readJson<unknown[]>(path).map((each) =>
        Schema.is(Dispute)(each)
            ? each
            : (() => {
                  const older = Schema.decodeUnknownSync(Older)(each);
                  return disputeOf(layout, older.job, older.says);
              })(),
    );
};
