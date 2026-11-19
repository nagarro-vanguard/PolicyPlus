// Opt-in (bun run test:contract): the reader contract on a built site and on the app's own copy. Expected to FAIL
// until Phase 5 of plans/ux-port/PLAN.md; each check fails on its own, naming what it found. The site is
// $CONTRACT_SITE, else this repository's .modernization/app; without one the page checks are skipped.
import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { relative } from "node:path";
import { copyFindings, stringsOfSource, type ContractCheck, type ContractFinding } from "../../src/lib/reader-contract";
import { appRoot, checkSite, copyModules, defaultSite } from "./site";

const present = existsSync(defaultSite);
const report = present ? await checkSite(defaultSite) : undefined;
const copy = copyFindings(
    (
        await Promise.all(
            copyModules().map((file) => stringsOfSource(readFileSync(file, "utf8"), relative(appRoot, file))),
        )
    ).flat(),
);
const hardOf = (findings: readonly ContractFinding[], check: ContractCheck) =>
    findings
        .filter((finding) => finding.check === check && finding.mode === "hard")
        .map((finding) => `${finding.where} (${finding.at}) ${finding.rule}: ${finding.hit}`);

describe.skipIf(!present)(`the pages of ${defaultSite}`, () => {
    for (const check of ["C1", "C2", "C3", "C7", "C9", "C11"] as const) {
        test(`${check} has no hard finding`, () => {
            expect(hardOf(report?.pageFindings ?? [], check)).toEqual([]);
        });
    }
});

describe("the app's copy", () => {
    for (const check of ["C2", "C5", "C7"] as const) {
        test(`${check} has no hard finding`, () => {
            expect(hardOf(copy, check)).toEqual([]);
        });
    }
});
