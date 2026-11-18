import type { Command } from "effect/cli";
import { runScript as runSkillScript, type ScriptStatus } from "./script-runner";
import { isScriptError } from "./script-errors";
import { servicesLayer, type Services } from "./services";

export { ScriptStatus, needsAction, printOutcome } from "./script-runner";

/**
 * Run a shape-and-deliver entry script's command with the real System, printing a failure of this skill's own as its message.
 * The runner sets the exit code.
 * @param command the script's command, with its arguments and handler
 */
export function runScript<Name extends string, Input, ContextInput, E>(
    command: Command.Command<Name, Input, ContextInput, E, Services | ScriptStatus>,
): void {
    runSkillScript(command, { name: "shape-and-deliver", layer: servicesLayer, isReported: isScriptError });
}
