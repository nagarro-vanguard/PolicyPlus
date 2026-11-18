import { existsSync } from "node:fs";
import { join } from "node:path";

/**
 * Finds a template file: the repository's `templates/` first, then the given folder, then the toolkit copy in `.agents/shared/templates/`.
 * @param repo The repository root.
 * @param name The template's file name, such as `user-story-template.md`.
 * @param templates An extra templates folder, searched second.
 * @returns The first existing template path, or undefined when none has it.
 */
export const resolveTemplate = (
  repo: string,
  name: string,
  templates?: string,
): string | undefined => {
  const folders = [
    join(repo, "templates"),
    ...(templates === undefined ? [] : [templates]),
    join(repo, ".agents", "shared", "templates"),
  ];
  return folders
    .map((folder) => join(folder, name))
    .find((path) => existsSync(path));
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--templates");
  const templates = at === -1 ? undefined : args[at + 1];
  const [repo, name] = args.filter(
    (_, index) => index !== at && index !== at + 1,
  );
  if (
    repo === undefined ||
    name === undefined ||
    args.includes("--help") ||
    args.includes("-h")
  ) {
    console.log(
      "Usage: resolve-template.ts <repo> <name> [--templates <folder>]\n\nPrints the path of the template: `<repo>/templates/` first, then the `--templates` folder, then `<repo>/.agents/shared/templates/`. Exits 1 when none has it.\n\nARGUMENTS\n  repo         The repository root.\n  name         The template's file name.\n  --templates  An extra folder searched second.",
    );
    process.exit(repo === undefined || name === undefined ? 2 : 0);
  }
  const found = resolveTemplate(repo, name, templates);
  console.log(
    found ??
      `no template ${name} in ${repo}/templates, the templates argument or ${repo}/.agents/shared/templates`,
  );
  process.exit(found === undefined ? 1 : 0);
}
