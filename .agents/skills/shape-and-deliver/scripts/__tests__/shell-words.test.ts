import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { checkCommand, shellWord } from "../core/stage";

/**
 * Run a command line through `sh`, as an agent does.
 * @param command the command line
 * @returns what it printed
 */
const sh = (command: string) => {
    const done = spawnSync("sh", ["-c", command], { encoding: "utf8" });
    expect(done.status, done.stderr).toBe(0);
    return done.stdout;
};

describe("a path or argument in a command given to an agent", () => {
    it("reaches the shell as one word, whatever it holds", () => {
        for (const text of ["/plain/path", "/with space/scripts", "/it's/scripts", 'a;b $HOME `x` "y" *']) {
            expect(sh(`printf %s ${shellWord(text)}`)).toBe(text);
        }
        const command = checkCommand("x", "/run folder/it's");
        const argument = command.slice(command.indexOf(" check ") + " check ".length);
        expect(sh(`printf %s ${argument}`)).toBe("/run folder/it's");
    });
});
