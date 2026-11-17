/**
 * The stage's totality check: every unit of its upstream is in a job exactly once; none is left out, none is in two
 * jobs, and no job holds a unit the upstream lacks.
 * @param what what the units are, for the message
 * @param upstream the ids of the upstream's units
 * @param placed the ids of the units the jobs hold, one per place a job holds it
 * @returns one line per gap; none when every unit is accounted for
 */
export const totalityGaps = (what: string, upstream: ReadonlySet<string>, placed: readonly string[]): string[] => {
    const times = new Map<string, number>();
    for (const id of placed) {
        const held = times.get(id);
        times.set(id, held === undefined ? 1 : held + 1);
    }
    const missing = [...upstream].filter((id) => !times.has(id));
    const twice = [...times].filter(([, count]) => count > 1).map(([id]) => id);
    const unknown = [...times.keys()].filter((id) => !upstream.has(id));
    return [
        ...(missing.length ? [`${missing.length} ${what} are in no job, such as ${missing[0]}`] : []),
        ...(twice.length ? [`${twice.length} ${what} are in two jobs, such as ${twice[0]}`] : []),
        ...(unknown.length
            ? [`${unknown.length} ${what} are in a job and not in the upstream, such as ${unknown[0]}`]
            : []),
    ];
};
