import { sentencesOf, unquoted, voiceFindings } from "../../../../shared/app/src/lib/voice";

/*
 * The voice of what the writers author: the shared detectors of the app (`.agents/shared/app/src/lib/voice.ts`, the
 * ones its language report runs), of which every `tell` fails here, plus the two probable tells a design text keeps
 * falling into (a superlative, a closing promise that every rule is kept), plus the claims a design must not make in
 * words because code prints them: how many steps a journey has, or the goal it was given read back.
 */

/** The shared detectors that fail here although they are only probable tells elsewhere. */
const alsoFailing = new Set(["superlative", "reassurance-closer"]);

type Claim = { readonly rule: string; readonly pattern: RegExp };

const counted =
    "(?:fewer|fewest|more|less|shorter|shortest|longer|single|one|two|three|four|five|six|seven|eight|nine|ten|\\d+)";

/** What a design text must not claim: code counts the steps and prints the difference. */
export const claims: readonly Claim[] = [
    {
        rule: "a claim about how many steps it takes, which code prints",
        pattern: new RegExp(
            `\\b${counted}[- ](?:steps?|stages?)\\b|\\b(?:shorter|shortest)\\b|\\bstep counts?\\b`,
            "i",
        ),
    },
    {
        rule: "the design goal read back instead of a reason",
        pattern: /\bask(?:s|ing)? (?:the person |people )?for less\b|\bmore intuitive\b/i,
    },
    {
        rule: "a closing promise that every rule is kept",
        pattern:
            /\b(?:while|and|with|still) (?:keeping|preserving|honou?ring|respecting|applying) (?:every|all|each|the same)\b[^.;]{0,30}\brules?\b|\b(?:every|all|each) (?:of the )?(?:old |existing )?rules? (?:is |are |stays? |remains? )?(?:kept|intact|preserved|honou?red|unchanged)\b/i,
    },
];

/**
 * What a reader would stumble on in one authored text, as gaps.
 * @param where what the text is, as a gap names it (`task t1, variant "x": the recommended`)
 * @param text the text
 * @param oneSentence whether the text must be a single sentence
 * @returns one gap per finding
 */
export const voiceGaps = (where: string, text: string, oneSentence = false): string[] => {
    const gaps = voiceFindings(text)
        .filter((finding) => finding.severity === "tell" || alsoFailing.has(finding.name))
        .map((finding) => `${where} has ${finding.rule} ("${finding.hit}")`);
    const plain = unquoted(text);
    for (const claim of claims) {
        const hit = claim.pattern.exec(plain)?.[0];
        if (hit !== undefined) gaps.push(`${where} has ${claim.rule} ("${hit}")`);
    }
    if (oneSentence && sentencesOf(text).length > 1) gaps.push(`${where} is more than one sentence`);
    return [...new Set(gaps)];
};
