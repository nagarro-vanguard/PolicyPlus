import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { Schema } from "effect";
import type { Layout } from "../model/layout";
import { Task } from "../model/records";
import { loadChoice, loadLegacy, loadRequest } from "../run";
import { deriveEssence } from "./essence";
import { missing } from "./graph";
import type { LegacySheet } from "./legacy";

/*
 * Today's tasks are written by the code analysis, which reads the code: its `payloads/journeys.json` holds each task
 * with its outcome, its entry points and rules and the steps it takes. This skill reads that file and no more, and
 * keeps the tasks in `target/current.json`, the file the as-is decision is made about.
 */
const Journeys = Schema.Struct({ journeys: Schema.Array(Task) });

export const journeysFile = (layout: Layout) => join(layout.payloads, "journeys.json");

export type Derived = { ok: boolean; text: string };

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as unknown;

const holds = (path: string, text: string) => {
    try {
        return isDeepStrictEqual(readJson(path), JSON.parse(text));
    } catch {
        return false;
    }
};

/**
 * Writes a file only when what it holds changes (the order of a record's properties is no change), so a decision made
 * about it stays confirmed while nothing differs.
 * @param path the file
 * @param value what it holds
 * @returns whether the file was written
 */
const writeIfChanged = (path: string, value: unknown) => {
    const text = `${JSON.stringify(value, null, 2)}\n`;
    if (existsSync(path) && holds(path, text)) return false;
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, text);
    return true;
};

/**
 * What the analysis's tasks must hold against the legacy sheet: every entry point and rule in exactly one task, and no
 * task naming one the analysis does not hold.
 * @param tasks the analysis's tasks
 * @param legacy the legacy sheet
 * @returns one line per gap
 */
export const journeyGaps = (tasks: readonly Task[], legacy: LegacySheet): string[] => {
    const gaps: string[] = [];
    const ids = tasks.map((task) => task.id);
    if (new Set(ids).size !== ids.length) gaps.push("two tasks share an id");
    for (const [name, wanted, pick] of [
        ["entry points", Object.keys(legacy.actions), (task: Task) => task.actions as readonly string[]],
        ["rules", Object.keys(legacy.rules), (task: Task) => task.rules as readonly string[]],
    ] as const) {
        const seen = new Map<string, number>();
        for (const task of tasks) for (const id of pick(task)) seen.set(id, (seen.get(id) ?? 0) + 1);
        const lost = missing(wanted, new Set(seen.keys()));
        if (lost.count > 0) gaps.push(`${lost.count} ${name} belong to no task: ${lost.text}`);
        const own = new Set(wanted);
        for (const [id, count] of seen) {
            if (!own.has(id)) gaps.push(`${name.slice(0, -1)} ${id} is in a task but is not in the analysis`);
            else if (count > 1) gaps.push(`${name.slice(0, -1)} ${id} is in ${count} tasks, not one`);
        }
    }
    for (const task of tasks) {
        const own = new Set<string>(task.actions);
        const used = new Set<string>();
        task.current.forEach((step, at) => {
            for (const id of step.from) {
                used.add(id);
                if (!own.has(id))
                    gaps.push(`task ${task.id}, step ${at + 1} today: cites ${id}, which is not the task's`);
            }
        });
        const lost = missing(own, used);
        if (lost.count > 0)
            gaps.push(`task ${task.id}: ${lost.count} entry points are in no step of today's journey: ${lost.text}`);
        for (const id of task.facts)
            if (legacy.entities[id] === undefined) gaps.push(`task ${task.id}: unknown kind of data ${id}`);
        for (const id of task.needs)
            if (legacy.externals[id] === undefined) gaps.push(`task ${task.id}: unknown outside system ${id}`);
    }
    return gaps;
};

/**
 * Makes `target/current.json` and `target/essence.json` from the analysis's journeys. A run made before the analysis
 * wrote journeys, whose `target/current.json` exists and whose analysis has no `journeys.json`, keeps that file as it is,
 * so nothing already confirmed is invalidated. Files that would not change are not written.
 * @param layout the run's folders
 * @returns whether it was made, and what it did
 */
export const deriveCurrent = (layout: Layout): Derived => {
    const source = journeysFile(layout);
    if (!existsSync(source)) {
        return existsSync(layout.current)
            ? {
                  ok: true,
                  text: `the analysis has no journeys.json: kept ${layout.current} as it is (made before the analysis wrote journeys)`,
              }
            : {
                  ok: false,
                  text: `no journeys: ${source} does not exist and neither does ${layout.current}; run the code analysis through Publish and its write-payloads.ts first`,
              };
    }
    if (!existsSync(layout.legacy))
        return { ok: false, text: "the legacy sheet is missing: run `derive.ts legacy` first" };
    let tasks: readonly Task[];
    try {
        tasks = Schema.decodeUnknownSync(Journeys)(readJson(source)).journeys;
    } catch (error) {
        return {
            ok: false,
            text: `${source} does not hold journeys as expected: ${String(error).split("\n").slice(0, 3).join(" ")}`,
        };
    }
    const legacy = loadLegacy(layout);
    const gaps = journeyGaps(tasks, legacy);
    if (gaps.length > 0)
        return {
            ok: false,
            text: `the analysis's journeys do not add up:\n${gaps.map((gap) => `- ${gap}`).join("\n")}\nRun its journeys jobs again, then its write-payloads.ts.`,
        };
    const wrote = writeIfChanged(layout.current, { tasks });
    writeIfChanged(layout.tasksRecord, tasks);
    const marks = loadChoice(layout.choiceAsIs)?.marks ?? [];
    writeIfChanged(layout.essence, deriveEssence(legacy, tasks, loadRequest(layout), marks));
    return {
        ok: true,
        text: `${tasks.length} tasks from the analysis's journeys${wrote ? "" : " (target/current.json already holds them)"}`,
    };
};
