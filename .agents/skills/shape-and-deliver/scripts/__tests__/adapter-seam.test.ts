import { describe, expect, it } from "vitest";
import { dispatchedJobs, sessionOfJob } from "../core/adapter-seam";
import { scenarios } from "./support/delivery-scenarios";
import { deliver } from "./support/drive-delivery";

/** What an adapter reads of shape-and-deliver to keep an agent's session across its rounds. */
describe("the jobs an adapter is handed", { timeout: 120_000 }, () => {
    it("are each classified, every job a run hands out among them", async () => {
        const delivered = await deliver(scenarios.feature, true);
        const handedOut = [...delivered.plan.jobs, ...(delivered.build?.jobs ?? [])];
        expect(handedOut.length).toBeGreaterThan(0);
        for (const job of handedOut) {
            expect(Object.keys(sessionOfJob), job).toContain(job);
        }
        expect(Object.keys(sessionOfJob).toSorted()).toEqual([...dispatchedJobs].toSorted());
    });
});
