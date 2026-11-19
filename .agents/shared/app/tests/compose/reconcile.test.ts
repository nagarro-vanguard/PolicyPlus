import { describe, expect, test } from "bun:test";
import { readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { buildCase, compose } from "../../compose/compose";
import { ComposeError } from "../../compose/errors";
import { reconcile } from "../../compose/reconcile";
import { writeFixture, type Inputs } from "./fixture";

/*
 * Each reconciliation check passes on the fixture and fails when the fixture is corrupted in the way it guards against.
 * Checks that compare two of compose's own computations are corrupted after building, the others in the inputs.
 */

const statusOf = (change: (inputs: Inputs) => void, id: string) => {
    const fixture = writeFixture(change);
    const result = compose({ payloads: fixture.payloads, target: fixture.run, plan: fixture.run });
    const found = result.checks.find((each) => each.id === id);
    return { status: found?.status, problems: found?.problems ?? [], reconciled: result.reconciled };
};

describe("every check passes on the fixture", () => {
    test("R-01 to R-14 pass with a target and a plan", () => {
        const fixture = writeFixture();
        const result = compose({ payloads: fixture.payloads, target: fixture.run, plan: fixture.run });
        expect(result.checks.map((each) => [each.id, each.status])).toEqual(
            Array.from({ length: 14 }, (_, number) => [`R-${String(number + 1).padStart(2, "0")}`, "pass"]),
        );
    });
    test("checks whose facts are absent are skipped, never passed", () => {
        const fixture = writeFixture();
        const result = compose({ payloads: fixture.payloads });
        expect(result.checks.filter((each) => each.status === "skipped").map((each) => each.id)).toEqual([
            "R-06",
            "R-07",
            "R-08",
            "R-09",
            "R-10",
            "R-11",
        ]);
        expect(result.reconciled).toBe(true);
    });
});

describe("each check fails on its corruption", () => {
    test("R-01: an entry point in no place that the analysis does not report", () => {
        const result = statusOf((given) => {
            const layer = given.capabilities["capability-b.json"].layers[0]!;
            layer.actions.push({ ...layer.actions[0]!, id: "a4", surface: "nowhere", rules: [] });
            given.capabilities["capability-b.json"].totals.actions = 2;
            given.system.capabilities[1]!.actions = 2;
            given.bundle.blocks.push({ ...given.bundle.blocks[0]!, id: "a4" });
        }, "R-01");
        expect(result.status).toBe("fail");
        expect(result.reconciled).toBe(false);
    });
    test("R-02: a capability in no area", () => {
        expect(
            statusOf((given) => {
                given.system.areas[0]!.capabilities = ["cap-a"];
            }, "R-02").status,
        ).toBe("fail");
    });
    test("R-03: a capability's declared entry points differ from its paths", () => {
        expect(
            statusOf((given) => {
                given.system.capabilities[0]!.actions = 9;
            }, "R-03").status,
        ).toBe("fail");
    });
    test("R-04: a capability's declared rules differ from its rules counted once", () => {
        expect(
            statusOf((given) => {
                given.capabilities["capability-b.json"].totals.rules = 5;
            }, "R-04").status,
        ).toBe("fail");
    });
    test("R-04: a rule the analysis indexed is in no payload", () => {
        expect(
            statusOf((given) => {
                given.bundle.rules.push({ ...given.bundle.rules[0]!, id: "r10" });
            }, "R-04").status,
        ).toBe("fail");
    });
    test("R-05: a place's declared rules differ from its entry points' rules", () => {
        expect(
            statusOf((given) => {
                given.system.surfaces[1]!.rules = 7;
            }, "R-05").status,
        ).toBe("fail");
    });
    test("R-06: a story names a step no chosen journey holds", () => {
        expect(
            statusOf((given) => {
                given.plan.stories[1]!.steps = ["unknown#1"];
            }, "R-06").status,
        ).toBe("fail");
    });
    test("R-07: a rule built by two stories", () => {
        expect(
            statusOf((given) => {
                given.plan.stories[2]!.builds = ["r4", "r1"];
            }, "R-07").status,
        ).toBe("fail");
    });
    test("R-07: a rule neither built nor dropped", () => {
        expect(
            statusOf((given) => {
                given.plan.stories[2]!.builds = [];
                given.plan.coverage.rulesBuilt = 2;
            }, "R-07").status,
        ).toBe("fail");
    });
    test("R-08: a matrix whose cells do not add up", () => {
        const fixture = writeFixture();
        const built = buildCase({ payloads: fixture.payloads, target: fixture.run, plan: fixture.run });
        built.input.views!.matrix!.cells[0]!.steps.push("extra");
        expect(reconcile(built.input).find((each) => each.id === "R-08")?.status).toBe("fail");
    });
    test("R-09: domain edges that differ from the uses crossing domains", () => {
        const fixture = writeFixture();
        const built = buildCase({ payloads: fixture.payloads, target: fixture.run, plan: fixture.run });
        const diagram = built.input.diagrams.find((each) => each.key === "organisation/target")!;
        diagram.edges[0]!.count = 3;
        expect(reconcile(built.input).find((each) => each.id === "R-09")?.status).toBe("fail");
    });
    test("R-10: two chosen ways for one journey", () => {
        expect(
            statusOf((given) => {
                given.target.choiceJourneys.picks.push({ of: "keeping-records.keep-a-record", variant: "One step" });
            }, "R-10").status,
        ).toBe("fail");
    });
    test("R-11: a tag set that names no workflow", () => {
        expect(
            statusOf((given) => {
                given.plan.stories[2]!.tags = ["story", "functional", "epic"];
            }, "R-11").status,
        ).toBe("fail");
    });
    test("R-12: a node no path reaches", () => {
        const fixture = writeFixture();
        const built = buildCase({ payloads: fixture.payloads });
        built.input.hierarchy.nodes.get("overview")!.children.rows = [];
        const check = reconcile(built.input).find((each) => each.id === "R-12");
        expect(check?.status).toBe("fail");
        expect(check?.problems.some((problem) => problem.includes("area/records"))).toBe(true);
    });
    test("R-12: a count that is not in the numbers table", () => {
        const fixture = writeFixture();
        const built = buildCase({ payloads: fixture.payloads });
        built.input.hierarchy.nodes.get("overview")!.facts.push("no/such/number");
        expect(reconcile(built.input).find((each) => each.id === "R-12")?.status).toBe("fail");
    });
    test("R-13: a diagram edge that ends on no node", () => {
        const fixture = writeFixture();
        const built = buildCase({ payloads: fixture.payloads });
        built.input.diagrams[0]!.edges.push({ from: "nowhere", to: "nothing", kind: "call", count: 1 });
        expect(reconcile(built.input).find((each) => each.id === "R-13")?.status).toBe("fail");
    });
    test("R-14: a copy text that holds an input folder", () => {
        const fixture = writeFixture();
        const built = buildCase({ payloads: fixture.payloads });
        built.input.assistant.texts.system!.overview = `Read ${fixture.payloads}/system.json`;
        expect(reconcile(built.input).find((each) => each.id === "R-14")?.status).toBe("fail");
    });
    test("R-14: a rule's text that names a skill", () => {
        const fixture = writeFixture();
        const built = buildCase({ payloads: fixture.payloads });
        built.input.assistant.texts.rule!["rule/a-record-needs-a-name"] += "\nRun code-analysis again.";
        expect(reconcile(built.input).find((each) => each.id === "R-14")?.status).toBe("fail");
    });
});

describe("inputs compose refuses", () => {
    const fails = (fixture: ReturnType<typeof writeFixture>, kind: ComposeError["kind"], pattern: RegExp) => {
        try {
            compose({ payloads: fixture.payloads, target: fixture.run, plan: fixture.run });
        } catch (error) {
            expect(error).toBeInstanceOf(ComposeError);
            expect((error as ComposeError).kind).toBe(kind);
            expect((error as ComposeError).message).toMatch(pattern);
            return;
        }
        throw new Error("compose did not fail");
    };
    test("payloads of an unknown contract version", () => {
        fails(
            writeFixture((given) => {
                given.manifestVersion = 9;
            }),
            "version",
            /contract version 9/,
        );
    });
    test("payloads with no manifest", () => {
        const fixture = writeFixture();
        rmSync(join(fixture.payloads, "manifest.json"));
        fails(fixture, "version", /no manifest/);
    });
    test("a payload changed after its manifest was written", () => {
        const fixture = writeFixture();
        const path = join(fixture.payloads, "system.json");
        writeFileSync(path, readFileSync(path, "utf8").replace("Sample keeps", "Sample holds"));
        fails(fixture, "version", /differs from the manifest/);
    });
    test("a missing required fact", () => {
        fails(
            writeFixture((given) => {
                delete (given.system as Partial<typeof given.system>).surfaces;
            }),
            "missing",
            /surfaces/,
        );
    });
    test("a target of an unknown contract version", () => {
        const fixture = writeFixture();
        writeFileSync(join(fixture.run, "target", "manifest.json"), JSON.stringify({ contractVersion: 7, files: {} }));
        fails(fixture, "version", /target contract version 7/);
    });
    test("a plan made from a target, given without it", () => {
        const fixture = writeFixture();
        expect(() => compose({ payloads: fixture.payloads, plan: fixture.run })).toThrow(/no --target/);
    });
});
