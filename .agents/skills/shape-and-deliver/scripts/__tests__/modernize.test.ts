import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { describe, expect, it } from "vitest";
import { launchStory } from "../core/story";
import { runLayout } from "../core/run-layout";
import { servicesLayer } from "../core/services";
import { sharedArguments } from "../core/record-stage";
import { unknownTags, workflowOf } from "../core/workflows";
import { launch } from "../progress-console";
import { writeFiles } from "./support/codebase-fixture";
import { scenarios, storyNumber, storyUrl } from "./support/delivery-scenarios";
import { deliveryCodebase } from "./support/drive-delivery";

const reference = "# Legacy attachment\n\nAC-1: rule R-1 (frmPolicy.vb)\n";

/**
 * Launches the story of a scenario with its tags replaced, as `start.ts` does, with an attachment file when given.
 * @param codebase the codebase
 * @param tags the story's tags
 * @param attachment the attachment's text, or undefined for no `--reference`
 * @returns the effect's promise of the launch
 */
const start = async (codebase: string, tags: string, attachment: string | undefined) => {
    const storyFile = join(codebase, ".artifacts", "story.md");
    const referenceFile = join(codebase, ".artifacts", "reference.md");
    writeFiles(codebase, {
        ".artifacts/story.md": scenarios.feature.story.replace("tags: story, functional", `tags: ${tags}`),
        ...(attachment === undefined ? {} : { ".artifacts/reference.md": attachment }),
    });
    return Effect.runPromise(
        launchStory({
            url: storyUrl,
            storyFile,
            epicFile: undefined,
            referenceFile: attachment === undefined ? undefined : referenceFile,
            instructions: undefined,
            approve: false,
            codebase,
        }).pipe(Effect.provide(servicesLayer)),
    );
};

describe("the modernize tag", () => {
    it("names two workflows with a reference and leaves the others without", () => {
        expect(workflowOf(["story", "functional", "modernize"])).toMatchObject({
            kind: "feature",
            profile: "build",
            reference: true,
        });
        expect(workflowOf(["modernize", "technical", "story"])).toMatchObject({
            kind: "technical",
            profile: "technical",
            reference: true,
        });
        expect(workflowOf(["story", "functional"])).not.toHaveProperty("reference");
        expect(workflowOf(["story", "bug", "modernize"])).toBeUndefined();
        expect(unknownTags(["story"])).toContain('"story functional modernize", "story technical modernize"');
    });

    it("keeps the attachment in the run folder and in the request, with its profile addendum", async () => {
        const codebase = deliveryCodebase();
        const launched = await start(codebase, "story, functional, modernize", reference);
        const layout = runLayout(codebase, storyNumber);
        expect(readFileSync(layout.reference, "utf8")).toBe(reference);
        expect(launched.launch).toMatchObject({ mode: "plan", reference: layout.reference });
        const material = launched.launch.mode === "plan" ? (launched.launch.supportingMaterial ?? []) : [];
        expect(material.map((one) => one.path)).toEqual(
            expect.arrayContaining([layout.reference, expect.stringMatching(/profiles[/\\]modernize\.md$/)]),
        );
        await launch(launched.launch, () => undefined);
        expect(readFileSync(layout.planRequest, "utf8")).toContain(layout.reference);
    });

    it("refuses a modernize story without --reference, and --reference for any other story", async () => {
        const codebase = deliveryCodebase();
        await expect(start(codebase, "story, functional, modernize", undefined)).rejects.toThrow(/--reference/);
        await expect(start(codebase, "story, functional", reference)).rejects.toThrow(/--reference is for stories/);
    });

    it("starts the plan again when the attachment changes, and not when it does not", async () => {
        const codebase = deliveryCodebase();
        const layout = runLayout(codebase, storyNumber);
        await launch((await start(codebase, "story, functional, modernize", reference)).launch, () => undefined);
        mkdirSync(layout.trace.folder, { recursive: true });
        writeFileSync(join(layout.trace.folder, "note.txt"), "x");
        await launch((await start(codebase, "story, functional, modernize", `${reference}\n`)).launch, () => undefined);
        expect(existsSync(join(layout.work, "earlier"))).toBe(false);
        await launch(
            (await start(codebase, "story, functional, modernize", `${reference}AC-2: rule R-2\n`)).launch,
            () => undefined,
        );
        expect(existsSync(join(layout.work, "earlier", "1"))).toBe(true);
    });

    it("hands the attachment's path to every stage only when the run has one", () => {
        const base = { codebase: { root: "/c" }, layout: runLayout("/c", "1") };
        expect(sharedArguments({ ...base, request: { reference: "/c/ref.md" } })).toMatchObject({
            referencePath: "/c/ref.md",
        });
        expect(sharedArguments({ ...base, request: {} })).not.toHaveProperty("referencePath");
    });
});
