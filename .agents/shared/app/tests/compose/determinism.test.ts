import { describe, expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { compose } from "../../compose/compose";
import { writeFixture } from "./fixture";

const cli = join(import.meta.dir, "..", "..", "compose", "cli.ts");

const filesIn = (folder: string): Map<string, string> => {
    const out = new Map<string, string>();
    const walk = (dir: string) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const path = join(dir, entry.name);
            if (entry.isDirectory()) walk(path);
            else out.set(relative(folder, path), readFileSync(path, "utf8"));
        }
    };
    walk(folder);
    return out;
};

const run = (args: string[]) => Bun.spawnSync(["bun", cli, ...args], { stdout: "pipe", stderr: "pipe" });

describe("determinism", () => {
    test("two runs in memory give the same files", () => {
        const fixture = writeFixture();
        const options = { payloads: fixture.payloads, target: fixture.run, plan: fixture.run };
        const one = compose(options);
        const other = compose(options);
        expect([...other.files]).toEqual([...one.files]);
    });
    test("two runs of the command write byte-identical folders, and the same inputs copied elsewhere give the same case", () => {
        const fixture = writeFixture();
        const copy = writeFixture();
        const out = mkdtempSync(join(tmpdir(), "compose-out-"));
        const first = run([
            "--payloads",
            fixture.payloads,
            "--target",
            fixture.run,
            "--plan",
            fixture.run,
            "--out",
            join(out, "one"),
        ]);
        const second = run([
            "--payloads",
            fixture.payloads,
            "--target",
            fixture.run,
            "--plan",
            fixture.run,
            "--out",
            join(out, "two"),
        ]);
        const moved = run([
            "--payloads",
            copy.payloads,
            "--target",
            copy.run,
            "--plan",
            copy.run,
            "--out",
            join(out, "three"),
        ]);
        expect([first.exitCode, second.exitCode, moved.exitCode]).toEqual([0, 0, 0]);
        const one = filesIn(join(out, "one"));
        expect(filesIn(join(out, "two"))).toEqual(one);
        expect(filesIn(join(out, "three"))).toEqual(one);
        for (const text of one.values()) expect(text).not.toMatch(/\d{4}-\d\d-\d\dT\d\d:\d\d/);
    });
});

describe("command line", () => {
    test("a failed check exits 1 and writes the case marked not reconciled", () => {
        const fixture = writeFixture((given) => {
            given.system.capabilities[0]!.actions = 9;
        });
        const out = join(mkdtempSync(join(tmpdir(), "compose-out-")), "case");
        const result = run(["--payloads", fixture.payloads, "--out", out]);
        expect(result.exitCode).toBe(1);
        expect(JSON.parse(readFileSync(join(out, "manifest.json"), "utf8")).reconciled).toBe(false);
        expect(result.stdout.toString()).toContain("FAIL    R-03");
    });
    test("an input it cannot read exits 2 and writes nothing", () => {
        const fixture = writeFixture((given) => {
            given.manifestVersion = 3;
        });
        const out = join(mkdtempSync(join(tmpdir(), "compose-out-")), "case");
        const result = run(["--payloads", fixture.payloads, "--out", out]);
        expect(result.exitCode).toBe(2);
        expect(result.stderr.toString()).toContain("contract version 3");
        expect(() => readdirSync(out)).toThrow();
    });
    test("a missing argument exits 2 with the usage", () => {
        const result = run(["--payloads"]);
        expect(result.exitCode).toBe(2);
        expect(result.stderr.toString()).toContain("usage:");
    });
});
