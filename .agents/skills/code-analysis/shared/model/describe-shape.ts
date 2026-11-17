import { SchemaAST } from "effect";

export type ShapeDescription = {
    readonly lines: string[];
    readonly undescribed: string[];
    readonly readers: Set<string>;
};

const readerWords: Readonly<Record<string, string>> = {
    person: "the person deciding about the system",
    agent: "a later agent or this record's owner, never shown to the person",
    script: "the scripts only",
};

/**
 * The allowed values of a literal or a union of literals.
 * @param ast the schema's AST
 * @returns the values joined by ` | `, or undefined when `ast` is neither
 */
function literals(ast: SchemaAST.AST): string | undefined {
    if (ast._tag === "Literal") {
        return JSON.stringify(ast.literal);
    }
    if (ast._tag === "Union" && ast.types.every((member) => member._tag === "Literal")) {
        return ast.types.map((member) => literals(member)).join(" | ");
    }
    return undefined;
}

/**
 * The allowed values of a property, or of each item when it is a list.
 * @param type the property's AST
 * @returns the values joined by ` | `, or undefined when any value is allowed
 */
function allowedValues(type: SchemaAST.AST): string | undefined {
    const values = literals(type);
    if (values !== undefined) {
        return values;
    }
    return type._tag === "Arrays" && type.rest[0] ? literals(type.rest[0]) : undefined;
}

/**
 * A part's description, the sentence the agent reads. A part with none is recorded in `out.undescribed` by its
 * path, so the whole description is refused rather than printed with a blank: an agent must never meet a property
 * it is told nothing about.
 * @param ast the part's AST
 * @param path where the part sits, such as `Layer.reaches.by`
 * @param out the description being built
 * @returns the sentence, or nothing when the part has none
 */
function descriptionOf(ast: SchemaAST.AST, path: string, out: ShapeDescription): string {
    const text = SchemaAST.resolveDescription(ast);
    if (text === undefined) {
        out.undescribed.push(path);
        return "";
    }
    return text;
}

/**
 * Who reads a text field, as its schema declares it (D149), in words the writing agent reads beside the field: the
 * person deciding about the system, a later agent or the record's owner, or only the scripts; and whether it is copied
 * from the code as written. Nothing for a field that holds no text.
 * @param ast the field's AST
 * @param out the description, which notes each reader met
 * @returns the words, with a leading space, or none
 */
function readerOf(ast: SchemaAST.AST, out: ShapeDescription): string {
    const readBy = SchemaAST.resolveAt<string>("readBy")(ast);
    if (readBy === undefined) {
        return "";
    }
    out.readers.add(readBy);
    const reader = readerWords[readBy];
    if (reader === undefined) {
        throw new Error(`${readBy} is no reader a field may declare`);
    }
    const held = "; written as the code spells it";
    return SchemaAST.resolveAt<boolean>("copiedFromCode")(ast) === true
        ? ` (read by ${reader}${held})`
        : ` (read by ${reader})`;
}

/**
 * One line for a property: its name, whether it is optional or a list, its allowed values and its description.
 * @param property the property
 * @param where the indent of its line and its parent's path
 * @param where.indent the indent of its line
 * @param where.path its parent's path
 * @param out the description being built
 * @returns the line
 */
function propertyLine(
    property: SchemaAST.PropertySignature,
    where: { readonly indent: string; readonly path: string },
    out: ShapeDescription,
): string {
    const name = String(property.name);
    const optional = SchemaAST.isOptional(property.type) ? " (optional)" : "";
    const list = property.type._tag === "Arrays" ? " (a list)" : "";
    const values = allowedValues(property.type);
    const text = descriptionOf(property.type, `${where.path}.${name}`, out);
    return `${where.indent}${name}${optional}${list}${values ? `: ${values}` : ""}: ${text}${readerOf(property.type, out)}`;
}

/**
 * Add the lines of one level of a shape: one line per property, nested properties indented, and the value of a
 * keyed map under `<each key>`; a schema class (such as `Feedback`) by the fields it is declared over.
 * @param ast the level's AST
 * @param where the indent of this level's lines and its path
 * @param where.indent the indent of this level's lines
 * @param where.path the path of this level, such as `Layer.reaches`
 * @param out the description being built
 */
function addFields(
    ast: SchemaAST.AST,
    where: { readonly indent: string; readonly path: string },
    out: ShapeDescription,
): void {
    const deeper = { ...where, indent: `${where.indent}    ` };
    if (ast._tag === "Union" && ast.types.every((member) => member._tag !== "Objects")) {
        return;
    }
    if (ast._tag === "Union" && literals(ast) === undefined) {
        ast.types.forEach((member, i) => {
            const path = `${where.path}(${i + 1})`;
            out.lines.push(`${where.indent}one of (${i + 1}): ${descriptionOf(member, path, out)}`);
            addFields(member, { ...where, indent: `${where.indent}    `, path }, out);
        });
        return;
    }
    if (ast._tag === "Arrays" && ast.rest[0]) {
        addFields(ast.rest[0], where, out);
        return;
    }
    const [fields] = ast._tag === "Declaration" ? ast.typeParameters : [];
    if (fields !== undefined) {
        addFields(fields, where, out);
        return;
    }
    if (ast._tag !== "Objects") {
        return;
    }
    for (const property of ast.propertySignatures) {
        out.lines.push(propertyLine(property, where, out));
        addFields(property.type, { ...deeper, path: `${where.path}.${String(property.name)}` }, out);
    }
    for (const signature of ast.indexSignatures) {
        const path = `${where.path}.<each key>`;
        out.lines.push(`${where.indent}<each key>: ${descriptionOf(signature.type, path, out)}`);
        addFields(signature.type, { ...deeper, path }, out);
    }
}

/**
 * A record's or document's shape for the agent about to write or read it, read from its schema: its own
 * description, then one line per property. Every part must carry a description; `undescribed` lists the paths of
 * any that do not, and the caller refuses to print such a shape.
 * @param name the shape's name
 * @param ast the schema's AST
 * @returns the lines describing the shape, and the paths of parts with no description
 */
export function describeShape(name: string, ast: SchemaAST.AST): ShapeDescription {
    const out: ShapeDescription = { lines: [], undescribed: [], readers: new Set() };
    out.lines.push(`${name}: ${descriptionOf(ast, name, out)}`);
    addFields(ast, { indent: "  ", path: name }, out);
    return out;
}
