/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { renderMermaidSVG } from "beautiful-mermaid";
import { jsx, trusted } from "../jsx";
import { CodeBlock } from "./code";
import { Disclosure } from "./data";

/** What drawing a diagram gave: its markup, or why it could not be drawn. */
export type Drawn = { readonly svg: string } | { readonly fault: string };

/**
 * A tag without one attribute.
 * @param tag the opening tag, such as `<svg width="3" height="4">`
 * @param name the attribute's name
 * @returns the tag without ` name="…"`, or the tag as it is when it has none
 */
const withoutAttribute = (tag: string, name: string) => {
    const at = tag.indexOf(` ${name}="`);
    if (at < 0) {
        return tag;
    }
    const end = tag.indexOf('"', at + name.length + 3);
    return `${tag.slice(0, at)}${tag.slice(end + 1)}`;
};

/**
 * The renderer's markup made fit for a page that loads nothing from the network and sizes by its container: its root
 * keeps no inline colours or fixed size, which the page's stylesheet sets, and its font import is gone.
 * @param svg the markup as the renderer wrote it
 * @returns the markup for the page
 */
const forPage = (svg: string) => {
    const rootEnd = svg.indexOf(">") + 1;
    const root = ["style", "width", "height"].reduce(withoutAttribute, svg.slice(0, rootEnd));
    const rest = svg
        .slice(rootEnd)
        .split("\n")
        .filter((line) => !line.includes("@import"))
        .join("\n");
    return `${root}${rest}`;
};

/**
 * Draws a diagram written in Mermaid's syntax as SVG, with no network, script or browser. The renderer refuses an
 * empty text and one whose first line names no diagram it knows; it draws a line it cannot read without complaint, so
 * a drawn diagram is no proof its text is right.
 * @param source the diagram as text
 * @returns the markup, or why it could not be drawn
 */
export const drawDiagram = (source: string): Drawn => {
    try {
        return { svg: forPage(renderMermaidSVG(source, { transparent: true })) };
    } catch (error) {
        return { fault: error instanceof Error ? error.message : String(error) };
    }
};

/**
 * A diagram drawn from its text, under its title, with the text itself one disclosure away so a screen reader, a
 * copy and a diff all have it. A text that cannot be drawn shows why and its text.
 * @param props the diagram
 * @param props.id the diagram's id, which its text's copy button names
 * @param props.title what the diagram settles, which names it to a screen reader
 * @param props.source the diagram as Mermaid text
 * @returns the figure and its text
 */
export const DiagramFigure = ({ id, title, source }: { id: string; title: string; source: string }) => {
    const drawn = drawDiagram(source);
    return (
        <div class="diagram-block">
            {"svg" in drawn ? (
                <figure class="diagram" role="img" aria-label={title}>
                    {trusted(drawn.svg)}
                    <figcaption>{title}</figcaption>
                </figure>
            ) : (
                <p class="diagram-fault">{`The diagram "${title}" could not be drawn: ${drawn.fault}`}</p>
            )}
            <Disclosure title="The diagram as text">
                <CodeBlock id={id} title={title} code={source} />
            </Disclosure>
        </div>
    );
};
