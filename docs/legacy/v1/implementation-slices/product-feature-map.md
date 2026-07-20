> Frozen legacy v1 record. Preserve for historical product, pack, slice, and evidence context. Do not use this document or `status.json` as current lifecycle authority. Read [root `AGENTS.md`](../../../../AGENTS.md) and current [`.planning/`](../../../../.planning/) authority for routing.

# Product Feature To Implementation Slice Map

## Purpose

This file connects product/module planning docs to implementation-slice scheduling.

Use it when starting from a product feature or module file, such as `docs/v1/01-app-shell-home.md`, and you need to find the acceptance pack and implementation slices that cover it.

`docs/v1/status.json` remains the only status source of truth.

## Map

| Product feature | Product doc | Acceptance pack | Implementation slice file | Slice ids |
|---|---|---|---|---|
| `design-style.analytics-visuals` | `docs/v1/design-style-roadmap.md` | Pack 0 | `docs/v1/implementation-slices/00-planning-foundation.md` | `P0-01` |
| `design-style.segment-visual-states` | `docs/v1/design-style-roadmap.md` | Pack 0 | `docs/v1/implementation-slices/00-planning-foundation.md` | `P0-02` |
| `design-style.review-comparison-views` | `docs/v1/design-style-roadmap.md` | Pack 0 | `docs/v1/implementation-slices/00-planning-foundation.md` | `P0-03` |
| `home.dashboard-analytics` | `docs/v1/01-app-shell-home.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-11`, `P3-12` |
| `home.practice-streaks` | `docs/v1/01-app-shell-home.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-13` |
| `home.goal-management` | `docs/v1/01-app-shell-home.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-14`, `P3-15` |
| `home.recent-activity-timeline` | `docs/v1/01-app-shell-home.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-06`, `P3-07` |
| `home.continue-practice-recommendations` | `docs/v1/01-app-shell-home.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-08`, `P3-09` |
| `home.command-palette` | `docs/v1/01-app-shell-home.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-16` |
| `quick.auto-increase` | `docs/v1/02-quick-metronome.md` | Pack 6 | `docs/v1/implementation-slices/06-quick-metronome-training.md` | `P6-01`, `P6-02`, `P6-03` |
| `quick.mute-training` | `docs/v1/02-quick-metronome.md` | Pack 6 | `docs/v1/implementation-slices/06-quick-metronome-training.md` | `P6-04`, `P6-05`, `P6-06` |
| `quick.practice-templates` | `docs/v1/02-quick-metronome.md` | Pack 6 | `docs/v1/implementation-slices/06-quick-metronome-training.md` | `P6-07`, `P6-08` |
| `quick.warmup-routines` | `docs/v1/02-quick-metronome.md` | Pack 6 | `docs/v1/implementation-slices/06-quick-metronome-training.md` | `P6-09`, `P6-10`, `P6-11` |
| `quick.tempo-progress-history` | `docs/v1/02-quick-metronome.md` | Pack 6 | `docs/v1/implementation-slices/06-quick-metronome-training.md` | `P6-12`, `P6-13` |
| `quick.advanced-countdown` | `docs/v1/02-quick-metronome.md` | Pack 6 or Pack 4 | `docs/v1/implementation-slices/06-quick-metronome-training.md` | `P6-14` |
| `recordings.review-grouping` | `docs/v1/03-recordings-review.md` | Pack 2 | `docs/v1/implementation-slices/02-segment-take-review.md` | `P2-01`, `P2-02` |
| `recordings.tags-favorites-archive` | `docs/v1/03-recordings-review.md` | Pack 2 | `docs/v1/implementation-slices/02-segment-take-review.md` | `P2-09` |
| `recordings.recording-comparison` | `docs/v1/03-recordings-review.md` | Pack 2 | `docs/v1/implementation-slices/02-segment-take-review.md` | `P2-10` |
| `recordings.audio-export` | `docs/v1/03-recordings-review.md` | Pack 2 | `docs/v1/implementation-slices/02-segment-take-review.md` | `P2-11` |
| `library.tags-favorites` | `docs/v1/04-sheet-library.md` | Pack 5 | `docs/v1/implementation-slices/05-library-viewer-upgrade.md` | `P5-01`, `P5-02` |
| `library.batch-import` | `docs/v1/04-sheet-library.md` | Pack 5 | `docs/v1/implementation-slices/05-library-viewer-upgrade.md` | `P5-03` |
| `library.recent-practice-summary` | `docs/v1/04-sheet-library.md` | Pack 5 | `docs/v1/implementation-slices/05-library-viewer-upgrade.md` | `P5-04`, `P5-05` |
| `library.review-by-sheet` | `docs/v1/04-sheet-library.md` | Pack 5 | `docs/v1/implementation-slices/05-library-viewer-upgrade.md` | `P5-06` |
| `practice.measure-grid` | `docs/v1/05f-practice-segments.md` | Pack 1 | `docs/v1/implementation-slices/01-practice-segment-mvp.md` | `P1-01`, `P1-02`, `P1-03` |
| `practice.practice-segments` | `docs/v1/05f-practice-segments.md` | Pack 1 | `docs/v1/implementation-slices/01-practice-segment-mvp.md` | `P1-04`, `P1-05`, `P1-06`, `P1-07` |
| `practice.segment-recording` | `docs/v1/05f-practice-segments.md` | Pack 1 | `docs/v1/implementation-slices/01-practice-segment-mvp.md` | `P1-08`, `P1-09` |
| `practice.segment-rerecording` | `docs/v1/05f-practice-segments.md` | Pack 1 | `docs/v1/implementation-slices/01-practice-segment-mvp.md` | `P1-10`, `P1-11`, `P1-12` |
| `viewer.page-thumbnails` | `docs/v1/05a-sheet-viewer.md` | Pack 5 | `docs/v1/implementation-slices/05-library-viewer-upgrade.md` | `P5-07`, `P5-08` |
| `viewer.multi-page-jump` | `docs/v1/05a-sheet-viewer.md` | Pack 5 | `docs/v1/implementation-slices/05-library-viewer-upgrade.md` | `P5-09` |
| `viewer.advanced-zoom-pan` | `docs/v1/05a-sheet-viewer.md` | Pack 5 | `docs/v1/implementation-slices/05-library-viewer-upgrade.md` | `P5-10`, `P5-11` |
| `viewer.assisted-page-turning` | `docs/v1/05a-sheet-viewer.md` | Pack 5 | `docs/v1/implementation-slices/05-library-viewer-upgrade.md` | `P5-12` |
| `controls.segment-tempo` | `docs/v1/05b-practice-controls.md` | Pack 4 | `docs/v1/implementation-slices/04-practice-controls-upgrade.md` | `P4-01`, `P4-02` |
| `controls.bar-aware-count-in` | `docs/v1/05b-practice-controls.md` | Pack 4 | `docs/v1/implementation-slices/04-practice-controls-upgrade.md` | `P4-03`, `P4-04`, `P4-05` |
| `controls.per-sheet-metronome-presets` | `docs/v1/05b-practice-controls.md` | Pack 4 | `docs/v1/implementation-slices/04-practice-controls-upgrade.md` | `P4-06`, `P4-07` |
| `takes.multi-take-management` | `docs/v1/05c-sheet-recording-review.md` | Pack 2 | `docs/v1/implementation-slices/02-segment-take-review.md` | `P2-01`, `P2-02` |
| `takes.active-best-take` | `docs/v1/05c-sheet-recording-review.md` | Pack 2 | `docs/v1/implementation-slices/02-segment-take-review.md` | `P2-03`, `P2-04` |
| `takes.take-history` | `docs/v1/05c-sheet-recording-review.md` | Pack 2 | `docs/v1/implementation-slices/02-segment-take-review.md` | `P2-05`, `P2-06` |
| `takes.waveform-comparison` | `docs/v1/05c-sheet-recording-review.md` | Pack 2 | `docs/v1/implementation-slices/02-segment-take-review.md` | `P2-07`, `P2-08` |
| `markers.categories-severity` | `docs/v1/05d-error-markers.md` | Pack 7 | `docs/v1/implementation-slices/07-reference-markers.md` | `P7-08`, `P7-09` |
| `markers.segment-markers` | `docs/v1/05d-error-markers.md` | Pack 7 | `docs/v1/implementation-slices/07-reference-markers.md` | `P7-10` |
| `markers.waveform-overlay` | `docs/v1/05d-error-markers.md` | Pack 7 | `docs/v1/implementation-slices/07-reference-markers.md` | `P7-11` |
| `sessions.event-timeline` | `docs/v1/05e-session-integration.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-01`, `P3-02` |
| `sessions.segment-sessions` | `docs/v1/05e-session-integration.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-03` |
| `sessions.session-history-grouping` | `docs/v1/05e-session-integration.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-04` |
| `sessions.goal-completion` | `docs/v1/05e-session-integration.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-10` |
| `reference.ab-loop` | `docs/v1/06-reference-system.md` | Pack 7 | `docs/v1/implementation-slices/07-reference-markers.md` | `P7-01`, `P7-02` |
| `reference.playback-speed` | `docs/v1/06-reference-system.md` | Pack 7 | `docs/v1/implementation-slices/07-reference-markers.md` | `P7-03` |
| `reference.manual-offset-alignment` | `docs/v1/06-reference-system.md` | Pack 7 | `docs/v1/implementation-slices/07-reference-markers.md` | `P7-04` |
| `reference.segment-binding` | `docs/v1/06-reference-system.md` | Pack 7 | `docs/v1/implementation-slices/07-reference-markers.md` | `P7-05` |
| `reference.waveform-display` | `docs/v1/06-reference-system.md` | Pack 7 | `docs/v1/implementation-slices/07-reference-markers.md` | `P7-06`, `P7-07` |
| `settings.audio-device-selection` | `docs/v1/07-settings-local-data.md` | Pack 8 | `docs/v1/implementation-slices/08-settings-local-data.md` | `P8-01`, `P8-02` |
| `settings.theme-system` | `docs/v1/07-settings-local-data.md` | Pack 8 | `docs/v1/implementation-slices/08-settings-local-data.md` | `P8-03`, `P8-04` |
| `settings.notification-settings` | `docs/v1/07-settings-local-data.md` | Pack 8 | `docs/v1/implementation-slices/08-settings-local-data.md` | `P8-05`, `P8-06` |
| `settings.data-import-export` | `docs/v1/07-settings-local-data.md` | Pack 8 | `docs/v1/implementation-slices/08-settings-local-data.md` | `P8-07`, `P8-08`, `P8-09` |
| `settings.storage-usage-breakdown` | `docs/v1/07-settings-local-data.md` | Pack 8 | `docs/v1/implementation-slices/08-settings-local-data.md` | `P8-10`, `P8-11` |
| `settings.selective-cleanup` | `docs/v1/07-settings-local-data.md` | Pack 8 | `docs/v1/implementation-slices/08-settings-local-data.md` | `P8-12`, `P8-13` |
| `practice-session.event-timeline` | `docs/v1/08-practice-session.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-01`, `P3-02` |
| `practice-session.segment-history` | `docs/v1/08-practice-session.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-03`, `P3-04` |
| `practice-session.session-comparison` | `docs/v1/08-practice-session.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-17` |
| `practice-session.duration-rules` | `docs/v1/08-practice-session.md` | Pack 3 | `docs/v1/implementation-slices/03-sessions-continue-practice.md` | `P3-05` |
| `analysis.engine-boundary` | `docs/v1/09-audio-analysis.md` | Pack 9 | `docs/v1/implementation-slices/09-audio-analysis-infrastructure.md` | `P9-01`, `P9-02`, `P9-08` |
| `analysis.peak-precomputation` | `docs/v1/09-audio-analysis.md` | Pack 9 | `docs/v1/implementation-slices/09-audio-analysis-infrastructure.md` | `P9-03`, `P9-04` |
| `analysis.onset-detection-infrastructure` | `docs/v1/09-audio-analysis.md` | Pack 9 | `docs/v1/implementation-slices/09-audio-analysis-infrastructure.md` | `P9-05`, `P9-06` |
| `analysis.reference-recording-support` | `docs/v1/09-audio-analysis.md` | Pack 9 | `docs/v1/implementation-slices/09-audio-analysis-infrastructure.md` | `P9-07` |

