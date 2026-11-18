import { join } from "node:path";
import { DateTime, Effect } from "effect";
import { assetFiles } from "../page-components/assets";
import { codePage, evidencePage, planPage, startPage } from "./pages/reader-pages";
import { readRun } from "./run-context";
import type { Stage } from "./run-layout";
import type { Drawer, StageView } from "./stage-run-frame";
import type { StageSummary } from "./stage-model";
import type { ScriptError } from "./script-errors";
import { System } from "./system";
import type { Services } from "./services";

export type Render = (runFolder: string) => Effect.Effect<void, ScriptError, Services>;

/**
 * Redraws the whole run from what is on disk, reading the clock once. Every stage draws itself; the shared page
 * files are copied, and the plan, code, evidence and start pages are built from what the stages show.
 * @param drawers every stage's drawing, in the order the run goes
 * @returns the render step, given the run folder
 * Writes: the shared page assets, `plan.html`, `code.html`, `evidence.html` (each only when it has something to show) and the start page; removes any of the three pages left with nothing to show.
 */
export const renderRun = (drawers: readonly Drawer[]): Render =>
    Effect.fn("RenderRun.renderRun")(function* (runFolder: string) {
        const system = yield* System;
        const run = yield* readRun(runFolder);
        const madeAt = DateTime.formatIso(yield* DateTime.now);
        const summaries = new Map<Stage, StageSummary>();
        const views = new Map<Stage, StageView>();
        for (const draw of drawers) {
            const drawn = yield* draw(run, madeAt);
            const { summary } = drawn;
            if (summary._tag === "notStarted") {
                continue;
            }
            summaries.set(drawn.stage, summary);
            views.set(drawn.stage, drawn.view);
        }
        for (const file of assetFiles()) {
            yield* system.writeText(join(run.layout.assets, "..", file.path), file.text);
        }
        const parts = { run, summaries, views, madeAt };
        const pages = { plan: planPage(parts), code: codePage(parts), evidence: evidencePage(parts) };
        for (const [name, text] of Object.entries(pages)) {
            const path = join(run.layout.root, `${name}.html`);
            yield* text === undefined ? system.remove(path) : system.writeText(path, text);
        }
        const existing = {
            plan: pages.plan !== undefined,
            code: pages.code !== undefined,
            evidence: pages.evidence !== undefined,
        };
        yield* system.writeText(run.layout.runPage, startPage(parts, existing));
    });
