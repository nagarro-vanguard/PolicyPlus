// The tells of text that reads as machine-made, as deterministic detectors. Each has a name, a rule (what a reader
// meets), a reason and a severity: a "tell" is something a careful person does not write, a "probable tell" is
// something they rarely write and sometimes must. Detectors only report; the words of the analysed code are listed,
// never rewritten (see language.ts). The rules they enforce are in stages/publish/rules/narrative.md ("Voice").

export type Severity = "tell" | "probable tell";

export type Detector = {
    readonly name: string;
    /** What the reader meets, as a short phrase: the key of the report's `byRule`. */
    readonly rule: string;
    readonly reason: string;
    readonly severity: Severity;
    /** The first place in a text where it applies, as the matched words, or undefined. */
    readonly find: (text: string) => string | undefined;
};

export type VoiceFinding = { readonly rule: string; readonly name: string; readonly severity: Severity; readonly hit: string };

const from = (pattern: RegExp) => (text: string) => pattern.exec(text)?.[0];

/**
 * A detector built from one pattern.
 * @param name its short name
 * @param rule what the reader meets
 * @param severity how sure it is
 * @param pattern the pattern
 * @param reason why a careful person does not write it
 * @returns the detector
 */
const pat = (name: string, rule: string, severity: Severity, pattern: RegExp, reason: string): Detector => ({
    name,
    rule,
    reason,
    severity,
    find: from(pattern),
});

/**
 * The sentences of a text.
 * @param text the text
 * @returns its sentences, without the blanks
 */
export const sentencesOf = (text: string) =>
    text
        .split(/(?<=[.!?])\s+(?=["'(“]?[A-Z])/)
        .map((sentence) => sentence.trim())
        .filter((sentence) => sentence !== "");

const words = (sentence: string) => sentence.split(/\s+/).filter((word) => /\p{L}|\p{N}/u.test(word));

const determiners = new Set(["the", "a", "an", "this", "that", "these", "those", "each", "every", "its"]);

/** What a sentence opens with: its first word, or its first two when the first is only an article or a pronoun. */
const opening = (sentence: string) => {
    const [first = "", second = ""] = [...sentence.toLowerCase().matchAll(/[\p{L}\p{N}']+/gu)].map((m) => m[0]);
    return determiners.has(first) ? `${first} ${second}` : first;
};

/** Words that open a sentence of a rule or a criterion by the nature of the form: not a tell by repetition. */
const formal = new Set(["when", "given", "if", "then", "while", "where", "after", "before", "each"]);

// ---- Detectors on any text, whether one sentence or a page ----

/** Words already reported as boilerplate by language.ts: not repeated here. */
const stock =
    /\b(?:landscape|realm|empower(?:s|ed|ing)?|unlock(?:s|ed|ing)?|underscor(?:ed|ing)|underscores (?:the|that|how)|facilitat(?:e|es|ed|ing)|enhanc(?:e|es|ed|ing)|vital|innovative|cutting-edge|best practices|deep dive|dive into|sheds? light|paving the way|pave the way|at the heart of|double-edged|silver bullet|rapidly evolving|ever-changing|fast-paced|world-class|state-of-the-art|best-in-class|unparalleled|revolutionary|frictionless|effortless(?:ly)?|blazing|lightning-fast)\b/i;

export const textDetectors: readonly Detector[] = [
    pat(
        "contrast-not-but",
        "a contrast built as not X but Y",
        "tell",
        /\bnot (?:just|only|merely|simply) [^.;!?]{1,80}?,? but\b[^.;!?]{0,40}|\b(?:it'?s|it is|this is|that'?s) not (?:about|a matter of)\b[^.;!?]{0,60}|\bmore than (?:just|merely)\b[^.;!?]{0,40}|\b(?:isn't|aren't|wasn't|doesn't|don't) (?:just|merely|only)\b[^.;!?]{0,60}|\bbeyond (?:just|merely|simply)\b|\bgoes? beyond\b/i,
        "It sets up a claim only to knock it down and replace it; say the claim.",
    ),
    pat(
        "contrast-but-rather",
        "a contrast built as not X but Y",
        "probable tell",
        /\b(?:is|are|was|were|does|do|did|has|have) not\b[^.;!?]{3,60}?[,;]? (?:but|rather)\b[^.;!?]{0,40}|\bnot [a-z]+(?: [a-z]+){0,3}, but\b[^.;!?]{0,40}|\brather than (?:just|merely)\b|\b(?:is|are) (?:one|a|an|the) [a-z]+(?: [a-z]+){0,2} (?:rather than|instead of) [a-z]+/i,
        "A denial followed by the real claim; the denial rarely adds a fact.",
    ),
    pat(
        "contrast-tail",
        "a contrast tacked on as , not Y",
        "probable tell",
        /(?<=[a-z0-9]), not [^,.;!?]{1,60}[.!?]|(?<=[a-z0-9]), not only\b[^.;!?]{0,50}/i,
        "A tail that names what the thing is not, for rhythm; say what it is.",
    ),
    pat(
        "contrast-instead",
        "a contrast built as X instead of Y",
        "probable tell",
        /\b(?:instead of|rather than) (?:waiting|making|asking|having|needing|forcing|requiring|nothing|silently|a |the |one |separate)\b[^.;!?]{0,50}/i,
        "The thing it replaces is named only for contrast; say what happens.",
    ),
    pat(
        "denial-definition",
        "a definition that ends by saying what it is not",
        "probable tell",
        /[;,.]\s+(?:it|this|that|they) (?:is|are) not (?:the|a|an|its|their|just|only)\b[^.;!?]{0,60}/i,
        "A glossary line with a built-in contrast; the first half is the definition.",
    ),
    pat(
        "reassurance-closer",
        "a closing clause that promises every rule is kept",
        "probable tell",
        /\b(?:while|with|and) (?:every|all|each) [a-z' ,-]{0,50}rules? (?:stays?|stay in place|is kept|are kept|still enforced|remains?|remain intact|intact|held)\b|\bevery rule (?:intact|stays|is kept)\b/i,
        "The same reassurance repeated on every record says nothing about this one.",
    ),
    pat(
        "negated-need",
        "a claim that nothing is needed",
        "probable tell",
        /\b(?:so )?(?:nobody|no one|nothing|no [a-z]+(?: [a-z]+)?) (?:has to|needs? to|is needed|is required|can be forgotten|to remember)\b[^.;!?]{0,40}|\bno (?:separate|extra|manual|second) [a-z]+ (?:action|step)\b[^.;!?]{0,40}|\bno [a-z-]+(?: [a-z-]+)? is needed\b/i,
        "It praises the design by naming the burden it removes; state what the person does.",
    ),
    pat(
        "reveal-colon",
        "a colon that announces a reveal",
        "tell",
        /(?:^|[.!?]\s+)(?:the (?:result|catch|upshot|truth|reality|bottom line|takeaway|secret|twist|trick|payoff|real \w+|short version|punchline)|here'?s the (?:thing|catch|deal|kicker)|one (?:thing|rule|idea) is clear|the answer|the verdict)\s*:|\b(?:the result|the catch|the upshot)\s*:/i,
        "It builds to a punch line; put the fact where it belongs and say it plainly.",
    ),
    pat(
        "reveal-phrase",
        "a phrase that announces a reveal",
        "tell",
        /\b(?:here'?s (?:the|what|why|how)|here is (?:the|what|why|how)|the truth is|the reality is|the real (?:question|problem|value|challenge|issue|point) is|what matters (?:most )?is|what this means is|this is where \w+ comes in|and that'?s (?:the|why|it|all)|that'?s the point|the (?:short|simple) (?:version|answer) is|spoiler)\b/i,
        "It points at its own punch line instead of making the point.",
    ),
    pat(
        "anaphora-fragments",
        "short fragments piled up for effect",
        "tell",
        /\b(?:no|not|never|zero|just) [a-z]+(?: [a-z]+)?\.\s+(?:no|not|never|zero|just) [a-z]+(?: [a-z]+)?\./i,
        "Fragments in a row (No X. No Y.) are rhythm, not information.",
    ),
    pat(
        "fragment-for-effect",
        "a fragment set apart for effect",
        "tell",
        /(?:[a-z0-9)"]\.\s+|^)(?:nothing else|nothing more|nothing less|no exceptions|no more|no surprises|no magic|that'?s it|that is all|that is it|simple as that|period|full stop|every time|every single \w+|always|never|just that|and that'?s all|only that)\.(?=\s|$)/i,
        "A sentence of a few words set apart so it lands as a verdict.",
    ),
    pat(
        "dash",
        "a dash used as punctuation",
        "tell",
        /[—―]|–(?![0-9])|(?<![0-9]) ?– ?(?![0-9])| -{1,2} (?=[A-Za-z])/,
        "A dash stands in for the sentence the writer did not finish; use a full stop, a colon or a comma.",
    ),
    pat(
        "stock-word",
        "phrasing that reads as boilerplate",
        "tell",
        stock,
        "A word that signals writing for effect more than a fact; use the plain one.",
    ),
    pat(
        "transition-filler",
        "a filler that opens or closes a sentence",
        "tell",
        /(?:^|[.!?]\s+)(?:overall|ultimately|in summary|to summari[sz]e|in short|in essence|essentially|fundamentally|importantly|notably|crucially|interestingly|simply put|put simply|needless to say|at the end of the day|all in all|in the end|at its core),|\b(?:at its core|in essence|it goes without saying|it is worth noting|it'?s worth noting|it should be noted|it is important to note|it'?s important to note|ultimately)\b/i,
        "It announces importance or a summary instead of giving the fact.",
    ),
    pat(
        "serves-as",
        "serves as, acts as or plays a role",
        "tell",
        /\b(?:serves|served|serving) as\b|\b(?:acts|acting) as (?:a|an|the)\b|\bstands as\b|\bplays? an? (?:\w+ )?role\b|\b(?:is|are) a testament\b/i,
        "A verb that avoids the real one: say what it does.",
    ),
    pat(
        "filler-preposition",
        "stacked filler words",
        "probable tell",
        /\b(?:in order to|a variety of|a wide (?:range|variety) of|a number of|the ability to|in terms of|with (?:respect|regard) to|due to the fact|the fact that|for the purpose of|on a \w+ basis|at this point in time|has the ability to|is able to|in the event that|in today'?s|when it comes to)\b/i,
        "Longer than the word it replaces (to, many, can, because).",
    ),
    pat(
        "hedge-stack",
        "hedges piled on one another",
        "probable tell",
        /\b(?:may|might|could|can) (?:possibly|potentially|perhaps|sometimes|occasionally)\b|\b(?:possibly|perhaps) (?:might|could|may)\b|\b(?:generally|typically|usually) tends? to\b|\bit may be (?:the case|possible) that\b|\b(?:seems?|appears?) to (?:potentially|possibly|generally)\b|\bsomewhat of a\b/i,
        "Two doubts in a row say nothing more than one; state the doubt once.",
    ),
    pat(
        "superlative",
        "a superlative or a sales word",
        "probable tell",
        /\b(?:truly|genuinely|incredibly|remarkably|dramatically|vastly|deeply|literally|massive(?:ly)?|game-?chang\w*|powerful|best-in-class|second to none|100%|every single|a wealth of|unmatched|smallest|fewest|simplest|safest|cleanest|lightest|fastest|easiest|most (?:natural|direct|obvious|intuitive))\b/i,
        "An adjective where a number or a name would do.",
    ),
    pat(
        "chatty-narrator",
        "a chatty narrator",
        "tell",
        /\b(?:let['\u2019]s|let us|let me|picture this|think of it as|you'?ll (?:love|find|see|notice))\b|(?:^|[.!?]\s+)(?:imagine\s|(?:so|well|okay|now|look),\s)/i,
        "A narrator talking to the reader; the page states what is there.",
    ),
    pat(
        "future-promise",
        "a promise in the future tense",
        "probable tell",
        /\b(?:will (?:help|allow|enable|empower|ensure|make it (?:easy|easier|simple|simpler)|let) (?:you|users?|teams?|people|anyone|everyone|them)?|helps? you|lets you|allows you to|you will be able to|you'?ll be able to)\b/i,
        "It promises a benefit instead of stating what is so.",
    ),
    pat(
        "rhetorical-question",
        "a rhetorical question",
        "tell",
        /(?:^|[.!?]\s+)(?:why (?:does|should|is|do) (?:this|it|that) matter|so what|what does (?:this|that) mean|sound familiar|ready to|want to|what if|ever wondered|have you ever|what'?s the catch|why\? )[^.!?]*\?|\?\s+(?:because|that'?s because|simple:|the answer)/i,
        "A question the writer answers at once is a punch line in two parts.",
    ),
    pat(
        "exclamation",
        "an exclamation",
        "tell",
        /[a-z0-9)]!(?:\s|$)/i,
        "A careful colleague does not shout.",
    ),
    pat(
        "vague-passive",
        "a claim with no one behind it",
        "probable tell",
        /\bit (?:is|has been|can be|should be|must be) (?:known|believed|said|thought|argued|shown|noted|observed|seen|understood|considered|recognised|recognized|widely\s+\w+) (?:that|to be)\b|\bit (?:is|can be) (?:clear|obvious|evident|apparent) that\b|\b(?:various|numerous|several|certain) (?:factors|aspects|considerations|elements|things)\b|\bthings like\b|\band (?:much|so much) more\b|\band so on\b|\betc\.?\B/i,
        "Nobody in particular says it, and nothing in particular is meant.",
    ),
    pat(
        "nominalisation",
        "a verb turned into a noun",
        "probable tell",
        /\bthe (?:(?!(?:string|nothing|something|setting|ending|heading|warning|beginning|meaning|building|listing|padding|mapping|naming|wording|spelling|binding|casing|encoding|timing|pricing|morning|evening|ceiling|king|ring|thing)\b)[a-z]{3,}ing|performance|execution|creation|deletion|installation|retrieval|processing|handling|validation|initiali[sz]ation|management|utili[sz]ation|implementation|generation|evaluation|determination|presentation|provision) of (?:the|a|an|its|their|each|all)\b/i,
        "The action is buried in a noun (the loading of the file); use the verb (loads the file).",
    ),
    pat(
        "ensure",
        "ensure and its kin",
        "probable tell",
        /\b(?:ensures?|ensuring|key (?:role|benefit|factor|feature|advantage|takeaway|insight|differentiator|driver)|critical (?:role|part|piece)|pivotal|crucial)\b/i,
        "A stock verb or adjective that claims more than it says.",
    ),
    pat(
        "intensifier-adverb",
        "an adverb that vouches for itself",
        "probable tell",
        /\b(?:plainly|clearly|easily|simply|seamlessly|effortlessly|quickly|naturally|obviously)\b(?! (?:created|given|named|defined))/i,
        "It asserts that the thing is clear or easy instead of making it so.",
    ),
    pat(
        "fake-precision",
        "a precise-looking figure with no source",
        "probable tell",
        /\b\d+(?:\.\d+)?(?:x| times|%) (?:faster|better|more|less|fewer|cheaper|smaller|reduction|improvement|gain)\b|\b(?:up to|over|nearly|almost) \d{2,3}%/i,
        "A number given for its look; a figure needs its measure and its source.",
    ),
    pat(
        "repeated-lead-list",
        "a list whose items open alike",
        "probable tell",
        /\b(one|no|every|each|zero|fewer|more|less|clear|plain|simple) [^,;.]{1,30}, \1 [^,;.]{1,30}(?:,? (?:and|or) |, )\1?/i,
        "Items that open with the same word for the beat, not for the content.",
    ),
];

// ---- Detectors on the sentences of one piece of text ----

export const sentenceDetectors: readonly Detector[] = [
    {
        name: "triplet",
        rule: "a list of three adjectives or phrases for rhythm",
        reason: "Three of a kind sounds finished whether or not there are three things.",
        severity: "probable tell",
        find: (text) => {
            const adjective = /(?:ful|ive|able|ible|ous|ic|ent|ant|less)$/;
            const stockAdjective = /^(?:fast|simple|secure|clear|clean|easy|reliable|flexible|scalable|modern|intuitive|efficient|robust|smart|safe|lean|light|quick|solid)$/;
            for (const sentence of sentencesOf(text)) {
                const found =
                    /\b([a-z]{4,}), ([a-z]{4,}),? (?:and|or) ([a-z]{4,})\b(?! (?:of|for|in|on|to|from|with|by|at|are|is|were|was)\b)/i.exec(
                        sentence,
                    );
                if (found === null) continue;
                const [, a = "", b = "", c = ""] = found;
                const score = [a, b, c].filter((word) => adjective.test(word.toLowerCase()) || stockAdjective.test(word.toLowerCase())).length;
                if (score >= 3 || (score === 2 && [a, b, c].some((word) => stockAdjective.test(word.toLowerCase())))) return found[0];
            }
            return undefined;
        },
    },
    {
        name: "triplet-phrases",
        rule: "a list of three adjectives or phrases for rhythm",
        reason: "Three parallel short phrases in a row, built for the beat.",
        severity: "probable tell",
        find: (text) => {
            for (const sentence of sentencesOf(text)) {
                const found = /\b(\w+ \w+), (\w+ \w+),? (?:and|or) (\w+ \w+)(?=[.;:!?]|$)/.exec(sentence);
                if (found === null) continue;
                const [, a = "", b = "", c = ""] = found;
                const first = (phrase: string) => phrase.split(" ")[0]?.toLowerCase() ?? "";
                if (/^\p{L}/u.test(first(a)) && first(a) === first(b) && first(b) === first(c)) return found[0];
            }
            return undefined;
        },
    },
    {
        name: "short-run",
        rule: "short fragments piled up for effect",
        reason: "Three sentences of five words or fewer in a row read as a drumroll.",
        severity: "tell",
        find: (text) => {
            const all = sentencesOf(text);
            for (let i = 0; i + 2 < all.length; i++) {
                const run = all.slice(i, i + 3);
                if (run.every((sentence) => words(sentence).length <= 5 && /[.!]$/.test(sentence))) return run.join(" ");
            }
            return undefined;
        },
    },
    {
        name: "fragment-after-long",
        rule: "a fragment set apart for effect",
        reason: "A one-to-three word sentence after a long one lands as a verdict.",
        severity: "probable tell",
        find: (text) => {
            const all = sentencesOf(text);
            for (let i = 1; i < all.length; i++) {
                const sentence = all[i] ?? "";
                const before = all[i - 1] ?? "";
                if (
                    words(sentence).length <= 3 &&
                    words(before).length >= 10 &&
                    /^(?:no|nothing|never|always|just|only|not|simple|done|exactly|same|one|zero|all)\b/i.test(sentence)
                )
                    return `${before.slice(-40)} ${sentence}`;
            }
            return undefined;
        },
    },
    {
        name: "same-opener",
        rule: "sentences that open with the same words",
        reason: "Three sentences in a row that start alike read as a template.",
        severity: "probable tell",
        find: (text) => {
            const all = sentencesOf(text);
            for (let i = 0; i + 2 < all.length; i++) {
                const run = all.slice(i, i + 3).map(opening);
                const [a = ""] = run;
                if (a.length > 0 && !formal.has(a) && run.every((word) => word === a))
                    return all.slice(i, i + 3).map((sentence) => words(sentence).slice(0, 3).join(" ")).join(" / ");
            }
            return undefined;
        },
    },
    {
        name: "uniform-length",
        rule: "sentences of one length",
        reason: "Four or more sentences of almost the same length have the beat of a template.",
        severity: "probable tell",
        find: (text) => {
            const lengths = sentencesOf(text).map((sentence) => words(sentence).length);
            if (lengths.length < 4) return undefined;
            const mean = lengths.reduce((sum, n) => sum + n, 0) / lengths.length;
            const spread = Math.sqrt(lengths.reduce((sum, n) => sum + (n - mean) ** 2, 0) / lengths.length);
            return mean >= 8 && spread / mean < 0.12 ? `${lengths.length} sentences of about ${Math.round(mean)} words` : undefined;
        },
    },
    {
        name: "question-in-prose",
        rule: "a rhetorical question",
        reason: "A question inside running text, answered by the next sentence, is a reveal in two parts.",
        severity: "probable tell",
        find: (text) => {
            const all = sentencesOf(text);
            const at = all.findIndex((sentence, i) => sentence.endsWith("?") && i < all.length - 1);
            return at < 0 ? undefined : `${all[at]} ${all[at + 1] ?? ""}`;
        },
    },
    {
        name: "hedge-count",
        rule: "hedges piled on one another",
        reason: "Three doubts in one sentence leave the reader with none of them settled.",
        severity: "probable tell",
        find: (text) =>
            sentencesOf(text).find(
                (sentence) =>
                    (sentence.match(/\b(?:may|might|could|possibly|potentially|perhaps|probably|likely|appears? to|seems? to|tends? to|somewhat)\b/gi) ?? [])
                        .length >= 3,
            ),
    },
];

// ---- Detectors on a list of items shown together ----

/**
 * The detectors for items shown one under another.
 * @param items the items, in the order they are shown
 * @returns what a careful person would not write across them
 */
export const listFindings = (items: readonly string[]): VoiceFinding[] => {
    const found: VoiceFinding[] = [];
    const firsts = items.map((item) => words(item).slice(0, 2).join(" ").toLowerCase());
    const same = (from: number, count: number) =>
        firsts.slice(from, from + count).every((word) => word !== "" && word === firsts[from]);
    for (let i = 0; i + 3 < items.length; i++) {
        const word = firsts[i] ?? "";
        if (!formal.has(word.split(" ")[0] ?? "") && same(i, 4)) {
            found.push({
                rule: "items that open with the same words",
                name: "list-same-opener",
                severity: "probable tell",
                hit: items.slice(i, i + 4).map((item) => words(item).slice(0, 3).join(" ")).join(" / "),
            });
            i += 3;
        }
    }
    return found;
};

/**
 * Every tell in a text.
 * @param text one piece of text (a sentence, a paragraph) or a page's text
 * @param options `structure: false` leaves out the detectors that need the text to be one block with its own
 *   sentences, as a page's text is not
 * @returns the tells with the words that show them
 */
export const voiceFindings = (shown: string, options: { structure?: boolean; kind?: string } = {}): VoiceFinding[] => {
    const found: VoiceFinding[] = [];
    const text = unquoted(shown);
    const asks = (options.kind ?? "").includes("question");
    for (const detector of [...textDetectors, ...(options.structure === false ? [] : sentenceDetectors)]) {
        if (asks && detector.name === "question-in-prose") continue;
        const hit = detector.find(text);
        if (hit !== undefined) {
            found.push({
                rule: detector.rule,
                name: detector.name,
                severity: detector.severity,
                hit: aroundHit(text, hit),
            });
        }
    }
    return found;
};

/** A text without what it quotes: the words of a window, a message or a code literal are not the writer's voice. */
export const unquoted = (text: string) =>
    text.replaceAll(/"[^"]*"|\u201c[^\u201d]*\u201d|`[^`]*`/g, '""');

/**
 * What a record of a given kind must not be, beyond what any text must not.
 * @param kind the kind of record: a reason, a trade-off, a title, a lede
 * @param text its text
 * @returns the tells that need the kind to be known
 */
export const recordFindings = (kind: string, text: string): VoiceFinding[] => {
    const found: VoiceFinding[] = [];
    const reasoning = /(?:reason|why|trade-?off|recommended|outcome|idea)$/.test(kind);
    const count = words(text).length;
    const halves = text.replace(/[.]$/, "").split(/, |; /);
    const parallel = halves.length === 2 && halves.every((half) => words(half).length >= 2 && words(half).length <= 4);
    if (reasoning && count >= 3 && (count <= 5 || (count <= 9 && parallel))) {
        found.push({ rule: "a reason that is a slogan", name: "slogan", severity: "probable tell", hit: text });
    }
    return found;
};

const aroundHit = (text: string, hit: string) => {
    const at = text.indexOf(hit);
    if (at < 0) return hit.replaceAll(/\s+/g, " ").trim().slice(0, 160);
    return text
        .slice(Math.max(0, at - 40), at + hit.length + 40)
        .replaceAll(/\s+/g, " ")
        .trim();
};

/** Every detector, for a report that lists them. */
export const allDetectors: readonly Detector[] = [...textDetectors, ...sentenceDetectors];
