import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@continuum/ui/components/table";

// A dense diagram as a table: one row per box that reaches others, one column per box reached, and in each cell the
// case's words for how. Full names, wrapped; the table scrolls inside its frame. No script.

/**
 * The matrix.
 * @param props the columns and rows, and the words of the corner cell
 * @returns the table
 */
export function DiagramMatrix({
    matrix,
    corner,
}: {
    readonly matrix: { readonly columns: readonly string[]; readonly rows: readonly { readonly label: string; readonly cells: readonly string[] }[] };
    readonly corner: string;
}) {
    return (
        <Table className="text-(length:--diagram-text)">
            <TableHeader>
                <TableRow>
                    <TableHead className="sticky start-0 z-10 bg-background text-muted-foreground" data-written-by="app">
                        {corner}
                    </TableHead>
                    {matrix.columns.map((column, at) => (
                        <TableHead key={`${String(at)}${column}`} scope="col" className="h-auto min-w-28 py-spacing-xs align-bottom whitespace-normal" data-written-by="agent">
                            {column}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {matrix.rows.map((row, at) => (
                    <TableRow key={`${String(at)}${row.label}`}>
                        <TableHead scope="row" className="sticky start-0 z-10 h-auto min-w-40 bg-background py-spacing-xs whitespace-normal" data-written-by="agent">
                            {row.label}
                        </TableHead>
                        {row.cells.map((cell, column) => (
                            <TableCell key={String(column)} className="align-top whitespace-normal" data-written-by="agent">
                                {cell === "" ? <span className="text-muted-foreground" aria-hidden="true">·</span> : cell}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
}
