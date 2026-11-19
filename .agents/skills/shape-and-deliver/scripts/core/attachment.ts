import { Option, Schema } from "effect";

/*
 * What the scripts read of a modernize story's attachment: only the target journey's steps in its typed header, and only
 * the rules those steps change. Everything else in the attachment is for the agents to read. An attachment without a
 * header, or with one in another shape, changes nothing: the run reads it as text, as before.
 */
const Change = Schema.Struct({ rule: Schema.String, says: Schema.String, to: Schema.String });
const Step = Schema.Struct({
    intent: Schema.String,
    system: Schema.optionalKey(Schema.String),
    changes: Schema.optionalKey(Schema.Array(Change)),
});
const Header = Schema.Struct({ steps: Schema.optionalKey(Schema.Array(Step)) });

/** One legacy rule a step of the target journey changes: the step, what the rule says today, what the system does now. */
export type JourneyChange = { readonly step: string; readonly says: string; readonly to: string };

/**
 * The rules the attachment's journey steps change, read from its typed header (the first fenced `json` block).
 * @param text the attachment's text
 * @returns each change in the header's order; none when the attachment has no header in that shape
 */
export const journeyChangesOf = (text: string): JourneyChange[] => {
    const block = /```json\r?\n([\s\S]*?)\r?\n```/.exec(text)?.[1];
    if (block === undefined) {
        return [];
    }
    const header = Schema.decodeUnknownOption(Schema.fromJsonString(Header))(block);
    return Option.match(header, {
        onNone: () => [],
        onSome: (value) =>
            (value.steps ?? []).flatMap((step) =>
                (step.changes ?? []).map((change) => ({ step: step.intent, says: change.says, to: change.to })),
            ),
    });
};

/**
 * What the agents are told the attachment is: read after the epic and, when its journey steps change legacy rules, that
 * the new behaviour is what must be built.
 * @param text the attachment's text
 * @returns the description of the attachment for the run's supporting material
 */
export const attachmentWhatItIs = (text: string) => {
    const changes = journeyChangesOf(text);
    const read = "the story's legacy attachment; read it after the epic";
    return changes.length === 0
        ? read
        : `${read}. Its journey steps change ${changes.length === 1 ? "1 legacy rule" : `${changes.length} legacy rules`} (the header's steps[].changes): build and prove what each does now (\`to\`), not what it says today`;
};
