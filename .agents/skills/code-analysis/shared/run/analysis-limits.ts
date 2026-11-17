import { Context } from "effect";

const analysisDefaults = {
    readBudget: 1500,
    longLineMax: 2000,
    minifiedLineMin: 3000,
    encodedRunMin: 1000,
    capabilitiesAndEntitiesJobCharacters: 60_000,
    storeWaitSeconds: 60,
    pathsPrintedMax: 2000,
    studyLinesBudget: 400_000,
    topicsPerJob: 40,
    answersPerReduction: 500,
    summaryFoldersMax: 300,
};

export type AnalysisLimits = typeof analysisDefaults;

export const AnalysisConfig = Context.Reference<AnalysisLimits>("AnalysisConfig", {
    /**
     * The limits and budgets every run uses; code asks for them with `yield* AnalysisConfig`. Why each value is what it is:
     * - `readBudget`: lines in one Map job, small enough for one agent to read every line.
     * - `longLineMax`: bytes in a line beyond which a file is flagged as likely generated or minified.
     * - `minifiedLineMin`: characters in a line, with little whitespace, beyond which no reader can read it: it is accounted
     *   for by a script as an `Unread` record (minified), never mapped.
     * - `encodedRunMin`: characters in one base64-like run beyond which a line is encoded data (an `Unread` record).
     * - `capabilitiesAndEntitiesJobCharacters`: characters of one Capabilities and entities job's units, what its agent
     *   reads at once besides the registry: set at the Map's read budget in characters (1,500 lines at about 40
     *   characters a line), leaving room to open the code it cites; Phase 9 measures it at scale.
     * - `summaryFoldersMax`: the folder rows of the file summary Inventory's agent starts from (G13 of plan 0003): about
     *   300 × 70 bytes, near 21 KB, so the summary fits one agent's reading at any estate size; on fixture C (20M lines)
     *   it had been 40,001 rows, 2.7 MB. Past it the folders are counted one level up, then the largest are kept with
     *   the rest in one row; `remaining` drills down on request.
     * - `pathsPrintedMax`: paths `find-files-in-scope` prints at once, into an agent's context: about 120,000
     *   characters at 60 a path, two of Capabilities and entities' job budgets. Past it the count is printed and the call
     *   refused, so the agent narrows its text; nothing is cut short.
     * - `studyLinesBudget` (L, plan 0003 H1): lines in scope one How it runs job searches. Parts within it are packed
     *   whole into jobs of at most L lines; a part over it is sharded along its folders into areas of at most L. Set
     *   at 400,000 because the live run's studies completed at that size; the pilot measures it again.
     * - `topicsPerJob` (T, H1): topics one job answers: a packed study's, or a concluding job's of the parts' tier. Set
     *   at 40 because the live run's concluding jobs completed at forty topics.
     * - `answersPerReduction` (F, H6): facts one concluding job reads beneath its topics: about 30,000 words at the
     *   live run's 42-word statements. Not measured; past it a topic is refused, not cut short.
     * - `storeWaitSeconds`: how long a command waits for another command's write to the record store before it gives
     *   up: a stage's finish at 50M lines writes for minutes, and a person waiting longer than this should be told.
     * @returns the default limits
     */
    defaultValue: () => analysisDefaults,
});
