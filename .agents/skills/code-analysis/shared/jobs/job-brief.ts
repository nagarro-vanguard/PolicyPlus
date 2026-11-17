import { Effect } from "effect";
import { FileAccess } from "../source/file-access";

export type JobBrief = {
    readonly rules: string;
    readonly commands: { readonly check: string; readonly carry: string };
    readonly reads: ReadonlyArray<readonly [string, string]>;
    readonly supporting?: string;
};

/**
 * Write the brief of one job, the one document an agent works from beside its job: the commands that check and carry its
 * output, the rules of its kind inlined, and what to read besides (what earlier stages established, the Supporting
 * Material the request lists). A derived input, named in the job's arguments.
 * @param path where the brief is written
 * @param brief the commands, the rules file, and what to read besides
 * @returns nothing once written
 */
export const writeJobBrief = Effect.fnUntraced(function* (path: string, brief: JobBrief) {
    const fs = yield* FileAccess;
    const reads = [
        ...brief.reads,
        ...(brief.supporting === undefined
            ? []
            : [["the Supporting Material the request lists", brief.supporting] as const]),
    ];
    yield* fs.writeText(
        path,
        [
            `## Commands\n- check: \`${brief.commands.check}\`\n- carry: \`${brief.commands.carry}\``,
            `## Rules\n${(yield* fs.readText(brief.rules)).trimEnd()}`,
            ...(reads.length ? [`## Read besides\n${reads.map(([what, at]) => `- ${what}: ${at}`).join("\n")}`] : []),
        ].join("\n\n") + "\n",
    );
});
