import { useEffect, useId, useState } from "react";
import { describeEntry, editChange, loadEntries, moveChange, renameChange, reviseBody, send, splitChange } from "../lib/plan-edit";
import type { Change } from "../lib/plan-edit";

type Entry = { revision: Change; at: string; note: string };
type Props = {
    storyKey: string;
    title: string;
    what: string;
    why: string;
    criteria: string[];
    actions: { id: string; purpose: string }[];
    targets: { key: string; title: string }[];
    titles: Record<string, string>;
    locked: boolean;
    editUrl: string;
};
type Said = { accepted: boolean; text: string; gaps: string[] } | undefined;

/**
 * The panel that edits one story through the plan skill's local editing server. It shows nothing but a hint when the server
 * does not answer, and a note when the story's work item already exists. Every change is sent to the server, which checks
 * it against every gate of the plan.
 * @param props the story, what may move, and where the server is
 * @returns the panel
 */
export default function PlanEdit(props: Props) {
    const { storyKey, criteria, actions, targets, titles, locked, editUrl } = props;
    const id = useId();
    const [entries, setEntries] = useState<Entry[] | undefined | null>(null);
    const [said, setSaid] = useState<Said>();
    const [title, setTitle] = useState(props.title);
    const [what, setWhat] = useState(props.what);
    const [why, setWhy] = useState(props.why);
    const [number, setNumber] = useState(1);
    const [criterion, setCriterion] = useState(criteria[0] ?? "");
    const [ticked, setTicked] = useState<number[]>([]);
    const [splitTitle, setSplitTitle] = useState("");
    const [action, setAction] = useState(actions[0]?.id ?? "");
    const [target, setTarget] = useState(targets[0]?.key ?? "");
    const [note, setNote] = useState("");
    const refresh = () => loadEntries(editUrl).then(setEntries);
    useEffect(() => {
        if (!locked) void refresh();
    }, []);
    if (locked) return <p className="note">Already created: not editable here.</p>;
    if (entries === null) return null;
    if (entries === undefined) return <p className="note">To edit this plan, start the editing server.</p>;
    const run = async (change: Change | undefined) => {
        if (change === undefined) return setSaid({ accepted: false, text: "Fill in the form first.", gaps: [] });
        setSaid(await send(editUrl, "/api/revise", reviseBody(change, note)));
        void refresh();
    };
    const plain = async (path: "/api/undo" | "/api/revert") => {
        setSaid(await send(editUrl, path));
        void refresh();
    };
    const label = (name: string) => `${id}-${name}`;
    return (
        <section className="edit-panel" aria-label="Edit this story" data-story={storyKey}>
            <h2>Edit this story</h2>
            <p className="note">Each change is checked against the whole plan before it is accepted. Order cannot be edited.</p>
            <form onSubmit={(e) => { e.preventDefault(); void run(renameChange(storyKey, title)); }}>
                <label htmlFor={label("title")}>Title</label>
                <input id={label("title")} value={title} onChange={(e) => setTitle(e.target.value)} />
                <button type="submit">Rename</button>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); void run(editChange(storyKey, "what", what)); }}>
                <label htmlFor={label("what")}>What it delivers</label>
                <textarea id={label("what")} value={what} onChange={(e) => setWhat(e.target.value)} rows={2} />
                <button type="submit">Save what</button>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); void run(editChange(storyKey, "why", why)); }}>
                <label htmlFor={label("why")}>Why</label>
                <textarea id={label("why")} value={why} onChange={(e) => setWhy(e.target.value)} rows={2} />
                <button type="submit">Save why</button>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); void run(editChange(storyKey, "criterion", criterion, number, criteria.length)); }}>
                <label htmlFor={label("number")}>Criterion number</label>
                <select id={label("number")} value={number} onChange={(e) => { const n = Number(e.target.value); setNumber(n); setCriterion(criteria[n - 1] ?? ""); }}>
                    {criteria.map((_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                </select>
                <label htmlFor={label("criterion")}>Criterion text</label>
                <textarea id={label("criterion")} value={criterion} onChange={(e) => setCriterion(e.target.value)} rows={3} />
                <button type="submit">Save criterion</button>
            </form>
            <form onSubmit={(e) => { e.preventDefault(); void run(splitChange(storyKey, ticked, splitTitle, criteria.length)); }}>
                <fieldset>
                    <legend>Split: criteria that move to a new story</legend>
                    {criteria.map((text, i) => (
                        <div key={i}><label><input type="checkbox" checked={ticked.includes(i + 1)} onChange={(e) => setTicked(e.target.checked ? [...ticked, i + 1] : ticked.filter((n) => n !== i + 1))} /> {i + 1}. {text}</label></div>
                    ))}
                </fieldset>
                <label htmlFor={label("split")}>Title of the new story</label>
                <input id={label("split")} value={splitTitle} onChange={(e) => setSplitTitle(e.target.value)} />
                <button type="submit">Split</button>
            </form>
            {actions.length > 0 && targets.length > 0 && (
                <form onSubmit={(e) => { e.preventDefault(); void run(moveChange(action, target)); }}>
                    <label htmlFor={label("action")}>Action to move</label>
                    <select id={label("action")} value={action} onChange={(e) => setAction(e.target.value)}>
                        {actions.map((a) => <option key={a.id} value={a.id}>{a.purpose}</option>)}
                    </select>
                    <label htmlFor={label("target")}>Move it to</label>
                    <select id={label("target")} value={target} onChange={(e) => setTarget(e.target.value)}>
                        {targets.map((t) => <option key={t.key} value={t.key}>{t.title}</option>)}
                    </select>
                    <button type="submit">Move</button>
                </form>
            )}
            <label htmlFor={label("note")}>Note: why this change (kept with it)</label>
            <input id={label("note")} value={note} onChange={(e) => setNote(e.target.value)} />
            <div>
                <button type="button" onClick={() => void plain("/api/undo")}>Undo last change</button>
                <button type="button" onClick={() => void plain("/api/revert")}>Revert all</button>
            </div>
            <div role="status" aria-live="polite">
                {said && <p className={said.accepted ? "note" : "note gap"}>{said.text}</p>}
                {said && said.gaps.length > 0 && <ul>{said.gaps.map((gap, i) => <li key={i}>{gap}</li>)}</ul>}
            </div>
            <h3>Changes so far ({entries.length})</h3>
            {entries.length === 0 ? <p className="note">None.</p> : <ol>{entries.map((entry, i) => <li key={i}>{describeEntry(entry, (key) => titles[key] ?? "a story")}</li>)}</ol>}
        </section>
    );
}
