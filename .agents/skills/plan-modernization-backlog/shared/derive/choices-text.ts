import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Plan } from "../model/plan";
import type { Layout } from "../model/layout";
import { CHOICE_LABELS as L } from "./labels";

/*
 * The text a reader copies for the Choices page: the decisions about the target's design (what was picked, and why)
 * and the plan's decisions about the target codebase (what was chosen, and why). Written here, from the records; the
 * app only carries it.
 */

type Pick = { of: string; variant: string };
type TargetChoice = { decision: string; picks: Pick[]; reason: string };

const topicOf = (decision: Plan["decisions"][number]) =>
    decision.topic._tag === "integration"
        ? decision.topic.system
        : decision.topic._tag === "scope"
          ? decision.topic.capability
          : decision.topic._tag === "note"
            ? `Note ${decision.topic.number} of the request`
            : decision.topic._tag === "area"
              ? decision.topic.name
              : decision.layer;

/**
 * The choices text.
 * @param layout the run's folders
 * @param plan the plan
 * @returns the markdown
 */
export const choicesText = (layout: Layout, plan: Plan): string => {
    const folder = join(layout.outputRoot, "target");
    const choices: TargetChoice[] = ["choice-as-is.json", "choice-journeys.json", "choice-architecture.json", "choice-components.json"]
        .filter((name) => existsSync(join(folder, name)))
        .map((name) => JSON.parse(readFileSync(join(folder, name), "utf8")) as TargetChoice);
    const layerName = new Map(plan.layers.map((layer) => [layer.id as string, layer.name]));
    return [
        `## ${L.whatItIs}`,
        "",
        `What was decided for the new system: ${choices.length} choices about its design and ${plan.decisions.length} about its codebase.`,
        "",
        `## ${L.holds}`,
        "",
        `### ${L.target}`,
        ...choices.flatMap((choice) => [
            `- ${choice.decision}: ${choice.picks.length === 1 ? `${L.picked} ${choice.picks[0]?.variant}` : `${choice.picks.length} picks`}. ${choice.reason}`,
        ]),
        "",
        `### ${L.codebase}`,
        ...plan.decisions.flatMap((decision) => [
            `- ${topicOf(decision)}${decision.layer === "" ? "" : ` (${layerName.get(decision.layer as string) ?? decision.layer})`}`,
            `  - ${L.chose}: ${decision.chose}`,
            `  - ${L.why}: ${decision.reason}`,
        ]),
        "",
    ].join("\n");
};
