import { basename } from "node:path";
import { Effect, Schema } from "effect";
import { analysisPaths } from "../../shared/run/analysis-layout";
import { readDocumentStrictly } from "../../shared/run/json-files";
import { FileAccess } from "../../shared/source/file-access";
import { identifiersOf } from "../../shared/jobs/journey-words";
import { Journey } from "../../shared/model/schemas/journeys";
import { capabilityPayload } from "../../shared/read/payload-capability";
import { capabilitySlugs, taskIdOf } from "../../shared/read/payload-journeys";
import { read } from "../../shared/read/payload-queries";
import { compareText } from "../../shared/run/collections";
import { readAgentOutput } from "../../shared/read/record-reading";
import { RecordStore } from "../../shared/store/database";
import { StageRecords } from "../../shared/store/stage-records";
import type { CapabilityPayload } from "../../shared/model/schemas/payloads";

const Place = Schema.Struct({ file: Schema.String, firstLine: Schema.Number, lastLine: Schema.Number });

/** One job of the journeys of today: the tasks of one capability, or the joining of the tasks the jobs wrote. */
const JourneyJob = Schema.Struct({
    jobId: Schema.String,
    name: Schema.String,
    kind: Schema.Literals(["tasks", "merge"]),
    capability: Schema.String,
    slug: Schema.String,
    actions: Schema.Array(Schema.String),
    rules: Schema.Array(Schema.String),
});
const JourneyJobs = Schema.Array(JourneyJob);
export type JourneyJob = typeof JourneyJob.Type;

const TasksBrief = Schema.Struct({
    kind: Schema.Literal("tasks"),
    capability: Schema.Struct({ id: Schema.String, name: Schema.String, purpose: Schema.String }),
    surfaces: Schema.Array(
        Schema.Struct({
            name: Schema.String,
            actions: Schema.Array(
                Schema.Struct({
                    id: Schema.String,
                    what: Schema.String,
                    startedBy: Schema.String,
                    rules: Schema.Array(Schema.String),
                    place: Place,
                }),
            ),
        }),
    ),
    rules: Schema.Array(Schema.Struct({ id: Schema.String, statement: Schema.String, place: Place })),
    entities: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String })),
    externals: Schema.Array(Schema.Struct({ id: Schema.String, name: Schema.String, kind: Schema.String })),
    identifiers: Schema.Array(Schema.String),
});
const MergeBrief = Schema.Struct({
    kind: Schema.Literal("merge"),
    tasks: Schema.Array(
        Schema.Struct({
            id: Schema.String,
            outcome: Schema.String,
            actor: Schema.String,
            actions: Schema.Number,
            rules: Schema.Number,
        }),
    ),
});
const JourneyBrief = Schema.Union([TasksBrief, MergeBrief]);
export type TasksBrief = typeof TasksBrief.Type;
export type MergeBrief = typeof MergeBrief.Type;

export const mergeJobId = "journeys-merge";

const IdRow = Schema.Struct({ id: Schema.String });
const NameRow = Schema.Struct({ id: Schema.String, name: Schema.String });
const ExternalRow = Schema.Struct({ id: Schema.String, name: Schema.String, kind: Schema.String });

/**
 * Every entry point of a capability, across its layers.
 * @param payload the capability's payload
 * @returns the entry points
 */
const actionsOf = (payload: CapabilityPayload) => payload.layers.flatMap((layer) => layer.actions);

/**
 * Every capability that holds an entry point, with its payload and the rules it owns. An entry point is the
 * capability's alone; a rule reached from the entry points of several capabilities belongs to the one holding the
 * fewest entry points (then the first by name), so each rule is in exactly one job.
 * @returns the units, smallest first, each with the ids of its entry points and of the rules it owns
 */
const journeyUnits = Effect.fnUntraced(function* () {
    const store = yield* RecordStore;
    const ids = yield* read(store, IdRow, (sql) => sql`SELECT capability AS id FROM v_capability ORDER BY id`);
    const payloads: CapabilityPayload[] = [];
    for (const { id } of ids) {
        payloads.push(yield* capabilityPayload(store, id, ""));
    }
    const slugs = capabilitySlugs(payloads.map((payload) => payload.capability));
    const ordered = payloads
        .filter((payload) => actionsOf(payload).length > 0)
        .toSorted(
            (left, right) =>
                actionsOf(left).length - actionsOf(right).length ||
                compareText(left.capability.name, right.capability.name) ||
                compareText(left.capability.id, right.capability.id),
        );
    const owned = new Set<string>();
    const units = ordered.map((payload) => {
        const rules = [...new Set(actionsOf(payload).flatMap((action) => action.rules))].filter((id) => {
            const fresh = !owned.has(id);
            owned.add(id);
            return fresh;
        });
        const slug = slugs.get(payload.capability.id);
        return { payload, rules, slug: slug === undefined ? "capability" : slug };
    });
    return units;
});

/**
 * The jobs of the journeys of today: one per capability holding an entry point, then, when there are two or more, the one
 * that joins tasks written twice. Decided from the accepted records alone, so it is the same each time it is asked; it
 * is kept in a file the first time, and not before Capabilities and entities has accepted records.
 * @param root the analysis root
 * @returns the jobs; none before there is an analysis to read
 */
export const readJourneyList = Effect.fnUntraced(function* (root: string) {
    const files = yield* FileAccess;
    const path = analysisPaths(root).journeys.list;
    if (yield* files.exists(path)) {
        return yield* readDocumentStrictly(path, JourneyJobs);
    }
    if (!(yield* (yield* StageRecords).stageHasAcceptedRecords("capabilities-and-entities"))) {
        return [];
    }
    const units = yield* journeyUnits();
    const tasks = units.map((unit): JourneyJob => ({
        jobId: `journeys-of-${unit.slug}`,
        name: `the tasks of ${unit.payload.capability.name}`,
        kind: "tasks",
        capability: unit.payload.capability.id,
        slug: unit.slug,
        actions: actionsOf(unit.payload).map((action) => action.id),
        rules: unit.rules,
    }));
    const jobs: JourneyJob[] = [
        ...tasks,
        ...(tasks.length > 1
            ? [
                  {
                      jobId: mergeJobId,
                      name: "the tasks joined",
                      kind: "merge" as const,
                      capability: "",
                      slug: "",
                      actions: [],
                      rules: [],
                  },
              ]
            : []),
    ];
    yield* files.writeText(path, `${JSON.stringify(jobs, null, 2)}\n`);
    return jobs;
});

/**
 * One job of the journeys, by its job id.
 * @param root the analysis root
 * @param jobId the job id
 * @returns the job, or none
 */
export const journeyJobNamed = Effect.fnUntraced(function* (root: string, jobId: string) {
    return (yield* readJourneyList(root)).find((each) => each.jobId === jobId);
});

/**
 * The entry points, rules, kinds of data and outside systems a tasks job reads, with the names of the old system's own
 * structure its words must not carry; written for the job's agent and its gate.
 * @param root the analysis root
 * @param job the tasks job
 * @returns nothing once written
 */
const writeTasksBrief = Effect.fnUntraced(function* (root: string, job: JourneyJob) {
    const store = yield* RecordStore;
    const payload = yield* capabilityPayload(store, job.capability, "");
    const actions = actionsOf(payload).filter((action) => job.actions.includes(action.id));
    const rules = payload.layers.flatMap((layer) => layer.rules).filter((rule) => job.rules.includes(rule.id));
    const surfaces = [...new Set(actions.map((action) => action.screen))].toSorted();
    const entities = yield* read(
        store,
        NameRow,
        (sql) => sql`SELECT id, json_extract(body, '$.name') AS name FROM record WHERE type = 'Entity' ORDER BY id`,
    );
    const externals = yield* read(
        store,
        ExternalRow,
        (sql) =>
            sql`SELECT id, json_extract(body, '$.name') AS name, json_extract(body, '$.kind') AS kind
                FROM record WHERE type = 'ExternalSystem' ORDER BY id`,
    );
    const brief: TasksBrief = {
        kind: "tasks",
        capability: payload.capability,
        surfaces: surfaces.map((name) => ({
            name: name === "" ? "entry points no screen holds" : name,
            actions: actions
                .filter((action) => action.screen === name)
                .map((action) => ({
                    id: action.id,
                    what: action.purpose,
                    startedBy: action.startedBy,
                    rules: action.rules.filter((rule) => job.rules.includes(rule)),
                    place: action.place,
                })),
        })),
        rules: rules.map((rule) => ({ id: rule.id, statement: rule.says, place: rule.place })),
        entities,
        externals,
        identifiers: identifiersOf([
            ...actions.flatMap((action) => [action.name, action.screen, basename(action.place.file)]),
            ...payload.layers.map((layer) => layer.name),
            ...payload.screens.flatMap((screen) => screen.controls.map((control) => control.name)),
        ]),
    };
    yield* (yield* FileAccess).writeText(
        analysisPaths(root).journeys.brief(job.jobId),
        `${JSON.stringify(brief, null, 2)}\n`,
    );
});

/**
 * What the tasks the jobs wrote are, for the job that joins them: each task's id, outcome and actor with how many entry
 * points and rules it holds. A job whose output is missing (refused) contributes none.
 * @param root the analysis root
 * @param jobs the jobs of the journeys
 * @returns the tasks
 */
const writtenTasks = Effect.fnUntraced(function* (root: string, jobs: readonly JourneyJob[]) {
    const files = yield* FileAccess;
    const written: MergeBrief["tasks"][number][] = [];
    for (const job of jobs.filter((each) => each.kind === "tasks")) {
        const path = analysisPaths(root).journeys.files(job.jobId).outputPath;
        if (!(yield* files.exists(path))) {
            continue;
        }
        for (const journey of (yield* readAgentOutput(path, { Journey })).of("Journey")) {
            written.push({
                id: taskIdOf(job.slug, journey.task),
                outcome: journey.outcome,
                actor: journey.actor,
                actions: journey.actions.length,
                rules: journey.rules.length,
            });
        }
    }
    return written;
});

/**
 * Write a job's brief for its agent and its gate: a tasks job's from the store, the joining job's from the tasks the
 * others wrote.
 * @param root the analysis root
 * @param job the job
 * @returns nothing once written
 */
export const writeJourneyBrief = Effect.fnUntraced(function* (root: string, job: JourneyJob) {
    if (job.kind === "tasks") {
        return yield* writeTasksBrief(root, job);
    }
    const brief: MergeBrief = { kind: "merge", tasks: yield* writtenTasks(root, yield* readJourneyList(root)) };
    yield* (yield* FileAccess).writeText(
        analysisPaths(root).journeys.brief(job.jobId),
        `${JSON.stringify(brief, null, 2)}\n`,
    );
});

/**
 * A job's brief as written; the gate reads what the job was given.
 * @param root the analysis root
 * @param job the job
 * @returns the brief; FileNotFound before `prepare` writes it
 */
export const readJourneyBrief = (root: string, job: JourneyJob) =>
    readDocumentStrictly(analysisPaths(root).journeys.brief(job.jobId), JourneyBrief);
