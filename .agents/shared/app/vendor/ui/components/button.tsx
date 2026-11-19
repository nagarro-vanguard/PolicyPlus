import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const buttonVariants = cva(
    "group/button inline-flex shrink-0 items-center justify-center rounded-control border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground shadow-(--shadow-highlight) hover:bg-primary/90 active:bg-primary/80",
                outline:
                    "border-border bg-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground",
                secondary:
                    "border-border bg-secondary text-secondary-foreground hover:bg-accent active:bg-accent/80 aria-expanded:bg-accent aria-expanded:text-accent-foreground",
                ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
                destructive:
                    "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/10 dark:hover:bg-destructive/20 dark:focus-visible:ring-destructive/40",
                link: "text-foreground underline decoration-primary/60 underline-offset-4 hover:decoration-primary",
            },
            size: {
                default:
                    "h-8 gap-spacing-xs px-spacing-md has-data-[icon=inline-end]:pr-spacing-xs has-data-[icon=inline-start]:pl-spacing-xs",
                xs: "h-6 gap-spacing-2xs rounded-control px-spacing-md text-xs has-data-[icon=inline-end]:pr-spacing-xs has-data-[icon=inline-start]:pl-spacing-xs [&_svg:not([class*='size-'])]:size-3",
                sm: "h-7 gap-spacing-2xs rounded-control px-spacing-md text-sm has-data-[icon=inline-end]:pr-spacing-xs has-data-[icon=inline-start]:pl-spacing-xs [&_svg:not([class*='size-'])]:size-3.5",
                lg: "h-9 gap-spacing-xs px-spacing-md has-data-[icon=inline-end]:pr-spacing-xs has-data-[icon=inline-start]:pl-spacing-xs",
                xl: "h-11 gap-spacing-md px-spacing-5xl text-base has-data-[icon=inline-end]:pr-spacing-4xl has-data-[icon=inline-start]:pl-spacing-4xl [&_svg:not([class*='size-'])]:size-5",
                icon: "size-8",
                "icon-xs": "size-6 rounded-control [&_svg:not([class*='size-'])]:size-3",
                "icon-sm": "size-7 rounded-control",
                "icon-lg": "size-9",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

/**
 * Something a person presses to act.
 * @param props the variant, size and button props
 * @returns a button, or the `render` element, styled by variant and size
 */
function Button({
    className,
    variant = "default",
    size = "default",
    ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
    return (
        <ButtonPrimitive data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />
    );
}

export { Button, buttonVariants };
