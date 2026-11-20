/** The shape the guard reads: structural, so scripts that do not load the schema library can use it too. */
export type GuardedView = {
    readonly viewpoint: string;
    readonly title: string;
    readonly caption: string;
    readonly boxes: readonly {
        readonly id: string;
        readonly label: string;
        readonly note?: string | undefined;
        readonly group?: string | undefined;
        readonly cites?: readonly string[] | undefined;
    }[];
    readonly arrows: readonly { readonly from: string; readonly to: string; readonly label?: string | undefined }[];
};

/** The room a view may take: more than this is a table or several views, not one picture. */
const viewBudget = { boxes: 24, arrows: 48 } as const;

/** How long a text of a view may be, in words, so that every label can be placed in a drawing without covering another. */
const viewLimits = { boxLabelWords: 6, noteWords: 40, arrowLabelWords: 4 } as const;

const words = (text: string) => text.split(/\s+/).filter((each) => each !== "").length;

/**
 * The gaps of a view's texts that are too long to place: a box name, a note or an arrow label over its limit.
 * @param view the view
 * @param where where the view is, for the message
 * @returns one line per text over its limit
 * @public used by the app's compose, which cannot be seen from here
 */
export const limitGaps = (view: GuardedView, where: string): string[] => [
    ...view.boxes.flatMap((box) => [
        ...(words(box.label) > viewLimits.boxLabelWords
            ? [`${where}: the label of ${box.id} is ${words(box.label)} words; at most ${viewLimits.boxLabelWords}`]
            : []),
        ...(box.note !== undefined && words(box.note) > viewLimits.noteWords
            ? [`${where}: the note of ${box.id} is ${words(box.note)} words; at most ${viewLimits.noteWords}`]
            : []),
    ]),
    ...view.arrows.flatMap((arrow) =>
        arrow.label !== undefined && words(arrow.label) > viewLimits.arrowLabelWords
            ? [
                  `${where}: the arrow from ${arrow.from} to ${arrow.to} is labelled with ${words(arrow.label)} words ("${arrow.label}"); at most ${viewLimits.arrowLabelWords}`,
              ]
            : [],
    ),
];

export type ViewGuard = {
    /** Where the view is, for the message. */
    readonly where: string;
    /** Whether a cited id is a record the caller knows; omitted when the caller cannot tell. */
    readonly knows?: (id: string) => boolean;
    /** The caller's checks of a text a person reads (voice, a count in a caption, a name of the old system). */
    readonly textGaps?: (where: string, text: string, kind: "caption" | "note" | "label" | "title") => readonly string[];
};

const isCount = (text: string) => /^\s*[\d.,]+\s*$/.test(text);

/**
 * The gaps of one view: ids, references, groups, room, citations and the caller's checks of its texts. It refuses what
 * is not well formed, never what is unusual, and knows no kind of system.
 * @param view the view
 * @param guard where it is, what the caller knows and how it checks a text
 * @returns one line per gap; none when the view holds
 * @public used by shape-target, which cannot be seen from here
 */
export const viewGaps = (view: GuardedView, guard: ViewGuard): string[] => {
    const gaps: string[] = [];
    const where = `${guard.where} view "${view.title}"`;
    const ids = new Map<string, number>();
    for (const box of view.boxes) ids.set(box.id, (ids.get(box.id) ?? 0) + 1);
    for (const [id, times] of ids) if (times > 1) gaps.push(`${where}: two boxes share the id ${id}`);
    if (view.boxes.length < 2) gaps.push(`${where}: a view needs at least two boxes`);
    if (view.boxes.length > viewBudget.boxes)
        gaps.push(`${where}: ${view.boxes.length} boxes; draw at most ${viewBudget.boxes} and fold the rest into one box`);
    if (view.arrows.length > viewBudget.arrows)
        gaps.push(`${where}: ${view.arrows.length} arrows; draw at most ${viewBudget.arrows}`);
    for (const arrow of view.arrows) {
        for (const end of [arrow.from, arrow.to])
            if (!ids.has(end)) gaps.push(`${where}: an arrow names ${end}, which is no box of the view`);
        if (arrow.from === arrow.to) gaps.push(`${where}: an arrow runs from ${arrow.from} to itself`);
        if (arrow.label !== undefined && isCount(arrow.label))
            gaps.push(`${where}: an arrow is labelled "${arrow.label}", a count; say what it means`);
    }
    gaps.push(...limitGaps(view, where));
    const holder = new Map(view.boxes.flatMap((box) => (box.group === undefined ? [] : [[box.id, box.group] as const])));
    for (const [id, group] of holder) {
        if (!ids.has(group)) gaps.push(`${where}: box ${id} is in the group ${group}, which is no box of the view`);
        const seen = new Set([id]);
        for (let next = holder.get(id); next !== undefined; next = holder.get(next)) {
            if (seen.has(next)) {
                gaps.push(`${where}: boxes hold each other in a loop through ${id}`);
                break;
            }
            seen.add(next);
        }
    }
    if (guard.knows !== undefined) {
        const knows = guard.knows;
        for (const box of view.boxes)
            for (const id of box.cites ?? [])
                if (!knows(id)) gaps.push(`${where}: box ${box.id} cites ${id}, which is no record`);
    }
    if (guard.textGaps !== undefined) {
        gaps.push(...guard.textGaps(`${where}: the title`, view.title, "title"));
        gaps.push(...guard.textGaps(`${where}: the caption`, view.caption, "caption"));
        for (const box of view.boxes) {
            gaps.push(...guard.textGaps(`${where}: the label of ${box.id}`, box.label, "label"));
            if (box.note !== undefined) gaps.push(...guard.textGaps(`${where}: the note of ${box.id}`, box.note, "note"));
        }
    }
    return gaps;
};

/**
 * The gaps of a set of views of one system: each view, and that a functional and a technical view are among them.
 * @param views the views
 * @param guard where they are, what the caller knows and how it checks a text
 * @returns one line per gap
 */
export const setGaps = (views: readonly GuardedView[], guard: ViewGuard): string[] => [
    ...views.flatMap((view) => viewGaps(view, guard)),
    ...(["functional", "technical"] as const)
        .filter((viewpoint) => !views.some((view) => view.viewpoint === viewpoint))
        .map((viewpoint) => `${guard.where}: write a ${viewpoint} view`),
];

/**
 * The text version of a view, one line per arrow and one per box no arrow touches, in the words of the boxes.
 * @param view the view
 * @returns the lines
 * @public used by the app's compose, which cannot be seen from here
 */
export const textOf = (view: GuardedView): string[] => {
    const label = new Map(view.boxes.map((box) => [box.id, box.label]));
    const touched = new Set(view.arrows.flatMap((arrow) => [arrow.from, arrow.to]));
    return [
        ...view.arrows.map(
            (arrow) =>
                `${label.get(arrow.from) ?? arrow.from} ${arrow.label ?? "connects to"} ${label.get(arrow.to) ?? arrow.to}`,
        ),
        ...view.boxes.filter((box) => !touched.has(box.id)).map((box) => box.label),
    ];
};

/**
 * The gaps between a view and the text version written for it: every arrow and every box must be in it, in the words of
 * the view, so a drawing never carries what its text does not.
 * @param view the view
 * @param text the text version
 * @param where where the view is, for the message
 * @returns one line per box or arrow the text leaves out
 * @public used by the app's compose, which cannot be seen from here
 */
export const coverageGaps = (view: GuardedView, text: readonly string[], where: string): string[] => {
    const label = new Map(view.boxes.map((box) => [box.id, box.label]));
    return [
        ...view.arrows
            .filter((arrow) => {
                const from = label.get(arrow.from) ?? arrow.from;
                const to = label.get(arrow.to) ?? arrow.to;
                return !text.some(
                    (line) =>
                        line.startsWith(from) &&
                        line.endsWith(to) &&
                        (arrow.label === undefined || line.includes(arrow.label)),
                );
            })
            .map((arrow) => `${where}: the text version leaves out the arrow from ${arrow.from} to ${arrow.to}`),
        ...view.boxes
            .filter((box) => !text.some((line) => line.includes(box.label)))
            .map((box) => `${where}: the text version leaves out the box ${box.id}`),
    ];
};
