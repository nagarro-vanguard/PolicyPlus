import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { layoutOf } from "../shared/model/layout";
import { readRequest, requestHelp, RequestInvalid } from "../shared/model/request";

const [path] = process.argv.slice(2);
if (path === undefined || path === "--help" || path === "-h") {
    console.log(
        `Usage: read-request.ts <request file>\n\nChecks a modernization request, writes <Output Root>/.modernization-backlog/work/request.json and prints the Output Root.\n${requestHelp}`,
    );
    process.exit(path === undefined ? 2 : 0);
}
try {
    const request = readRequest(resolve(path));
    const file = layoutOf(request.outputRoot).requestJson;
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, `${JSON.stringify(request, null, 2)}\n`);
    console.log(request.outputRoot);
} catch (error) {
    if (error instanceof RequestInvalid) {
        console.error(error.message);
        process.exit(1);
    }
    throw error;
}
