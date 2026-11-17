import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Context, Effect, Layer } from "effect";
import { skillRoot } from "../run/analysis-layout";
import { SiteBuildFailed } from "../run/script-errors";

export interface SiteBuilderOps {
    readonly build: (input: {
        readonly payloads: string;
        readonly out: string;
    }) => Effect.Effect<string, SiteBuildFailed>;
}

const template = join(skillRoot, "stages", "publish", "ux-visuals");
const designSystemStyles = join(skillRoot, "..", "..", "shared", "page-components", "assets", "page.css");

/**
 * Run one step of the build in the template's folder, a failure or a non-zero exit being an error naming the step.
 * @param step what the step does, for the error
 * @param args bun's arguments
 * @param payloads the folder of payloads, handed to the template through the environment
 * @param out the folder the pages are written to
 * @returns what the step printed
 */
const runStep = (step: string, args: readonly string[], payloads: string, out: string) =>
    Effect.suspend(() => {
        const ran = spawnSync("bun", [...args], {
            cwd: template,
            env: { ...process.env, PAYLOADS_DIR: payloads, UX_VISUALS_OUT: out },
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
     * Build the pages of ux-visuals from a folder of payloads: install the template's dependencies when they are not
     * there, copy the design system's stylesheet beside the pages, generate the validation schemas from the payload
     * schemas, then build the static pages into the output folder, failing on any payload that does not match its schema and on any
     * figure that does not hold.
     * @param input the payloads' folder and the output folder
     * @param input.payloads the folder write-payloads wrote
     * @param input.out the folder the pages are written to
     * @returns what the build printed
     */
    build: ({ payloads, out }) =>
        Effect.gen(function* () {
            if (!existsSync(join(template, "node_modules"))) {
                yield* runStep("install the template's dependencies", ["install", "--frozen-lockfile"], payloads, out);
            }
            yield* Effect.try({
                try: () => {
                    mkdirSync(join(template, "public"), { recursive: true });
                    copyFileSync(designSystemStyles, join(template, "public", "page.css"));
                },
                catch: (cause) => new SiteBuildFailed({ step: "copy the design system's stylesheet", cause }),
            });
            yield* runStep("generate the validation schemas", ["scripts/generate-schemas.ts"], payloads, out);
            return yield* runStep("build the pages", ["--bun", "x", "astro", "build", "--outDir", out], payloads, out);
        }),
};

export class SiteBuilder extends Context.Service<SiteBuilder, SiteBuilderOps>()("code-analysis/core/SiteBuilder") {
    static readonly layer: Layer.Layer<SiteBuilder> = Layer.succeed(SiteBuilder, SiteBuilder.of(siteBuilderOps));
}
