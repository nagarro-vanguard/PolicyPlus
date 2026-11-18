import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Schema } from "effect";
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
    flag("--reason") === undefined
) {
    console.log(`Usage: bun choose.ts <as-is|journeys|architecture|components> <Output Root> --reason <why> [options]

as-is          [--marks <file>]            confirm today's journeys; the file is a JSON list of { of: "<task>#<step>", verdict: hurts|unused|correct|wrong, note? }
journeys       [--all-recommended] [--pick <task>=<variant>]...   confirm one variant per task
architecture   --pick <variant>            confirm one architecture
components                                 confirm the components of the chosen architecture

Writes target/choice-<decision>.json. A decision is confirmed while its file is newer than what it decides on and not older than the decision before it; one is refused while the decision before it is not confirmed.`);
    process.exit(decision === undefined ? 2 : 1);
}
const layout = layoutOf(resolve(rootArg));
const reason = flag("--reason") ?? "";
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
            )
          : decision === "architecture"
            ? chooseArchitecture(layout, flag("--pick") ?? "", reason)
            : chooseComponents(layout, reason);
console.log(result.text);
process.exit(result.ok ? 0 : 1);
