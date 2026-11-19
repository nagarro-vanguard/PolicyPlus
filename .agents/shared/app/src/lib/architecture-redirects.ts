import { taskSlug } from "./target-text";
import type { TargetData } from "./target-types";

// The pages the site no longer has, each a small page that sends the reader to where its content now lives. One list for the
// routes and for the tests.

export type Redirect = {
    /** The old page's path below the site's root, without the extension. */
    readonly from: string;
    /** Where it goes, relative to the site's root, with its extension and fragment. */
    readonly to: string;
    /** The words of the link on the page. */
    readonly text: string;
};

/** The redirects every build has: the analysis pages that the Architecture page folded in. */
export const analysisRedirects: readonly Redirect[] = [
    { from: "made-of", to: "architecture.html#lens=today", text: "Architecture" },
    { from: "how-it-runs", to: "architecture.html#lens=today&fold=containers", text: "Architecture, containers and how it runs" },
    { from: "connections", to: "architecture.html#lens=today&fold=connections", text: "Architecture, connections" },
];

/**
 * The redirects of a build with a target: the pages of the earlier design of the architecture, the lineage and the data of a task.
 * @param data the target's records
 * @returns the redirects, one for each page that existed
 */
export const targetRedirects = (data: TargetData): readonly Redirect[] => [
    { from: "target/architecture", to: "architecture.html#fold=alternatives", text: "Architecture" },
    ...(data.architecture === undefined ? [] : [{ from: "target/system", to: "architecture.html#lens=modernized", text: "Architecture, modernized" }]),
    ...(data.journeys.length === 0 ? [] : [{ from: "target/lineage", to: "journeys.html", text: "Journeys" }]),
    ...(data.architecture === undefined
        ? []
        : data.journeys.flatMap((journey) => {
              const task = data.tasks.find((each) => each.id === journey.task);
              return task === undefined ? [] : [{ from: `target/erd/${taskSlug(task)}`, to: `journey/${taskSlug(task)}.html#data`, text: "The journey and its data" }];
          })),
];

/**
 * The relative address of a redirect's destination, from the page that holds the redirect.
 * @param redirect the redirect
 * @returns the address
 */
export const hrefOf = (redirect: Redirect) => `${"../".repeat(redirect.from.split("/").length - 1)}${redirect.to}`;
