import type { GraphCite, GraphProps } from "../components/diagram/DiagramCanvas";
import { copy } from "../lib/copy";
import { theCase } from "./loader";
import { pageOf } from "./routes";

// What a view shows, from its record in `views.json`: the model's boxes and arrows as written, a box that holds others
// drawn as a frame, the notes and the records each box cites, and the case's text version. The app lays it out (ELK, in
// the island) and holds no word about any system: title, caption, labels and notes are the model's; the sentences about
// how to read a drawing say nothing of what it draws.

export type ViewRecord = {
    key: string;
    section: string;
    viewpoint: string;
    title: string;
    caption: string;
    boxes: { id: string; label: string; note: string | null; group: string | null; cites: { id: string; text: string; node: string | null }[] }[];
    arrows: { from: string; to: string; label: string | null }[];
    text: string[];
};

export type DiagramView = {
    key: string;
    title: string;
    caption: string | null;
    notes: string[];
    text: string[];
    graph: GraphProps;
    /** When the arrows outnumber twice the boxes, the drawing would be a tangle: the view is a table instead. */
    matrix: { columns: string[]; rows: { label: string; cells: string[] }[] } | null;
};

/** Every view of the case, in the order the case gives them. */
export const viewsOfCase = (): readonly ViewRecord[] => {
    const kase = theCase();
    return kase.has("views.json") ? (kase.json("views.json") as ViewRecord[]) : [];
};

/** The views of a section (`today`, `target`, `variant.<name>`), in the case's order. */
export const viewsOfSection = (section: string): readonly ViewRecord[] => viewsOfCase().filter((view) => view.section === section);

const citesOf = (cites: ViewRecord["boxes"][number]["cites"]): GraphCite[] =>
    cites.map((cite) => ({ text: cite.text, href: cite.node === null ? null : pageOf(cite.node) }));

/** A record as what the page draws. */
export const viewOf = (record: ViewRecord): DiagramView => {
    const holders = new Set(record.boxes.flatMap((box) => (box.group === null ? [] : [box.group])));
    const label = new Map(record.boxes.map((box) => [box.id, box.label]));
    const matrix =
        record.arrows.length <= 2 * record.boxes.length
            ? null
            : (() => {
                  const sources = [...new Set(record.arrows.map((arrow) => arrow.from))];
                  const targets = [...new Set(record.arrows.map((arrow) => arrow.to))];
                  return {
                      columns: targets.map((id) => label.get(id) ?? id),
                      rows: sources.map((from) => ({
                          label: label.get(from) ?? from,
                          cells: targets.map((to) =>
                              record.arrows
                                  .filter((arrow) => arrow.from === from && arrow.to === to)
                                  .map((arrow) => arrow.label ?? "\u2713")
                                  .join(", "),
                          ),
                      })),
                  };
              })();
    return {
        key: record.key,
        title: record.title,
        caption: record.caption,
        notes:
            matrix !== null
                ? [copy.diagram.matrix]
                : [...(record.arrows.length > 0 ? [copy.diagram.lines] : []), ...(holders.size > 0 ? [copy.diagram.groups] : [])],
        matrix,
        text: record.text,
        graph: {
            label: copy.diagram.label(record.title),
            nodes: record.boxes
                .filter((box) => !holders.has(box.id))
                .map((box) => ({ id: box.id, label: box.label, group: box.group, note: box.note, cites: citesOf(box.cites) })),
            groups: record.boxes
                .filter((box) => holders.has(box.id))
                .map((box) => ({ id: box.id, words: box.label, group: box.group, note: box.note, cites: citesOf(box.cites) })),
            edges: record.arrows.map((arrow) => ({ from: arrow.from, to: arrow.to, label: arrow.label })),
            words: {
                drawing: copy.diagram.drawing(record.title),
                loading: copy.diagram.loading,
                failed: copy.diagram.failed,
                scroll: copy.diagram.scroll,
                reaches: copy.diagram.reaches,
                reachedFrom: copy.diagram.reachedFrom,
                nothing: copy.diagram.nothing,
                pick: copy.diagram.pick,
                noun: copy.diagram.noun,
                rests: copy.diagram.rests,
                marked: copy.diagram.marked,
            },
        },
    };
};
