// What the sidebar and the overview are built from: the index, the capabilities in the order a person reads them, and the name
// the system goes by. Made once per build; every page's shell reads it.
import { capabilities, knowledge, slugs, system } from "./payloads";
import { buildIndex } from "./slice";
import type { AppIndex, IndexItem } from "./slice-types";
import { systemName } from "./words";

/** More capabilities than this and the sidebar opens only the current area's. */
export const openAllLimit = 15;

export type SideModel = {
    readonly index: AppIndex;
    readonly name: string;
    readonly risks: number;
    /** The capabilities, grouped by area in the index's order; `area` is empty when a capability belongs to none. */
    readonly groups: readonly { readonly area: IndexItem | undefined; readonly caps: readonly IndexItem[] }[];
    readonly capabilities: readonly IndexItem[];
};

let cache: Promise<SideModel> | undefined;

/**
 * The sidebar's model.
 * @returns the model, made once per build
 */
export const sideModel = (): Promise<SideModel> => {
    cache ??= (async () => {
        const [sys, caps, know, addresses] = await Promise.all([system(), capabilities(), knowledge(), slugs()]);
        const index = buildIndex({ sys, caps, know, slugs: addresses });
        const areas = index.items.filter((item) => item.kind === "area");
        const all = index.items.filter((item) => item.kind === "capability");
        const loose = all.filter((item) => !areas.some((area) => area.id === item.parent));
        const groups = [
            ...areas.map((area) => ({ area, caps: all.filter((item) => item.parent === area.id) })),
            ...(loose.length > 0 ? [{ area: undefined, caps: loose }] : []),
        ];
        return { index, name: systemName(sys), risks: know.risks.length, groups, capabilities: groups.flatMap((group) => group.caps) };
    })();
    return cache;
};
