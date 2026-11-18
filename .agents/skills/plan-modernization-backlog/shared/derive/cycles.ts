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

const clip = (text: string, size: number) => (text.length <= size ? text : `${text.slice(0, size - 3)}...`);

/**
 * Splits a story by the components it builds, each piece taking the rules those components enforce, the steps they
 * serve and the entry points of those steps. What belongs to no component in particular stays with the first piece.
 */
const splitOf = (story: Story, target: Target): Story[] => {
    const names = story.components ?? [];
    const components = new Map(target.architecture.components.map((component) => [component.name, component] as const));
    const stepFrom = new Map(
        target.journeys.flatMap((journey) =>
            journey.steps.map((step) => [step.id, step.link._tag === "legacy" ? step.link.from : []] as const),
        ),
    );
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
        .map((name, at) => {
            const steps = (story.steps ?? []).filter((id) => stepPiece(id) === at);
            const criteria = story.criteria.filter((criterion) => {
                const rules = criterion.from.flatMap((ref) => (ref._tag === "rule" ? [ref.id as string] : []));
                return (rules.length === 0 ? 0 : rulePiece(rules[0] ?? "")) === at;
            });
            const own = components.get(name);
            return {
                ...story,
                title: names.length > 1 ? `${clip(story.title, Math.max(20, 70 - name.length))}: ${name}` : story.title,
                actions: [...new Set(steps.flatMap((id) => stepFrom.get(id) ?? []))] as unknown as Story["actions"],
                steps,
                components: [name],
                criteria: (criteria.length > 0
                    ? criteria
                    : [
                          {
                              says: `Given the parts it relies on are in place, when what depends on ${name} uses it, then it does its job: ${own?.responsibility ?? "its part of the work"}.`,
                              from: [],
                          },
                      ]) as unknown as Story["criteria"],
                terms: at === 0 ? story.terms : [],
                ...(at === 0 && story.journey !== undefined ? { journey: story.journey } : {}),
                ...(at === 0 && story.open !== undefined ? { open: story.open } : {}),
            } as Story;
        })
        .filter((piece, at) => pieceOf(piece.components?.[0] ?? "") === at);
};

/**
 * Makes the stories orderable. A story that builds components which call each other's components in both directions
 * would wait on itself; the component graph has no such loop, so a story caught in one is split by component, and each
 * piece waits only on what its own component calls.
 * @param stories the written stories
 * @param target the confirmed target
 * @returns the stories, and the titles of those that were split
 */
export const splitCycles = (stories: readonly Story[], target: Target): { stories: Story[]; split: string[] } => {
    const caught = new Set(groupsOf(stories, target).flat());
    const split: string[] = [];
    const made = stories.flatMap((story, at) => {
        if (!caught.has(at) || (story.components ?? []).length < 2) return [story];
        split.push(story.title);
        return splitOf(story, target);
    });
    return { stories: made, split };
};
