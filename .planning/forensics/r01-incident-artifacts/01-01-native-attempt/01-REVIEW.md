---
phase: 01-canonical-practice-presentation-formatting
reviewed: 2026-07-21T16:22:11Z
depth: standard
files_reviewed: 9
files_reviewed_list:
  - src/components/home/practice-goal-editor.tsx
  - src/components/home/practice-goals-panel.tsx
  - src/components/home/home-dashboard.tsx
  - src/domain/practice/format.ts
  - src/domain/practice/session-comparison.ts
  - src/domain/practice/validation.ts
  - src/hooks/use-practice-session-dashboard.ts
  - src/services/practice-goals/service.ts
  - xo.config.js
findings:
  critical: 0
  warning: 0
  info: 0
  total: 0
observations:
  pre_existing_critical: 2
  pre_existing_warning: 3
  total: 5
phase_introduced_findings: 0
status: clean
---

# Phase 01: Code Review Report

**Reviewed:** 2026-07-21T16:22:11Z  
**Depth:** standard  
**Files Reviewed:** 9  
**Status:** clean after base-diff adjudication

## Narrative Findings (AI reviewer)

### Summary

The original review surfaced five real observations. Strict base-diff adjudication confirmed that all five have the same observable behavior at `3370d2f93fd6740d96150d9ee69e31238b258c6a`; this phase introduced none of them. They remain recorded below as pre-existing debt and are not silently converted into R01 scope.

The focused unit command completed successfully (4 files, 74 tests), but none of the findings below is covered by those tests.

### Adjudication

| Original item | Reality | Phase disposition |
|---|---|---|
| CR-01 dashboard core-read rejection | Real | Pre-existing; unchanged in this phase |
| CR-02 early-year width | Real | Pre-existing; planning overclaim corrected to exact semantic preservation |
| WR-01 label delimiter replacement | Real | Pre-existing; unchanged in this phase |
| WR-02 stale save closes a newer editor | Real | Pre-existing; extraction preserves the same race |
| WR-03 stale delete updates another goal | Real | Pre-existing; extraction preserves the same race |

**Phase review verdict:** clean — zero findings introduced by `3370d2f..884805f`. The five observations remain durable in this report for future planning.

### Pre-existing Critical Observations

#### CR-01: Uncaught core reads abort the entire dashboard refresh

**Classification:** PRE-EXISTING BLOCKER (not phase-introduced)  
**File:** `src/hooks/use-practice-session-dashboard.ts:248-254`  
**Issue:** `getRecentSession()` and `getTodaySummary()` are the only reads in the `Promise.all` without per-read error handling. If either storage read rejects, the aggregate promise rejects before the guarded state update at line 272. All callers intentionally discard the returned promise with `void`, so this becomes an unhandled rejection; the five panels set to `loading` at lines 224-237 never transition to `loaded` or `error`, even if their own reads succeeded. A transient failure in either core read therefore strands the whole dashboard instead of degrading one field.

**Future remediation:** Catch every member of the aggregate (or catch the aggregate itself), preserve the last successful value for failed core reads, and expose an error state instead of allowing `refreshDashboard()` to reject. For example:

```ts
const recentSessionRead = browserPracticeSessionService.getRecentSession()
  .then((value) => ({ value, errorMessage: null }))
  .catch(() => ({ value: null, errorMessage: "Recent session could not be loaded." }));
const summaryRead = browserPracticeSessionService.getTodaySummary()
  .then((value) => ({ value, errorMessage: null }))
  .catch(() => ({ value: null, errorMessage: "Practice summary could not be loaded." }));

// Include both wrapped reads in Promise.all, then use:
recentSession: recentSessionRead.value ?? currentState.recentSession,
summary: summaryRead.value ?? currentState.summary,
```

Add focused tests that reject each core read independently and assert that auxiliary panels still settle and no unhandled rejection escapes.

#### CR-02: The canonical UTC formatter does not zero-pad the year

**Classification:** PRE-EXISTING CONTRACT DEBT (not phase-introduced)  
**File:** `src/domain/practice/format.ts:27-33`  
**Issue:** Valid ISO inputs such as `0001-01-02T03:04:05.000Z` and `0999-01-02T03:04:05.000Z` produce `1-01-02 03:04 UTC` and `999-01-02 03:04 UTC`. All four baseline formatter bodies behave identically. Because R01 is a semantic migration, its incorrect fixed-`YYYY` planning claim was corrected instead of changing product behavior.

**Future remediation:** If a later product requirement chooses fixed-width years, define the supported year range and pad four-digit years explicitly; return the supplied fallback for unsupported extended years if the contract is strictly `YYYY`.

```ts
const utcYear = date.getUTCFullYear();

if (utcYear < 0 || utcYear > 9_999) {
  return fallback;
}

const year = String(utcYear).padStart(4, "0");
```

Add characterization for years `0000`, `0001`, and `0999` (and an explicit extended-year decision).

### Pre-existing Warning Observations

#### WR-01: Session labels replace the first user-content delimiter, not the timestamp delimiter

**Classification:** PRE-EXISTING WARNING (not phase-introduced)  
**File:** `src/hooks/use-practice-session-dashboard.ts:528-530`  
**Issue:** `candidate.label.replace(" - ", " · ")` assumes the first separator belongs to the appended timestamp. Sheet and segment names are user-visible data and may themselves contain `" - "`. For a candidate label such as `Etude - Bridge - 2026-06-21 12:01 UTC`, the Home label becomes `Etude · Bridge - 2026-06-21 12:01 UTC`, corrupting the title while leaving the intended timestamp delimiter unchanged.

**Future remediation:** Do not parse a preformatted display string. Prefer projecting a typed title and timestamp separately. If the current contract must remain, replace only the final delimiter:

```ts
const delimiter = " - ";
const delimiterIndex = candidate.label.lastIndexOf(delimiter);
const label = delimiterIndex < 0
  ? candidate.label
  : `${candidate.label.slice(0, delimiterIndex)} · ${candidate.label.slice(delimiterIndex + delimiter.length)}`;
```

Add a regression case with both a sheet name and a segment name containing `" - "`.

#### WR-02: A completed save can close a newer editor instance

**Classification:** PRE-EXISTING WARNING (not phase-introduced)  
**File:** `src/components/home/practice-goal-editor.tsx:85-92`  
**Issue:** The Cancel button remains usable during an in-flight save. A user can submit editor A, cancel it, and open editor B before A resolves. When A resolves, its stale `onClose()` still calls the shared parent controller and closes editor B. The editor key prevents state reuse inside the child but does not scope the parent close action to the editor instance that initiated the request.

**Future remediation:** Make close operations conditional on the mode/version that initiated them, or prevent all editor replacement while a save is pending. For example, pass the current mode object to a guarded controller close:

```ts
close(expectedMode: PracticeGoalFormMode) {
  setFormMode((currentMode) => currentMode === expectedMode ? null : currentMode);
}
```

Then bind `onClose={() => editor.close(editor.formMode)}` for that render. Add a deferred-save test that cancels A, opens B, resolves A, and asserts B remains open.

#### WR-03: Delete completion and errors can be applied to a different goal

**Classification:** PRE-EXISTING WARNING (not phase-introduced)  
**File:** `src/components/home/practice-goals-panel.tsx:95-132`  
**Issue:** The deletion controller tracks one mutable `goalId`, one unscoped `errorMessage`, and one `isPending` flag. While deletion A is pending, delete buttons on other rows remain enabled. Requesting deletion B resets `isPending` and switches `goalId`; when A later resolves it clears B's confirmation, and when A rejects it displays A's error under B. This is stale asynchronous state being committed to a newer operation.

**Future remediation:** Track a monotonically increasing operation token or the exact pending goal ID, and apply completion/error state only when it still matches. Also keep all delete triggers disabled while any deletion is pending. For example:

```ts
const operationId = latestDeleteOperationRef.current + 1;
latestDeleteOperationRef.current = operationId;
setPendingGoalId(goal.id);

try {
  await props.deletePracticeGoal(goal.id);
  if (operationId === latestDeleteOperationRef.current) setGoalId(null);
} catch {
  if (operationId === latestDeleteOperationRef.current) {
    setErrorMessage("Goal could not be deleted.");
  }
}
```

Add deferred delete tests for both out-of-order success and out-of-order failure.

---

_Reviewed: 2026-07-21T16:22:11Z_  
_Reviewer: the agent (gsd-code-reviewer); adjudicated by the controller with an independent strict reviewer_  
_Depth: standard_
