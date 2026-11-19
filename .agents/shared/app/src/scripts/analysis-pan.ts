// A drawing is shown at full size in a frame; this lets a person drag it as well as scroll it. The frame is a focusable region,
// so the arrow keys scroll it too.
import { fresh, onPage } from "./page";

onPage(() => {
for (const frame of document.querySelectorAll<HTMLElement>("[data-a-pan]")) {
    if (!fresh(frame)) continue;
    let from: { x: number; y: number; left: number; top: number } | undefined;
    frame.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || (event.target as HTMLElement).closest("a, button") !== null) return;
        from = { x: event.clientX, y: event.clientY, left: frame.scrollLeft, top: frame.scrollTop };
        frame.setPointerCapture(event.pointerId);
        frame.dataset.dragging = "true";
    });
    frame.addEventListener("pointermove", (event) => {
        if (from === undefined) return;
        frame.scrollLeft = from.left - (event.clientX - from.x);
        frame.scrollTop = from.top - (event.clientY - from.y);
    });
    const stop = () => {
        from = undefined;
        delete frame.dataset.dragging;
    };
    frame.addEventListener("pointerup", stop);
    frame.addEventListener("pointercancel", stop);
}
});
