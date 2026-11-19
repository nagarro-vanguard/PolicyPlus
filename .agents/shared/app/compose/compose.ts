import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { assistantOf, parentOf } from "./build/assistant";
import { briefOf } from "./build/brief";
import { diagramsOf } from "./build/diagrams";
import { evidenceOf } from "./build/evidence";
import { factsOf, type Facts } from "./build/facts";
import { hierarchyOf, levels } from "./build/hierarchy";
import { architectureOf, proposedOf, todayOf, traceOf } from "./build/journeys";
import { Numbers } from "./build/numbers";
import { planViewsOf } from "./build/plan-views";
import { searchOf } from "./build/search";
import { Slugs } from "./build/text";
import { caseContractVersion, caseFiles, Manifest, schemaPathOf } from "./contract";
import { ComposeError } from "./errors";
import { compareText, distinct, sha256, stableJson } from "./io";
import { readPayloads } from "./inputs/payloads";
import { readPlan, readRequest } from "./inputs/plan";
import { readTarget } from "./inputs/target";

/*
 * compose: the one place that joins. It reads the analysis's payloads, and the target and plan when given, and writes
 * `case/`: the facts with every record once, the hierarchy with counts scoped to each path, one numbers table, the
 * journey trace and the plan's views, diagrams with their text, evidence, search and the texts for an assistant, each
 * file checked against its schema, with a manifest of digests and input fingerprints. Nothing in it reads a database,
 * the conductor's state or a clock.
 */

export type ComposeOptions = {
    payloads: string;
    target?: string;
    plan?: string;
    /** The analysed code's folder, for evidence; the analysis's own record of it when left out. */
    source?: string;
};

export type Composed = {
    files: Map<string, string>;
    counts: Record<string, number>;
};

/**
 * Read the inputs and build every part of a case, before it is written.
 * @param options the input folders
 * @returns the parts, as the case is written from them
 */
export const buildCase = (options: ComposeOptions) => {
    const payloads = readPayloads(options.payloads);
    const target = options.target === undefined ? undefined : readTarget(options.target);
    const plan = options.plan === undefined ? undefined : readPlan(options.plan);
    const requestRoot = options.plan ?? options.target;
    const request = requestRoot === undefined ? undefined : readRequest(requestRoot);
    if (
        plan !== undefined &&
        target === undefined &&
        plan.plan.stories.some((story) => (story.steps ?? []).length > 0)
    ) {
        throw new ComposeError("missing", "missing fact: the plan was made from a target, and no --target was given");
    }

    const facts = factsOf(payloads);
    const numbers = new Numbers();
    const hierarchy = hierarchyOf(facts, numbers);
    const slugs = new Slugs();
    const today = todayOf(payloads, target, facts, slugs);
    const proposed = target === undefined ? [] : proposedOf(target, today);
    const architecture = target === undefined ? undefined : architectureOf(target, facts, slugs);
    const storiesOfStep = new Map<string, string[]>();
    for (const story of plan?.plan.stories ?? [])
        for (const step of story.steps ?? []) storiesOfStep.set(step, [...(storiesOfStep.get(step) ?? []), story.key]);
    const trace = architecture === undefined ? [] : traceOf(proposed, architecture, storiesOfStep);
    const views =
        plan === undefined
            ? undefined
            : planViewsOf(plan, request, proposed, architecture, trace, target?.disputes ?? []);
    const brief = briefOf(facts, request, architecture, views, numbers);
    journeyNumbers(numbers, today, proposed, architecture);
    const diagrams = diagramsOf(facts, payloads, hierarchy.nodeOf, today, proposed, architecture);
    const sourceRoot = options.source ?? payloads.sourceRoot;
    const evidence = evidenceOf(facts, sourceRoot);
    // One base for every path a copy text holds: the folder the run sits in (the repository the commands run from),
    // and the analysed code's root, whose files are already named relative to it.
    const runRoot = options.plan ?? options.target;
    const roots = distinct(
        [runRoot === undefined ? undefined : parentOf(runRoot), sourceRoot].filter(
            (folder): folder is string => folder !== undefined,
        ),
    );
    const assistant = assistantOf(facts, payloads, hierarchy, evidence, plan, proposed, roots);

    const input = {
        payloads,
        facts,
        hierarchy,
        numbers,
        diagrams,
        today,
        target,
        proposed,
        architecture,
        trace,
        plan,
        views,
        assistant,
    };
    return { input, target, plan, request, brief, evidence, sourceRoot };
};

/**
 * Compose a case from its inputs, in memory.
 * @param options the input folders
 * @returns every file of the case as text, and the counts
 */
export const compose = (options: ComposeOptions): Composed => {
    const built = buildCase(options);
    const { input, target, plan, request, brief, evidence, sourceRoot } = built;
    const { payloads, facts, hierarchy, numbers, diagrams, today, proposed, architecture, trace, views, assistant } =
        input;

    const values: Record<string, unknown> = {
        ...factFiles(facts),
        ...Object.fromEntries(
            levels.map((level) => [
                `nodes/${level}.json`,
                [...hierarchy.nodes.values()]
                    .filter((node) => node.level === level)
                    .sort((a, b) => compareText(a.key, b.key)),
            ]),
        ),
        "numbers.json": numbers.all(),
        "diagrams.json": diagrams,
        "evidence.json": evidence,
        "search.json": searchOf(hierarchy.nodes),
        "brief.json": brief,
        "journeys/today.json": today,
        "assistant/index.json": assistant.sizes,
        ...Object.fromEntries(
            Object.entries(assistant.texts).map(([kind, texts]) => [`assistant/${kind}.json`, texts]),
        ),
    };
    if (target !== undefined && architecture !== undefined) {
        Object.assign(values, {
            "journeys/proposed.json": proposed,
            "journeys/trace.json": trace,
            "journeys/dropped.json": proposed.flatMap((journey) =>
                journey.drops.map((drop) => ({ journey: journey.id, ...drop })),
            ),
            "journeys/changed.json": target.gates.map((gate) => ({
                gate: gate.gate,
                state: gate.state,
                since: gate.since ?? null,
            })),
            "architecture.json": architecture,
        });
    }
    if (views !== undefined) {
        Object.assign(values, {
            "plan/stories.json": views.stories,
            "plan/epics.json": views.epics,
            "plan/phases.json": views.phases,
            "plan/layers.json": views.layers,
            "plan/decisions.json": views.decisions,
            "plan/ready.json": views.ready,
            "plan/matrix.json": views.matrix,
            "plan/conflicts.json": views.conflicts,
        });
    }

    const files = new Map<string, string>();
    const listed: z.output<typeof Manifest>["files"] = [];
    const encoder = new TextEncoder();
    for (const path of Object.keys(values).sort(compareText)) {
        const schema = caseFiles[path];
        if (schema === undefined)
            throw new ComposeError("input", `compose wrote ${path}, which the contract does not name`);
        const parsed = schema.safeParse(values[path]);
        if (!parsed.success) {
            const issue = parsed.error.issues[0];
            throw new ComposeError(
                "build",
                `${path} breaks its schema at ${issue?.path.join(".") ?? ""}: ${issue?.message ?? ""}`,
            );
        }
        const text = stableJson(values[path]);
        files.set(path, text);
        files.set(schemaPathOf(path), stableJson(z.toJSONSchema(schema, { unrepresentable: "any" })));
        listed.push({ path, schema: schemaPathOf(path), sha256: sha256(text), bytes: encoder.encode(text).length });
    }
    const manifest: z.output<typeof Manifest> = {
        contractVersion: caseContractVersion,
        inputs: {
            payloads: {
                contractVersion: payloads.contractVersion,
                writer: payloads.writer,
                fingerprint: payloads.fingerprint,
            },
            target:
                target === undefined
                    ? null
                    : {
                          contractVersion: target.contractVersion ?? null,
                          fingerprint: target.fingerprint,
                          gates: target.gates.map((gate) => ({ gate: gate.gate, state: gate.state })),
                      },
            plan: plan === undefined ? null : { fingerprint: plan.fingerprint },
            request:
                request === undefined ? null : { goals: request.goals !== undefined, stackLines: request.stack.length },
            source: { readable: sourceRoot !== undefined && existsSync(sourceRoot) },
        },
        files: listed,
    };
    Manifest.parse(manifest);
    files.set("manifest.json", stableJson(manifest));
    files.set("schema/manifest.schema.json", stableJson(z.toJSONSchema(Manifest)));
    return {
        files,
        counts: {
            areas: facts.areas.length,
            capabilities: facts.capabilities.length,
            surfaces: facts.surfaces.length,
            entryPoints: facts.actions.length,
            rules: facts.rules.length,
            risks: facts.risks.length,
            nodes: hierarchy.nodes.size,
            numbers: numbers.all().length,
            diagrams: diagrams.length,
            excerpts: Object.keys(evidence).length,
            journeysToday: today.length,
            journeysProposed: proposed.length,
            stories: views?.stories.length ?? 0,
            sharedRules: hierarchy.sharedRules.length,
            sharedAt: hierarchy.sharedAt,
        },
    };
};

const factFiles = (facts: Facts): Record<string, unknown> => ({
    "facts/system.json": facts.system,
    "facts/kinds.json": facts.kinds,
    "facts/areas.json": facts.areas,
    "facts/capabilities.json": facts.capabilities,
    "facts/surfaces.json": facts.surfaces,
    "facts/actions.json": facts.actions,
    "facts/rules.json": facts.rules,
    "facts/risks.json": facts.risks,
    "facts/entities.json": facts.entities,
    "facts/layers.json": facts.layers,
    "facts/outside.json": facts.outside,
    "facts/parts.json": facts.parts,
    "facts/terms.json": facts.terms,
    "facts/lifecycles.json": facts.lifecycles,
});

const journeyNumbers = (
    numbers: Numbers,
    today: ReturnType<typeof todayOf>,
    proposed: ReturnType<typeof proposedOf>,
    architecture: ReturnType<typeof architectureOf> | undefined,
) => {
    const journey = { one: "journey", many: "journeys" };
    const step = { one: "step", many: "steps" };
    numbers.add({
        key: "journeys/today",
        value: today.length,
        noun: journey,
        scope: "tasks people do with the system today",
        source: "the analysis's journeys",
    });
    numbers.add({
        key: "journeys/today/steps",
        value: today.reduce((sum, each) => sum + each.steps.length, 0),
        noun: step,
        scope: "steps of today's journeys",
        source: "the analysis's journeys",
    });
    if (architecture === undefined) return;
    numbers.add({
        key: "journeys/proposed/steps",
        value: proposed.reduce((sum, each) => sum + each.steps.length, 0),
        noun: step,
        scope: "steps of the chosen new journeys",
        source: "the chosen journeys",
    });
    numbers.add({
        key: "journeys/dropped/rules",
        value: distinct(proposed.flatMap((each) => each.dropped)).length,
        noun: { one: "business rule", many: "business rules" },
        scope: "business rules the chosen journeys leave out on purpose, each counted once",
        source: "the chosen journeys' drops",
    });
    numbers.add({
        key: "journeys/changed/rules",
        value: distinct(proposed.flatMap((each) => each.steps.flatMap((s) => s.changes.map((c) => c.rule)))).length,
        noun: { one: "business rule", many: "business rules" },
        scope: "business rules a chosen step applies differently from today, each counted once",
        source: "the chosen steps' changes",
    });
    numbers.add({
        key: "architecture/domains",
        value: architecture.domains.length,
        noun: { one: "domain", many: "domains" },
        scope: "domains of the chosen architecture",
        source: "the chosen architecture",
    });
    numbers.add({
        key: "architecture/components",
        value: distinct(architecture.components.map((each) => each.name)).length,
        noun: { one: "component", many: "components" },
        scope: "components of the chosen architecture, each counted once",
        source: "the chosen architecture",
    });
    numbers.add({
        key: "architecture/containers",
        value: architecture.containers.length,
        noun: { one: "part that is built and run as one", many: "parts that are built and run as one" },
        scope: "parts of the chosen architecture built and run as one",
        source: "the chosen architecture",
    });
};
