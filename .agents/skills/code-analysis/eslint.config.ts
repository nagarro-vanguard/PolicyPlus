import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import boundaries from "eslint-plugin-boundaries";
import { createNodeResolver, importX } from "eslint-plugin-import-x";
import tseslint from "typescript-eslint";
import type { Rule } from "eslint";

const systemPaths = [
    "node:fs",
    "node:fs/promises",
    "node:child_process",
    "node:os",
    "node:crypto",
    "fs",
    "child_process",
    "crypto",
].map((name) => ({
    name,
    message:
        "Reach the file system, processes and randomness through a shared service (shared/source/file-access.ts, shared/source/git-repository.ts, shared/source/site-builder.ts, shared/run/hashing-and-random.ts).",
}));

const driverPaths = ["bun:sqlite", "@effect/sql-sqlite-bun"].map((name) => ({
    name,
    message: "Only shared/store/database.ts opens the record store; ask its services.",
}));

const sqlOutsideTheStore = {
    group: ["effect/sql", "effect/sql/*"],
    message:
        "SQL is written only in shared/store, shared/graph, shared/read and shared/jobs/job-state*; ask their services.",
};

const storeServices = ["RecordStore", "StageRecords", "RecordReads", "ScopeFiles", "CodeGraph"];

const randomIdsOwners = ["shared/read/record-writing.ts", "shared/jobs/job-ids.ts", "shared/run/run-script.ts"];

const onlyOwnersIssueIds = {
    group: ["**/hashing-and-random.ts"],
    importNames: ["RandomIds"],
    message: "Record ids are issued only by shared/read/record-writing.ts and job ids only by the job cutters.",
};

const systemAccess: Record<string, [string, ...unknown[]]> = {
    "no-restricted-imports": [
        "error",
        {
            patterns: [onlyOwnersIssueIds, sqlOutsideTheStore],
            paths: [...systemPaths, ...driverPaths],
        },
    ],
    "no-restricted-globals": [
        "error",
        {
            name: "process",
            message: "Read the environment and arguments through the AnalysisRoot service or the runner.",
        },
        { name: "Bun", message: "Use a service instead of Bun's own APIs." },
    ],
    "no-restricted-properties": [
        "error",
        { object: "Date", property: "now", message: "Ask Effect's Clock for the time." },
        {
            object: "Math",
            property: "random",
            message: "Derive choices from a seed, so runs repeat; ids come from the RandomIds service.",
        },
        { object: "Effect", property: "runSync", message: "Only shared/run/run-script.ts runs effects." },
        { object: "Effect", property: "runPromise", message: "Only shared/run/run-script.ts runs effects." },
        {
            object: "JSON",
            property: "parse",
            message: "Read through shared/run/json-files.ts, which decodes against a schema.",
        },
        {
            property: "localeCompare",
            message: "Order text with compareText (shared/run/collections.ts), which is the same on every machine.",
        },
    ],
};

const declared = ["Program > ", "Program > ExportNamedDeclaration > "];
const functions = declared.flatMap((at) => [
    `${at}FunctionDeclaration`,
    `${at}VariableDeclaration > VariableDeclarator > ArrowFunctionExpression`,
]);

const effectFnName: Rule.RuleModule = {
    meta: { type: "suggestion", schema: [] },
    create: (context) => ({
        VariableDeclarator: (node: Rule.Node) => {
            if (node.type !== "VariableDeclarator" || node.id.type !== "Identifier") {
                return;
            }
            const init = node.init;
            const named =
                init?.type === "CallExpression" &&
                init.callee.type === "CallExpression" &&
                init.callee.callee.type === "MemberExpression" &&
                init.callee.callee.property.type === "Identifier" &&
                init.callee.callee.property.name === "fn"
                    ? init.callee.arguments[0]
                    : undefined;
            if (named?.type === "Literal" && named.value !== node.id.name) {
                context.report({
                    node,
                    message: `An Effect.fn is named after its function: "${node.id.name}", not ${JSON.stringify(named.value)}.`,
                });
            }
        },
    }),
};

const cliIsACommand: Rule.RuleModule = {
    meta: { type: "problem", schema: [] },
    create: (context) => ({
        Program: (node) => {
            const runs = node.body.some(
                (statement) =>
                    statement.type === "ExpressionStatement" &&
                    statement.expression.type === "CallExpression" &&
                    statement.expression.callee.type === "Identifier" &&
                    statement.expression.callee.name === "runScript",
            );
            if (!runs) {
                context.report({
                    node,
                    message:
                        "A file in cli/ is a command and ends by calling runScript; library code belongs in shared/ or stages/.",
                });
            }
        },
    }),
};

const noCastsNoRegex = [
    {
        selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
        message: "No double cast through unknown: decode the value, or type it where it is made.",
    },
    {
        selector: "Literal[regex]",
        message: "No regex: read text with string functions, compare by the unit the meaning has.",
    },
    {
        selector: "NewExpression[callee.name='RegExp'], CallExpression[callee.name='RegExp']",
        message: "No regex: read text with string functions, compare by the unit the meaning has.",
    },
];

const oneAskedOfRule = [
    {
        selector: "CallExpression[callee.property.name='includes'][callee.object.property.name='partKinds']",
        message:
            "Which questions are asked of which subject is one rule: ask `askedOf` in shared/run/catalogue.ts (D181).",
    },
    {
        selector: "CallExpression[callee.property.name='includes'][callee.object.property.name='subjects']",
        message:
            "Which questions are asked of which subject is one rule: ask `askedOf` in shared/run/catalogue.ts (D181).",
    },
];

const noFallbacks = [
    {
        selector: "LogicalExpression[operator='??'], AssignmentExpression[operator='??=']",
        message: "No fallback: branch on the state explicitly, saying what the absent case means (P4c.3, D95).",
    },
    {
        selector: "ChainExpression",
        message:
            "No optional chaining: branch on the state explicitly, saying what the absent case means (P4c.3, D95).",
    },
];

export default tseslint.config(
    { ignores: ["node_modules/**", "tests/**", "stages/publish/ux-visuals/**"] },
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
        settings: {
            "import-x/resolver-next": [createNodeResolver({ extensions: [".ts", ".tsx"] })],
            "import-x/extensions": [".ts", ".tsx"],
            "import-x/parsers": { "@typescript-eslint/parser": [".ts", ".tsx"] },
            "boundaries/elements": [
                {
                    type: "store",
                    pattern: ["shared/store/**", "shared/graph/**", "shared/read/**", "shared/jobs/job-state*.ts"],
                    partialMatch: false,
                },
                { type: "runner", pattern: "shared/run/run-script.ts", mode: "full" },
                { type: "core", pattern: "shared/**", partialMatch: false },
                { type: "stage", pattern: "stages/*/**", partialMatch: false, capture: ["stage"] },
            ],
            "boundaries/files": [{ category: "entry", pattern: "cli/*.ts" }],
        },
        plugins: {
            boundaries,
            "import-x": importX,
            jsdoc,
            local: {
                rules: {
                    "effect-fn-name": effectFnName,
                    "cli-is-a-command": cliIsACommand,
                },
            },
        },
        rules: {
            curly: ["error", "all"],
            eqeqeq: ["error", "always"],
            complexity: ["error", 15],
            "max-params": ["error", 4],
            "max-lines-per-function": ["error", { max: 60, skipComments: true, skipBlankLines: true }],
            "max-lines": ["error", { max: 300, skipComments: true, skipBlankLines: true }],
            "id-length": ["error", { min: 2, exceptions: ["i", "j", "_"], properties: "never" }],
            "no-shadow": "off",
            "@typescript-eslint/no-shadow": "error",
            "@typescript-eslint/no-explicit-any": "error",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true, allowBoolean: true }],
            "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", ignoreRestSiblings: true }],
            "no-restricted-syntax": [
                "error",
                {
                    selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
                    message: "No double cast through unknown: decode the value, or type it where it is made.",
                },
            ],
            "jsdoc/require-jsdoc": ["error", { require: { FunctionDeclaration: false }, contexts: functions }],
            "jsdoc/require-param": ["error", { contexts: functions, checkDestructured: false }],
            "jsdoc/require-returns": ["error", { contexts: functions }],
            "boundaries/dependencies": [
                "error",
                {
                    default: "disallow",
                    policies: [
                        { from: { element: { type: "core" } }, allow: { to: { element: { type: "core" } } } },
                        {
                            from: { element: { type: "store" } },
                            allow: { to: { element: { types: { anyOf: ["core", "store"] } } } },
                        },
                        {
                            from: { element: { type: "runner" } },
                            allow: { to: { element: { types: { anyOf: ["core", "store"] } } } },
                        },
                        {
                            from: { element: { type: "stage" } },
                            allow: {
                                to: {
                                    element: {
                                        types: { anyOf: ["core", "stage"] },
                                        captured: { stage: "{{ from.element.captured.stage }}" },
                                    },
                                },
                            },
                        },
                        {
                            from: { element: { type: "stage" } },
                            allow: { to: { element: { types: { anyOf: ["core", "store", "runner"] } } } },
                        },
                        {
                            from: { file: { categories: "entry" } },
                            allow: { to: { element: { types: { anyOf: ["core", "store", "runner", "stage"] } } } },
                        },
                    ],
                },
            ],
            "import-x/no-cycle": "error",
            "import-x/extensions": [
                "error",
                "ignorePackages",
                { ts: "never", tsx: "always", json: "always", fix: true },
            ],
            ...systemAccess,
        },
    },
    {
        files: ["shared/source/file-access.ts", "shared/source/git-repository.ts", "shared/source/site-builder.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [...systemPaths.filter((path) => path.name.endsWith("crypto")), ...driverPaths],
                    patterns: [onlyOwnersIssueIds, sqlOutsideTheStore],
                },
            ],
            "no-restricted-globals": "off",
            "no-restricted-properties": "off",
        },
    },
    {
        files: ["shared/run/run-script.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                {
                    paths: [...systemPaths.filter((path) => path.name.endsWith("crypto")), ...driverPaths],
                    patterns: [sqlOutsideTheStore],
                },
            ],
            "no-restricted-globals": "off",
            "no-restricted-properties": "off",
        },
    },
    {
        files: ["shared/run/hashing-and-random.ts"],
        rules: {
            "no-restricted-imports": ["error", { paths: driverPaths, patterns: [sqlOutsideTheStore] }],
            "no-restricted-globals": "off",
            "no-restricted-properties": "off",
        },
    },
    {
        files: ["shared/store/**/*.ts", "shared/graph/**/*.ts", "shared/read/**/*.ts", "shared/jobs/job-state*.ts"],
        rules: {
            "no-restricted-imports": [
                "error",
                { patterns: [onlyOwnersIssueIds], paths: [...systemPaths, ...driverPaths] },
            ],
        },
    },
    {
        files: ["shared/store/database.ts", "shared/jobs/job-state.ts"],
        rules: { "no-restricted-imports": ["error", { patterns: [onlyOwnersIssueIds], paths: systemPaths }] },
    },
    {
        files: ["shared/**/*.ts", "stages/**/*.ts", "stages/**/*.tsx", "cli/*.ts"],
        ignores: ["eslint.config.ts"],
        rules: { "no-restricted-syntax": ["error", ...noCastsNoRegex, ...noFallbacks, ...oneAskedOfRule] },
    },
    {
        files: ["cli/*.ts"],
        rules: { "local/cli-is-a-command": "error" },
    },
    {
        files: ["**/*.tsx"],
        rules: { "no-restricted-syntax": ["error", ...noCastsNoRegex, ...noFallbacks, ...oneAskedOfRule] },
    },
    {
        files: ["shared/run/catalogue.ts"],
        rules: { "no-restricted-syntax": ["error", ...noCastsNoRegex, ...noFallbacks] },
    },
    {
        files: [
            "shared/**/*.ts",
            "stages/**/*.ts",
            "stages/**/*.tsx",
            "read-analysis-request.ts",
            "inventory-codebase.ts",
            "append-agent-records.ts",
            "describe-shape.ts",
        ],
        rules: {
            "@typescript-eslint/no-non-null-assertion": "error",
            "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
            "local/effect-fn-name": "error",
        },
    },
    {
        files: ["shared/run/json-files.ts"],
        rules: { "no-restricted-properties": "off" },
    },
    {
        files: randomIdsOwners,
        rules: {
            "no-restricted-imports": [
                "error",
                { paths: [...systemPaths, ...driverPaths], patterns: [sqlOutsideTheStore] },
            ],
        },
    },
    {
        files: ["*.config.ts"],
        rules: {
            ...Object.fromEntries(Object.keys(systemAccess).map((rule) => [rule, "off"])),
            "jsdoc/require-jsdoc": "off",
            "jsdoc/require-param": "off",
            "jsdoc/require-returns": "off",
            "max-lines-per-function": "off",
            "max-lines": "off",
            "max-params": "off",
            "no-restricted-syntax": [
                "error",
                {
                    selector: "TSAsExpression > TSAsExpression[typeAnnotation.type='TSUnknownKeyword']",
                    message: "No double cast through unknown: decode the value, or type it where it is made.",
                },
                {
                    selector: `CallExpression[callee.object.name='Layer'][callee.property.name=/^(succeed|mock)$/][arguments.0.name=/^(${storeServices.join("|")})$/]`,
                    message: "Use the record store's real layer, never a stand-in for one of its services.",
                },
            ],
        },
    },
);
