import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
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
    }) => Effect.Effect<string, SiteBuildFailed>;
}

/** The shared app, which shows an analysis and, when it is given one, a modernization plan. */
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
        const { PLAN_DIR: _plan, TARGET_DIR: _target, BUILD_BUNDLE: _bundle, ...inherited } = process.env;
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
 * What the app reads from its environment: the folders, and the bundle command when the caller names one. The folders and
 * the command are never inherited from this process, so a build shows only what it was given.
 * @param input what the build was given
 * @returns the environment variables
 * @internal exported for the tests, which check it on its own
 */
export const appEnvironment = (input: Parameters<SiteBuilderOps["build"]>[0]): Record<string, string> => ({
    ANALYSIS_PAYLOADS_DIR: input.analysis,
    APP_OUT: input.out,
    ...(input.plan === undefined ? {} : { PLAN_DIR: input.plan }),
    ...(input.target === undefined ? {} : { TARGET_DIR: input.target }),
    ...(input.bundleCommand === undefined ? {} : { BUILD_BUNDLE: input.bundleCommand }),
});

const siteBuilderOps: SiteBuilderOps = {
    /**
     * Build the pages of the app from a folder of analysis payloads and, when given, a plan: install the app's
     * dependencies when they are not there, copy the design system's stylesheet beside the pages, generate the validation
     * schemas from the payload schemas, then build the static pages into the output folder, failing on any payload that
     * does not match its schema and on any figure that does not hold. Without a plan the pages are the analysis's alone.
     * @param input the folders
     * @param input.analysis the folder write-payloads wrote
     * @param input.plan the folder that holds the plan's files (`.modernization-backlog/` and `work-items/`), when there is one
     * @param input.target the Output Root that holds the target's files (`target/` and `.shape-target/`), when there is one
     * @param input.bundleCommand the command the pages offer to build a bundle with (`BUILD_BUNDLE`), when the caller names one
     * @param input.out the folder the pages are written to
     * @returns what the build printed
     */
    build: ({ analysis, plan, target, bundleCommand, out }) =>
        Effect.gen(function* () {
            const environment = appEnvironment({ analysis, plan, target, bundleCommand, out });
            if (!existsSync(join(template, "node_modules"))) {
                yield* runStep("install the app's dependencies", ["install", "--frozen-lockfile"], environment);
            }
            yield* runStep("generate the validation schemas", ["scripts/generate-schemas.ts"], environment);
            return yield* runStep("build the pages", ["--bun", "x", "astro", "build", "--outDir", out], environment);
        }),
};

export class SiteBuilder extends Context.Service<SiteBuilder, SiteBuilderOps>()("code-analysis/core/SiteBuilder") {
    static readonly layer: Layer.Layer<SiteBuilder> = Layer.succeed(SiteBuilder, SiteBuilder.of(siteBuilderOps));
}
