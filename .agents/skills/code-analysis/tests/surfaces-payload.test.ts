import { describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import { derive, makeRoot, type Spec } from "./fixture";
import { CapabilityPayload } from "../shared/model/schemas/payloads";
import { KnowledgePayload } from "../shared/model/schemas/knowledge-payload";
import { SystemPayload } from "../shared/model/schemas/system-payload";
import { termGaps, termsOf, usesTerm } from "../shared/read/payload-terms";
import { withoutRecordIds } from "../shared/read/payload-checks";

/**
 * The payloads of the places and the facts derived for them: every entry point of every starter in one place, a
 * place named by the briefing or by the code and marked unnamed, test suites reaching the rules, keys that stay the
 * same when record ids change, the system's name from the briefing, the glossary and the kinds of data, and the rules
 * no capability reaches, listed rather than dropped.
 */

const cli = join(import.meta.dir, "..", "cli");

const writePayloads = async (root: string) => {
    const child = Bun.spawn(["bun", join(cli, "write-payloads.ts")], {
        env: { ...process.env, CODE_ANALYSIS_ROOT: root },
        stdout: "pipe",
        stderr: "pipe",
    });
    const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()]);
    return { out: out + err, code: await child.exited };
};

const read = <S extends Schema.ConstraintDecoder<unknown>>(root: string, file: string, schema: S) =>
    Schema.decodeUnknownSync(schema)(JSON.parse(readFileSync(join(root, "payloads", file), "utf8")));

/** A screen's handler and a test, both reaching the helper that decides the rule, and a rule no flow reaches. */
const spec = (suffix: string): Spec => ({
    layers: [{ id: "layer-ui", name: "Screens" }],
    codeKinds: [{ id: "codekind-ui", name: "Handler", layer: "layer-ui" }],
    capabilityNames: { "capability-1": "Finding policies" },
    blocks: [
        {
            id: `block-entry${suffix}`,
            first: 1,
            last: 9,
            codeKind: "codekind-ui",
            entry: true,
            container: "Main",
            name: "Find",
        },
        { id: `block-helper${suffix}`, first: 10, last: 19, codeKind: "codekind-ui", container: "Main", name: "Look" },
        {
            id: `block-test${suffix}`,
            first: 20,
            last: 29,
            codeKind: "codekind-ui",
            entry: true,
            startedBy: "otherSystem",
            container: "FindTests",
            name: "FindsByNumber",
        },
        { id: `block-alone${suffix}`, first: 40, last: 49, codeKind: "codekind-ui", name: "Unused" },
    ],
    links: [
        { id: `link-1${suffix}`, from: `block-entry${suffix}`, to: `block-helper${suffix}`, kind: "call" },
        { id: `link-2${suffix}`, from: `block-test${suffix}`, to: `block-helper${suffix}`, kind: "call" },
    ],
    rules: [
        { id: `rule-1${suffix}`, block: `block-helper${suffix}`, says: "A search finds a policy by its number." },
        { id: `rule-2${suffix}`, block: `block-alone${suffix}`, says: "An unused routine decides nothing reached." },
    ],
});

/**
 * The fixture with a tests part holding the test's file, a kind of data, and the briefing's place and words.
 * @param suffix what the record ids end in, to run the same content under other ids
 * @param named whether the briefing named the screen and the system
 * @returns the analysis root
 */
const fixture = async (suffix: string, named: boolean) => {
    const root = makeRoot(spec(suffix));
    const db = new Database(join(root, "analysis.sqlite"));
    db.run("INSERT INTO file (fileNumber, path, lines) VALUES (2, 'tests/FindTests.vb', 100)");
    db.run("UPDATE record SET fileNumber = 2 WHERE id = ?", [`block-test${suffix}`]);
    let next = Number((db.query("SELECT max(recordNumber) AS n FROM record").get() as { n: number }).n) + 1;
    const add = (id: string, type: string, body: object) =>
        db.run("INSERT INTO record (recordNumber, id, type, stage, body) VALUES (?, ?, ?, 'map', ?)", [
            next++,
            id,
            type,
            JSON.stringify(body),
        ]);
    add(`part-app${suffix}`, "SystemPart", {
        name: "Program",
        kind: "program",
        purpose: "The program.",
        folders: ["."],
    });
    add(`part-tests${suffix}`, "SystemPart", {
        name: "Tests",
        kind: "tests",
        purpose: "The tests.",
        folders: ["tests"],
    });
    add(`entity-1${suffix}`, "Entity", { name: "Policy", purpose: "A setting an administrator can change." });
    if (named) {
        add(`screen-1${suffix}`, "Screen", {
            name: "Find policies",
            purpose: "Look a policy up.",
            kind: "screen",
            places: ["a.vb"],
        });
        add(`systemwords-1${suffix}`, "SystemWords", { name: "Policy Finder" });
    }
    db.close();
    await derive(root);
    const { out, code } = await writePayloads(root);
    expect(code, out).toBe(0);
    return { root, out };
};

describe("the places of every starter in the payloads", () => {
    test("a named screen and an unnamed test suite, every entry point placed, the test reaching the screen's rule", async () => {
        const { root, out } = await fixture("", true);
        const system = read(root, "system.json", SystemPayload);
        expect(system.name).toBe("Policy Finder");
        expect(
            (system.surfaces ?? []).map((each) => [
                each.key,
                each.name,
                each.kind,
                each.noun.one,
                each.unnamed,
                each.product,
            ]),
        ).toEqual([
            ["a.vb", "Find policies", "screen", "screen", false, true],
            ["tests/FindTests.vb", "FindTests", "test", "test suite", true, false],
        ]);
        const [screen] = system.surfaces ?? [];
        expect(screen?.reachedByTests).toEqual(["tests/FindTests.vb"]);
        expect(system.unplaced?.entryPoints).toEqual([]);
        expect(system.layers.map((layer) => layer.entryPoints)).toEqual([2]);
        expect(system.screens.map((each) => each.name)).toEqual(["Find policies"]);
        expect(system.rulesInNoCapability?.rules.map((rule) => rule.says)).toEqual([
            "An unused routine decides nothing reached.",
        ]);
        expect(out).toContain("2 places (1 screen, 1 test); 2 of 2 entry points placed; 1 named by the code");
        expect(out).toContain("1 rules are reached by no capability");

        const capability = read(root, "capability-finding-policies.json", CapabilityPayload);
        const actions = capability.layers.flatMap((layer) => layer.actions);
        expect(actions.map((action) => [action.key, action.surface, action.tooling])).toEqual([
            ["a.vb#Main.Find", "a.vb", false],
            ["tests/FindTests.vb#FindTests.FindsByNumber", "tests/FindTests.vb", true],
        ]);
        const [rule] = capability.layers.flatMap((layer) => layer.rules);
        expect(rule?.key?.startsWith("a.vb:10#")).toBe(true);
        expect(rule?.reachedByTests).toEqual(["tests/FindTests.vb"]);
        expect(rule?.reading).toBe("unread");
        expect((capability.surfaces ?? []).map((each) => [each.key, each.kind, each.actions.length])).toEqual([
            ["a.vb", "screen", 1],
            ["tests/FindTests.vb", "test", 1],
        ]);

        const knowledge = read(root, "knowledge.json", KnowledgePayload);
        expect(knowledge.parts.map((part) => [part.name, part.product])).toEqual([
            ["Program", true],
            ["Tests", false],
        ]);
        expect(knowledge.entities?.map((entity) => entity.name)).toEqual(["Policy"]);
        expect(knowledge.terms).toEqual([
            { term: "Policy", means: "A setting an administrator can change.", from: "entity" },
        ]);
    });

    test("an analysis whose briefing named no place gets every place from the code, marked unnamed", async () => {
        const { root } = await fixture("", false);
        const system = read(root, "system.json", SystemPayload);
        expect((system.surfaces ?? []).map((each) => [each.name, each.unnamed])).toEqual([
            ["Main", true],
            ["FindTests", true],
        ]);
        expect(system.name).not.toBe("Policy Finder");
    });

    test("keys stay the same when every record id changes", async () => {
        const keysOf = (root: string) => {
            const capability = read(root, "capability-finding-policies.json", CapabilityPayload);
            const system = read(root, "system.json", SystemPayload);
            return {
                actions: capability.layers.flatMap((layer) =>
                    layer.actions.map((action) => [action.key, action.surface]),
                ),
                rules: capability.layers.flatMap((layer) => layer.rules.map((rule) => rule.key)),
                surfaces: (system.surfaces ?? []).map((surface) => surface.key),
                ids: capability.layers.flatMap((layer) => layer.actions.map((action) => action.id)),
            };
        };
        const first = keysOf((await fixture("", true)).root);
        const again = keysOf((await fixture("9", true)).root);
        expect(again.actions).toEqual(first.actions);
        expect(again.rules).toEqual(first.rules);
        expect(again.surfaces).toEqual(first.surfaces);
        expect(again.ids).not.toEqual(first.ids);
    });
});

describe("the glossary", () => {
    test("a term is kept only when the analysis's text uses it as a word of its own, each once", () => {
        expect(usesTerm("Each policy has a number.", "Policy")).toBe(true);
        expect(usesTerm("Each policyholder has a number.", "Policy")).toBe(false);
        const terms = termsOf(
            [
                { name: "Policy", purpose: "A setting." },
                { name: "Comment", purpose: "A note on a policy." },
            ],
            [
                { term: "ADMX", means: "A template file of policies." },
                { term: "policy", means: "Said twice." },
            ],
            ["Each policy is read from an ADMX file."],
        );
        expect(terms.map((term) => [term.term, term.from])).toEqual([
            ["ADMX", "briefing"],
            ["Policy", "entity"],
        ]);
        expect(termGaps(terms, ["Nothing here."])).toHaveLength(2);
    });

    test("a reviewer's words shown in a context lose the record ids they name", () => {
        expect(withoutRecordIds("Same as businessrule-12345678901 and block-1234.")).toBe(
            "Same as another finding and block-1234.",
        );
    });
});
