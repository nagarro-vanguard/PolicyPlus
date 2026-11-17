import { SqliteClient } from "@effect/sql-sqlite-bun";
import { Context, Duration, Effect, Layer, Schedule, Scope } from "effect";
import * as Reactivity from "effect/reactivity/Reactivity";
import { SqlClient, SqlError } from "effect/sql";
import { AnalysisConfig } from "../run/analysis-limits";
import { AnalysisRoot } from "../run/analysis-root";
import { RecordStoreOutdated, StoreBusy, StoreFailed, StoreInvariantBroken } from "../run/script-errors";
import { analysisSchema } from "./analysis-schema";
import type { StoreSchema } from "./schema";
import { CountRow, ModelVersionRow, SchemaVersionRow } from "./rows";
import { countOf, decodedRows } from "./stored-bodies";

const askEvery = Duration.millis(100);

const pageCacheKibibytes = 262_144;

export type StoreOpenFailure = StoreFailed | RecordStoreOutdated | StoreBusy;

export interface RecordStoreOps {
    readonly path: string;
    readonly client: Effect.Effect<SqlClient.SqlClient, StoreOpenFailure>;
    readonly query: <A, R>(
        use: (sql: SqlClient.SqlClient) => Effect.Effect<A, SqlError.SqlError, R>,
    ) => Effect.Effect<A, StoreOpenFailure, R>;
    readonly holdStore: <A, E, R>(change: Effect.Effect<A, E, R>) => Effect.Effect<A, E | StoreOpenFailure, R>;
}

/**
 * Whether a database failure is another connection holding the write lock.
 * @param error the failure
 * @returns true when the store is busy
 */
const isBusy = (error: unknown) => SqlError.isSqlError(error) && error.reason._tag === "LockTimeoutError";

/**
 * Whether a database failure is a foreign key or other constraint found broken at commit.
 * @param error the failure
 * @returns true when a constraint failed
 */
const isConstraint = (error: unknown) => SqlError.isSqlError(error) && error.reason._tag === "ConstraintError";

/**
 * Create the tables of an empty store, or refuse a store made with other table definitions. Run inside the write
 * lock, so two commands opening a new store at once create it once. The identity is derived from the statements
 * (`schemaIdentity`, P12.9), never kept by hand. A store of another identity is refused: the person deletes it and
 * runs each stage's finish again, since the store is always rebuilt from `work/` (there is no migration code). Each
 * index in `schemaStatements` is named for the reads it serves.
 * @param sql the client
 * @param path the store's file, named in the refusal
 * @returns nothing once the store's tables are current
 */
const prepareSchema = Effect.fnUntraced(function* (sql: SqlClient.SqlClient, path: string, schema: StoreSchema) {
    const expected = schema.identity;
    const found = yield* identityOf(sql);
    if (found === expected) {
        return;
    }
    const tables = countOf(yield* decodedRows(CountRow)(sql`SELECT count(*) AS count FROM sqlite_schema`));
    if (found !== 0 || tables > 0) {
        return yield* new RecordStoreOutdated({ path, found, expected });
    }
    for (const statement of schema.statements) {
        yield* sql.unsafe(statement);
    }
    yield* sql.unsafe(`PRAGMA user_version = ${expected}`);
});

/**
 * The identity a store holds: 0 for a new, empty file.
 * @param sql the client
 * @returns the identity
 */
const identityOf = Effect.fnUntraced(function* (sql: SqlClient.SqlClient) {
    const [version] = yield* decodedRows(SchemaVersionRow)(sql`PRAGMA user_version`);
    return version === undefined ? 0 : version.user_version;
});

/**
 * Open the store's client: the connection settings every command uses, then the schema made current. The page cache
 * (`pageCacheKibibytes`, 256 MiB) is the most memory SQLite keeps for pages it has read: fixed, measured at 50M lines,
 * and re-measured only past 100M lines or a 30-minute finish. SQLite never waits inside a busy lock (`busyTimeout`
 * zero), since a wait there blocks Ctrl+C; `retryWhileBusy` waits instead.
 * @param path the store's file
 * @returns the client, open for the scope it runs in
 */
const openClient = Effect.fnUntraced(function* (path: string, schema: StoreSchema) {
    const client = yield* SqliteClient.make({ filename: path, busyTimeout: Duration.zero });
    yield* client.unsafe("PRAGMA synchronous = FULL");
    yield* client.unsafe("PRAGMA foreign_keys = ON");
    yield* client.unsafe(`PRAGMA cache_size = -${pageCacheKibibytes}`);
    yield* client.unsafe("PRAGMA temp_store = FILE");
    if ((yield* identityOf(client)) !== schema.identity) {
        yield* retryWhileBusy(client.withTransaction(prepareSchema(client, path, schema)), path);
    }
    if (schema.modelIdentity !== undefined) {
        const [model] = yield* decodedRows(ModelVersionRow)(client`SELECT modelVersion FROM analysis`);
        if (model !== undefined && model.modelVersion !== schema.modelIdentity) {
            return yield* Effect.die(
                new RecordStoreOutdated({ path, found: model.modelVersion, expected: schema.modelIdentity }),
            );
        }
    }
    return client;
});

/**
 * Ask again every `askEvery` while another command holds the write lock, for at most `storeWaitSeconds`, then give up
 * with `StoreBusy`. Each wait between asks is an Effect sleep, so Ctrl+C acts at once.
 * @param change the change to run
 * @param path the store's file, named in the refusal
 * @returns the change's result
 */
const retryWhileBusy = <A, E, R>(change: Effect.Effect<A, E, R>, path: string) =>
    Effect.gen(function* () {
        const { storeWaitSeconds } = yield* AnalysisConfig;
        return yield* change.pipe(
            Effect.retry({
                schedule: Schedule.spaced(askEvery).pipe(
                    Schedule.upTo({ duration: Duration.seconds(storeWaitSeconds) }),
                ),
                while: isBusy,
            }),
            Effect.catchIf(isBusy, () => Effect.fail(new StoreBusy({ path }))),
        );
    });

/**
 * Turn a database failure the services did not map into the store's own failures: a constraint broken in a write,
 * by a statement or at commit, is a defect in the checks before it; anything else a failure of the store.
 * @param path the store's file
 * @returns the mapping
 */
export const storeFailureOf = (path: string) => (error: SqlError.SqlError) =>
    isConstraint(error)
        ? Effect.die(new StoreInvariantBroken({ path, cause: error }))
        : Effect.fail(new StoreFailed({ path, cause: error }));

export class RecordStore extends Context.Service<RecordStore, RecordStoreOps>()("code-analysis/core/RecordStore") {
    /**
     * The store at a path, opened lazily: building the layer opens nothing, so `--help` and commands that never read
     * or write records leave no store behind. The client is held for the layer's scope, since a connection the
     * runtime lets go would release its lock. `RecordStore.layer` is the store of the run's analysis root,
     * `<analysis root>/analysis.sqlite`.
     * @param path the store's file
     * @param schema the tables the store holds: the record store's, unless a command opens another kind of store
     * @returns the layer
     */
    static layerAt(path: string, schema: StoreSchema = analysisSchema): Layer.Layer<RecordStore> {
        return Layer.effect(
            RecordStore,
            Effect.gen(function* () {
                const scope = yield* Scope.Scope;
                const reactivity = yield* Reactivity.Reactivity;
                const client = yield* Effect.cached(
                    openClient(path, schema).pipe(
                        Effect.provideService(Scope.Scope, scope),
                        Effect.provideService(Reactivity.Reactivity, reactivity),
                        Effect.catchTag("SqlError", storeFailureOf(path)),
                    ),
                );
                return RecordStore.of({
                    path,
                    client,
                    /**
                     * Run statements with the client, every database failure turned into the store's own: the one way
                     * the services reach SQL, so no `SqlError` leaves the record store. A read while another
                     * command commits is asked again (`retryWhileBusy`), as a write is: agents read in parallel.
                     * @param use the statements
                     * @returns their result
                     */
                    query: (use) =>
                        Effect.flatMap(client, (sql) =>
                            retryWhileBusy(use(sql), path).pipe(
                                Effect.catchIf(SqlError.isSqlError, storeFailureOf(path)),
                            ),
                        ),
                    /**
                     * Run a change while holding the store's write lock, as one transaction: all of it commits, or
                     * none of it. Another command's write is waited for (`retryWhileBusy`).
                     * @param change the change
                     * @returns its result
                     */
                    holdStore: (change) =>
                        Effect.flatMap(client, (sql) =>
                            retryWhileBusy(sql.withTransaction(change), path).pipe(
                                Effect.catchIf(SqlError.isSqlError, storeFailureOf(path)),
                            ),
                        ),
                });
            }),
        ).pipe(Layer.provide(Reactivity.layer));
    }

    static readonly layer: Layer.Layer<RecordStore, never, AnalysisRoot> = Layer.unwrap(
        Effect.gen(function* () {
            const { paths } = yield* AnalysisRoot;
            return RecordStore.layerAt(paths.recordStore);
        }),
    );
}
