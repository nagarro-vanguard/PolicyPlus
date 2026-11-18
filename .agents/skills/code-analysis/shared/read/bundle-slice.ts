import type { BundlePayload } from "../model/schemas/bundle-payload";
import type { KnowledgePayload } from "../model/schemas/knowledge-payload";
import type { CapabilityPayload } from "../model/schemas/payloads";
import type { SystemPayload } from "../model/schemas/system-payload";
import { designerOf } from "./bundle-places";

export type Payloads = {
    readonly system: SystemPayload;
    readonly capabilities: readonly CapabilityPayload[];
    readonly knowledge: KnowledgePayload;
    readonly index: BundlePayload;
};

type Rule = CapabilityPayload["layers"][number]["rules"][number];
type Action = CapabilityPayload["layers"][number]["actions"][number];
export type Screen = SystemPayload["screens"][number];
export type Block = BundlePayload["blocks"][number];
type RuleInfo = BundlePayload["rules"][number];

export type RuleEntry = {
    readonly rule: Rule;
    readonly info: RuleInfo;
    readonly owned: boolean;
    readonly group: string;
    readonly sharedWith: readonly string[];
};
export type ActionEntry = { readonly action: Action; readonly layer: string };
export type Neighbour = {
    readonly screen: Screen;
    readonly via: Block;
    readonly target: Block;
    readonly how: "opens" | "calls into";
};

export type Slice = {
    readonly kind: "screen" | "capability";
    readonly title: string;
    readonly capabilities: readonly CapabilityPayload[];
    readonly screens: readonly Screen[];
    readonly blocks: ReadonlyMap<string, Block>;
    readonly actions: readonly ActionEntry[];
    readonly rules: readonly RuleEntry[];
    readonly opens: readonly Neighbour[];
    readonly openedBy: readonly Neighbour[];
    readonly dedicated: (file: string) => boolean;
};

/**
 * How many other capabilities make code "core": code this many or more others also run is the product's common ground.
 */
export const coreFrom = 4;

/**
 * The screens by the files that make them, designer files included.
 * @param payloads everything the analysis wrote
 * @returns the screen of each file
 */
export const screensByFile = (payloads: Payloads) => {
    const byFile = new Map<string, Screen>();
    for (const screen of payloads.system.screens) {
        for (const file of screen.files) {
            byFile.set(file, screen);
            byFile.set(designerOf(file), screen);
        }
    }
    return byFile;
};

/**
 * The group a rule is shown under: the screen whose file decides it, otherwise the layer that decides it.
 * @param payloads everything the analysis wrote
 * @param byFile the screens by file
 * @param rule the rule
 * @param block the block deciding it, when known
 * @returns the group's name
 */
const groupOf = (payloads: Payloads, byFile: ReadonlyMap<string, Screen>, rule: Rule, block: Block | undefined) => {
    const screen = byFile.get(rule.place.file);
    if (screen !== undefined) {
        return screen.name;
    }
    const layer = block === undefined ? undefined : payloads.system.layers.find((each) => each.id === block.layer);
    return layer === undefined ? "Other logic" : layer.name;
};

type EntryInput = {
    readonly payloads: Payloads;
    readonly byFile: ReadonlyMap<string, Screen>;
    readonly self: ReadonlySet<string>;
    readonly rule: Rule;
    readonly info: RuleInfo;
    readonly block: Block | undefined;
    readonly owned: boolean;
};

/**
 * What a rule is as a bundle shows it, with who else reaches the code that decides it.
 * @param input the rule, what the index holds of it, whether the slice owns it and the capabilities the slice is of
 * @returns the entry
 */
export const entryOf = (input: EntryInput): RuleEntry => {
    const { payloads, byFile, self, rule, info, block, owned } = input;
    return {
        rule,
        info,
        owned,
        group: groupOf(payloads, byFile, rule, block),
        sharedWith: info.capabilities
            .filter((id) => !self.has(id))
            .flatMap((id) => {
                const found = payloads.system.capabilities.find((each) => each.id === id);
                return found === undefined ? [] : [found.name];
            }),
    };
};

/**
 * The capabilities that share code with the slice and only a few others, with how many rules each shares.
 * @param slice the slice
 * @returns the rules shared, by capability name
 */
export const specificCapabilities = (slice: Slice) => {
    const others = new Map<string, number>();
    for (const entry of slice.rules.filter((each) => !each.owned && each.sharedWith.length < coreFrom)) {
        for (const name of entry.sharedWith) {
            const before = others.get(name);
            others.set(name, before === undefined ? 1 : before + 1);
        }
    }
    return others;
};

/**
 * The files every block of which only the capability reaches: read whole, since nothing else is in them.
 * @param payloads everything the analysis wrote
 * @param blocks the capability's blocks
 * @param own the ids of the blocks only the capability reaches
 * @returns the files
 */
const dedicatedFilesOf = (payloads: Payloads, blocks: ReadonlyMap<string, Block>, own: ReadonlySet<string>) => {
    const shared = new Set(payloads.index.blocks.filter((block) => !own.has(block.id)).map((block) => block.file));
    return new Set([...blocks.values()].map((block) => block.file).filter((file) => !shared.has(file)));
};

/**
 * The slice of a capability: the blocks its entry points reach, its actions and rules, the rules it owns apart from
 * those it relies on.
 * @param payloads everything the analysis wrote
 * @param id the capability's record id
 * @returns the slice; undefined when no capability has that id
 */
export const capabilitySlice = (payloads: Payloads, id: string): Slice | undefined => {
    const capability = payloads.capabilities.find((each) => each.capability.id === id);
    if (capability === undefined) {
        return undefined;
    }
    const blocks = new Map(
        payloads.index.blocks.filter((block) => block.capabilities.includes(id)).map((block) => [block.id, block]),
    );
    const own = new Set(
        [...blocks.values()].filter((block) => block.capabilities.length === 1).map((block) => block.id),
    );
    const byFile = screensByFile(payloads);
    const infoOf = new Map(payloads.index.rules.map((rule) => [rule.id, rule]));
    const self = new Set([id]);
    const rules = capability.layers.flatMap((layer) =>
        layer.rules.flatMap((rule) => {
            const info = infoOf.get(rule.id);
            return info === undefined
                ? []
                : [
                      entryOf({
                          payloads,
                          byFile,
                          self,
                          rule,
                          info,
                          block: blocks.get(info.block),
                          owned: info.capabilities.length <= 1,
                      }),
                  ];
        }),
    );
    const dedicated = dedicatedFilesOf(payloads, blocks, own);
    return {
        kind: "capability",
        title: capability.capability.name,
        capabilities: [capability],
        screens: payloads.system.screens.filter((screen) => screen.capabilities.includes(id)),
        blocks,
        actions: capability.layers.flatMap((layer) => layer.actions.map((action) => ({ action, layer: layer.name }))),
        rules,
        opens: [],
        openedBy: [],
        dedicated: (file) => dedicated.has(file),
    };
};
