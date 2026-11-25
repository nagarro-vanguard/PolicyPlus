import { designerOf } from "./bundle-places";
import {
    entryOf,
    screensByFile,
    type Block,
    type Neighbour,
    type Payloads,
    type RuleEntry,
    type Screen,
    type Slice,
} from "./bundle-slice";

type Out = { readonly to: string; readonly kind: string };

/**
 * The links that leave each block, by the block's id.
 * @param payloads everything the analysis wrote
 * @returns the links
 */
const linksFrom = (payloads: Payloads) => {
    const from = new Map<string, Out[]>();
    for (const link of payloads.index.links) {
        const list = from.get(link.from);
        if (list === undefined) {
            from.set(link.from, [{ to: link.to, kind: link.kind }]);
        } else {
            list.push({ to: link.to, kind: link.kind });
        }
    }
    return from;
};

/**
 * Whether a link into another screen opens it, or only calls code of it: it opens when the link shows the screen or the
 * block reached is one that shows it.
 * @param kind the link's kind
 * @param target the block reached
 * @param presenters the ids of blocks that show a screen
 * @returns how the screen is reached
 */
const howOf = (kind: string, target: Block, presenters: ReadonlySet<string>) =>
    kind === "renders" || presenters.has(target.id) ? "opens" : "calls into";

/**
 * The blocks a screen's actions run, followed through calls until they reach another screen, which is noted.
 * @param payloads everything the analysis wrote
 * @param screen the screen
 * @param byFile the screens by file
 * @returns the blocks reached, by id, and the screens opened
 */
const closureOf = (payloads: Payloads, screen: Screen, byFile: ReadonlyMap<string, Screen>) => {
    const blocks = new Map(payloads.index.blocks.map((block) => [block.id, block]));
    const from = linksFrom(payloads);
    const presenters = new Set(payloads.index.links.filter((link) => link.kind === "renders").map((link) => link.from));
    const reached = new Map<string, Block>();
    const opens = new Map<string, Neighbour>();
    const queue = [...screen.actionIds];
    for (const next of queue) {
        const block = blocks.get(next);
        const out = from.get(next);
        if (block === undefined || reached.has(next)) {
            continue;
        }
        reached.set(next, block);
        for (const link of out === undefined ? [] : out) {
            const target = blocks.get(link.to);
            if (target === undefined || link.kind === "reads") {
                continue;
            }
            const other = byFile.get(target.file);
            if (other !== undefined && other.key !== screen.key) {
                if (!opens.has(other.key)) {
                    opens.set(other.key, {
                        screen: other,
                        via: block,
                        target,
                        how: howOf(link.kind, target, presenters),
                    });
                }
            } else if (link.kind !== "renders") {
                queue.push(link.to);
            }
        }
    }
    return { reached, opens: [...opens.values()], blocks, presenters };
};

/**
 * The screens that open or call into a screen's own code.
 * @param payloads everything the analysis wrote
 * @param screen the screen
 * @param context the screens by file, every block by id, the blocks that show a screen and the screen's own files
 * @param context.byFile the screens by file
 * @param context.blocks every block by id
 * @param context.presenters the ids of blocks that show a screen
 * @param context.ownFiles the screen's own files
 * @returns the neighbours
 */
const openedByOf = (
    payloads: Payloads,
    screen: Screen,
    context: {
        readonly byFile: ReadonlyMap<string, Screen>;
        readonly blocks: ReadonlyMap<string, Block>;
        readonly presenters: ReadonlySet<string>;
        readonly ownFiles: ReadonlySet<string>;
    },
) => {
    const openedBy = new Map<string, Neighbour>();
    for (const link of payloads.index.links) {
        const target = context.blocks.get(link.to);
        const source = context.blocks.get(link.from);
        if (target === undefined || source === undefined || link.kind === "reads") {
            continue;
        }
        const other = context.byFile.get(source.file);
        if (context.ownFiles.has(target.file) && other !== undefined && other.key !== screen.key) {
            if (!openedBy.has(other.key)) {
                openedBy.set(other.key, {
                    screen: other,
                    via: source,
                    target,
                    how: howOf(link.kind, target, context.presenters),
                });
            }
        }
    }
    return [...openedBy.values()];
};

/**
 * The rules decided in the blocks a screen runs, each marked owned when its block is in the screen's own files.
 * @param payloads everything the analysis wrote
 * @param screen the screen
 * @param reached the blocks it runs, by id
 * @param ownFiles the screen's own files
 * @returns the rules
 */
const rulesOf = (
    payloads: Payloads,
    screen: Screen,
    reached: ReadonlyMap<string, Block>,
    ownFiles: ReadonlySet<string>,
): RuleEntry[] => {
    const byFile = screensByFile(payloads);
    const known = new Map(
        payloads.capabilities.flatMap((each) =>
            each.layers.flatMap((layer) => layer.rules.map((rule) => [rule.id, rule] as const)),
        ),
    );
    return payloads.index.rules.flatMap((info) => {
        const rule = known.get(info.id);
        const block = reached.get(info.block);
        return rule === undefined || block === undefined
            ? []
            : [
                  entryOf({
                      payloads,
                      byFile,
                      self: new Set(screen.capabilities),
                      rule,
                      info,
                      block,
                      owned: ownFiles.has(block.file),
                  }),
              ];
    });
};

/**
 * The text a surface with no window is called in a bundle and in its file name.
 */
export const noWindow = "Entry points without a window";

/**
 * The slice of a screen, from the screen as it is restricted to what the slice covers.
 * @param payloads everything the analysis wrote
 * @param screen the screen, with its actions and capabilities already restricted
 * @param title the slice's title
 * @param restricted whether the screen is cut to one capability, so that neighbours are cut with it
 * @returns the slice
 */
const sliceOfScreen = (payloads: Payloads, screen: Screen, title: string, restricted: boolean): Slice => {
    const byFile = screensByFile(payloads);
    const { reached, opens, blocks, presenters } = closureOf(payloads, screen, byFile);
    const ownFiles = new Set(screen.files.flatMap((file) => [file, designerOf(file)]));
    const capabilities = payloads.capabilities.filter((each) => screen.capabilities.includes(each.capability.id));
    const wanted = new Set(screen.actionIds);
    const openedBy = openedByOf(payloads, screen, { byFile, blocks, presenters, ownFiles });
    return {
        kind: "screen",
        title,
        capabilities,
        screens: [screen],
        blocks: reached,
        actions: capabilities.flatMap((each) =>
            each.layers.flatMap((layer) =>
                layer.actions
                    .filter((action) => wanted.has(action.id))
                    .map((action) => ({ action, layer: layer.name })),
            ),
        ),
        rules: rulesOf(payloads, screen, reached, ownFiles),
        opens,
        openedBy: restricted
            ? openedBy.filter((each) => each.via.capabilities.some((id) => screen.capabilities.includes(id)))
            : openedBy,
        dedicated: (file) => ownFiles.has(file),
    };
};

/**
 * The slice of a screen: what its actions run, followed through calls into shared code but not into other screens,
 * which are named as the screens it opens; and the screens that open it. With a capability, only the actions that
 * capability holds on the screen, and the rules and neighbours those reach.
 * @param payloads everything the analysis wrote
 * @param key the screen's address
 * @param capabilityId the record id of the capability to restrict the screen to; all its capabilities when omitted
 * @returns the slice; undefined when no screen has that address, or the capability holds no action of it
 */
export const screenSlice = (payloads: Payloads, key: string, capabilityId?: string): Slice | undefined => {
    const screen = payloads.system.screens.find((each) => each.key === key);
    if (screen === undefined) {
        return undefined;
    }
    if (capabilityId === undefined) {
        return sliceOfScreen(payloads, screen, screen.name, false);
    }
    const capability = payloads.capabilities.find((each) => each.capability.id === capabilityId);
    const mine = new Set(
        capability === undefined ? [] : capability.layers.flatMap((layer) => layer.actions.map((action) => action.id)),
    );
    const actionIds = screen.actionIds.filter((id) => mine.has(id));
    return capability === undefined || actionIds.length === 0
        ? undefined
        : sliceOfScreen(
              payloads,
              { ...screen, capabilities: [capabilityId], actionIds },
              `${screen.name}, as ${capability.capability.name}`,
              true,
          );
};

/**
 * The slice of one surface of one capability: the actions the capability holds in the container named as the surface
 * (the code's own name for the window), or those no container holds for `Entry points without a window`.
 * @param payloads everything the analysis wrote
 * @param surface the surface's name, as the actions name their screen, or `Entry points without a window`
 * @param capabilityId the capability's record id
 * @returns the slice; undefined when the capability holds no action there
 */
export const surfaceSlice = (payloads: Payloads, surface: string, capabilityId: string): Slice | undefined => {
    const capability = payloads.capabilities.find((each) => each.capability.id === capabilityId);
    const container = surface === noWindow ? "" : surface;
    const actions =
        capability === undefined
            ? []
            : capability.layers.flatMap((layer) => layer.actions.filter((action) => action.screen === container));
    if (capability === undefined || actions.length === 0) {
        return undefined;
    }
    const ids = new Set(actions.map((action) => action.id));
    const matching = payloads.system.screens.filter((each) => each.actionIds.some((id) => ids.has(id)));
    const [first] = matching;
    const files = [...new Set(matching.flatMap((each) => each.files))];
    const screen: Screen = {
        ...(first === undefined ? emptyScreen : first),
        key: first === undefined ? "" : first.key,
        name: first === undefined ? surface : first.name,
        files: first === undefined ? [...new Set(actions.map((action) => action.place.file))] : files,
        capabilities: [capabilityId],
        actionIds: [...ids],
    };
    return sliceOfScreen(payloads, screen, `${screen.name}, as ${capability.capability.name}`, true);
};

const emptyScreen: Screen = {
    key: "",
    name: noWindow,
    purpose: "",
    files: [],
    capabilities: [],
    actionIds: [],
    actions: 0,
    rules: 0,
    layersTouched: [],
    context: {
        scope: "",
        inside: [],
        insideLabel: "",
        lookFirst: [],
        layers: [],
        saves: [],
        reads: [],
        rules: [],
        rulesTotal: 0,
        unconfirmed: [],
        notFollowed: [],
        commit: "",
    },
};
