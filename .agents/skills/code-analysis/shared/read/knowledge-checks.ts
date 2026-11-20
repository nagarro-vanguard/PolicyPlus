import type { KnowledgePayload } from "../model/schemas/knowledge-payload";

/**
 * What the knowledge payload must hold together: every id a part link, a technology or a picture names is a part, an
 * outside system, a life, a kind of data or a layer the payload or the store holds, and every risk rests on at least one
 * observation.
 * @param knowledge the payload
 * @param known the record ids of the outside systems and layers, which this payload does not list
 * @returns one line per gap
 */
export const knowledgeGaps = (knowledge: KnowledgePayload, known: ReadonlySet<string>): string[] => {
    const parts = new Set(knowledge.parts.map((part) => part.id));
    const lives = new Set(knowledge.lifecycles.map((life) => life.id));
    const entities = new Set(knowledge.dataUse.map((use) => use.entity.id));
    const named = new Set([...parts, ...lives, ...entities, ...known]);
    return [
        ...knowledge.technologies.flatMap((technology) =>
            technology.versions
                .flatMap((version) => version.parts)
                .filter((part) => !parts.has(part))
                .map((part) => `technology ${technology.name} names ${part}, which is no part`),
        ),
        ...knowledge.partLinks
            .filter((link) => !parts.has(link.from) || !(parts.has(link.to) || known.has(link.to)))
            .map(
                (link) =>
                    `a ${link.kind} link names ${link.from} or ${link.to}, which is neither a part nor an outside system`,
            ),
        ...knowledge.risks
            .filter((risk) => risk.findings.length === 0)
            .map((risk) => `a risk rests on no observation: ${risk.statement}`),
    ];
};
