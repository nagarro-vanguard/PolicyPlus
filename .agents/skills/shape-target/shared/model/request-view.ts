import { Schema } from "effect";
import { Text } from "./fields";

/** The two lines of the modernization request this skill reads, from the file the conductor writes. */
export const RequestView = Schema.Struct({
    stack: Schema.Array(Text).check(Schema.isMinLength(1)),
    notes: Schema.Array(Text),
});

export type RequestView = typeof RequestView.Type;
