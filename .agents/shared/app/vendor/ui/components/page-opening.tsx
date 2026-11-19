/** A page lists its sections only from this many, so a short page opens without a list. */
const minSectionsListed = 4;

/**
 * How a page opens: an optional label, the title, an optional one-line summary, and, on a page of four or more
 * sections, the list of them. What a page does not give takes no space.
 * @param props the title, and the label, summary line and section names when the page gives them, in the page's order
 * @returns a block holding what the page gave
 */
function PageOpening({
    label,
    title,
    summary,
    sections = [],
}: {
    readonly label?: string | undefined;
    readonly title: string;
    readonly summary?: string | undefined;
    readonly sections?: readonly string[] | undefined;
}) {
    return (
        <div className="flex flex-col gap-spacing-xs">
            {label === undefined ? null : <p className="text-sm font-medium text-muted-foreground">{label}</p>}
            <h1 className="text-2xl leading-8 font-semibold">{title}</h1>
            {summary === undefined ? null : <p className="text-base leading-6.5 text-muted-foreground">{summary}</p>}
            {sections.length < minSectionsListed ? null : (
                <ul aria-label="Sections" className="flex flex-wrap gap-x-spacing-md gap-y-spacing-3xs text-sm">
                    {sections.map((section) => (
                        <li key={section}>{section}</li>
                    ))}
                </ul>
            )}
        </div>
    );
}

export { PageOpening };
