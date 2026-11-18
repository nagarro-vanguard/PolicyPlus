import { Schema } from "effect";
import { ActionId, Count, StoryKey, Text } from "../model/fields";
import { about } from "../model/fields";
import type { Story } from "../model/records";
import { storyKeyOf } from "./plan";

/**
 * What a person may change in the plan after it is written. The records stay as the agents wrote them; revisions are
 * kept apart, applied in order, and each is checked by every gate before it is accepted. Order is never edited: it is
 * derived from what the stories build.
 */
export const Revision = Schema.TaggedUnion({
    rename: { story: StoryKey, title: Text },
    edit: {
        story: StoryKey,
        field: Schema.Literals(["what", "why", "criterion", "open"]),
        index: Schema.optionalKey(
            Count.annotate(about("The criterion's position, from 0, when the field is `criterion`.")),
        ),
        text: Text,
    },
    split: {
        story: StoryKey,
        criteria: Schema.NonEmptyArray(Count).annotate(about("The criteria, by position, that move to the new story.")),
        title: Text,
    },
    moveAction: { action: ActionId, to: StoryKey },
}).annotate(about("One change a person made to the plan."));

export type Revision = typeof Revision.Type;
export type Entry = { readonly revision: Revision; readonly at: string; readonly note: string };

export class RevisionRefused extends Error {}

const find = (stories: readonly Story[], key: string) => {
    const at = stories.findIndex((story) => storyKeyOf(story) === key);
    if (at < 0) throw new RevisionRefused(`no story has the key ${key}: it may have changed after an earlier edit`);
    return at;
};

/**
 * Applies one revision to the stories.
 * @param stories the stories as they stand
 * @param revision the change
 * @returns the stories after it
 * Fails: RevisionRefused when the story does not exist or the change cannot be made.
 */
export const applyRevision = (stories: readonly Story[], revision: Revision): Story[] => {
    const next = [...stories];
    if (revision._tag === "rename") {
        const at = find(next, revision.story);
        next[at] = { ...next[at]!, title: revision.title };
    } else if (revision._tag === "edit") {
        const at = find(next, revision.story);
        const story = next[at]!;
        if (revision.field === "open") {
            const index = revision.index ?? -1;
            const open = story.open ?? [];
            if (index < 0 || index >= open.length) throw new RevisionRefused("that story has no such open point");
            next[at] = { ...story, open: open.map((each, i) => (i === index ? revision.text : each)) };
        } else if (revision.field === "criterion") {
            const index = revision.index ?? -1;
            if (index < 0 || index >= story.criteria.length)
                throw new RevisionRefused("that story has no such criterion");
            next[at] = {
                ...story,
                criteria: story.criteria.map((c, i) =>
                    i === index ? { ...c, says: revision.text } : c,
                ) as unknown as Story["criteria"],
            };
        } else {
            next[at] = { ...story, [revision.field]: revision.text };
        }
    } else if (revision._tag === "split") {
        const at = find(next, revision.story);
        const story = next[at]!;
        const moving = new Set(revision.criteria);
        if ([...moving].some((i) => i >= story.criteria.length))
            throw new RevisionRefused("that story has no such criterion");
        const keep = story.criteria.filter((_, i) => !moving.has(i));
        if (keep.length === 0) throw new RevisionRefused("a split must leave criteria in the story it splits");
        const moved = story.criteria.filter((_, i) => moving.has(i));
        next[at] = { ...story, criteria: keep as unknown as Story["criteria"] };
        // The new story builds what its criteria cite and ports no action of its own: it is technical until actions are moved to it.
        next.splice(at + 1, 0, {
            ...story,
            title: revision.title,
            actions: [],
            terms: [],
            criteria: moved as unknown as Story["criteria"],
        });
    } else {
        const from = next.findIndex((story) => story.actions.includes(revision.action));
        if (from < 0) throw new RevisionRefused("no story ports that action");
        const to = find(next, revision.to);
        next[from] = { ...next[from]!, actions: next[from]!.actions.filter((id) => id !== revision.action) };
        next[to] = { ...next[to]!, actions: [...next[to]!.actions, revision.action] };
    }
    return next;
};

/** Applies every revision in order to the stories the agents wrote. */
export const applyAll = (stories: readonly Story[], entries: readonly Entry[]): Story[] =>
    entries.reduce((current, entry) => applyRevision(current, entry.revision), [...stories]);

/**
 * The keys of the stories a revision touches, so created work items can be protected.
 * @param stories the stories before the revision
 * @param revision the change
 * @returns the keys that must not already be created
 */
export const touchedKeys = (stories: readonly Story[], revision: Revision): string[] => {
    if (revision._tag === "moveAction") {
        const from = stories.find((story) => story.actions.includes(revision.action));
        return [...(from ? [storyKeyOf(from)] : []), revision.to];
    }
    return [revision.story];
};
