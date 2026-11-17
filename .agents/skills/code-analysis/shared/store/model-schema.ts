import { relationStatements } from "../read/relations";
import { sha1Hex } from "../run/hashing-and-random";

/**
 * The accepted model's tables beyond the record store's: what a note cites (`span`), what a record refers to (`ref`), and
 * what is derived from them (`ruleBlock`, `filePart`, `blockCapability`, `layerEdge`, `entryPointLayer`, `blockFanIn`). Every row is
 * rebuilt from the records by each stage's write, so a change here is made by running the stages again, never migrated.
 */
export const modelStatements: readonly string[] = [
    `CREATE TABLE span (
        note INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        role TEXT NOT NULL,
        ordinal INTEGER NOT NULL,
        fileNumber INTEGER NOT NULL REFERENCES file,
        firstLine INTEGER NOT NULL,
        lastLine INTEGER NOT NULL,
        PRIMARY KEY (note, role, ordinal)
    ) STRICT, WITHOUT ROWID`,
    `CREATE INDEX spanByPosition ON span (fileNumber, firstLine)`,
    `CREATE TABLE ref (
        fromRecord INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        role TEXT NOT NULL,
        toRecord INTEGER NOT NULL REFERENCES record DEFERRABLE INITIALLY DEFERRED,
        PRIMARY KEY (fromRecord, role, toRecord)
    ) STRICT, WITHOUT ROWID`,
    `CREATE INDEX refByTarget ON ref (toRecord, role)`,
    `CREATE TABLE ruleBlock (
        rule INTEGER PRIMARY KEY REFERENCES record ON DELETE CASCADE,
        block INTEGER REFERENCES record ON DELETE CASCADE
    ) STRICT`,
    `CREATE INDEX ruleBlockByBlock ON ruleBlock (block) WHERE block IS NOT NULL`,
    `CREATE TABLE filePart (
        fileNumber INTEGER PRIMARY KEY REFERENCES file,
        part INTEGER NOT NULL REFERENCES record ON DELETE CASCADE
    ) STRICT`,
    `CREATE TABLE blockCapability (
        block INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        capability INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        PRIMARY KEY (block, capability)
    ) STRICT, WITHOUT ROWID`,
    `CREATE INDEX blockCapabilityByCapability ON blockCapability (capability, block)`,
    `CREATE TABLE layerEdge (
        fromLayer INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        toLayer INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        kind TEXT NOT NULL,
        links INTEGER NOT NULL,
        PRIMARY KEY (fromLayer, toLayer, kind)
    ) STRICT, WITHOUT ROWID`,
    `CREATE TABLE entryPointLayer (
        entryPoint INTEGER NOT NULL REFERENCES entryPoint ON DELETE CASCADE,
        layer INTEGER NOT NULL REFERENCES record ON DELETE CASCADE,
        depth INTEGER NOT NULL,
        PRIMARY KEY (entryPoint, layer)
    ) STRICT, WITHOUT ROWID`,
    `CREATE TABLE blockFanIn (
        block INTEGER PRIMARY KEY REFERENCES record ON DELETE CASCADE,
        callers INTEGER NOT NULL,
        callerLayers INTEGER NOT NULL
    ) STRICT`,
    ...relationStatements(),
];

/**
 * The accepted model's identity: a number derived from the table definitions of the record store and of these tables, so
 * a change to any statement changes it and no one keeps a version by hand.
 * @param recordStatements the record store's statements
 * @returns the identity
 */
export const modelIdentityOf = (recordStatements: readonly string[]): number =>
    Number.parseInt(sha1Hex([...recordStatements, ...modelStatements].join("\n")).slice(0, 7), 16) + 1;
