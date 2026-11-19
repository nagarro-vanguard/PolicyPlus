import { CircleAlert, CircleCheck, LoaderCircle } from "lucide-react";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "cn";
import { Input } from "./input";
import { Label } from "./label";

/** What a field says about a check the person waits on, as an icon and its own words. */
type FieldStatus = { readonly state: "checking" | "available"; readonly text: string };

const statusIcons = { checking: LoaderCircle, available: CircleCheck } as const;

type FieldProps = Omit<ComponentProps<typeof Input>, "id" | "aria-invalid" | "aria-describedby"> & {
    readonly label: ReactNode;
    readonly hint?: ReactNode;
    readonly error?: ReactNode;
    readonly status?: FieldStatus | undefined;
};

/**
 * A labelled input with its hint, its error and its status, in the order a form shows them: the label above, then the
 * input, the error, the status and the hint. The label names the input; the error, the status and the hint describe it,
 * so a screen reader reads them with it. The error is announced at once when it appears; the status is announced
 * politely, and its place exists before it has anything to say.
 * @param props the label and the input's own props, with the hint, error and status when there are any
 * @param props.label what the field is, in the person's words
 * @param props.hint one line that helps before a mistake is made
 * @param props.error why the value was refused, in words; its presence marks the input invalid
 * @param props.status a check the person waits on, and its result
 * @returns the label, the input and the lines under it
 */
function Field({ label, hint, error, status, className, disabled, ...input }: FieldProps) {
    const id = useId();
    const errorId = `${id}-error`;
    const statusId = `${id}-status`;
    const hintId = `${id}-hint`;
    const describedBy = [
        error === undefined ? "" : errorId,
        status === undefined ? "" : statusId,
        hint === undefined ? "" : hintId,
    ]
        .filter((each) => each !== "")
        .join(" ");
    const StatusIcon = status === undefined ? undefined : statusIcons[status.state];
    return (
        <div
            data-slot="field"
            data-disabled={disabled === true ? "true" : undefined}
            className={cn("group flex w-full flex-col [&_input:read-only]:bg-muted/50", className)}
        >
            <Label htmlFor={id} className="mb-spacing-xs">
                {label}
            </Label>
            <Input
                {...input}
                id={id}
                disabled={disabled}
                aria-invalid={error === undefined ? undefined : true}
                aria-describedby={describedBy}
            />
            {error === undefined ? null : (
                <p
                    id={errorId}
                    role="alert"
                    data-slot="field-error"
                    className="mt-spacing-xs flex items-start gap-spacing-xs text-sm text-destructive"
                >
                    <CircleAlert aria-hidden="true" className="mt-spacing-3xs size-4 shrink-0" />
                    {error}
                </p>
            )}
            <div id={statusId} role="status" data-slot="field-status">
                {status === undefined || StatusIcon === undefined ? null : (
                    <p className="mt-spacing-xs flex items-start gap-spacing-xs text-sm text-muted-foreground">
                        <StatusIcon aria-hidden="true" className="mt-spacing-3xs size-4 shrink-0" />
                        {status.text}
                    </p>
                )}
            </div>
            {hint === undefined ? null : (
                <p
                    id={hintId}
                    data-slot="field-hint"
                    className="mt-spacing-xs text-xs font-medium text-muted-foreground"
                >
                    {hint}
                </p>
            )}
        </div>
    );
}

export { Field };
export type { FieldStatus };
