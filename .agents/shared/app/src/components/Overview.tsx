import { Button } from "@continuum/ui/components/button";
import { Sections } from "@continuum/ui/components/details";
import type { NodeView } from "../case/view";
import { copy, goalCoverageWords } from "../lib/copy";
import { pageOf } from "../case/routes";
import { KindBadge } from "./KindBadge";
import { Section } from "./Explorer";
import { Rows } from "./Rows";

// The home page's body (its facts are in the page's header): the goals of the work as the people who asked for it wrote them ("Not
// provided" when they wrote none), the first level of the hierarchy, what to check first, and the way into the reference.

/**
 * The overview.
 * @param props the overview's view, the goals when the case has a brief, and the address of the reference
 * @returns the body of the home page
 */
export function Overview({
    view,
    goals,
    goalsHref,
    reference,
}: {
    readonly view: NodeView;
    readonly goals: {
        readonly provided: boolean;
        readonly text: string | null;
        readonly items?: readonly { readonly number: number; readonly node: string; readonly label: string; readonly text: string; readonly summary: "considered" | "missing" | "stale" }[];
    } | null;
    readonly goalsHref?: string | null;
    readonly reference: string | null;
}) {
    return (
        <div className="flex flex-col gap-spacing-5xl">
            <Sections>
                {goals === null ? null : (
                    <Section title={copy.overview.goals} writtenBy="app">
                        {goals.provided && goals.text !== null ? (
                            <>
                                <p className="text-sm text-muted-foreground" data-written-by="app">
                                    {copy.overview.goalsNote}
                                </p>
                                {goals.items === undefined || goals.items.length === 0 ? (
                                    <p className="whitespace-pre-line" data-written-by="agent">
                                        {goals.text}
                                    </p>
                                ) : (
                                    <ol className="flex flex-col gap-spacing-md" data-part="goals">
                                        {goals.items.map((item) => (
                                            <li key={item.number} className="flex flex-wrap items-baseline gap-x-spacing-md gap-y-spacing-2xs" data-summary={item.summary}>
                                                <span className="min-w-0 flex-1 basis-80" data-written-by="agent">
                                                    <a href={`./${pageOf(item.node)}`} className="underline decoration-border underline-offset-4 hover:decoration-foreground">
                                                        <span className="tabular-nums">{item.number}. </span>
                                                        {item.text}
                                                    </a>
                                                </span>
                                                <KindBadge kind={goalCoverageWords[item.summary].badge} label={goalCoverageWords[item.summary].summary} writtenBy="app" />
                                            </li>
                                        ))}
                                    </ol>
                                )}
                                {goalsHref === undefined || goalsHref === null ? null : (
                                    <p>
                                        <a href={goalsHref} className="underline decoration-border underline-offset-4 hover:decoration-foreground" data-written-by="app">
                                            {copy.overview.goalsOpen}
                                        </a>
                                    </p>
                                )}
                            </>
                        ) : (
                            <p className="text-muted-foreground" data-written-by="app">
                                {copy.overview.notProvided}
                            </p>
                        )}
                    </Section>
                )}
                <Section title={view.children.heading} writtenBy="agent">
                    <Rows rows={view.children.rows} root="./" />
                </Section>
                {view.folds
                    .filter((fold) => fold.kind === "checkFirst")
                    .map((fold) => (
                        <Section key={fold.kind} title={fold.title} writtenBy="app">
                            <Rows rows={fold.rows} root="./" />
                        </Section>
                    ))}
            </Sections>
            {reference === null ? null : (
                <p>
                    <Button variant="secondary" size="sm" render={<a href={`./${reference}`} />} nativeButton={false} data-written-by="app">
                        {copy.overview.open}
                    </Button>
                </p>
            )}
        </div>
    );
}
