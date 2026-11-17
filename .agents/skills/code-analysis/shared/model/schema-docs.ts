import { Schema, type SchemaAST } from "effect";
import { describeShape } from "./describe-shape";

/**
 * The descriptions a base type carries for every property built on it. A property that has only one of these says
 * nothing about itself, so it counts as undescribed.
 */
const genericDescriptions = ["A non-empty piece of text.", "A line number, counting from 1."];

const checkedTags = ["Objects", "Declaration", "Union", "Arrays"];

/**
 * The properties of the schemas in some modules that carry no description of their own: none at all, or only the
 * generic one of their base type. `describe-shape` refuses an undescribed part only for the shapes registered with
 * it; this covers every exported schema.
 * @param modules each module's file name, with what it exports
 * @returns one line per property, each once, and how many schemas were read
 */
export const undescribedProperties = (modules: ReadonlyArray<readonly [string, Readonly<Record<string, unknown>>]>) => {
    const problems = new Set<string>();
    let shapes = 0;
    for (const [file, exported] of modules) {
        for (const [name, value] of Object.entries(exported)) {
            const ast = astOf(value);
            if (ast === undefined || !checkedTags.includes(ast._tag)) {
                continue;
            }
            shapes++;
            const described = describeShape(`${file}:${name}`, ast);
            for (const path of described.undescribed) {
                problems.add(`${path}: no description`);
            }
            for (const line of described.lines) {
                if (genericDescriptions.some((text) => line.includes(`: ${text}`))) {
                    problems.add(`${file}:${name}: only the generic description: ${line.trim().slice(0, 90)}`);
                }
            }
        }
    }
    return { problems: [...problems], shapes };
};

/**
 * The syntax tree of an exported value, when it is a schema.
 * @param value anything a module exports
 * @returns its AST, or undefined when it is not a schema
 */
function astOf(value: unknown): SchemaAST.AST | undefined {
    return Schema.isSchema(value) ? value.ast : undefined;
}
