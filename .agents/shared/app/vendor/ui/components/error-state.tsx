import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";

/**
 * What a list or page shows when its content cannot be shown: an icon, what went wrong, and a message in the person's
 * language saying how to try again. It is announced to a screen reader when it appears.
 * `compact` is for a section of a page that shares it with others: the same parts in one row, not a page's worth of space.
 * @param props the title, the message, whether it is compact and, when a way out exists, the control that takes it as children
 * @returns an alert holding an icon, the title and the message, then the control when given
 */
function ErrorState({
    title,
    message,
    compact = false,
    children,
}: {
    readonly title: string;
    readonly message: string;
    readonly compact?: boolean;
    readonly children?: ReactNode;
}) {
    if (compact) {
        return (
            <div role="alert" className="flex items-center gap-spacing-md">
                <CircleAlert aria-hidden="true" className="size-5 shrink-0 text-destructive" />
                <div className="flex flex-col">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{message}</p>
                </div>
                {children === undefined ? null : <div className="ms-auto">{children}</div>}
            </div>
        );
    }
    return (
        <Empty role="alert">
            <EmptyHeader>
                <EmptyMedia variant="icon-destructive">
                    <CircleAlert />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{message}</EmptyDescription>
            </EmptyHeader>
            {children === undefined ? null : <EmptyContent>{children}</EmptyContent>}
        </Empty>
    );
}

export { ErrorState };
