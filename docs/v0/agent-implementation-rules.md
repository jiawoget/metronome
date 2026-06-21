# Agent Implementation Rules

## Purpose

These rules define how v0 modules are implemented and verified. They are designed to keep long-running work coherent, avoid scope creep, and prevent display-only or stub-only features from being marked done.

## Agent Roles

Every module must use at least two separate agent passes:

```text
Implementation Agent
  -> Verification Agent
```

The same agent pass must not both implement and verify the same module as final PASS.

The implementation agent may self-test, but self-testing is not verification. A module is not done until a separate verification agent pass reports PASS.

## Required Model Assignment

Use these default model assignments for v0 feature work:

```text
Coding / Implementation Agent: GPT-5.5 High
Verification Agent: GPT-5.4 mini
```

Do not silently substitute a different model. If either requested model is unavailable in the execution environment, the planning agent must record the limitation before work begins and ask for approval or use the closest available model only with explicit notice.

## One Feature Per Coding Agent

One coding agent may implement exactly one assigned feature contract at a time.

For this project, a feature is one module contract or one explicitly named sub-feature inside a module contract.

Examples:

```text
Allowed:
- One coding agent implements 05a-sheet-viewer.
- Another coding agent implements 05e-session-integration.
- Another coding agent implements only "Bilibili search flow" if the user explicitly splits 06-reference-system.

Not allowed:
- One coding agent implements 05a + 05b together.
- One coding agent implements all of Sheet Practice.
- One coding agent implements Reference and Settings because they seem small.
- One coding agent expands v1 behavior while implementing a v0 feature.
```

The coding agent must stop at the assigned feature boundary even if adjacent work appears easy.

If the coding agent discovers a required dependency is missing, it must report the dependency instead of absorbing the dependency into its own feature unless the planning agent explicitly changes the contract.

## One Feature Per Verification Agent

One verification agent verifies exactly one implemented feature contract at a time.

The verification agent must verify the assigned feature against its own contract and must not mark adjacent unverified features as done.

If a feature depends on another feature, the verifier may check the dependency as setup, but the PASS/FAIL decision applies only to the assigned feature.

### Planning / Owner Agent

The planning agent maintains the module documents, phase plan, and status file.

It may clarify scope and update contracts before implementation begins.

It should not mark a module verified unless the verification agent has passed it.

### Implementation Agent

The implementation agent builds one assigned module or one explicitly assigned feature within a module.

It must:

- Read the required documents before editing code.
- Use the required coding model unless an approved substitution is recorded.
- Implement only one assigned feature contract.
- Stay inside the v0 scope.
- Follow the module's Implementation Contract.
- Keep architecture boundaries intact.
- Run relevant tests before handing off.
- Document what changed and what remains risky.

It must not:

- Modify acceptance criteria to make its work easier to pass.
- Delete or weaken required tests.
- Implement adjacent modules or features in the same pass.
- Implement v1 features without approval.
- Leave enabled UI controls backed only by mocks or TODOs.
- Claim completion without exercising the real workflow.

### Verification Agent

The verification agent independently evaluates one implemented module or feature.

It must:

- Read the required documents before testing.
- Use the required verification model unless an approved substitution is recorded.
- Verify only one assigned feature contract.
- Use the module's Verification Contract.
- Exercise user-facing behavior through real browser interaction when UI exists.
- Run relevant automated tests.
- Check persistence after refresh or reload when persistence is part of the claim.
- Check browser console errors for tested UI flows.
- Report PASS or FAIL with evidence.

It must not:

- Accept "looks implemented" as evidence.
- Approve display-only or stub-only behavior.
- Skip untested acceptance criteria.
- Change acceptance criteria.
- Mark adjacent modules or features verified in the same pass.
- Fix the implementation during verification unless explicitly asked.

## Status Flow

Module status should move through this flow:

```text
not_started
  -> contract_ready
  -> implementation_in_progress
  -> implementation_done
  -> verification_in_progress
  -> verified
```

If verification fails:

```text
verification_in_progress
  -> needs_fix
  -> implementation_in_progress
```

Only the implementation agent may move a module to `implementation_done`.

Only the verification agent may move a module to `verified` or `needs_fix`.

The planning agent may move a module to `contract_ready` after the module contract is written.

## Progress Tracking Mutation Rule

Progress is tracked in:

```text
docs/v0/module-status.json
```

Each agent may update only the status entry for its assigned feature.

The implementation agent may update only:

- The assigned feature's top-level `status`.
- The assigned feature's `implementation` object.

The implementation agent must not update:

- Any other feature entry.
- Any other feature status.
- The assigned feature's `verification` object, except leaving it unchanged.
- v1 roadmap status files.

The verification agent may update only:

- The assigned feature's top-level `status`.
- The assigned feature's `verification` object.

The verification agent must not update:

- Any other feature entry.
- Any other feature status.
- The assigned feature's `implementation` object, except leaving it unchanged.
- v1 roadmap status files.

The planning agent may update multiple status entries only when writing or restructuring contracts before implementation begins.

During implementation and verification work, changing more than one feature status in a single agent pass is not allowed.

## Required Commit Flow

Every feature must have separate implementation and verification commits.

Implementation commit:

```text
1. Implementation agent completes the assigned feature.
2. Implementation agent runs self-tests.
3. Implementation agent updates only the assigned feature status to implementation_done.
4. Implementation agent records handoff notes in the assigned feature implementation object.
5. Implementation agent creates a git commit for the implementation.
```

Verification commit:

```text
1. Verification agent verifies the assigned feature independently.
2. Verification agent updates only the assigned feature status to verified or needs_fix.
3. Verification agent records verification evidence in the assigned feature verification object.
4. Verification agent creates a git commit for the verification result.
```

If verification passes, the verification commit must mark the feature `verified`.

If verification fails, the verification commit must mark the feature `needs_fix` and include specific failure evidence.

The implementation commit and verification commit must be separate commits. Do not combine implementation and verification status changes in one commit.

Recommended commit message formats:

```text
feat(<feature-id>): implement <feature name>
test(<feature-id>): verify <feature name>
test(<feature-id>): mark <feature name> needs fix
```

## Required Handoff Flow

Each module must follow this handoff:

```text
1. Planning agent writes or updates the module contract.
2. Planning agent sets status to contract_ready.
3. Implementation agent reads the required docs.
4. Implementation agent implements only the assigned module scope.
5. Implementation agent runs self-tests and records notes.
6. Implementation agent sets status to implementation_done.
7. Implementation agent commits implementation work.
8. Verification agent reads the required docs.
9. Verification agent independently tests the module.
10. Verification agent sets status to verified or needs_fix.
11. Verification agent commits verification result.
12. If needs_fix, implementation returns to the implementation agent in a new implementation pass.
```

The verification agent must not rely on the implementation agent's claims. It must independently reproduce the required user paths and inspect required artifacts.

The implementation handoff and verification report must name the assigned feature. A report that covers multiple features in one pass cannot mark any of them verified unless the planning agent explicitly requested a combined integration verification feature.

## Handoff Notes

Implementation handoff notes must include:

- Assigned feature.
- Coding model used.
- Files or areas changed.
- Tests run.
- Known limitations.
- Any module boundary touched.
- Any unresolved risk.

Verification handoff notes must include:

- Assigned feature.
- Verification model used.
- PASS or FAIL.
- Acceptance criteria checked.
- Real browser E2E evidence for UI modules.
- Specialized evidence required by the module.
- Persistence evidence when data is saved.
- Console error status.
- Repro steps for each failure.

## Done Definition

A module is done only when:

- All v0 acceptance criteria pass.
- Required automated tests pass or an explicit limitation is documented.
- Required UI paths are verified through real interaction.
- Module-specific behavior is tested broadly enough to prove the feature works, not only that the UI changed.
- Required persistence checks pass.
- A separate verification agent reports PASS.
- No v1 scope has been added without approval.
- No architecture boundary has been bypassed.

## Mandatory Failure Conditions

The verification agent must fail the module if:

- Any acceptance criterion is untested.
- A visible enabled feature is display-only.
- A visible enabled feature is stub-only.
- UI behavior was not exercised through real browser interaction for user-facing features.
- Persistence is claimed but not checked after refresh or reload.
- Console errors occur during the tested workflow.
- The module implements v1 behavior without approval.
- The implementation bypasses module architecture boundaries.
- The module breaks a previously verified core flow.

## Real Browser E2E Rule

For any user-facing UI module, verification must include end-to-end browser testing that simulates actual user behavior.

The verifier must:

- Open the running app in a browser.
- Navigate using visible links, buttons, tabs, or address routes.
- Click, type, scroll, resize the window or viewport, and interact as a user would.
- Verify visible results after each important action.
- Capture screenshots or equivalent visual evidence when layout matters.
- Check the browser console for errors during the tested flow.

The verifier must not:

- Mark a UI module PASS using only unit tests.
- Mark a UI module PASS using only source-code inspection.
- Use JavaScript evaluation to bypass normal UI interaction except for debugging.
- Treat static screenshots as a replacement for interaction testing.

## Test Breadth Rule

Each module must define tests wide enough to cover its real behavior.

The test plan should usually include:

- Pure logic tests for deterministic rules.
- Service or adapter tests for important side effects.
- Persistence tests when data is saved.
- Real browser E2E tests for user-facing workflows.
- Failure-path tests for permissions, empty states, invalid input, or unsupported browser behavior.
- Resize or responsive-layout tests when the module renders user-facing layout.

For media features, UI state is not enough. Verification must inspect the produced or rendered media artifact when feasible.

For audio recording features, tests should use a controlled synthetic audio input and verify the recorded output resembles that input.

For metronome features, tests should verify timing accuracy from generated audio or a deterministic scheduler trace, not only that a play button changes state.

## Regression Rule

Before implementing new work, an implementation agent should run at least one already verified core workflow related to its area when feasible.

If a previously verified flow is broken, fix the regression before adding new functionality.

## Verification Report Format

Verification agents should report using this structure:

```md
# Verification Report: Module Name

## Result
PASS / FAIL

## Tested Build
Commit, branch, or timestamp.

## Acceptance Criteria Results
- [pass/fail] Criterion.

## User Path Evidence
- Path tested:
- Steps:
- Result:

## Automated Tests
- Command:
- Result:

## UI / Browser Checks
- Pages visited:
- Screenshots:
- Console errors:

## Persistence Checks
- What was saved:
- How reload was tested:
- Result:

## Issues
- Severity:
- Repro steps:
- Expected:
- Actual:

## Decision
Why this passes or fails.
```

## Architecture Rules

UI code should call services, hooks, or stores.

UI code should not directly call:

- Tone.js.
- wavesurfer.js.
- MediaRecorder.
- IndexedDB / Dexie.
- Future WASM modules.

Third-party libraries should sit behind infrastructure adapters or service boundaries.

## Design Style Rule

All UI implementation and verification agents must read:

```text
docs/v0/design-style-guide.md
```

UI work must follow the visual direction from:

```text
D:\Projects\metronome\Design Notes\design_pictures\overall_style_design.png
```

Verification agents must include visual/style and resize checks for UI features.

## Project Structure Rule

All implementation and verification agents must read:

```text
docs/v0/project-structure.md
```

Coding agents must keep edits inside the assigned feature ownership area and explicitly allowed shared files.

Verification agents must check that changed files match the assigned feature ownership map. A feature must fail verification if it implements adjacent feature behavior or changes unrelated ownership areas without an approved contract update.

## Scope Rules

When v0 and v1 conflict, v0 wins.

If a feature is listed in v1, do not implement it during v0 unless the user explicitly promotes it into v0.

If a module document and the global plan conflict, stop and ask for clarification before implementation.
