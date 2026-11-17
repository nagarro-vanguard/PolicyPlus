import { askedOf, type Catalogue } from "../run/catalogue";
import { basisOf, type Fact } from "../model/schemas/fact";

type FactRecord = typeof Fact.Type;

export type Tier = "entries" | "system" | "risks";

export type TopicToConclude = {
    readonly key: string;
    readonly subject: FactRecord["subject"];
    readonly aspect: string;
    readonly facts: readonly FactRecord[];
};

/**
 * A topic's key: its subject and its aspect (5.4).
 * @param subject what it is about
 * @param aspect the question
 * @returns the key
 */
export const topicKey = (subject: FactRecord["subject"], aspect: string) =>
    `${subject === "system" ? "system" : `${subject.registry}:${subject.key}`}\u0000${aspect}`;

/**
 * The key of the topic a written fact concludes (plan 0005): a risk, a fact with a risk, concludes the risk topic of its
 * kind, so each kind of risk is one topic under the one question for risks; any other fact, its subject's topic.
 * @param fact the fact
 * @returns the key
 */
const concludedTopicKey = (fact: FactRecord) =>
    fact.risk === undefined
        ? topicKey(fact.subject, fact.aspect)
        : `${topicKey(fact.subject, fact.aspect)}\u0000${fact.risk.category}`;

/**
 * The risk topics a stage's concluding step concludes (plan 0005, decision B): for each kind of risk, every finding of
 * that kind (a fact with a risk that no step concluded, whatever question it answers, since a risk is for the person,
 * D182), under the one question asked of the system for risks, unless the risks already concluded of that kind hold
 * every one of them. None when the catalogue asks no such question.
 * @param facts every fact standing, accepted and decided
 * @param catalogue the catalogue
 * @returns the topics, one per kind of risk left to conclude
 */
function riskTopics(facts: readonly FactRecord[], catalogue: Catalogue): TopicToConclude[] {
    const question = catalogue.aspects.find((aspect) => aspect.answeredBy === "findings" && askedOf(aspect, "system"));
    if (question === undefined) {
        return [];
    }
    const findings = facts.filter((fact) => fact.risk !== undefined && basisOf(fact) !== "concluded");
    const risks = facts.filter((fact) => fact.aspect === question.id && basisOf(fact) === "concluded");
    return catalogue.riskCategories.flatMap((kind) => {
        const ofKind = findings.filter((fact) => fact.risk !== undefined && fact.risk.category === kind.id);
        const held = new Set<string>(
            risks.flatMap((risk) =>
                risk.risk !== undefined && risk.risk.category === kind.id && "concluded" in risk.basis
                    ? risk.basis.concluded.from
                    : [],
            ),
        );
        return ofKind.length && !ofKind.every((fact) => held.has(fact.id))
            ? [
                  {
                      key: `${topicKey("system", question.id)}\u0000${kind.id}`,
                      subject: "system" as const,
                      aspect: question.id,
                      facts: ofKind,
                  },
              ]
            : [];
    });
}

/**
 * Whether a concluded fact answers its topic (4.10): it rests on every answer the topic holds beside it, so a fact
 * written since makes it stale. A system question's conclusion rests on the parts' answers, which lie beneath it in
 * no topic of the system, so its sources are never required to equal what the topic holds; a fact corrected under its
 * own id re-lists its concluding job through the job's definition (`beneathOf`), never through this rule (plan 0005).
 * The one rule for "is this topic answered?": the listing and the pages both ask it (P10).
 * @param concluded the concluded fact
 * @param resting the topic's other facts
 * @returns true while it rests on every one of them
 */
const coversAll = (concluded: FactRecord, resting: readonly FactRecord[]) => {
    const from = new Set<string>("concluded" in concluded.basis ? concluded.basis.concluded.from : []);
    return resting.every((fact) => from.has(fact.id));
};

/**
 * The topics a stage's concluding step concludes (D177, 4.10), from every answer now standing, a fact with no risk,
 * since findings stand beside the answers and are never concluded (plan 0004): in the entries' tier,
 * each topic of a part or a technology the person reads that holds two facts or more and no concluded fact covering
 * them; in the system's tier, each question the person reads answered by facts, from the answer of every entry that
 * answers it, when no concluded fact of the system covers them; in the risks' tier, each kind of risk with a finding no
 * risk holds yet (`riskTopics`). A topic of one fact is answered by that fact.
 * @param facts every fact standing, accepted and decided
 * @param catalogue the catalogue
 * @returns the topics, by tier
 */
export function topicsToConclude(facts: readonly FactRecord[], catalogue: Catalogue) {
    const read = new Set(
        catalogue.aspects.filter((aspect) => aspect.readers.includes("person")).map((aspect) => aspect.id),
    );
    const byTopic = new Map<string, { subject: FactRecord["subject"]; aspect: string; facts: FactRecord[] }>();
    for (const fact of facts.filter((each) => read.has(each.aspect) && each.risk === undefined)) {
        const key = topicKey(fact.subject, fact.aspect);
        const held = byTopic.get(key);
        if (held === undefined) {
            byTopic.set(key, { subject: fact.subject, aspect: fact.aspect, facts: [fact] });
        } else {
            held.facts.push(fact);
        }
    }
    const answerOf = (topic: { facts: readonly FactRecord[] }) => {
        const resting = topic.facts.filter((fact) => basisOf(fact) !== "concluded");
        const concluded = topic.facts.filter((fact) => basisOf(fact) === "concluded" && coversAll(fact, resting));
        return { resting, concluded };
    };
    const entries: TopicToConclude[] = [];
    const answersByAspect = new Map<string, FactRecord[]>();
    for (const [key, topic] of byTopic) {
        const { resting, concluded } = answerOf(topic);
        if (topic.subject === "system") {
            continue;
        }
        if (resting.length > 1 && !concluded.length) {
            entries.push({ key, subject: topic.subject, aspect: topic.aspect, facts: resting });
        }
        const answers = concluded.length ? concluded : resting.length === 1 ? resting : [];
        const before = answersByAspect.get(topic.aspect);
        answersByAspect.set(topic.aspect, before === undefined ? [...answers] : [...before, ...answers]);
    }
    const system: TopicToConclude[] = catalogue.aspects.flatMap((aspect) => {
        const answers = answersByAspect.get(aspect.id);
        const held = byTopic.get(topicKey("system", aspect.id));
        const resting = [
            ...(answers === undefined ? [] : answers),
            ...(held === undefined ? [] : answerOf(held).resting),
        ];
        const covered = held !== undefined && answerOf({ facts: [...held.facts, ...resting] }).concluded.length > 0;
        return aspect.answeredBy === "facts" && askedOf(aspect, "system") && resting.length > 0 && !covered
            ? [{ key: topicKey("system", aspect.id), subject: "system" as const, aspect: aspect.id, facts: resting }]
            : [];
    });
    return { entries, system, risks: riskTopics(facts, catalogue) };
}

/**
 * Whether a topic is a kind of risk (plan 0005): its key carries the kind beside its subject and question.
 * @param topic the topic
 * @returns true for a risk topic
 */
const isRiskTopic = (topic: TopicToConclude) => topic.key !== topicKey(topic.subject, topic.aspect);

/**
 * The gaps of one conclusion against the facts beneath its topic: a source not beneath it; an answer leaving a fact
 * beneath out (A7: no note or answer is dropped); a risk whose severity none of its findings gives.
 * @param fact the conclusion
 * @param topic its topic
 * @returns one line per gap
 */
function restingGaps(fact: FactRecord, topic: TopicToConclude): string[] {
    const from: readonly string[] = "concluded" in fact.basis ? fact.basis.concluded.from : [];
    const beneath = new Set<string>(topic.facts.map((each) => each.id));
    const sources = topic.facts.filter((each) => from.includes(each.id));
    const left = topic.facts.filter((each) => !from.includes(each.id));
    const severity = fact.risk === undefined ? undefined : fact.risk.severity;
    return [
        ...from
            .filter((id) => !beneath.has(id))
            .map((id) => `${fact.id} rests on ${id}, which is not beneath its topic`),
        ...(!isRiskTopic(topic) && "concluded" in fact.basis && left.length
            ? [
                  `${fact.id} leaves out ${left.map((each) => each.id).join(", ")} of the facts beneath its topic: rest on every one, saying which to believe where they disagree`,
              ]
            : []),
        ...(isRiskTopic(topic) && !sources.some((each) => each.risk !== undefined && each.risk.severity === severity)
            ? [
                  `${fact.id} is rated ${String(severity)}, which none of the findings it groups is: rate it as one of them is`,
              ]
            : []),
    ];
}

/**
 * The gaps of a topic's conclusions taken together: an answer topic answered once, never twice or not at all; a risk
 * topic with every finding beneath in exactly one risk (plan 0005).
 * @param topic the topic
 * @param concluded the facts the job wrote for it
 * @returns one line per gap
 */
function topicGaps(topic: TopicToConclude, concluded: readonly FactRecord[]): string[] {
    if (!isRiskTopic(topic)) {
        return concluded.length === 1
            ? []
            : [
                  `the topic ${topic.aspect} of ${topic.subject === "system" ? "the system" : topic.subject.key} is answered ${concluded.length} times: answer it once`,
              ];
    }
    const placed = concluded.flatMap((fact) => ("concluded" in fact.basis ? fact.basis.concluded.from : []));
    return topic.facts.flatMap((finding) => {
        const times = placed.filter((id) => id === finding.id).length;
        return times === 1
            ? []
            : [
                  `${finding.id} is in ${times} risks: place every finding of this kind in exactly one risk, the risk it tells`,
              ];
    });
}

/**
 * The gaps of a concluding job's output against the topics it was given (4.10): a fact about no listed topic, an answer
 * carrying a risk among them; a fact that is neither concluded nor assumed, since the concluding step never studies;
 * each conclusion's gaps against what lies beneath it (`restingGaps`); and each topic's (`topicGaps`).
 * @param written the facts the job wrote
 * @param topics the topics it was given
 * @returns one line per gap
 */
export function conclusionGaps(written: readonly FactRecord[], topics: readonly TopicToConclude[]): string[] {
    const listed = new Map(topics.map((topic) => [topic.key, topic]));
    const answered = new Map<string, FactRecord[]>();
    const gaps = written.flatMap((fact) => {
        const key = concludedTopicKey(fact);
        const topic = listed.get(key);
        const before = answered.get(key);
        answered.set(key, before === undefined ? [fact] : [...before, fact]);
        if (topic === undefined) {
            return [
                fact.risk !== undefined && listed.has(topicKey(fact.subject, fact.aspect))
                    ? `${fact.id} carries a risk: an answer carries none, and each risk is concluded under the question for risks`
                    : `${fact.id} answers a topic this job was not given`,
            ];
        }
        if (basisOf(fact) === "observed") {
            return [`${fact.id} observes: a conclusion rests on the facts beneath its topic, or says what is assumed`];
        }
        return restingGaps(fact, topic);
    });
    return [
        ...gaps,
        ...topics.flatMap((topic) => {
            const concluded = answered.get(topic.key);
            return topicGaps(topic, concluded === undefined ? [] : concluded);
        }),
    ];
}
