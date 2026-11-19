import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { relativize } from "../../compose/build/assistant";
import { briefOf } from "../../compose/build/brief";
import { evidenceOf, excerptLines } from "../../compose/build/evidence";
import { partOf, surfaceKinds } from "../../compose/build/facts";
import { titleFromId } from "../../compose/build/journeys";
import { Numbers } from "../../compose/build/numbers";
import { searchOf } from "../../compose/build/search";
import { firstSentence, Slugs, slugify } from "../../compose/build/text";
import { buildCase, compose } from "../../compose/compose";
import { caseFiles } from "../../compose/contract";
import { ComposeError } from "../../compose/errors";
import { stableJson } from "../../compose/io";
import { writeFixture } from "./fixture";

const full = () => {
    const fixture = writeFixture();
    return { fixture, built: buildCase({ payloads: fixture.payloads, target: fixture.run, plan: fixture.run }) };
};
const read = (files: Map<string, string>, path: string) => JSON.parse(files.get(path) ?? "null") as unknown;

describe("text", () => {
    test("first sentence keeps the facts' words", () => {
        expect(firstSentence("Sample keeps records. It sends them on.")).toBe("Sample keeps records.");
        expect(firstSentence("No full stop")).toBe("No full stop");
    });
    test("address parts split code names and stay unique per level in the order offered", () => {
        expect(slugify("AircraftManufacturersController")).toBe("aircraft-manufacturers-controller");
        const slugs = new Slugs();
        expect(slugs.of("place", "1", "Record page")).toBe("record-page");
        expect(slugs.of("place", "2", "Record page")).toBe("record-page-2");
        expect(slugs.of("rule", "3", "Record page")).toBe("record-page");
        expect(slugs.of("place", "1", "anything")).toBe("record-page");
    });
    test("stable JSON sorts keys and drops undefined", () => {
        expect(stableJson({ b: 1, a: { d: undefined, c: 2 } })).toBe('{"a":{"c":2},"b":1}\n');
    });
});

describe("numbers", () => {
    test("a key registered twice with another value fails", () => {
        const numbers = new Numbers();
        const noun = { one: "rule", many: "rules" };
        numbers.add({ key: "x", value: 1, noun, scope: "s", source: "s" });
        expect(() => numbers.add({ key: "x", value: 2, noun, scope: "s", source: "t" })).toThrow(ComposeError);
    });
    test("a combined number is the sum of its kinds, largest first, empty kinds left out", () => {
        const numbers = new Numbers();
        const noun = (one: string) => ({ one, many: `${one}s` });
        numbers.combined(
            "p",
            noun("place"),
            [
                { kind: "service", value: 7, noun: noun("service") },
                { kind: "page", value: 9, noun: noun("page") },
                { kind: "test", value: 0, noun: noun("test") },
            ],
            "s",
            "s",
        );
        const [entry] = numbers.all();
        expect(entry?.value).toBe(16);
        expect(entry?.parts?.map((part) => part.kind)).toEqual(["page", "service"]);
    });
});

describe("facts", () => {
    test("a file belongs to the part with the longest folder that holds it", () => {
        const part = (id: string, folders: string[]) => ({
            id,
            slug: id,
            name: id,
            kind: "",
            purpose: "",
            summary: "",
            folders,
            product: true,
        });
        const parts = [part("outer", ["app"]), part("inner", ["app/test/"])];
        expect(partOf("app/test/x.txt", parts)).toBe("inner");
        expect(partOf("app/x.txt", parts)).toBe("outer");
        expect(partOf("other/x.txt", parts)).toBeNull();
    });
    test("nouns come from the analysis's catalogue of surface kinds", () => {
        const kinds = surfaceKinds();
        expect(kinds.length).toBeGreaterThan(3);
        expect(kinds.every((kind) => kind.noun.one !== "" && kind.noun.many !== "")).toBe(true);
    });
    test("every rule is kept once, those in no capability included", () => {
        const { built } = full();
        const rules = built.input.facts.rules;
        expect(rules.map((rule) => rule.id).sort()).toEqual(["r1", "r2", "r3", "r4", "r9"]);
        expect(rules.find((rule) => rule.id === "r3")?.capabilities).toEqual(["cap-a", "cap-b"]);
        expect(rules.find((rule) => rule.id === "r9")?.capabilities).toEqual([]);
    });
    test("risks are ranked by severity, then breadth", () => {
        const { built } = full();
        expect(built.input.facts.risks.map((risk) => [risk.id, risk.rank])).toEqual([
            ["risk-1", 1],
            ["risk-2", 2],
        ]);
    });
    test("a surface kind missing from the catalogue fails as a missing fact", () => {
        const fixture = writeFixture((given) => {
            given.system.surfaces[0]!.kind = "hologram";
        });
        expect(() => compose({ payloads: fixture.payloads })).toThrow(/catalogue of surface kinds/);
    });
});

describe("hierarchy", () => {
    test("a capability's counts are its own: places per kind, rules counted once", () => {
        const { built } = full();
        const numbers = built.input.numbers;
        expect(numbers.value("capability/keeping-records/places")).toBe(1);
        expect(numbers.value("capability/keeping-records/rules")).toBe(3);
        expect(numbers.value("capability/sending-records/rules")).toBe(2);
        expect(numbers.value("system/rules")).toBe(5);
        expect(numbers.value("system/places")).toBe(2);
        expect(numbers.value("system/tests")).toBe(1);
    });
    test("tests are not places on the primary path; they are counted as checks", () => {
        const { built } = full();
        const capability = built.input.hierarchy.nodes.get("capability/keeping-records");
        expect(capability?.children.rows.map((row) => row.node)).toEqual(["surface/keeping-records--record-page"]);
        expect(capability?.folds.find((fold) => fold.kind === "tests")?.rows).toHaveLength(1);
        expect(built.input.numbers.value("capability/keeping-records/tests")).toBe(1);
    });
    test("a rule reached from enough places folds as shared under an entry point", () => {
        const fixture = writeFixture();
        const built = buildCase({ payloads: fixture.payloads });
        expect(built.input.hierarchy.sharedAt).toBe(5);
        expect(built.input.hierarchy.sharedRules).toEqual([]);
    });
    test("the unplaced node lists rules in no capability", () => {
        const { built } = full();
        const unplaced = built.input.hierarchy.nodes.get("unplaced");
        expect(
            unplaced?.folds.find((fold) => fold.kind === "rulesInNoCapability")?.rows.map((row) => row.node),
        ).toEqual(["rule/old-records-are-never-read"]);
    });
    test("a place used by two capabilities shows each path's own counts and also used by", () => {
        const fixture = writeFixture((given) => {
            const surface = given.system.surfaces[0]!;
            surface.capabilities = ["cap-a", "cap-b"];
            surface.actionIds = ["a1", "a2", "a3"];
            surface.actions = 3;
            surface.rules = 4;
            given.system.surfaces.splice(1, 1);
            given.capabilities["capability-b.json"].layers[0]!.actions[0]!.surface = "src/one.txt";
        });
        const built = buildCase({ payloads: fixture.payloads });
        const numbers = built.input.numbers;
        expect(numbers.value("surface/keeping-records--record-page/actions")).toBe(2);
        expect(numbers.value("surface/sending-records--record-page/actions")).toBe(1);
        const node = built.input.hierarchy.nodes.get("surface/keeping-records--record-page");
        expect(node?.lateral.filter((link) => link.relation === "alsoUsedBy").map((link) => link.node)).toEqual([
            "surface/sending-records--record-page",
        ]);
    });
});

describe("journeys", () => {
    test("a rule a step changes or its journey drops is never kept", () => {
        const { built } = full();
        const step = built.input.proposed[0]?.steps[0];
        expect(step?.honours).toEqual(["r1", "r3"]);
        expect(step?.kept).toEqual(["r1"]);
        expect(step?.changes.map((change) => change.rule)).toEqual(["r3"]);
        expect(built.input.proposed[0]?.dropped).toEqual(["r2"]);
    });
    test("a step's stories are those that name it, never those that only build its rules", () => {
        const fixture = writeFixture((given) => {
            given.plan.stories[2]!.builds = ["r4"];
            given.plan.stories.push({ ...given.plan.stories[2]!, key: "story-4", sequence: 4, steps: [], builds: [] });
            given.plan.epics[1]!.stories.push("story-4");
            given.plan.phases[1]!.stories.push("story-4");
            given.prompts.deliver["story-4"] = "Deliver it.";
        });
        const built = buildCase({ payloads: fixture.payloads, target: fixture.run, plan: fixture.run });
        expect(built.input.trace.find((each) => each.step.endsWith("as-today#1"))?.stories).toEqual(["story-3"]);
    });
    test("components are counted once per domain", () => {
        const { built } = full();
        expect(built.input.architecture?.domains.map((domain) => domain.components)).toEqual([1, 1]);
    });
    test("a title comes from the task id when the facts carry none", () => {
        expect(titleFromId("keeping-records.keep-a-record")).toBe("Keep a record");
    });
});

describe("plan views", () => {
    test("unblocks is the reverse of blocked by, and only the first story is ready at the start", () => {
        const { built } = full();
        const views = built.input.views;
        expect(views?.stories.find((story) => story.key === "story-1")?.unblocks).toEqual(["story-2", "story-3"]);
        expect(views?.ready).toEqual(["story-1"]);
    });
    test("each story says what its tags run and which layers it is built in", () => {
        const { built } = full();
        const story = built.input.views?.stories.find((each) => each.key === "story-2");
        expect(story?.work).toEqual({
            profile: "build",
            reference: true,
            label: "rebuilt",
            words: "Rebuilt from today's behaviour",
        });
        expect(built.input.views?.phases.find((phase) => phase.number === 3)?.builtIn).toEqual(["Application"]);
        expect(built.input.views?.layers.find((layer) => layer.id === "layer-store")?.stack).toEqual(["data: two"]);
    });
    test("the matrix puts each step under the domain most of its components belong to", () => {
        const { built } = full();
        expect(built.input.views?.matrix?.cells.map((cell) => [cell.domain, cell.stories])).toEqual([
            ["Records", ["story-2"]],
            ["Sending", ["story-3"]],
        ]);
    });
});

describe("brief", () => {
    test("Goals are verbatim, or not provided", () => {
        const { built } = full();
        expect(built.brief.goals).toEqual({ provided: true, text: "Run anywhere." });
        const none = briefOf(built.input.facts, { goals: undefined, stack: [] }, undefined, undefined, new Numbers());
        expect(none.goals).toEqual({ provided: false, text: null });
    });
    test("what changes carries the containers in plain words and the stack lines", () => {
        const { built } = full();
        expect(built.brief.changes?.containers[0]).toEqual({
            name: "Application",
            does: "Lets people keep and send records.",
            runsOn: "a server the organisation runs",
            tech: "line one",
            holds: ["Records", "Sending"],
        });
        expect(built.brief.changes?.stack.map((line) => line.line)).toEqual(["language: one", "data: two"]);
    });
});

describe("diagrams", () => {
    test("each kind with facts has its text version and legend", () => {
        const { built } = full();
        const byKey = new Map(built.input.diagrams.map((diagram) => [diagram.key, diagram]));
        expect([...byKey.keys()]).toContain("navigation/system");
        expect(byKey.get("navigation/system")?.text).toEqual(["Record page leads to Record service"]);
        expect(byKey.get("context/system")?.caption).toBe("It sends mail.");
        expect(byKey.get("organisation/target")?.edges).toEqual([
            { from: "Records", to: "Sending", kind: "uses", count: 1 },
        ]);
        expect(byKey.get("compare/keep-a-record")?.edges.length).toBe(2);
        for (const diagram of byKey.values()) expect(diagram.text.length).toBe(diagram.edges.length);
    });
});

describe("evidence", () => {
    test("an excerpt has at most fifteen lines, and none without a readable source", () => {
        const { built } = full();
        const facts = built.input.facts;
        const root = mkdtempSync(join(tmpdir(), "compose-source-"));
        writeFileSync(
            join(root, "long.txt"),
            Array.from({ length: 60 }, (_, number) => `row ${number + 1}`).join("\n"),
        );
        const long = {
            ...facts,
            rules: [{ ...facts.rules[0]!, place: { file: "long.txt", firstLine: 3, lastLine: 50 } }],
        };
        const excerpt = evidenceOf(long, root)[facts.rules[0]!.id];
        expect(excerpt?.lines.length).toBe(excerptLines);
        expect(excerpt?.cut).toBe(true);
        expect(evidenceOf(long, join(root, "missing"))).toEqual({});
        expect(evidenceOf(long, undefined)).toEqual({});
        expect(
            evidenceOf(
                {
                    ...long,
                    rules: [{ ...long.rules[0]!, place: { file: "../escape.txt", firstLine: 1, lastLine: 1 } }],
                },
                root,
            ),
        ).toEqual({});
    });
});

describe("search and copy texts", () => {
    test("search records hold names, never record ids", () => {
        const { built } = full();
        const records = searchOf(built.input.hierarchy.nodes);
        const ids = [
            ...built.input.facts.rules.map((rule) => rule.id),
            ...built.input.facts.actions.map((action) => action.id),
            "cap-a",
            "cap-b",
        ];
        for (const record of records)
            for (const id of ids)
                expect(
                    [record.name, record.parent, record.text].some((text) => new RegExp(`\\b${id}\\b`).test(text)),
                ).toBe(false);
        expect(records.find((record) => record.name === "Record page")?.level).toBe("page");
    });
    test("absolute paths become relative to the folder the run sits in", () => {
        expect(
            relativize("bun /work/repo/.agents/x.ts /work/repo/run/ledger.json", ["/work/repo/run", "/work/repo"]),
        ).toBe("bun .agents/x.ts ledger.json");
    });
    test("a rule's text holds that rule only, and sizes are exact", () => {
        const { built } = full();
        const texts = built.input.assistant.texts.rule ?? {};
        const text = texts["rule/a-record-needs-a-name"] ?? "";
        expect(text).toContain("A record needs a name.");
        expect(text).not.toContain("A sent record is marked sent.");
        expect(text).not.toContain(homedir());
        expect(built.input.assistant.sizes.rule?.["rule/a-record-needs-a-name"]).toBe(
            new TextEncoder().encode(text).length,
        );
    });
});

describe("contract", () => {
    test("every file compose writes is named by the contract and listed in the manifest with its digest", () => {
        const fixture = writeFixture();
        const result = compose({ payloads: fixture.payloads, target: fixture.run, plan: fixture.run });
        const manifest = read(result.files, "manifest.json") as { files: { path: string }[] };
        const written = [...result.files.keys()]
            .filter((path) => !path.startsWith("schema/") && path !== "manifest.json")
            .sort();
        expect(manifest.files.map((file) => file.path)).toEqual(written);
        for (const path of written) expect(Object.keys(caseFiles)).toContain(path);
        expect(result.files.has("schema/nodes.capability.schema.json")).toBe(true);
    });
    test("without a target or plan, their files are left out rather than written empty", () => {
        const fixture = writeFixture();
        const result = compose({ payloads: fixture.payloads });
        expect(result.files.has("architecture.json")).toBe(false);
        expect(result.files.has("plan/stories.json")).toBe(false);
        expect(result.files.has("journeys/today.json")).toBe(true);
    });
});
