import { writeFileSync } from "node:fs";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { appendRecords } from "../core/record-files";
import { servicesLayer } from "../core/services";
import { planAgents, scenarios, type DeliveryAgent } from "./support/delivery-scenarios";
import { deliveryCodebase, driveRun, startStory } from "./support/drive-delivery";
import { writeFiles } from "./support/codebase-fixture";
import { join } from "node:path";

describe("a plan review that keeps finding a defect", () => {
    it("ends after its rounds and leaves the defect to the approver", { timeout: 120_000 }, async () => {
        const scenario = scenarios.feature;
        const agents = planAgents(scenario);
        const changes = agents["changes"] as DeliveryAgent;
        const defecting: DeliveryAgent = async (args) => {
            await Effect.runPromise(
                appendRecords(
                    "Finding",
                    args["outputPath"] ?? "",
                    JSON.stringify({
                        about: ["change-1"],
                        weight: "defect",
                        says: "Wrong.",
                        evidence: [`${scenario.step.file}:1`],
                        fix: "Fix it.",
                    }),
                ).pipe(Effect.provide(servicesLayer)),
            );
            writeFileSync(args["handBackPath"] ?? "", "Found a defect.");
        };
        const codebase = deliveryCodebase();
        const storyFile = join(codebase, ".artifacts", "story.md");
        writeFiles(codebase, { ".artifacts/story.md": scenario.story });
        const runFolder = await startStory(codebase, scenario, false, storyFile);

        const plan = await driveRun(runFolder, {
            ...agents,
            changes: (args, round) =>
                round > 1 ? Promise.resolve(writeFileSync(args["handBackPath"] ?? "", "Kept.")) : changes(args, round),
            "plan-review": defecting,
        });

        expect(plan.jobs.filter((job) => job === "plan-review")).toHaveLength(3);
        expect(plan.last.next).toBe("done");
    });
});
