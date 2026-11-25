// A page's filters as the design system's Select (the story list, the journeys, the risks). The page's native selects stay in it, hidden, as the one place
// the filter script (plan.ts) reads and sets a value; each is shown by a Select drawn beside it, which sets the native
// value and says so with a `change` event, and which reads the value again whenever the script has applied the filters
// (`filters`), so a link, the address and "Clear filters" move it too.

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { FilterSelect } from "../components/FilterSelect";
import { FilterToggle } from "../components/FilterToggle";

const Bound = ({ native }: { readonly native: HTMLSelectElement }) => {
    const [value, setValue] = useState(native.value);
    useEffect(() => {
        const read = () => setValue(native.value);
        addEventListener("filters", read);
        return () => removeEventListener("filters", read);
    }, [native]);
    const options = [...native.options].map((option) => ({ value: option.value, label: option.textContent ?? "" }));
    return (
        <FilterSelect
            id={`${native.id}-select`}
            options={options}
            value={value}
            onChange={(next) => {
                native.value = next;
                setValue(next);
                native.dispatchEvent(new Event("change", { bubbles: true }));
            }}
        />
    );
};

const BoundToggle = ({ native, label }: { readonly native: HTMLInputElement; readonly label: string }) => {
    const [on, setOn] = useState(native.checked);
    useEffect(() => {
        const read = () => setOn(native.checked);
        addEventListener("filters", read);
        native.form?.addEventListener("reset", () => setTimeout(read, 0));
        return () => removeEventListener("filters", read);
    }, [native]);
    return (
        <FilterToggle
            label={label}
            pressed={on}
            onToggle={() => {
                native.checked = !native.checked;
                setOn(native.checked);
                native.dispatchEvent(new Event("change", { bubbles: true }));
            }}
        />
    );
};

const enhance = () => {
    for (const native of document.querySelectorAll<HTMLInputElement>("input[data-filter-toggle]")) {
        if (native.dataset.enhanced !== undefined) continue;
        native.dataset.enhanced = "true";
        const wrap = native.closest<HTMLElement>("[data-filter-toggle-wrap]") ?? native;
        const label = wrap.textContent?.trim() ?? "";
        wrap.hidden = true;
        const mount = document.createElement("div");
        wrap.after(mount);
        createRoot(mount).render(<BoundToggle native={native} label={label} />);
    }
    for (const native of document.querySelectorAll<HTMLSelectElement>("select[data-filter-select]")) {
        if (native.dataset.enhanced !== undefined) continue;
        native.dataset.enhanced = "true";
        const wrap = native.closest<HTMLElement>("[data-filter-select-wrap]") ?? native;
        wrap.hidden = true;
        const mount = document.createElement("div");
        wrap.after(mount);
        createRoot(mount).render(<Bound native={native} />);
    }
};

enhance();
document.addEventListener("astro:page-load", enhance);
