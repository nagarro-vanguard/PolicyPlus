/**
 * The annotation that says, in one sentence, what a schema or property is for; a `--describe` prints it.
 * @param description the sentence
 * @returns the annotation
 */
export const about = (description: string) => ({ description });
