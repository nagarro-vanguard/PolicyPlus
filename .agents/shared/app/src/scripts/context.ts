// What every view of a slice shares: the slice and its lookups, the state held in the address, and how to change it.
import type { SliceModel } from "../lib/slice-model";
import type { CapBrief, CapSlice } from "../lib/slice-types";
import { decodeState, encodeState } from "../lib/url-state";
import type { UrlState } from "../lib/url-state";

export type Ctx = {
    readonly root: string;
    readonly slice: CapSlice;
    readonly model: SliceModel;
    /** The state now. */
    state(): UrlState;
    /** Changes the state: the address follows, and every view that listens is told. `replace` keeps history short while typing. */
    set(patch: Partial<UrlState>, how?: "push" | "replace"): void;
    /** Tells `listener` when the state changes; returns the way to stop. */
    listen(listener: (state: UrlState, before: UrlState) => void): () => void;
    brief(): Promise<CapBrief>;
    /** Stops listening to the address; the page that made the context calls it before making another. */
    dispose(): void;
    /** The address of a screen's view, read through this capability. */
    screenHref(key: string): string;
};

/**
 * The shared context of a page that shows one slice.
 * @param root the path to the site's root
 * @param slice the slice
 * @param model its lookups
 * @param fetchBrief fetches the copyable texts, once
 * @returns the context
 */
export const makeContext = (root: string, slice: CapSlice, model: SliceModel, fetchBrief: () => Promise<CapBrief>): Ctx => {
    let state = decodeState(location.hash);
    const listeners = new Set<(state: UrlState, before: UrlState) => void>();
    const announce = (before: UrlState) => {
        for (const listener of listeners) listener(state, before);
    };
    const onHash = () => {
        const before = state;
        state = decodeState(location.hash);
        if (encodeState(before) !== encodeState(state)) announce(before);
    };
    addEventListener("hashchange", onHash);
    let brief: Promise<CapBrief> | undefined;
    return {
        root,
        slice,
        model,
        state: () => state,
        set: (patch, how = "push") => {
            const before = state;
            state = { ...state, ...patch };
            const fragment = encodeState(state);
            if (encodeState(before) === fragment) return;
            const url = `${location.pathname}${location.search}${fragment === "" ? "" : `#${fragment}`}`;
            if (how === "replace") history.replaceState(null, "", url);
            else history.pushState(null, "", url);
            announce(before);
        },
        listen: (listener) => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        brief: () => (brief ??= fetchBrief()),
        dispose: () => {
            removeEventListener("hashchange", onHash);
            listeners.clear();
        },
        screenHref: (key) => `${root}screen.html#${encodeState({ s: key, c: slice.slug })}`,
    };
};
