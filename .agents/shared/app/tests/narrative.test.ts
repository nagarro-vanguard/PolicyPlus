import { describe, expect, test } from "bun:test";
import { copy } from "../src/lib/copy";
import { diagrams } from "../src/lib/diagram-config";
import { addressesIn, languageFindings, pathNamesRecordId, visibleText } from "../src/lib/language";
import { capabilityModel, contextModel, screenModel, tiersModel } from "../src/lib/model";
import { slugify, slugsOf } from "../src/lib/slugs";
import type { Capability, Screen, System } from "../src/lib/types";
import {
    accessKindWords,
    accessWords,
    gapWords,
    groupWords,
    kindWords,
    startedWords,
    verdictWords,
} from "../src/lib/words";

// Everything the pages and figures say themselves is held to the voice of stages/publish/rules/narrative.md.
const pool: unknown[] = [1, 3, "Alpha", ["Alpha", "Beta"], true];

/**
 * Every sentence a function of the copy can say: it is called with every mix of a number, a name, a list and a flag that
 * its parameters accept, and the strings that come back are kept.
 * @param fn a function of the copy
 * @returns the sentences it said
 */
const said = (fn: (...args: never[]) => unknown): string[] => {
    const out = new Set<string>();
    const walk = (args: unknown[]) => {
        if (args.length === fn.length) {
            try {
                const result = fn(...(args as never[]));
                if (typeof result === "string" && !result.includes("undefined") && !result.includes("NaN"))
                    out.add(result);
            } catch {
                // this mix of arguments does not suit the function
            }
            return;
        }
        for (const next of pool) walk([...args, next]);
    };
    walk([]);
    return [...out];
};

const leaves = (value: unknown): string[] => {
    if (typeof value === "string") return [value];
    if (typeof value === "function") return said(value as (...args: never[]) => unknown);
    if (value !== null && typeof value === "object") return Object.values(value).flatMap(leaves);
    return [];
};

const ourWords = [
    ...leaves(copy),
    ...Object.values(diagrams).flatMap((each) => [each.title, each.question, each.legend]),
    ...Object.values({
        ...accessWords,
        ...accessKindWords,
        ...gapWords,
        ...groupWords,
        ...kindWords,
        ...startedWords,
        ...verdictWords,
    }),
];

describe("what the pages say themselves", () => {
    test("uses no word of the analysis's machinery, no boilerplate and no dash as punctuation", () => {
        const found = ourWords.flatMap((text) =>
            languageFindings(text, "copy").soft.map((finding) => `${finding.rule}: ${finding.hit}`),
        );
        expect(found).toEqual([]);
    });
    test("keeps a sentence short and to one idea", () => {
        const long = ourWords.flatMap((text) =>
            text.split(/(?<=[.!?])\s+/).filter((sentence) => sentence.split(/\s+/).length > 28),
        );
        expect(long).toEqual([]);
    });
    test("names no record id", () => {
        expect(ourWords.filter((text) => languageFindings(text, "copy").hard.length > 0)).toEqual([]);
    });
});

const layer = (id: string, name: string, extra: object = {}) => ({
    id,
    name,
    role: "decides",
    purpose: `${name} does one job.`,
    group: "logic",
    blocks: 10,
    evidence: [],
    sharedBlocks: 0,
    rules: [],
    shapes: [],
    actions: [],
    context: { saves: [], reads: [], text: "" },
    ...extra,
});
const action = (id: string, path: string[], extra: object = {}) => ({
    id,
    name: "",
    purpose: `Does ${id}`,
    startedBy: "person",
    screen: "Page",
    place: { file: "a.cs", firstLine: 1, lastLine: 2 },
    path: path.map((layerId, depth) => ({ layer: layerId, depth })),
    rules: [],
    context: { saves: ["Booking"], reads: [], notFollowed: [], text: "" },
    ...extra,
});

const capability = {
    capability: { id: "capability-11111111111111", name: "Booking", purpose: "Booking." },
    area: "",
    layers: [
        layer("layer-1", "Screens", {
            actions: [action("block-1", ["layer-1", "layer-2"]), action("block-2", ["layer-1", "layer-2"])],
        }),
        layer("layer-2", "Business services"),
        layer("layer-3", "Automated tests", { actions: [action("block-3", ["layer-3", "layer-2"])] }),
    ],
    data: [{ id: "entity-1", name: "Booking", access: "saves", stores: ["Main database"] }],
    screens: [],
    concerns: [],
    gaps: [],
    openPoints: [],
    totals: { actions: 3, rules: 0, blocks: 30, rulesOnNoScreen: 0 },
    context: { text: "" },
} as unknown as Capability;

const system = {
    purpose: "",
    capabilities: [{ id: "capability-11111111111111", name: "Booking", purpose: "", screens: 1, actions: 3, rules: 0 }],
    areas: [],
    layers: [
        { id: "layer-1", name: "Screens", product: true, group: "ui", blocks: 10, role: "decides", purpose: "" },
        {
            id: "layer-2",
            name: "Business services",
            product: true,
            group: "logic",
            blocks: 10,
            role: "decides",
            purpose: "",
        },
        {
            id: "layer-3",
            name: "Automated tests",
            product: false,
            group: "api",
            blocks: 10,
            role: "decides",
            purpose: "",
        },
    ],
    edges: [{ from: "layer-1", to: "layer-2", kind: "call", links: 4 }],
    screens: [
        {
            key: "Booking/Page",
            name: "Page",
            files: ["a.cs"],
            capabilities: ["capability-11111111111111"],
            actionIds: ["block-1", "block-2", "block-3"],
            actions: 3,
            rules: 0,
            layersTouched: [],
            context: { text: "" },
        },
    ],
    entries: { person: 2, otherSystem: 1, schedule: 0 },
    externals: [
        {
            id: "ext-1",
            name: "Main database",
            kind: "dataStore",
            links: 3,
            reach: [{ layer: "layer-2", access: "saves", links: 3 }],
        },
    ],
    gaps: { unresolvedLinks: 0, unattributedBlocks: 0 },
    context: { text: "" },
} as unknown as System;

describe("what the figures say", () => {
    const product = new Set(["layer-1", "layer-2"]);
    const models = [
        tiersModel(system).model,
        contextModel(system).model,
        capabilityModel(capability, undefined, product).model,
        screenModel(system.screens[0] as Screen, [capability], undefined, product).model,
    ];
    test("never shows a number without saying what it counts", () => {
        const bare = models.flatMap((model) =>
            model.edges
                .filter((edge) => edge.unit !== "" && !new RegExp(`\\b${edge.count} \\p{L}`, "u").test(edge.label))
                .map((edge) => edge.label),
        );
        expect(bare).toEqual([]);
        expect(
            models.flatMap((model) => model.edges.map((edge) => edge.label)).filter((label) => /^\d+$/.test(label)),
        ).toEqual([]);
    });
    test("keeps the analysis's words off every box and arrow it builds", () => {
        const texts = models.flatMap((model) => [
            ...model.nodes.map((node) => node.sub),
            ...model.edges.map((edge) => edge.label),
        ]);
        expect(texts.flatMap((text) => languageFindings(text, "figure").soft)).toEqual([]);
    });
    test("leaves project work such as tests out of a capability's figure and a screen's, and says so", () => {
        const [, , capabilityFigure, screenFigure] = models;
        expect(capabilityFigure?.nodes.map((node) => node.label)).not.toContain("Automated tests");
        expect(capabilityFigure?.leftOut).toEqual(["Automated tests"]);
        expect(screenFigure?.nodes.map((node) => node.label)).not.toContain("Automated tests");
        expect(screenFigure?.leftOut).toEqual(["Automated tests"]);
        expect(
            capabilityFigure?.edges.every((edge) => !edge.from.includes("layer-3") && !edge.to.includes("layer-3")),
        ).toBe(true);
    });
});

describe("addresses", () => {
    test("are readable, unique, repeatable and carry no record id", () => {
        const first = slugsOf(system, [capability]);
        const second = slugsOf(system, [capability]);
        const names = [
            first.capability("capability-11111111111111"),
            first.layer("capability-11111111111111", "layer-1"),
            first.action("capability-11111111111111", "block-1"),
            first.action("capability-11111111111111", "block-2"),
        ];
        expect(names).toEqual([
            second.capability("capability-11111111111111"),
            second.layer("capability-11111111111111", "layer-1"),
            second.action("capability-11111111111111", "block-1"),
            second.action("capability-11111111111111", "block-2"),
        ]);
        expect(new Set(names.slice(2)).size).toBe(2);
        expect(names.some((name) => pathNamesRecordId(name))).toBe(false);
        expect(names[0]).toBe("booking");
    });
    test("turn any name into letters, digits and hyphens, and never into nothing", () => {
        expect(slugify("Flights, routes & fares")).toBe("flights-routes-fares");
        expect(slugify("レイヤー 名")).toBe("レイヤー-名");
        expect(slugify("Crème brûlée")).toBe("creme-brulee");
        expect(slugify("???")).toBe("item");
        const long = slugify("Adds a new airport from the request body and returns its id for administrators only");
        expect(long.length).toBeLessThanOrEqual(60);
        expect(long.endsWith("only")).toBe(false);
        expect(
            long
                .split("-")
                .every((word) =>
                    "adds a new airport from the request body and returns its id for administrators only"
                        .split(" ")
                        .includes(word),
                ),
        ).toBe(true);
    });
});

describe("the language guard", () => {
    test("fails on a record id in text or in an address, and only there", () => {
        expect(languageFindings("see capability-18530748046883432577 now", "x").hard).toHaveLength(1);
        expect(languageFindings("the booking-2 page", "x").hard).toHaveLength(0);
        expect(pathNamesRecordId("action/capability-18530748046883432577/block-30193141170402001730.html")).toBe(true);
        expect(pathNamesRecordId("action/booking/clears-bag-count.html")).toBe(false);
    });
    test("reports the machinery's words and boilerplate, not the code's ordinary English", () => {
        expect(languageFindings("a call to a routine outside the analysed block", "x").soft).toHaveLength(1);
        expect(languageFindings("this entry point would move", "x").soft).toHaveLength(1);
        expect(languageFindings("We leverage a robust, seamless approach", "x").soft.length).toBeGreaterThan(0);
        expect(languageFindings("the browser blocks the save", "x").soft).toHaveLength(0);
        expect(languageFindings("separated by underscores", "x").soft).toHaveLength(0);
    });
    test("reads a page as a person does", () => {
        const html =
            '<script>var capability = "capability-18530748046883432577"</script><button data-copy-text="block-30193141170402001730 entry point">Copy</button><p>Booking &amp; fares</p><a href="capability/booking.html">x</a>';
        expect(visibleText(html)).toBe("Copy Booking & fares x");
        expect(addressesIn(html)).toEqual(["capability/booking.html"]);
    });
});

describe("controls", () => {
    test("are listed by what a person sees, with the kind of control and its name in the page", async () => {
        const { readableControl } = await import("../src/lib/controls");
        expect(
            readableControl(
                "OneWay23KgCheckedInBag",
                "RadioButton; Text 23 kg<span>&#8364; 26.00</span>; GroupName one-way; value 23",
            ),
        ).toEqual({ text: "23 kg € 26.00", kind: "Option", name: "OneWay23KgCheckedInBag" });
        expect(
            readableControl(
                "Panel1",
                "Panel; ClientIDMode Static; CssClass row; heading CHECKED-IN BAGGAGE; label PLEASE SELECT",
            ).text,
        ).toBe("CHECKED-IN BAGGAGE: PLEASE SELECT");
        expect(readableControl("txtName", "TextBox; MaxLength 20")).toEqual({
            text: "txtName",
            kind: "Text field",
            name: "txtName",
        });
        expect(readableControl("x", "MyCustomWidget").kind).toBe("My Custom Widget");
    });
});

describe("plurals", () => {
    test("do not add an s to a phrase that has its own plural", () => {
        expect(copy.system.gapsText(2, 156)).toContain("156 pieces of code");
        expect(copy.system.gapsText(1, 1)).toContain("1 piece of code");
    });
});
