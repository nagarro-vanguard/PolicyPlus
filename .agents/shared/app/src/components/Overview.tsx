import { Button } from "@continuum/ui/components/button";
import { Sections } from "@continuum/ui/components/details";
import type { NodeView } from "../case/view";
import { copy } from "../lib/copy";
import { Facts, Section } from "./Explorer";
import { Rows } from "./Rows";

// The home page's body: the system's facts, the goals of the work as the people who asked for it wrote them ("Not
// provided" when they wrote none), the first level of the hierarchy, what to check first, and the way into the reference.

/**
 * The overview.
 * @param props the overview's view, the goals when the case has a brief, and the address of the reference
 * @returns the body of the home page
 */
export function Overview({
    view,
    goals,
    reference,
}: {
    readonly view: NodeView;
    readonly goals: { readonly provided: boolean; readonly text: string | null } | null;
    readonly reference: string | null;
}) {
    return (
        <div className="flex flex-col gap-spacing-5xl">
            <Facts facts={view.facts} tests={null} />
            <Sections>
                {goals === null ? null : (
                    <Section title={copy.overview.goals} writtenBy="app">
                        {goals.provided && goals.text !== null ? (
                            <>
                                <p className="text-sm text-muted-foreground" data-written-by="app">
                                    {copy.overview.goalsNote}
                                </p>
                                <p className="whitespace-pre-line" data-written-by="agent">
                                    {goals.text}
                                </p>
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
                    <Button variant="secondary" render={<a href={`./${reference}`} />} nativeButton={false} data-written-by="app">
                        {copy.overview.open}
                    </Button>
                </p>
            )}
        </div>
    );
}
