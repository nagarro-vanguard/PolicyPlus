import type { Story } from "../model/records";
import type { Target } from "../read/target";

/** Strongly connected groups of stories: stories that, through the components they build, wait on each other. */
const groupsOf = (stories: readonly Story[], target: Target): number[][] => {
    const uses = new Map(target.architecture.components.map((component) => [component.name, component.uses] as const));
    const builder = new Map<string, number>();
    stories.forEach((story, at) => (story.components ?? []).forEach((name) => builder.set(name, at)));
    const waits = stories.map((story, at) => [
        ...new Set(
            (story.components ?? []).flatMap((name) =>
                (uses.get(name) ?? []).flatMap((used) => {
                    const other = builder.get(used);
                    return other === undefined || other === at ? [] : [other];
                }),
            ),
        ),
    ]);
    const index = new Map<number, number>();
    const low = new Map<number, number>();
    const open: number[] = [];
    const onStack = new Set<number>();
    const groups: number[][] = [];
    let counter = 0;
    const visit = (node: number) => {
        index.set(node, counter);
        low.set(node, counter);
        counter++;
        open.push(node);
        onStack.add(node);
        for (const next of waits[node] ?? []) {
            if (!index.has(next)) {
                visit(next);
                low.set(node, Math.min(low.get(node) ?? 0, low.get(next) ?? 0));
            } else if (onStack.has(next)) low.set(node, Math.min(low.get(node) ?? 0, index.get(next) ?? 0));
        }
        if (low.get(node) === index.get(node)) {
            const group: number[] = [];
            for (let top = open.pop(); top !== undefined; top = open.pop()) {
                onStack.delete(top);
                group.push(top);
                if (top === node) break;
            }
            if (group.length > 1) groups.push(group);
        }
    };
    stories.forEach((_, at) => {
        if (!index.has(at)) visit(at);
    });
    return groups;
};

/** A piece of a story split by component: the component it builds, and the title of the story it came from. */
export type Piece = Story & { readonly part?: string; readonly splitFrom?: string };

/**
 * Splits a story by the components it builds, each piece taking the rules those components enforce, the steps they
 * serve and the entry points of those steps. What belongs to no component in particular stays with the first piece.
 * A piece is titled by what its component does, in full; `part` names the component and `splitFrom` the story's title.
 */
const splitOf = (story: Story, target: Target): Piece[] => {
    const names = story.components ?? [];
    const components = new Map(target.architecture.components.map((component) => [component.name, component] as const));
    const steps = new Map(target.journeys.flatMap((journey) => journey.steps.map((step) => [step.id, step] as const)));
    const pieceOf = (name: string) => names.indexOf(name);
    const stepPiece = (id: string) =>
        Math.max(
            0,
            names.findIndex((name) => components.get(name)?.serves.includes(id)),
        );
    const rulePiece = (rule: string) =>
        Math.max(
            0,
            names.findIndex((name) => components.get(name)?.enforces.includes(rule)),
        );
    return names
        .map((name, at): Piece => {
            const own = (story.steps ?? []).filter((id) => stepPiece(id) === at);
            const criteria = story.criteria.filter((criterion) => {
                const rules = criterion.from.flatMap((ref) => (ref._tag === "rule" ? [ref.id as string] : []));
                return (rules.length === 0 ? 0 : rulePiece(rules[0] ?? "")) === at;
            });
            const component = components.get(name);
            // A piece shows only the steps it builds, as the journey states them.
            const lived = own.flatMap((id) => {
                const step = steps.get(id);
                return step === undefined ? [] : [step.intent];
            });
            const { journey, open, ...rest } = story;
            return {
                ...rest,
                title: names.length > 1 ? `Build ${name}` : story.title,
                what: names.length > 1 ? (component?.responsibility ?? story.what) : story.what,
                ...(names.length > 1 ? { part: name, splitFrom: story.title } : {}),
                actions: [
                    ...new Set(
                        own.flatMap((id) => {
                            const step = steps.get(id);
                            return step?.link._tag === "legacy" ? step.link.from : [];
                        }),
                    ),
                ] as unknown as Story["actions"],
                steps: own,
                components: [name],
                // A piece no criterion cites a rule of stays empty: the plan's gate reports it, nothing is written for it.
                criteria: criteria as unknown as Story["criteria"],
                terms: at === 0 ? story.terms : [],
                ...(journey !== undefined && lived.length > 0
                    ? {
                          journey: {
                              name: journey.name,
                              steps: lived as unknown as NonNullable<Story["journey"]>["steps"],
                          },
                      }
                    : {}),
                ...(at === 0 && open !== undefined ? { open } : {}),
            };
        })
        .filter((piece, at) => pieceOf(piece.components?.[0] ?? "") === at);
};

/**
 * Makes the stories orderable. A story that builds components which call each other's components in both directions
 * would wait on itself; the component graph has no such loop, so a story caught in one is split by component, and each
 * piece waits only on what its own component calls.
 * @param stories the written stories
 * @param target the decided target
 * @returns the stories, and the titles of those that were split
 */
export const splitCycles = (stories: readonly Story[], target: Target): { stories: Piece[]; split: string[] } => {
    const caught = new Set(groupsOf(stories, target).flat());
    const split: string[] = [];
    const made = stories.flatMap((story, at): Piece[] => {
        if (!caught.has(at) || (story.components ?? []).length < 2) return [story];
        split.push(story.title);
        return splitOf(story, target);
    });
    return { stories: made, split };
};
