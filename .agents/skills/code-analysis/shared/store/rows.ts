import { Schema } from "effect";
import { stageNames } from "../run/analysis-layout";
import { LinkKind } from "../model/schemas/map";

const Count = Schema.Number;

const NullableText = Schema.NullOr(Schema.String);

export const SchemaVersionRow = Schema.Struct({ user_version: Count });

export const ModelVersionRow = Schema.Struct({ modelVersion: Count });

export const CountRow = Schema.Struct({ count: Count });

export const TopDecisionRow = Schema.Struct({ top: Schema.NullOr(Count) });

export const DecisionRow = Schema.Struct({
    decision: Count,
    job: Count,
    kind: Schema.String,
    outcome: Schema.String,
    round: Count,
    note: Schema.NullOr(Schema.String),
    at: Schema.String,
});

export const WriterRow = Schema.Struct({
    id: Schema.String,
    stage: Schema.Literals(stageNames),
    jobId: Schema.NullOr(Schema.String),
});

export const IdRow = Schema.Struct({ id: Schema.String });

export const ReachedByRow = Schema.Struct({ wanted: Count, id: Schema.String });

export const StageRow = Schema.Struct({ stage: Schema.Literals(stageNames) });

export const StageWriteRow = Schema.Struct({ stage: Schema.Literals(stageNames), digest: Schema.String });

export const IdBodyRow = Schema.Struct({ id: Schema.String, body: Schema.String });

export const JobRow = Schema.Struct({ jobNumber: Count });

export const HolderRow = Schema.Struct({ jobId: Schema.String });

export const InsertedRow = Schema.Struct({ recordNumber: Count, fileNumber: Schema.NullOr(Count) });

export const BodyRow = Schema.Struct({ recordNumber: Count, id: Schema.String, body: Schema.String });

export const HeadStartRow = Schema.Struct({ id: Schema.String, headFirst: Count, firstLine: Count });

export const HeadRow = Schema.Struct({ recordNumber: Count, id: Schema.String, body: Schema.String, headLast: Count });

export const RankedBodyRow = Schema.Struct({
    rank: Count,
    recordNumber: Count,
    id: Schema.String,
    body: Schema.String,
});

export const LinkEndRow = Schema.Struct({
    recordNumber: Count,
    id: Schema.String,
    body: Schema.String,
    fromBlock: NullableText,
    toBlock: NullableText,
    toDefinition: NullableText,
});

export const PlacedRow = Schema.Struct({
    recordId: Schema.String,
    jobId: NullableText,
    file: Schema.String,
    firstLine: Count,
    lastLine: Count,
});

export const PlacedLinkRow = Schema.Struct({
    ...PlacedRow.fields,
    linkRecord: Count,
    targetFile: Schema.String,
    targetLine: Count,
});

export const PairRow = Schema.Struct({ one: Schema.String, other: Schema.String });

export const PositionRow = Schema.Struct({ id: Schema.String, file: Schema.String, firstLine: Count });

export const NameRow = Schema.Struct({ name: Schema.String });

export const ResourcePairRow = Schema.Struct({
    systemNumber: Count,
    systemId: Schema.String,
    resource: Schema.String,
});

export const ResourceIdRow = Schema.Struct({
    id: Schema.String,
    externalSystem: Schema.String,
    resource: Schema.String,
});

export const UsedResourceRow = Schema.Struct({ externalSystem: Schema.String, resource: Schema.String });

export const EntryPointResourceRow = Schema.Struct({
    entryPoint: Schema.String,
    externalSystem: Schema.String,
    resource: Schema.String,
    kind: LinkKind,
});

export const ResourceFileRow = Schema.Struct({
    externalSystem: Schema.String,
    resource: Schema.String,
    file: Schema.String,
});

export const NoWayInRow = Schema.Struct({
    id: Schema.String,
    file: Schema.String,
    firstLine: Schema.Number,
    lastLine: Schema.Number,
    writtenAs: Schema.NullOr(Schema.String),
});

export const RepeatedCopyRow = Schema.Struct({
    name: Schema.String,
    container: Schema.String,
    file: Schema.String,
    firstLine: Count,
    lastLine: Count,
});

export const ExternalNameLinkRow = Schema.Struct({
    system: Schema.String,
    resource: Schema.String,
    file: Schema.String,
    line: Count,
});

export const BlockNameRow = Schema.Struct({
    name: Schema.String,
    file: Schema.String,
    firstLine: Count,
    lastLine: Count,
});

export const FileCountRow = Schema.Struct({ file: Schema.String, count: Count });

export const LayerFileCountRow = Schema.Struct({ layer: Schema.String, file: Schema.String, count: Count });

export const FilePairCountRow = Schema.Struct({
    fromFile: Schema.String,
    toFile: Schema.String,
    kind: Schema.String,
    count: Count,
});

export const EntryFileCountRow = Schema.Struct({
    entry: Schema.String,
    file: Schema.String,
    count: Count,
    entryPoints: Count,
});

export const LayerUseRow = Schema.Struct({
    externalSystem: Schema.String,
    resource: Schema.String,
    kind: Schema.String,
    layer: NullableText,
    count: Count,
});

export const ResourceUseRow = Schema.Struct({
    key: Schema.String,
    externalSystem: Schema.String,
    resource: Schema.String,
    kind: Schema.String,
    count: Count,
});

export const UnresolvedCitationRow = Schema.Struct({
    recordId: Schema.String,
    jobId: NullableText,
    citedId: Schema.String,
});

export const FileRow = Schema.Struct({
    path: Schema.String,
    lines: Count,
    bytes: Count,
    hash: Schema.String,
    readsAs: Schema.String,
    encoding: NullableText,
    readFrom: NullableText,
    copyOf: NullableText,
});

export const FileLinesRow = Schema.Struct({ lines: Schema.NullOr(Count) });

export const ScopeTotalsRow = Schema.Struct({ files: Count, lines: Count });

export const BlockEntryPointRow = Schema.Struct({ block: Schema.String, entryPoint: Schema.String });

export const DataAtRow = Schema.Struct({
    wanted: Count,
    block: Schema.String,
    kind: NullableText,
    externalSystem: NullableText,
    resource: NullableText,
});
