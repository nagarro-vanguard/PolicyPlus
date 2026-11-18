import { describe, expect, it } from "vitest";
import { scenarios } from "./support/delivery-scenarios";
import { buildAfterPick, deliver } from "./support/drive-delivery";

describe("the end of a design", () => {
    it(
        "asks the driver to retag the story and tell the people waiting, and the build after the pick does not",
        { timeout: 180_000 },
        async () => {
            const designed = await deliver(scenarios.design, true);
            const last = designed.build?.last;
            expect(last).toMatchObject({
                next: "done",
                retag: { remove: ["prototypes"], add: ["prototypes-ready"] },
            });
            expect(last !== undefined && "retag" in last ? last.retag?.comment : "").toContain(
                "ready for the stakeholders' review",
            );
            const built = await buildAfterPick(designed);
            expect(built.build?.last).not.toHaveProperty("retag");
        },
    );
});
