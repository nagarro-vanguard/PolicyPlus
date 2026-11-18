/** The limits shape-and-deliver works within, in one place. A value here is a decision about the run, not a setting. */

/** The most rounds one agent is given before the run stops for the operator; checks and reviews share this one count. */
export const maxRounds = 10;

/** The most rounds the plan review is given: defects still open after them go to the approver with the plan. */
export const planReviewRounds = 3;

/** How much of a command's output is kept as evidence: its end, where the failure is. */
export const outputKept = 4000;

/** How much of a failed command's output a gap or a refusal quotes, so a line the approver reads stays short. */
export const failureOutputKept = 1500;

/** The exit code of a check that says its environment is unavailable (`EX_UNAVAILABLE`): no repair can fix it. */
export const environmentUnavailable = 69;

/** How long a program may run before it is killed: a hung build or check must not hold the run for ever. */
export const commandTimeoutMs = 20 * 60 * 1000;

/** How many invariant files of a domain the orientation's view names before it counts the rest. */
export const invariantFilesNamed = 5;

/** How many layers a plan may change without recording a design decision: two or more need one. */
export const layersForcingDecision = 2;

/** The outcomes a closed agent run records: it finished, or a driver reports why it did not. */
export const agentOutcomes = ["finished", "timed-out", "crashed", "refused"] as const;
