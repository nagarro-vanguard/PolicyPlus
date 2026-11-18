import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { resolveTemplate } from "./resolve-template";

/**
 * Writes a template file, making its folder.
 * @param folder The folder to write in.
 * @param name The file name.
 * @returns The file's path.
 */
const put = (folder: string, name: string): string => {
  mkdirSync(folder, { recursive: true });
  writeFileSync(join(folder, name), "x");
  return join(folder, name);
};

describe("a template's lookup", () => {
  const repo = mkdtempSync(join(tmpdir(), "templates-"));
  const extra = join(repo, "elsewhere");
  const shared = join(repo, ".agents", "shared", "templates");

  it("prefers the repository, then the argument, then the shared copy", () => {
    const fromShared = put(shared, "a.md");
    expect(resolveTemplate(repo, "a.md", extra)).toBe(fromShared);
    const fromExtra = put(extra, "a.md");
    expect(resolveTemplate(repo, "a.md", extra)).toBe(fromExtra);
    expect(resolveTemplate(repo, "a.md")).toBe(fromShared);
    const own = put(join(repo, "templates"), "a.md");
    expect(resolveTemplate(repo, "a.md", extra)).toBe(own);
  });

  it("reports a template nobody has", () => {
    expect(resolveTemplate(repo, "missing.md", extra)).toBeUndefined();
  });
});
