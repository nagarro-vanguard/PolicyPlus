/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { mkdirSync, writeFileSync } from "node:fs";
import { assetFiles, assetsFor } from "./assets";
import { dirname, join } from "node:path";
import { catalogueSamples } from "./catalogue-samples.tsx";
import { DataTable } from "./components/data.tsx";
import { OnThisPage, Page, PageHeader, Section } from "./components/page.tsx";
import { StatusBadge, SummaryStrip } from "./components/status.tsx";
import { documentText, Fragment, jsx } from "./jsx";
import { contrastOf, roles } from "./tokens";

/**
 * A colour as a small swatch with its value, for the token table. The chip is drawn in the very colour it documents,
 * whichever mode the page is in, so it is an image of that colour, not styling: no page holds a style attribute.
 * @param props the swatch
 * @param props.colour the colour
 * @returns the swatch
 */
const Swatch = ({ colour }: { colour: string }) => (
    <span class="swatch">
        <svg class="swatch-chip" viewBox="0 0 1 1" aria-hidden="true">
            <rect width="1" height="1" fill={colour}></rect>
        </svg>
        <code>{colour}</code>
    </span>
);

/**
 * A role's dark value, or a plain word when the dark theme leaves the role as it is in light.
 * @param props the value
 * @param props.colour the dark value, when the dark theme sets one
 * @returns the swatch, or the word
 */
const DarkSwatch = ({ colour }: { colour: string | undefined }) =>
    colour === undefined ? <span>as in light</span> : <Swatch colour={colour} />;

/**
 * Every colour role, with its light and dark value.
 * @returns the section
 */
const ColourRoles = () => {
    const dark = new Map(roles("dark"));
    return (
        <Section
            id="colours"
            title="Colours"
            lede="Each role is a CSS custom property; pages name roles, never colours."
        >
            <DataTable
                empty="None."
                caption="Colour roles"
                columns={[
                    { key: "name", label: "Custom property", rowHeader: true },
                    { key: "light", label: "Light" },
                    { key: "dark", label: "Dark" },
                ]}
                rows={roles("light").map(([name, colour]) => ({
                    name: <code>{`--${name}`}</code>,
                    light: <Swatch colour={colour} />,
                    dark: <DarkSwatch colour={dark.get(name)} />,
                }))}
            />
        </Section>
    );
};

/**
 * Every contrast pair in both modes, with its ratio and whether it reaches its least.
 * @param props the pairs
 * @param props.pairs each pair in each mode
 * @returns the section
 */
const ContrastPairs = ({ pairs }: { pairs: ReturnType<typeof contrastOf> }) => (
    <Section id="contrast" title="Contrast" lede="Every pair a page puts together, with the least ratio it must reach.">
        <DataTable
            empty="None."
            caption="Contrast pairs, in both modes"
            columns={[
                { key: "pair", label: "Text on background", rowHeader: true },
                { key: "mode", label: "Mode" },
                { key: "ratio", label: "Ratio", numeric: true },
                { key: "least", label: "Least", numeric: true },
                { key: "verdict", label: "Verdict" },
            ]}
            rows={pairs.map((pair) => ({
                pair: (
                    <>
                        <code>{pair.text}</code> on <code>{pair.on}</code>
                    </>
                ),
                mode: pair.mode,
                ratio: pair.ratio.toFixed(2),
                least: pair.least,
                verdict: (
                    <StatusBadge status={pair.reaches ? "pass" : "fail"} label={pair.reaches ? "Passes" : "Misses"} />
                ),
            }))}
        />
    </Section>
);

/**
 * The catalogue page: every colour role in both modes, every contrast pair with its ratio, and every component with
 * sample content. It is the design system's documentation and the sheet its look is checked against.
 * @param generatedAt when it is made
 * @returns the page, and the pairs that miss their least contrast
 */
export function cataloguePage(generatedAt: string) {
    const pairs = [...contrastOf("light"), ...contrastOf("dark")];
    const missed = pairs.filter((pair) => !pair.reaches);
    const samples = catalogueSamples;
    const page = (
        <Page
            title="Page components"
            assets={assetsFor("catalogue.html")}
            header={
                <PageHeader
                    eyebrow="Design system"
                    title="Page components"
                    lede="Every colour, size and component a generated page is built from, in light and dark."
                    status={
                        missed.length === 0
                            ? { status: "pass", label: `All ${pairs.length} contrast pairs pass` }
                            : { status: "fail", label: `${missed.length} contrast pairs miss` }
                    }
                />
            }
            contents={
                <OnThisPage
                    items={[
                        { href: "#colours", label: "Colours" },
                        { href: "#contrast", label: "Contrast" },
                        ...samples.map((sample) => ({ href: `#${sample.id}`, label: sample.title })),
                    ]}
                />
            }
            generatedAt={generatedAt}
        >
            <SummaryStrip
                label="The design system in numbers"
                figures={[
                    { label: "colour roles", value: roles("light").length },
                    {
                        label: "contrast pairs checked",
                        value: pairs.length,
                        status: missed.length === 0 ? "pass" : "fail",
                    },
                    { label: "component samples", value: samples.length },
                ]}
            />
            <ColourRoles />
            <ContrastPairs pairs={pairs} />
            {samples.map((sample) => (
                <Section id={sample.id} title={sample.title} lede={sample.lede}>
                    {sample.content}
                </Section>
            ))}
        </Page>
    );
    return { text: documentText(page), missed };
}

if (import.meta.main) {
    const { text, missed } = cataloguePage(
        new Date().toLocaleString("en-GB", { dateStyle: "long", timeStyle: "short" }),
    );
    writeFileSync(join(import.meta.dirname, "catalogue.html"), text);
    for (const file of assetFiles()) {
        mkdirSync(dirname(join(import.meta.dirname, file.path)), { recursive: true });
        writeFileSync(join(import.meta.dirname, file.path), file.text);
    }
    for (const pair of missed) {
        console.error(`${pair.mode}: ${pair.text} on ${pair.on} is ${pair.ratio}, under ${pair.least}`);
    }
    console.log(`catalogue.html written, ${Math.round(text.length / 1024)} KB`);
    process.exitCode = missed.length === 0 ? 0 : 1;
}
