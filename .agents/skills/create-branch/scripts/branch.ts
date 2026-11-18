const types: Readonly<Record<string, string>> = {
  functional: "feat",
  bug: "fix",
  technical: "refactor",
};

/**
 * Builds the branch name `<type>/<number>-<slug>` of a work item.
 * @param number The item's number.
 * @param title The item's title.
 * @param tags The item's tags; `functional`, `bug` or `technical` picks the type.
 * @returns The branch name, or an error text when no tag gives a type.
 */
export const branchName = (
  number: string,
  title: string,
  tags: readonly string[],
): { name: string } | { error: string } => {
  const type = tags
    .map((tag) => types[tag])
    .find((found) => found !== undefined);
  if (type === undefined)
    return {
      error: "the item has none of the tags functional, bug or technical",
    };
  const slug = title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word !== "")
    .slice(0, 5)
    .join("-");
  return slug === ""
    ? { error: "the title has no word to make a slug from" }
    : { name: `${type}/${number}-${slug}` };
};

/**
 * Picks the base to start from: the one given, else the remote's default branch, else the branch checked out.
 * @param given The base the caller named, if any.
 * @param remoteDefault The output of `git symbolic-ref --short refs/remotes/origin/HEAD`, if it succeeded.
 * @param current The branch currently checked out.
 * @returns The base and where it came from.
 */
export const baseOf = (
  given: string | undefined,
  remoteDefault: string | undefined,
  current: string,
): { base: string; source: string } => {
  if (given !== undefined && given !== "")
    return { base: given, source: "given" };
  const remote = remoteDefault?.trim().replace(/^origin\//, "");
  if (remote !== undefined && remote !== "")
    return { base: remote, source: "the remote's default branch" };
  return { base: current, source: "the branch currently checked out" };
};
