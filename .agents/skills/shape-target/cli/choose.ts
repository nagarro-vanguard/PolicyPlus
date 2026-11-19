import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Schema } from "effect";
import { requestChanges } from "../shared/changes";
import { chooseArchitecture, chooseAsIs, chooseComponents, chooseJourneys } from "../shared/choose";
import { layoutOf } from "../shared/model/layout";
import { Mark } from "../shared/model/records";

const [decision, rootArg, ...rest] = process.argv.slice(2);
const flag = (name: string) => {
    const at = rest.indexOf(name);
    return at >= 0 ? rest[at + 1] : undefined;
};
const many = (name: string) => rest.flatMap((each, at) => (each === name ? [rest[at + 1] ?? ""] : []));
if (
    (decision !== "as-is" && decision !== "journeys" && decision !== "architecture" && decision !== "components") ||
    rootArg === undefined ||
    (flag("--reason") === undefined && flag("--changes") === undefined)
) {
    console.log(`Usage: bun choose.ts <as-is|journeys|architecture|components> <Output Root> --reason <why> [options]

as-is          [--marks <file>]            confirm today's journeys; the file is a JSON list of { of: "<task>#<step>", verdict: hurts|unused|correct|wrong, note? }
journeys       [--all-recommended] [--pick <task>=<variant>]... [--accept-disputes]   confirm one variant per task
architecture   --pick <variant> [--accept-disputes]                confirm one architecture
components                                 confirm the components of the chosen architecture

Instead of --reason, \`--changes "<text>" [--task <id> | --domain <name>]\` asks for changes: it withdraws the confirmation (so the decisions after it wait) and says how to apply them.

A pick that the reviewer's challenges are still open on is refused and the challenges are printed: show them to the person, and once they accept them confirm again with --accept-disputes, which records them in the decision.

Writes target/choice-<decision>.json, with the hash of the file decided on, and a copy of that file in target/confirmed/<decision>.json. A decision is confirmed while that file keeps the hash and the decision before it is confirmed and not newer; one is refused while the decision before it is not confirmed.`);
    process.exit(decision === undefined ? 2 : 1);
}
const layout = layoutOf(resolve(rootArg));
const reason = flag("--reason") ?? "";
if (flag("--changes") !== undefined) {
    const asked = requestChanges(layout, decision, flag("--changes") ?? "", {
        ...(flag("--task") === undefined ? {} : { task: flag("--task") }),
        ...(flag("--domain") === undefined ? {} : { domain: flag("--domain") }),
    });
    console.log(asked.text);
    process.exit(asked.ok ? 0 : 1);
}
const result =
    decision === "as-is"
        ? chooseAsIs(
              layout,
              flag("--marks") === undefined
                  ? []
                  : Schema.decodeUnknownSync(Schema.Array(Mark))(
                        JSON.parse(readFileSync(resolve(flag("--marks") ?? ""), "utf8")),
                    ),
              reason,
          )
        : decision === "journeys"
          ? chooseJourneys(
                layout,
                Object.fromEntries(
                    many("--pick").map((pair) => [pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1)]),
                ),
                rest.includes("--all-recommended"),
                reason,
                rest.includes("--accept-disputes"),
            )
          : decision === "architecture"
            ? chooseArchitecture(layout, flag("--pick") ?? "", reason, rest.includes("--accept-disputes"))
            : chooseComponents(layout, reason);
console.log(result.text);
process.exit(result.ok ? 0 : 1);
