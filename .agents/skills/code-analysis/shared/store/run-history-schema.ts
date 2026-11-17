export const runHistoryVersion = 1;

/**
 * The two triggers that refuse a change to a run history table once a row is written.
 * @param table the table
 * @returns the statements
 */
const insertOnly = (table: string) => [
    `CREATE TRIGGER ${table}NoUpdate BEFORE UPDATE ON ${table} BEGIN SELECT RAISE(ABORT, 'run history is insert-only'); END`,
    `CREATE TRIGGER ${table}NoDelete BEFORE DELETE ON ${table} BEGIN SELECT RAISE(ABORT, 'run history is insert-only'); END`,
];

const historyTables = [
    "stageRun",
    "runJob",
    "decision",
    "batch",
    "batchEvent",
    "stageDocument",
    "stageStop",
    "batchClosed",
    "batchForgotten",
] as const;

/**
 * The tables of `analysis.sqlite`'s first two planes: the run (`analysis`, `file`) and its run history: the stage runs,
 * their jobs, the decisions that are each job's state and the batches that dispatched them. The run history is
 * insert-only: a job's state is its latest decision (`jobState`), never a row changed in place. The accepted model and
 * the derived tables are rebuilt by each stage's `finish` from the records in `work/`.
 */
export const historyStatements: readonly string[] = [
    `CREATE TABLE stageRun (
            stageRun INTEGER PRIMARY KEY,
            stage TEXT NOT NULL,
            generation INTEGER NOT NULL,
            openedAt TEXT NOT NULL,
            UNIQUE (stage, generation)
        ) STRICT`,
    `CREATE TABLE runJob (
            runJob INTEGER PRIMARY KEY,
            stageRun INTEGER NOT NULL REFERENCES stageRun,
            key TEXT NOT NULL,
            unit TEXT CHECK (unit IS NULL OR json_valid(unit)),
            UNIQUE (stageRun, key)
        ) STRICT`,
    `CREATE TABLE decision (
            decision INTEGER PRIMARY KEY,
            job INTEGER NOT NULL REFERENCES runJob,
            kind TEXT NOT NULL,
            outcome TEXT NOT NULL,
            round INTEGER NOT NULL,
            note TEXT CHECK (note IS NULL OR json_valid(note)),
            at TEXT NOT NULL
        ) STRICT`,
    `CREATE INDEX decisionByJob ON decision (job, decision DESC)`,
    `CREATE TABLE batch (
            stageRun INTEGER NOT NULL REFERENCES stageRun,
            batch TEXT NOT NULL,
            dispatchedAt TEXT NOT NULL,
            registryHash TEXT,
            registryBytes INTEGER,
            promptBytes INTEGER NOT NULL,
            PRIMARY KEY (stageRun, batch)
        ) STRICT, WITHOUT ROWID`,
    `CREATE TABLE batchEvent (
            batchEvent INTEGER PRIMARY KEY,
            stageRun INTEGER NOT NULL REFERENCES stageRun,
            batch TEXT NOT NULL,
            job INTEGER NOT NULL REFERENCES runJob,
            pass TEXT NOT NULL CHECK (pass IN ('agent', 'review')),
            kind TEXT NOT NULL CHECK (kind IN ('dispatched', 'done', 'closed', 'abandoned')),
            seconds REAL,
            at TEXT NOT NULL
        ) STRICT`,
    `CREATE TABLE stageDocument (
            stageDocument INTEGER PRIMARY KEY,
            stageRun INTEGER NOT NULL REFERENCES stageRun,
            name TEXT NOT NULL,
            body TEXT
        ) STRICT`,
    `CREATE INDEX stageDocumentByName ON stageDocument (stageRun, name, stageDocument DESC)`,
    `CREATE TABLE stageStop (
            stageStop INTEGER PRIMARY KEY,
            stageRun INTEGER NOT NULL REFERENCES stageRun,
            reason TEXT
        ) STRICT`,
    `CREATE INDEX stageStopByRun ON stageStop (stageRun, stageStop DESC)`,
    `CREATE TABLE batchClosed (
            stageRun INTEGER NOT NULL REFERENCES stageRun,
            batch TEXT NOT NULL,
            closedAt TEXT NOT NULL,
            PRIMARY KEY (stageRun, batch)
        ) STRICT, WITHOUT ROWID`,
    `CREATE TABLE batchForgotten (
            stageRun INTEGER NOT NULL REFERENCES stageRun,
            batch TEXT NOT NULL,
            PRIMARY KEY (stageRun, batch)
        ) STRICT, WITHOUT ROWID`,
    `CREATE VIEW jobState AS
            SELECT d.job, d.decision, d.kind, d.outcome, d.round, d.note, d.at
            FROM decision d
            WHERE d.decision = (SELECT max(x.decision) FROM decision x WHERE x.job = d.job)`,
    ...historyTables.flatMap(insertOnly),
];
