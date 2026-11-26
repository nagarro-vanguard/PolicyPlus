import { describe, expect, test } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { goalsSha } from "./goals-sha";
import { parseRequest, RequestInvalid } from "./request";

const dir = mkdtempSync(`${tmpdir()}/request-test-`);

const request = (goals: string, extra = "") =>
    [
        "## Output Root",
        `${dir}/out`,
        "## Target Codebase",
        `${dir}/target`,
        "## Source Roots",
        `- ${dir}`,
        "## Leave Out",
        "None",
        "## Target Stack",
        "- TypeScript on Bun",
        "## Documents",
        "None",
        goals,
        extra,
    ].join("\n");

const problemsOf = (text: string) => {
    try {
        parseRequest(text, dir);
    } catch (error) {
        if (error instanceof RequestInvalid) return error.problems;
        throw error;
    }
    return [];
};

describe("the request's goals", () => {
    test("a bulleted list gives one goal per item, in order", () => {
        const parsed = parseRequest(request("## Goals\n\n- Divide by domain.\n- Type every interface."), dir);
        expect(parsed.goals).toEqual(["Divide by domain.", "Type every interface."]);
        expect("notes" in parsed).toBe(false);
    });

    test("a numbered list works and an indented line continues its goal", () => {
        const parsed = parseRequest(request("## Goals\n\n1. First goal\n   that goes on.\n2) Second goal."), dir);
        expect(parsed.goals).toEqual(["First goal that goes on.", "Second goal."]);
    });

    test("no section, an empty one and None all mean no goals", () => {
        expect(parseRequest(request(""), dir).goals).toEqual([]);
        expect(parseRequest(request("## Goals\n\nNone"), dir).goals).toEqual([]);
        expect(parseRequest(request("## Goals\n\n- None"), dir).goals).toEqual([]);
    });

    test("prose that is not a list is refused", () => {
        expect(problemsOf(request("## Goals\n\nMake it modular and typed."))).toEqual([
            "`## Goals` must be a list, one `- <goal>` per line",
        ]);
    });
});

describe("the removed Additional Notes", () => {
    test("a request that still has the section is refused with the way to move its lines", () => {
        const problems = problemsOf(request("## Goals\n\n- One goal.", "## Additional Notes\n\n- An old line."));
        expect(problems).toHaveLength(1);
        expect(problems[0]).toContain("`## Additional Notes`");
        expect(problems[0]).toContain("move each line under `## Goals`");
    });

    test("even an empty section is refused, so no line vanishes silently", () => {
        expect(problemsOf(request("## Goals\n\n- One goal.", "## Additional Notes\n\nNone"))).toHaveLength(1);
    });
});

describe("goalsSha", () => {
    test("is the sha256 of the goals' JSON, and moves when a goal is edited or reordered", () => {
        const a = goalsSha(["one", "two"]);
        expect(a).toMatch(/^[0-9a-f]{64}$/);
        expect(a).toBe(new Bun.CryptoHasher("sha256").update(JSON.stringify(["one", "two"])).digest("hex"));
        expect(goalsSha(["two", "one"])).not.toBe(a);
        expect(goalsSha(["one", "two!"])).not.toBe(a);
    });
});
