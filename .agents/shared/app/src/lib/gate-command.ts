// The commands a decision page copies. The contract with the shape-target `choose` command is
// `<choose> <gate> <root> ...`, with `--reason '<why>'` to confirm and `--changes '<text>'` to ask for changes.

/** A value as one shell word in single quotes, so a person's words can never become a second command. */
export const quote = (text: string) => `'${text.replaceAll("'", "'\\''")}'`;

/** The reason given when the person types none. */
export const defaultReason = "I reviewed this page and confirm the recommended answer";

/**
 * The command that confirms a decision, with the person's reason in it.
 * @param command the command with a `<why>` placeholder
 * @param reason the person's words; the default reason when empty
 * @returns the runnable command
 */
export const withReason = (command: string, reason: string) => {
    const said = quote(reason.trim() === "" ? defaultReason : reason.trim());
    return command.replace('"<why>"', said).replace("<why>", said);
};

/**
 * The command that asks for changes instead of confirming.
 * @param base the first words of the command: the choose command, the decision and the output root
 * @param text what should change, in the person's words
 * @returns the runnable command; the text is a placeholder while empty
 */
export const withChanges = (base: string, text: string) => `${base} --changes ${quote(text.trim() === "" ? "..." : text.trim())}`;
