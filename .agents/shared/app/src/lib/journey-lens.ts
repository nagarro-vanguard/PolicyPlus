// The lens of a journey page: which column shows. Side by side is the default once a modernized way exists; before one does, only
// today's column is there. The address can name another (`#lens=today`), so a link shows what its sender saw.
export const lenses = ["today", "modern", "both"] as const;
export type Lens = (typeof lenses)[number];

/**
 * The lens a page opens with.
 * @param hash the address's fragment, with or without the `#`
 * @param hasWay whether a modernized way exists for the journey
 * @returns the lens named in the address when it is one the page has; otherwise the default
 */
export const lensOf = (hash: string, hasWay: boolean): Lens => {
    if (!hasWay) return "today";
    const wanted = new URLSearchParams(hash.startsWith("#") ? hash.slice(1) : hash).get("lens");
    return lenses.find((each) => each === wanted) ?? "both";
};
