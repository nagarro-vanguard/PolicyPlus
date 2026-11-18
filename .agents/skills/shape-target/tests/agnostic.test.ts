import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { deriveEssence } from "../shared/derive/essence";
import { designWords, wordsIn } from "../shared/derive/words";
import { Architecture, Choice, Journey, Task } from "../shared/model/records";
import { build, legacy, stack } from "./fixture";

const skill = join(import.meta.dir, "..");
/** A line that forbids the word is allowed to name it. */
const forbids = /\b(never|without|no |not |forbid|nor)\b/i;
const withoutPaths = (line: string) => line.replace(/\S*\/\S*/g, "");
const offences = (text: string) =>
    text
        .split("\n")
        .flatMap((line, at) =>
            forbids.test(line) ? [] : wordsIn(withoutPaths(line), designWords).map((word) => `line ${at + 1}: ${word}`),
        );

const descriptions = (value: unknown): string[] =>
    typeof value !== "object" || value === null
        ? []
        : Object.entries(value).flatMap(([key, each]) =>
              key === "description" && typeof each === "string" ? [each] : descriptions(each),
          );

describe("the design carries no medium, control or technology", () => {
    test("the agents and the skill", () => {
        for (const file of [...readdirSync(join(skill, "agents")).map((name) => join("agents", name)), "SKILL.md"]) {
            const found = offences(readFileSync(join(skill, file), "utf8"));
            expect({ file, found }).toEqual({ file, found: [] });
        }
    });
    test("every description of every record", () => {
        for (const [name, schema] of Object.entries({ Task, Journey, Architecture, Choice })) {
            const found = descriptions(Schema.toJsonSchemaDocument(schema).schema).flatMap(offences);
            expect({ name, found }).toEqual({ name, found: [] });
        }
    });
    test("the words of the fixture's steps, and the essence a designer is given", () => {
        const f = build();
        for (const journey of f.variants)
            for (const step of journey.steps)
                expect({ step: step.intent, found: wordsIn(`${step.intent} ${step.system}`) }).toEqual({
                    step: step.intent,
                    found: [],
                });
        const essence = deriveEssence(legacy, f.tasks, { stack, notes: [] }, []);
        expect(JSON.stringify(essence)).not.toMatch(/DetailPolicy|OpenFolder|SaveComment|A\.vb/);
    });
    test("the word list itself catches what it should", () => {
        expect(wordsIn("click the button on the page")).toEqual(expect.arrayContaining(["click", "button", "page"]));
        expect(wordsIn("the system finds the policy")).toEqual([]);
    });
});
