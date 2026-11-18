import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { skillRoot } from "./support/drive-delivery";

// What an agent reads is short enough for a person to read: `SKILL.md` holds at most 30 lines, and every agent brief
// and profile at most 20 lines that are not blank, headings included.

const nonBlankLines = (text: string) => text.split("\n").filter((line) => line.trim() !== "").length;

const briefs = ["agents", "profiles"].flatMap((sub) =>
    readdirSync(join(skillRoot, sub))
        .filter((name) => name.endsWith(".md"))
        .map((name) => join(sub, name)),
);

describe("the length of the skill's instructions", () => {
    it("holds SKILL.md at most 30 lines", () => {
        expect(readFileSync(join(skillRoot, "SKILL.md"), "utf8").trimEnd().split("\n").length).toBeLessThanOrEqual(30);
    });

    it.each(briefs)("%s holds at most 20 non-blank lines", (file) => {
        expect(nonBlankLines(readFileSync(join(skillRoot, file), "utf8"))).toBeLessThanOrEqual(20);
    });
});
