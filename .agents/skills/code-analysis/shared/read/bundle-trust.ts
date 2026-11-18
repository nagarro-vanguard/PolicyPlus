import { inSlice } from "./bundle-diagrams";
import { at, isGenerated, mergeRanges, overlaps, shortId, type Place, type Range } from "./bundle-places";
import type { Payloads, Slice } from "./bundle-slice";

type Risk = Payloads["knowledge"]["risks"][number];

const severityRank: Readonly<Record<string, number>> = { high: 0, medium: 1, low: 2 };

/**
 * The places a risk rests on, from its findings.
 * @param risk the risk
 * @returns the places
 */
const placesOf = (risk: Risk): Place[] => risk.findings.flatMap((finding) => finding.evidence);

/**
 * How serious a risk is, as a number to order by: the most serious first.
 * @param risk the risk
 * @returns the rank
 */
const rankOf = (risk: Risk) => {
    const rank = severityRank[risk.severity];
    return rank === undefined ? 1 : rank;
};

type Group = { readonly risks: Risk[]; readonly findings: Set<string> };

/**
 * Group risks that rest on a common finding: the analysis records one problem under several headings, and a bundle
 * names it once.
 * @param risks the risks
 * @returns the groups, each with the risk that stands for it and every place it rests on
 */
const grouped = (risks: readonly Risk[]) => {
    const groups: Group[] = [];
    for (const risk of risks) {
        const ids = risk.findings.map((finding) => finding.id);
        const [first, ...rest] = groups.filter((group) => ids.some((id) => group.findings.has(id)));
        if (first === undefined) {
            groups.push({ risks: [risk], findings: new Set(ids) });
            continue;
        }
        first.risks.push(risk);
        ids.forEach((id) => first.findings.add(id));
        for (const other of rest) {
            first.risks.push(...other.risks);
            other.findings.forEach((id) => first.findings.add(id));
            groups.splice(groups.indexOf(other), 1);
        }
    }
    return groups.flatMap((group) => {
        const [risk] = group.risks.toSorted((one, other) => rankOf(one) - rankOf(other));
        return risk === undefined ? [] : [{ risk, places: group.risks.flatMap(placesOf) }];
    });
};

/**
 * The places that lie inside code the slice runs, as pointers with those that touch merged.
 * @param places the places
 * @param blocks the slice's blocks
 * @returns the pointers
 */
const insideOf = (places: readonly Place[], blocks: readonly Place[]) => {
    const byFile = new Map<string, Range[]>();
    for (const place of places.filter((each) => blocks.some((block) => overlaps(block, each)))) {
        const list = byFile.get(place.file);
        const range = { first: place.firstLine, last: place.lastLine };
        if (list === undefined) {
            byFile.set(place.file, [range]);
        } else {
            list.push(range);
        }
    }
    return [...byFile].flatMap(([file, ranges]) =>
        mergeRanges(ranges, 0).map((range) => at({ file, firstLine: range.first, lastLine: range.last })),
    );
};

/**
 * The risks whose evidence lies in code the slice runs, each problem once.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the lines
 */
const riskLines = (payloads: Payloads, slice: Slice) => {
    const blocks = [...slice.blocks.values()];
    const inside = payloads.knowledge.risks.filter((risk) =>
        placesOf(risk).some((place) => blocks.some((block) => overlaps(block, place))),
    );
    return grouped(inside).map(({ risk, places }) => {
        const here = insideOf(places, blocks);
        const shown = here.slice(0, 5).map((place) => `\`${place}\``);
        const more = here.length > shown.length ? `, and ${here.length - shown.length} more` : "";
        return `- **${shortId("RK", risk.id)}** [${risk.severity}] ${risk.statement} (${risk.categoryWords}) — at ${shown.join(", ")}${more}`;
    });
};

/**
 * The records of the slice that a second reading challenged and left unchanged, with the reviewer's words.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the lines
 */
const disputedLines = (payloads: Payloads, slice: Slice) => [
    ...slice.rules
        .filter((entry) => entry.info.reading === "disputed")
        .map((entry) => `- **${shortId("BR", entry.rule.id)}** \`${at(entry.rule.place)}\`: ${entry.info.why}`),
    ...payloads.index.lifecycles.flatMap((life) =>
        life.transitions
            .filter((transition) => transition.reading === "disputed" && inSlice(slice, transition))
            .map((transition) => `- **${shortId("TR", transition.id)}** \`${at(transition)}\`: ${transition.why}`),
    ),
];

/**
 * Everything in a slice to doubt: records challenged in review, risks, assumptions, open points, links not followed and
 * code nothing reaches.
 * @param payloads everything the analysis wrote
 * @param slice the slice
 * @returns the lines, each part under a bold heading and left out when empty
 */
export const trustLines = (payloads: Payloads, slice: Slice) => {
    const blocks = [...slice.blocks.values()];
    const near = (place: Place) => blocks.some((block) => overlaps(block, place));
    const assumptions = payloads.knowledge.assumptions
        .filter((assumption) => assumption.evidence.some(near))
        .map(
            (assumption) =>
                `- ${assumption.statement} Why unsettled: ${assumption.why} Confirm with: ${assumption.confirmWith} If wrong: ${assumption.ifWrong}`,
        );
    const points = slice.capabilities.flatMap((each) =>
        each.openPoints.map((point) => `- ${point.statement} Why unsettled: ${point.why} If wrong: ${point.ifWrong}`),
    );
    const gaps = slice.capabilities.flatMap((each) =>
        each.gaps.filter((gap) => near(gap.place)).map((gap) => `- ${gap.reason} (\`${at(gap.place)}\`)`),
    );
    const whole = new Set(
        blocks.filter((block) => slice.dedicated(block.file) && !isGenerated(block.file)).map((block) => block.file),
    );
    const unreached = payloads.index.unreached
        .filter((place) => whole.has(place.file))
        .map((place) => `- ${place.what} (\`${at(place)}\`)`);
    const part = (heading: string, body: readonly string[]) =>
        body.length === 0 ? [] : [`**${heading}**`, ...new Set(body), ""];
    return [
        ...part("Challenged in review and kept", disputedLines(payloads, slice)),
        ...part("Risks", riskLines(payloads, slice)),
        ...part("Assumed, not confirmed", [...assumptions, ...points]),
        ...part("Links the analysis could not follow", gaps),
        ...part("In these files but reached by nothing the analysis could follow", unreached),
    ];
};
