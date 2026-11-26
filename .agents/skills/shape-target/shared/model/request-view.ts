import { Schema } from "effect";
import { Text } from "./fields";

/** The two parts of the modernization request this skill reads, from the file the conductor writes. */
export const RequestView = Schema.Struct({
    stack: Schema.Array(Text).check(Schema.isMinLength(1)),
    goals: Schema.Array(Text),
});

export type RequestView = typeof RequestView.Type;
