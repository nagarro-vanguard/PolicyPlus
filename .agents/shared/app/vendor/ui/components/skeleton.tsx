import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

const skeletonVariants = cva("animate-pulse bg-secondary", {
    variants: {
        shape: {
            block: "rounded-control",
            pill: "rounded-full",
        },
    },
    defaultVariants: {
        shape: "block",
    },
});

function Skeleton({ className, shape, ...props }: React.ComponentProps<"div"> & VariantProps<typeof skeletonVariants>) {
    return <div data-slot="skeleton" className={cn(skeletonVariants({ shape, className }))} {...props} />;
}

export { Skeleton };
