import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

const functions = ["Program > VariableDeclaration > VariableDeclarator > ArrowFunctionExpression"];

export default tseslint.config(
    { ignores: ["node_modules"] },
    js.configs.recommended,
    ...tseslint.configs.strictTypeChecked,
    {
        languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
        plugins: { jsdoc },
        rules: {
            "jsdoc/check-param-names": "error",
            "jsdoc/require-description": "error",
            "jsdoc/require-param": ["error", { contexts: functions, checkDestructured: true }],
            "jsdoc/require-param-description": "error",
            "jsdoc/require-returns": ["error", { contexts: functions }],
            "jsdoc/require-returns-description": "error",
            "jsdoc/require-jsdoc": ["error", { require: { FunctionDeclaration: false }, contexts: functions }],
        },
    },
    { files: ["*.config.ts"], ...tseslint.configs.disableTypeChecked },
);
