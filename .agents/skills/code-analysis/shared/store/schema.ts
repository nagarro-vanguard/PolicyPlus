import type { RecordShapes } from "../model/record-shapes";

export const schemaStatements: readonly string[] = [
    `CREATE TABLE file (
        fileNumber INTEGER PRIMARY KEY,
        path TEXT NOT NULL UNIQUE,
        lines INTEGER,
        bytes INTEGER,
        hash TEXT,
        readsAs TEXT,
        encoding TEXT,
        readFrom TEXT,
        copyOf INTEGER REFERENCES file
    ) STRICT`,
    `CREATE INDEX fileByCopy ON file (copyOf) WHERE copyOf IS NOT NULL`,
    `CREATE TABLE stageWrite (
        stage TEXT PRIMARY KEY,
        rank INTEGER NOT NULL,
        digest TEXT NOT NULL
    ) STRICT`,
    `CREATE TABLE job (
        jobNumber INTEGER PRIMARY KEY,
        stage TEXT NOT NULL REFERENCES stageWrite ON DELETE CASCADE,
        jobId TEXT NOT NULL,
        UNIQUE (stage, jobId)
    ) STRICT`,
    `CREATE TABLE record (
        recordNumber INTEGER PRIMARY KEY,
        id TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        stage TEXT NOT NULL REFERENCES stageWrite ON DELETE CASCADE,
        jobNumber INTEGER REFERENCES job,
        fileNumber INTEGER REFERENCES file,
        firstLine INTEGER,
        lastLine INTEGER,
        body TEXT NOT NULL CHECK (json_valid(body))
    ) STRICT`,
    `CREATE INDEX recordByStageAndType ON record (stage, type)`,
    `CREATE INDEX recordByStageAndJob ON record (stage, jobNumber)`,
    `CREATE INDEX recordByPosition ON record (type, fileNumber, firstLine)`,
    `CREATE TABLE citation (
        fromRecord INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        toRecord INTEGER NOT NULL REFERENCES record DEFERRABLE INITIALLY DEFERRED,
        PRIMARY KEY (fromRecord, toRecord)
    ) STRICT, WITHOUT ROWID`,
    `CREATE INDEX citationByCited ON citation (toRecord)`,
    `CREATE TABLE linkEnd (
        linkRecord INTEGER PRIMARY KEY REFERENCES record ON DELETE CASCADE,
        kind TEXT NOT NULL,
        fromBlock INTEGER REFERENCES record,
        toBlock INTEGER REFERENCES record,
        toExternalSystem INTEGER REFERENCES record,
        resource TEXT,
        toFile INTEGER REFERENCES file,
        toLine INTEGER,
        CHECK ((toExternalSystem IS NULL) = (resource IS NULL))
    ) STRICT`,
    `CREATE INDEX linkEndByFromBlock ON linkEnd (fromBlock, kind)`,
    `CREATE INDEX linkEndByToBlock ON linkEnd (toBlock) WHERE toBlock IS NOT NULL`,
    `CREATE INDEX linkEndByExternalSystem ON linkEnd (toExternalSystem, resource) WHERE toExternalSystem IS NOT NULL`,
    `CREATE TABLE resource (
        resourceNumber INTEGER PRIMARY KEY,
        id TEXT NOT NULL UNIQUE,
        externalSystem INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        resource TEXT NOT NULL,
        UNIQUE (externalSystem, resource)
    ) STRICT`,
    `CREATE VIEW blockSpan AS
        SELECT recordNumber, fileNumber AS fileLow, fileNumber AS fileHigh, firstLine, lastLine
        FROM record WHERE type = 'Block' AND fileNumber IS NOT NULL`,
    `CREATE TABLE entryPoint (
        recordNumber INTEGER PRIMARY KEY REFERENCES record ON DELETE CASCADE
    ) STRICT`,
    `CREATE TABLE entryPointReach (
        entryPoint INTEGER NOT NULL REFERENCES entryPoint ON DELETE CASCADE,
        block INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        PRIMARY KEY (entryPoint, block)
    ) STRICT, WITHOUT ROWID`,
    `CREATE INDEX entryPointReachByBlock ON entryPointReach (block, entryPoint)`,
];

export type StoreSchema = {
    readonly statements: readonly string[];
    readonly identity: number;
    readonly modelIdentity: number | undefined;
    readonly recordShapes?: () => RecordShapes;
};
