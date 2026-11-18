import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Context, Effect, Layer } from "effect";
import { skillRoot } from "../run/analysis-layout";
import { SiteBuildFailed } from "../run/script-errors";

export interface SiteBuilderOps {
    readonly build: (input: {
        readonly analysis: string;
        readonly plan?: string | undefined;
        readonly out: string;
    }) => Effect.Effect<string, SiteBuildFailed>;
}

/** The shared app, which shows an analysis and, when it is given one, a modernization plan. */
const template = join(skillRoot, "..", "..", "shared", "app");
const designSystemStyles = join(skillRoot, "..", "..", "shared", "page-components", "assets", "page.css");

/**
 * Run one step of the build in the template's folder, a failure or a non-zero exit being an error naming the step.
 * @param step what the step does, for the error
 * @param args bun's arguments
 * @param environment what the app reads from its environment
 * @returns what the step printed
 */
const runStep = (step: string, args: readonly string[], environment: Record<string, string>) =>
    Effect.suspend(() => {
        const { PLAN_DIR: _inherited, ...inherited } = process.env;
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

const siteBuilderOps: SiteBuilderOps = {
    /**
     * Build the pages of the app from a folder of analysis payloads and, when given, a plan: install the app's
     * dependencies when they are not there, copy the design system's stylesheet beside the pages, generate the validation
     * schemas from the payload schemas, then build the static pages into the output folder, failing on any payload that
     * does not match its schema and on any figure that does not hold. Without a plan the pages are the analysis's alone.
     * @param input the folders
     * @param input.analysis the folder write-payloads wrote
     * @param input.plan the folder that holds the plan's files (`.modernization-backlog/` and `work-items/`), when there is one
     * @param input.out the folder the pages are written to
     * @returns what the build printed
     */
    build: ({ analysis, plan, out }) =>
        Effect.gen(function* () {
            const environment: Record<string, string> = {
                ANALYSIS_PAYLOADS_DIR: analysis,
                APP_OUT: out,
                ...(plan === undefined ? {} : { PLAN_DIR: plan }),
            };
            if (!existsSync(join(template, "node_modules"))) {
                yield* runStep("install the app's dependencies", ["install", "--frozen-lockfile"], environment);
            }
            yield* Effect.try({
                try: () => {
                    mkdirSync(join(template, "public"), { recursive: true });
                    copyFileSync(designSystemStyles, join(template, "public", "page.css"));
                },
                catch: (cause) => new SiteBuildFailed({ step: "copy the design system's stylesheet", cause }),
            });
            yield* runStep("generate the validation schemas", ["scripts/generate-schemas.ts"], environment);
            return yield* runStep("build the pages", ["--bun", "x", "astro", "build", "--outDir", out], environment);
        }),
};

export class SiteBuilder extends Context.Service<SiteBuilder, SiteBuilderOps>()("code-analysis/core/SiteBuilder") {
    static readonly layer: Layer.Layer<SiteBuilder> = Layer.succeed(SiteBuilder, SiteBuilder.of(siteBuilderOps));
}
