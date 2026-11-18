import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { runLayout } from "../core/run-layout";
import { scenarios, storyNumber } from "./support/delivery-scenarios";
import { deliver, startStory } from "./support/drive-delivery";

describe("starting a delivered run again", () => {
    it.each(["feature", "bug", "technical", "design"] as const)(
        "leaves a %s run as it was: its plan request, its mode and its approval",
        { timeout: 180_000 },
        async (profile) => {
            const scenario = scenarios[profile];
            const delivered = await deliver(scenario, true);
            const layout = runLayout(delivered.codebase, storyNumber);
            const read = (path: string) => readFileSync(path, "utf8");
            const before = {
                plan: read(layout.planRequest),
                launch: read(layout.launch),
                approved: existsSync(layout.implementRequest),
            };
            expect(before.approved).toBe(true);

            await startStory(delivered.codebase, scenario, false, join(delivered.codebase, ".artifacts", "story.md"));

            expect(read(layout.planRequest)).toBe(before.plan);
            expect(read(layout.launch)).toBe(before.launch);
            expect(existsSync(layout.implementRequest)).toBe(true);
        },
    );
});
