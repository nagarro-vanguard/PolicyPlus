/** @jsxRuntime classic @jsx jsx @jsxFrag Fragment */

import { jsx } from "../jsx";
import { StatusBadge } from "./status.tsx";

/**
 * The mark of a finding new since the page was last made (P4e.19), in a word, never colour alone.
 * @returns the mark
 */
export const NewMarker = () => <StatusBadge status="info" label="new" />;

/**
 * The words a page uses for how sure it is, each with what it means, defined once on the page (P4e.7, P4e.10).
 * @param props the key
 * @param props.title the key's heading
 * @param props.items each word and its meaning
 * @returns the key
 */
export const WordKey = ({
    title,
    items,
}: {
    title: string;
    items: readonly { readonly word: string; readonly meaning: string }[];
}) => (
    <section class="word-key" aria-label={title}>
        <h3>{title}</h3>
        <dl>
            {items.map((item) => (
                <div>
                    <dt>{item.word}</dt>
                    <dd>{item.meaning}</dd>
                </div>
            ))}
        </dl>
    </section>
);
