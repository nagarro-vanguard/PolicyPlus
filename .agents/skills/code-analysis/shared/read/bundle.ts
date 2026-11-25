import { positionDiagram, systemDiagram } from "./bundle-diagrams";
import { filesOf, type FileRow } from "./bundle-files";
import { productLines } from "./bundle-lines";
import { at, rangesText, type Place } from "./bundle-places";
import { noWindow, screenSlice, surfaceSlice } from "./bundle-screen-slice";
import { boundaryLines, contractLines, dataLines, reliedLines } from "./bundle-sections";
import { capabilitySlice, type Payloads, type Slice } from "./bundle-slice";
import { trustLines } from "./bundle-trust";

export type { Payloads } from "./bundle-slice";

export type Bundle = {
    readonly kind: "screen" | "capability";
    readonly title: string;
    readonly lines: readonly string[];
    readonly files: readonly FileRow[];
    readonly ruleIds: readonly string[];
    readonly cites: readonly Place[];
};

const howToRead =
    "How to read it: paths are relative to the source root and `file:a-b` is an inclusive line range. `BR-` rules, `ACT-` actions, `TR-` changes of state and `RK-` risks have stable ids. A record marked disputed was challenged in review and kept; the reviewer's words are under Trust. All of it was read from the code; nothing was run.";

/**
 * Which code the bundle was read from: the repository and the commit, as the system payload names them; the context's
 * statement when there is no commit to name (a folder outside git, or a run that recorded none).
 * @param system the system payload
 * @returns the line
 */
const sourceLine = (system: Payloads["system"]) =>
    system.repository !== undefined &&
    system.repository !== null &&
    system.commit !== undefined &&
    system.commit !== null
        ? `Read from ${system.repository} at commit ${system.commit}.`
        : `Commit: ${system.context.commit}.`;

/**
 * A heading and its lines, or nothing when there are no lines.
 * @param heading the heading
 * @param body the lines
 * @returns the lines with a blank line and the heading before them
 */
const section = (heading: string, body: readonly string[]) => (body.length === 0 ? [] : ["", `## ${heading}`, ...body]);

/**
 * Say how many of something, with its plural.
 * @param count how many
 * @param one the singular
 * @param many the plural
 * @returns the phrase
 */
const counted = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * The one line that sums a bundle up.
 * @param slice the slice
 * @param files the files to read
 * @returns the line
 */
const glanceLine = (slice: Slice, files: readonly FileRow[]) => {
    const owned = slice.rules.filter((entry) => entry.owned).length;
    const disputed = slice.rules.filter((entry) => entry.info.reading === "disputed").length;
    const tier = (name: FileRow["tier"]) => files.filter((file) => file.tier === name).length;
    return `At a glance: ${counted(owned, "owned rule", "owned rules")}, ${slice.rules.length - owned} relied on, ${counted(slice.actions.length, "action", "actions")}, ${files.length} files (${tier("own")} own, ${tier("relied on")} relied on, ${tier("neighbour screen")} of neighbour screens, ${tier("generated")} generated), ${disputed} disputed.`;
};

/**
 * Where the slice sits in words: the capabilities and area of a screen, or the purpose, area and screens of a capability.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the lines
 */
const placeLines = (payloads: Payloads, slice: Slice) => {
    const areas = payloads.system.areas
        .filter((area) => slice.capabilities.some((each) => area.capabilities.includes(each.capability.id)))
        .map((area) => area.name);
    const area = areas.length === 0 ? "" : ` Area: ${areas.join(", ")}.`;
    if (slice.kind === "screen") {
        const names = slice.capabilities.map((each) => each.capability.name).join(", ");
        return [`Part of: ${names}${areas.length === 0 ? "" : ` (${areas.join(", ")})`}.`];
    }
    const [capability] = slice.capabilities;
    return [
        `${capability === undefined ? "" : capability.capability.purpose}${area}`,
        "",
        ...slice.screens.map(
            (screen) =>
                `- **${screen.name}**${screen.purpose === "" ? "" : `: ${screen.purpose}`} (bundle: screen ${screen.key})`,
        ),
    ];
};

/**
 * Build a bundle from a slice: what the product is, where the slice sits, what it must do, what it relies on, its data
 * and states, its neighbours, what to doubt and the files to read.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the bundle
 */
const bundleOf = (payloads: Payloads, slice: Slice): Bundle => {
    const files = filesOf(payloads, slice);
    const touched = new Set([
        ...slice.capabilities.flatMap((each) => each.layers.map((layer) => layer.id)),
        ...slice.screens.flatMap((screen) => screen.layersTouched.map((layer) => layer.layerId)),
    ]);
    const lines = [
        `# ${slice.kind === "screen" ? "Screen" : "Capability"}: ${slice.title}`,
        "",
        glanceLine(slice, files),
        "",
        howToRead,
        sourceLine(payloads.system),
        ...section("Product context", [...productLines(payloads), "", ...systemDiagram(payloads, touched)]),
        ...section("Where this sits", [...placeLines(payloads, slice), "", ...positionDiagram(payloads, slice)]),
        ...section("Boundary", boundaryLines(slice)),
        ...section("Contract: what it must do", contractLines(payloads, slice)),
        ...section("Relied on: decided elsewhere", reliedLines(slice)),
        ...section("Data and states", dataLines(payloads, slice)),
        ...section("Trust: what to doubt", trustLines(payloads, slice)),
        ...section("Read order", [
            "| Tier | File | Lines | Why |",
            "| --- | --- | --- | --- |",
            ...files.map(
                (file) =>
                    `| ${file.tier} | \`${file.path}\` | ${file.whole ? "whole file" : rangesText(file.ranges)} | ${file.why} |`,
            ),
        ]),
    ];
    return {
        kind: slice.kind,
        title: slice.title,
        lines,
        files,
        ruleIds: slice.rules.map((entry) => entry.rule.id),
        cites: [
            ...slice.actions.map((entry) => entry.action.place),
            ...slice.rules.flatMap((entry) => [entry.rule.place, ...entry.rule.alsoRestsOn]),
        ],
    };
};

/**
 * The bundle of one screen.
 * @param payloads everything the analysis wrote
 * @param key the screen's address
 * @param capabilityId the record id of the capability to cut the screen to; the whole screen when omitted
 * @returns the bundle; undefined when no screen has that address
 */
export const screenBundle = (payloads: Payloads, key: string, capabilityId?: string): Bundle | undefined => {
    const slice = screenSlice(payloads, key, capabilityId);
    return slice === undefined ? undefined : bundleOf(payloads, slice);
};

/**
 * The bundle of one surface of one capability, which is the unit a modernisation story builds.
 * @param payloads everything the analysis wrote
 * @param surface the surface's name as the actions name their screen, or `Entry points without a window`
 * @param capabilityId the capability's record id
 * @returns the bundle; undefined when the capability holds no action there
 */
export const surfaceBundle = (payloads: Payloads, surface: string, capabilityId: string): Bundle | undefined => {
    const slice = surfaceSlice(payloads, surface, capabilityId);
    return slice === undefined ? undefined : bundleOf(payloads, slice);
};

/**
 * The text of a name as a file name part: lowercase, each run of other characters one `-`, none at either end.
 * @param text the name
 * @returns the slug
 */
export const slug = (text: string) =>
    text
        .toLowerCase()
        .split("")
        .map((char) => ((char >= "a" && char <= "z") || (char >= "0" && char <= "9") ? char : " "))
        .join("")
        .split(" ")
        .filter((part) => part !== "")
        .join("-");

/**
 * The file name of the bundle of one surface of one capability.
 * @param surface the surface's name
 * @param capability the capability's name
 * @returns the file name
 */
export const surfaceBundleName = (surface: string, capability: string) =>
    `screen-${slug(surface)}--${slug(capability)}.md`;

/**
 * Every surface of every capability: the pairs a bundle is written for, in the capabilities' order.
 * @param payloads everything the analysis wrote
 * @returns the pairs, with the capability's record id and name
 */
export const surfacePairs = (payloads: Payloads) =>
    payloads.capabilities.flatMap((each) => {
        const surfaces = new Set(
            each.layers.flatMap((layer) =>
                layer.actions.map((action) => (action.screen === "" ? noWindow : action.screen)),
            ),
        );
        return [...surfaces].map((surface) => ({
            surface,
            capabilityId: each.capability.id,
            capability: each.capability.name,
        }));
    });

/**
 * The file name of every capability's bundle, `capability-<slug(name)>.md`, a number added after the second that
 * shares a slug, in the capabilities' order.
 * @param payloads everything the analysis wrote
 * @returns each capability's record id, name and file
 */
export const capabilityBundleNames = (payloads: Payloads) => {
    const used = new Map<string, number>();
    return payloads.capabilities.map((each) => {
        const base = slug(each.capability.name) || "capability";
        const times = (used.get(base) === undefined ? 0 : Number(used.get(base))) + 1;
        used.set(base, times);
        return {
            capabilityId: each.capability.id,
            capability: each.capability.name,
            file: `capability-${times === 1 ? base : `${base}-${times}`}.md`,
        };
    });
};

/**
 * The bundle of one capability.
 * @param payloads everything the analysis wrote
 * @param id the capability's record id
 * @returns the bundle; undefined when no capability has that id
 */
export const capabilityBundle = (payloads: Payloads, id: string): Bundle | undefined => {
    const slice = capabilitySlice(payloads, id);
    return slice === undefined ? undefined : bundleOf(payloads, slice);
};

/**
 * A bundle as one text: its sections, then, where the source is given, the lines it names with their numbers.
 * @param bundle the bundle
 * @param sourceOf the source text of a file by its path; undefined when it is not to be embedded
 * @returns the text
 */
export const bundleText = (bundle: Bundle, sourceOf: (path: string) => string | undefined) => {
    const embedded = bundle.files.flatMap((file) => {
        const source = file.tier === "generated" ? undefined : sourceOf(file.path);
        if (source === undefined) {
            return [];
        }
        const rows = source.split("\n");
        const ranges = file.whole ? [{ first: 1, last: rows.length }] : file.ranges;
        return [
            "",
            `### ${file.path}`,
            ...ranges.flatMap((range) => [
                "```",
                ...rows.slice(range.first - 1, range.last).map((row, number) => `${range.first + number}: ${row}`),
                "```",
            ]),
        ];
    });
    return `${[...bundle.lines, ...(embedded.length === 0 ? [] : ["", "## Source", ...embedded])].join("\n")}\n`;
};

const boilerplate = ["secrets stores", "triggers, procedures"];

/**
 * What is wrong with a finished bundle: a rule listed twice, a cited place the file list does not cover, or text that
 * belongs to no analysis of this code.
 * @param bundle the bundle
 * @returns one line per problem; none when it adds up
 */
export const bundleGaps = (bundle: Bundle) => {
    const twice = bundle.ruleIds.filter((id, number, all) => all.indexOf(id) !== number);
    const covered = (cite: Place) =>
        bundle.files.some(
            (file) =>
                file.path === cite.file &&
                (file.whole ||
                    file.ranges.some((range) => range.first <= cite.firstLine && cite.lastLine <= range.last)),
        );
    const text = bundle.lines.join("\n");
    return [
        ...[...new Set(twice)].map((id) => `rule ${id} is listed twice`),
        ...bundle.cites
            .filter((cite) => !covered(cite))
            .map((cite) => `${at(cite)} is cited but no file row covers it`),
        ...boilerplate
            .filter((phrase) => text.includes(phrase))
            .map((phrase) => `the text holds boilerplate: ${phrase}`),
    ];
};
