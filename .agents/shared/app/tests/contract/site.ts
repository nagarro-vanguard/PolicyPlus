// Runs the reader contract over a built site, the app's copy modules and the data the site was built from. Reads only.
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import {
    copyFindings,
    dataFindings,
    enumsOf,
    pageFindings,
    proseOf,
    stringsOfSource,
    type ContractFinding,
} from "../../src/lib/reader-contract";

export const appRoot = join(import.meta.dir, "../..");
/** The site the conductor builds for this repository, when there is one. */
export const defaultSite = process.env.CONTRACT_SITE ?? join(appRoot, "../../../.modernization/app");

const walk = (folder: string): string[] =>
    !existsSync(folder)
        ? []
        : readdirSync(folder).flatMap((name) => {
              const path = join(folder, name);
              return statSync(path).isDirectory() ? walk(path) : [path];
          });

/** The copy modules: every sentence the app writes itself. */
export const copyModules = () =>
    readdirSync(join(appRoot, "src/lib"))
        .filter((name) => /^(?:copy|words|[\w-]+-copy|[\w-]+-words)\.ts$/.test(name))
        .map((name) => join(appRoot, "src/lib", name));

/** The folders beside a built site that hold its schemas and data (the conductor's Output Root layout). */
const besideSite = (site: string) => {
    const root = dirname(site);
    const schemaDirs = [
        join(root, ".code-analysis/payloads/schema"),
        join(root, ".modernization-backlog/payloads/schema"),
        join(root, "target"),
    ];
    const dataFiles = [
        ...walk(join(root, ".code-analysis/payloads")).filter(
            (file) => file.endsWith(".json") && !file.includes("/schema/"),
        ),
        ...walk(join(root, "target")).filter((file) => file.endsWith(".json") && !file.endsWith(".schema.json")),
        join(root, ".modernization-backlog/payloads/plan.json"),
    ].filter((file) => existsSync(file));
    return { root, schemaDirs, dataFiles };
};

export type SiteReport = {
    readonly site: string;
    readonly pages: number;
    readonly pageFindings: readonly ContractFinding[];
    readonly copyFindings: readonly ContractFinding[];
    readonly dataFindings: readonly ContractFinding[];
};

/**
 * Every reader-contract finding for a built site.
 * @param site the built site's folder
 * @returns the findings of its pages, the app's copy and the data beside it
 */
export const checkSite = async (site: string): Promise<SiteReport> => {
    const { root, schemaDirs, dataFiles } = besideSite(site);
    const schemas = schemaDirs
        .flatMap((dir) => walk(dir))
        .filter((file) => file.endsWith(".schema.json"))
        .map((file) => JSON.parse(readFileSync(file, "utf8")) as unknown);
    const enums = enumsOf(schemas);
    const pages = walk(site).filter((file) => file.endsWith(".html"));
    const onPages: ContractFinding[] = [];
    for (const file of pages)
        onPages.push(...(await pageFindings(readFileSync(file, "utf8"), relative(site, file), { enums })));
    const strings = (
        await Promise.all(
            copyModules().map((file) => stringsOfSource(readFileSync(file, "utf8"), relative(appRoot, file))),
        )
    ).flat();
    // A `context` field is the text handed to a coding assistant, not shown to a reader.
    const records = dataFiles
        .flatMap((file) => proseOf(JSON.parse(readFileSync(file, "utf8")) as unknown, relative(root, file)))
        .filter((record) => !record.field.includes(".context."));
    return {
        site,
        pages: pages.length,
        pageFindings: onPages,
        copyFindings: copyFindings(strings),
        dataFindings: dataFindings(records),
    };
};

/** Counts by check and mode, then by rule. */
export const tally = (findings: readonly ContractFinding[]) => {
    const byCheck = new Map<string, { hard: number; report: number }>();
    const byRule = new Map<string, number>();
    for (const finding of findings) {
        const entry = byCheck.get(finding.check) ?? { hard: 0, report: 0 };
        entry[finding.mode] += 1;
        byCheck.set(finding.check, entry);
        const key = `${finding.check} ${finding.mode}: ${finding.rule}`;
        byRule.set(key, (byRule.get(key) ?? 0) + 1);
    }
    return { byCheck, byRule };
};
