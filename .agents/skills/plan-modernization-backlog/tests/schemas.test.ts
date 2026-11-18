import { describe, expect, test } from "bun:test";
import { Schema } from "effect";
import { AttachmentHeader } from "../shared/model/header";
import { Ledger } from "../shared/model/ledger";
import { Plan } from "../shared/model/plan";
import { Decision, Story, TargetLayer } from "../shared/model/records";

const decode = <A, I>(schema: Schema.Codec<A, I>, value: unknown) => Schema.decodeUnknownSync(schema)(value);

describe("the records", () => {
    test("a story needs criteria and typed references", () => {
        const story = {
            title: "Find a policy by its text",
            what: "find a policy by words",
            why: "I can reach it quickly",
            actions: ["block-1"],
            terms: [],
            criteria: [{ says: "Given a list, when I type, then it narrows.", from: [{ _tag: "rule", id: "rule-1" }] }],
        };
        expect(decode(Story, story).criteria).toHaveLength(1);
        expect(() => decode(Story, { ...story, criteria: [] })).toThrow();
        expect(() =>
            decode(Story, { ...story, criteria: [{ says: "x", from: [{ _tag: "bogus", id: "1" }] }] }),
        ).toThrow();
    });
    test("a decision's topic is a small union and its layer an id or the workspace", () => {
        const base = { id: "decision-1", layer: "workspace", chose: "one convention", reason: "because" };
        expect(decode(Decision, { ...base, topic: { _tag: "note", number: 2 } }).topic._tag).toBe("note");
        expect(() => decode(Decision, { ...base, topic: { _tag: "screens" } })).toThrow();
    });
    test("a layer lists the stack lines it carries", () => {
        const layer = {
            id: "layer-1",
            name: "domain",
            path: "packages/domain",
            kind: "code",
            purpose: "the rules",
            carries: [1],
            check: "bun test",
            dependsOn: [],
        };
        expect(decode(TargetLayer, layer).carries).toEqual([1]);
        expect(() => decode(TargetLayer, { ...layer, kind: "docs" })).toThrow();
    });
    test("the ledger keeps a status per work item", () => {
        expect(decode(Ledger, { items: { "story-1": { status: "created", item: "#12" } } }).items).toBeDefined();
        expect(() => decode(Ledger, { items: { "story-1": { status: "done" } } })).toThrow();
    });
    test("the plan and the header have a JSON Schema for other consumers", () => {
        expect(Schema.toJsonSchemaDocument(Plan).schema).toBeDefined();
        expect(Schema.toJsonSchemaDocument(AttachmentHeader).schema).toBeDefined();
    });
});
