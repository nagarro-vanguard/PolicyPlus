import { layerOfPath } from "../../core/codebase";
import type { Run } from "../../core/run-context";
import type { ChangesFound } from "./render-model";

/**
 * Gathers the design decisions and diagrams, then each changed file under its code layer, layers in dependency order,
 * with its text before and after (empty when unknown). Leaves out layers with no changed file.
 * @param run the run
 * @returns the findings
 */
export const changesFound = (run: Run): typeof ChangesFound.Type => {
    const { screens } = run.codebase;
    const variants = screens === undefined ? undefined : screens.variants.replaceAll("{story}", run.plan.workItemId);
    const isDesign = run.workItem !== undefined && run.workItem.kind === "design";
    const changesProduct = (change: Run["records"]["changes"][number]) =>
        isDesign && variants !== undefined && change.action !== "generate" && !change.path.startsWith(`${variants}/`);
    return {
        decisions: run.records.decisions,
        views: run.records.views,
        layers: run.codebase.layers
            .filter((layer) => layer.kind === "code")
            .map((layer) => ({
                layer: layer.name,
                files: run.records.changes
                    .filter((change) => {
                        const owner = layerOfPath(run.codebase, change.path);
                        return owner !== undefined && owner.name === layer.name;
                    })
                    .map((change) => {
                        const file = run.files.get(change.path);
                        return {
                            change,
                            product: changesProduct(change),
                            before: file === undefined ? "" : file.before,
                            after: file === undefined ? "" : file.after,
                        };
                    }),
            }))
            .filter((layer) => layer.files.length > 0),
    };
};
