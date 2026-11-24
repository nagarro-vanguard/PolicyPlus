// The story list's filters as the design system's Select. The page's native selects stay in it, hidden, as the one place
// the filter script (plan.ts) reads and sets a value; each is shown by a Select drawn beside it, which sets the native
// value and says so with a `change` event, and which reads the value again whenever the script has applied the filters
// (`plan:filters`), so a link, the address and "Clear filters" move it too.

import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { PlanSelect } from "../components/plan/PlanSelect";

const Bound = ({ native }: { readonly native: HTMLSelectElement }) => {
    const [value, setValue] = useState(native.value);
    useEffect(() => {
        const read = () => setValue(native.value);
        addEventListener("plan:filters", read);
        return () => removeEventListener("plan:filters", read);
    }, [native]);
    const options = [...native.options].map((option) => ({ value: option.value, label: option.textContent ?? "" }));
    return (
        <PlanSelect
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

const enhance = () => {
    for (const native of document.querySelectorAll<HTMLSelectElement>("select[data-plan-select]")) {
        if (native.dataset.enhanced !== undefined) continue;
        native.dataset.enhanced = "true";
        const wrap = native.closest<HTMLElement>("[data-plan-select-wrap]") ?? native;
        wrap.hidden = true;
        const mount = document.createElement("div");
        wrap.after(mount);
        createRoot(mount).render(<Bound native={native} />);
    }
};

enhance();
document.addEventListener("astro:page-load", enhance);
