import { Inbox } from "lucide-react";
import type { ReactNode } from "react";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "./empty";

/**
 * What a list shows when it has nothing to show: an icon, what is missing, and a message saying why and what to do next.
 * It is not an error: nothing went wrong.
 * `compact` is for a section of a page that shares it with others: the same parts in one row, not a page's worth of space.
 * @param props the title, the message, whether it is compact and, when a next step exists, the control that takes it as children
 * @returns an icon, the title and the message, then the control when given
 */
function NoDataState({
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
            <div className="flex items-center gap-spacing-md">
                <Inbox aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" />
                <div className="flex flex-col">
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-sm text-muted-foreground">{message}</p>
                </div>
                {children === undefined ? null : <div className="ms-auto">{children}</div>}
            </div>
        );
    }
    return (
        <Empty>
            <EmptyHeader>
                <EmptyMedia variant="icon-primary">
                    <Inbox />
                </EmptyMedia>
                <EmptyTitle>{title}</EmptyTitle>
                <EmptyDescription>{message}</EmptyDescription>
            </EmptyHeader>
            {children === undefined ? null : <EmptyContent>{children}</EmptyContent>}
        </Empty>
    );
}

export { NoDataState };
