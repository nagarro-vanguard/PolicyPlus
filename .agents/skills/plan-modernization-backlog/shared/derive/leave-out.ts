import { relative } from "node:path";
import type { ModernizationRequest } from "../model/request";

/**
 * The analysis request the conductor derives from the modernization request: the person's own Leave Out, plus what must
 * never be read as legacy (the target, the output root and the skills), and the documents as supporting material.
 * @param request the modernization request
 * @returns the analysis request's text
 */
export const analysisRequestText = (request: ModernizationRequest) => {
    const derived = request.sourceRoots.flatMap((root) =>
        [
            [request.target, "the target codebase being built, never legacy"],
            [request.outputRoot, "the modernization's own output"],
            [`${root}/.agents`, "the skills and tooling, not part of the product"],
        ].flatMap(([path, reason]) => {
            const rel = relative(root, path as string);
            return rel === "" || rel.startsWith("..") ? [] : [`- ${rel}/: ${reason}`];
        }),
    );
    return [
        "# Code Analysis Request",
        "",
        "## Output Root",
        "",
        `${request.outputRoot}/.code-analysis`,
        "",
        "## Source Roots",
        "",
        ...request.sourceRoots.map((root) => `- ${root}`),
        "",
        "## Leave Out",
        "",
        ...request.leaveOut.map((each) => `- ${each.pattern}: ${each.reason}`),
        ...new Set(derived),
        "",
        "## Supporting Material",
        "",
        ...request.documents.map((each) => `- ${each.path}: ${each.whatItIs}`),
        "",
    ].join("\n");
};
