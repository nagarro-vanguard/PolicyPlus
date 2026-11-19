import { Table, TableBody, TableCaption, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@continuum/ui/components/table";
import type { MatrixView } from "../../case/plan-view";
import { copy } from "../../lib/copy";
import { Fold } from "../Fold";

// The journey by domain matrix on the design system's table: a row per chosen journey, a column per domain, each cell
// the number of stories that build that journey's steps in that domain. A cell is a link that lists those stories
// below (`#cell=<row>.<column>`), a column heading one that lists the domain's stories (`#domain=<n>`); the page's
// script marks the one chosen with aria-current. The steps column and row say how much each journey and domain holds.
// The table scrolls inside its own region on a narrow screen, with the journey names kept in view, and says so; the
// text version below it lists every cell.

const cellLink =
    "inline-flex min-w-8 items-center justify-center rounded-control px-spacing-xs py-spacing-2xs tabular-nums underline decoration-border underline-offset-4 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=true]:bg-foreground aria-[current=true]:text-background aria-[current=true]:no-underline";

/**
 * The matrix.
 * @param props the matrix's view
 * @returns the table, its caption and its text version
 */
export function Matrix({ view }: { readonly view: MatrixView }) {
    const words = copy.plan;
    return (
        <div className="flex flex-col gap-spacing-md" data-plan-matrix>
            <p className="text-sm text-muted-foreground" data-written-by="app">
                {words.matrixLede} {words.matrixColumn}
            </p>
            <p className="text-sm text-muted-foreground" data-written-by="app">
                {words.matrixLegend} {words.matrixScroll}
            </p>
            <div className="rounded-surface border border-border" role="region" aria-label={words.matrixTitle}>
                <Table className="border-separate border-spacing-0">
                    <TableCaption className="sr-only" data-written-by="app">
                        {words.matrixTitle}
                    </TableCaption>
                    <TableHeader>
                        <TableRow>
                            <TableHead scope="col" className="sticky start-0 z-10 bg-background" data-written-by="app">
                                {words.journey}
                            </TableHead>
                            {view.domains.map((domain) => (
                                <TableHead key={domain.name} scope="col" className="min-w-24 whitespace-normal text-center align-bottom">
                                    {domain.index < 0 ? (
                                        <span data-written-by="app">{domain.name}</span>
                                    ) : (
                                        <a href={`#domain=${domain.index}`} className={cellLink} data-matrix-column={domain.index} data-written-by="agent">
                                            {domain.name}
                                        </a>
                                    )}
                                </TableHead>
                            ))}
                            <TableHead scope="col" numeric data-written-by="app">
                                {words.steps}
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {view.rows.map((row) => (
                            <TableRow key={row.name}>
                                <TableHead scope="row" className="sticky start-0 z-10 max-w-64 min-w-40 bg-background font-normal whitespace-normal" data-written-by="agent">
                                    {row.name}
                                </TableHead>
                                {row.cells.map((cell, at) => (
                                    <TableCell key={view.domains[at]?.name ?? String(at)} className="text-center">
                                        {cell === null ? (
                                            <span className="text-muted-foreground" aria-label={words.noStep} title={words.noStep}>
                                                ·
                                            </span>
                                        ) : (
                                            <a href={`#cell=${cell.id}`} className={cellLink} aria-label={cell.label} data-matrix-cell={cell.id} data-stories={cell.stories.join(" ")}>
                                                {cell.stories.length}
                                            </a>
                                        )}
                                    </TableCell>
                                ))}
                                <TableCell numeric className="text-muted-foreground">
                                    {row.steps}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                    <TableFooter>
                        <TableRow>
                            <TableHead scope="row" className="sticky start-0 z-10 bg-muted" data-written-by="app">
                                {words.steps}
                            </TableHead>
                            {view.columnSteps.map((steps, at) => (
                                <TableCell key={view.domains[at]?.name ?? String(at)} className="text-center tabular-nums text-muted-foreground">
                                    {steps}
                                </TableCell>
                            ))}
                            <TableCell numeric>{view.total}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </div>
            <Fold summary={words.matrixText}>
                <ul className="flex list-disc flex-col gap-spacing-2xs ps-spacing-4xl text-sm">
                    {view.lines.map((line) => (
                        <li key={line} data-written-by="agent">
                            {line}
                        </li>
                    ))}
                </ul>
            </Fold>
        </div>
    );
}
