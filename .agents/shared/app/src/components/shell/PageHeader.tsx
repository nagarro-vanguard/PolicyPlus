import { PageOpening } from "@continuum/ui/components/page-opening";
import { Textarea } from "@continuum/ui/components/textarea";
import type { CountView } from "../../case/format";
import { copy } from "../../lib/copy";
import { ContextCopy } from "../ContextCopy";
import { Facts } from "../Explorer";

// How every page opens, the same on every kind of page: what kind of thing it is (when the page is one of many), the
// title and one sentence, and the page's actions at the top right (the copy of the context, with its size).
// Under them, the page's few facts. On a narrow screen the actions go under the title.

export type PageContext = {
    /** The text's file, from the page. */
    file: string;
    kilobytes: number;
    /** The command that writes a fuller text, when there is one. */
    fuller?: string | null;
};

/**
 * The header.
 * @param props the label, title and sentence, who wrote them, the copy of the context, and the facts under them
 * @returns the header block
 */
export function PageHeader({
    label,
    title,
    summary,
    writtenBy,
    context,
    facts,
}: {
    readonly label?: string | undefined;
    readonly title: string;
    readonly summary?: string | undefined;
    readonly writtenBy: "agent" | "app";
    readonly context?: PageContext | null | undefined;
    readonly facts?: { readonly facts: readonly CountView[]; readonly tests: CountView | null } | undefined;
}) {
    return (
        <div className="flex flex-col gap-spacing-md" data-page-header data-context-scope>
            <div className="flex flex-wrap items-start gap-x-spacing-xl gap-y-spacing-md">
                <div className="min-w-0 flex-1 basis-80" data-written-by={writtenBy}>
                    <PageOpening label={label} title={title} summary={summary} />
                </div>
                {context === null || context === undefined ? null : (
                    <div className="flex shrink-0 flex-col items-start gap-spacing-2xs" data-for-context>
                        <ContextCopy file={context.file} kilobytes={context.kilobytes} />
                    </div>
                )}
            </div>
            {facts === undefined ? null : <Facts facts={facts.facts.slice(0, facts.tests === null ? 3 : 2)} tests={facts.tests} />}
            {context === null || context === undefined ? null : (
                <div className="flex flex-col gap-spacing-xs" data-for-context>
                    {context.fuller === null || context.fuller === undefined ? null : (
                        <p className="text-xs text-muted-foreground" data-written-by="app">
                            {copy.explorer.fullerText} <code className="wrap-anywhere">{context.fuller}</code>
                        </p>
                    )}
                    <Textarea className="font-mono text-xs" readOnly hidden aria-label={copy.explorer.forContext} data-context-fallback rows={8} />
                </div>
            )}
        </div>
    );
}
