import tokens from "./tokens/page.tokens.json" with { type: "json" };

export type Mode = "light" | "dark";

type TokenNode = { readonly [key: string]: unknown };

/**
 * The token at a dotted path in the token file, such as `finch.grey.800`.
 * @param path the dotted path
 * @returns the token's `$value`
 */
function valueAt(path: string): unknown {
    let node: unknown = tokens;
    for (const key of path.split(".")) {
        node = (node as TokenNode)[key];
    }
    if (node === undefined || typeof node !== "object" || node === null || !("$value" in node)) {
        throw new Error(`page.tokens.json has no token at ${path}`);
    }
    return node.$value;
}

/**
 * A colour token's value, following an alias such as `{finch.grey.800}` to the value it names.
 * @param value the token's `$value`
 * @returns the colour as #RRGGBB
 */
const colourOf = (value: unknown): string => {
    const text = String(value);
    return text.startsWith("{") && text.endsWith("}") ? colourOf(valueAt(text.slice(1, -1))) : text;
};

/**
 * Every role of a mode, by its CSS name: role.light.text.primary is `text-primary`.
 * @param mode light or dark
 * @returns each role's name and colour, in the file's order
 */
export function roles(mode: Mode): [string, string][] {
    const found: [string, string][] = [];
    const walk = (node: TokenNode, path: readonly string[]) => {
        for (const [key, child] of Object.entries(node)) {
            if (key.startsWith("$")) {
                continue;
            }
            const next = child as TokenNode;
            if ("$value" in next) {
                found.push([[...path, key].join("-"), colourOf(next.$value)]);
            } else {
                walk(next, [...path, key]);
            }
        }
    };
    walk(tokens.role[mode], []);
    return found;
}

/**
 * A dimension token as CSS, such as `0.875rem`.
 * @param value the token's `$value`
 * @returns the CSS length
 */
const lengthOf = (value: unknown) => {
    const { value: amount, unit } = value as { value: number; unit: string };
    return `${amount}${unit}`;
};

/**
 * The CSS custom properties of every scale: font, space and radius, which do not change with the mode.
 * @returns one declaration per token
 */
export function scaleProperties(): string[] {
    const groups = [
        ["size", tokens.font.size],
        ["space", tokens.space],
        ["radius", tokens.radius],
    ] as const;
    const lengths = groups.flatMap(([prefix, group]) =>
        Object.entries(group)
            .filter(([key]) => !key.startsWith("$"))
            .map(([key, token]) => `--${prefix}-${key}: ${lengthOf((token as { $value: unknown }).$value)};`),
    );
    const family = (list: readonly string[]) =>
        list.map((name) => (name.includes(" ") ? `"${name}"` : name)).join(", ");
    return [
        ...lengths,
        `--font-text: ${family(tokens.font.family.text.$value)};`,
        `--font-code: ${family(tokens.font.family.code.$value)};`,
        ...Object.entries(tokens.font.weight)
            .filter(([key]) => !key.startsWith("$"))
            .map(([key, token]) => `--weight-${key}: ${(token as { $value: number }).$value};`),
        `--leading-body: ${tokens.font.leading.body.$value};`,
        `--leading-heading: ${tokens.font.leading.heading.$value};`,
    ];
}

/**
 * A colour's relative luminance, as WCAG 2 defines it.
 * @param hex the colour as #RRGGBB
 * @returns its luminance, from 0 to 1
 */
function luminance(hex: string): number {
    const channel = (start: number) => {
        const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
        return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/**
 * The contrast ratio of two colours, as WCAG 2 defines it.
 * @param first a colour as #RRGGBB
 * @param second another
 * @returns the ratio, from 1 to 21, to two decimals
 */
function contrast(first: string, second: string): number {
    const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
    return Math.round(((lighter! + 0.05) / (darker! + 0.05)) * 100) / 100;
}

/** A foreground role on a background role, and the least contrast it must reach in both modes. */
type ContrastPair = { readonly text: string; readonly on: string; readonly least: number; readonly why: string };

const surfaces = ["surface-page", "surface-sheet", "surface-raised", "surface-sunken"];

/** Every pair a page puts together; each must reach its least contrast in light and in dark. */
const contrastPairs: readonly ContrastPair[] = [
    ...surfaces.flatMap((on) => [
        { text: "text-primary", on, least: 7, why: "body text, enhanced level" },
        { text: "text-secondary", on, least: 7, why: "body text, enhanced level" },
        { text: "text-muted", on, least: 4.5, why: "small notes, minimum level" },
        { text: "accent-link", on, least: 4.5, why: "links, minimum level" },
        { text: "accent-focus", on, least: 3, why: "focus ring, a non-text indicator" },
        { text: "line-strong", on, least: 3, why: "control borders, a non-text indicator" },
    ]),
    { text: "text-primary", on: "accent-tint", least: 7, why: "text on a highlighted row" },
    ...["pass", "fail", "warn", "info", "neutral"].map((status) => ({
        text: `${status}-text`,
        on: `${status}-surface`,
        least: 7,
        why: "status words on their own background",
    })),
    { text: "text-primary", on: "pass-surface", least: 7, why: "added lines of a diff" },
    { text: "text-primary", on: "fail-surface", least: 7, why: "removed lines of a diff" },
];

/**
 * Each pair's contrast in one mode, with whether it reaches its least.
 * @param mode light or dark
 * @returns each pair with its ratio
 */
export function contrastOf(mode: Mode) {
    const byName = new Map(roles(mode));
    return contrastPairs.map((pair) => {
        const ratio = contrast(byName.get(pair.text) ?? "", byName.get(pair.on) ?? "");
        return { ...pair, mode, ratio, reaches: ratio >= pair.least };
    });
}
