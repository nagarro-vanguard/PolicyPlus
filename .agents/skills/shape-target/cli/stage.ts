import { resolve } from "node:path";
import { layoutOf } from "../shared/model/layout";
import { abandon, accept, checkJob, done, next, redo, status } from "../shared/jobs/driver";
import { finish } from "../shared/jobs/finish";
import { prepare } from "../shared/jobs/stages";
import type { Stage } from "../shared/jobs/state";

const skillRoot = resolve(import.meta.dir, "..");
const args = process.argv.slice(2);
const rootAt = args.indexOf("--root");
const root = rootAt >= 0 ? args[rootAt + 1] : process.env.MODERNIZATION_ROOT;
const [command, ...rest] = args.filter((_, at) => rootAt < 0 || (at !== rootAt && at !== rootAt + 1));
const stages = ["as-is", "journeys", "architecture", "components"];
const help = `Usage: MODERNIZATION_ROOT=<Output Root> bun stage.ts <command>

prepare <${stages.join("|")}>   make the stage's jobs and their input files
next --limit <n>               print one action as JSON: dispatch (agents to run, each with its prompt), wait, done or stop
done <job>                     the agent of a job of the open batch has finished: gate its output, or read its review
abandon <job>                  the agent crashed; the job is handed out again
redo <job> --instructions <text>   hand a decided job back to its writer, for a gap the stage's final checks found
accept <job>                   decide a job waiting for a fix or a review as it stands, keeping its challenges as disputed
check <job>                    run the job's gate on its output; prints "no gap" or each gap
status                         where every job stands
finish <${stages.join("|")}>    merge the accepted outputs into the run's records`;
if (command === undefined || command === "--help" || root === undefined) {
    console.log(help);
    process.exit(command === "--help" ? 0 : 2);
}
const layout = layoutOf(resolve(root));
const scriptsCommand = `MODERNIZATION_ROOT=${layout.outputRoot} bun ${skillRoot}/cli/stage.ts`;
const stage = rest[0] as Stage;
if (command === "prepare" || command === "finish") {
    if (!stages.includes(stage)) {
        console.log(help);
        process.exit(2);
    }
}
if (command === "prepare") {
    const text = prepare(layout, stage);
    console.log(text);
    process.exit(/jobs prepared/.test(text) ? 0 : 1);
} else if (command === "next") {
    const at = rest.indexOf("--limit");
    console.log(JSON.stringify(next(layout, skillRoot, scriptsCommand, at >= 0 ? Number(rest[at + 1]) : 4), null, 2));
} else if (command === "done") console.log(done(layout, rest[0] ?? ""));
else if (command === "abandon") console.log(abandon(layout, rest[0] ?? ""));
else if (command === "redo") {
    const at = rest.indexOf("--instructions");
    console.log(redo(layout, rest[0] ?? "", at >= 0 ? (rest[at + 1] ?? "") : ""));
} else if (command === "accept") console.log(accept(layout, rest[0] ?? ""));
else if (command === "check") {
    const gaps = checkJob(layout, rest[0] ?? "");
    console.log(gaps.length === 0 ? "no gap" : gaps.map((gap) => `- ${gap}`).join("\n"));
    process.exit(gaps.length === 0 ? 0 : 1);
} else if (command === "status") console.log(status(layout).join("\n"));
else if (command === "finish") {
    const result = finish(layout, stage);
    console.log(result.text);
    process.exit(result.ok ? 0 : 1);
} else {
    console.log(help);
    process.exit(2);
}
