import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      // Ignore Prisma generated files
      "**/generated/prisma/**",
      "**/prisma/generated/**",
      "**/.prisma/**",
      "**/node_modules/**",
      "**/.next/**",
      "**/dist/**",
      "**/build/**",
    ],
  },
  {
    rules: {
      // Disable specific TypeScript ESLint rules that are causing issues
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off",
    },
  },
  {
    files: ["**/generated/**", "**/prisma/**", "**/.prisma/**"],
    rules: {
      // Completely disable all rules for generated files
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-this-alias": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "prefer-const": "off",
      "no-var": "off",
    },
  },
];

export default eslintConfig;
