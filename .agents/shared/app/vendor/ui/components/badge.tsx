import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const badgeVariants = cva(
    "group/badge inline-flex h-6 w-fit shrink-0 items-center justify-center gap-spacing-2xs overflow-hidden rounded-control border border-transparent px-spacing-md py-0.5 text-xs font-medium whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-spacing-xs has-data-[icon=inline-start]:pl-spacing-xs aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
    {
        variants: {
            variant: {
                default: "border-border bg-secondary text-secondary-foreground [a]:hover:bg-accent",
                secondary: "border-border bg-muted text-foreground [a]:hover:bg-accent",
                destructive:
                    "border-destructive/25 bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20",
                outline: "border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground",
                ghost: "hover:bg-muted hover:text-muted-foreground dark:hover:bg-muted/50",
                link: "text-foreground underline decoration-primary/60 underline-offset-4 hover:decoration-primary",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    },
);

/**
 * A short label beside what it describes.
 * @param props the variant, an optional element to render as, and span props
 * @returns a span, or the `render` element, styled as the variant
 */
function Badge({
    className,
    variant = "default",
    render,
    ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
    return useRender({
        defaultTagName: "span",
        props: mergeProps<"span">(
            {
                className: cn(badgeVariants({ variant }), className),
            },
            props,
        ),
        render,
        state: {
            slot: "badge",
            variant,
        },
    });
}

export { Badge, badgeVariants };
