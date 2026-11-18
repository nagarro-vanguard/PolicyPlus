import { copy } from "./copy";
import { dataGridModel, integrationModel, partsModel } from "./model";
import type { FigureBrief, Knowledge, System } from "./types";

export type FigureKind = FigureBrief["kind"];

/** The shapes of picture each page draws, in the order they appear. */
export const kindsOf = {
    madeOf: ["parts", "layers"],
    connections: ["integration"],
    data: ["data", "states"],
} as const satisfies Record<string, readonly FigureKind[]>;

/**
 * Whether the records hold enough to draw a shape of picture, for the shapes drawn when the briefing chose none.
 * @param kind the shape
 * @param system the system payload
 * @param knowledge what the analysis knows of the system as a whole
 * @returns true when there is something to draw
 */
const supported = (kind: FigureKind, system: System, knowledge: Knowledge) => {
    if (kind === "parts") return partsModel(knowledge).facts.parts >= 2;
    if (kind === "integration") return integrationModel(system, knowledge).facts.externals >= 1;
    if (kind === "states") return knowledge.lifecycles.length >= 1;
    if (kind === "data") return dataGridModel(knowledge).facts.kinds >= 2;
    return false;
};

/**
 * The pictures a page draws, in the order the briefing chose them. A page the briefing chose no picture for (an analysis
 * made before pictures were chosen, or a briefing that skipped it) gets each shape its records support, with a plain
 * caption, so no page is left bare.
 * @param kinds the shapes the page draws
 * @param system the system payload
 * @param knowledge what the analysis knows of the system as a whole
 * @returns the pictures to draw
 */
export const briefsFor = (kinds: readonly FigureKind[], system: System, knowledge: Knowledge): FigureBrief[] => {
    const chosen = knowledge.figures.filter((figure) => kinds.includes(figure.kind));
    if (chosen.length > 0) {
        return chosen;
    }
    return kinds
        .filter((kind) => supported(kind, system, knowledge))
        .flatMap((kind) => {
            const words =
                kind in copy.figures.defaults
                    ? copy.figures.defaults[kind as keyof typeof copy.figures.defaults]
                    : undefined;
            return words === undefined
                ? []
                : [
                      {
                          id: `default-${kind}`,
                          kind,
                          question: words.question,
                          caption: words.caption,
                          wanted: "",
                          records: [],
                      },
                  ];
        });
};

/**
 * The pictures the briefing asked for and the records could not draw, as the reader's words for what was wanted.
 * @param knowledge what the analysis knows of the system as a whole
 * @returns what was wanted, one entry per picture
 */
export const wantedPictures = (knowledge: Knowledge) =>
    knowledge.figures
        .filter((figure) => figure.kind === "other")
        .map((figure) => ({ question: figure.question, wanted: figure.wanted }));
