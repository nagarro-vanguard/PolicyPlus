/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import type { SiteAssets } from "../assets";
import { jsx, type Child } from "../jsx";
import { StatusBadge, type Status } from "./status.tsx";

/**
 * A whole generated page: a skip link, the header, an optional contents list, the main content, and a footer saying
 * when it was made. Its styles and script are the site's own files, linked, never inlined (`.claude/shared/ux-patterns.md`
 * rule 2): one copy per site, written once with `assetFiles`.
 * @param props the page
 * @param props.title the browser tab's title
 * @param props.assets where this page links the site's stylesheet and script, from `assetsFor`
 * @param props.header the page's header
 * @param props.contents the "On this page" list, when the page has one
 * @param props.generatedAt when it was made, in words, such as "10 October 2026 at 17:13"
 * @param props.children the main content
 * @returns the `<html>` element
 */
export const Page = (props: {
    title: string;
    assets: SiteAssets;
    header: Child;
    contents?: Child;
    generatedAt: string;
    children?: Child;
}) => (
    <html lang="en">
        <head>
            <meta charset="utf-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <meta name="color-scheme" content="light dark" />
            <title>{props.title}</title>
            <link rel="stylesheet" href={props.assets.stylesheet} />
        </head>
        <body>
            <a class="skip-link" href="#main">
                Skip to content
            </a>
            <div class="page">
                {props.header}
                {props.contents}
                <main id="main" class="page-body" tabindex="-1">
                    {props.children}
                </main>
                <footer class="page-footer">
                    <p>Made on {props.generatedAt}.</p>
                </footer>
            </div>
            <div id="announce" class="visually-hidden" aria-live="polite"></div>
            <script src={props.assets.script} defer></script>
        </body>
    </html>
);

/**
 * The top of a page: what kind of page it is, its title, one sentence on what it answers, and how things stand.
 * @param props the header
 * @param props.eyebrow the kind of page, such as "Plan for approval"
 * @param props.title the page's title
 * @param props.lede one sentence on what the page answers
 * @param props.status how things stand, when the page has a verdict
 * @param props.meta further facts, such as the work item and its branch
 * @returns the header
 */
export const PageHeader = (props: {
    eyebrow: string;
    title: string;
    lede: string;
    status?: { status: Status; label: string };
    meta?: Child;
}) => (
    <header class="page-header">
        <p class="eyebrow">{props.eyebrow}</p>
        <h1>{props.title}</h1>
        <p class="lede">{props.lede}</p>
        {(props.status !== undefined || props.meta !== undefined) && (
            <div class="page-meta">
                {props.status && <StatusBadge status={props.status.status} label={props.status.label} />}
                {props.meta}
            </div>
        )}
    </header>
);

/**
 * The list of a page's sections, beside the content on wide screens and above it on narrow ones.
 * @param props the list
 * @param props.items each section's anchor and name
 * @returns the navigation
 */
export const OnThisPage = ({ items }: { items: readonly { href: string; label: string }[] }) => (
    <nav class="on-this-page" aria-labelledby="on-this-page">
        <h2 id="on-this-page">On this page</h2>
        <ol role="list">
            {items.map((item) => (
                <li>
                    <a href={item.href}>{item.label}</a>
                </li>
            ))}
        </ol>
    </nav>
);

/**
 * One section of a page, with its heading and its anchor. A section written for a reader other than the page's own,
 * such as the engineers or whoever runs the tool, names that reader, so the page's main reader can skip it and a
 * check can tell whose words it holds.
 * @param props the section
 * @param props.id its anchor, which OnThisPage links to
 * @param props.title its heading
 * @param props.lede one sentence on what the section shows, when it helps
 * @param props.reader the reader it is written for, when it is not the page's own
 * @param props.children its content
 * @returns the section
 */
export const Section = (props: { id: string; title: string; lede?: string; reader?: string; children?: Child }) => (
    <section class="section" id={props.id} aria-labelledby={`${props.id}-title`} data-reader={props.reader}>
        <h2 id={`${props.id}-title`}>{props.title}</h2>
        {props.lede && <p class="lede">{props.lede}</p>}
        {props.children}
    </section>
);

/**
 * The opening of a page in business language, for a reader who reads nothing else: short sentences, the criteria
 * in their own words, no file names.
 * @param props the passage
 * @param props.title its heading
 * @param props.children its sentences
 * @returns the passage
 */
export const PlainWords = ({ title = "In plain words", children }: { title?: string; children?: Child }) => (
    <section class="plain-words" aria-labelledby="plain-words-title">
        <h2 id="plain-words-title">{title}</h2>
        {children}
    </section>
);
