import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const [folderArg] = process.argv.slice(2);
if (folderArg === undefined || folderArg === "--help") {
    console.log(
        "Usage: bun keep-journeys.ts <payloads folder>\n\nAfter the payloads were copied in without today's journeys (the person confirmed the ones already there), makes the manifest describe the journeys file that is kept.",
    );
    process.exit(folderArg === "--help" ? 0 : 2);
}
const folder = resolve(folderArg);
const manifestPath = join(folder, "manifest.json");
const journeysPath = join(folder, "journeys.json");
if (!existsSync(manifestPath) || !existsSync(journeysPath)) {
    console.log("nothing to keep: the folder has no manifest or no journeys file");
    process.exit(0);
}
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as { files: { path: string; digest: string }[] };
const kept = createHash("sha1").update(readFileSync(journeysPath, "utf8")).digest("hex");
const entry = manifest.files.find((file) => file.path === "journeys.json");
if (entry === undefined) {
    console.log("the manifest lists no journeys file");
    process.exit(0);
}
entry.digest = kept;
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
console.log("the manifest now describes the journeys file that was kept");
