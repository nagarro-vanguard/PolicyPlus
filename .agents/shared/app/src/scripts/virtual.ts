// A list that draws only the rows in view. Rows have one fixed height, the page scrolls (no inner scroll box), and the list
// is as tall as all its rows, so the scroll bar, find-in-page of the visible rows and anchors behave. Lists of fifty rows or
// fewer are drawn whole, at the height their content needs.

export type VRow = {
    readonly key: string;
    /** Draws the row; called each time it scrolls into view. */
    readonly render: () => HTMLElement;
};

export const wholeLimit = 50;

export class VirtualList {
    private rows: readonly VRow[] = [];
    private readonly drawn = new Map<string, HTMLElement>();
    private height = 44;
    private frame = 0;
    private readonly onScroll = () => {
        if (this.frame !== 0) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.paint();
        });
    };

    /**
     * @param host the element the rows are drawn in; the list owns its children
     * @param label what the list is, for a screen reader
     */
    constructor(
        private readonly host: HTMLElement,
        label: string,
        private role: "list" | "table" = "list",
        /** The height of one row in rem, when the list draws only the rows in view. */
        private readonly rowRem = 2.75,
    ) {
        host.setAttribute("role", role === "table" ? "rowgroup" : "list");
        host.setAttribute("aria-label", label);
        host.classList.add("vlist");
        addEventListener("scroll", this.onScroll, { passive: true });
        addEventListener("resize", this.onScroll);
    }

    /**
     * Changes what the list is to assistive technology: a table's rows are `row`, a list's are `listitem`.
     * @param role the new role; takes effect with the next `set`
     */
    setRole(role: "list" | "table") {
        this.role = role;
        this.host.setAttribute("role", role === "table" ? "rowgroup" : "list");
    }

    /** The number of rows drawn right now, for a measure. */
    get drawnCount() {
        return this.drawn.size;
    }

    destroy() {
        removeEventListener("scroll", this.onScroll);
        removeEventListener("resize", this.onScroll);
        this.host.replaceChildren();
    }

    /**
     * Sets the rows and draws.
     * @param rows every row
     */
    set(rows: readonly VRow[]) {
        this.rows = rows;
        this.drawn.clear();
        this.host.replaceChildren();
        const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
        this.height = Math.round(rem * this.rowRem);
        const whole = rows.length <= wholeLimit;
        this.host.classList.toggle("vlist-whole", whole);
        this.host.style.height = whole ? "" : `${rows.length * this.height}px`;
        this.paint();
    }

    private paint() {
        const rows = this.rows;
        const rowRole = this.role === "table" ? "row" : "listitem";
        if (rows.length <= wholeLimit) {
            if (this.drawn.size === rows.length && this.drawn.size > 0) return;
            const nodes = rows.map((row, at) => this.draw(row, at, rowRole, false));
            this.host.replaceChildren(...nodes);
            return;
        }
        const top = this.host.getBoundingClientRect().top;
        const first = Math.max(0, Math.floor(-top / this.height) - 6);
        const last = Math.min(rows.length - 1, Math.ceil((innerHeight - top) / this.height) + 6);
        const keep = new Set<string>();
        for (let at = first; at <= last; at += 1) {
            const row = rows[at];
            if (row === undefined) continue;
            keep.add(row.key);
            if (!this.drawn.has(row.key)) this.host.append(this.draw(row, at, rowRole, true));
        }
        for (const [key, node] of this.drawn) {
            if (!keep.has(key)) {
                node.remove();
                this.drawn.delete(key);
            }
        }
    }

    private draw(row: VRow, at: number, role: string, positioned: boolean) {
        const node = row.render();
        node.setAttribute("role", role);
        node.setAttribute("aria-posinset", String(at + 1));
        node.setAttribute("aria-setsize", String(this.rows.length));
        if (positioned) {
            node.style.position = "absolute";
            node.style.top = `${at * this.height}px`;
            node.style.insetInline = "0";
            node.style.height = `${this.height}px`;
        }
        this.drawn.set(row.key, node);
        return node;
    }
}
