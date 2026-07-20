# CodeScene Quality Gate Policy for Metronome

This file is a project-side setup policy. It is not itself executed by CodeScene.

## Enable in CodeScene project settings

Turn on PR / merge-request Code Health review for this repo.

Required project-side gate behavior:

1. **No Code Health decline on changed source files.**
   - Any changed file under `src/components`, `src/hooks`, `src/services`, `src/domain`, or `src/infrastructure` must not decline in Code Health.

2. **Hotspot threshold.**
   - Files under the four target paths must not stay below Code Health 7.0 after a PR that modifies them:
     - `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
     - `src/components/recordings-review/recordings-review-experience.tsx`
     - `src/services/practice-session/service.ts`
     - `src/components/home/home-dashboard.tsx`

3. **No new severe Code Health findings in source.**
   Block new findings in app source for:
   - Brain Method
   - Brain Class
   - Large Method
   - Complex Method
   - Nested Complexity
   - Bumpy Road Ahead
   - Complex Conditional
   - DRY / duplicated-code findings
   - Primitive Obsession in domain/service code

4. **No unreviewed CodeScene directives.**
   Any new `@codescene(disable...)` or `@codescene(disable-all)` directive in `src/**` requires:
   - a linked no-go note in `docs/legacy/refactor/`,
   - reviewer approval,
   - reason why fixing is unsafe or out of scope.

5. **Full analysis after config changes.**
   After changing `.codescene/code-health-rules.json`, run a full CodeScene analysis before relying on PR delta analysis.

## Important

`.codescene/code-health-rules.json` customizes rules/thresholds. It does not replace CodeScene project-side PR Quality Gate configuration.
