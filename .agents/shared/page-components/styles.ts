import { readFileSync } from "node:fs";
import { join } from "node:path";
import { roles, scaleProperties, type Mode } from "./tokens";

const here = import.meta.dirname;

/** The embedded fonts, upright only, each a Latin subset of a variable font. */
const fonts = [
    { family: "Mulish", file: "mulish-latin-wght-normal.woff2", weights: "200 1000" },
    { family: "JetBrains Mono", file: "jetbrains-mono-latin-wght-normal.woff2", weights: "100 800" },
];

/** The characters the Latin subsets hold, so a browser uses a fallback font for any other. */
const latin =
    "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD";

/**
 * Each font as an @font-face rule with the font inside it, so a page works offline and from a file.
 * @returns the rules
 */
const fontFaces = () =>
    fonts
        .map(({ family, file, weights }) => {
            const data = readFileSync(join(here, "fonts", file)).toString("base64");
            return `@font-face{font-family:"${family}";font-style:normal;font-display:swap;font-weight:${weights};src:url(data:font/woff2;base64,${data}) format("woff2");unicode-range:${latin};}`;
        })
        .join("\n");

/**
 * One mode's roles as custom property declarations.
 * @param mode light or dark
 * @returns the declarations
 */
const roleProperties = (mode: Mode) => roles(mode).map(([name, colour]) => `--${name}: ${colour};`);

/**
 * The whole stylesheet of a generated page: its fonts, the light roles and the scales, the dark roles on screens that
 * ask for dark or on a page marked `data-theme="dark"` (print stays light), and the components' rules.
 * @returns the stylesheet
 */
export function pageStyles(): string {
    const light = [...roleProperties("light"), ...scaleProperties()].join("\n    ");
    const dark = roleProperties("dark").join("\n        ");
    return [
        fontFaces(),
        `:root {\n    ${light}\n}`,
        `@media screen and (prefers-color-scheme: dark) {\n    :root:not([data-theme="light"]) {\n        ${dark}\n    }\n}`,
        `@media screen {\n    :root[data-theme="dark"] {\n        ${dark}\n    }\n}`,
        readFileSync(join(here, "styles.css"), "utf8"),
    ].join("\n");
}
