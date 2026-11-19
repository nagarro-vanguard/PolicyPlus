import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deriveCurrent } from "../shared/derive/current";
import { deriveEssence, essenceLeaks } from "../shared/derive/essence";
import { deriveLegacy } from "../shared/derive/legacy";
import { writeManifest } from "../shared/manifest";
import { layoutOf } from "../shared/model/layout";
import { loadChoice, loadLegacy, loadRequest, loadTasks } from "../shared/run";

const [what, rootArg] = process.argv.slice(2);
if ((what !== "legacy" && what !== "current" && what !== "essence") || rootArg === undefined) {
    console.log(`Usage: bun derive.ts <legacy|current|essence> <Output Root>

legacy   reads the analysis's payloads and writes target/legacy.json, the old system's own words, kept apart
current  reads the analysis's payloads/journeys.json (today's tasks, written by the code analysis) and writes target/current.json and target/essence.json, which the as-is decision is made about; a run whose target/current.json exists and whose analysis has no journeys.json keeps that file as it is; exits 1 when the journeys do not cover every entry point and rule once
essence  writes target/essence.json from the confirmed tasks and the person's marks; exits 1 when it carries a name of the old system`);
    process.exit(what === undefined ? 2 : 1);
}
const layout = layoutOf(resolve(rootArg));
const write = (path: string, value: unknown) => {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
};
if (what === "legacy") {
    const sheet = deriveLegacy(layout.payloads);
    write(layout.legacy, sheet);
    writeManifest(layout);
    console.log(
        `${Object.keys(sheet.actions).length} entry points, ${Object.keys(sheet.rules).length} rules, ${Object.keys(sheet.entities).length} kinds of data, ${Object.keys(sheet.externals).length} outside systems`,
    );
} else if (what === "current") {
    const result = deriveCurrent(layout);
    console.log(result.text);
    process.exit(result.ok ? 0 : 1);
} else {
    const legacy = loadLegacy(layout);
    const essence = deriveEssence(
        legacy,
        loadTasks(layout),
        loadRequest(layout),
        loadChoice(layout.choiceAsIs)?.marks ?? [],
    );
    write(layout.essence, essence);
    writeManifest(layout);
    const leaks = essenceLeaks(essence, legacy);
    console.log(
        `${essence.tasks.length} tasks written${leaks.length > 0 ? `; ${leaks.length} names of the old system leak:\n${leaks.slice(0, 20).join("\n")}` : ""}`,
    );
    process.exit(leaks.length > 0 ? 1 : 0);
}
