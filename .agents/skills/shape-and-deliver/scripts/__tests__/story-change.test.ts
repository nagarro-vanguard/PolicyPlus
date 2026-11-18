import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runLayout } from "../core/run-layout";
import { scenarios, storyNumber } from "./support/delivery-scenarios";
import { buildAfterPick, deliver, startStory } from "./support/drive-delivery";

const storyFileOf = (codebase: string) => join(codebase, ".artifacts", "story.md");

describe("a story edited after its run began", () => {
    it.each(["feature", "bug", "technical", "design"] as const)(
        "starts a %s plan again, with the work item fetched again and no batch of the old plan open",
        { timeout: 180_000 },
        async (profile) => {
            const scenario = scenarios[profile];
            const delivered = await deliver(scenario, false);
            const layout = runLayout(delivered.codebase, storyNumber);
            writeFileSync(layout.batch, "{}");
            const edited = `${scenario.story}\n- a new line of the story\n`;
            writeFileSync(storyFileOf(delivered.codebase), edited);

            await startStory(delivered.codebase, scenario, false, storyFileOf(delivered.codebase));

            expect(existsSync(join(layout.work, "earlier", "1"))).toBe(true);
            expect(existsSync(layout.workItemMarkdown)).toBe(false);
            expect(existsSync(layout.batch)).toBe(false);
            expect(readFileSync(layout.planRequest, "utf8")).toContain("a new line of the story");
        },
    );

    it("does not start the plan again for whitespace, which a tracker may render differently", async () => {
        const scenario = scenarios.feature;
        const delivered = await deliver(scenario, false);
        const layout = runLayout(delivered.codebase, storyNumber);
        writeFileSync(storyFileOf(delivered.codebase), `${scenario.story.replaceAll("\n", "  \r\n")}\n\n`);

        await startStory(delivered.codebase, scenario, false, storyFileOf(delivered.codebase));

        expect(existsSync(join(layout.work, "earlier"))).toBe(false);
        expect(existsSync(layout.workItemMarkdown)).toBe(true);
    });

    it(
        "keeps the design's analysis when only the tags change for the build after the pick",
        {
            timeout: 180_000,
        },
        async () => {
            const designed = await deliver(scenarios.design, true);
            writeFileSync(
                storyFileOf(designed.codebase),
                scenarios.design.story.replace("story, functional, prototypes", "story, functional, prototypes-ready"),
            );

            const built = await buildAfterPick(designed);

            expect(built.plan.jobs).not.toContain("work-item");
        },
    );

    it("refuses a plan again once the code is committed", { timeout: 180_000 }, async () => {
        const scenario = scenarios.feature;
        const delivered = await deliver(scenario, true);
        writeFileSync(storyFileOf(delivered.codebase), `${scenario.story}\n- a new line of the story\n`);

        await expect(startStory(delivered.codebase, scenario, false, storyFileOf(delivered.codebase))).rejects.toThrow(
            /changed after its code was committed/,
        );
    });
});
