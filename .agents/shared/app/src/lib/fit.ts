import { diagrams } from "./diagram-config";
import type { DiagramId } from "./diagram-config";
import { layout } from "./layout";
import type { Laid } from "./layout";
import type { FlowModel } from "./model";

/** The width of the room a figure has on a page, in pixels. */
export const pageWidth = 1000;
/** How far a figure may be shrunk to fit that room: below this its text is too small to read. */
export const smallestScale = 0.75;

export type Fitted = { model: FlowModel; laid: Laid; direction: "DOWN" | "RIGHT"; scale: number; readable: boolean };

/**
 * A figure that stays legible at page width: first as configured, then run the other way, then with fewer boxes (the
 * rest folded into a "more" box) until it is no longer shrunk below the smallest scale. When no choice reaches it, the
 * smallest figure is returned and marked unreadable, so the page says so and leans on the text version.
 * @param id the figure
 * @param build builds the figure for at most so many boxes
 * @returns the model, its layout and whether it is readable
 */
export const fitted = async (id: DiagramId, build: (limit: number) => FlowModel): Promise<Fitted> => {
    const settings = diagrams[id];
    const start = settings.budget === undefined ? 14 : settings.budget.nodes;
    const first = settings.layout === undefined ? "RIGHT" : settings.layout.direction;
    // A figure people pan and zoom is fitted to its room by the browser; only a static one must be legible as it is.
    const needed = settings.renderer === "flow" ? 0 : smallestScale;
    const order = [first, first === "RIGHT" ? "DOWN" : "RIGHT"] as const;
    let last: Fitted | undefined;
    for (let limit = start; limit >= 6; limit -= 2) {
        const model = build(limit);
        for (const direction of order) {
            const laid = await layout(model, direction);
            const scale = Math.min(1, pageWidth / Math.max(laid.width, 1));
            last = { model, laid, direction, scale, readable: scale >= needed };
            if (last.readable) {
                return last;
            }
        }
    }
    if (last === undefined) {
        throw new Error(`no figure could be built for ${id}`);
    }
    return last;
};
