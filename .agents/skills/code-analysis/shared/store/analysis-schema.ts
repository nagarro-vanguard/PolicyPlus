import { historyStatements, runHistoryVersion } from "./run-history-schema";
import { modelIdentityOf, modelStatements } from "./model-schema";
import { schemaStatements, type StoreSchema } from "./schema";
import { recordShapes } from "../model/record-shapes";

const modelIdentity = modelIdentityOf(schemaStatements);

/**
 * The tables of `analysis.sqlite`: the accepted model (the record store's tables) beside the run history. The file's
 * identity is the run history's version, which changes only by adding to it; the accepted model's identity is kept in
 * `analysis.modelVersion`, and a file whose model was made with other table definitions is made again by running the
 * stages, never migrated. The model's identity covers its SQL only; `analysis.recordShapes` keeps the fingerprint of
 * the record shapes (`recordShapes`) the stored records were last checked against, so a change to a record's shape is
 * seen when the store opens. A store made before the column existed gains it on first open, its records checked and
 * the fingerprint stamped, with nothing lost (`settleRecordShapes`). `analysis.repository` and `analysis.commitId` say
 * where the code came from (`shared/read/provenance.ts`): both NULL when nothing was recorded, the repository empty
 * and the commit NULL when no source root is in a git repository.
 */
export const analysisSchema: StoreSchema = {
    identity: runHistoryVersion,
    modelIdentity,
    recordShapes,
    statements: [
        `CREATE TABLE analysis (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            repository TEXT,
            commitId TEXT,
            skillVersion TEXT NOT NULL,
            requestPath TEXT,
            requestDigest TEXT,
            runHistoryVersion INTEGER NOT NULL,
            modelVersion INTEGER NOT NULL,
            recordShapes TEXT
        ) STRICT`,
        ...schemaStatements,
        ...modelStatements,
        ...historyStatements,
        `INSERT INTO analysis (id, skillVersion, runHistoryVersion, modelVersion)
            VALUES (1, 'code-analysis', ${runHistoryVersion}, ${modelIdentity})`,
    ],
};
