import type { RunLayout } from "../core/run-layout";

/** What a person is told, and the one page to open, when a run stops or ends a mode. */
export type ForReader = { readonly forReader: string; readonly open: string };

/** Why a run stops, so what a person is told never depends on the words of the message. */
export const stopKinds = [
    "security",
    "unowned",
    "review-check",
    "rounds",
    "environment",
    "existing-checks",
    "branch",
    "other",
] as const;

type StopKind = (typeof stopKinds)[number];

/** A stop: why, which review it came from when it did, and the line for the operator. */
export type Stop = { readonly kind: StopKind; readonly review?: "plan" | "change"; readonly said: string };

/**
 * What a stop says to the person, in plain words, and the page that shows it. The reason itself stays in `said`, for
 * the driver.
 * @param stop why the run stopped
 * @param layout the run's layout
 * @returns the words and the page to open: the review's page for a security stop, the run's start page for any other
 */
export const stopForReader = (stop: Pick<Stop, "kind" | "review">, layout: RunLayout): ForReader => {
    const page = stop.review === "change" ? layout.evidencePage : layout.planPage;
    switch (stop.kind) {
        case "security":
            return {
                forReader:
                    "A reviewer found a security problem. An engineer must read it before the delivery can go on.",
                open: page,
            };
        case "unowned":
            return {
                forReader:
                    "The review found a problem that no step can fix by itself. Whoever runs the delivery needs to look at it.",
                open: layout.runPage,
            };
        case "review-check":
            return {
                forReader: "The review could not finish its findings. Whoever runs the delivery needs to look at it.",
                open: layout.runPage,
            };
        case "rounds":
            return {
                forReader:
                    "A step could not finish after several tries. Whoever runs the delivery needs to look at it.",
                open: layout.runPage,
            };
        case "environment":
            return {
                forReader:
                    "A check could not run because something it needs is not available, such as the database. Make it available; the delivery then goes on.",
                open: layout.runPage,
            };
        case "existing-checks":
            return {
                forReader:
                    "Checks that already failed before this change stop the delivery. They need fixing on their own first.",
                open: layout.runPage,
            };
        case "branch":
            return {
                forReader:
                    "The branch no longer takes the approved plan, so it needs a new plan. Ask for the plan again.",
                open: layout.runPage,
            };
        case "other":
            return {
                forReader:
                    "The delivery stopped. Whoever runs it needs to look at it; the start page says where it stands.",
                open: layout.runPage,
            };
    }
};

/**
 * What the end of a mode says to the person, and the page to open: the plan ready to read, or the change built and
 * proved.
 * @param halt what ended the mode
 * @param halt.implementRequest present when a plan ended
 * @param halt.decisions how many open questions the plan page holds
 * @param layout the run's layout
 * @returns the words and the page to open
 */
export const doneForReader = (
    halt: { readonly implementRequest?: string; readonly decisions?: number },
    layout: RunLayout,
): ForReader =>
    halt.implementRequest === undefined
        ? {
              forReader:
                  "The change is built and proved. The evidence page shows each criterion's proof, and the run is finished.",
              open: layout.evidencePage,
          }
        : {
              forReader: `The plan is ready${
                  halt.decisions === undefined || halt.decisions === 0
                      ? ""
                      : `, with ${String(halt.decisions)} ${halt.decisions === 1 ? "decision" : "decisions"} each taken at its recommendation`
              }. Read it on the plan page, then say whether to have it built or what to change.`,
              open: layout.planPage,
          };
