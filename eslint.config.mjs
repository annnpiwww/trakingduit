import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "public/sw.js",
    ".agents/**",
    "docs/**",
    "tests/**",
    "supabase/**",
    "scripts/**",
    "test-supabase.js",
    "vitest.config.ts",
  ]),
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Local data lives in IndexedDB, which can only be read asynchronously —
      // loading it means setState from an effect. Kept as a warning so genuinely
      // avoidable cases still surface without blocking the build.
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" },
      ],
    },
  },
]);

export default eslintConfig;
