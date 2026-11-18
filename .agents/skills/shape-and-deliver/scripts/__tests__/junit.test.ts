import { describe, expect, it } from "vitest";
import { Result } from "effect";
import { readJunit } from "../core/junit";
import { creditByTitle, joinProofs } from "../core/layer-proof";

const planned = [
    { ac: "AC-1", title: "lists my runs" },
    { ac: "AC-2", title: "hides other workspaces" },
];

const testsOf = (xml: string) => {
    const read = readJunit(xml, planned);
    if (Result.isFailure(read)) {
        throw new Error(read.failure);
    }
    return read.success;
};

describe("the tests of a runner's JUnit XML", () => {
    it("never reads a failure, an error or a skip as passed", () => {
        const tests = testsOf(
            `<testsuite name="s">
  <testcase classname="a" name="lists my runs"/>
  <testcase classname="a" name="lists my runs"><error type="Boom"/></testcase>
  <testcase classname="a" name="lists my runs"><skipped message="why"/></testcase>
  <testcase classname="a" name="lists my runs"><failure/></testcase>
</testsuite>`,
        );
        expect(tests.map((test) => test.passed)).toEqual([true, false, false, false]);
    });

    it("credits a test to the criterion whose planned title it holds, after any describe prefix, ignoring case", () => {
        const tests = testsOf(
            `<testsuite name="s">
  <testcase classname="the runs page" name="Lists  my RUNS"/>
  <testcase classname="the runs page" name="shows a spinner"/>
</testsuite>`,
        );
        expect(tests.map((test) => test.acs)).toEqual([["AC-1"], []]);
    });

    it("credits a test whose runner joins its describe to its name with a separator", () => {
        const tests = testsOf(
            `<testsuite name="s">
  <testcase classname="src/runs.test.ts" name="the runs page &gt; lists my runs"/>
  <testcase classname="runs.spec.ts" name="the runs page › hides other workspaces"/>
</testsuite>`,
        );
        expect(tests.map((test) => test.acs)).toEqual([["AC-1"], ["AC-2"]]);
    });
});

describe("a proof.json that credits no test", () => {
    it("is credited by title, and a test that names its criteria keeps them", () => {
        const proof = {
            tests: [
                { title: "journey › Lists my runs", acs: [], passed: true },
                { title: "journey › shows a spinner", acs: [], passed: true },
                { title: "journey › hides other workspaces", acs: ["AC-9"], passed: true },
            ],
            thresholds: [],
        };

        expect(creditByTitle(proof, planned).tests.map((test) => test.acs)).toEqual([["AC-1"], [], ["AC-9"]]);
    });
});

describe("a layer that reports proof.json and JUnit XML", () => {
    it("is read as both, a JUnit test that proof.json already holds counting once", () => {
        const proof = {
            tests: [{ title: "journey › Lists my runs", acs: ["AC-1"], passed: true, video: "a.webm" }],
            thresholds: [],
        };
        const junit = [
            { title: "journey › Lists my runs", acs: ["AC-1"], passed: true },
            { title: "unit › hides other workspaces", acs: ["AC-2"], passed: true },
        ];

        expect(joinProofs(proof, junit)?.tests.map((test) => test.title)).toEqual([
            "journey › Lists my runs",
            "unit › hides other workspaces",
        ]);
        expect(joinProofs(undefined, junit)?.tests).toHaveLength(2);
        expect(joinProofs(proof, undefined)).toEqual(proof);
        expect(joinProofs(undefined, undefined)).toBeUndefined();
    });
});
