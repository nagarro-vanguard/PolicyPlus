import { existsSync, readFileSync } from "node:fs";
import { Schema } from "effect";
import type { Layout } from "./model/layout";
import { Choice, FinalArchitecture, StoredArchitecture, StoredJourney, Task } from "./model/records";
import { RequestView } from "./model/request-view";
import type { LegacySheet } from "./derive/legacy";

const readJson = (path: string) => JSON.parse(readFileSync(path, "utf8")) as unknown;

export const loadRequest = (layout: Layout) => Schema.decodeUnknownSync(RequestView)(readJson(layout.requestJson));
export const loadLegacy = (layout: Layout) => readJson(layout.legacy) as LegacySheet;
export const loadTasks = (layout: Layout): readonly Task[] =>
    existsSync(layout.current)
        ? Schema.decodeUnknownSync(Schema.Array(Task))((readJson(layout.current) as { tasks: unknown }).tasks)
        : [];
export const loadJourneys = (layout: Layout): readonly StoredJourney[] =>
    existsSync(layout.journeys) ? Schema.decodeUnknownSync(Schema.Array(StoredJourney))(readJson(layout.journeys)) : [];
export const loadJourneyVariants = (layout: Layout): readonly StoredJourney[] =>
    existsSync(layout.journeyVariants)
        ? Schema.decodeUnknownSync(Schema.Array(StoredJourney))(readJson(layout.journeyVariants))
        : [];
export const loadArchitectureVariants = (layout: Layout) =>
    existsSync(layout.architectureVariants)
        ? Schema.decodeUnknownSync(Schema.Array(StoredArchitecture))(readJson(layout.architectureVariants))
        : [];
export const loadArchitecture = (layout: Layout) =>
    existsSync(layout.architecture)
        ? Schema.decodeUnknownSync(FinalArchitecture)(readJson(layout.architecture))
        : undefined;
export const loadChoice = (path: string) =>
    existsSync(path) ? Schema.decodeUnknownSync(Choice)(readJson(path)) : undefined;

/** The ids of the outside systems the tasks reach. */
export const needsOf = (tasks: readonly Task[]) => [
    ...new Set(tasks.flatMap((task) => task.needs as readonly string[])),
];
