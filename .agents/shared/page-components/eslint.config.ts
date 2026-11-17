import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";

const declared = ["Program > ", "Program > ExportNamedDeclaration > "];
const functions = declared.flatMap((at) => [
    `${at}FunctionDeclaration`,
    `${at}VariableDeclaration > VariableDeclarator > ArrowFunctionExpression`,
]);

const noRegex = [
    {
        selector: "Literal[regex]",
        message: "No regex: read text with string functions, compare by the unit the meaning has.",
    },
    {
        selector: "NewExpression[callee.name='RegExp'], CallExpression[callee.name='RegExp']",
        message: "No regex: read text with string functions, compare by the unit the meaning has.",
    },
];

const noFallbacks = [
    {
        selector: "LogicalExpression[operator='??'], AssignmentExpression[operator='??=']",
        message: "No fallback in a renderer: branch on the model's state (P4c.4).",
    },
    {
        selector: "ChainExpression",
        message: "No optional chaining in a renderer: branch on the model's state (P4c.4).",
    },
    {
        selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
        message: "No double cast: decode the value, or type it where it is made.",
    },
];

export default tseslint.config(
    { ignores: ["node_modules/**", "assets/**"] },
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
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true, allowBoolean: true }],
            "no-restricted-syntax": ["error", ...noRegex],
            "import-x/extensions": [
                "error",
                "ignorePackages",
                { ts: "never", tsx: "always", json: "always", fix: true },
            ],
            "jsdoc/require-jsdoc": ["error", { require: { FunctionDeclaration: false }, contexts: functions }],
            "jsdoc/require-param": ["error", { contexts: functions, checkDestructured: false }],
            "jsdoc/require-returns": ["error", { contexts: functions }],
        },
    },
    {
        files: ["**/*.tsx"],
        rules: { "no-restricted-syntax": ["error", ...noRegex, ...noFallbacks] },
    },
    {
        files: ["__tests__/**/*.ts", "*.config.ts"],
        rules: {
            "jsdoc/require-jsdoc": "off",
            "jsdoc/require-param": "off",
            "jsdoc/require-returns": "off",
            "max-lines-per-function": "off",
        },
    },
);
