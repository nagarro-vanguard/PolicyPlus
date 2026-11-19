// The list of a page's headings (src/components/shell/Contents.tsx): the entry of the heading the reader is at is marked
// `aria-current="location"` as the page scrolls, and a click on an entry moves to its heading smoothly (at once when the
// reader asked for less motion), keeps the heading's id in the address, and closes the fold it was picked from. The
// heading stops below the top bar through the page's `scroll-padding-top`. No framework; set up again for each page the
// router shows.

const lessMotion = matchMedia("(prefers-reduced-motion: reduce)");
let waiting = false;

const links = () => [...document.querySelectorAll<HTMLAnchorElement>("[data-contents-link]")];

const mark = (id: string | null) => {
    for (const link of links()) {
        if (link.dataset.contentsLink === id) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
    }
};

/** The current heading: the last one whose top has passed the upper part of the window, or the last at the page's end. */
const pick = () => {
    waiting = false;
    const all = links();
    if (all.length === 0) return;
    const line = Math.min(innerHeight * 0.3, 240);
    let current: string | null = null;
    for (const link of all) {
        const heading = document.getElementById(link.dataset.contentsLink ?? "");
        if (heading !== null && heading.getBoundingClientRect().top <= line) current = heading.id;
    }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 2) current = all.at(-1)?.dataset.contentsLink ?? current;
    mark(current ?? all[0]?.dataset.contentsLink ?? null);
};

const start = () => {
    for (const link of links()) {
        if (link.dataset.bound !== undefined) continue;
        link.dataset.bound = "true";
        link.addEventListener("click", (event) => {
            if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
            const target = document.getElementById(link.dataset.contentsLink ?? "");
            if (target === null) return;
            event.preventDefault();
            event.stopPropagation();
            history.pushState(history.state, "", `${location.pathname}${location.search}#${target.id}`);
            mark(target.id);
            // A fold the entry was picked from closes first, and the page moves once it has: its closing moves the heading.
            const fold = link.closest("details");
            const wait = fold === null ? 0 : Number.parseFloat(getComputedStyle(fold).getPropertyValue("--motion-duration-slow")) || 0;
            fold?.removeAttribute("open");
            setTimeout(() => target.scrollIntoView({ behavior: lessMotion.matches ? "auto" : "smooth", block: "start" }), wait + 20);
        });
    }
    pick();
};

addEventListener(
    "scroll",
    () => {
        if (waiting) return;
        waiting = true;
        requestAnimationFrame(pick);
    },
    { passive: true },
);
document.addEventListener("astro:page-load", start);

export {};
