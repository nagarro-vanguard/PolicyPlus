import { Schema } from "effect";
import { Text, about } from "../shared-fields";
import { Count } from "./payloads";

const Reading = Schema.Literals(["reviewed", "corrected", "disputed", "unread"]).annotate(
    about(
        "Where a second reading left the record: reviewed (read and not challenged), corrected (changed after the review), disputed (challenged and unchanged since) or unread.",
    ),
);

const Named = Schema.Struct({
    id: Schema.String.annotate(about("The record id.")),
    name: Schema.String.annotate(about("The name.")),
}).annotate(about("A record and its name."));

export const BundlePayload = Schema.Struct({
    blocks: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The block's record id.")),
            name: Schema.String.annotate(about("The routine's name as the code writes it.")),
            container: Schema.String.annotate(about("The class or module that holds it, as the code writes it.")),
            layer: Schema.String.annotate(about("The record id of the layer it belongs to.")),
            file: Schema.String.annotate(about("The file, relative to the source folder.")),
            firstLine: Count.annotate(about("The first line of the block.")),
            lastLine: Count.annotate(about("The last line of the block.")),
            capabilities: Schema.Array(Schema.String).annotate(
                about("The record ids of the capabilities whose entry points reach it; empty when none does."),
            ),
        }).annotate(about("One routine of the code, with where it is and who reaches it.")),
    ).annotate(about("Every block the map found.")),
    links: Schema.Array(
        Schema.Struct({
            from: Schema.String.annotate(about("The record id of the block the link leaves.")),
            to: Schema.String.annotate(about("The record id of the block the link reaches.")),
            kind: Schema.String.annotate(about("How it reaches: call, renders, dispatches or request.")),
        }).annotate(about("One link from one block to another block.")),
    ).annotate(about("Every link between two blocks, with the links to outside systems left out.")),
    access: Schema.Array(
        Schema.Struct({
            block: Schema.String.annotate(about("The record id of the block that reads or saves.")),
            entity: Named.annotate(about("The kind of data it touches.")),
            kind: Schema.Literals(["reads", "saves"]).annotate(about("Whether the block reads or saves it.")),
        }).annotate(about("One block that reads or saves one kind of data.")),
    ).annotate(about("Which blocks read or save which kinds of data.")),
    rules: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The rule's record id.")),
            block: Schema.String.annotate(
                about("The record id of the block that decides it; empty when none is known."),
            ),
            capabilities: Schema.Array(Schema.String).annotate(
                about("The record ids of the capabilities that reach the block deciding it."),
            ),
            reading: Reading,
            why: Schema.String.annotate(about("The reviewer's words when the rule is disputed; empty otherwise.")),
            gates: Schema.String.annotate(
                about("The record id of the change of state it allows or refuses; empty when none."),
            ),
        }).annotate(about("What the bundles need to know of one business rule beyond its payload entry.")),
    ).annotate(about("Every business rule, with who reaches it and where a second reading left it.")),
    lifecycles: Schema.Array(
        Schema.Struct({
            id: Schema.String.annotate(about("The life's record id.")),
            entity: Named.annotate(about("The kind of data whose life it is.")),
            states: Schema.Array(Text).annotate(
                about("Its states, in order; a transition names one by its number, from 1."),
            ),
            transitions: Schema.Array(
                Schema.Struct({
                    id: Schema.String.annotate(about("The change of state's record id.")),
                    from: Schema.Array(Count).annotate(
                        about("The numbers of the states it leaves; empty when the code creates the record in `to`."),
                    ),
                    to: Count.annotate(about("The number of the state it reaches.")),
                    file: Schema.String.annotate(about("The file that writes the new state.")),
                    firstLine: Count.annotate(about("The first line that writes it.")),
                    lastLine: Count.annotate(about("The last line that writes it.")),
                    reading: Reading,
                    why: Schema.String.annotate(
                        about("The reviewer's words when the change is disputed; empty otherwise."),
                    ),
                }).annotate(about("One place where the code moves a record from one state to another.")),
            ).annotate(about("Every change of state of the life.")),
        }).annotate(about("The life of one kind of data that has states.")),
    ).annotate(about("The lives of the kinds of data that have states.")),
    controls: Schema.Array(
        Schema.Struct({
            container: Schema.String.annotate(about("The window's class, as the code writes it.")),
            name: Schema.String.annotate(about("The control's name as the code writes it.")),
            declaredAs: Schema.String.annotate(about("The control's declaration, which gives its kind.")),
        }).annotate(about("One control a window declares.")),
    ).annotate(about("The controls each window declares.")),
    unreached: Schema.Array(
        Schema.Struct({
            what: Schema.String.annotate(
                about(
                    "The routine, as its class and name; one the code gives no name or no class is called by the part it has, or by its file's name, and its first line.",
                ),
            ),
            file: Schema.String.annotate(about("The file, relative to the source folder.")),
            firstLine: Count.annotate(about("The first line of the routine.")),
            lastLine: Count.annotate(about("The last line of the routine.")),
        }).annotate(about("One routine no call the analysis could follow reaches.")),
    ).annotate(about("The routines nothing the analysis could follow reaches.")),
}).annotate(
    about(
        "What a bundle needs beyond the capability and system payloads: the blocks and the links between them, which blocks read or save which data, who reaches each rule and where a second reading left it, the lives of the data, each window's controls and the code nothing reaches.",
    ),
);

export type BundlePayload = typeof BundlePayload.Type;
