import { describe, expect, test } from "bun:test";
import { copy } from "../src/lib/copy";
import { languageFindings } from "../src/lib/language";
import { listFindings, recordFindings, sentenceDetectors, textDetectors, voiceFindings } from "../src/lib/voice";

// The detectors of machine-made text (src/lib/voice.ts) must catch the tells and leave a careful person's sentences alone.
const names = (text: string, kind?: string) => voiceFindings(text, { kind }).map((found) => found.name);

// One sentence for every detector, written the way the tell is usually written.
const tells: Record<string, string> = {
    "contrast-not-but": "This is not just a faster search, but a different way of working.",
    "contrast-but-rather": "The program does not read the file but rather asks the registry.",
    "contrast-tail": "The save happens when the person confirms, not when the window closes.",
    "contrast-instead": "The system derives the version while building instead of waiting for someone to stamp it.",
    "denial-definition": "The security identifier that names one account; it is not the account's typed user name.",
    "reassurance-closer": "Fewest steps for the common case, while every matching and refusal rule is kept.",
    "negated-need": "Versions are stamped on every build, so nobody has to remember to do it.",
    "reveal-colon": "We looked at the options. The result: one clear winner.",
    "reveal-phrase": "Here's the thing about the registry. The truth is that it is slow.",
    "anaphora-fragments": "The search is quick. No setup. No waiting. Results appear.",
    "fragment-for-effect": "The folder is created when it is missing. Nothing else.",
    dash: "The search finds policies — even those in other folders.",
    "stock-word": "The search unlocks a world-class landscape of policies.",
    "transition-filler": "Ultimately, the person decides which folder to use.",
    "serves-as": "The dialog serves as the single place to choose a folder.",
    "filler-preposition": "The program reads the file in order to find a variety of settings.",
    "hedge-stack": "The save could potentially fail if the folder is missing.",
    superlative: "It gives the person a truly powerful way to search.",
    "chatty-narrator": "Let's look at how the search works.",
    "future-promise": "This will help you find policies without opening every file.",
    "rhetorical-question": "Why does this matter? Because a wrong folder loses data.",
    exclamation: "The search is fast!",
    "vague-passive": "It is widely believed that the registry is slow, among various factors.",
    nominalisation: "The loading of the policy files takes a moment.",
    ensure: "The check ensures that the folder exists.",
    "intensifier-adverb": "The program tells the person plainly when the folder is missing.",
    "fake-precision": "The new search is 40% faster than the old one.",
    "repeated-lead-list": "The plan gives one request, one clear result, and one place to save.",
    triplet: "A fast, reliable and flexible search.",
    "triplet-phrases": "It saves time, saves effort and saves money.",
    "short-run": "It loads. It checks. It saves. Done.",
    "fragment-after-long": "The program reads every template file in the chosen folder before it builds the list of policies. Nothing more.",
    "same-opener": "It reads the file in the folder. It checks the header of every entry. It builds the list for the window.",
    "uniform-length": "The program reads every file in the folder. The window shows the list of all policies. The person picks one row from the list. The editor opens the chosen policy at once.",
    "question-in-prose": "What does the person do next? They pick a folder.",
    "hedge-count": "The folder may possibly be missing, and the save could perhaps fail.",
};

describe("what each detector catches", () => {
    for (const [name, sentence] of Object.entries(tells)) {
        test(name, () => {
            expect(names(sentence)).toContain(name);
        });
    }
    test("there is a sentence for every detector but the kind-aware ones", () => {
        const all = [...textDetectors, ...sentenceDetectors].map((detector) => detector.name);
        expect(all.filter((name) => tells[name] === undefined)).toEqual([]);
    });
    test("every detector has a rule, a reason and a severity", () => {
        for (const detector of [...textDetectors, ...sentenceDetectors]) {
            expect(detector.rule.length).toBeGreaterThan(5);
            expect(detector.reason.length).toBeGreaterThan(10);
            expect(["tell", "probable tell"]).toContain(detector.severity);
        }
    });
    test("a slogan of a reason and a run of equal openers across a list", () => {
        expect(recordFindings("plan: decision reason", "Early failure beats CI failure.").map((found) => found.name)).toEqual(["slogan"]);
        expect(recordFindings("plan: story title", "Early failure beats CI failure.")).toEqual([]);
        const items = ["The person picks a folder.", "The person opens a file.", "The person names a policy.", "The person saves it."];
        expect(listFindings(items).map((found) => found.name)).toEqual(["list-same-opener"]);
        expect(listFindings(["When a is b.", "When c is d.", "When e is f.", "When g is h."])).toEqual([]);
    });
});

// Twenty sentences a careful colleague writes: they must pass without a finding.
const human = [
    "The program reads the registry key that holds the person's own choices.",
    "A search that finds nothing says so and leaves the list as it was.",
    "Saving writes the comments first, then the policy values, then the list of remembered sources.",
    "We found no command-line entry in the program's own files.",
    "The download needs administrator rights, because it replaces files in the Windows folder.",
    "If the folder does not exist, the program creates it before it unpacks the package.",
    "The registry key is HKEY_CURRENT_USER\\Software\\PolicyPlus and the program creates it on first start.",
    "Three policies were refused: two were not valid XML and one named a missing category.",
    "The build takes about four minutes on a laptop and under one on the build server.",
    "A person can open a policy from the list, and the editor shows its current value.",
    "Nothing in the code says whether the language file must match the template revision, so we assumed it need not.",
    "The old dialog listed the profiles on the computer and the new one lists them too, with the person's own first.",
    "Leaving the dialog without a choice keeps the current source.",
    "The welcome message appears once per user. After that the program stays quiet.",
    "Each story builds one action of the existing system and cites the rules it keeps.",
    "Policy Plus edits Group Policy settings on any Windows edition, including Home.",
    "When both areas are shown, the common state is followed by a marker.",
    "The user list is read once, at start, and is not refreshed until the program restarts.",
    "It is slower on a network share: the same load took 12 seconds there and 3 on a local disk.",
    "I would keep the file on disk, because other tools read it in place.",
];

describe("what a careful person writes", () => {
    test("raises no finding on twenty human sentences", () => {
        const found = human.flatMap((sentence) => voiceFindings(sentence).map((hit) => `${hit.name}: ${sentence}`));
        expect(found).toEqual([]);
    });
    test("leaves the words in a quote alone: a window's own text is not the writer's voice", () => {
        expect(names('The person sees "Welcome to Policy Plus! Would you like to download them now?" and answers Yes.')).toEqual([]);
    });
    test("leaves a registry key and a name from code alone", () => {
        expect(names("The key is read, and the key's own values are cleared.")).toEqual([]);
    });
    test("does not take a question field for a rhetorical question", () => {
        expect(names("Should the person see a forecast? No rule describes one.", "plan: story open question")).toEqual([]);
    });
});

describe("the app's own sentences", () => {
    const pool: unknown[] = [1, 3, "Alpha", ["Alpha", "Beta"], true];
    const said = (fn: (...args: never[]) => unknown): string[] => {
        const out = new Set<string>();
        const walk = (args: unknown[]) => {
            if (args.length === fn.length) {
                try {
                    const result = fn(...(args as never[]));
                    if (typeof result === "string" && !result.includes("undefined") && !result.includes("NaN")) out.add(result);
                } catch {
                    // this mix of arguments does not suit the function
                }
                return;
            }
            for (const next of pool) walk([...args, next]);
        };
        walk([]);
        return [...out];
    };
    const leaves = (value: unknown): string[] =>
        typeof value === "string"
            ? [value]
            : typeof value === "function"
              ? said(value as (...args: never[]) => unknown)
              : value !== null && typeof value === "object"
                ? Object.values(value).flatMap(leaves)
                : [];
    test("raise no finding, whole sentences or running text", () => {
        const found = leaves(copy).flatMap((text) => voiceFindings(text).map((hit) => `${hit.name}: ${text}`));
        expect(found).toEqual([]);
    });
});

describe("the report", () => {
    test("lists a tell with its rule and severity beside the older rules", () => {
        const { soft } = languageFindings("Ultimately, we leverage a seamless search — and that is the point.", "x");
        const rules = soft.map((finding) => finding.rule);
        expect(rules).toContain("phrasing that reads as boilerplate");
        expect(rules).toContain("a dash used as punctuation");
        expect(soft.find((finding) => finding.rule === "a dash used as punctuation")?.severity).toBe("tell");
    });
    test("does not take a word of the product for a tell", () => {
        expect(languageFindings("The program needs elevated Windows rights; the registry key is read.", "x").soft).toEqual([]);
    });
});
