/**
 * Whether one path segment matches a pattern in which `*` stands for any run of characters inside a segment.
 * @param segment the path segment
 * @param pattern the pattern segment
 * @returns true when it matches
 */
const segmentMatches = (segment: string, pattern: string): boolean => {
    const parts = pattern.split("*");
    if (parts.length === 1) {
        return segment === pattern;
    }
    const first = parts[0] ?? "";
    const last = parts[parts.length - 1] ?? "";
    if (!segment.startsWith(first) || !segment.endsWith(last) || segment.length < first.length + last.length) {
        return false;
    }
    let at = first.length;
    const end = segment.length - last.length;
    for (const middle of parts.slice(1, -1)) {
        const found = segment.indexOf(middle, at);
        if (found < 0 || found + middle.length > end) {
            return false;
        }
        at = found + middle.length;
    }
    return true;
};

/**
 * Whether a path matches a glob: segments split by `/`, `**` for any number of whole segments (none included), `*`
 * for any run of characters inside one segment. Nothing else is special.
 * @param path the path, relative to the repository root
 * @param glob the glob
 * @returns true when the whole path matches
 */
const matchesGlob = (path: string, glob: string): boolean => {
    const walk = (segments: readonly string[], patterns: readonly string[]): boolean => {
        const [pattern, ...rest] = patterns;
        if (pattern === undefined) {
            return segments.length === 0;
        }
        if (pattern === "**") {
            return rest.length === 0 || segments.some((_, at) => walk(segments.slice(at), rest)) || walk([], rest);
        }
        const [segment, ...others] = segments;
        return segment !== undefined && segmentMatches(segment, pattern) && walk(others, rest);
    };
    return walk(path.split("/"), glob.split("/"));
};

/**
 * Whether a path matches any glob of a list.
 * @param path the path, relative to the repository root
 * @param globs the globs
 * @returns true when one matches
 */
export const matchesAny = (path: string, globs: readonly string[]): boolean =>
    globs.some((glob) => matchesGlob(path, glob));
