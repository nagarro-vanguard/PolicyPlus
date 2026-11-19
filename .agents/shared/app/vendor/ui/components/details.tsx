import type { ReactNode } from "react";

/**
 * The sections of a page, stacked with the one gap that sets them apart: wider than the gap inside a section, so a
 * heading belongs to what is under it and not to what is over it. A screen never picks this gap itself.
 * @param props the sections
 * @returns the stack
 */
function Sections({ children }: { readonly children: ReactNode }) {
    return <div className="flex flex-col gap-spacing-5xl">{children}</div>;
}

/**
 * One section of a page: a heading with a thin rule under it, and an action at the end of the heading line when the
 * section has one. Sections stack on a page in `Sections`; none is a card.
 * @param props the heading, the action and the section's content
 * @returns the labelled section
 */
function DetailsSection({
    title,
    action,
    children,
}: {
    readonly title: string;
    readonly action?: ReactNode;
    readonly children: ReactNode;
}) {
    return (
        <section aria-label={title} className="flex flex-col gap-spacing-lg">
            <div className="flex min-h-9 items-center justify-between gap-spacing-md border-b pb-spacing-s">
                <h2 className="text-base font-medium">{title}</h2>
                {action}
            </div>
            {children}
        </section>
    );
}

/**
 * The facts of a section as a list of labels and values; each fact is a `Detail`.
 * @param props the facts
 * @returns a description list
 */
function DetailList({ children }: { readonly children: ReactNode }) {
    return <dl className="grid grid-cols-4 items-center gap-y-spacing-s">{children}</dl>;
}

/**
 * One fact: a quiet label and its value, which keeps the size of the page's text.
 * @param props the label and the value
 * @returns the label and value pair
 */
function Detail({ label, children }: { readonly label: string; readonly children: ReactNode }) {
    return (
        <>
            <dt className="text-sm text-muted-foreground">{label}</dt>
            <dd className="col-span-3">{children}</dd>
        </>
    );
}

export { Detail, DetailList, DetailsSection, Sections };
