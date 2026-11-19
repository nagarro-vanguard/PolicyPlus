import { basename } from "node:path";
import { Effect, Schema } from "effect";
import { FileSummary } from "../model/schemas/file-listing";
import { analysisPaths } from "../run/analysis-layout";
import { AnalysisRequest } from "../run/analysis-request";
import { readDocument } from "../run/json-files";
import { FileAccess } from "../source/file-access";
import { GitRepository } from "../source/git-repository";
import type { RecordStore } from "../store/database";
import { read } from "./payload-queries";

const SourceRow = Schema.Struct({ repository: Schema.NullOr(Schema.String), commitId: Schema.NullOr(Schema.String) });

type SourceRow = typeof SourceRow.Type;

/** One source root and the commit its repository was at when its files were listed; null outside git. */
export type RootHead = { readonly root: string; readonly commit: string | null };

/**
 * Several values as one, each once, in their order.
 * @param values the values
 * @returns them joined by commas
 */
const joined = (values: readonly string[]) => [...new Set(values)].join(", ");

/**
 * What the analysis records of where its code came from, from each root's commit at listing time: the repository each
 * root is in (its remote's address, else its working tree's folder name) and the commit, each joined across roots when
 * there are several. When no root is in a git repository the repository is recorded as empty and the commit as none,
 * which tells "not a git repository" apart from "not recorded" (a NULL repository).
 * @param heads each source root with its commit
 * @returns the repository and the commit as the store keeps them
 */
const sourceOf = Effect.fnUntraced(function* (heads: readonly RootHead[]) {
    const git = yield* GitRepository;
    const inGit = heads.flatMap((head) => (head.commit === null ? [] : [{ root: head.root, commit: head.commit }]));
    const addresses: string[] = [];
    for (const head of inGit) {
        addresses.push(yield* Effect.orElseSucceed(git.addressOf(head.root), () => basename(head.root)));
    }
    return {
        repository: joined(addresses),
        commitId: inGit.length === 0 ? null : joined(inGit.map((head) => head.commit)),
    };
});

/**
 * Keep where the code came from in the store's `analysis` row, when Inventory lists the files: the commit each root
 * was at then, and the repository it is in.
 * @param store the record store
 * @param heads each source root with its commit at listing time
 * @returns nothing once kept
 */
export const rememberSource = Effect.fnUntraced(function* (store: RecordStore["Service"], heads: readonly RootHead[]) {
    const source = yield* sourceOf(heads);
    yield* store.query(
        (sql) => sql`UPDATE analysis SET repository = ${source.repository}, commitId = ${source.commitId}`,
    );
});

/**
 * The store's record of where the code came from.
 * @param store the record store, read only
 * @returns the repository and commit columns, both null when nothing was recorded
 */
const sourceRow = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    const [row] = yield* read(store, SourceRow, (sql) => sql`SELECT repository, commitId FROM analysis`);
    const none: SourceRow = { repository: null, commitId: null };
    return row === undefined ? none : row;
});

/**
 * Record where the code came from in a store made before Inventory kept it: from the commits Inventory wrote beside
 * its file list (`work/inventory/file-summary.json`), which state the commit that was analysed, not today's. A store
 * that already records it, or a run with no file list, is left as it is. Nothing else in the store changes.
 * @param store the record store
 * @param root the analysis root
 * @returns nothing once settled
 */
export const settleSource = Effect.fnUntraced(function* (store: RecordStore["Service"], root: string) {
    const paths = analysisPaths(root);
    const files = yield* FileAccess;
    if ((yield* sourceRow(store)).repository !== null) {
        return;
    }
    if (!(yield* files.exists(paths.fileSummary)) || !(yield* files.exists(paths.analysisRequest))) {
        return;
    }
    const { sourceRoots } = yield* readDocument(paths.analysisRequest, AnalysisRequest);
    const { roots } = yield* readDocument(paths.fileSummary, FileSummary);
    if (roots.length !== sourceRoots.length) {
        return;
    }
    yield* rememberSource(
        store,
        sourceRoots.flatMap((each, index) => {
            const listed = roots[index];
            return listed === undefined ? [] : [{ root: each, commit: listed.commit }];
        }),
    );
});

/**
 * The commit a context names: the commit id; a plain statement that the source folder is not a git repository; or
 * that nothing was recorded, for a store whose run never listed its files.
 * @param row the store's record of where the code came from
 * @returns the commit, or the statement
 */
const commitText = (row: SourceRow) => {
    if (row.commitId !== null) {
        return row.commitId;
    }
    return row.repository === null
        ? "not recorded: the run did not record which commit it read"
        : "none: the source folder is not a git repository";
};

/**
 * The commit the analysis describes, as every context names it.
 * @param store the record store, read only
 * @returns the commit id, or a statement saying why there is none
 */
export const commitOf = Effect.fnUntraced(function* (store: RecordStore["Service"]) {
    return commitText(yield* sourceRow(store));
});

/**
 * The system's name, derived from the code's folders: each source root's folder name, joined; the analysis root's
 * folder name when the run has no request to read.
 * @param root the analysis root
 * @returns the name
 */
const nameOf = Effect.fnUntraced(function* (root: string) {
    const paths = analysisPaths(root);
    if (!(yield* (yield* FileAccess).exists(paths.analysisRequest))) {
        return basename(root);
    }
    const { sourceRoots } = yield* readDocument(paths.analysisRequest, AnalysisRequest);
    return [...new Set(sourceRoots.map((each) => basename(each)))].join(" and ");
});

/**
 * What the system payload says of the system itself: its name, the repository its code is in and the commit analysed;
 * the repository and commit null when no source root is in a git repository or nothing was recorded.
 * @param store the record store, read only
 * @param root the analysis root
 * @returns the name, repository and commit
 */
export const provenanceOf = Effect.fnUntraced(function* (store: RecordStore["Service"], root: string) {
    const row = yield* sourceRow(store);
    return {
        name: yield* nameOf(root),
        repository: row.repository === null || row.repository === "" ? null : row.repository,
        commit: row.commitId,
    };
});
