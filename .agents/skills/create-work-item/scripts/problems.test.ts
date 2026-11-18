import { describe, expect, it } from "vitest";
import { problemsOf } from "./problems";

describe("a work item's problems", () => {
    const good = "# Create a project\n\n## Story\n\nAs a person, I want a project.\n";

    it("accepts a title and a clean body", () => {
        expect(problemsOf(good)).toEqual([]);
    });

    it("refuses what a tracker must not show", () => {
        expect(problemsOf("no title")).toHaveLength(1);
        expect(problemsOf(`# ${"x".repeat(73)}\n\nbody`)).toHaveLength(1);
        expect(problemsOf("# T\n\n<!-- guidance -->")).toHaveLength(1);
        expect(problemsOf("# T\n\nDone \u{1f680}")).toHaveLength(1);
        expect(problemsOf("# T\n\nGenerated with a tool")).toHaveLength(1);
        expect(problemsOf("# T\n\nsee /Users/me/plan.md")).toHaveLength(1);
    });
});
