// The pure parts of the plan editing island: the change a form describes, what the editing server's answer means in words,
// and which stories cannot be edited. No React and no network, so each is tested alone. The shapes are the plan skill's
// revisions (shared/derive/revisions.ts).

export type Change =
    | { readonly _tag: "rename"; readonly story: string; readonly title: string }
    | {
          readonly _tag: "edit";
          readonly story: string;
          readonly field: "what" | "why" | "criterion";
          readonly index?: number;
          readonly text: string;
      }
    | { readonly _tag: "split"; readonly story: string; readonly criteria: readonly [number, ...number[]]; readonly title: string }
    | { readonly _tag: "moveAction"; readonly action: string; readonly to: string };

export type Outcome = { readonly ok: boolean; readonly message?: string; readonly gaps?: readonly string[] };

/** The default address of the editing server; a build can name another through PLAN_EDIT_URL. */
export const defaultEditUrl = "http://127.0.0.1:4322";

/**
 * The change a rename form describes.
 * @param story the story's key
 * @param title the new title
 * @returns the change, or undefined when the title is empty
 */
export const renameChange = (story: string, title: string): Change | undefined =>
    title.trim() === "" ? undefined : { _tag: "rename", story, title: title.trim() };

/**
 * The change an edit form describes: the story's what or why, or one criterion picked by its number from 1.
 * @param story the story's key
 * @param field what is edited
 * @param text the new text
 * @param number the criterion's number from 1, when the field is a criterion
 * @param count how many criteria the story has
 * @returns the change, or undefined when the text is empty or the number is not one of the story's
 */
export const editChange = (
    story: string,
    field: "what" | "why" | "criterion",
    text: string,
    number?: number,
    count = 0,
): Change | undefined => {
    if (text.trim() === "") return undefined;
    if (field !== "criterion") return { _tag: "edit", story, field, text: text.trim() };
    if (number === undefined || !Number.isInteger(number) || number < 1 || number > count) return undefined;
    return { _tag: "edit", story, field, index: number - 1, text: text.trim() };
};

/**
 * The change a split form describes: the ticked criteria, by number from 1, move to a new story. At least one must move
 * and at least one must stay.
 * @param story the story's key
 * @param ticked the numbers from 1 of the ticked criteria
 * @param title the new story's title
 * @param count how many criteria the story has
 * @returns the change, or undefined when the form is not complete
 */
export const splitChange = (story: string, ticked: readonly number[], title: string, count: number): Change | undefined => {
    const positions = [...new Set(ticked)].filter((n) => Number.isInteger(n) && n >= 1 && n <= count).map((n) => n - 1).toSorted((a, b) => a - b);
    const [first, ...rest] = positions;
    if (first === undefined || positions.length >= count || title.trim() === "") return undefined;
    return { _tag: "split", story, criteria: [first, ...rest], title: title.trim() };
};

/**
 * The change a move form describes.
 * @param action the action's id
 * @param to the key of the story it moves to
 * @returns the change, or undefined when either is missing
 */
export const moveChange = (action: string, to: string): Change | undefined =>
    action === "" || to === "" ? undefined : { _tag: "moveAction", action, to };

/**
 * The body the server's revise endpoint takes.
 * @param revision the change
 * @param note why, in the person's words
 * @returns the JSON text
 */
export const reviseBody = (revision: Change, note: string) => JSON.stringify({ revision, note: note.trim() });

/**
 * What a person is told of the server's answer: accepted (and what to do next) or refused with its reason and each gap.
 * @param status the HTTP status, or 0 when the server did not answer
 * @param outcome what the server said
 * @returns whether it was accepted, the sentence, and the gaps in order
 */
export const messageOf = (status: number, outcome: Outcome | undefined) => {
    if (status === 0) {
        return { accepted: false, text: "The editing server did not answer. Start it and try again.", gaps: [] as string[] };
    }
    if (status === 200 && outcome?.ok === true) {
        return {
            accepted: true,
            text: `Accepted${outcome.message ? `: ${outcome.message}` : ""}. Build the app again to see the change.`,
            gaps: [] as string[],
        };
    }
    return {
        accepted: false,
        text: `Refused${outcome?.message ? `: ${outcome.message}` : ""}.`,
        gaps: [...(outcome?.gaps ?? [])],
    };
};

/**
 * Whether a story's work item is already created, so the plan no longer edits it: any ledger status but planned.
 * @param ledger the ledger, when there is one
 * @param key the story's key
 * @returns true when it cannot be edited
 */
export const isLocked = (ledger: { readonly items: Readonly<Record<string, { readonly status: string }>> } | undefined, key: string) => {
    const status = ledger?.items[key]?.status;
    return status !== undefined && status !== "planned";
};

/**
 * Which stories a story's actions may move to: the other stories of the same capability and surface.
 * @param stories every story
 * @param story the story
 * @returns the others, in the order given
 */
export const moveTargets = <S extends { readonly key: string; readonly capability?: string | undefined; readonly surface?: string | undefined }>(
    stories: readonly S[],
    story: S,
) => stories.filter((other) => other.key !== story.key && other.capability === story.capability && other.surface === story.surface && story.surface !== undefined);

/**
 * How one change in the server's list reads to a person.
 * @param entry a revision entry, as the server lists it
 * @param titleOf the title of a story by key
 * @returns one sentence
 */
export const describeEntry = (
    entry: { readonly revision: Change; readonly at: string; readonly note: string },
    titleOf: (key: string) => string,
) => {
    const r = entry.revision;
    const what =
        r._tag === "rename" ? `Renamed "${titleOf(r.story)}" to "${r.title}"`
        : r._tag === "edit" ? `Edited the ${r.field === "criterion" ? `criterion ${(r.index ?? 0) + 1}` : r.field} of "${titleOf(r.story)}"`
        : r._tag === "split" ? `Split ${r.criteria.length === 1 ? "one criterion" : `${r.criteria.length} criteria`} of "${titleOf(r.story)}" into "${r.title}"`
        : `Moved an action to "${titleOf(r.to)}"`;
    return entry.note === "" ? what : `${what} (${entry.note})`;
};

/**
 * Ask the server for the changes so far; nothing answering is an answer, not an error.
 * @param base the server's address
 * @param fetcher the fetch to use
 * @returns the entries, or undefined when the server is not there
 */
export const loadEntries = async (base: string, fetcher: typeof fetch = fetch) => {
    try {
        const response = await fetcher(`${base}/api/revisions`);
        return response.ok ? ((await response.json()) as { revision: Change; at: string; note: string }[]) : undefined;
    } catch {
        return undefined;
    }
};

/**
 * Send one request to the server and say what happened.
 * @param base the server's address
 * @param path the endpoint
 * @param body the JSON body, for revise
 * @param fetcher the fetch to use
 * @returns the message for the person
 */
export const send = async (base: string, path: "/api/revise" | "/api/undo" | "/api/revert", body?: string, fetcher: typeof fetch = fetch) => {
    try {
        const response = await fetcher(`${base}${path}`, { method: "POST", headers: { "content-type": "application/json" }, body });
        const outcome = (await response.json().catch(() => undefined)) as Outcome | undefined;
        return messageOf(response.status, outcome);
    } catch {
        return messageOf(0, undefined);
    }
};
