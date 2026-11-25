import { existsSync } from "node:fs";
import { join } from "node:path";
import { z } from "zod";
import { contextOf, idsOf, parentOf } from "./build/context";
import { briefOf } from "./build/brief";
import { viewsOf } from "./build/views";
import { evidenceOf } from "./build/evidence";
import { factsOf, type Facts } from "./build/facts";
import { hierarchyOf, levels } from "./build/hierarchy";
import { architectureOf, proposedOf, todayOf, traceOf } from "./build/journeys";
import { Numbers } from "./build/numbers";
import { planViewsOf, type PlanViews } from "./build/plan-views";
import { plainTextOf } from "./build/plain";
import { personasOf } from "./build/personas";
import { searchOf } from "./build/search";
import { slugify, Slugs } from "./build/text";
import { caseContractVersion, caseFiles, Manifest, schemaPathOf } from "./contract";
import { ComposeError } from "./errors";
import { compareText, distinct, sha256, stableJson } from "./io";
import { readPayloads } from "./inputs/payloads";
import { readPlan, readRequest } from "./inputs/plan";
import { readTarget } from "./inputs/target";

/*
 * compose: the one place that joins. It reads the analysis's payloads, and the target and plan when given, and writes
 * `case/`: the facts with every record once, the hierarchy with counts scoped to each path, one numbers table, the
 * journey trace and the plan's views, the views (pictures) with their text, evidence, search and the context texts, each
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

    const raw = factsOf(payloads);
    const plain = plainTextOf(raw);
    // A rule's review reading may cite other records by id; the reader meets their words.
    const facts: Facts = { ...raw, rules: raw.rules.map((rule) => ({ ...rule, why: plain(rule.why) })) };
    const numbers = new Numbers();
    const hierarchy = hierarchyOf(facts, numbers);
    const slugs = new Slugs();
    const today = todayOf(payloads, target, facts, slugs);
    const proposed = target === undefined ? [] : proposedOf(target, today);
    const built = target === undefined ? undefined : architectureOf(target, facts, slugs, proposed);
    const architecture =
        built === undefined ? undefined : { ...built, risks: built.risks.map((risk) => plain(risk)) };
    const storiesOfStep = new Map<string, string[]>();
    for (const story of plan?.plan.stories ?? [])
        for (const step of story.steps ?? []) storiesOfStep.set(step, [...(storiesOfStep.get(step) ?? []), story.key]);
    const trace = architecture === undefined ? [] : traceOf(proposed, architecture, storiesOfStep);
    const views =
        plan === undefined
            ? undefined
            : planViewsOf(plan, request, proposed, architecture, trace, target?.disputes ?? [], plain);
    const brief = briefOf(facts, request, architecture, views, numbers);
    journeyNumbers(numbers, today, proposed, architecture);
    if (views !== undefined) planNumbers(numbers, views);
    const pictures = viewsOf(facts, hierarchy.nodeOf, target);
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
    const folders = {
        analysis: join(options.payloads, "..", "contexts"),
        target: options.target === undefined ? undefined : join(options.target, "target", "contexts"),
        plan: options.plan === undefined ? undefined : join(options.plan, "work-items", "contexts"),
    };
    const ids = idsOf(raw, proposed, plan?.plan.decisions, plan?.plan.stories.map((story) => ({ id: story.key })));
    const context = contextOf(facts, hierarchy, plan, proposed, folders, roots, ids);
    if (context.problems.length > 0)
        throw new ComposeError("missing", `the copy contexts are not whole: ${context.problems.slice(0, 5).join("; ")}`);

    const input = {
        payloads,
        facts,
        hierarchy,
        numbers,
        pictures,
        today,
        target,
        proposed,
        architecture,
        trace,
        plan,
        views,
        context,
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
    const { payloads, facts, hierarchy, numbers, pictures, today, proposed, architecture, trace, views, context } =
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
        "views.json": pictures,
        "evidence.json": evidence,
        "search.json": searchOf(hierarchy.nodes, {
            journeys: today.map((journey) => ({
                slug: journey.slug,
                title: journey.title,
                outcome: journey.outcome,
                capability: facts.capabilities.find((each) => each.id === journey.capability)?.name ?? "",
            })),
            stories: (views?.stories ?? []).map((story) => ({
                sequence: story.sequence,
                title: story.title,
                what: story.what,
                epic: views?.epics.find((epic) => epic.key === story.epic)?.label ?? "",
            })),
            risks: facts.risks,
            domains: architecture?.domains ?? [],
        }),
        "brief.json": brief,
        "journeys/today.json": today,
        "journeys/personas.json": personasOf(join(options.payloads, "..", "personas.json"), facts, proposed),
        "context/index.json": context.sizes,
        ...Object.fromEntries(
            Object.entries(context.texts).map(([kind, texts]) => [`context/${kind}.json`, texts]),
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
                since:
                    gate.since === undefined
                        ? null
                        : {
                              ...gate.since,
                              names: Object.fromEntries(
                                  [...gate.since.added, ...gate.since.removed, ...gate.since.changed]
                                      .sort(compareText)
                                      .flatMap((key) => {
                                          const name = gate.names?.get(key);
                                          return name === undefined ? [] : [[key, name] as const];
                                      }),
                              ),
                          },
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
            "plan/matrix.json": views.matrix,
            "plan/conflicts.json": views.conflicts,
            "plan/unplanned.json": views.unplanned,
            "plan/stale.json": views.stale,
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
                          state: target.state,
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
            views: pictures.length,
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
    const rule = { one: "business rule", many: "business rules" };
    for (const each of today) {
        numbers.add({
            key: `journey/${each.slug}/steps/today`,
            value: each.steps.length,
            noun: { one: "step today", many: "steps today" },
            scope: "steps of this journey as it runs today",
            source: "the analysis's journeys",
        });
    }
    if (architecture === undefined) return;
    for (const way of proposed) {
        const changed = distinct(way.steps.flatMap((step) => step.changes.map((change) => change.rule)));
        const kept = distinct(way.steps.flatMap((step) => step.kept)).filter((id) => !changed.includes(id));
        const base = `journey/${way.slug}`;
        numbers.add({
            key: `${base}/steps/proposed`,
            value: way.steps.length,
            noun: { one: "step in the new way", many: "steps in the new way" },
            scope: "steps of the chosen new way of this journey",
            source: "the chosen journeys",
        });
        const ruleNumbers = (key: string, steps: string, values: { kept: number; changed: number; dropped: number }) => {
            numbers.add({
                key: `${key}/rules/kept`,
                value: values.kept,
                noun: { one: "business rule kept", many: "business rules kept" },
                scope: `business rules ${steps} applies as today, each counted once`,
                source: "the chosen journeys' steps",
            });
            numbers.add({
                key: `${key}/rules/changed`,
                value: values.changed,
                noun: { one: "business rule changed", many: "business rules changed" },
                scope: `business rules ${steps} applies differently from today, each counted once`,
                source: "the chosen journeys' changes",
            });
            numbers.add({
                key: `${key}/rules/dropped`,
                value: values.dropped,
                noun: { one: "business rule left out", many: "business rules left out" },
                scope: `business rules ${steps} leaves out on purpose, each counted once`,
                source: "the chosen journeys' drops",
            });
        };
        ruleNumbers(base, "the new way of this journey", {
            kept: kept.length,
            changed: changed.length,
            dropped: way.dropped.length,
        });
        for (const step of way.steps) {
            ruleNumbers(`${base}/step/${step.number}`, "this step", {
                kept: step.kept.length,
                changed: distinct(step.changes.map((change) => change.rule)).length,
                dropped: way.dropped.filter((id) => step.honours.includes(id)).length,
            });
        }
    }
    numbers.add({
        key: "journeys/dropped/actions",
        value: distinct(proposed.flatMap((each) => each.drops.flatMap((drop) => drop.actions))).length,
        noun: { one: "action", many: "actions" },
        scope: "actions of today the chosen journeys leave out on purpose, each counted once",
        source: "the chosen journeys' drops",
    });
    numbers.combined(
        "journeys/strategies",
        journey,
        distinct(proposed.map((each) => each.strategy)).map((strategy) => ({
            kind: slugify(strategy),
            value: proposed.filter((each) => each.strategy === strategy).length,
            noun: { one: `${strategy} journey`, many: `${strategy} journeys` },
        })),
        "chosen journeys, by the kind of new way chosen",
        "the chosen journeys",
    );
    if (architecture.score !== null) {
        const score = architecture.score;
        numbers.add({
            key: "architecture/score/steps",
            value: score.steps,
            noun: step,
            scope: "steps of the chosen journeys the chosen architecture was scored on",
            source: "the chosen architecture's score",
        });
        numbers.add({
            key: "architecture/score/steps-served",
            value: score.stepsServed,
            noun: step,
            scope: "steps of the chosen journeys a component of the chosen architecture serves",
            source: "the chosen architecture's score",
        });
        numbers.add({
            key: "architecture/score/rules",
            value: score.rules,
            noun: rule,
            scope: "business rules the chosen architecture was scored on",
            source: "the chosen architecture's score",
        });
        numbers.add({
            key: "architecture/score/rules-assigned",
            value: score.rulesAssigned,
            noun: rule,
            scope: "business rules the chosen architecture gives a domain",
            source: "the chosen architecture's score",
        });
    }
    for (const domain of architecture.domains) {
        numbers.add({
            key: `architecture/domain/${domain.slug}/components`,
            value: domain.components,
            noun: { one: "component", many: "components" },
            scope: "components of this domain, each counted once",
            source: "the chosen architecture",
        });
        numbers.add({
            key: `architecture/domain/${domain.slug}/rules`,
            value: domain.rules.length,
            noun: { one: "business rule placed here", many: "business rules placed here" },
            scope: "business rules of today this domain holds, each counted once",
            source: "the chosen architecture",
        });
    }
    for (const row of architecture.landing.layers) {
        numbers.add({
            key: row.number,
            value: row.rules,
            noun: rule,
            scope:
                row.layer === null
                    ? "business rules of today in no layer"
                    : "business rules of today decided in this layer",
            source: "the analysis's rules",
        });
    }
    for (const cell of architecture.landing.cells) {
        numbers.add({
            key: cell.number,
            value: cell.rules.length,
            noun: rule,
            scope:
                cell.domain === ""
                    ? "business rules of today in this layer that no domain holds"
                    : "business rules of today in this layer that this domain holds",
            source: "the analysis's rules and the chosen architecture",
        });
    }
    numbers.add({
        key: "architecture/unplaced",
        value: architecture.unplaced.length,
        noun: rule,
        scope: "business rules of today that no domain of the chosen architecture holds",
        source: "the analysis's rules and the chosen architecture",
    });
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

const planNumbers = (numbers: Numbers, views: PlanViews) => {
    numbers.add({
        key: "plan/unplanned",
        value: views.unplanned.length,
        noun: { one: "place in the code", many: "places in the code" },
        scope: "places in the code nothing the analysis followed reaches, so no story builds them",
        source: "the plan's coverage",
    });
};
