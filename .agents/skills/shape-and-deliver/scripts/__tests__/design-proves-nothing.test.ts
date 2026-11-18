import { describe, expect, it } from "vitest";
import { scenarios } from "./support/delivery-scenarios";
import { deliver } from "./support/drive-delivery";

describe("what a design is held to", () => {
    it(
        "writes no tests and is not asked to prove its criteria, which the build after the pick proves",
        {
            timeout: 180_000,
        },
        async () => {
            const designed = await deliver(scenarios.design, true);
            expect(designed.plan.jobs).not.toContain("tests");
            expect(designed.build?.last.next).toBe("done");
        },
    );
});
