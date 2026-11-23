import type { Criterion, Decision, Story } from "../model/records";
import type { Target } from "../read/target";

/*
 * Each outside system is built once. With a decided target, a component that adapts an outside system is built by its
 * own story; a foundation story about how the same system is reached would build it again. Its criteria that rest on
 * that system's integration decision move to the adapter's story, and a foundation story left with nothing is dropped.
 */

const MAX_CRITERIA = 12;

/** A story of the foundation: no entry point, no step, no component. */
const isFoundation = (story: Story) =>
    story.actions.length === 0 && (story.steps ?? []).length === 0 && (story.components ?? []).length === 0;

/**
 * Moves what foundation stories say about adapted outside systems into the stories of the components that adapt them.
 * A whole foundation story moves when everything it rests on beyond those systems is a convention and one adapter's
 * story takes it; otherwise only the criteria that name an adapted system move. Nothing moves into a story that would
 * then hold more than 12 criteria, or into one that ports entry points.
 * @param stories the stories, foundation and components alike
 * @param decisions the decisions
 * @param target the decided target
 * @param externals the outside systems by id
 * @returns the stories without duplicates, and one line per move for the build's report
 */
export const dedupeCarriers = <S extends Story>(
    stories: readonly S[],
    decisions: readonly Decision[],
    target: Target,
    externals: readonly { readonly id: string; readonly name: string }[],
): { stories: S[]; moved: string[] } => {
    const nameOf = new Map(externals.map((external) => [external.id, external.name]));
    const adapter = new Map<string, string>();
    for (const component of target.architecture.components)
        if (component.adapts !== undefined)
            adapter.set(nameOf.get(component.adapts) ?? component.adapts, component.name);
    const builder = new Map<string, number>();
    stories.forEach((story, at) => (story.components ?? []).forEach((name) => builder.set(name, at)));
    const decisionById = new Map(decisions.map((decision) => [decision.id as string, decision]));
    /** The story that builds the adapter of the system a decision is about, when it can take criteria. */
    const takerOf = (id: string): number | undefined => {
        const topic = decisionById.get(id)?.topic;
        if (topic?._tag !== "integration") return undefined;
        const component = adapter.get(topic.system);
        const at = component === undefined ? undefined : builder.get(component);
        return at === undefined || (stories[at]?.actions.length ?? 0) > 0 ? undefined : at;
    };
    const takerOfCriterion = (criterion: Criterion) =>
        criterion.from
            .flatMap((ref) => (ref._tag === "decision" ? [takerOf(ref.id)] : []))
            .find((at) => at !== undefined);
    const added = new Map<number, Criterion[]>();
    const kept = new Map<number, readonly Criterion[]>();
    const moved: string[] = [];
    const room = (at: number, more: number) =>
        (stories[at]?.criteria.length ?? 0) + (added.get(at)?.length ?? 0) + more <= MAX_CRITERIA;
    stories.forEach((story, at) => {
        if (!isFoundation(story)) return;
        const takers = story.criteria.map(takerOfCriterion);
        const targets = new Set(takers.filter((each) => each !== undefined));
        if (targets.size === 0) return;
        const onlyConventions = story.criteria.every(
            (criterion, index) =>
                takers[index] !== undefined ||
                criterion.from.every(
                    (ref) => ref._tag === "decision" && decisionById.get(ref.id)?.topic._tag === "convention",
                ),
        );
        const whole = targets.size === 1 && onlyConventions ? [...targets][0] : undefined;
        const moves = story.criteria.map((criterion, index) => whole ?? takers[index]);
        const stays: Criterion[] = [];
        story.criteria.forEach((criterion, index) => {
            const to = moves[index];
            if (to !== undefined && room(to, 1)) added.set(to, [...(added.get(to) ?? []), criterion]);
            else stays.push(criterion);
        });
        if (stays.length === story.criteria.length) return;
        kept.set(at, stays);
        moved.push(
            `"${story.title}": ${story.criteria.length - stays.length} of its criteria are built by the stories of the components that adapt the outside systems they name${stays.length === 0 ? ", so it is not built twice" : ""}`,
        );
    });
    const result = stories.flatMap((story, at) => {
        const own = kept.get(at) ?? story.criteria;
        const more = added.get(at) ?? [];
        if (own.length + more.length === 0) return [];
        return [
            own === story.criteria && more.length === 0
                ? story
                : ({ ...story, criteria: [...own, ...more] as unknown as Story["criteria"] } as S),
        ];
    });
    return { stories: result, moved };
};
