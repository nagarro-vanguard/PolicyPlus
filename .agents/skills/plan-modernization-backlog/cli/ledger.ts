import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Schema } from "effect";
import { layoutOf } from "../shared/model/layout";
import { Ledger, LedgerEntry } from "../shared/model/ledger";
import { writeJson } from "../shared/derive/run";

const [root, command, key, ...rest] = process.argv.slice(2);
const help = `Usage: ledger.ts <Output Root> <show|reviewed|set <key> [--status s] [--item x] [--branch b] [--worktree w] [--pr p] [--result r]>

The ledger records what was done with each work item; people and the conductor write it, never an agent's judgment.`;
if (root === undefined || command === undefined || command === "--help") {
    console.log(help);
    process.exit(command === "--help" ? 0 : 2);
}
const layout = layoutOf(resolve(root));
const read = (): Ledger =>
    existsSync(layout.ledger)
        ? Schema.decodeUnknownSync(Ledger)(JSON.parse(readFileSync(layout.ledger, "utf8")))
        : { items: {} };
const ledger = read();
if (command === "show") {
    console.log(JSON.stringify(ledger, null, 2));
} else if (command === "reviewed") {
    writeJson(layout.ledger, { ...ledger, reviewed: new Date().toISOString() });
    console.log("the plan is marked reviewed");
} else if (command === "set" && key !== undefined) {
    const entry: Record<string, string> = { ...(ledger.items[key] ?? { status: "planned" }) };
    for (let at = 0; at < rest.length; at += 2) {
        const flag = rest[at]?.replace(/^--/, "");
        const value = rest[at + 1];
        if (
            flag === undefined ||
            value === undefined ||
            !["status", "item", "branch", "worktree", "pr", "result"].includes(flag)
        ) {
            console.error(`unknown or incomplete flag ${rest[at] ?? ""}`);
            process.exit(2);
        }
        entry[flag] = value;
    }
    const checked = Schema.decodeUnknownSync(LedgerEntry)(entry);
    writeJson(layout.ledger, { ...ledger, items: { ...ledger.items, [key]: checked } });
    console.log(`${key}: ${checked.status}`);
} else {
    console.log(help);
    process.exit(2);
}
