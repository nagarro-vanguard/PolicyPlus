/**
 * Finds one cycle in a directed graph.
 * @param edges the nodes each node points to
 * @returns the names along a cycle, or an empty list
 */
export const cycleIn = (edges: ReadonlyMap<string, readonly string[]>): string[] => {
    const state = new Map<string, 1 | 2>();
    const path: string[] = [];
    const visit = (node: string): string[] => {
        if (state.get(node) === 2) return [];
        if (state.get(node) === 1) return [...path.slice(path.indexOf(node)), node];
        state.set(node, 1);
        path.push(node);
        for (const next of edges.get(node) ?? []) {
            const found = visit(next);
            if (found.length > 0) return found;
        }
        path.pop();
        state.set(node, 2);
        return [];
    };
    for (const node of edges.keys()) {
        const found = visit(node);
        if (found.length > 0) return found;
    }
    return [];
};

/**
 * The nodes in a list that are not in a set, named for a gap message.
 * @param wanted the nodes
 * @param have the set
 * @returns up to eight of them, with a count of the rest
 */
export const missing = (wanted: Iterable<string>, have: ReadonlySet<string>) => {
    const lost = [...wanted].filter((each) => !have.has(each));
    return {
        count: lost.length,
        text: `${lost.slice(0, 6).join(", ")}${lost.length > 6 ? `, and ${lost.length - 6} more` : ""}`,
    };
};
