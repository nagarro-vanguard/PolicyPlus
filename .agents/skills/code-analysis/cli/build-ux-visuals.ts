import { Console, Effect, Layer, Schema } from "effect";
import { Command } from "effect/cli";
import { AnalysisRoot } from "../shared/run/analysis-root";
import { readDocumentStrictly } from "../shared/run/json-files";
import { needsAction, runScript } from "../shared/run/run-script";
import { FileAccess } from "../shared/source/file-access";
import { SiteBuilder } from "../shared/source/site-builder";

const LanguageReport = Schema.Struct({
    findings: Schema.Number,
    byRule: Schema.Record(Schema.String, Schema.Number),
    examples: Schema.Array(Schema.Struct({ rule: Schema.String, hit: Schema.String, where: Schema.String })),
});

/**
 * Build the pages and figures of ux-visuals from the payloads write-payloads wrote, into <analysis root>/ux-visuals, then
 * say what a reader would stumble on: words of the analysis's own machinery or boilerplate phrasing in what the pages
 * say. A record id anywhere fails the build itself.
 * @returns the effect that builds them and prints where they are; SiteBuildFailed naming the step that failed
 */
const buildUxVisuals = Effect.fn("buildUxVisuals")(function* () {
    const { root } = yield* AnalysisRoot;
    const files = yield* FileAccess;
    const out = `${root}/ux-visuals`;
    yield* (yield* SiteBuilder).build({ payloads: `${root}/payloads`, out });
    yield* Console.log(`ux-visuals written to ${out}`);
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

const command = Command.make("build-ux-visuals", {}, () => buildUxVisuals()).pipe(
    Command.withDescription(
        "Builds ux-visuals, the pages a person reads an analysis through, from <analysis root>/payloads into <analysis root>/ux-visuals: a page for the system, each area, capability, layer, action and screen, a search, and figures drawn from the payloads (what the product offers, who uses it and what it connects to, how it is built, how a capability runs, what a screen starts). Run write-payloads first. A payload that does not match its schema, a figure that does not hold (an unknown id, items over budget, an overlap, an arrow through an item) or a record id anywhere a reader can see fails the build. Words of the analysis's own machinery or boilerplate phrasing in what the pages say are listed in ux-visuals/language-report.json and make the run need action. Replaces what is in ux-visuals.",
    ),
);

runScript(command, Layer.mergeAll(AnalysisRoot.layer, SiteBuilder.layer, FileAccess.layer));
