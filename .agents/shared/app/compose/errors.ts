/**
 * Why `compose` stopped. Every failure is one of these, so the command line can print it and exit non-zero; nothing is
 * caught and turned into an empty result.
 */
export class ComposeError extends Error {
    /** What kind of failure: an input that cannot be read, a fact that is missing, or a part that cannot be built. */
    readonly kind: "input" | "missing" | "version" | "build";

    constructor(kind: ComposeError["kind"], message: string) {
        super(message);
        this.name = "ComposeError";
        this.kind = kind;
    }
}

/**
 * Stop with a missing-fact failure.
 * @param what the fact and where it was expected
 * @returns never
 */
export const missing = (what: string): never => {
    throw new ComposeError("missing", `missing fact: ${what}`);
};
