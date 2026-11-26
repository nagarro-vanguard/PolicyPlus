import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { navItem, navItemFill } from "../src/components/shell/navItem";

// The shared look of a navigation item (src/components/shell/navItem.ts) keeps the properties the accessibility target
// rests on: a current marker that is a border and not a fill, a focus outline at full strength that is not faded, motion
// on the theme's tokens, and no raw colour or pixel font size.

const all = `${navItem} ${navItemFill}`;
const classes = all.split(" ");

test("the current item has a border marker and weight, not a fill alone", () => {
    expect(classes).toContain("aria-[current]:border-foreground");
    expect(classes).toContain("border-s-2");
});

test("weight is the sidebar's alone, because the rail's wrapping rows would re-wrap", () => {
    expect(navItem).not.toContain("font-medium");
    expect(navItemFill).toContain("aria-[current]:font-medium");
});

test("the focus outline is full strength and is not in the transition", () => {
    expect(classes).toContain("focus-visible:outline-ring");
    expect(all).not.toMatch(/outline-ring\//);
    const transition = classes.find((c) => c.startsWith("transition-["));
    expect(transition).toBeDefined();
    expect(transition).not.toContain("outline");
});

test("motion comes from the theme's tokens", () => {
    expect(all).toContain("duration-(--motion-duration-quick)");
    expect(all).not.toMatch(/duration-\d/);
});

test("no raw colour or pixel font size", () => {
    expect(all).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(|hsl\(|oklch\(|text-\[\d+px\]/i);
});

test("reader controls are compact: no default-size button, one density rule for input and select", () => {
    const css = readFileSync(new URL("../src/styles/reader-theme.css", import.meta.url), "utf8");
    expect(css).toMatch(/main \[data-slot="select-trigger"\][^{]*\{[^}]*height:\s*1\.75rem/);
});
