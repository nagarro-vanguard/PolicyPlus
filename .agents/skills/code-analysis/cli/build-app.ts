import { Console, Effect, Layer, Option, Schema } from "effect";
import { Command, Flag } from "effect/cli";
import { resolve } from "node:path";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { readDocumentStrictly } from "../shared/run/json-files";
import { needsAction, runScript } from "../shared/run/run-script";
import { FileAccess } from "../shared/source/file-access";
import { SiteBuilder } from "../shared/source/site-builder";

const LanguageReport = Schema.Struct({
    findings: Schema.Number,
    byRule: Schema.Record(Schema.String, Schema.Number),
    examples: Schema.Array(Schema.Struct({
            rule: Schema.String,
            hit: Schema.String,
            where: Schema.String,
            severity: Schema.optionalKey(Schema.String),
        })),
});

/**
 * Build the pages and figures of the app from the payloads write-payloads wrote, into <analysis root>/app, or from the
 * folders the flags name, then say what a reader would stumble on: words of the analysis's own machinery or boilerplate
 * phrasing in what the pages say. A record id anywhere fails the build itself.
 * @param flags the folders: the payloads of the analysis, the folder holding a plan's files, the output folder
 * @param flags.analysis the folder of payloads; <analysis root>/payloads when omitted
 * @param flags.plan the folder holding the plan's files, when the pages should show a plan too
 * @param flags.target the Output Root holding the target's files, when the pages should show the target too
 * @param flags.out the folder the pages are written to; <analysis root>/app when omitted
 * @returns the effect that builds them and prints where they are; SiteBuildFailed naming the step that failed
 */
const buildApp = Effect.fn("buildApp")(function* (flags: {
    readonly analysis: string | undefined;
    readonly plan: string | undefined;
    readonly target: string | undefined;
    readonly out: string | undefined;
}) {
    const { root, paths } = yield* AnalysisRoot;
    const files = yield* FileAccess;
    const out = flags.out === undefined ? paths.app : resolve(flags.out);
    const analysis = flags.analysis === undefined ? `${root}/payloads` : resolve(flags.analysis);
    const plan = flags.plan === undefined ? undefined : resolve(flags.plan);
    const target = flags.target === undefined ? undefined : resolve(flags.target);
    yield* (yield* SiteBuilder).build({ analysis, plan, target, out });
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
    },
    ({ analysis, plan, target, out }) =>
        buildApp({
            analysis: Option.getOrUndefined(analysis),
            plan: Option.getOrUndefined(plan),
            target: Option.getOrUndefined(target),
            out: Option.getOrUndefined(out),
        }),
).pipe(
    Command.withDescription(
        "Builds the app, the pages a person reads an analysis through, from <analysis root>/payloads into <analysis root>/app: a page for the system, each area, capability, layer, action and screen, a search, and figures drawn from the payloads (what the product offers, who uses it and what it connects to, how it is built, how a capability runs, what a screen starts). `--analysis <folder>` names another folder of payloads, `--out <folder>` another output folder, and `--plan <folder>` the folder holding a modernization plan's files (`.modernization-backlog/` and `work-items/`), which adds the pages of the plan, and `--target <folder>` the Output Root holding the target's files (`target/` and `.shape-target/`), which adds the pages of the target. Run write-payloads first. A payload that does not match its schema, a figure that does not hold (an unknown id, items over budget, an overlap, an arrow through an item) or a record id anywhere a reader can see fails the build. Words of the analysis's own machinery or boilerplate phrasing in what the pages say are listed in app/language-report.json and make the run need action. Replaces what is in the output folder.",
    ),
);

runScript(command, Layer.mergeAll(AnalysisRoot.layer, SiteBuilder.layer, FileAccess.layer));
