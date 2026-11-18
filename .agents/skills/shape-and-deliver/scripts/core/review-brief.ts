import type { PlanRequest } from "./delivery-request";
import type { RunLayout } from "./run-layout";

export type Review = "plan" | "change";

/**
 * Lists the paths a review reads: the work item, the records and files to judge, the hand-backs and
 * pages, and for a change the layer checks and manifests. When the owners ran again, it adds the last pass's findings.
 * @param run the run
 * @param run.layout the run's layout
 * @param run.plan the plan request
 * @param review which review
 * @param earlierFindings the path of the last pass's findings, when the owners ran again since
 * @returns the brief, to be written as a file by the caller
 */
export const reviewBrief = (
    run: { readonly layout: RunLayout; readonly plan: PlanRequest },
    review: Review,
    earlierFindings: string | undefined,
) => {
    const { layout, plan } = run;
    const shared = {
        kind: plan.kind,
        codebase: plan.codebase,
        workItemPath: layout.workItem,
        ...(plan.reference === undefined ? {} : { referencePath: plan.reference }),
    };
    const brief =
        review === "plan"
            ? {
                  ...shared,
                  records: {
                      trace: layout.trace.records,
                      changes: layout.changes.records,
                      tests: layout.tests.records,
                  },
                  proposedFiles: { changes: layout.changes.files, tests: layout.tests.files },
                  handBacks: {
                      trace: layout.trace.handBack,
                      changes: layout.changes.handBack,
                      tests: layout.tests.handBack,
                  },
                  pages: { run: layout.runPage, plan: layout.planPage, code: layout.codePage },
              }
            : {
                  ...shared,
                  plan: { changes: layout.changes.records, tests: layout.tests.records },
                  deviations: layout.fix.records,
                  planReviewNotes: layout.review("plan").records,
                  handBacks: { fix: layout.fix.handBack },
                  layerChecks: [layout.layerChecks("afterTests"), layout.layerChecks("afterCode")],
                  manifests: [layout.manifest("afterTests"), layout.manifest("afterCode")],
                  pages: { run: layout.runPage, evidence: layout.evidencePage, code: layout.codePage },
              };
    return earlierFindings === undefined ? brief : { ...brief, earlierFindings };
};
