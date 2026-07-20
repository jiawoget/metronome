# Roadmap: Metronome

## Shipped Milestones

- [x] **v1.0 Legacy Delivered Baseline** — Shipped 2026-07-20. See the [archived v1.0 roadmap](milestones/v1.0-ROADMAP.md).

## Backlog

These 32 Pending capability contracts are a durable, non-phase projection. They preserve stable semantic identity without inheriting unfinished legacy pack or slice decomposition; future OpenGSD planning selects and redesigns coherent work from this queue.

| ID | Feature key | Required behavior | Status | Legacy source |
|----|-------------|-------------------|--------|---------------|
| REQ-001 | `design-style.analytics-visuals` | Analytics views use a consistent product visual language without implying unsupported precision. | Pending | [`docs/v1/design-style-roadmap.md`](../docs/v1/design-style-roadmap.md) |
| REQ-002 | `design-style.segment-visual-states` | Practice segments expose consistent selected, active, completed, and error visual states. | Pending | [`docs/v1/design-style-roadmap.md`](../docs/v1/design-style-roadmap.md) |
| REQ-003 | `design-style.review-comparison-views` | Recording and session comparison views use a consistent, evidence-focused visual language. | Pending | [`docs/v1/design-style-roadmap.md`](../docs/v1/design-style-roadmap.md) |
| REQ-010 | `quick.auto-increase` | Users can automatically raise tempo according to a configured practice rule. | Pending | [`docs/v1/02-quick-metronome.md`](../docs/v1/02-quick-metronome.md) |
| REQ-011 | `quick.mute-training` | Users can run metronome mute-training intervals without losing transport control. | Pending | [`docs/v1/02-quick-metronome.md`](../docs/v1/02-quick-metronome.md) |
| REQ-012 | `quick.practice-templates` | Users can save and reuse Quick Metronome practice templates. | Pending | [`docs/v1/02-quick-metronome.md`](../docs/v1/02-quick-metronome.md) |
| REQ-013 | `quick.warmup-routines` | Users can create and run structured local warm-up routines. | Pending | [`docs/v1/02-quick-metronome.md`](../docs/v1/02-quick-metronome.md) |
| REQ-014 | `quick.tempo-progress-history` | Users can inspect local tempo progression history. | Pending | [`docs/v1/02-quick-metronome.md`](../docs/v1/02-quick-metronome.md) |
| REQ-015 | `quick.advanced-countdown` | Users can configure and run the advanced Quick Metronome countdown. | Pending | [`docs/v1/02-quick-metronome.md`](../docs/v1/02-quick-metronome.md) |
| REQ-039 | `markers.categories-severity` | Users can categorize practice markers and assign meaningful severity. | Pending | [`docs/v1/05d-error-markers.md`](../docs/v1/05d-error-markers.md) |
| REQ-040 | `markers.segment-markers` | Users can bind markers to the relevant practice segment context. | Pending | [`docs/v1/05d-error-markers.md`](../docs/v1/05d-error-markers.md) |
| REQ-041 | `markers.waveform-overlay` | Users can inspect markers over aligned waveform evidence. | Pending | [`docs/v1/05d-error-markers.md`](../docs/v1/05d-error-markers.md) |
| REQ-042 | `sessions.event-timeline` | Practice sessions persist an ordered timeline of meaningful session events. | Pending | [`docs/v1/05e-session-integration.md`](../docs/v1/05e-session-integration.md) |
| REQ-043 | `sessions.segment-sessions` | Practice sessions preserve the selected sheet and segment context. | Pending | [`docs/v1/05e-session-integration.md`](../docs/v1/05e-session-integration.md) |
| REQ-044 | `sessions.session-history-grouping` | Users can inspect practice history grouped by useful session context. | Pending | [`docs/v1/05e-session-integration.md`](../docs/v1/05e-session-integration.md) |
| REQ-046 | `reference.ab-loop` | Users can loop a selected range of a local reference recording. | Pending | [`docs/v1/06-reference-system.md`](../docs/v1/06-reference-system.md) |
| REQ-047 | `reference.playback-speed` | Users can change reference playback speed within supported bounds. | Pending | [`docs/v1/06-reference-system.md`](../docs/v1/06-reference-system.md) |
| REQ-048 | `reference.manual-offset-alignment` | Users can manually align a reference recording to practice timing. | Pending | [`docs/v1/06-reference-system.md`](../docs/v1/06-reference-system.md) |
| REQ-049 | `reference.segment-binding` | Users can bind a reference recording to a practice segment. | Pending | [`docs/v1/06-reference-system.md`](../docs/v1/06-reference-system.md) |
| REQ-050 | `reference.waveform-display` | Users can view usable waveform evidence for a local reference recording. | Pending | [`docs/v1/06-reference-system.md`](../docs/v1/06-reference-system.md) |
| REQ-051 | `settings.audio-device-selection` | Users can select available local audio input and output devices. | Pending | [`docs/v1/07-settings-local-data.md`](../docs/v1/07-settings-local-data.md) |
| REQ-052 | `settings.theme-system` | Users can choose and persist the application theme. | Pending | [`docs/v1/07-settings-local-data.md`](../docs/v1/07-settings-local-data.md) |
| REQ-053 | `settings.notification-settings` | Users can configure local notification preferences. | Pending | [`docs/v1/07-settings-local-data.md`](../docs/v1/07-settings-local-data.md) |
| REQ-054 | `settings.data-import-export` | Users can export, validate, and restore supported local application data. | Pending | [`docs/v1/07-settings-local-data.md`](../docs/v1/07-settings-local-data.md) |
| REQ-055 | `settings.storage-usage-breakdown` | Users can inspect local storage usage by meaningful category. | Pending | [`docs/v1/07-settings-local-data.md`](../docs/v1/07-settings-local-data.md) |
| REQ-056 | `settings.selective-cleanup` | Users can selectively clean local data with explicit scope and safety rules. | Pending | [`docs/v1/07-settings-local-data.md`](../docs/v1/07-settings-local-data.md) |
| REQ-057 | `practice-session.event-timeline` | Users can inspect the ordered event timeline of a practice session. | Pending | [`docs/v1/08-practice-session.md`](../docs/v1/08-practice-session.md) |
| REQ-058 | `practice-session.segment-history` | Users can inspect session history in its sheet and segment context. | Pending | [`docs/v1/08-practice-session.md`](../docs/v1/08-practice-session.md) |
| REQ-061 | `analysis.engine-boundary` | The application exposes a replaceable audio-analysis engine boundary without coupling product UI to one implementation. | Pending | [`docs/v1/09-audio-analysis.md`](../docs/v1/09-audio-analysis.md) |
| REQ-062 | `analysis.peak-precomputation` | Waveform peaks can be precomputed, validated, and reused through the analysis boundary. | Pending | [`docs/v1/09-audio-analysis.md`](../docs/v1/09-audio-analysis.md) |
| REQ-063 | `analysis.onset-detection-infrastructure` | The analysis layer provides fixture-backed onset-detection infrastructure with explicit limits. | Pending | [`docs/v1/09-audio-analysis.md`](../docs/v1/09-audio-analysis.md) |
| REQ-064 | `analysis.reference-recording-support` | The analysis boundary accepts supported local reference-recording inputs. | Pending | [`docs/v1/09-audio-analysis.md`](../docs/v1/09-audio-analysis.md) |

## Transition State

No active phase is defined in this archive safety-commit transition view.
