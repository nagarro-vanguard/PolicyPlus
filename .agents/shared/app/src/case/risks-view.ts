import { copy, severityWords } from "../lib/copy";
import { countOf, type CountView } from "./format";
import type { Case } from "./read";
import { addressOf } from "./routes";
import type { CaseData } from "./view";

// What the Risks section shows: every risk of the system in the case's own rank, with the rule of the ranking as the
// case states it, each risk's severity word and what it touches (its capabilities and parts, followed by key to their
// pages). It only follows keys; the rank and the breadth are the case's.

type Risk = {
    statement: string;
    severity: string;
    categoryWords: string;
    capabilities: string[];
    parts: string[];
    surfaces?: string[];
    rank: number;
};

export type RiskView = {
    rank: number;
    statement: string;
    category: string;
    severity: string;
    word: string;
    badge: "high" | "medium" | "low";
    touches: { name: string; href?: string; capability?: number }[];
};

export type RisksView = {
    count: CountView | null;
    rule: string;
    risks: RiskView[];
    severities: { value: string; label: string }[];
    capabilities: { value: string; label: string }[];
    noun: string;
};

/** The anchor of a risk on the Risks page, by its rank: what the Overview's "Check these first" links to. */
export const riskAnchorOf = (rank: number) => `risk-${rank}`;

/**
 * The Risks section's view.
 * @param kase the case
 * @param data the case's records by key
 * @returns the view
 */
export const risksViewOf = (kase: Case, data: CaseData): RisksView => {
    const risks = kase.has("facts/risks.json") ? (kase.json("facts/risks.json") as Risk[]) : [];
    const brief = kase.has("brief.json") ? (kase.json("brief.json") as { risks: { rule: string } }) : null;
    const levelOf = (key: string) => data.node(key)?.level;
    const capabilities = kase.has("facts/capabilities.json") ? (kase.json("facts/capabilities.json") as { id: string }[]) : [];
    const capabilityIndex = new Map(capabilities.map((capability, at) => [capability.id, at]));
    const link = (collection: string, level: string, id: string) => {
        const fact = data.fact(collection, id);
        if (fact === undefined) return undefined;
        const node = data.node(`${level}/${String(fact.slug)}`);
        const name = String(fact.name);
        return node === undefined ? { name } : { name, href: addressOf(node, levelOf) };
    };
    const views = [...risks]
        .sort((a, b) => a.rank - b.rank)
        .map((risk): RiskView => {
            const words = severityWords[risk.severity];
            if (words === undefined) throw new Error(`a risk carries the severity "${risk.severity}", which the app has no plain words for (src/lib/copy.ts)`);
            return {
                rank: risk.rank,
                statement: risk.statement,
                category: risk.categoryWords,
                severity: risk.severity,
                word: words.word,
                badge: words.badge,
                touches: [
                    ...risk.capabilities.flatMap((id) => {
                        const found = link("capabilities", "capability", id);
                        return found === undefined ? [] : [{ ...found, capability: capabilityIndex.get(id) ?? -1 }];
                    }),
                    ...risk.parts.flatMap((id) => {
                        const found = link("parts", "part", id);
                        return found === undefined ? [] : [found];
                    }),
                    ...(risk.surfaces ?? []).flatMap((key) => {
                        const fact = data.fact("surfaces", key);
                        if (fact === undefined) return [];
                        const node = data.node(`place/${String(fact.slug)}`);
                        const name = String(fact.name);
                        return [node === undefined ? { name } : { name, href: addressOf(node, levelOf) }];
                    }),
                ],
            };
        });
    const present = new Set(views.map((risk) => risk.severity));
    const touched = new Set(views.flatMap((risk) => risk.touches.flatMap((touch) => (touch.capability === undefined ? [] : [touch.capability]))));
    const count = data.number("system/risks");
    return {
        count: count === undefined ? null : countOf(count),
        rule: brief === null ? copy.risks.rankedDefault : copy.risks.ranked(brief.risks.rule),
        risks: views,
        severities: Object.entries(severityWords)
            .filter(([severity]) => present.has(severity))
            .map(([severity, words]) => ({ value: severity, label: words.word })),
        capabilities: capabilities.flatMap((capability, at) => {
            const fact = data.fact("capabilities", capability.id);
            return touched.has(at) && fact !== undefined ? [{ value: String(at), label: String(fact.name) }] : [];
        }),
        noun: count?.noun.many ?? "",
    };
};
