import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { Context, Effect, Layer } from "effect";
import { skillRoot } from "../run/analysis-layout";
import { SiteBuildFailed } from "../run/script-errors";

export interface SiteBuilderOps {
    readonly build: (input: {
        readonly analysis: string;
        readonly plan?: string | undefined;
        readonly target?: string | undefined;
        readonly bundleCommand?: string | undefined;
        readonly out: string;
        readonly caseDir?: string | undefined;
    }) => Effect.Effect<string, SiteBuildFailed>;
}

/** The shared app, which shows an analysis and, when it is given one, a modernization plan, through the case compose writes. */
const template = join(skillRoot, "..", "..", "shared", "app");

/**
 * Run one step of the build in the template's folder, a failure or a non-zero exit being an error naming the step.
 * @param step what the step does, for the error
 * @param args bun's arguments
 * @param environment what the app reads from its environment
 * @returns what the step printed
 */
const runStep = (step: string, args: readonly string[], environment: Record<string, string>) =>
    Effect.suspend(() => {
        const {
            CASE_DIR: _case,
            BUILD_BUNDLE: _bundle,
            PLAN_DIR: _plan,
            TARGET_DIR: _target,
            ANALYSIS_PAYLOADS_DIR: _payloads,
            ...inherited
        } = process.env;
        const ran = spawnSync("bun", [...args], {
            cwd: template,
            env: { ...inherited, ...environment },
            encoding: "utf8",
            maxBuffer: 1 << 28,
        });
        if (ran.error) {
            return Effect.fail(new SiteBuildFailed({ step, cause: ran.error }));
        }
        if (ran.status !== 0) {
            return Effect.fail(
                new SiteBuildFailed({ step, cause: `exit ${ran.status}: ${ran.stderr.trim()}\n${ran.stdout.trim()}` }),
            );
        }
        return Effect.succeed(ran.stdout);
    });

/**
 * The case folder the app is built from: beside the output folder (`<root>/case` for `<root>/app`) unless one is named.
 * @param input what the build was given
 * @returns the folder
 */
const caseDirOf = (input: Parameters<SiteBuilderOps["build"]>[0]) =>
    input.caseDir === undefined ? join(dirname(input.out), "case") : input.caseDir;

/**
 * compose's arguments: the payloads, the target's and the plan's Output Roots when given, and the case folder it writes.
 * @param input what the build was given
 * @returns bun's arguments, run in the app's folder
 */
const composeArgs = (input: Parameters<SiteBuilderOps["build"]>[0]): string[] => [
    "compose/cli.ts",
    "--payloads",
    input.analysis,
    ...(input.target === undefined ? [] : ["--target", input.target]),
    ...(input.plan === undefined ? [] : ["--plan", input.plan]),
    "--out",
    caseDirOf(input),
];

/**
 * What the app reads from its environment: the case folder and, when the caller names one, the bundle command (the
 * assistant copy). Neither is ever inherited from this process, so a build shows only what it was given.
 * @param input what the build was given
 * @returns the environment variables
 */
const appEnvironment = (input: Parameters<SiteBuilderOps["build"]>[0]): Record<string, string> => ({
    CASE_DIR: caseDirOf(input),
    ...(input.bundleCommand === undefined ? {} : { BUILD_BUNDLE: input.bundleCommand }),
});

const siteBuilderOps: SiteBuilderOps = {
    /**
     * Build the pages of the app from a folder of analysis payloads and, when given, a target and a plan: install the
     * app's dependencies when they are not there, compose the case (the one folder the app reads; compose fails on a
     * missing fact, or an unknown version), generate the collections from compose's contract,
     * then build the static pages from the case into the output folder. Without a plan the pages are the analysis's alone.
     * @param input the folders
     * @param input.analysis the folder write-payloads wrote
     * @param input.plan the folder that holds the plan's files (`.modernization-backlog/` and `work-items/attachments/`), when there is one
     * @param input.target the Output Root that holds the target's files (`target/` and `.shape-target/`), when there is one
     * @param input.bundleCommand the command the pages offer to build a bundle with (`BUILD_BUNDLE`), when the caller names one
     * @param input.out the folder the pages are written to
     * @param input.caseDir the case folder compose writes; beside the output folder when omitted
     * @returns what the build printed
     */
    build: (input) =>
        Effect.gen(function* () {
            const { out } = input;
            const environment = appEnvironment(input);
            if (!existsSync(join(template, "node_modules"))) {
                yield* runStep("install the app's dependencies", ["install", "--frozen-lockfile"], environment);
            }
            yield* runStep("compose the case the app reads", composeArgs(input), environment);
            yield* runStep(
                "generate the collections from compose's contract",
                ["scripts/generate-schemas.ts"],
                environment,
            );
            return yield* runStep("build the pages", ["--bun", "x", "astro", "build", "--outDir", out], environment);
        }),
};

export class SiteBuilder extends Context.Service<SiteBuilder, SiteBuilderOps>()("code-analysis/core/SiteBuilder") {
    static readonly layer: Layer.Layer<SiteBuilder> = Layer.succeed(SiteBuilder, SiteBuilder.of(siteBuilderOps));
}
