// eslint.config.template.mjs — Palank Harness Template (thin, disposable)
// Copy to project root as eslint.config.mjs or merge the override into existing config.
// Thin principle: harness provides template only; project owns final eslint.config.mjs.
// No auto-copy during migrate/init unless target lacks eslint config — proposal-first.
//
// Purpose: mute @typescript-eslint/no-explicit-any in scripts/**/*.ts so example
// code like scripts/inspect-excel.ts can keep `catch (err: any)` demo comment as-is.
//
// Policy: scripts/inspect-excel.ts 예시 주석은 건드리지 말고 템플릿 문서화로만 해결
// (catch unknown 예시 주석은 이 템플릿 README로 대체 — 코드 수정 금지)
//
// Raw: ESLint Flat Config https://eslint.org/docs/latest/use/configure/configuration-files
// Raw: typescript-eslint https://typescript-eslint.io/rules/no-explicit-any
//
// Usage (Next.js example):
//   import { FlatCompat } from "@eslint/eslintrc";
//   const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
//   export default [
//     ...compat.extends("next/core-web-vitals", "next/typescript"),
//     { files: ["scripts/**/*.ts"], rules: { "@typescript-eslint/no-explicit-any": "off" } }
//   ];

export default [
  {
    ignores: [".next/**", "node_modules/**", "dist/**", "build/**"],
  },
  {
    // P0-2: allow `any` in harness scripts for rapid prototyping / Excel parsing demos
    files: ["scripts/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
