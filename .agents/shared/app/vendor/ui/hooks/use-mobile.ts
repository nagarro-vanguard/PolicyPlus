import { useSyncExternalStore } from "react";

// Finch's `md` (905px), the width from which Tailwind's `md:` shows the sidebar beside the page; the two must agree,
// or a window between them shows neither the sidebar nor the sheet.
const MOBILE_BREAKPOINT = 905;
const query = `(max-width: ${String(MOBILE_BREAKPOINT - 1)}px)`;

const subscribe = (notify: () => void) => {
    const media = matchMedia(query);
    media.addEventListener("change", notify);
    return () => {
        media.removeEventListener("change", notify);
    };
};

/**
 * Whether the window is narrower than the width from which the sidebar shows beside the page.
 * @returns true on a narrow window
 */
export function useIsMobile() {
    return useSyncExternalStore(
        subscribe,
        () => matchMedia(query).matches,
        () => false,
    );
}
