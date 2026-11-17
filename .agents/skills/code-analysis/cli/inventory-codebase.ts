import { Console, Effect, Layer, Option } from "effect";
import { refuseWhileBatchOpen } from "../shared/jobs/loop-jobs";
import { Argument, Command, Flag } from "effect/cli";
import { AnalysisRequest } from "../shared/run/analysis-request";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { carryOneJobCommand } from "../shared/jobs/carry-command";
import { GitRepository } from "../shared/source/git-repository";
import { readDocument, readRecords } from "../shared/run/json-files";
import { requestIsCurrent } from "../shared/store/request-guard";
import { needsAction, rootServices, runScript } from "../shared/run/run-script";
import { ManifestFile } from "../shared/model/schemas/file-listing";
import { registeredShapes } from "../shared/model/registered-shapes";
import { checkInventory } from "../stages/inventory/check-tech-stack";
import { finishInventory } from "../stages/inventory/finish-inventory";
import { inventoryLoop, listInventory } from "../stages/inventory/inventory-loop";
import { loopCommands, freshFlag, withFresh } from "../shared/jobs/loop-commands";
import { carryTechStack, prepareTechStack } from "../stages/inventory/tech-stack-job";
import { leavingRule, leftOut } from "../shared/source/left-out";
import { leftOutByRule, remainingByFolder } from "../stages/inventory/remaining-scope";

/**
 * The run's analysis root, its paths and its settings.
 * @returns the root, the paths, and the request's settings, as read
 */
const runSettings = Effect.fnUntraced(function* () {
    const { root, paths } = yield* AnalysisRoot;
    return { root, paths, request: yield* readDocument(paths.analysisRequest, AnalysisRequest) };
});

/**
 * `list`: list and measure every file the source roots' repositories track, and every file of a root outside git; write
 * the inventory and the file summary, and print what was skipped.
 * @returns the effect that lists
 */
const listStep = Effect.fn("listStep")(function* () {
    const { listed, inScope, skipped } = yield* listInventory((yield* AnalysisRoot).root);
    for (const entry of skipped) {
        yield* Console.error(`skipped ${entry.path} (${entry.why})`);
    }
    yield* Console.log(
        `${listed} tracked files listed, ${inScope} in scope after Leave Out, ${skipped.length} skipped`,
    );
});

/**
 * `prepare`: make Inventory's one job ready for its next run and print both agents' named arguments,
 * `{profile, review}`, the feedback last in each.
 * @param words the person's feedback on the last stack and scope, when they give it
 * @returns the effect that prepares the one job of Inventory
 */
const prepareStep = Effect.fn("prepareStep")(function* (words: string | undefined) {
    yield* requestIsCurrent();
    const { root, request } = yield* runSettings();
    yield* refuseWhileBatchOpen("inventory");
    yield* Console.log(JSON.stringify(yield* prepareTechStack(root, request.sourceRoots, words), null, 2));
});

/**
 * `check`: Inventory's gate, and the review's verdicts once it is written, printing each gap, or `no gap`.
 * @returns the effect that checks; the run must act when there is a gap
 */
const checkStep = Effect.fn("checkStep")(function* () {
    const { root } = yield* AnalysisRoot;
    const gaps = yield* checkInventory(root);
    yield* Console.log(gaps.length ? gaps.join("\n") : "no gap");
    if (gaps.length) {
        yield* needsAction;
    }
});

/**
 * `remaining`: both sides of the scope once the request's Leave Out is applied (D115): what is still in scope, as the
 * folders holding the most lines, each with its share and the running share; then what each rule leaves out, with its
 * own largest folders. The scope is judged against the whole.
 * @param count how many folders to print, the largest, for what stays and for each rule
 * @returns the effect that prints them
 */
const remainingStep = Effect.fn("remainingStep")(function* (count: number) {
    const { paths, request } = yield* runSettings();
    const inventory = yield* readRecords(paths.inventory, ManifestFile);
    const remaining = remainingByFolder(inventory, leftOut(request), count);
    const left = leftOutByRule(inventory, leavingRule(request), count);
    const share = (lines: number) => `${((100 * lines) / remaining.lines).toFixed(1)}%`;
    let running = 0;
    const lines = [
        `${remaining.lines} lines in ${remaining.files} files still in scope (a copy counted once); the largest folders, by the files directly in each (lines, files, share, running share):`,
        ...remaining.largest.map((folder) => {
            running += folder.lines;
            return `  ${folder.lines} ${folder.files} ${share(folder.lines)} ${share(running)} ${folder.folder}`;
        }),
        `Left out, by the Leave Out rule that leaves each file out (lines, files; then the rule's largest folders):`,
        ...left.flatMap((rule) => [
            `  ${rule.lines} ${rule.files} ${rule.pattern}`,
            ...rule.largest.map((folder) => `    ${folder.lines} ${folder.files} ${folder.folder}`),
        ]),
    ];
    yield* Console.log(lines.join("\n"));
});

/**
 * `finish`: decide Inventory's one job by its review; once written, print how many files and lines are in scope; to
 * redo, say to run its fix from `prepare`; refused, say its checks still fail and where its feedback is.
 * @returns the effect that finishes Inventory, marking the run as needing action unless the job was accepted
 */
const finishStep = Effect.fn("finishStep")(function* () {
    const { outcome, manifest } = yield* finishInventory((yield* AnalysisRoot).root);
    const checks = outcome.checks.length ? `: ${outcome.checks.map((item) => item.said).join("; ")}` : "";
    yield* Console.log(`profile-tech-stack: ${outcome.outcome}${checks}`);
    if (outcome.outcome === "accepted") {
        const lines = manifest.reduce((total, file) => total + file.lines, 0);
        yield* Console.log(`${manifest.length} files and ${lines} lines in scope`);
        return;
    }
    yield* Console.log(
        outcome.outcome === "redo"
            ? "no accepted records written; run its fix from prepare"
            : "no accepted records written; refused: its checks still fail after its fix, and its feedback says why",
    );
    yield* needsAction;
});

const subcommands = [
    Command.make("list", {}, listStep).pipe(
        Command.withDescription(
            "Lists and measures every file the source roots' repositories track, so their .gitignore files are honoured, and every file of a root outside git; records how Read sees each; writes the inventory and the file summary.",
        ),
    ),
    Command.make(
        "prepare",
        { words: Flag.String("custom-instructions").pipe(Flag.optional), fresh: freshFlag },
        ({ words, fresh }) => withFresh("inventory", fresh, prepareStep(Option.getOrUndefined(words))),
    ).pipe(
        Command.withDescription(
            "Empties Inventory's one job (its output, review and report) and prints both agents' named arguments, {profile, review}; --custom-instructions gives the person's feedback on its last stack and scope (refused before it wrote one), which both receive as customInstructions. Refused while a batch is open.",
        ),
    ),
    carryOneJobCommand("carry", carryTechStack),
    ...loopCommands(inventoryLoop),
    Command.make("check", {}, checkStep).pipe(
        Command.withDescription(
            "Inventory's gate: every text-file extension in scope is covered, every cited line is in a listed file, the parts are folders holding code; once the review is written, its challenges and the gate on what it leaves. Necessary, not sufficient.",
        ),
    ),
    Command.make("remaining", { count: Argument.Int("count") }, ({ count }) => remainingStep(count)).pipe(
        Command.withDescription(
            "Prints both sides of the scope, the request's Leave Out as it stands applied: the <count> folders holding the most lines still in scope, each with its share and the running share; then each Leave Out rule that leaves files out, with its lines, its files and its <count> largest folders.",
        ),
    ),
    Command.make("finish", {}, () => finishStep()).pipe(
        Command.withDescription(
            "Applies the review: refuses while it leaves a gap or How it runs has accepted records; sets the job aside for its one fix with its feedback, refuses it while its checks still fail after its fix, or writes Inventory's accepted records with their review labels in one transaction: the manifest, the parts, the stack and the facts; prints how many files and lines are in scope.",
        ),
    ),
];

runScript(
    Command.make("inventory-codebase").pipe(
        Command.withDescription(
            "Inventory: list the tracked files, prepare profile-tech-stack (the stack and the parts) and its review, check them, and finish with what the review accepts, which the person judges.",
        ),
        Command.withSubcommands(subcommands),
    ),
    Layer.mergeAll(rootServices, GitRepository.layer, registeredShapes),
);
