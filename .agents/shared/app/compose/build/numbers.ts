import { ComposeError } from "../errors";
import { compareText } from "../io";

/** A noun for one and for many. */
export type Noun = { readonly one: string; readonly many: string };

/** One count of one kind inside a combined number, such as the 9 of the first kind in a total of 16 places made of two kinds. */
export type NumberPart = { readonly kind: string; readonly value: number; readonly noun: Noun };

/** A number the app prints: its value, its noun, its scope in plain words and where it comes from. */
export type NumberEntry = {
    readonly key: string;
    readonly value: number;
    readonly noun: Noun;
    /** What the number counts and within what, in plain words. */
    readonly scope: string;
    /** Which facts it is counted from. */
    readonly source: string;
    /** For a combined number, its count per kind; the parts add up to the value. */
    readonly parts?: readonly NumberPart[];
};

/**
 * The one numbers table. Every count the app shows is registered here once with its scope and source; what the app
 * shows refers to a number by its key, so two views cannot print two different values for one thing. Registering a key twice with
 * another value fails compose.
 */
export class Numbers {
    private readonly entries = new Map<string, NumberEntry>();

    /**
     * Register a number and return its key.
     * @param entry the number
     * @returns its key
     */
    add(entry: NumberEntry) {
        const known = this.entries.get(entry.key);
        if (known !== undefined && known.value !== entry.value) {
            throw new ComposeError(
                "build",
                `two different values for ${entry.key}: ${known.value} (${known.source}) and ${entry.value} (${entry.source})`,
            );
        }
        this.entries.set(entry.key, entry);
        return entry.key;
    }

    /**
     * Register a combined number: a total made of counts per kind.
     * @param key the key
     * @param noun the noun of the total
     * @param parts the count of each kind
     * @param scope what it counts
     * @param source where from
     * @returns the key
     */
    combined(key: string, noun: Noun, parts: readonly NumberPart[], scope: string, source: string) {
        const sorted = parts
            .filter((part) => part.value > 0)
            .toSorted((one, other) => other.value - one.value || compareText(one.kind, other.kind));
        return this.add({
            key,
            value: sorted.reduce((sum, part) => sum + part.value, 0),
            noun,
            scope,
            source,
            parts: sorted,
        });
    }

    has(key: string) {
        return this.entries.has(key);
    }

    value(key: string) {
        const entry = this.entries.get(key);
        if (entry === undefined) throw new ComposeError("build", `no number ${key}`);
        return entry.value;
    }

    /** Every number, sorted by key. */
    all() {
        return [...this.entries.values()].sort((one, other) => compareText(one.key, other.key));
    }
}
