// eslint.config.mjs
import { defineConfig } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  prettier,
  {
    plugins: { "unused-imports": unusedImports },
    rules: {
      "unused-imports/no-unused-imports": "error",
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "react-hooks/exhaustive-deps": "warn"
    },
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"]
  }
]);


