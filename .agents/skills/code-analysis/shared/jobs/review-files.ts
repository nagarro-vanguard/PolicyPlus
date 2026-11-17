import { Effect, Schema } from "effect";
import { keysOf } from "../run/collections";
import type { JsonRecord } from "../model/json-record";
import { readAgentOutput } from "../read/record-reading";
import { Missed } from "../model/schemas/missed";
import { Receipt } from "../model/schemas/receipt";
import { Review } from "../model/schemas/review";

type Finding = JsonRecord & { readonly id: string };

export type Shapes<T> = { readonly [K in keyof T & string]: Schema.ConstraintDecoder<Finding> };

type Read<T extends Shapes<T>> = { of: <K extends keyof T & string>(name: K) => Array<T[K]["Type"]> };

/**
 * Every record of an agent's output, each as last written, in the order its types are declared.
 * @param shapes the record types the output may hold
 * @param read the output, read by its types
 * @returns the records
 */
const recordsOf = <T extends Shapes<T>>(shapes: T, read: Read<T>): Finding[] =>
    keysOf<keyof T & string>(shapes)
        .filter((name) => name !== "Receipt")
        .flatMap((name) => read.of(name));

/**
 * The agent's findings in one output, each as last written: its receipt is no finding, and is read by `receiptsIn`.
 * @param shapes the record types the output may hold
 * @param path the output
 * @returns the findings
 */
export const findingsIn = Effect.fnUntraced(function* <T extends Shapes<T>>(shapes: T, path: string) {
    return recordsOf(shapes, yield* readAgentOutput(path, shapes));
});

/**
 * The receipts a writer filed in one output, each as last written: what it read of the job's files.
 * @param shapes the record types the output may hold
 * @param path the output
 * @returns the receipts
 */
export const receiptsIn = Effect.fnUntraced(function* <T extends Shapes<T>>(shapes: T, path: string) {
    return (yield* readAgentOutput(path, { Receipt, ...shapes })).of("Receipt");
});

/**
 * One review: its challenges, what it found missing, its receipt, and any record of the owner's kind it wrote, which it
 * may not (D112a), each as last written.
 * @param shapes the record types the owner writes
 * @param path the review
 * @returns the verdicts, the missed records, the receipts and the owner's records written
 */
export const reviewIn = Effect.fnUntraced(function* <T extends Shapes<T>>(shapes: T, path: string) {
    const read = yield* readAgentOutput(path, { Review, Missed, Receipt, ...shapes }, "Review");
    return {
        verdicts: read.of("Review"),
        missed: read.of("Missed"),
        receipts: read.of("Receipt"),
        written: recordsOf(shapes, read),
    };
});
