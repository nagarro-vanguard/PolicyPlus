import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

function Empty({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="empty"
            className={cn(
                "flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-surface border-dashed p-10 text-center text-balance",
                className,
            )}
            {...props}
        />
    );
}

function EmptyHeader({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="empty-header"
            className={cn("flex max-w-sm flex-col items-center gap-spacing-lg", className)}
            {...props}
        />
    );
}

const iconChip =
    "flex size-12 shrink-0 items-center justify-center rounded-surface [&_svg:not([class*='size-'])]:size-5";

const emptyMediaVariants = cva(
    "mb-spacing-md flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
    {
        variants: {
            variant: {
                default: "bg-transparent",
                icon: `${iconChip} bg-secondary text-foreground`,
                "icon-primary": `${iconChip} bg-primary/10 text-primary`,
                "icon-destructive": `${iconChip} bg-destructive/10 text-destructive`,
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

function EmptyMedia({
    className,
    variant = "default",
    ...props
}: React.ComponentProps<"div"> & VariantProps<typeof emptyMediaVariants>) {
    return (
        <div
            data-slot="empty-icon"
            data-variant={variant}
            className={cn(emptyMediaVariants({ variant, className }))}
            {...props}
        />
    );
}

function EmptyTitle({ className, ...props }: React.ComponentProps<"div">) {
    return <div data-slot="empty-title" className={cn("text-lg font-semibold tracking-tight", className)} {...props} />;
}

function EmptyDescription({ className, ...props }: React.ComponentProps<"p">) {
    return (
        <div
            data-slot="empty-description"
            className={cn(
                "text-base/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-foreground",
                className,
            )}
            {...props}
        />
    );
}

function EmptyContent({ className, ...props }: React.ComponentProps<"div">) {
    return (
        <div
            data-slot="empty-content"
            className={cn(
                "flex w-full max-w-sm min-w-0 flex-col items-center gap-spacing-md text-sm text-balance",
                className,
            )}
            {...props}
        />
    );
}

export { Empty, EmptyHeader, EmptyTitle, EmptyDescription, EmptyContent, EmptyMedia };
