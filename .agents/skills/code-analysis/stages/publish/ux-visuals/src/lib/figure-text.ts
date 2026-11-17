/**
 * One connection of a figure as a sentence, for the text version that a screen reader reads and a printout keeps.
 * @param from the label of the item it leaves
 * @param to the label of the item it reaches
 * @param label what the connection says, with its count and unit
 * @returns the sentence
 */
export const accessWordsOf = (from: string, to: string, label: string) =>
    `${from} → ${to}${label === "" ? "" : `: ${label}`}`;
