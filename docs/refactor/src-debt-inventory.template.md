# Source Debt Inventory

Status: draft  
Scope: src-first debt analysis

## Rules

- This is an analysis PR, not a refactor PR.
- Do not move code until each repeated semantic cluster has an owner.
- Every "delete" candidate must state why it is safe.
- Every "keep" candidate must state the no-go reason and guardrail.
- Every external primitive decision must link to `primitive-check`.

## Target files

| File | Status | Notes |
|---|---|---|
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | TODO | priority target |
| `src/components/recordings-review/recordings-review-experience.tsx` | TODO | priority target |
| `src/services/practice-session/service.ts` | TODO | service/read-model mix |
| `src/components/home/home-dashboard.tsx` | TODO | dashboard/form/format mix |

## Inventory table

| File | Function/block | Current responsibility | Actual semantic owner | Duplicate? | Duplicate location | Delete/merge candidate? | Risk | Action |
|---|---|---|---|---|---|---|---|---|
| TODO | TODO | TODO | TODO | yes/no | TODO | delete/merge/keep | low/med/high | TODO |

## Known semantic clusters to check

### Sheet Practice Controls

| Cluster | Evidence | Owner decision | Action |
|---|---|---|---|
| rerecord source validation | `hydratePracticeAgainSource`, `validateRecordAgainSource` | TODO | TODO |
| bar count-in mini state machine | refs/runId/prepare/block plan | TODO | TODO |
| test harness leakage | `window.__sheetPracticeControls*`, CustomEvent | TODO | TODO |
| recording transaction in UI | `startCapture`, `ensureSheetSession`, `stopAndSave` | TODO | TODO |
| read-model aggregation in UI | `listRecordingMetadata` + filter | TODO | TODO |

### Recordings Review

| Cluster | Evidence | Owner decision | Action |
|---|---|---|---|
| controller bypass | direct `reviewService.set*` in UI | TODO | TODO |
| organization mutation duplication | favorite/archive/tags in list/details | TODO | TODO |
| details owns unrelated flows | playback/export/tags/markers/delete | TODO | TODO |
| practice-again href/label split | href helper vs local accessible name | TODO | TODO |

### Practice Session Service

| Cluster | Evidence | Owner decision | Action |
|---|---|---|---|
| ID generation repeated | `createDefaultId`, `createId` | TODO | TODO |
| optional id normalize repeated | normalize context/route/analytics ID | TODO | TODO |
| target resolution duplicated | session history vs home recent activity | TODO | TODO |
| command/query mixed | lifecycle + dashboard/read models | TODO | TODO |
| silent event failure | `captureSessionEvent` catch return null | TODO | TODO |
| recording metadata transaction unclear | saveRecordingMetadata + commit session | TODO | TODO |

### Home Dashboard

| Cluster | Evidence | Owner decision | Action |
|---|---|---|---|
| fake recent fields | `recentSheets: []`, `recentRecordings: []` not rendered | TODO | TODO |
| empty state duplication | component and hook define same empty structures | TODO | TODO |
| goal validation in UI | `validatePracticeGoalDraft` etc. | TODO | TODO |
| time/duration formatter duplication | manual UTC/duration functions | TODO | TODO |
| live/test data identity switch | `data === emptyHomeDashboardData` | TODO | TODO |

## Final reviewer checklist

- [ ] Every duplicate semantic cluster has a named owner.
- [ ] Every delete candidate has safety evidence.
- [ ] Every keep/no-go has a guardrail.
- [ ] Semgrep inventory has been reviewed.
- [ ] CodeScene findings for changed source files are reviewed.
- [ ] No refactor code is included in this inventory PR unless explicitly approved.
