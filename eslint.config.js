import eslint from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/.pytest_cache/**",
      "**/.venv/**",
      "**/node_modules/**",
      "**/src/generated/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["packages/**/*.ts"],
    ignores: ["**/*.test.ts", "**/generated/**"],
    plugins: { jsdoc },
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          contexts: [
            "ExportNamedDeclaration > TSInterfaceDeclaration",
            "ExportNamedDeclaration > TSInterfaceDeclaration TSPropertySignature",
            "ExportNamedDeclaration > TSEnumDeclaration",
            "ExportNamedDeclaration > TSTypeAliasDeclaration",
            "ExportNamedDeclaration > VariableDeclaration",
            "ExportNamedDeclaration > ClassDeclaration PropertyDefinition",
            "ExportDefaultDeclaration > TSInterfaceDeclaration",
            "ExportDefaultDeclaration > TSInterfaceDeclaration TSPropertySignature",
            "ExportDefaultDeclaration > TSEnumDeclaration",
            "ExportDefaultDeclaration > ClassDeclaration PropertyDefinition",
          ],
          publicOnly: { cjs: false, esm: true },
          require: {
            ClassDeclaration: true,
            FunctionDeclaration: true,
          },
        },
      ],
    },
  },
);
