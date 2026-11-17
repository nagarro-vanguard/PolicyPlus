/**
 * The list stored under `key`, created empty the first time, so items can be pushed into their group in place.
 * @param map the groups
 * @param key the group's key
 * @returns the group's list
 */
export function getOrCreate<K, V>(map: Map<K, V[]>, key: K): V[] {
    let list = map.get(key);
    if (!list) {
        list = [];
        map.set(key, list);
    }
    return list;
}

/**
 * Add an amount to a key's count; a key not counted yet starts at the amount.
 * @param counts the counts
 * @param key the key counted
 * @param amount how much to add
 */
export function addToCount<K>(counts: Map<K, number>, key: K, amount: number): void {
    const counted = counts.get(key);
    counts.set(key, counted === undefined ? amount : counted + amount);
}

/**
 * The value a map holds for a key it is known to hold: a missing key is a defect in the code, never a state of the data.
 * @param map the map
 * @param key the key
 * @param why why the map holds it, named in the defect
 * @returns the value
 */
export function known<K, V>(map: ReadonlyMap<K, V>, key: K, why: string): V {
    const value = map.get(key);
    if (value === undefined) {
        throw new Error(`${String(key)} is missing: ${why}`);
    }
    return value;
}

export const compareText: (left: string, right: string) => number = new Intl.Collator("en").compare;

/**
 * The items without repeats, in first-seen order.
 * @param items the items
 * @returns the unique items
 */
export const unique = <T>(items: Iterable<T>) => [...new Set(items)];

/**
 * The keys of a record whose keys are a known set, typed as that set.
 * @param record the record
 * @returns its keys, in insertion order
 */
export const keysOf = <K extends string>(record: Readonly<Record<K, unknown>>) =>
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- Object.keys gives string[]; this record's keys are exactly K
    Object.keys(record) as K[];
