// The Architecture page's states: which lens it opens on, which folds exist and what an address says. The page's script and
// the tests read the same functions.

export const lensIds = ["today", "modernized", "landing"] as const;
export type Lens = (typeof lensIds)[number];
export const lensWords: Record<Lens, string> = { today: "Today", modernized: "Modernized", landing: "Where it lands" };

export const foldIds = ["context", "containers", "connections", "components", "data", "risks", "alternatives"] as const;
export type Fold = (typeof foldIds)[number];

/**
 * The lenses a page offers: all three when a modernized architecture exists, else only today's.
 * @param modernized whether a modernized architecture with components exists
 * @returns the lenses in the order of the control
 */
export const lensesFor = (modernized: boolean): readonly Lens[] => (modernized ? lensIds : ["today"]);

/**
 * The lens a page opens on.
 * @param modernized whether a modernized architecture exists
 * @returns where it lands when there is one, else today
 */
export const defaultLens = (modernized: boolean): Lens => (modernized ? "landing" : "today");

/**
 * What an address asks for: `#lens=today`, `#fold=connections`, or both joined by `&`. Anything else asks for nothing.
 * @param hash the address's fragment
 * @param available the lenses the page offers
 * @param fallback the lens when the address names none
 * @returns the lens and the fold to open
 */
export const readHash = (hash: string, available: readonly Lens[], fallback: Lens): { lens: Lens; fold: Fold | undefined } => {
    const params = new URLSearchParams(hash.replace(/^#/, ""));
    const lens = params.get("lens") ?? "";
    const fold = params.get("fold") ?? "";
    return {
        lens: (available as readonly string[]).includes(lens) ? (lens as Lens) : fallback,
        fold: (foldIds as readonly string[]).includes(fold) ? (fold as Fold) : undefined,
    };
};

/**
 * The fragment that says a lens and an open fold.
 * @param lens the lens
 * @param fold the open fold, if any
 * @returns the fragment with its `#`
 */
export const writeHash = (lens: Lens, fold: Fold | undefined) => `#lens=${lens}${fold === undefined ? "" : `&fold=${fold}`}`;
