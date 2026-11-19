import { confirmCommand, gates } from "./confirmation";
import type { Gate } from "./confirmation";
import { titleOf } from "./derive";
import { gateNames } from "./slice";
import { journeySlugs } from "./journey-join";
import type { TargetData } from "./target-types";
import { plural } from "./text";

// What a person reads before confirming one of the four decisions of the target: what is asked, the recommended answer, what
// changes when they confirm, and the evidence beside it. Built from the records the pages already read; nothing is invented.

export type GateReview = {
    readonly gate: Gate;
    readonly name: string;
    readonly state: "not made" | "blocked" | "waiting" | "confirmed" | "changed";
    readonly date: string | undefined;
    readonly summary: string;
    /** What the person is asked to confirm, in one sentence. */
    readonly ask: string;
    /** The pages to read before confirming, as links from a page of `gate/`. */
    readonly pages: readonly { readonly text: string; readonly href: string }[];
    readonly recommended: string;
    readonly changes: readonly string[];
    readonly evidence: readonly { readonly title: string; readonly items: readonly { readonly text: string; readonly sub?: string; readonly href?: string }[] }[];
    /** The command that confirms; `<why>` is for the person's reason. */
    readonly command: string;
    /** The first words of the command that asks for changes; the page adds `--changes "<text>"`. */
    readonly changesCommand: string;
    readonly recorded: string | undefined;
};

const stateWords: Record<GateReview["state"], string> = {
    "not made": "Not made yet",
    blocked: "Blocked: confirm the one before first",
    waiting: "Waiting for you",
    confirmed: "Confirmed",
    changed: "Changed since it was confirmed",
};
export const stateWord = (state: GateReview["state"]) => stateWords[state];

/**
 * The review page's content for one decision.
 * @param gate the decision
 * @param data the target's records and where each decision stands
 * @returns the review
 */
export const gateReview = (gate: Gate, data: TargetData): GateReview => {
    const view = data.gates[gate];
    const base = { gate, name: gateNames[gate], state: view.state, date: view.date };
    const choose = process.env.TARGET_CHOOSE ?? "bun <shape-target>/cli/choose.ts";
    const changesCommand = `${choose} ${gate} ${data.root}`;
    const slugs = journeySlugs(data.tasks.map((task) => task.id));
    const journeyHref = (task: { readonly id: string }) => `../journey/${slugs.get(task.id) ?? ""}.html`;
    if (gate === "as-is") {
        const steps = data.tasks.reduce((sum, task) => sum + task.current.length, 0);
        return {
            ...base,
            summary: `${plural(data.tasks.length, "journey")} and ${plural(steps, "step")} that people go through today, as the code shows them.`,
            ask: "Confirm that these journeys and steps are how people get their work done today.",
            pages: [{ text: "The journeys, each with today's steps", href: "../journeys.html" }],
            recommended: "Confirm that these journeys and steps are how people work today. Mark any step that hurts, is unused, is right or wrong.",
            changes: ["Today's journeys become the baseline for comparison.", "Next you choose how journeys should be done.", "No code or plan changes yet."],
            evidence: [{ title: "Journeys, with the steps people take today", items: data.tasks.map((task) => ({ text: titleOf(task.outcome), sub: plural(task.current.length, "step"), href: journeyHref(task) })) }],
            command: confirmCommand(gate, data.root, choose),
            changesCommand,
            recorded: data.choiceAsIs === undefined ? undefined : data.choiceAsIs.reason,
        };
    }
    if (gate === "journeys") {
        const recommended = data.variants.filter((variant) => variant.recommended !== undefined);
        return {
            ...base,
            summary: `${plural(data.tasks.length, "journey")}, ${plural(data.variants.length, "way")} to do them; ${recommended.length} recommended.`,
            ask: "Confirm the way each journey will be done: the recommended one, unless you name another.",
            pages: [{ text: "The journeys, each beside its proposed way", href: "../journeys.html" }],
            recommended: "Take the recommended way for every journey; name any exception with --pick.",
            changes: ["Each journey keeps its chosen way.", "The other ways are kept as a record, not planned.", "The architecture is proposed next."],
            evidence: [
                {
                    title: "The recommended way for each journey",
                    items: data.tasks.flatMap((task) => {
                        const pick = data.variants.find((variant) => variant.task === task.id && variant.recommended !== undefined);
                        return pick === undefined ? [] : [{ text: titleOf(task.outcome), sub: titleOf(pick.name), href: journeyHref(task) }];
                    }),
                },
            ],
            command: confirmCommand(gate, data.root, choose).replace("[--all-recommended]", "--all-recommended"),
            changesCommand,
            recorded: data.choiceJourneys === undefined ? undefined : data.choiceJourneys.reason,
        };
    }
    if (gate === "architecture") {
        const pick = data.architectureVariants.find((variant) => variant.recommended !== undefined);
        return {
            ...base,
            summary: `${plural(data.architectureVariants.length, "architecture")} proposed, each splitting the system into domains.`,
            ask: "Confirm the architecture the system will be built as.",
            pages: [{ text: "The architectures compared", href: "../architecture.html#fold=alternatives" }],
            recommended: pick === undefined ? "No architecture is marked as recommended; compare them and pick one." : `${pick.name}: ${pick.recommended ?? pick.idea}`,
            changes: ["Its domains and containers are fixed.", "Its components are designed next, for you to confirm.", "The plan waits for them."],
            evidence: [{ title: "The architectures proposed", items: data.architectureVariants.map((variant) => ({ text: titleOf(variant.name), sub: plural(variant.domains.length, "domain") })) }],
            command: confirmCommand(gate, data.root, choose).replace('"<variant>"', JSON.stringify(pick?.name ?? "<variant>")),
            changesCommand,
            recorded: data.choiceArchitecture === undefined ? undefined : data.choiceArchitecture.reason,
        };
    }
    const architecture = data.architecture;
    const score = architecture?.score;
    return {
        ...base,
        ask: "Confirm the domains and components the plan will build.",
        pages: architecture === undefined ? [] : [{ text: "The domains and components", href: "../architecture.html#lens=modernized" }, ...(data.journeys.length === 0 ? [] : [{ text: "The journeys and what carries each", href: "../journeys.html" }])],
        summary: architecture === undefined ? "The components are not made yet." : `${plural(architecture.domains.length, "domain")} and ${plural((architecture.components ?? []).length, "component")} of ${architecture.name}.`,
        recommended: score === undefined ? "Confirm the components if each domain has a reason to exist and every step and rule is served." : `Confirm: ${score.stepsServed} of ${score.steps} steps are served and ${score.rulesAssigned} of ${score.rules} rules are assigned to a component${score.idleDomains.length === 0 ? "" : `, and ${plural(score.idleDomains.length, "domain")} serves nothing yet`}.`,
        changes: ["The components become what the plan builds.", "The plan is made from the confirmed target.", "A later change shows this as changed."],
        evidence: [{ title: "Domains and how many components each holds", items: (architecture?.domains ?? []).map((domain) => ({ text: domain.name, sub: plural((architecture?.components ?? []).filter((component) => component.domain === domain.name).length, "component") })) }],
        command: confirmCommand(gate, data.root, choose),
        changesCommand,
        recorded: data.choiceComponents?.reason,
    };
};

export const allGates = gates;
