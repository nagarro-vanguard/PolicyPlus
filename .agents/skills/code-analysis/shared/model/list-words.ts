const namedAtMost = 5;

/**
 * A list named to five, the rest counted (D211, P12.10): the one rule for every list a page or a context shows, so no
 * page grows with the code it describes.
 * @param names the names, all of them
 * @returns the first five and how many more there are
 */
export const fiveAndCount = (names: readonly string[]) => ({
    named: [...new Set(names)].slice(0, namedAtMost),
    more: Math.max(0, new Set(names).size - namedAtMost),
});
