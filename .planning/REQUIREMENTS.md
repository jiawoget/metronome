# Requirements: Metronome

**Defined:** 2026-07-20
**Milestone:** v1.0 completed legacy history
**Core Value:** Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## v1.0 Requirements

This completed-only staging archive retains the 32 product capabilities supported by reachable runtime and automated evidence. Pending capabilities are intentionally excluded from milestone requirements and persist as non-phase Backlog rows in [ROADMAP.md](ROADMAP.md).

### 01 App Shell Home

- [x] **REQ-004**: Users can view truthful local practice totals and trends on Home.
  - Feature key: `home.dashboard-analytics`
  - Contract: [`docs/v1/01-app-shell-home.md`](../docs/v1/01-app-shell-home.md)
  - Imported phase: [Phase 3: pack-3-sessions-continue-practice](ROADMAP.md#phase-3-pack-3-sessions-continue-practice)
  - Runtime: [`src/hooks/use-practice-session-dashboard.ts`](../src/hooks/use-practice-session-dashboard.ts)
  - Evidence: [`tests/unit/home-dashboard.test.tsx`](../tests/unit/home-dashboard.test.tsx)

- [x] **REQ-005**: Users can view local current and longest practice streaks.
  - Feature key: `home.practice-streaks`
  - Contract: [`docs/v1/01-app-shell-home.md`](../docs/v1/01-app-shell-home.md)
  - Imported phase: [Phase 3: pack-3-sessions-continue-practice](ROADMAP.md#phase-3-pack-3-sessions-continue-practice)
  - Runtime: [`src/domain/practice/rules.ts`](../src/domain/practice/rules.ts)
  - Evidence: [`tests/unit/home-dashboard.test.tsx`](../tests/unit/home-dashboard.test.tsx)

- [x] **REQ-006**: Users can create, update, monitor, and remove local practice goals.
  - Feature key: `home.goal-management`
  - Contract: [`docs/v1/01-app-shell-home.md`](../docs/v1/01-app-shell-home.md)
  - Imported phase: [Phase 3: pack-3-sessions-continue-practice](ROADMAP.md#phase-3-pack-3-sessions-continue-practice)
  - Runtime: [`src/services/practice-goals/service.ts`](../src/services/practice-goals/service.ts)
  - Evidence: [`tests/unit/practice-goal-service.test.ts`](../tests/unit/practice-goal-service.test.ts)

- [x] **REQ-007**: Users can view a chronological timeline of recent local practice activity.
  - Feature key: `home.recent-activity-timeline`
  - Contract: [`docs/v1/01-app-shell-home.md`](../docs/v1/01-app-shell-home.md)
  - Imported phase: [Phase 3: pack-3-sessions-continue-practice](ROADMAP.md#phase-3-pack-3-sessions-continue-practice)
  - Runtime: [`src/domain/practice/recent-activity.ts`](../src/domain/practice/recent-activity.ts)
  - Evidence: [`tests/unit/home-recent-activity-source.test.ts`](../tests/unit/home-recent-activity-source.test.ts)

- [x] **REQ-008**: Users can resume relevant sheets or segments from evidence-based Continue Practice targets.
  - Feature key: `home.continue-practice-recommendations`
  - Contract: [`docs/v1/01-app-shell-home.md`](../docs/v1/01-app-shell-home.md)
  - Imported phase: [Phase 3: pack-3-sessions-continue-practice](ROADMAP.md#phase-3-pack-3-sessions-continue-practice)
  - Runtime: [`src/components/home/continue-practice-navigation.ts`](../src/components/home/continue-practice-navigation.ts), integrated by [`src/components/home/home-dashboard.tsx`](../src/components/home/home-dashboard.tsx)
  - Evidence: [`tests/e2e/app-shell-home.spec.ts`](../tests/e2e/app-shell-home.spec.ts)

- [x] **REQ-009**: Users can navigate core practice actions through an accessible command palette.
  - Feature key: `home.command-palette`
  - Contract: [`docs/v1/01-app-shell-home.md`](../docs/v1/01-app-shell-home.md)
  - Imported phase: [Phase 3: pack-3-sessions-continue-practice](ROADMAP.md#phase-3-pack-3-sessions-continue-practice)
  - Runtime: [`src/components/app-shell/command-palette.tsx`](../src/components/app-shell/command-palette.tsx), integrated by [`src/components/app-shell/app-shell.tsx`](../src/components/app-shell/app-shell.tsx)
  - Evidence: [`tests/e2e/app-shell-home.spec.ts`](../tests/e2e/app-shell-home.spec.ts)

### 03 Recordings Review

- [x] **REQ-016**: Users can review recordings grouped into meaningful quick and sheet take histories.
  - Feature key: `recordings.review-grouping`
  - Contract: [`docs/v1/03-recordings-review.md`](../docs/v1/03-recordings-review.md)
  - Imported phase: [Phase 2: pack-2-segment-take-review](ROADMAP.md#phase-2-pack-2-segment-take-review)
  - Runtime: [`src/lib/recordings-review/take-groups.ts`](../src/lib/recordings-review/take-groups.ts)
  - Evidence: [`tests/unit/recordings-review-take-groups.test.ts`](../tests/unit/recordings-review-take-groups.test.ts)

- [x] **REQ-017**: Users can tag, favorite, archive, recover, and filter local recordings.
  - Feature key: `recordings.tags-favorites-archive`
  - Contract: [`docs/v1/03-recordings-review.md`](../docs/v1/03-recordings-review.md)
  - Imported phase: [Phase 2: pack-2-segment-take-review](ROADMAP.md#phase-2-pack-2-segment-take-review)
  - Runtime: [`src/lib/recordings-review/recording-organization-metadata.ts`](../src/lib/recordings-review/recording-organization-metadata.ts)
  - Evidence: [`tests/e2e/recordings-review.spec.ts`](../tests/e2e/recordings-review.spec.ts)

- [x] **REQ-018**: Users can select local recordings and compare their metadata and waveform evidence.
  - Feature key: `recordings.recording-comparison`
  - Contract: [`docs/v1/03-recordings-review.md`](../docs/v1/03-recordings-review.md)
  - Imported phase: [Phase 2: pack-2-segment-take-review](ROADMAP.md#phase-2-pack-2-segment-take-review)
  - Runtime: [`src/components/recordings-review/recording-comparison-panel.tsx`](../src/components/recordings-review/recording-comparison-panel.tsx)
  - Evidence: [`tests/e2e/recordings-review.spec.ts`](../tests/e2e/recordings-review.spec.ts)

- [x] **REQ-019**: Users can export an available local recording artifact with a deterministic filename.
  - Feature key: `recordings.audio-export`
  - Contract: [`docs/v1/03-recordings-review.md`](../docs/v1/03-recordings-review.md)
  - Imported phase: [Phase 2: pack-2-segment-take-review](ROADMAP.md#phase-2-pack-2-segment-take-review)
  - Runtime: [`src/lib/recordings-review/audio-export.ts`](../src/lib/recordings-review/audio-export.ts)
  - Evidence: [`tests/unit/recordings-review-audio-export.test.ts`](../tests/unit/recordings-review-audio-export.test.ts)

### 04 Sheet Library

- [x] **REQ-020**: Users can tag, favorite, search, and filter locally imported sheets.
  - Feature key: `library.tags-favorites`
  - Contract: [`docs/v1/04-sheet-library.md`](../docs/v1/04-sheet-library.md)
  - Imported phase: [Phase 5: pack-5-library-viewer-upgrade](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade)
  - Runtime: [`src/components/sheet-library/sheet-library-experience.tsx`](../src/components/sheet-library/sheet-library-experience.tsx), persisted through [`src/services/sheet-library/service.ts`](../src/services/sheet-library/service.ts)
  - Evidence: [`tests/e2e/sheet-library.spec.ts`](../tests/e2e/sheet-library.spec.ts)

- [x] **REQ-021**: Users can import multiple supported sheet files in one operation with per-item results.
  - Feature key: `library.batch-import`
  - Contract: [`docs/v1/04-sheet-library.md`](../docs/v1/04-sheet-library.md)
  - Imported phase: [Phase 5: pack-5-library-viewer-upgrade](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade)
  - Runtime: [`src/services/sheet-library/service.ts`](../src/services/sheet-library/service.ts)
  - Evidence: [`tests/e2e/sheet-library.spec.ts`](../tests/e2e/sheet-library.spec.ts)

- [x] **REQ-022**: Users can see a recent local practice summary for each sheet.
  - Feature key: `library.recent-practice-summary`
  - Contract: [`docs/v1/04-sheet-library.md`](../docs/v1/04-sheet-library.md)
  - Imported phase: [Phase 5: pack-5-library-viewer-upgrade](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade)
  - Runtime: [`src/components/sheet-library/sheet-library-experience.tsx`](../src/components/sheet-library/sheet-library-experience.tsx)
  - Evidence: [`tests/e2e/sheet-library.spec.ts`](../tests/e2e/sheet-library.spec.ts)

- [x] **REQ-023**: Users can open recording review already scoped to a selected sheet.
  - Feature key: `library.review-by-sheet`
  - Contract: [`docs/v1/04-sheet-library.md`](../docs/v1/04-sheet-library.md)
  - Imported phase: [Phase 5: pack-5-library-viewer-upgrade](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade)
  - Runtime: [`src/domain/sheet/routes.ts`](../src/domain/sheet/routes.ts), consumed by [`src/components/recordings-review/recordings-review-experience.tsx`](../src/components/recordings-review/recordings-review-experience.tsx)
  - Evidence: [`tests/e2e/recordings-review.spec.ts`](../tests/e2e/recordings-review.spec.ts)

### 05 Sheet Practice

- [x] **REQ-024**: Users can calibrate and persist a deterministic measure-to-time grid for a sheet.
  - Feature key: `practice.measure-grid`
  - Contract: [`docs/v1/05f-practice-segments.md`](../docs/v1/05f-practice-segments.md)
  - Imported phase: [Phase 1: pack-1-practice-segment-foundation](ROADMAP.md#phase-1-pack-1-practice-segment-foundation)
  - Runtime: [`src/domain/practice/measure-grid/index.ts`](../src/domain/practice/measure-grid/index.ts), persisted through [`src/services/measure-grid/service.ts`](../src/services/measure-grid/service.ts)
  - Evidence: [`tests/unit/measure-grid.test.ts`](../tests/unit/measure-grid.test.ts), [`tests/e2e/measure-grid-calibration.spec.ts`](../tests/e2e/measure-grid-calibration.spec.ts)

- [x] **REQ-025**: Users can create, edit, select, and delete measure-based practice segments.
  - Feature key: `practice.practice-segments`
  - Contract: [`docs/v1/05f-practice-segments.md`](../docs/v1/05f-practice-segments.md)
  - Imported phase: [Phase 1: pack-1-practice-segment-foundation](ROADMAP.md#phase-1-pack-1-practice-segment-foundation)
  - Runtime: [`src/services/practice-segments/service.ts`](../src/services/practice-segments/service.ts), surfaced by [`src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`](../src/components/sheet-practice/segments/practice-segment-selector-panel.tsx)
  - Evidence: [`tests/unit/practice-segment-repository.test.ts`](../tests/unit/practice-segment-repository.test.ts), [`tests/e2e/practice-segment-selector.spec.ts`](../tests/e2e/practice-segment-selector.spec.ts)

- [x] **REQ-026**: New sheet recordings preserve the selected segment context.
  - Feature key: `practice.segment-recording`
  - Contract: [`docs/v1/05f-practice-segments.md`](../docs/v1/05f-practice-segments.md)
  - Imported phase: [Phase 1: pack-1-practice-segment-foundation](ROADMAP.md#phase-1-pack-1-practice-segment-foundation)
  - Runtime: [`src/lib/sheet-practice/recording-service.ts`](../src/lib/sheet-practice/recording-service.ts)
  - Evidence: [`tests/e2e/sheet-segment-recording.spec.ts`](../tests/e2e/sheet-segment-recording.spec.ts)

- [x] **REQ-027**: Users can record another take for the same segment while preserving both artifacts.
  - Feature key: `practice.segment-rerecording`
  - Contract: [`docs/v1/05f-practice-segments.md`](../docs/v1/05f-practice-segments.md)
  - Imported phase: [Phase 1: pack-1-practice-segment-foundation](ROADMAP.md#phase-1-pack-1-practice-segment-foundation)
  - Runtime: [`src/components/sheet-practice/controls/sheet-practice-controls.tsx`](../src/components/sheet-practice/controls/sheet-practice-controls.tsx), persisted by [`src/lib/sheet-practice/recording-service.ts`](../src/lib/sheet-practice/recording-service.ts)
  - Evidence: [`tests/e2e/sheet-segment-recording.spec.ts`](../tests/e2e/sheet-segment-recording.spec.ts)

### 05a Sheet Viewer

- [x] **REQ-028**: Users can navigate a multi-page sheet through generated page thumbnails.
  - Feature key: `viewer.page-thumbnails`
  - Contract: [`docs/v1/05a-sheet-viewer.md`](../docs/v1/05a-sheet-viewer.md)
  - Imported phase: [Phase 5: pack-5-library-viewer-upgrade](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade)
  - Runtime: [`src/services/sheet-viewer/service.ts`](../src/services/sheet-viewer/service.ts), surfaced by [`src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx`](../src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx)
  - Evidence: [`tests/unit/sheet-viewer-thumbnails-ui.test.tsx`](../tests/unit/sheet-viewer-thumbnails-ui.test.tsx), [`tests/e2e/sheet-viewer.spec.ts`](../tests/e2e/sheet-viewer.spec.ts)

- [x] **REQ-029**: Users can jump directly to a valid sheet page.
  - Feature key: `viewer.multi-page-jump`
  - Contract: [`docs/v1/05a-sheet-viewer.md`](../docs/v1/05a-sheet-viewer.md)
  - Imported phase: [Phase 5: pack-5-library-viewer-upgrade](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade)
  - Runtime: [`src/components/sheet-practice/viewer/sheet-page-jump.tsx`](../src/components/sheet-practice/viewer/sheet-page-jump.tsx)
  - Evidence: [`tests/unit/sheet-viewer-page-jump.test.tsx`](../tests/unit/sheet-viewer-page-jump.test.tsx)

- [x] **REQ-030**: Users can zoom and pan a sheet within safe deterministic bounds.
  - Feature key: `viewer.advanced-zoom-pan`
  - Contract: [`docs/v1/05a-sheet-viewer.md`](../docs/v1/05a-sheet-viewer.md)
  - Imported phase: [Phase 5: pack-5-library-viewer-upgrade](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade)
  - Runtime: [`src/services/sheet-viewer/transform.ts`](../src/services/sheet-viewer/transform.ts)
  - Evidence: [`tests/unit/sheet-viewer-service.test.ts`](../tests/unit/sheet-viewer-service.test.ts)

- [x] **REQ-031**: Users can enable and control assisted page turning while retaining manual control.
  - Feature key: `viewer.assisted-page-turning`
  - Contract: [`docs/v1/05a-sheet-viewer.md`](../docs/v1/05a-sheet-viewer.md)
  - Imported phase: [Phase 5: pack-5-library-viewer-upgrade](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade)
  - Runtime: [`src/services/sheet-viewer/manual-page-turn-timer.ts`](../src/services/sheet-viewer/manual-page-turn-timer.ts)
  - Evidence: [`tests/unit/sheet-viewer-assisted-page-turning.test.tsx`](../tests/unit/sheet-viewer-assisted-page-turning.test.tsx)

### 05b Practice Controls

- [x] **REQ-032**: Users can apply a selected segment's target tempo to the practice metronome.
  - Feature key: `controls.segment-tempo`
  - Contract: [`docs/v1/05b-practice-controls.md`](../docs/v1/05b-practice-controls.md)
  - Imported phase: [Phase 4: pack-4-practice-controls-upgrade](ROADMAP.md#phase-4-pack-4-practice-controls-upgrade)
  - Runtime: [`src/domain/practice/segment-tempo-apply-policy.ts`](../src/domain/practice/segment-tempo-apply-policy.ts)
  - Evidence: [`tests/unit/sheet-practice-controls.test.tsx`](../tests/unit/sheet-practice-controls.test.tsx)

- [x] **REQ-033**: Users can run a meter-aware count-in before practice transport starts.
  - Feature key: `controls.bar-aware-count-in`
  - Contract: [`docs/v1/05b-practice-controls.md`](../docs/v1/05b-practice-controls.md)
  - Imported phase: [Phase 4: pack-4-practice-controls-upgrade](ROADMAP.md#phase-4-pack-4-practice-controls-upgrade)
  - Runtime: [`src/domain/practice/bar-count-in.ts`](../src/domain/practice/bar-count-in.ts), orchestrated by [`src/components/sheet-practice/controls/sheet-practice-controls.tsx`](../src/components/sheet-practice/controls/sheet-practice-controls.tsx) through [`src/services/metronome/browser-countdown-executor.ts`](../src/services/metronome/browser-countdown-executor.ts)
  - Evidence: [`tests/unit/countdown-executor.test.ts`](../tests/unit/countdown-executor.test.ts), [`tests/e2e/sheet-practice-controls.spec.ts`](../tests/e2e/sheet-practice-controls.spec.ts)

- [x] **REQ-034**: Users can save, apply, rename, and remove local metronome presets per sheet.
  - Feature key: `controls.per-sheet-metronome-presets`
  - Contract: [`docs/v1/05b-practice-controls.md`](../docs/v1/05b-practice-controls.md)
  - Imported phase: [Phase 4: pack-4-practice-controls-upgrade](ROADMAP.md#phase-4-pack-4-practice-controls-upgrade)
  - Runtime: [`src/services/sheet-metronome-presets/service.ts`](../src/services/sheet-metronome-presets/service.ts)
  - Evidence: [`tests/unit/sheet-metronome-preset-service.test.ts`](../tests/unit/sheet-metronome-preset-service.test.ts)

### 05c Sheet Recording Review

- [x] **REQ-035**: Users can manage repeated recordings as one segment take group.
  - Feature key: `takes.multi-take-management`
  - Contract: [`docs/v1/05c-sheet-recording-review.md`](../docs/v1/05c-sheet-recording-review.md)
  - Imported phase: [Phase 2: pack-2-segment-take-review](ROADMAP.md#phase-2-pack-2-segment-take-review)
  - Runtime: [`src/lib/recordings-review/take-groups.ts`](../src/lib/recordings-review/take-groups.ts)
  - Evidence: [`tests/unit/recordings-review-take-groups.test.ts`](../tests/unit/recordings-review-take-groups.test.ts)

- [x] **REQ-036**: Users can mark and clear active and best takes within a take group.
  - Feature key: `takes.active-best-take`
  - Contract: [`docs/v1/05c-sheet-recording-review.md`](../docs/v1/05c-sheet-recording-review.md)
  - Imported phase: [Phase 2: pack-2-segment-take-review](ROADMAP.md#phase-2-pack-2-segment-take-review)
  - Runtime: [`src/lib/recordings-review/take-selection-metadata.ts`](../src/lib/recordings-review/take-selection-metadata.ts)
  - Evidence: [`tests/e2e/recordings-review.spec.ts`](../tests/e2e/recordings-review.spec.ts)

- [x] **REQ-037**: Users can inspect take-history summaries and return to the same practice context.
  - Feature key: `takes.take-history`
  - Contract: [`docs/v1/05c-sheet-recording-review.md`](../docs/v1/05c-sheet-recording-review.md)
  - Imported phase: [Phase 2: pack-2-segment-take-review](ROADMAP.md#phase-2-pack-2-segment-take-review)
  - Runtime: [`src/lib/recordings-review/take-history-summary.ts`](../src/lib/recordings-review/take-history-summary.ts), with return routing from [`src/lib/recordings-review/history.ts`](../src/lib/recordings-review/history.ts) surfaced by [`src/components/recordings-review/recordings-review-experience.tsx`](../src/components/recordings-review/recordings-review-experience.tsx)
  - Evidence: [`tests/unit/recordings-review-take-history-summary.test.ts`](../tests/unit/recordings-review-take-history-summary.test.ts), [`tests/e2e/recordings-review.spec.ts`](../tests/e2e/recordings-review.spec.ts)

- [x] **REQ-038**: Users can compare bounded waveform evidence across available sheet takes.
  - Feature key: `takes.waveform-comparison`
  - Contract: [`docs/v1/05c-sheet-recording-review.md`](../docs/v1/05c-sheet-recording-review.md)
  - Imported phase: [Phase 2: pack-2-segment-take-review](ROADMAP.md#phase-2-pack-2-segment-take-review)
  - Runtime: [`src/lib/recordings-review/waveform-comparison-sources.ts`](../src/lib/recordings-review/waveform-comparison-sources.ts)
  - Evidence: [`tests/unit/recordings-review-waveform-comparison-sources.test.ts`](../tests/unit/recordings-review-waveform-comparison-sources.test.ts)

### 05e Session Integration

- [x] **REQ-045**: Local practice activity is evaluated against configured practice goals.
  - Feature key: `sessions.goal-completion`
  - Contract: [`docs/v1/05e-session-integration.md`](../docs/v1/05e-session-integration.md)
  - Imported phase: [Phase 3: pack-3-sessions-continue-practice](ROADMAP.md#phase-3-pack-3-sessions-continue-practice)
  - Runtime: [`src/domain/practice/rules.ts`](../src/domain/practice/rules.ts)
  - Evidence: [`tests/unit/practice-goal-service.test.ts`](../tests/unit/practice-goal-service.test.ts)

### 08 Practice Session

- [x] **REQ-059**: Users can compare compatible local practice sessions using truthful metrics.
  - Feature key: `practice-session.session-comparison`
  - Contract: [`docs/v1/08-practice-session.md`](../docs/v1/08-practice-session.md)
  - Imported phase: [Phase 3: pack-3-sessions-continue-practice](ROADMAP.md#phase-3-pack-3-sessions-continue-practice)
  - Runtime: [`src/domain/practice/session-comparison.ts`](../src/domain/practice/session-comparison.ts)
  - Evidence: [`tests/unit/session-comparison.test.ts`](../tests/unit/session-comparison.test.ts)

- [x] **REQ-060**: Practice-session durations follow deterministic start, stop, and normalization rules.
  - Feature key: `practice-session.duration-rules`
  - Contract: [`docs/v1/08-practice-session.md`](../docs/v1/08-practice-session.md)
  - Imported phase: [Phase 3: pack-3-sessions-continue-practice](ROADMAP.md#phase-3-pack-3-sessions-continue-practice)
  - Runtime: [`src/domain/practice/rules.ts`](../src/domain/practice/rules.ts)
  - Evidence: [`tests/unit/practice-session-duration-rules.test.ts`](../tests/unit/practice-session-duration-rules.test.ts)

## Out of Scope

| Item | Reason |
|------|--------|
| 32 pending capabilities | Retained as non-phase Backlog rows in ROADMAP; they are not completed v1.0 requirements. |
| 24 support/maintenance slices | Retained in completed-history traceability; they are not user-facing product requirements. |
| Cloud accounts, sync, sharing, and remote storage | Deferred by the local-first product contracts. |
| Automatic score following or correctness scoring | Requires separately approved product and analysis contracts. |
| Custom lifecycle wrapper, shadow ledger, graph, or committed migration validator | Native OpenGSD owns lifecycle state. |

## Traceability

| Requirement | Feature key | Phase | Status |
|-------------|-------------|-------|--------|
| REQ-004 | `home.dashboard-analytics` | [Phase 3](ROADMAP.md#phase-3-pack-3-sessions-continue-practice) | Complete |
| REQ-005 | `home.practice-streaks` | [Phase 3](ROADMAP.md#phase-3-pack-3-sessions-continue-practice) | Complete |
| REQ-006 | `home.goal-management` | [Phase 3](ROADMAP.md#phase-3-pack-3-sessions-continue-practice) | Complete |
| REQ-007 | `home.recent-activity-timeline` | [Phase 3](ROADMAP.md#phase-3-pack-3-sessions-continue-practice) | Complete |
| REQ-008 | `home.continue-practice-recommendations` | [Phase 3](ROADMAP.md#phase-3-pack-3-sessions-continue-practice) | Complete |
| REQ-009 | `home.command-palette` | [Phase 3](ROADMAP.md#phase-3-pack-3-sessions-continue-practice) | Complete |
| REQ-016 | `recordings.review-grouping` | [Phase 2](ROADMAP.md#phase-2-pack-2-segment-take-review) | Complete |
| REQ-017 | `recordings.tags-favorites-archive` | [Phase 2](ROADMAP.md#phase-2-pack-2-segment-take-review) | Complete |
| REQ-018 | `recordings.recording-comparison` | [Phase 2](ROADMAP.md#phase-2-pack-2-segment-take-review) | Complete |
| REQ-019 | `recordings.audio-export` | [Phase 2](ROADMAP.md#phase-2-pack-2-segment-take-review) | Complete |
| REQ-020 | `library.tags-favorites` | [Phase 5](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade) | Complete |
| REQ-021 | `library.batch-import` | [Phase 5](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade) | Complete |
| REQ-022 | `library.recent-practice-summary` | [Phase 5](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade) | Complete |
| REQ-023 | `library.review-by-sheet` | [Phase 5](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade) | Complete |
| REQ-024 | `practice.measure-grid` | [Phase 1](ROADMAP.md#phase-1-pack-1-practice-segment-foundation) | Complete |
| REQ-025 | `practice.practice-segments` | [Phase 1](ROADMAP.md#phase-1-pack-1-practice-segment-foundation) | Complete |
| REQ-026 | `practice.segment-recording` | [Phase 1](ROADMAP.md#phase-1-pack-1-practice-segment-foundation) | Complete |
| REQ-027 | `practice.segment-rerecording` | [Phase 1](ROADMAP.md#phase-1-pack-1-practice-segment-foundation) | Complete |
| REQ-028 | `viewer.page-thumbnails` | [Phase 5](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade) | Complete |
| REQ-029 | `viewer.multi-page-jump` | [Phase 5](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade) | Complete |
| REQ-030 | `viewer.advanced-zoom-pan` | [Phase 5](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade) | Complete |
| REQ-031 | `viewer.assisted-page-turning` | [Phase 5](ROADMAP.md#phase-5-pack-5-library-viewer-upgrade) | Complete |
| REQ-032 | `controls.segment-tempo` | [Phase 4](ROADMAP.md#phase-4-pack-4-practice-controls-upgrade) | Complete |
| REQ-033 | `controls.bar-aware-count-in` | [Phase 4](ROADMAP.md#phase-4-pack-4-practice-controls-upgrade) | Complete |
| REQ-034 | `controls.per-sheet-metronome-presets` | [Phase 4](ROADMAP.md#phase-4-pack-4-practice-controls-upgrade) | Complete |
| REQ-035 | `takes.multi-take-management` | [Phase 2](ROADMAP.md#phase-2-pack-2-segment-take-review) | Complete |
| REQ-036 | `takes.active-best-take` | [Phase 2](ROADMAP.md#phase-2-pack-2-segment-take-review) | Complete |
| REQ-037 | `takes.take-history` | [Phase 2](ROADMAP.md#phase-2-pack-2-segment-take-review) | Complete |
| REQ-038 | `takes.waveform-comparison` | [Phase 2](ROADMAP.md#phase-2-pack-2-segment-take-review) | Complete |
| REQ-045 | `sessions.goal-completion` | [Phase 3](ROADMAP.md#phase-3-pack-3-sessions-continue-practice) | Complete |
| REQ-059 | `practice-session.session-comparison` | [Phase 3](ROADMAP.md#phase-3-pack-3-sessions-continue-practice) | Complete |
| REQ-060 | `practice-session.duration-rules` | [Phase 3](ROADMAP.md#phase-3-pack-3-sessions-continue-practice) | Complete |

**Coverage:**
- v1.0 requirements: 32 total
- Mapped to exactly one completed Phase 1-5: 32
- Complete with runtime/evidence link: 32
- Pending in this file: 0
- Unmapped: 0 ✓

---
*Requirements defined: 2026-07-20*
*Last updated: 2026-07-20 for completed-only v1.0 staging*
