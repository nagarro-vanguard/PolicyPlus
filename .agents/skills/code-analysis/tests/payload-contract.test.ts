import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { derive, makeRoot, rowsOf, type Spec } from "./fixture";
import { recordShapes } from "../shared/model/record-shapes";

/**
 * The payloads as a contract: written whole by an analysis of any age (blocks the map left without a name, a store
 * with no commit or no record-shape fingerprint), the same bytes on every run, named so a stage run again from nothing
 * keeps every file name, stamped with a manifest readers check, and saying truthfully which repository and commit were
 * read.
 */

const cli = join(import.meta.dir, "..", "cli");

const spawn = async (script: string, root: string, args: readonly string[] = []) => {
    const child = Bun.spawn(["bun", join(cli, script), ...args], {
        env: { ...process.env, CODE_ANALYSIS_ROOT: root },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return { out: out + err, code: await child.exited };
};

const writePayloads = (root: string) => spawn("write-payloads.ts", root);

const json = (path: string) => JSON.parse(readFileSync(path, "utf8"));

const filesOf = (folder: string): Record<string, string> =>
    Object.fromEntries(
        readdirSync(folder, { recursive: true, withFileTypes: true })
            .filter((entry) => entry.isFile())
            .map((entry) => {
                const path = join(entry.parentPath, entry.name);
                return [path.slice(folder.length + 1), readFileSync(path, "utf8")];
            }),
    );

const sha1 = (text: string) => createHash("sha1").update(text).digest("hex");

/** One capability with an entry point, and three routines nothing reaches, named as the older maps left them. */
const spec = (capability: string): Spec => ({
    layers: [{ id: "layer-ui", name: "Screens" }],
    codeKinds: [{ id: "codekind-ui", name: "Handler", layer: "layer-ui" }],
    capabilityNames: { [capability]: "Finding policies" },
    blocks: [
        {
            id: "block-entry",
            first: 1,
            last: 9,
            codeKind: "codekind-ui",
            entry: true,
            container: "Main",
            name: "Find",
            capability,
        },
        { id: "block-template", first: 10, last: 12, codeKind: "codekind-ui", name: "ViewSwitcher.ascx" },
        { id: "block-static", first: 20, last: 22, codeKind: "codekind-ui", container: "HitCountQueue" },
        { id: "block-bare", first: 30, last: 31, codeKind: "codekind-ui" },
    ],
    rules: [{ id: "rule-1", block: "block-entry", says: "A search needs a word." }],
});

const git = (folder: string, ...args: string[]) => {
    const ran = Bun.spawnSync([
        "git",
        "-C",
        folder,
        "-c",
        "user.name=Test",
        "-c",
        "user.email=test@example.com",
        "-c",
        "commit.gpgsign=false",
        ...args,
    ]);
    if (ran.exitCode !== 0) {
        throw new Error(`git ${args.join(" ")}: ${ran.stderr.toString()}`);
    }
    return ran.stdout.toString().trim();
};

/**
 * Write the request and Inventory's file summary a run leaves in `work/`, for one source root at a commit.
 * @param root the analysis root
 * @param source the source root
 * @param commit the commit Inventory listed, or null outside git
 */
const writeWork = (root: string, source: string, commit: string | null) => {
    mkdirSync(join(root, "work", "inventory"), { recursive: true });
    writeFileSync(
        join(root, "work", "analysis-request.json"),
        JSON.stringify({ sourceRoots: [source], leaveOut: [], supportingMaterial: [] }),
    );
    writeFileSync(
        join(root, "work", "inventory", "file-summary.json"),
        JSON.stringify({
            byFileExtension: {},
            byFolder: {},
            longLineFiles: [],
            uncertainEncoding: [],
            roots: [{ name: basename(source), commit, clean: commit === null ? null : true }],
            skipped: [],
        }),
    );
};

const repository = () => {
    const folder = mkdtempSync(join(tmpdir(), "source-repo-"));
    git(folder, "init", "-q");
    writeFileSync(join(folder, "a.vb"), "Module A\nEnd Module\n");
    git(folder, "add", "a.vb");
    git(folder, "commit", "-q", "-m", "first");
    git(folder, "remote", "add", "origin", "https://someone:s3cret@example.com/org/sample.git");
    return folder;
};

describe("payloads of an older analysis", () => {
    test("blocks with no name or no class are named by what they have and their first line, never left empty", async () => {
        const root = makeRoot(spec("capability-1"));
        await derive(root);
        const { out, code } = await writePayloads(root);
        expect(out).toContain("payloads written");
        expect(code).toBe(0);
        const unreached = json(join(root, "payloads", "bundle.json")).unreached;
        expect(unreached.map((each: { what: string }) => each.what)).toEqual([
            "ViewSwitcher.ascx",
            "HitCountQueue, line 20",
            "a.vb, line 30",
        ]);
    });

    test("two runs write the same bytes", async () => {
        const root = makeRoot(spec("capability-1"));
        await derive(root);
        await writePayloads(root);
        const first = filesOf(join(root, "payloads"));
        await writePayloads(root);
        expect(filesOf(join(root, "payloads"))).toEqual(first);
        expect(Object.keys(first)).toContain("manifest.json");
    });

    test("a store with no commit recorded says so plainly, and names the system after its folder", async () => {
        const root = makeRoot(spec("capability-1"));
        await derive(root);
        await writePayloads(root);
        const system = json(join(root, "payloads", "system.json"));
        expect(system.name).toBe(basename(root));
        expect(system.repository).toBeNull();
        expect(system.commit).toBeNull();
        expect(system.context.text).toContain("Commit: not recorded: the run did not record which commit it read");
    });
});

describe("stable payload files", () => {
    test("a capability's file is named from its name, so a stage run again with new record ids keeps it", async () => {
        // the fixture always holds `capability-1`; the second run gives the named capability another record id
        for (const id of ["capability-1", "capability-987654"]) {
            const root = makeRoot(spec(id));
            await derive(root);
            await writePayloads(root);
            const system = json(join(root, "payloads", "system.json"));
            const named = system.capabilities.find((each: { name: string }) => each.name === "Finding policies");
            expect(named).toMatchObject({ id, file: "capability-finding-policies.json" });
            expect(json(join(root, "payloads", "capability-finding-policies.json")).capability.id).toBe(id);
            expect(readdirSync(join(root, "payloads")).filter((name) => name.startsWith("capability-"))).toContain(
                "capability-finding-policies.json",
            );
        }
    });

    test("two capabilities of one name get a number, and a file of an earlier run under another name is removed", async () => {
        const twin: Spec = {
            ...spec("capability-1"),
            capabilityNames: { "capability-1": "Finding policies", "capability-2": "Finding policies" },
            blocks: [
                ...spec("capability-1").blocks,
                {
                    id: "block-other",
                    first: 40,
                    last: 49,
                    codeKind: "codekind-ui",
                    entry: true,
                    capability: "capability-2",
                },
            ],
        };
        const root = makeRoot(twin);
        await derive(root);
        mkdirSync(join(root, "payloads"), { recursive: true });
        writeFileSync(join(root, "payloads", "capability-123456.json"), "{}");
        const { out } = await writePayloads(root);
        expect(out).toContain("removed capability-123456.json");
        expect(readdirSync(join(root, "payloads")).filter((name) => name.startsWith("capability-"))).toEqual([
            "capability-finding-policies-2.json",
            "capability-finding-policies.json",
        ]);
    });
});

describe("the payload manifest", () => {
    test("lists every payload with its kind, schema and digest, under the contract version", async () => {
        const root = makeRoot(spec("capability-1"));
        await derive(root);
        await writePayloads(root);
        const folder = join(root, "payloads");
        const manifest = json(join(folder, "manifest.json"));
        expect(manifest.contractVersion).toBe(1);
        expect(manifest.writer.skill).toBe("code-analysis");
        expect(manifest.writer.version).toHaveLength(12);
        expect(manifest.files.map((each: { path: string }) => each.path)).toEqual([
            "system.json",
            "capability-finding-policies.json",
            "knowledge.json",
            "bundle.json",
        ]);
        for (const each of manifest.files) {
            expect(each.digest).toBe(sha1(readFileSync(join(folder, each.path), "utf8")));
            expect(existsSync(join(folder, each.schema))).toBe(true);
        }
        expect(json(join(folder, "schema", "manifest.schema.json")).type).toBe("object");
    });

    test("a reader refuses payloads written for another contract version, and reads payloads with no manifest", async () => {
        const root = makeRoot(spec("capability-1"));
        await derive(root);
        await writePayloads(root);
        const folder = mkdtempSync(join(tmpdir(), "contract-"));
        cpSync(join(root, "payloads"), join(folder, "payloads"), { recursive: true });
        mkdirSync(join(folder, "work"), { recursive: true });
        writeFileSync(
            join(folder, "work", "analysis-request.json"),
            JSON.stringify({ sourceRoots: [folder], leaveOut: [], supportingMaterial: [] }),
        );
        const manifestPath = join(folder, "payloads", "manifest.json");
        const manifest = readFileSync(manifestPath, "utf8");
        writeFileSync(manifestPath, manifest.replace('"contractVersion": 1', '"contractVersion": 2'));
        const refused = await spawn("build-bundle.ts", folder, ["all"]);
        expect(refused.code).toBe(2);
        expect(refused.out).toContain("follow contract version 2, and these scripts read version 1");
        writeFileSync(manifestPath, manifest);
        expect((await spawn("build-bundle.ts", folder, ["all"])).code).toBe(0);
        Bun.spawnSync(["rm", manifestPath]);
        const legacy = await spawn("build-bundle.ts", folder, ["all"]);
        expect(legacy.code).toBe(0);
        expect(legacy.out).toContain("has no manifest.json");
    });
});

describe("where the code came from", () => {
    test("the repository without credentials and the commit Inventory listed, which is the repository's HEAD", async () => {
        const source = repository();
        const head = git(source, "rev-parse", "HEAD");
        const root = makeRoot(spec("capability-1"));
        await derive(root);
        writeWork(root, source, head);
        await writePayloads(root);
        const system = json(join(root, "payloads", "system.json"));
        expect(system.name).toBe(basename(source));
        expect(system.repository).toBe("https://example.com/org/sample.git");
        expect(system.commit).toBe(head);
        expect(system.context.text).toContain(`Commit: ${head}`);
        expect(JSON.stringify(system)).not.toContain("s3cret");
        const capability = json(join(root, "payloads", "capability-finding-policies.json"));
        expect(capability.context.commit).toBe(head);
        expect(rowsOf(root, "SELECT repository, commitId FROM analysis")).toEqual([
            { repository: "https://example.com/org/sample.git", commitId: head },
        ]);
        expect((await spawn("build-bundle.ts", root, ["capability", "Finding policies"])).code).toBe(0);
        expect(readFileSync(join(root, "bundles", "capability-finding-policies.md"), "utf8")).toContain(
            `Read from https://example.com/org/sample.git at commit ${head}.`,
        );
    });

    test("a source folder outside git is said to be no git repository", async () => {
        const source = mkdtempSync(join(tmpdir(), "source-plain-"));
        const root = makeRoot(spec("capability-1"));
        await derive(root);
        writeWork(root, source, null);
        await writePayloads(root);
        const system = json(join(root, "payloads", "system.json"));
        expect(system.repository).toBeNull();
        expect(system.commit).toBeNull();
        expect(system.context.text).toContain("Commit: none: the source folder is not a git repository");
    });

    test("Inventory's listing keeps the repository and the commit in the store", async () => {
        const source = repository();
        const root = mkdtempSync(join(tmpdir(), "listing-"));
        mkdirSync(join(root, "work"), { recursive: true });
        writeFileSync(
            join(root, "work", "analysis-request.json"),
            JSON.stringify({ sourceRoots: [source], leaveOut: [], supportingMaterial: [] }),
        );
        const { out, code } = await spawn("inventory-codebase.ts", root, ["list"]);
        expect(code, out).toBe(0);
        expect(rowsOf(root, "SELECT repository, commitId FROM analysis")).toEqual([
            { repository: "https://example.com/org/sample.git", commitId: git(source, "rev-parse", "HEAD") },
        ]);
    });
});

describe("the record-shape fingerprint", () => {
    test("a store made before the fingerprint gains it on first open when its records decode, losing nothing", async () => {
        const root = makeRoot(spec("capability-1"));
        const db = new Database(join(root, "analysis.sqlite"));
        db.run("DELETE FROM record");
        db.run("ALTER TABLE analysis DROP COLUMN recordShapes");
        db.close();
        const { code, out } = await writePayloads(root);
        expect(code, out).toBe(0);
        expect(rowsOf(root, "SELECT recordShapes FROM analysis")).toEqual([{ recordShapes: recordShapes().digest }]);
    });

    test("a store whose records no longer decode is refused when it opens, naming the types", async () => {
        const root = makeRoot(spec("capability-1"));
        await derive(root);
        const db = new Database(join(root, "analysis.sqlite"));
        db.run("UPDATE analysis SET recordShapes = 'an older fingerprint'");
        db.close();
        const { code, out } = await writePayloads(root);
        expect(code).toBe(1);
        expect(out).toContain("were written in shapes these scripts no longer read");
        expect(out).toContain("Layer: 1 (first layer-ui)");
        expect(rowsOf(root, "SELECT recordShapes FROM analysis")).toEqual([{ recordShapes: "an older fingerprint" }]);
    });

    const stored = join(import.meta.dir, "..", "..", "..", "..", ".code-analysis");
    test.skipIf(!existsSync(join(stored, "analysis.sqlite")))(
        "a store written by the previous writer opens, is fingerprinted and writes its payloads",
        async () => {
            const root = mkdtempSync(join(tmpdir(), "older-store-"));
            for (const name of ["analysis.sqlite", "analysis.sqlite-wal", "analysis.sqlite-shm"]) {
                if (existsSync(join(stored, name))) {
                    cpSync(join(stored, name), join(root, name));
                }
            }
            const { code, out } = await writePayloads(root);
            expect(code, out).toBe(0);
            expect(rowsOf(root, "SELECT recordShapes FROM analysis")).toEqual([
                { recordShapes: recordShapes().digest },
            ]);
            expect(json(join(root, "payloads", "manifest.json")).contractVersion).toBe(1);
        },
    );
});
