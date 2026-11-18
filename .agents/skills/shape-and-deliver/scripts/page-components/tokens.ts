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
