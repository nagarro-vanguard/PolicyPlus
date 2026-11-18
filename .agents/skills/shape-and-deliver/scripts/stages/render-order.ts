import { renderRun } from "../core/render-run";
import { changeReviewDraw } from "./change-review/render-page";
import { changesDraw } from "./changes/render-page";
import { codeDraw } from "./code/render-page";
import { orientDraw } from "./orient/render-page";
import { planReviewDraw } from "./plan-review/render-page";
import { testsFirstDraw } from "./tests-first/render-page";
import { testsDraw } from "./tests/render-page";
import { traceDraw } from "./trace/render-page";
import { workItemDraw } from "./work-item/render-page";

/** The run's render step: it draws every stage, in the order the run goes, and is the one place that lists them. */
export const render = renderRun([
    workItemDraw,
    orientDraw,
    traceDraw,
    changesDraw,
    testsDraw,
    planReviewDraw,
    testsFirstDraw,
    codeDraw,
    changeReviewDraw,
]);
