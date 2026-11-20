import { join } from "node:path";
import { Effect, Schema } from "effect";
import { skillRoot } from "../../shared/run/analysis-layout";
import type { Catalogue } from "../../shared/run/catalogue";
import type { SurfaceKind } from "../../shared/model/schemas/surface-kind";
import { read } from "../../shared/read/payload-queries";
import { readSurfaceModel } from "../../shared/read/surfaces";
import { RecordStore } from "../../shared/store/database";

const guidesFolder = join(skillRoot, "guides", "presentation");

/**
 * The guides on naming places the briefing agent is given, chosen by rule from the kinds of part the system has and
 * the kinds of place its code kinds suggest: the generic guide always, then desktop for windows, web and API for pages,
 * services, sites and service parts, scheduled tasks for tasks, and tests, build and release for tests, build steps,
 * commands, and tests or tool parts.
 * @param partKinds the kinds of the system's parts
 * @param kinds the kinds of place its entry points are
 * @returns the guides' paths, in a fixed order
 */
const guidesFor = (partKinds: readonly string[], kinds: readonly SurfaceKind[]) => {
    const has = (kind: SurfaceKind) => kinds.includes(kind);
    const part = (kind: string) => partKinds.includes(kind);
    return [
        "generic.md",
        ...(has("screen") ? ["desktop.md"] : []),
        ...(has("page") || has("service") || part("site") || part("service") ? ["web-and-api.md"] : []),
        ...(has("task") ? ["scheduled-task.md"] : []),
        ...(has("test") || has("buildStep") || has("command") || part("tests") || part("tool")
            ? ["tests-build-release.md"]
            : []),
    ].map((name) => join(guidesFolder, name));
};

const KindRow = Schema.Struct({ kind: Schema.String });

/**
 * The guides for this system, from its parts and the kinds of place its entry points are (`guidesFor`).
 * @param catalogue the catalogue, for the kinds of place
 * @returns the guides' paths
 */
export const briefingGuides = Effect.fnUntraced(function* (catalogue: Catalogue) {
    const store = yield* RecordStore;
    const parts = yield* read(
        store,
        KindRow,
        (sql) => sql`SELECT coalesce(json_extract(body, '$.kind'), '') AS kind FROM record WHERE type = 'SystemPart'`,
    );
    const model = yield* readSurfaceModel(store, catalogue);
    return guidesFor(
        parts.map((row) => row.kind),
        model.entries.map(model.kindOf),
    );
});
