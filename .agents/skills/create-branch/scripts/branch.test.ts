import { describe, expect, it } from "vitest";
import { baseOf, branchName } from "./branch";

describe("a branch's name", () => {
  it("takes its type from the tag and its slug from five words", () => {
    expect(
      branchName("42", "Create a project from the Home page, please", [
        "functional",
      ]),
    ).toEqual({ name: "feat/42-create-a-project-from-the" });
    expect(branchName("7", "Fix the crash", ["x", "bug"])).toEqual({
      name: "fix/7-fix-the-crash",
    });
    expect(branchName("8", "Split the policy loader", ["technical"])).toEqual({
      name: "refactor/8-split-the-policy-loader",
    });
  });

  it("refuses an item with no type or no words", () => {
    expect(branchName("1", "Title", ["other"])).toHaveProperty("error");
    expect(branchName("1", "!!!", ["bug"])).toHaveProperty("error");
  });
});

describe("a branch's base", () => {
  it("is the one given, else the remote's default, else the current branch", () => {
    expect(baseOf("develop", "origin/master", "x")).toEqual({
      base: "develop",
      source: "given",
    });
    expect(baseOf(undefined, "origin/master\n", "x")).toEqual({
      base: "master",
      source: "the remote's default branch",
    });
    expect(baseOf(undefined, undefined, "topic")).toEqual({
      base: "topic",
      source: "the branch currently checked out",
    });
  });
});
