import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@continuum/ui/components/select";

// One of the story list's filters, drawn as the design system's Select. The native select the page ships stays in the
// page, hidden: it is what the filter script reads and what the address fills, and this one only shows its value and sets it
// (src/scripts/plan-selects.tsx).

/** The sentinel for "any": a Select has no empty value, a filter does. */
const ANY = "__any__";

/**
 * A filter's Select.
 * @param props the native select's id and name, its options (the first is "any", with an empty value), the value it holds and what to do on a change
 * @returns the Select
 */
export function PlanSelect({
    id,
    options,
    value,
    onChange,
}: {
    readonly id: string;
    readonly options: readonly { readonly value: string; readonly label: string }[];
    readonly value: string;
    readonly onChange: (value: string) => void;
}) {
    const items = options.map((option) => ({ value: option.value === "" ? ANY : option.value, label: option.label }));
    return (
        <Select items={items} value={value === "" ? ANY : value} onValueChange={(next) => onChange(next === ANY || next === null ? "" : String(next))}>
            <SelectTrigger id={id} size="sm" className="w-full" data-written-by="agent">
                <SelectValue />
            </SelectTrigger>
            <SelectContent alignItemWithTrigger={false}>
                {items.map((item) => (
                    <SelectItem key={item.value} value={item.value} data-written-by="agent">
                        {item.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
