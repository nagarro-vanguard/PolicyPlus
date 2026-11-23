import { Badge } from "@continuum/ui/components/badge";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@continuum/ui/components/item";
import { CircleCheck } from "lucide-react";
import type { ReactNode } from "react";
import type { ChoicesView, Option } from "../case/architecture-view";
import { copy } from "../lib/copy";
import { Filter, NoMatch, SinceFold, Sub } from "./Architecture";
import { Section } from "./Explorer";
import { Fold } from "./Fold";

// The Choices page: the four choices that shape the new system, read as a review. Each says what is decided, the options
// with what each costs, the one taken, what follows and whether it can be changed, then how to ask for a change.
// No step of the process, no date and no name of who decides: the app's
// words for each choice are in copy.ts, the options and reasons are the case's.

const words = copy.choices;

/** A label and the case's words on one line. */
function Pair({ label, children }: { readonly label: string; readonly children: ReactNode }) {
    return (
        <p>
            <span className="text-muted-foreground" data-written-by="app">
                {label}:
            </span>{" "}
            <span data-written-by="agent">{children}</span>
        </p>
    );
}

/** One option: its name, whether it is the one recommended, and what it costs. */
function OptionRow({ name, cost, recommended, writtenBy }: { readonly name: string; readonly cost: string; readonly recommended: boolean; readonly writtenBy: "agent" | "app" }) {
    return (
        <Item size="xs" className="items-start">
            <ItemContent className="min-w-0">
                <ItemTitle className="line-clamp-none">
                    <span data-written-by={writtenBy}>{name}</span>
                    {recommended ? (
                        <Badge variant="outline" data-written-by="app">
                            <CircleCheck aria-hidden="true" />
                            {words.recommended}
                        </Badge>
                    ) : null}
                </ItemTitle>
                <ItemDescription className="line-clamp-none">
                    <span data-written-by="app">{words.cost}:</span> <span data-written-by={writtenBy}>{cost}</span>
                </ItemDescription>
            </ItemContent>
        </Item>
    );
}

/** What every choice ends with: what follows from it, whether it can be changed, and how to ask. */
function Close({ gate }: { readonly gate: string }) {
    const said = words.gates[gate];
    if (said === undefined) return null;
    return (
        <>
            <Sub title={words.consequences}>
                <ul className="flex list-disc flex-col gap-spacing-2xs ps-spacing-4xl">
                    {said.consequences.map((line) => (
                        <li key={line} data-written-by="app">
                            {line}
                        </li>
                    ))}
                </ul>
            </Sub>
            <Sub title={words.undo}>
                <p data-written-by="app">{said.undo}</p>
            </Sub>
            <p className="border-t border-border pt-spacing-lg text-sm text-muted-foreground" data-written-by="app">
                {words.change}
            </p>
        </>
    );
}

/** The opening of a choice: the question it settles. */
function Question({ gate }: { readonly gate: string }) {
    const said = words.gates[gate];
    if (said === undefined) return null;
    return (
        <Sub title={words.question}>
            <p data-written-by="app">{said.question}</p>
        </Sub>
    );
}

/** The option a choice took, in the app's words. */
function PlainOptions({ gate, recommended }: { readonly gate: string; readonly recommended: ReactNode }) {
    const said = words.gates[gate];
    if (said === undefined || said.options.length === 0) return null;
    return (
        <>
            <Sub title={words.options}>
                <div className="flex flex-col">
                    {said.options.map((option, at) => (
                        <OptionRow key={option.name} name={option.name} cost={option.tradeoff} recommended={at === 0} writtenBy="app" />
                    ))}
                </div>
            </Sub>
            <Sub title={words.recommended}>{recommended}</Sub>
        </>
    );
}

/** The architectures considered, the recommended one first, each with what it costs. */
function ArchitectureOptions({ options }: { readonly options: readonly Option[] }) {
    const chosen = options.find((option) => option.chosen);
    return (
        <>
            <Sub title={words.options} lead={words.seeArchitecture}>
                <div className="flex flex-col">
                    {options.map((option) => (
                        <OptionRow key={option.name} name={option.name} cost={option.cost} recommended={option.chosen} writtenBy="agent" />
                    ))}
                </div>
            </Sub>
            {chosen === undefined ? null : (
                <Sub title={words.recommended}>
                    <p className="font-medium" data-written-by="agent">
                        {chosen.name}
                    </p>
                    <p data-written-by="agent">{chosen.idea}</p>
                    {chosen.why === null ? null : <Pair label={words.why}>{chosen.why}</Pair>}
                </Sub>
            )}
        </>
    );
}

/** Each journey with the way recommended for it, why, what it costs, and the other ways considered. */
function JourneyOptions({ view }: { readonly view: ChoicesView["journeys"] }) {
    return (
        <Sub title={words.options}>
            {view.strategies === null ? null : (
                <p className="text-sm text-muted-foreground tabular-nums" title={view.strategies.scope} data-written-by="app">
                    {view.strategies.text}
                </p>
            )}
            {view.rows.length > 15 ? <Filter label={words.journeyFilter} target="journey-ways" /> : null}
            <div id="journey-ways" className="flex flex-col border-t border-border">
                {view.rows.map((row) => (
                    <div key={`${row.title}${row.way}`} data-filter-row>
                        <Fold summary={row.title} writtenBy="agent">
                            <div className="flex flex-col gap-spacing-md">
                                <div className="flex flex-col gap-spacing-2xs">
                                    <p className="flex flex-wrap items-center gap-spacing-xs font-medium">
                                        <span data-written-by="agent">{row.way}</span>
                                        <Badge variant="secondary" data-written-by="agent">
                                            {row.strategy}
                                        </Badge>
                                        <Badge variant="outline" data-written-by="app">
                                            <CircleCheck aria-hidden="true" />
                                            {words.recommended}
                                        </Badge>
                                    </p>
                                    <p data-written-by="agent">{row.idea}</p>
                                    {row.why === null ? null : <Pair label={words.why}>{row.why}</Pair>}
                                    <Pair label={words.cost}>{row.cost}</Pair>
                                </div>
                                {row.others.length === 0 ? null : (
                                    <div className="flex flex-col gap-spacing-xs">
                                        <p className="text-sm font-medium" data-written-by="app">
                                            {words.alsoConsidered}
                                        </p>
                                        {row.others.map((other) => (
                                            <div key={other.name} className="flex flex-col gap-spacing-2xs border-s-2 border-border ps-spacing-lg">
                                                <p className="flex flex-wrap items-center gap-spacing-xs">
                                                    <span className="font-medium" data-written-by="agent">
                                                        {other.name}
                                                    </span>
                                                    <Badge variant="secondary" data-written-by="agent">
                                                        {other.strategy}
                                                    </Badge>
                                                </p>
                                                <p data-written-by="agent">{other.idea}</p>
                                                <Pair label={words.cost}>{other.cost}</Pair>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </Fold>
                    </div>
                ))}
                <NoMatch />
            </div>
        </Sub>
    );
}

/**
 * The four choices.
 * @param props the choices and the address of the Journeys page when it is built
 * @returns the body of the Choices page
 */
export function Choices({ view, journeysHref, architectureHref }: { readonly view: ChoicesView; readonly journeysHref: string | null; readonly architectureHref: string | null }) {
    const body = (gate: string): ReactNode => {
        switch (gate) {
            case "as-is":
                return (
                    <>
                        <Question gate={gate} />
                        <PlainOptions
                            gate={gate}
                            recommended={
                                <>
                                    {view.asIs.journeys === null || view.asIs.steps === null ? null : (
                                        <p data-written-by="app">{words.recommendedAsIs(view.asIs.journeys.text, view.asIs.steps.text)}</p>
                                    )}
                                    {journeysHref === null ? null : (
                                        <p className="text-sm">
                                            <a href={journeysHref} data-written-by="app">
                                                {words.seeJourneys}
                                            </a>
                                        </p>
                                    )}
                                </>
                            }
                        />
                        <SinceFold since={view.asIs.since} />
                    </>
                );
            case "journeys":
                return (
                    <>
                        <Question gate={gate} />
                        <JourneyOptions view={view.journeys} />
                        <SinceFold since={view.journeys.since} />
                    </>
                );
            case "architecture":
                return (
                    <>
                        <Question gate={gate} />
                        <ArchitectureOptions options={view.architecture.options} />
                        {architectureHref === null ? null : (
                            <p className="text-sm">
                                <a href={architectureHref} data-written-by="app">
                                    {copy.architecture.options}
                                </a>
                            </p>
                        )}
                        <SinceFold since={view.architecture.since} />
                    </>
                );
            case "components":
                return (
                    <>
                        <Question gate={gate} />
                        <PlainOptions
                            gate={gate}
                            recommended={
                                <>
                                    {view.components.components === null || view.components.domains === null ? null : (
                                        <p data-written-by="app">{words.recommendedComponents(view.components.components.text, view.components.domains.text)}</p>
                                    )}
                                    {architectureHref === null ? null : (
                                        <p className="text-sm">
                                            <a href={`${architectureHref}#proposed`} data-written-by="app">
                                                {copy.architecture.components}
                                            </a>
                                        </p>
                                    )}
                                </>
                            }
                        />
                        <SinceFold since={view.components.since} />
                    </>
                );
            default:
                return null;
        }
    };
    return (
        <div className="flex flex-col gap-spacing-5xl">
            {view.gates
                .map((gate) => {
                    if (words.gates[gate] === undefined) throw new Error(`the case holds a choice "${gate}" the app has no words for`);
                    return gate;
                })
                .map((gate) => (
                    <div key={gate} id={`choice-${gate}`}>
                        <Section title={words.gates[gate]?.title ?? ""} writtenBy="app">
                            <div className="flex flex-col gap-spacing-xl">
                                {body(gate)}
                                <Close gate={gate} />
                            </div>
                        </Section>
                    </div>
                ))}
        </div>
    );
}
