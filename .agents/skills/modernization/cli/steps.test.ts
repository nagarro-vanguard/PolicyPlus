import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { inputsOf, pathsOf, steps } from "./steps";

const fingerprints = (goals: string[]) => {
    const root = mkdtempSync(`${tmpdir()}/steps-test-`);
    mkdirSync(join(root, "target"), { recursive: true });
    writeFileSync(
        join(root, "request.json"),
        JSON.stringify({ stack: ["TypeScript"], goals, documents: [], leaveOut: [] }),
    );
    for (const file of [
        "target/current.json",
        "target/choice-as-is.json",
        "target/journeys.json",
        "target/architecture.json",
    ])
        writeFileSync(join(root, file), "{}");
    const paths = pathsOf(root);
    return new Map(steps.map((step) => [step.name, inputsOf(step, paths, join(root, "request.md"))]));
};

describe("goals reach the fingerprints", () => {
    const before = fingerprints(["Divide by domain."]);
    const after = fingerprints(["Divide by domain.", "Type every interface."]);

    test("editing a goal runs the journeys, the architecture and the foundation again", () => {
        for (const name of ["target-journeys", "target-architecture", "foundation"])
            expect(after.get(name)).not.toBe(before.get(name));
    });

    test("what the goals do not touch keeps its fingerprint", () => {
        expect(after.get("derive-legacy")).toBe(before.get("derive-legacy"));
    });
});
