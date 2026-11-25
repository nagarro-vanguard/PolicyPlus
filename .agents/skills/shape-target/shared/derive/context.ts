import { CONTEXT_LABELS as L } from "./context-labels";

/*
 * The texts a reader copies for the target: a journey (today and the new way), a domain with the parts that carry it,
 * and the architecture as a whole. Written from the target's own records and the old system's words
 * (`target/legacy.json`), with no record id and no number bounding a list.
 */

type Legacy = {
    rules: Record<string, { statement: string; place?: { file: string; firstLine: number; lastLine: number } }>;
    actions: Record<string, { name: string; what: string; surface: string }>;
};
type Step = {
    intent: string;
    system: string;
    link: { _tag: string; from?: string[]; change?: string; reason?: string; keeps?: string[]; changes?: { rule: string; to: string }[] };
};
type Journey = {
    task: string;
    name: string;
    idea: string;
    tradeoff: string;
    recommended: string;
    steps: Step[];
    drops: { actions: string[]; rules: string[]; reason: string }[];
};
type Task = { id: string; outcome: string; current: { intent: string; system: string }[] };
type Domain = { name: string; concept: string; facts: { name: string }[]; rules: string[]; dependsOn: string[] };
type Component = { name: string; domain: string; responsibility: string; enforces: string[]; adapts?: string };
type Architecture = {
    name: string;
    idea: string;
    tradeoff: string;
    recommended: string;
    domains: Domain[];
    containers: { name: string; kind: string; tech: string; holds: string[] }[];
    components: Component[];
    integrations: { domain: string; how: string }[];
};

export type Sections = {
    whatItIs: string;
    holds?: readonly string[];
    rules?: readonly string[];
    reliesOn?: readonly string[];
    usedBy?: readonly string[];
    unsure?: readonly string[];
    whereToLook?: readonly string[];
};

const bullets = (lines: readonly string[]) => lines.map((line) => `- ${line}`);
const group = (heading: string, lines: readonly string[]) => (lines.length === 0 ? [] : [`${heading}:`, ...bullets(lines)]);
const unique = <T>(items: readonly T[]) => [...new Set(items)];

/** A text: each section that has content under its heading, in the catalogue's order. */
export const render = (sections: Sections): string => {
    const out: string[] = [`## ${L.whatItIs}`, "", sections.whatItIs, ""];
    const put = (heading: string, lines: readonly string[] | undefined) => {
        if (lines !== undefined && lines.length > 0) out.push(`## ${heading}`, "", ...lines, "");
    };
    put(L.holds, sections.holds);
    put(L.rules, sections.rules);
    put(L.reliesOn, sections.reliesOn);
    put(L.usedBy, sections.usedBy);
    put(L.unsure, sections.unsure);
    put(L.whereToLook, sections.whereToLook);
    return `${out.join("\n").trimEnd()}\n`;
};

const sentence = (legacy: Legacy, id: string) => {
    const rule = legacy.rules[id];
    return rule === undefined
        ? undefined
        : `${rule.statement}${rule.place === undefined ? "" : ` (${rule.place.file}:${rule.place.firstLine}-${rule.place.lastLine})`}`;
};
const sentences = (legacy: Legacy, ids: readonly string[]) =>
    unique(ids).flatMap((id) => {
        const text = sentence(legacy, id);
        return text === undefined ? [] : [text];
    });

/** The text of a chosen journey: the task, today's steps, the new steps, what each keeps and changes, what is left out. */
export const journeyText = (journey: Journey, task: Task | undefined, legacy: Legacy): string => {
    const stepLine = (step: Step, at: number) => {
        const change = step.link._tag === "legacy" && step.link.change !== undefined ? L.changeWords[step.link.change] : undefined;
        return `${at + 1}. ${step.intent}${change === undefined ? "" : ` (${change})`}: ${step.system}`;
    };
    const keeps = journey.steps.flatMap((step) => step.link.keeps ?? []);
    const changes = journey.steps.flatMap((step) => step.link.changes ?? []);
    const places = unique(journey.steps.flatMap((step) => step.link.from ?? []))
        .map((id) => legacy.actions[id])
        .filter((action) => action !== undefined)
        .map((action) => `${action.name} (${action.surface}): ${action.what}`);
    return render({
        whatItIs: `${task === undefined ? journey.name : task.outcome} The new way, "${journey.name}": ${journey.idea}`,
        holds: [
            ...(task === undefined ? [] : [L.today + ":", ...task.current.map((step, at) => `${at + 1}. ${step.intent}: ${step.system}`), ""]),
            `${L.newWay}:`,
            ...journey.steps.map(stepLine),
            ...(journey.drops.length === 0 ? [] : ["", ...group(L.leftOut, journey.drops.map((drop) => drop.reason))]),
        ],
        rules: [
            ...group(L.keeps, sentences(legacy, keeps)),
            ...group(L.changes, unique(changes.map((change) => `${sentence(legacy, change.rule) ?? ""} Now: ${change.to}`))),
        ],
        unsure: [`${L.cost}: ${journey.tradeoff}`],
        whereToLook: group(L.entryPoints, places),
    });
};

/** The text of one domain: what it owns, the parts that carry it, the rules it decides and the domains it relies on. */
const domainText = (domain: Domain, architecture: Architecture, legacy: Legacy): string => {
    const parts = architecture.components.filter((component) => component.domain === domain.name);
    const runs = architecture.containers.filter((container) => container.holds.includes(domain.name));
    const integrations = architecture.integrations.filter((integration) => integration.domain === domain.name);
    return render({
        whatItIs: `${domain.name}: ${domain.concept}`,
        holds: [
            ...group(L.facts, domain.facts.map((fact) => fact.name)),
            ...group(L.parts, parts.map((part) => `${part.name}: ${part.responsibility}`)),
            ...group(L.containers, runs.map((run) => `${run.name} (${run.tech})`)),
        ],
        rules: sentences(legacy, domain.rules),
        reliesOn: group(L.dependsOn, domain.dependsOn),
        usedBy: group(L.integrations, integrations.map((integration) => integration.how)),
    });
};

/** The text of the architecture as a whole: the chosen way, then each domain with its parts, rules and what it relies on. */
export const architectureText = (architecture: Architecture, legacy: Legacy): string => {
    const head = render({
        whatItIs: `${architecture.name}: ${architecture.idea}`,
        holds: [
            ...group("Domains", architecture.domains.map((domain) => `${domain.name}: ${domain.concept}`)),
            ...group(L.containers, architecture.containers.map((container) => `${container.name} (${container.tech})`)),
        ],
        reliesOn: group(L.integrations, architecture.integrations.map((integration) => `${integration.domain}: ${integration.how}`)),
        unsure: [`${L.cost}: ${architecture.tradeoff}`, ...(architecture.recommended === "" ? [] : [`${L.recommended}: ${architecture.recommended}`])],
    });
    const domains = architecture.domains.map(
        (domain) => `### ${domain.name}\n\n${domainText(domain, architecture, legacy).replace(/^## /gm, "#### ").trimEnd()}`,
    );
    return `${head}\n## Domains in detail\n\n${domains.join("\n\n")}\n`;
};
