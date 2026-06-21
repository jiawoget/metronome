# Module Name

## Purpose

Describe why this module exists and which user path it supports.

## User Value

Describe what the user can accomplish with this module.

## v0 Scope

List the capabilities that must be implemented in v0.

## Out of Scope for v0

List capabilities that must not be implemented in v0. Point to v1 when appropriate.

## User Paths

Describe the main user flows step by step.

```text
Step 1
  -> Step 2
  -> Step 3
```

## Product Decisions

List product decisions that are already settled for this module.

## Data Boundary

Describe what data this module reads, creates, updates, or deletes.

Do not over-specify database fields unless the field is necessary for the contract.

## State Boundary

Describe module-owned state and shared state used by the module.

## Architecture Boundary

Describe what this module may depend on and what it must not call directly.

## Dependencies

List other modules this module depends on.

## File Ownership

List the files or directories this module may create or edit.

List files or directories it must not touch.

Reference `docs/v0/project-structure.md`.

## Acceptance Criteria

List verifiable criteria. Each item should be testable.

- [ ] Criterion.

## Test Plan

Tests must be broad enough to prove the module's real behavior, not only that the UI changed.

### Unit Tests

List unit tests that should exist.

### Integration Tests

List integration tests that should exist.

### E2E / Playwright Tests

List UI workflows that must be tested through real browser interaction.

E2E tests must simulate actual user behavior: navigate, click, type, scroll, resize the browser window or viewport, and verify visible results. Do not rely only on source inspection, unit tests, or static screenshots.

### Manual QA

List checks that require judgment or device-specific inspection.

For visual modules, include window resize checks across desktop, tablet-like, and narrow mobile viewports.

### Specialized Verification

List any domain-specific checks, such as audio waveform analysis, timing accuracy, file persistence, permission behavior, or layout inspection.

## QA Checklist

List specific review checks that prevent fake completion.

- [ ] No display-only controls.
- [ ] No stub-only behavior.
- [ ] No console errors in tested workflows.

## Failure / Edge Cases

List common failure cases and expected behavior.

## Implementation Contract

Define what the implementation agent may build in this module.

Also define what it must not build.

Define what the implementation agent must hand off to the verification agent.

The implementation agent must implement only this module or explicitly assigned sub-feature. It must not absorb adjacent module work.

## Verification Contract

Define what the verification agent must test before reporting PASS.

For UI modules, this must include end-to-end browser testing through actual user-like operations.

The verification agent must be a separate agent pass from the implementation agent. The implementation agent's self-tests are useful, but they do not count as final verification.

The verification agent must verify only this module or explicitly assigned sub-feature. It must not mark adjacent module work verified.

## Implementation Handoff Requirements

List what the implementation agent must report before verification begins.

- Assigned feature.
- Coding model used.
- Implementation commit hash.
- Files or areas changed.
- Tests run.
- Known limitations.
- Risks or boundary concerns.

## Verification Handoff Requirements

List what the verification agent must report after testing.

- Assigned feature.
- Verification model used.
- Verification commit hash.
- PASS or FAIL.
- Acceptance criteria results.
- E2E evidence.
- Specialized verification evidence.
- Persistence checks.
- Console error status.
- Repro steps for failures.

## Done Definition

Define the exact conditions required for the module to be complete.

## v1 Hooks

List boundaries that should be preserved for v1 without implementing v1 behavior.
