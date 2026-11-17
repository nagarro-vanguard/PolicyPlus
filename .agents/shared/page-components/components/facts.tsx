/** @jsxRuntime classic @jsx jsx */

import { jsx, type Child } from "../jsx";
import { counted } from "../words";
import { NewMarker } from "./account.tsx";
import { CopyButton } from "./code.tsx";
import { Disclosure } from "./data.tsx";
import { StatusBadge, type Status } from "./status.tsx";

export type Mark = { readonly status: Status; readonly label: string };

/**
 * One piece of information as a card (P4f): open, the statement in plain words, how sure it is, a risk's mark, and
 * where it comes from; folded, what the code shows, one plain line per piece of evidence, and the context an engineer
 * or a coding agent copies (P4e, D166). An assumption that is a decision leads with what is to be decided (A14).
 * @param props the card
 * @param props.id its anchor, so a register's row and a topic can link to it
 * @param props.subject what it is about, as the reader names it, such as "Foundation web API › How work enters"
 * @param props.statement what is true, in plain words
 * @param props.standing how sure it is, in the system's terms, such as "shown by the code" or "assumed"
 * @param props.risk its risk's mark, when it is a risk
 * @param props.from where it comes from, in plain words, such as "the web API's webhook handling (2 places)"
 * @param props.decides what is to be decided, when it is an assumption that is a decision
 * @param props.shows what the code shows, one plain line per piece of evidence
 * @param props.context the context to copy, as text
 * @param props.isNew whether it is new since the person last looked (P4e.19)
 * @returns the card
 */
export const FactCard = (props: {
    id: string;
    subject: string;
    statement: string;
    standing: Mark;
    risk?: Mark;
    from: string;
    decides?: string;
    shows: readonly string[];
    context: string;
    isNew: boolean;
}) => {
    return (
        <article class="card fact" id={props.id} aria-labelledby={`${props.id}-subject`}>
            <div class="card-head">
                <p class="meta" id={`${props.id}-subject`}>
                    {props.subject}
                </p>
                <span class="card-marks">
                    <StatusBadge status={props.standing.status} label={props.standing.label} />
                    {props.isNew && <NewMarker />}
                </span>
            </div>
            {props.decides !== undefined && (
                <p class="decides">
                    <strong>To decide: </strong>
                    {props.decides}
                </p>
            )}
            <p class="statement">{props.statement}</p>
            {props.risk !== undefined && (
                <p>
                    <StatusBadge status={props.risk.status} label={props.risk.label} />
                </p>
            )}
            <p class="meta">{`Where this comes from: ${props.from}`}</p>
            <Disclosure title={props.shows.length ? "What the code shows" : "The context to copy"}>
                {props.shows.length > 0 && (
                    <ul class="evidence">
                        {props.shows.map((line) => (
                            <li>{line}</li>
                        ))}
                    </ul>
                )}
                <CopyButton text={props.context} label="Copy context" />
            </Disclosure>
        </article>
    );
};

/**
 * One question about one subject (P4f): its answer open, the one card answering it, or how it stands when no card
 * does (answered in parts, unanswered); the cards beneath it folded under it.
 * @param props the topic
 * @param props.id its anchor
 * @param props.question the reader's question
 * @param props.answer the card answering it, when one does
 * @param props.state how it stands when no card answers it
 * @param props.facts the cards it rests on
 * @returns the topic
 */
export const TopicBlock = (props: {
    id: string;
    question: string;
    answer?: Child;
    state?: Mark;
    facts: readonly Child[];
}) => (
    <section class="topic" id={props.id} aria-labelledby={`${props.id}-question`}>
        <h3 id={`${props.id}-question`}>{props.question}</h3>
        {props.answer}
        {props.state !== undefined && (
            <p>
                <StatusBadge status={props.state.status} label={props.state.label} />
            </p>
        )}
        {props.facts.length > 0 && (
            <Disclosure title={`In detail: ${counted(props.facts.length, "fact", "facts")}`}>{props.facts}</Disclosure>
        )}
    </section>
);

/**
 * One line of a register (P4e): the statement, linking to its card, where it sits, and its marks.
 * @param props the row
 * @param props.href the card it opens
 * @param props.text the statement, in plain words
 * @param props.where what it is about, as the reader names it
 * @param props.marks its marks, such as its severity and how sure it is
 * @param props.detail what the reader needs beside the statement to act on it, such as what would confirm an
 *  assumption and what changes if it is wrong; left out when the statement says enough
 * @param props.context the finding's context for an engineer or a coding agent, copied by its button
 * @returns the row, a list item of a register's list
 */
export const RegisterRow = (props: {
    href: string;
    text: string;
    where: string;
    marks: readonly Mark[];
    detail?: string;
    context?: string;
}) => (
    <li class="register-row">
        <a href={props.href}>{props.text}</a>
        <span class="meta">{props.where}</span>
        <span class="card-marks">
            {props.marks.map((mark) => (
                <StatusBadge status={mark.status} label={mark.label} />
            ))}
        </span>
        {props.context !== undefined && <CopyButton text={props.context} label="Copy context" />}
        {props.detail !== undefined && <p class="register-detail">{props.detail}</p>}
    </li>
);
