# 01 App Shell / Home Agent Index

## Contract

Spec: `docs/v0/01-app-shell-home.md`

This module owns the global app frame, primary navigation, Home entry points,
empty dashboard states, diagnostics/devtools visibility, and responsive nav.

## Code Map

- App shell: `src/components/app-shell/app-shell.tsx`
- Route wrapper: `src/components/app-shell/route-shell.tsx`
- Home dashboard: `src/components/home/home-dashboard.tsx`
- Navigation helpers: `src/lib/navigation.ts`
- Routes: `src/app/page.tsx`, `src/app/*/page.tsx`

## Technologies And Boundaries

- Uses Next app routes and React components.
- Navigation state should use `src/lib/navigation.ts`; avoid duplicating route
  labels or active-route logic in feature components.
- Home reads practice dashboard data through the practice-session hook/service
  after module 08.

## Tests

- Unit: `tests/unit/app-shell.test.tsx`, `tests/unit/home-dashboard.test.tsx`,
  `tests/unit/navigation-config.test.ts`
- E2E: `tests/e2e/app-shell-home.spec.ts`

## Spec Audit Notes

- Current status is verified.
- The Home "Import Sheet" path now routes to the implemented Sheet Library.
- Diagnostics hide/restore is covered; do not regress the restore affordance.
- No known unimplemented v0 shell/home item remains.

