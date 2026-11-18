import { drawDiagram } from "../page-components/components/diagram";
import { layerOfPath, type Codebase } from "./codebase";
import type { WorkItem } from "./documents";
import { layersForcingDecision } from "./policy";
import type { RecordOf } from "./record-files";

/** The file names of the common dependency manifests: a plan that changes one records why. */
const dependencyManifests: ReadonlySet<string> = new Set([
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "Pipfile",
    "go.mod",
    "Cargo.toml",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "Gemfile",
    "composer.json",
    "Package.swift",
    "Podfile",
]);

/** The file name endings that mark a dependency manifest whose name varies: a .NET project file. */
const dependencyManifestSuffixes: readonly string[] = [".csproj"];

/**
 * Whether a path is a dependency manifest.
 * @param path the path, relative to the codebase root, with `/` separators
 * @returns true when its file name is a manifest name or ends in a manifest suffix
 */
const isDependencyManifest = (path: string) => {
    const name = path.split("/").at(-1) ?? "";
    return dependencyManifests.has(name) || dependencyManifestSuffixes.some((suffix) => name.endsWith(suffix));
};

/**
 * Checks each plan diagram is about something the plan holds (a criterion, a traced step or a design decision) and
 * that its source can be drawn. Whether the diagram is right, or the plan owed one, is left to the reviewer.
 * @param workItem the work item
 * @param plan what the plan holds
 * @param plan.views the PlanView records
 * @param plan.decisions the DesignDecision records
 * @param plan.stepIds the ids of the traced path steps
 * @returns one sentence per gap
 */
export const viewGaps = (
    workItem: WorkItem,
    plan: {
        readonly views: readonly RecordOf<"PlanView">[];
        readonly decisions: readonly RecordOf<"DesignDecision">[];
        readonly stepIds: ReadonlySet<string>;
    },
) => {
    const known = new Set([
        ...workItem.criteria.map((criterion) => criterion.ac),
        ...plan.stepIds,
        ...plan.decisions.map((decision) => decision.id),
    ]);
    return plan.views.flatMap((view) => {
        const drawn = drawDiagram(view.source);
        return [
            ...view.about
                .filter((subject) => !known.has(subject))
                .map(
                    (subject) =>
                        `${view.id} is about ${subject}, which is no criterion, traced step or design decision`,
                ),
            ...("fault" in drawn ? [`${view.id}'s source cannot be drawn: ${drawn.fault}`] : []),
        ];
    });
};

/**
 * Checks the plan records design decisions where it must: at least one for a design, for changes in two or more
 * layers, or for a changed package manifest. Each decision's `about` entries must be a traced step or a criterion; an
 * empty `about` passes.
 * @param codebase the codebase and its layers
 * @param workItem the work item
 * @param plan what the plan holds
 * @param plan.changes the ChangedFile records
 * @param plan.decisions the DesignDecision records
 * @param plan.stepIds the ids of the traced path steps
 * @returns one sentence per gap
 */
export const decisionGaps = (
    codebase: Codebase,
    workItem: WorkItem,
    plan: {
        readonly changes: readonly Pick<RecordOf<"ChangedFile">, "path">[];
        readonly decisions: readonly RecordOf<"DesignDecision">[];
        readonly stepIds: ReadonlySet<string>;
    },
) => {
    const gaps: string[] = [];
    if (workItem.kind === "design" && plan.decisions.length === 0) {
        gaps.push(
            "a design records no DesignDecision: write what it reuses from the design system, its tokens and accessible patterns, and why it has the variants it has",
        );
    }
    if (workItem.kind === "design" && codebase.screens !== undefined) {
        const root = codebase.screens.variants.replaceAll("{story}", workItem.id);
        const parent = root.slice(0, root.lastIndexOf("/") + 1);
        const stray = plan.changes.find(({ path }) => path.startsWith(parent) && !path.startsWith(`${root}/`));
        if (stray !== undefined) {
            gaps.push(
                `${stray.path} is a design file outside ${root}: the pick looks for the story's number, so every variant goes in a folder under ${root}`,
            );
        }
    }
    const layers = new Set(
        plan.changes.flatMap((change) => {
            const layer = layerOfPath(codebase, change.path);
            return layer === undefined ? [] : [layer.name];
        }),
    );
    const manifests = plan.changes.filter((change) => isDependencyManifest(change.path));
    if (plan.decisions.length === 0 && (layers.size >= layersForcingDecision || manifests.length > 0)) {
        gaps.push(
            layers.size >= layersForcingDecision
                ? `the plan changes ${layers.size} layers (${[...layers].join(", ")}) but records no DesignDecision: write the choices that shape the files, each with the alternative rejected`
                : `the plan changes a package manifest but records no DesignDecision: write why the dependency, and what it was chosen over`,
        );
    }
    const criteria = new Set(workItem.criteria.map((criterion) => criterion.ac));
    for (const decision of plan.decisions) {
        for (const subject of decision.about) {
            if (!plan.stepIds.has(subject) && !criteria.has(subject)) {
                gaps.push(`${decision.id} is about ${subject}, which is no traced step or criterion`);
            }
        }
    }
    return gaps;
};
