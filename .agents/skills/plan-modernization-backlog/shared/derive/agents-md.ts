import type { ModernizationRequest } from "../model/request";
import type { Decision, TargetLayer } from "../model/records";

export const AGENTS_MD_MAX_LINES = 30;

/** A layer's AGENTS.md as a pure projection of the records: title, `Stack:`, its conventions, and its check. */
export const layerAgentsMd = (layer: TargetLayer, request: ModernizationRequest, decisions: readonly Decision[]) => {
    const stack = layer.carries.map((n) => request.stack[n - 1]).filter((line): line is string => line !== undefined);
    const conventions = decisions
        .filter((d) => d.topic._tag === "convention" && d.layer === layer.id)
        .map((d) => `- ${d.chose.trim()}`);
    return [
        `# ${layer.name}: ${layer.purpose}`,
        ...(stack.length > 0 ? ["", `Stack: ${stack.join("; ")}.`] : []),
        ...(conventions.length > 0 ? ["", ...conventions] : []),
        "",
        "## Verify",
        "",
        `- \`${layer.check}\``,
        "",
    ].join("\n");
};

/** The target root's AGENTS.md: the layers table, the person's Work tracking text, and the workspace conventions. */
export const rootAgentsMd = (
    request: ModernizationRequest,
    layers: readonly TargetLayer[],
    decisions: readonly Decision[],
    workTracking: string,
) => {
    const name = (id: string) => layers.find((layer) => layer.id === id)?.name ?? id;
    const rows = layers.map(
        (layer) =>
            `| ${layer.name} | ${layer.path} | ${layer.kind} | ${layer.dependsOn.length === 0 ? "-" : layer.dependsOn.map(name).join(", ")} |`,
    );
    const rules = decisions
        .filter((d) => d.topic._tag === "convention" && d.layer === "workspace")
        .map((d) => `- ${d.chose.trim()}`);
    return [
        `# ${request.target.split("/").filter(Boolean).at(-1) ?? "workspace"}: the workspace, and the index of every layer`,
        "",
        "Each layer's AGENTS.md governs every line in its folder; this file also governs the workspace layer.",
        "",
        "## Layers",
        "",
        "| Layer | Path | Kind | Depends on |",
        "| --- | --- | --- | --- |",
        "| workspace | . | code | - |",
        ...rows,
        "",
        "## Work tracking",
        "",
        workTracking.trim(),
        ...(rules.length > 0 ? ["", "## Rules", "", ...rules] : []),
        "",
    ].join("\n");
};

/** The text of a `## <heading>` section of a markdown file, or undefined when it has none. */
export const sectionOf = (markdown: string, heading: string) => {
    const lines = markdown.split("\n");
    const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
    if (start < 0) return undefined;
    const rest = lines.slice(start + 1);
    const end = rest.findIndex((line) => line.startsWith("## "));
    return rest
        .slice(0, end < 0 ? rest.length : end)
        .join("\n")
        .trim();
};

/** Non-table, non-blank lines: what the cap on an AGENTS.md counts. */
export const countedLines = (text: string) =>
    text.split("\n").filter((line) => line.trim() !== "" && !line.startsWith("|")).length;
