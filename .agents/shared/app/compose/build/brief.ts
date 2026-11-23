import type { RequestInput } from "../inputs/plan";
import type { Facts } from "./facts";
import type { ArchitectureView } from "./journeys";
import type { Numbers } from "./numbers";
import type { PlanViews } from "./plan-views";

/*
 * The Brief's data: what the system is for, the person's Goals verbatim (or nothing, which the app shows as not
 * provided), what changes in plain words from the chosen architecture and the request's stack lines, the risks ranked
 * by a stated rule, and the plan's structure as counts. Nothing here is written by an agent.
 */

/** The rule risks are ranked by, stated so the order can be checked. */
export const riskRankRule =
    "severity first (high, medium, low), then how many capabilities and parts the risk names, then its words";

export type Brief = {
    system: { name: string; purpose: string; summary: string };
    goals: { provided: boolean; text: string | null };
    changes: {
        stack: { line: string; layers: string[] }[];
        containers: { name: string; tech: string; holds: string[] }[];
    } | null;
    risks: { rule: string; top: string[]; ranked: string[] };
    plan: { phases: string; epics: string; stories: string; phaseNames: string[] } | null;
    numbers: string[];
};

/**
 * Build the Brief.
 * @param facts the facts
 * @param request the request, when there is one
 * @param architecture the chosen architecture, when there is one
 * @param plan the plan's views, when there is a plan
 * @param numbers the numbers table
 * @returns the Brief's data
 */
export const briefOf = (
    facts: Facts,
    request: RequestInput | undefined,
    architecture: ArchitectureView | undefined,
    plan: PlanViews | undefined,
    numbers: Numbers,
): Brief => {
    const planNumbers =
        plan === undefined
            ? null
            : {
                  phases: numbers.add({
                      key: "plan/phases",
                      value: plan.phases.length,
                      noun: { one: "phase", many: "phases" },
                      scope: "phases of the plan",
                      source: "the plan",
                  }),
                  epics: numbers.add({
                      key: "plan/epics",
                      value: plan.epics.length,
                      noun: { one: "epic", many: "epics" },
                      scope: "epics of the plan",
                      source: "the plan",
                  }),
                  stories: numbers.combined(
                      "plan/stories",
                      { one: "story", many: "stories" },
                      [
                          {
                              kind: "functional",
                              value: plan.stories.filter((story) => story.kind === "functional").length,
                              noun: { one: "story that ports behaviour", many: "stories that port behaviour" },
                          },
                          {
                              kind: "technical",
                              value: plan.stories.filter((story) => story.kind === "technical").length,
                              noun: { one: "technical story", many: "technical stories" },
                          },
                      ],
                      "stories of the plan",
                      "the plan",
                  ),
                  phaseNames: plan.phases.map((phase) => phase.name),
              };
    const layersOf = (number: number) =>
        plan?.layers
            .filter((layer) => layer.stack.includes(request?.stack[number] ?? "\u0000"))
            .map((layer) => layer.name) ?? [];
    return {
        system: { name: facts.system.name, purpose: facts.system.purpose, summary: facts.system.summary },
        goals: request?.goals === undefined ? { provided: false, text: null } : { provided: true, text: request.goals },
        changes:
            architecture === undefined && (request?.stack.length ?? 0) === 0
                ? null
                : {
                      stack: (request?.stack ?? []).map((line, number) => ({ line, layers: layersOf(number) })),
                      containers: (architecture?.containers ?? []).map((container) => ({
                          name: container.name,
                          tech: container.tech,
                          holds: container.holds,
                      })),
                  },
        risks: {
            rule: riskRankRule,
            top: facts.risks.slice(0, 5).map((risk) => risk.id),
            ranked: facts.risks.map((risk) => risk.id),
        },
        plan: planNumbers,
        numbers: ["system/capabilities", "system/places", "system/rules", "system/risks/high"],
    };
};
