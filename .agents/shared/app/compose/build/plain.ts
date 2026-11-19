import type { Facts } from "./facts";
import { firstSentence } from "./text";

/*
 * Words in place of record ids. A reviewer's or an agent's sentence may cite a rule, an action, a kind of data, a
 * capability, a place, an outside system or a risk by its record id; the reader meets the record's own words instead,
 * in quotes. An id the case holds no record for (a state change, a finding) is taken out with the brackets or list
 * around it, so no consumer ever shows an id and none has to replace one.
 */

const recordId = /(?<![\p{L}\p{N}_-])[a-z]+(?:-[a-z]+)*-\d{8,}(?![\p{L}\p{N}_])/gu;
const gone = "\u0000";

const trimEnd = (text: string) => text.replace(/[.\s]+$/u, "");

/**
 * The resolver of record ids in free text, over the facts of one case.
 * @param facts the facts
 * @returns a function that gives a text with every record id replaced by its words or taken out
 */
export const plainTextOf = (facts: Facts) => {
    const words = new Map<string, string>();
    for (const rule of facts.rules) words.set(rule.id, firstSentence(rule.says));
    for (const action of facts.actions) words.set(action.id, action.summary === "" ? action.name : action.summary);
    for (const entity of facts.entities) words.set(entity.id, entity.name);
    for (const capability of facts.capabilities) words.set(capability.id, capability.name);
    for (const outside of facts.outside) words.set(outside.id, outside.name);
    for (const part of facts.parts) words.set(part.id, part.name);
    for (const area of facts.areas) words.set(area.id, area.name);
    for (const risk of facts.risks) words.set(risk.id, risk.summary);
    return (text: string): string => {
        if (!recordId.test(text)) return text;
        recordId.lastIndex = 0;
        let said = text.replaceAll(recordId, (id) => {
            const found = words.get(id);
            return found === undefined || found.trim() === "" ? gone : `“${trimEnd(found)}”`;
        });
        if (!said.includes(gone)) return said;
        // A bracket that held only ids the case does not know goes with them; so does a list separator next to one.
        said = said
            .replaceAll(/\s*\((?:\s*(?:\u0000|,|;|and|or)\s*)+\)/gu, "")
            .replaceAll(/\u0000(?:\s*(?:,|;|and|or)\s*\u0000)*/gu, gone)
            .replaceAll(/,\s*\u0000/gu, "")
            .replaceAll(/\u0000\s*,\s*/gu, "")
            .replaceAll(gone, "")
            .replaceAll(/\(\s*\)/gu, "")
            .replaceAll(/\s+([,.;:)])/gu, "$1")
            .replaceAll(/\s{2,}/gu, " ")
            .trim();
        return said;
    };
};

export type PlainText = ReturnType<typeof plainTextOf>;
