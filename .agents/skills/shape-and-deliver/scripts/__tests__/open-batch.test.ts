import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { nextAction } from "../progress-console";
import { writeFiles } from "./support/codebase-fixture";
import { scenarios } from "./support/delivery-scenarios";
import { deliveryCodebase, startStory } from "./support/drive-delivery";

describe("a run with an agent handed out and not yet closed", () => {
    it("hands the same agent to a driver that asks again, so it can run it", { timeout: 60_000 }, async () => {
        const codebase = deliveryCodebase();
        const storyFile = join(codebase, ".artifacts", "story.md");
        writeFiles(codebase, { ".artifacts/story.md": scenarios.feature.story });
        const runFolder = await startStory(codebase, scenarios.feature, false, storyFile);

        const handed = await nextAction(runFolder, undefined, () => undefined);
        const asked = await nextAction(runFolder, undefined, () => undefined);

        expect(handed.next).toBe("dispatch");
        expect(asked).toMatchObject({
            next: "wait",
            batch: "batch" in handed ? handed.batch : "",
            dispatch: "dispatch" in handed ? handed.dispatch : [],
        });
    });
});
