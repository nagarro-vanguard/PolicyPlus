import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

const declared = ["Program > ", "Program > ExportNamedDeclaration > "];
const functions = declared.flatMap((at) => [
    `${at}FunctionDeclaration`,
    `${at}VariableDeclaration > VariableDeclarator > ArrowFunctionExpression`,
]);

const noFallbacks = [
    {
        selector: "LogicalExpression[operator='??'], AssignmentExpression[operator='??=']",
        message: "No fallback in a renderer: branch on the model's state.",
    },
    {
        selector: "ChainExpression",
        message: "No optional chaining in a renderer: branch on the model's state.",
    },
];

const noDoubleCast = {
    selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
    message: "No double cast through unknown: decode the value, or type it where it is made.",
};

const effectUnits = [
    {
        selector:
            "ExportNamedDeclaration CallExpression[callee.object.name='Effect'][callee.property.name='fnUntraced']",
        message:
            'An exported effectful unit is a named Effect.fn("<Module>.<unit>"); keep fnUntraced for private helpers.',
    },
    {
        selector:
            "TSTypeReference[typeName.right.name=/^(Return|Effect)$/] > TSTypeParameterInstantiation > TSUnknownKeyword:nth-child(2)",
        message: "The error channel is the real union, never unknown: infer it, or declare a named error-union type.",
    },
];

const noWorldReads = [
    {
        selector:
            "NewExpression[callee.name='Date'], CallExpression[callee.object.name='Date'][callee.property.name='now']",
        message: "No Date: read the time from Clock.",
    },
    {
        selector: "CallExpression[callee.name='randomUUID']",
        message: "No randomUUID: take ids from Random.",
    },
    {
        selector: "MemberExpression[object.name='console']",
        message: "No console: write output through Console.",
    },
];

const noUntrustedShortcuts = [
    {
        selector: "CallExpression[callee.object.name='Schema'][callee.property.name=/Sync$/]",
        message: "No Schema.*Sync: decode with Schema.decodeUnknownEffect and fail with an existing tagged error.",
    },
    {
        selector: "CallExpression[callee.object.name='JSON'][callee.property.name='parse']",
        message: "No JSON.parse: decode untrusted text with Schema.decodeUnknownEffect.",
    },
    {
        selector: "TSAsExpression[typeAnnotation.type='TSNeverKeyword']",
        message: "No `as never`: type the value where it is made.",
    },
];

const codeRules = [...effectUnits, ...noWorldReads, ...noUntrustedShortcuts];
const baseRules = [noDoubleCast];

const restrictedImports = ["node:fs", "node:fs/promises", "node:child_process"].map((name) => ({
    name,
    message: "Reach the file system and processes through System, the one seam (core/system.ts).",
}));

export default tseslint.config(
    { ignores: ["node_modules/**"] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
        settings: { "import-x/resolver-next": [createNodeResolver({ extensions: [".ts", ".tsx"] })] },
        plugins: { jsdoc, "import-x": importX },
        rules: {
            curly: ["error", "all"],
            eqeqeq: ["error", "always"],
            complexity: ["error", 15],
            "max-params": ["error", 4],
            "max-lines-per-function": ["error", { max: 60, skipComments: true, skipBlankLines: true }],
            "max-lines": ["error", { max: 300, skipComments: true, skipBlankLines: true }],
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true, allowBoolean: true }],
            "no-restricted-syntax": ["error", ...baseRules, ...codeRules],
            "no-nested-ternary": "error",
            "@typescript-eslint/no-shadow": "error",
            "no-restricted-imports": ["error", { paths: restrictedImports }],
            "no-restricted-globals": [
                "error",
                { name: "process", message: "No process: read the world through System." },
            ],
            "jsdoc/check-param-names": "error",
            "jsdoc/check-tag-names": ["error", { definedTags: ["public", "jsxRuntime"] }],
            "jsdoc/require-description": "error",
            "jsdoc/require-param-description": "error",
            "jsdoc/require-returns-description": "error",
            "import-x/extensions": [
                "error",
                "ignorePackages",
                { ts: "never", tsx: "never", json: "always", fix: true },
            ],
            "jsdoc/require-jsdoc": ["error", { require: { FunctionDeclaration: false }, contexts: functions }],
            "jsdoc/require-param": ["error", { contexts: functions, checkDestructured: true }],
            "jsdoc/require-returns": ["error", { contexts: functions }],
        },
    },
    {
        files: ["**/*.tsx", "**/render-*.ts"],
        rules: { "no-restricted-syntax": ["error", ...baseRules, ...codeRules, ...noFallbacks] },
    },
    {
        files: ["*.config.ts"],
        rules: {
            "jsdoc/require-jsdoc": "off",
            "jsdoc/require-param": "off",
            "jsdoc/require-returns": "off",
            "max-lines-per-function": "off",
            "no-nested-ternary": "off",
            "@typescript-eslint/no-shadow": "off",
            "no-restricted-syntax": ["error", ...baseRules],
            "no-restricted-imports": "off",
            "no-restricted-globals": "off",
        },
    },
    {
        // The seam: the one file that reaches node:fs, node:child_process and process.
        files: ["core/system.ts"],
        rules: { "no-restricted-imports": "off", "no-restricted-globals": "off" },
    },
    {
        // The runner reads process and console.
        files: ["core/script-runner.ts"],
        rules: { "no-restricted-globals": "off", "no-restricted-syntax": "off" },
    },
    {
        // The page styles embed the fonts and the stylesheet, read from the library's own folder.
        files: ["page-components/styles.ts"],
        rules: { "no-restricted-imports": "off" },
    },
    {
        // The entry scripts are composition roots: they may read process.
        files: ["*.ts"],
        ignores: ["*.config.ts"],
        rules: { "no-restricted-globals": "off" },
    },
);
