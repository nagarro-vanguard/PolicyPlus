import { Config, Console, Effect, Layer, Option, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { resolve } from "node:path";
import { checkPayloadContract } from "../shared/read/payload-files";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { readDocumentStrictly } from "../shared/run/json-files";
import { needsAction, runScript } from "../shared/run/run-script";
import { FileAccess } from "../shared/source/file-access";
import { SiteBuilder } from "../shared/source/site-builder";

const LanguageReport = Schema.Struct({
    findings: Schema.Number,
    byRule: Schema.Record(Schema.String, Schema.Number),
    examples: Schema.Array(
        Schema.Struct({
            rule: Schema.String,
            hit: Schema.String,
            where: Schema.String,
            severity: Schema.optionalKey(Schema.String),
        }),
    ),
});

/**
 * Build the app from the payloads write-payloads wrote, into <analysis root>/app, or from the folders the flags name:
 * compose first joins the payloads, the target and the plan into one case folder (beside the output folder unless
 * `--case` names one), then the pages are built from that case alone. Then say what a reader would stumble on: words of
 * the analysis's own machinery or boilerplate phrasing in what the pages say. A record id anywhere fails the build
 * itself, and payloads written for another contract version are refused before it starts. `BUILD_BUNDLE`, when set, is
 * the command the pages offer for a fuller text of a capability.
 * @param flags the folders: the payloads of the analysis, the folder holding a plan's files, the output folder
 * @param flags.analysis the folder of payloads; <analysis root>/payloads when omitted
 * @param flags.plan the folder holding the plan's files, when the pages should show a plan too
 * @param flags.target the Output Root holding the target's files, when the pages should show the target too
 * @param flags.out the folder the pages are written to; <analysis root>/app when omitted
 * @param flags.case the case folder compose writes; beside the output folder when omitted
 * @returns the effect that builds them and prints where they are; SiteBuildFailed naming the step that failed
 */
const buildApp = Effect.fn("buildApp")(function* (flags: {
    readonly analysis: string | undefined;
    readonly plan: string | undefined;
    readonly target: string | undefined;
    readonly out: string | undefined;
    readonly case: string | undefined;
}) {
    const { root, paths } = yield* AnalysisRoot;
    const files = yield* FileAccess;
    const out = flags.out === undefined ? paths.app : resolve(flags.out);
    const analysis = flags.analysis === undefined ? `${root}/payloads` : resolve(flags.analysis);
    const plan = flags.plan === undefined ? undefined : resolve(flags.plan);
    const target = flags.target === undefined ? undefined : resolve(flags.target);
    const caseDir = flags.case === undefined ? undefined : resolve(flags.case);
    const bundleCommand = Option.getOrUndefined(yield* Config.option(Config.NonEmptyString("BUILD_BUNDLE")));
    yield* checkPayloadContract(analysis);
    yield* (yield* SiteBuilder).build({ analysis, plan, target, bundleCommand, out, caseDir });
    yield* Console.log(`app written to ${out}`);
    const reportPath = `${out}/language-report.json`;
    if (!(yield* files.exists(reportPath))) {
        return;
    }
    const report = yield* readDocumentStrictly(reportPath, LanguageReport);
    if (report.findings === 0) {
        return;
    }
    yield* Console.log(
        `${report.findings} places in what the pages say need a look (${out}/language-report.json): ${Object.entries(
            report.byRule,
        )
            .map(([rule, count]) => `${count} × ${rule}`)
            .join(
                "; ",
            )}. The words are the analysis's own or the code's, so reword them through the stage that wrote them.`,
    );
    for (const example of report.examples.slice(0, 5)) {
        yield* Console.log(`  ${example.where}: …${example.hit}…`);
    }
    yield* needsAction;
});

const command = Command.make(
    "build-app",
    {
        analysis: Flag.String("analysis").pipe(Flag.optional),
        plan: Flag.String("plan").pipe(Flag.optional),
        target: Flag.String("target").pipe(Flag.optional),
        out: Flag.String("out").pipe(Flag.optional),
        case: Flag.String("case").pipe(Flag.optional),
    },
    ({ analysis, plan, target, out, case: caseDir }) =>
        buildApp({
            analysis: Option.getOrUndefined(analysis),
            plan: Option.getOrUndefined(plan),
            target: Option.getOrUndefined(target),
            out: Option.getOrUndefined(out),
            case: Option.getOrUndefined(caseDir),
        }),
).pipe(
    Command.withDescription(
        "Builds the app, the pages a person reads an analysis through, from <analysis root>/payloads into <analysis root>/app. compose runs first and joins the payloads and, when given, the target and the plan into one case folder (<output folder>/../case, or `--case <folder>`); the app is then built from that case alone: a page for the system, each area, capability, place and part, with each action and business rule opened on the page that holds it, a search, and the text a reader copies for an assistant. `--analysis <folder>` names another folder of payloads, `--out <folder>` another output folder, `--plan <folder>` the folder holding a modernization plan's files (`.modernization-backlog/` and `work-items/attachments/`) and `--target <folder>` the Output Root holding the finished target's files (`target/`). `BUILD_BUNDLE=<command>` names the command the pages offer for a fuller text of a capability. Run write-payloads first; payloads whose manifest names another contract version are refused. compose fails on a missing fact, or an unknown version; the build fails on a case that does not hold, a broken reference in it, or a record id anywhere a reader can see. Words of the analysis's own machinery or boilerplate phrasing in what the pages say are listed in app/language-report.json and make the run need action. Replaces what is in the output and case folders.",
    ),
);

runScript(command, Layer.mergeAll(AnalysisRoot.layer, SiteBuilder.layer, FileAccess.layer));
