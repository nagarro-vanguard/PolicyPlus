import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { deriveEssence, essenceLeaks } from "../shared/derive/essence";
import { deriveLegacy } from "../shared/derive/legacy";
import { layoutOf } from "../shared/model/layout";
import { loadChoice, loadLegacy, loadRequest, loadTasks } from "../shared/run";

const [what, rootArg] = process.argv.slice(2);
if ((what !== "legacy" && what !== "essence") || rootArg === undefined) {
    console.log(`Usage: bun derive.ts <legacy|essence> <Output Root>

legacy   reads the analysis's payloads and writes target/legacy.json, the old system's own words, kept apart
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
    console.log(
        `${Object.keys(sheet.actions).length} entry points, ${Object.keys(sheet.rules).length} rules, ${Object.keys(sheet.entities).length} kinds of data, ${Object.keys(sheet.externals).length} outside systems`,
    );
} else {
    const legacy = loadLegacy(layout);
    const essence = deriveEssence(
        legacy,
        loadTasks(layout),
        loadRequest(layout),
        loadChoice(layout.choiceAsIs)?.marks ?? [],
    );
    write(layout.essence, essence);
    const leaks = essenceLeaks(essence, legacy);
    console.log(
        `${essence.tasks.length} tasks written${leaks.length > 0 ? `; ${leaks.length} names of the old system leak:\n${leaks.slice(0, 20).join("\n")}` : ""}`,
    );
    process.exit(leaks.length > 0 ? 1 : 0);
}
