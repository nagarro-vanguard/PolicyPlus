import { describe, expect, test } from "bun:test";
import {
    candidatesOf,
    codeKindKindsOf,
    entryKindOf,
    surfaceGaps,
    surfacesOf,
    type EntryRow,
} from "../shared/read/surfaces";
import { addressGaps, addressOf } from "../shared/read/addresses";
import { entryKeysOf, ruleKeyOf } from "../shared/read/payload-keys";
import { surfaceNameGaps, systemWordsGaps } from "../stages/publish/check-briefing";
import { guidesFor } from "../stages/publish/presentation-guides";
import { briefingReviewReads } from "../stages/publish/briefing-job";

/**
 * The places of every starter: membership found by code over every entry point, a kind from a closed list (stated by
 * the Map's code kind, else derived), names from the briefing or from the code and marked unnamed, every entry point in
 * exactly one place or said to be unplaced, and keys that stay the same when a stage is run again from nothing.
 */

const entry = (id: string, fields: Partial<EntryRow>): EntryRow => ({
    id,
    name: null,
    container: null,
    startedBy: "person",
    reachedBy: null,
    purpose: `Does ${id}.`,
    evidence: null,
    file: "a.vb",
    firstLine: 1,
    lastLine: 2,
    codeKind: null,
    surfaceKind: null,
    layer: null,
    partKind: null,
    capability: null,
    ...fields,
});

const none = new Set<string>();

describe("the kind of place an entry point is in", () => {
    test("derived by code from its part, its file and who starts it", () => {
        expect(entryKindOf(entry("t", { partKind: "tests", startedBy: "otherSystem" }), none)).toBe("test");
        expect(entryKindOf(entry("s", { startedBy: "schedule" }), none)).toBe("task");
        expect(entryKindOf(entry("o", { startedBy: "otherSystem" }), none)).toBe("service");
        expect(entryKindOf(entry("p", { file: "Booking/Pay.aspx.cs" }), none)).toBe("page");
        expect(entryKindOf(entry("w", { file: "Main.vb", partKind: "program" }), none)).toBe("screen");
        expect(entryKindOf(entry("b", { file: "version.bat", layer: "layer-tools" }), new Set(["layer-tools"]))).toBe(
            "buildStep",
        );
        expect(entryKindOf(entry("c", { file: "run.sh" }), none)).toBe("command");
        expect(entryKindOf(entry("m", { file: "pom.xml" }), none)).toBe("buildStep");
    });

    test("a code kind's stated kind wins over the derivation; one stating none takes what most of its pieces are", () => {
        const kinds = codeKindKindsOf(
            [
                entry("1", { codeKind: "codekind-a", surfaceKind: "task", startedBy: "person" }),
                entry("2", { codeKind: "codekind-a", startedBy: "person" }),
                entry("3", { codeKind: "codekind-b", startedBy: "otherSystem" }),
                entry("4", { codeKind: "codekind-b", startedBy: "otherSystem" }),
                entry("5", { codeKind: "codekind-b", startedBy: "person" }),
            ],
            none,
        );
        expect(kinds.get("codekind-a")).toEqual({ kind: "task", stated: true });
        expect(kinds.get("codekind-b")).toEqual({ kind: "service", stated: false });
    });
});

describe("candidate places, found by code over every starter", () => {
    const entries = [
        entry("markup", { file: "Web/Booking/SelectFlight.aspx" }),
        entry("behind", { file: "Web/Booking/SelectFlight.aspx.cs", container: "SelectFlight" }),
        entry("script", { file: "Web/Scripts/select-flight.js" }),
        entry("api-1", { file: "Api/FlightsController.cs", container: "FlightsController", startedBy: "otherSystem" }),
        entry("api-2", { file: "Api/FlightsController.cs", container: "FlightsController", startedBy: "otherSystem" }),
        entry("test", { file: "Tests/FlightsTests.cs", partKind: "tests", startedBy: "otherSystem" }),
    ];
    const candidates = candidatesOf(entries, (each) => entryKindOf(each, none));

    test("a page's markup, code behind and browser script are one candidate; other files one each", () => {
        expect(candidates.map((each) => [each.key, each.kind, each.entries.map((one) => one.id)])).toEqual([
            ["Api/FlightsController.cs", "service", ["api-1", "api-2"]],
            ["Tests/FlightsTests.cs", "test", ["test"]],
            ["Web/Booking/SelectFlight", "page", ["markup", "behind", "script"]],
        ]);
    });

    test("the name to fall back on is the one class its entry points sit in, else its file's name", () => {
        expect(candidates.map((each) => each.name)).toEqual(["FlightsController", "FlightsTests", "SelectFlight"]);
    });

    test("named places take the briefing's name and kind; the rest are named by code and marked unnamed; `other` is unplaced", () => {
        const record = (id: string, kind: "page" | "other", places: string[]) => ({
            id,
            name: "Choose a flight",
            purpose: "Pick the flight to book.",
            kind,
            places,
        });
        const model = surfacesOf(candidates, [
            record("screen-1", "page", ["Web/Booking/SelectFlight"]),
            record("screen-2", "other", ["Api/FlightsController.cs"]),
        ]);
        expect(model.surfaces.map((each) => [each.key, each.name, each.kind, each.unnamed])).toEqual([
            ["Tests/FlightsTests.cs", "FlightsTests", "test", true],
            ["Web/Booking/SelectFlight", "Choose a flight", "page", false],
        ]);
        expect(model.unplaced.map((each) => each.id)).toEqual(["api-1", "api-2"]);
        expect(
            surfaceGaps(
                entries.map((each) => each.id),
                model,
            ),
        ).toEqual([]);
    });

    test("the gate names an entry point in no place, one in two, and one that is no entry point", () => {
        const surfaces = [
            { key: "a", entries: [{ id: "1" }, { id: "2" }] },
            { key: "b", entries: [{ id: "2" }, { id: "9" }] },
        ];
        const gaps = surfaceGaps(["1", "2", "3"], { surfaces, unplaced: [] });
        expect(gaps).toEqual([
            "entry point 2 is in 2 places",
            "entry point 3 is in no place and not said to be unplaced",
            "a place holds 9, which is no entry point",
        ]);
    });
});

describe("keys that stay the same when a stage is run again from nothing", () => {
    test("an entry point's key is its file and name, whatever its record id; a clash adds the first line", () => {
        const first = entryKeysOf([
            entry("block-111111111", { file: "Main.vb", container: "Main", name: "Open_Click", firstLine: 10 }),
            entry("block-222222222", { file: "Main.vb", container: "Main", name: "Save", firstLine: 20 }),
            entry("block-333333333", { file: "Main.vb", container: "Main", name: "Save", firstLine: 30 }),
            entry("block-444444444", { file: "run.sh", firstLine: 1 }),
        ]);
        expect([...first.values()]).toEqual([
            "run.sh#line-1",
            "Main.vb#Main.Open_Click",
            "Main.vb#Main.Save@20",
            "Main.vb#Main.Save@30",
        ]);
        const again = entryKeysOf([
            entry("block-999999999", { file: "Main.vb", container: "Main", name: "Open_Click", firstLine: 10 }),
        ]);
        expect(again.get("block-999999999")).toBe(first.get("block-111111111"));
    });

    test("a rule's key is where it is decided and a digest of its words", () => {
        const rule = { file: "Main.vb", firstLine: 12, says: "A search needs a word." };
        expect(ruleKeyOf(rule)).toBe(ruleKeyOf({ ...rule }));
        expect(ruleKeyOf(rule).startsWith("Main.vb:12#")).toBe(true);
        expect(ruleKeyOf({ ...rule, says: "A search needs two words." })).not.toBe(ruleKeyOf(rule));
    });
});

describe("addresses, copied from code", () => {
    test("kept only when the address stands character for character in the lines that show it starts", () => {
        const lines = "<servlet-mapping><url-pattern>/roller-services/xmlrpc</url-pattern></servlet-mapping>";
        expect(
            addressOf("XML-RPC request posted to /roller-services/xmlrpc naming blogger.getPost", lines, ["web.xml"]),
        ).toBe("/roller-services/xmlrpc");
        expect(
            addressOf("GET Api/TravelClasses/{id}, open to anyone", 'routeTemplate: "api/{controller}/{id}"', []),
        ).toBe(undefined);
        expect(
            addressOf("Opened as Booking/SelectFlight.aspx", "Booking/SelectFlight.aspx", [
                "Web/Booking/SelectFlight.aspx",
            ]),
        ).toBe(undefined);
        expect(addressOf(null, lines, [])).toBe(undefined);
    });

    test("the gate refuses an address its lines do not hold", () => {
        expect(addressGaps([{ id: "block-1", address: "/a/b", evidenceText: "x /a/b y" }])).toEqual([]);
        expect(addressGaps([{ id: "block-1", address: "/a/c", evidenceText: "x /a/b y" }])).toHaveLength(1);
    });
});

describe("the briefing's gates on places and words", () => {
    const place = { key: "Web/Administration/TravelClassesManagement", name: "TravelClassesManagement", files: [] };
    const screen = (name: string, kind = "page") => ({
        id: "screen-11111111111111111111",
        name,
        purpose: "Change the travel classes the airline sells.",
        kind,
        places: [place.key],
    });

    test("a name in people's words passes; the code's name, words run together and the kind test are refused", () => {
        expect(surfaceNameGaps([screen("Manage travel classes")], [place])).toEqual([]);
        expect(surfaceNameGaps([screen("TravelClassesManagement")], [place])).toHaveLength(1);
        expect(surfaceNameGaps([screen("Travel classesManagement")], [place])).toHaveLength(1);
        expect(surfaceNameGaps([screen("Travel class tests", "test")], [place])).toHaveLength(1);
    });

    test("the system's name and terms must stand in the brief; a term is never defined by itself", () => {
        const brief = '{"line":"system","purpose":"Policy Plus edits local Group Policy; it reads ADMX templates."}';
        const words = (fields: object) => [{ id: "systemwords-11111111111111111111", ...fields }];
        expect(
            systemWordsGaps(
                words({ name: "Policy Plus", terms: [{ term: "ADMX", means: "A template file." }] }),
                brief,
            ),
        ).toEqual([]);
        expect(systemWordsGaps(words({ name: "Group Policy Workbench" }), brief)).toHaveLength(1);
        expect(systemWordsGaps(words({ terms: [{ term: "SID", means: "A security id." }] }), brief)).toHaveLength(1);
        expect(systemWordsGaps(words({ terms: [{ term: "ADMX", means: "An ADMX file." }] }), brief)).toHaveLength(1);
        expect(systemWordsGaps([...words({}), ...words({})], brief)).toHaveLength(1);
    });
});

describe("the guides the briefing agent is given", () => {
    const names = (paths: readonly string[]) => paths.map((path) => path.split("/").at(-1));

    test("chosen by rule from the part kinds and the kinds of place", () => {
        expect(names(guidesFor(["program"], ["screen"]))).toEqual(["generic.md", "desktop.md"]);
        expect(names(guidesFor(["site", "tests"], ["page", "service", "test"]))).toEqual([
            "generic.md",
            "web-and-api.md",
            "tests-build-release.md",
        ]);
        expect(names(guidesFor(["library"], ["task"]))).toEqual(["generic.md", "scheduled-task.md"]);
    });

    test("the reviewer reads the same guides as the writer, after the brief", () => {
        const guides = guidesFor(["program"], ["screen"]);
        const reads = briefingReviewReads("/analysis", guides);
        expect(reads[0]?.[1]).toMatch(/brief/);
        expect(reads.slice(1).map(([, path]) => path)).toEqual(guides);
    });
});
