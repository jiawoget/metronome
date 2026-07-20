# Diagnostics And Test Harness Boundary

Pack F allows these production-emitted diagnostics and E2E-only controls. New
window events or globals must be added here with owner, producer, consumer,
reason, and removal condition before product code emits or reads them.

## Product Diagnostics

| Surface | Owner | Allowed producer | Allowed consumer | Reason | Removal condition |
| --- | --- | --- | --- | --- | --- |
| `quick-metronome:scheduled-tick` | Quick Metronome transport diagnostics | Quick Metronome metronome adapter or UI transport bridge | Browser tests and local diagnostics listeners | Verifies scheduled tick cadence without exposing Tone internals to UI tests. | Remove when tests can assert cadence through a stable service trace. |
| `recordings-review:playback` | Recordings Review playback UI | Recordings Review playback controls | Browser tests and local diagnostics listeners | Observes playback state transitions across local audio elements. | Remove when playback state has an equivalent service-level trace. |
| `recordings-review:seek` | Recordings Review playback UI | Recordings Review seek controls | Browser tests and local diagnostics listeners | Observes seek requests without depending on audio element internals. | Remove when seek state has an equivalent service-level trace. |
| `recordings-review:timeupdate` | Recordings Review playback UI | Recordings Review playback element bridge | Browser tests and local diagnostics listeners | Observes playback progress for review workflows. | Remove when review playback exposes a stable test-facing progress read. |
| `reference-audio:state-change` | Reference panel playback UI | Reference audio player bridge | Browser tests and local diagnostics listeners | Observes reference playback state while preserving the service boundary. | Remove when reference playback has a service-level state trace. |
| `metronome:active-recording-navigation` | Active recording navigation guard | Recording navigation guard | Browser tests and local diagnostics listeners | Verifies navigation blocking while capture/save state is active. | Remove when navigation guard state can be asserted through a public UI state. |

## E2E-Only Controls

| Surface | Owner | Allowed producer | Allowed consumer | Reason | Removal condition |
| --- | --- | --- | --- | --- | --- |
| `__sheetPracticeControlsTestHarness` | Sheet Practice controls tests | Playwright/unit tests before mount | Sheet Practice controls diagnostics gate | Enables Sheet Practice harness events only when tests opt in. | Remove when Sheet Practice E2E no longer needs internal countdown/recording controls. |
| `__sheetPracticeControlsBarCountIn` | Sheet Practice bar count-in tests | Playwright/unit tests before mount | Sheet Practice controls bar count-in option reader | Supplies deterministic count-in options without a product settings migration. | Remove when product UI exposes all testable count-in setup directly. |
| `sheet-practice-controls:set-recording-harness-active` | Sheet Practice recording harness | Playwright/unit tests with harness flag enabled | Sheet Practice controls harness listener | Simulates recording-active state without requiring a live microphone. | Remove when E2E recording coverage can use stable simulated capture only. |
| `sheet-practice-controls:bar-count-in-plan` | Sheet Practice bar count-in diagnostics | Sheet Practice controls with harness flag enabled | Playwright/unit tests | Captures deterministic count-in plan details. | Remove when count-in plan can be asserted through public UI state. |
| `sheet-practice-controls:bar-count-in-blocked` | Sheet Practice bar count-in diagnostics | Sheet Practice controls with harness flag enabled | Playwright/unit tests | Captures blocked count-in reasons. | Remove when blocked reasons are fully visible in public UI. |
| `sheet-practice-controls:bar-count-in-tick` | Sheet Practice bar count-in diagnostics | Sheet Practice controls with harness flag enabled | Playwright/unit tests | Captures count-in tick sequence without a real clock. | Remove when countdown executor tests cover the same evidence. |
| `__metronomeManualSegmentPageTurnTimer` | Sheet Viewer manual segment timer tests | Playwright/unit tests under E2E flag | Manual segment page-turn timer adapter | Makes the manually armed viewer timer deterministic. | Remove when viewer timer tests can use a stable fake timer seam. |
| `__metronomeSheetViewerService` | Sheet Viewer E2E diagnostics | Sheet Viewer browser service under E2E flag | Playwright sheet-viewer tests | Lets E2E verify thumbnail/service readiness without UI-only polling. | Remove when viewer service state is visible through public UI assertions. |
| `__referenceSystemUseFixtureSearch` | Reference system E2E fixtures | Playwright tests under fixture setup | Reference search fixture bridge | Keeps reference search deterministic without network/backend scope. | Remove when reference fixtures move behind a test-only service adapter. |

Business services must not depend on Playwright-only globals. Test-collected
arrays on `window` are test-owned; only production-emitted events and
production-read globals belong in this boundary.
