// templates/eslint.config.mjs — Palank Harness ESLint Template (duplicate of eslint.config.template.mjs)
// Keep both locations for compatibility: root template + templates/ copy.
// See /eslint.config.template.mjs for full docs.
//
// Thin: copy to ./eslint.config.mjs or merge second object into existing config.
// Raw: https://eslint.org/docs/latest/use/configure/configuration-files
export default [
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "build/**"],
  },
  {
    files: ["scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
