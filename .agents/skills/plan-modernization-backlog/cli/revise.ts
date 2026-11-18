import { resolve } from "node:path";
import { layoutOf } from "../shared/model/layout";
import { loadRevisions } from "../shared/derive/run";
import { revert, revise, undo } from "../shared/derive/revise";

const [root, command, json, ...rest] = process.argv.slice(2);
const help = `Usage: revise.ts <Output Root> <apply '<json>' [--note <text>] | undo | revert | list>

A change is one of: {"_tag":"rename","story":<key>,"title":<text>}, {"_tag":"edit","story":<key>,"field":"what"|"why"|"criterion","index":<n>,"text":<text>},
{"_tag":"split","story":<key>,"criteria":[<n>...],"title":<text>}, {"_tag":"moveAction","action":<id>,"to":<story key>}.
It is refused if a work item for the story is already created, or if it would break any gate. Order is never edited: it follows what the stories build.`;
if (root === undefined || command === undefined || command === "--help") {
    console.log(help);
    process.exit(command === "--help" ? 0 : 2);
}
const layout = layoutOf(resolve(root));
const show = (outcome: { ok: boolean; message: string; gaps?: string[] }) => {
    console.log(outcome.message);
    for (const gap of outcome.gaps ?? []) console.error(`failing: ${gap}`);
    process.exit(outcome.ok ? 0 : 1);
};
if (command === "apply" && json !== undefined) {
    const at = rest.indexOf("--note");
    show(revise(layout, JSON.parse(json), at >= 0 ? rest[at + 1] : ""));
} else if (command === "undo") show(undo(layout));
else if (command === "revert") show(revert(layout));
else if (command === "list") console.log(JSON.stringify(loadRevisions(layout), null, 2));
else {
    console.log(help);
    process.exit(2);
}
