import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getEntry } from "astro:content";
import { planProblems } from "./plan";
import type { Ledger, Plan, Prompts } from "./plan";
import { slugify } from "./slugs";

/** Whether this build has a plan to show: the folder that holds it is named in the environment. */
export const hasPlan = () => (process.env.PLAN_DIR ?? "") !== "";

export type PlanData = {
    readonly plan: Plan;
    readonly prompts: Prompts;
    readonly ledger: Ledger | undefined;
    /** The AGENTS.md previews by folder: `""` is the root's, the others a layer's folder name. */
    readonly previews: ReadonlyMap<string, string>;
};

let cache: Promise<PlanData> | undefined;

/**
 * The AGENTS.md previews the scaffold will write, read as they are: the root's and one per layer folder.
 * @param folder the folder holding them
 * @returns the text by layer folder name; the root's under the empty name
 */
const previewsIn = (folder: string) => {
    const previews = new Map<string, string>();
    if (!existsSync(folder)) return previews;
    if (existsSync(join(folder, "AGENTS.md"))) previews.set("", readFileSync(join(folder, "AGENTS.md"), "utf8"));
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
        const file = join(folder, entry.name, "AGENTS.md");
        if (entry.isDirectory() && existsSync(file)) previews.set(slugify(entry.name), readFileSync(file, "utf8"));
    }
    return previews;
};

/**
 * The plan, its prompts, the ledger and the AGENTS.md previews, checked together: a plan that names a story it does not
 * hold, or a story or epic without its prompt, fails the build.
 * @returns the plan data, made once per build
 */
export const planData = (): Promise<PlanData> => {
    const made = (cache ??= (async () => {
        const planDir = process.env.PLAN_DIR ?? "";
        if (planDir === "") throw new Error("no plan: PLAN_DIR is not set");
        const plan = await getEntry("plan", "plan");
        const prompts = await getEntry("prompts", "prompts");
        if (plan === undefined) throw new Error(`${planDir} holds no .modernization-backlog/payloads/plan.json`);
        if (prompts === undefined) throw new Error(`${planDir} holds no .modernization-backlog/payloads/prompts.json`);
        const ledger = await getEntry("ledger", "ledger");
        const problems = planProblems(plan.data as unknown as Plan, prompts.data as unknown as Prompts);
        if (problems.length > 0) {
            throw new Error(`the plan cannot be shown:\n${problems.slice(0, 20).join("\n")}`);
        }
        return {
            plan: plan.data as unknown as Plan,
            prompts: prompts.data as unknown as Prompts,
            ledger: ledger?.data as unknown as Ledger | undefined,
            previews: previewsIn(join(planDir, "work-items", "agents-md")),
        };
    })());
    return made;
};
