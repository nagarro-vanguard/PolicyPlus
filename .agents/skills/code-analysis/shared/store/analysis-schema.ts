import { historyStatements, runHistoryVersion } from "./run-history-schema";
import { modelIdentityOf, modelStatements } from "./model-schema";
import { schemaStatements, type StoreSchema } from "./schema";

const modelIdentity = modelIdentityOf(schemaStatements);

/**
 * The tables of `analysis.sqlite`: the accepted model (the record store's tables) beside the run history. The file's
 * identity is the run history's version, which changes only by adding to it; the accepted model's identity is kept in
 * `analysis.modelVersion`, and a file whose model was made with other table definitions is made again by running the
 * stages, never migrated.
 */
export const analysisSchema: StoreSchema = {
    identity: runHistoryVersion,
    modelIdentity,
    statements: [
        `CREATE TABLE analysis (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            repository TEXT,
            commitId TEXT,
            skillVersion TEXT NOT NULL,
            requestPath TEXT,
            requestDigest TEXT,
            runHistoryVersion INTEGER NOT NULL,
            modelVersion INTEGER NOT NULL
        ) STRICT`,
        ...schemaStatements,
        ...modelStatements,
        ...historyStatements,
        `INSERT INTO analysis (id, skillVersion, runHistoryVersion, modelVersion)
            VALUES (1, 'code-analysis', ${runHistoryVersion}, ${modelIdentity})`,
    ],
};
