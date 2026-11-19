import { existsSync, statSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import { z } from "zod";

// The app's only inputs, read from the environment once and checked here: the case folder `compose` wrote and, when the
// caller names one, the command that writes a fuller text for a reader's assistant. Nothing else in the app reads the
// environment (a test scans for it), and the app never reads `astro:env`, which does not check values in the content config.

const Environment = z.object({
    CASE_DIR: z
        .string({ error: "CASE_DIR is not set: build through a skill's build-app script, which composes the case first" })
        .trim()
        .min(1, "CASE_DIR is empty: build through a skill's build-app script, which composes the case first"),
    BUILD_BUNDLE: z
        .string()
        .trim()
        .optional()
        .transform((value) => (value === undefined || value === "" ? undefined : value)),
});

export type BuildConfig = Readonly<{
    /** The case folder: `manifest.json` and the files it lists. */
    caseDir: string;
    /** The command that writes a fuller text of a capability for an assistant, when the caller named one. */
    bundleCommand: string | undefined;
}>;

/**
 * The build's configuration from an environment, checked: the case folder must exist and hold a manifest.
 * @param environment the variables, `process.env` for a build
 * @returns the configuration, frozen
 */
export const configFrom = (environment: Readonly<Record<string, string | undefined>>): BuildConfig => {
    const parsed = Environment.safeParse(environment);
    if (!parsed.success) throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
    const caseDir = isAbsolute(parsed.data.CASE_DIR) ? parsed.data.CASE_DIR : resolve(parsed.data.CASE_DIR);
    if (!existsSync(caseDir) || !statSync(caseDir).isDirectory()) throw new Error(`CASE_DIR ${caseDir} is not a folder`);
    if (!existsSync(join(caseDir, "manifest.json")))
        throw new Error(`CASE_DIR ${caseDir} holds no manifest.json: compose writes the case folder the app reads`);
    return Object.freeze({ caseDir, bundleCommand: parsed.data.BUILD_BUNDLE });
};

let config: BuildConfig | undefined;

/**
 * The configuration of this build, read once.
 * @returns the configuration
 */
export const buildConfig = (): BuildConfig => {
    config ??= configFrom(process.env);
    return config;
};
