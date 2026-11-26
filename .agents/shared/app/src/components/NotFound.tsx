import { Button } from "@continuum/ui/components/button";
import { Search } from "lucide-react";
import type { NodeView } from "../case/view";
import { copy } from "../lib/copy";
import { Section } from "./Explorer";
import { Rows } from "./Rows";

// The body of an address that leads to no page: a search button and the top of the hierarchy, never a dead end. The
// page's script sends an old address of an action or a rule on to the page that now holds it (`data-not-found`).

/**
 * The page's body.
 * @param props the overview's view
 * @returns the body
 */
export function NotFound({ view }: { readonly view: NodeView }) {
    return (
        <div className="flex flex-col gap-spacing-5xl" data-not-found>
            <p>
                <Button variant="outline" size="sm" data-palette-open>
                    <Search aria-hidden="true" />
                    <span data-written-by="app">{copy.site.searchOpen}</span>
                </Button>
            </p>
            <Section title={view.children.heading} writtenBy="agent">
                <Rows rows={view.children.rows} root="./" />
            </Section>
        </div>
    );
}
