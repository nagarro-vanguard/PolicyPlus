#!/usr/bin/env bun
import { dirname, join } from "node:path";
import { layerJobs, load, ready, workspace } from "../shared/scaffold";

const skillDir = join(dirname(import.meta.path), "..");
const usage = `usage:
  scaffold.ts workspace <Output Root> --work-tracking <file> [--force] [--templates <dir>]
  scaffold.ts layers <Output Root>
  scaffold.ts ready <Output Root>`;

const fail = (message: string): never => {
    console.error(message);
    process.exit(1);
};
const flag = (args: string[], name: string) => {
    const at = args.indexOf(name);
    return at < 0 ? undefined : args[at + 1];
};

const [command, root, ...rest] = process.argv.slice(2);
if (!command || !root) fail(usage);
try {
    if (command === "workspace") {
        const file = flag(rest, "--work-tracking") ?? fail("--work-tracking <file> is required");
        const result = workspace(root!, file, {
            force: rest.includes("--force"),
            templates: flag(rest, "--templates"),
            skillDir,
        });
        for (const path of result.written) console.log(`wrote ${path}`);
        for (const path of result.templates) console.log(`template ${path}`);
        for (const message of result.differs) console.error(message);
        if (result.differs.length > 0) process.exit(1);
        console.log(`workspace ok: ${result.written.length} written, ${result.unchanged.length} unchanged`);
    } else if (command === "layers") {
        console.log(JSON.stringify(layerJobs(load(root!)), null, 2));
    } else if (command === "ready") {
        const problems = ready(root!);
        if (problems.length === 0) console.log("ok");
        else {
            console.log(problems.join("\n"));
            process.exit(1);
        }
    } else fail(usage);
} catch (error) {
    fail((error as Error).message);
}
