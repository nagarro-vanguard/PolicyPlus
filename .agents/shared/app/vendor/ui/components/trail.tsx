import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import type { ReactNode } from "react";

/**
 * The trail across the top of a page, from the whole system down to the place being read.
 * @param props the steps in order, the whole system first and the current place last
 * @returns a nav element around an ordered list of steps
 */
function Trail({ children }: { readonly children: ReactNode }) {
    return (
        <nav aria-label="Trail">
            <ol className="flex flex-wrap items-center gap-x-spacing-xs text-sm text-muted-foreground">{children}</ol>
        </nav>
    );
}

/**
 * A step a person can step back up to.
 * @param props the step's name as children, an optional element to render as (a router link), whether the separator
 * follows it (true unless a link is the last step), and anchor props
 * @returns a list item holding the link and, unless left out, the separator that follows it
 */
function TrailStep({
    render,
    separator = true,
    ...props
}: useRender.ComponentProps<"a"> & { readonly separator?: boolean }) {
    const step = useRender({
        defaultTagName: "a",
        props: mergeProps<"a">({ className: "hover:text-foreground" }, props),
        render,
        state: { slot: "trail-step" },
    });
    return (
        <li className="flex items-center gap-x-spacing-xs">
            {step}
            {separator ? <span aria-hidden="true">/</span> : null}
        </li>
    );
}

/**
 * The last step, which marks the current place and is not a link.
 * @param props the place's name
 * @returns a list item holding the marked name
 */
function TrailCurrent({ children }: { readonly children: string }) {
    return (
        <li>
            <span aria-current="page" className="font-medium text-foreground">
                {children}
            </span>
        </li>
    );
}

export { Trail, TrailCurrent, TrailStep };
