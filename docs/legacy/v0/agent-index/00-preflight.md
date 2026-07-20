# 00 Preflight Agent Index

## Contract

Spec: `docs/v0/00-preflight.md`

This module establishes the project scaffold, dependency baseline, build/test
tooling, and warning/vulnerability cleanup. It is not a product feature.

## Code Map

- App shell scaffold: `src/app/layout.tsx`, `src/app/page.tsx`
- Preflight UI: `src/components/preflight/preflight-shell.tsx`
- Shared UI/utilities: `src/components/ui/*`, `src/lib/utils.ts`
- Tooling/config: `package.json`, `next.config.*`, `tsconfig.json`,
  `eslint.config.*`, `vitest.config.*`, `playwright.config.*`, `.nvmrc`

## Technologies And Boundaries

- Node 24 / npm 11 is the expected runtime.
- Next.js, React, TypeScript, Tailwind, Vitest, and Playwright are established
  here for later modules.
- Do not add product behavior in this module.

## Tests

- Unit smoke: `tests/unit/preflight-shell.test.tsx`
- Historical status evidence may mention an old preflight smoke E2E. The current
  smoke entry point is `tests/e2e/app-shell-home.spec.ts`, which covers the live
  shell route and console/resize checks.
- Standard gates: `npm run lint`, `npm run typecheck`, `npm run test:unit`,
  `npm run build`, `npm run test:e2e`, `npm audit`

## Spec Audit Notes

- Current status is verified.
- No known unimplemented v0 preflight item remains.
- Some early status-file implementation `commitHash` fields may be `null`;
  use git history plus verification hashes for recovery.
