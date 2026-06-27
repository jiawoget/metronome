# Remaining v1 Feature Contracts

## Purpose

This file promotes the remaining v1 feature inventory into implementation-ready contracts. It complements the detailed Practice Segment contracts in `docs/v1/05f-practice-segments.md`.

## Common Rules For Every Contract In This File

- Each feature is implemented by exactly one fresh coding agent, reviewed by one fresh review agent, and verified by one fresh verification agent.
- Agents use `fork_context: false`, read repository files directly, and use standard speed.
- User-facing UI follows `docs/v1/ui-design.md`, `docs/v0/design-style-guide.md`, and `Design Notes/design_pictures/overall_style_design.png`.
- UI code must call high-level hooks/services, not storage, audio, media, PDF, image, cloud, or analysis internals directly.
- Persistence claims require reload verification.
- Media, metronome, waveform, recording, and analysis claims require real artifact, scheduler, decode, or controlled fixture evidence.
- v2 scope remains out of scope: accounts, cloud sync, cross-device resume, backup/restore, conflict handling, and uploaded artifacts.
- Verification fails if any acceptance criterion is untested, if UI is not exercised through real browser interaction, or if adjacent feature scope is implemented.

---

# Module: design-style

## Feature Contract: `design-style.analytics-visuals`

### Purpose
Define reusable visual rules for v1 analytics so Home, history, and review charts stay calm, honest, and consistent.

### User Value
The user can scan practice summaries without mistaking sparse local data for precise scoring.

### Scope
- Document analytics chart, trend, count, empty, loading, and low-data states.
- Define color, typography, density, responsive, and accessibility requirements.
- Provide examples for local-only practice summaries.

### Out Of Scope
- Product analytics implementation.
- Automatic scoring, prediction, cloud metrics, or cross-device summaries.

### User Paths
```text
Review a feature contract with analytics
  -> Apply shared analytics visual rules
  -> Verify empty, sparse, and populated states
```

### Data / State / Architecture Boundary
Reads local aggregate data descriptions only. Creates design rules and examples only. Must not create product state, storage, chart services, or analytics calculations.

### UI Design Requirements
Use warm off-white workspace surfaces, restrained cards, muted metadata, and small color accents. Charts must not dominate primary practice actions.

### Acceptance Criteria
- [ ] Rules cover empty, sparse, loading, and populated analytics states.
- [ ] Rules forbid unsupported precision and scoring claims.
- [ ] Rules include desktop, tablet-like, and mobile requirements.
- [ ] Rules are referenced by analytics feature contracts.

### Test Plan
Review by source inspection and visual checklist against `docs/v1/ui-design.md`; no product E2E is required until a consuming feature implements UI.

### Implementation Contract
Planning/design documentation only. Do not implement analytics UI.

### Verification Contract
Verifier checks the rules are complete, referenced, and do not authorize fake analytics or v2 scope.

### Done Definition
Done when rules are documented, reviewable, and a separate verification pass reports PASS.

## Feature Contract: `design-style.segment-visual-states`

### Purpose
Define shared visual states for MeasureGrid, segments, selected segment, stale grid, recording segment context, and repeated-take readiness.

### User Value
The user can understand segment state quickly without reading heavy explanations.

### Scope
- Define badges, colors, density, responsive behavior, and text limits for segment states.
- Cover Active, Needs calibration, Grid changed, Unsaved changes, Recording, Saved, and Ready to record again.

### Out Of Scope
- Segment CRUD, recording behavior, review grouping, or PDF overlays.

### User Paths
```text
Open Sheet Practice
  -> See segment status badge
  -> Understand whether segment is active, stale, or ready
```

### Data / State / Architecture Boundary
Consumes state names from feature contracts only. Creates design documentation only. Must not define storage schema or service behavior.

### UI Design Requirements
Use yellow for active/current practice state, purple sparingly for create/edit, compact badges, no large panels, no detected-bar overlays.

### Acceptance Criteria
- [ ] Rules define every v1 segment state named in Practice Segment contracts.
- [ ] Rules include text overflow and responsive checks.
- [ ] Rules preserve sheet dominance and transport visibility.

### Test Plan
Design review plus future consuming-feature E2E visual checks.

### Implementation Contract
Documentation/design tokens guidance only; no product component implementation.

### Verification Contract
Verifier confirms every segment state is covered and no automatic-recognition visual claim is introduced.

### Done Definition
Done when segment state visuals are documented and verified.

## Feature Contract: `design-style.review-comparison-views`

### Purpose
Define visual rules for take comparison, waveform rows, best/latest/active badges, and review empty states.

### User Value
The user can compare real takes without the interface implying automatic scoring.

### Scope
- Document compact comparison rows, waveform preview color accents, badge hierarchy, empty states, and responsive layout.
- Define visual treatment for latest, best, active, selected, and missing artifact states.

### Out Of Scope
- Waveform generation, take grouping, scoring, ranking, or audio analysis implementation.

### User Paths
```text
Open a future comparison review
  -> Scan takes and waveform evidence
  -> See honest latest/best/active labels
```

### Data / State / Architecture Boundary
Creates design rules only. Consumes review metadata names. Must not create analysis, waveform, or take services.

### UI Design Requirements
Compact rows, stable heights, small waveform accents, honest empty states, no oversized cards or score-like visuals.

### Acceptance Criteria
- [ ] Rules cover multi-take, waveform, badge, empty, error, and missing-artifact states.
- [ ] Rules forbid fake scores and unsupported precision.
- [ ] Rules include desktop, tablet-like, and mobile requirements.

### Test Plan
Design source review now; consuming feature Playwright and screenshot evidence later.

### Implementation Contract
Documentation only.

### Verification Contract
Verifier checks completeness and alignment with `docs/v1/ui-design.md`.

### Done Definition
Done when review comparison visual rules are documented and verified.

---

# Module: 01 App Shell / Home

## Feature Contract: `home.dashboard-analytics`

### Purpose
Show richer local practice summaries on Home from verified local sessions, recordings, segments, and goals.

### User Value
The user can see what they practiced recently and choose the next action faster.

### Scope
- Local-only summaries for practice minutes, session count, recordings, sheets, segments, and goal progress.
- Empty and sparse data states.
- Links to valid practice/review targets.

### Out Of Scope
Cloud analytics, skill scoring, predictions, cross-device data, notifications, and detailed charts that need unavailable data.

### User Paths
```text
Open Home
  -> See local practice summary
  -> Click a valid sheet, segment, recording, or quick practice target
```

### Data / State / Architecture Boundary
Reads local session, recording, sheet, segment, and goal services. Owns dashboard filter/view state. Must not read IndexedDB directly or create practice data.

### UI Design Requirements
Dense dashboard, warm off-white, compact summary cards/rows, no hero page, no unsupported precision.

### Acceptance Criteria
- [ ] Analytics derive only from local data.
- [ ] Empty history is honest and actionable.
- [ ] Deleted or stale targets are not linked.
- [ ] Desktop, tablet-like, and mobile layouts preserve primary practice entry.

### Test Plan
Unit aggregate calculations; integration local data joins; Playwright Home empty/populated/stale-target flows plus reload; manual visual review.

### Implementation Contract
May add analytics selectors/services and dashboard UI. Must not add cloud, scoring, or fake data.

### Verification Contract
Separate verifier checks calculations, E2E navigation, reload, console, and responsive layout.

### Done Definition
Done when all criteria pass and verification reports PASS.

## Feature Contract: `home.practice-streaks`

### Purpose
Show local practice streaks based on browser-local practice days.

### User Value
The user can notice consistency without needing an account.

### Scope
- Current streak, recent practice days, empty/reset states.
- Use v0 Today Summary local-day policy.

### Out Of Scope
Cloud identity, timezone sync, reminders, achievements, and streak repair.

### User Paths
```text
Open Home
  -> See current local streak
  -> Clear data or have no history
  -> See honest empty state
```

### Data / State / Architecture Boundary
Reads local sessions/activity dates. Owns display state. Must not write session records or call notification/cloud APIs.

### UI Design Requirements
Small dashboard element, muted metadata, no gamified hero treatment.

### Acceptance Criteria
- [ ] Uses local-day policy consistently.
- [ ] Handles no history and cleared data.
- [ ] Does not count future or invalid sessions.
- [ ] Responsive layout remains compact.

### Test Plan
Unit date grouping; integration sessions across dates; Playwright populated/empty/clear-data flow; manual timezone edge review.

### Implementation Contract
May add streak selector and Home UI. Must not add cloud or notification behavior.

### Verification Contract
Verifier checks date fixtures, browser E2E, reload, console, and layout.

### Done Definition
Done when local streak behavior is verified separately.

## Feature Contract: `home.goal-management`

### Purpose
Let users create and track simple local practice goals.

### User Value
The user can set local practice intent and see progress from actual activity.

### Scope
- Create, edit, delete local goals for minutes, sessions, or takes.
- Track progress from local sessions/recordings.
- Goal empty, active, completed, and invalid states.

### Out Of Scope
Notifications, cloud goals, social sharing, advanced plans, and automatic skill assessment.

### User Paths
```text
Open Home
  -> Create a minutes-practiced goal
  -> Practice locally
  -> Return and see progress
```

### Data / State / Architecture Boundary
Creates local goal records. Reads sessions/recordings for progress. Must not mutate sessions or require accounts.

### UI Design Requirements
Compact goal list/editor, stable controls, no marketing panels, progress wording avoids unsupported claims.

### Acceptance Criteria
- [ ] User can create/edit/delete local goals.
- [ ] Progress derives from local activity.
- [ ] Goals persist after reload.
- [ ] Invalid targets are rejected.

### Test Plan
Unit goal validation/progress; integration repository and session joins; Playwright create/edit/delete/reload/progress; responsive visual QA.

### Implementation Contract
May add goal domain, local service, Home UI. Must not add notifications or cloud.

### Verification Contract
Verifier checks persistence, local derivation, E2E, console, and no fake progress.

### Done Definition
Done when separate verification reports PASS.

## Feature Contract: `home.recent-activity-timeline`

### Purpose
Show recent local practice activity across quick practice, sheet practice, recordings, and segments.

### User Value
The user can resume or review recent work from one dense Home surface.

### Scope
- Timeline rows for recent sessions, recordings, sheets, and segment activity where available.
- Link validation for deleted/stale targets.

### Out Of Scope
Cloud activity, social feed, full review pages, analytics scoring.

### User Paths
```text
Open Home
  -> See recent activity rows
  -> Select a valid row
  -> Navigate to the correct local target
```

### Data / State / Architecture Boundary
Reads local sessions, recordings, sheets, and segments. Owns sort/filter UI only. Must not create activity records unless existing session services do.

### UI Design Requirements
Compact timeline rows, small icons, muted metadata, empty state without fake history.

### Acceptance Criteria
- [ ] Recent rows reflect local data only.
- [ ] Stale targets are hidden or disabled clearly.
- [ ] Quick, sheet, recording, and segment activities are represented.
- [ ] Layout remains usable on mobile.

### Test Plan
Unit sorting/target validation; integration multi-source join; Playwright navigation, reload, stale-target, responsive checks.

### Implementation Contract
May add timeline selector/UI. Must not invent history.

### Verification Contract
Verifier checks data provenance, links, E2E, console, and responsive layout.

### Done Definition
Done after verified local timeline behavior.

## Feature Contract: `home.continue-practice-recommendations`

### Purpose
Improve Continue Practice into valid local recommendations for quick, sheet, and segment practice.

### User Value
The user can resume meaningful work instead of only the most recent route.

### Scope
- Recommend recent quick practice, sheet practice, and segment practice targets.
- Validate deleted sheets/segments/recordings.
- Preserve fast entry to Quick Metronome and Sheet Practice.

### Out Of Scope
AI recommendations, cross-device resume, cloud ranking, reminders, and practice plans.

### User Paths
```text
Open Home
  -> See several valid continue options
  -> Choose a sheet or segment
  -> Land in the correct practice context
```

### Data / State / Architecture Boundary
Reads local sessions, sheets, segments, recordings, and current route availability. Owns recommendation ordering only.

### UI Design Requirements
Compact recommendation rows, no hero treatment, stale targets clear.

### Acceptance Criteria
- [ ] Recommends valid quick, sheet, and segment targets when data exists.
- [ ] Skips deleted/stale references.
- [ ] Navigation restores correct context.
- [ ] Empty state preserves fast start.

### Test Plan
Unit ranking/validation; integration route targets; Playwright recommendation navigation and reload; responsive QA.

### Implementation Contract
May add recommendation selector/UI. Must not add cloud or predictive scoring.

### Verification Contract
Verifier checks target validity, E2E navigation, console, and no v2 scope.

### Done Definition
Done when recommendations pass separate verification.

## Feature Contract: `home.command-palette`

### Purpose
Add a keyboard-driven navigation and action surface for implemented routes and valid practice targets.

### User Value
Power users can move around the app quickly without hunting through panels.

### Scope
- Open/close command palette.
- Search implemented routes and valid local practice targets.
- Execute safe navigation actions.

### Out Of Scope
Unimplemented actions, destructive commands without confirmation, plugin system, cloud commands.

### User Paths
```text
Press command shortcut
  -> Type sheet or route name
  -> Select result
  -> Navigate to valid target
```

### Data / State / Architecture Boundary
Reads route registry and local target summaries. Owns palette query/open/selection state. Must not bypass route or service guards.

### UI Design Requirements
Compact modal/dialog, keyboard focus, no landing copy, stable list heights, mobile fallback.

### Acceptance Criteria
- [ ] Palette opens via keyboard and visible trigger where appropriate.
- [ ] Search returns only implemented actions/valid targets.
- [ ] Keyboard navigation and escape work.
- [ ] Invalid/deleted targets are excluded.

### Test Plan
Unit search/filter; integration route target validation; Playwright keyboard open/search/select/escape/mobile; accessibility focus checks.

### Implementation Contract
May add palette UI and route action registry. Must not expose unimplemented or destructive actions.

### Verification Contract
Verifier checks real keyboard E2E, focus, console, responsive layout, and target validity.

### Done Definition
Done when palette behavior is verified separately.

---

# Module: 02 Quick Metronome

## Feature Contract: `quick.auto-increase`

### Purpose
Automatically ramp BPM during quick practice.

### User Value
The user can build tempo gradually without manually changing BPM every interval.

### Scope
- User chooses start BPM, target BPM, step size, and interval.
- Metronome timing changes at configured intervals.
- Clear active/paused/completed states.

### Out Of Scope
Sheet segments, routines, mute training, scoring, cloud templates.

### User Paths
```text
Open Quick Metronome
  -> Configure auto increase
  -> Start
  -> Hear/verify BPM changes until target
```

### Data / State / Architecture Boundary
Owns ramp settings and runtime state. Calls metronome service. Must not call Tone/Web Audio directly or create recordings.

### UI Design Requirements
Keep BPM center focus; ramp controls in side panel/drawer; stable controls across resize.

### Acceptance Criteria
- [ ] User can configure start, target, step, and interval.
- [ ] Tempo changes affect generated clicks.
- [ ] Stop/reset works.
- [ ] Invalid settings are rejected.

### Test Plan
Unit ramp schedule; integration metronome service calls; E2E configure/start/stop; specialized timing trace/audio evidence.

### Implementation Contract
May add ramp mode and UI. Must not fake timing or couple to recording.

### Verification Contract
Verifier inspects timing evidence, E2E, console, and responsive layout.

### Done Definition
Done when tempo changes are verified by timing evidence and PASS.

## Feature Contract: `quick.mute-training`

### Purpose
Alternate audible and silent measures for internal time training.

### User Value
The user can practice holding time during intentional silence.

### Scope
- Configure audible/silent measure pattern.
- Scheduler intentionally suppresses clicks for silent measures.
- Show current audible/silent state.

### Out Of Scope
Auto increase, scoring, recording analysis, routines.

### User Paths
```text
Open Quick Metronome
  -> Set 2 audible / 2 silent
  -> Start
  -> Hear audible measures followed by intentional silence
```

### Data / State / Architecture Boundary
Owns mute pattern and cycle state. Uses metronome scheduler boundary. No direct audio internals.

### UI Design Requirements
Compact pattern controls, clear silent-state badge, no large tutorial panel.

### Acceptance Criteria
- [ ] User can configure audible/silent pattern.
- [ ] Silent measures intentionally produce no clicks.
- [ ] Audible measures keep timing.
- [ ] Stop/reset clears cycle state.

### Test Plan
Unit cycle math; integration scheduler trace; E2E configure/start/stop; specialized evidence distinguishing silence from broken audio.

### Implementation Contract
May add mute-training mode. Must not break normal metronome.

### Verification Contract
Verifier checks audio/scheduler evidence, E2E, console, responsive UI.

### Done Definition
Done when intentional silence and audible timing are verified.

## Feature Contract: `quick.practice-templates`

### Purpose
Save, load, rename, and delete reusable quick metronome settings.

### User Value
The user can return to common practice setups quickly.

### Scope
- Local templates for BPM, meter, subdivision, accent, countdown, and implemented training mode settings.
- CRUD and load into current Quick Metronome state.

### Out Of Scope
Cloud templates, routines chaining, sheet-specific presets, sharing.

### User Paths
```text
Configure Quick Metronome
  -> Save as template
  -> Reload app
  -> Load template
```

### Data / State / Architecture Boundary
Creates local template metadata. Owns template draft/list state. Must not create sessions or recordings.

### UI Design Requirements
Compact template menu/list, icon buttons, no large library page unless later approved.

### Acceptance Criteria
- [ ] Save/load/rename/delete templates works.
- [ ] Templates persist after reload.
- [ ] Loading updates metronome settings.
- [ ] Invalid or stale mode settings are handled.

### Test Plan
Unit validation; integration local repository; Playwright CRUD/load/reload; responsive menu checks.

### Implementation Contract
May add local template service and UI. Must not add routines or cloud.

### Verification Contract
Verifier checks persistence, E2E, no session side effects, console.

### Done Definition
Done when template CRUD is verified.

## Feature Contract: `quick.warmup-routines`

### Purpose
Chain metronome templates into a local warmup flow.

### User Value
The user can run a structured warmup without manually changing settings each step.

### Scope
- Create/edit/delete local routines made of implemented templates or inline steps.
- Run steps sequentially with duration or measure counts.
- Keep recording independent.

### Out Of Scope
Cloud routines, adaptive scoring, auto-generated routines, sheet segments.

### User Paths
```text
Create warmup routine
  -> Add steps
  -> Start routine
  -> Advance through steps
```

### Data / State / Architecture Boundary
Creates local routine metadata and runtime step state. Calls metronome service only through boundary.

### UI Design Requirements
Compact step list and run state; BPM center remains primary during playback.

### Acceptance Criteria
- [ ] Routine CRUD persists locally.
- [ ] Running routine advances steps in order.
- [ ] Metronome settings change per step.
- [ ] Recording remains independent.

### Test Plan
Unit step progression; integration metronome updates; Playwright CRUD/run/reload; timing evidence for step changes.

### Implementation Contract
May add routine domain/service/UI. Must not add scoring or recording coupling.

### Verification Contract
Verifier checks step timing/settings, E2E, recording independence, console.

### Done Definition
Done when routine flow is verified.

## Feature Contract: `quick.tempo-progress-history`

### Purpose
Summarize practiced BPM ranges over time from local quick practice activity.

### User Value
The user can see tempo work history without claims of skill improvement.

### Scope
- Local summaries by date/session/template where data exists.
- Empty and sparse states.

### Out Of Scope
Skill scoring, prediction, cloud history, sheet segment analytics.

### User Paths
```text
Practice with Quick Metronome
  -> Return later
  -> See practiced tempo ranges
```

### Data / State / Architecture Boundary
Reads local sessions/events/recordings. Owns summary view state. Must not create activity records.

### UI Design Requirements
Small charts/rows, muted metadata, no improvement claims.

### Acceptance Criteria
- [ ] Summaries derive from local data.
- [ ] Empty/sparse states are honest.
- [ ] BPM ranges are calculated correctly.
- [ ] Reload preserves history display.

### Test Plan
Unit aggregation; integration session data; Playwright populated/empty/reload; visual QA.

### Implementation Contract
May add summary selectors/UI. Must not infer skill improvement.

### Verification Contract
Verifier checks calculations, E2E, no fake data, console.

### Done Definition
Done when local tempo history is verified.

## Feature Contract: `quick.advanced-countdown`

### Purpose
Add count-in by beats or measures to Quick Metronome.

### User Value
The user can prepare before metronome playback starts.

### Scope
- Countdown configured by beats or measures.
- Visible countdown state.
- Countdown transitions into normal metronome playback.

### Out Of Scope
Bar-aware segment count-in, routines, automatic recording start.

### User Paths
```text
Set countdown to two measures
  -> Press play
  -> Hear/see count-in
  -> Metronome begins
```

### Data / State / Architecture Boundary
Owns countdown settings/runtime. Uses metronome scheduler boundary. Must not directly call audio internals.

### UI Design Requirements
Compact controls, stable play/countdown states, BPM focus preserved.

### Acceptance Criteria
- [ ] User can choose beats or measures.
- [ ] Countdown timing is correct.
- [ ] Cancel/stop works during countdown.
- [ ] Normal playback begins after countdown.

### Test Plan
Unit countdown math; integration scheduler trace; Playwright configure/play/stop; specialized timing evidence.

### Implementation Contract
May add countdown options. Must not auto-start recording.

### Verification Contract
Verifier checks timing evidence, E2E, console, responsive UI.

### Done Definition
Done when countdown timing is verified.

---

# Module: 03 Recordings Review

## Feature Contract: `recordings.review-grouping`

### Purpose
Group recordings by useful local contexts such as quick practice, sheet, segment, and date.

### User Value
The user can find recordings faster without losing the unified review system.

### Scope
- Group/filter recordings by source, sheet, segment, and date.
- Preserve quick recordings and legacy recordings.

### Out Of Scope
Best take, waveform comparison, export, cloud review.

### User Paths
```text
Open Recordings
  -> Filter by sheet or segment
  -> Play a valid recording
```

### Data / State / Architecture Boundary
Reads recording metadata, sheets, segments. Owns filter/group UI state. Must not mutate artifacts.

### UI Design Requirements
Clean list, compact group headers, play buttons, waveform previews if existing.

### Acceptance Criteria
- [ ] Grouping works for quick, sheet, segment, and date.
- [ ] Legacy/no-segment recordings remain visible.
- [ ] Deleted target fallbacks are safe.
- [ ] Playback still works.

### Test Plan
Unit grouping; integration metadata joins; Playwright filters/play/reload; console/responsive checks.

### Implementation Contract
May add grouping selectors/UI. Must not add scoring or comparison.

### Verification Contract
Verifier checks E2E playback, grouping correctness, stale targets, console.

### Done Definition
Done when grouped review is verified.

## Feature Contract: `recordings.tags-favorites-archive`

### Purpose
Add local organization metadata for recordings.

### User Value
The user can mark important recordings and hide old ones without deleting artifacts.

### Scope
- Tags, favorite flag, archived flag, filters.
- Local persistence.

### Out Of Scope
Cloud tags, sharing, destructive cleanup, best take semantics.

### User Paths
```text
Open Recordings
  -> Favorite or tag a recording
  -> Reload
  -> Filter by that metadata
```

### Data / State / Architecture Boundary
Updates local recording organization metadata only. Must not rewrite audio artifacts.

### UI Design Requirements
Icon buttons, compact chips, filters, no heavy cards.

### Acceptance Criteria
- [ ] Tag/favorite/archive actions persist.
- [ ] Filters work after reload.
- [ ] Archived recordings are recoverable.
- [ ] Audio artifacts remain intact.

### Test Plan
Unit metadata validation; integration repository; Playwright tag/favorite/archive/filter/reload/play.

### Implementation Contract
May add metadata fields/service/UI. Must not delete artifacts.

### Verification Contract
Verifier checks persistence, artifact integrity, E2E, console.

### Done Definition
Done when organization metadata is verified.

## Feature Contract: `recordings.recording-comparison`

### Purpose
Compare selected recordings using real metadata and waveform evidence where available.

### User Value
The user can inspect takes side by side without automatic scoring.

### Scope
- Select two or more recordings.
- Show metadata comparison and real waveform/peaks if available.

### Out Of Scope
Automatic scoring, best-take decision, audio alignment, cloud analysis.

### User Paths
```text
Open Recordings
  -> Select recordings
  -> Compare metadata and waveform evidence
```

### Data / State / Architecture Boundary
Reads recordings and waveform services. Owns comparison selection state. Must not call decode internals from UI.

### UI Design Requirements
Compact comparison rows, stable waveform heights, honest missing-waveform states.

### Acceptance Criteria
- [ ] User can select recordings for comparison.
- [ ] Comparison uses real metadata/artifacts.
- [ ] Missing artifacts are handled clearly.
- [ ] No scoring claims appear.

### Test Plan
Unit selection; integration artifact/waveform reads; Playwright compare/reload; specialized waveform/artifact evidence.

### Implementation Contract
May add comparison UI. Must not add automatic scoring or alignment.

### Verification Contract
Verifier checks real artifact evidence, E2E, console, responsive layout.

### Done Definition
Done when comparison is verified with real evidence.

## Feature Contract: `recordings.audio-export`

### Purpose
Let users export local recording audio files.

### User Value
The user can keep or share their own recordings outside the app.

### Scope
- Export individual recordings in available artifact format.
- Safe filename and error handling.

### Out Of Scope
Batch export, cloud upload, format conversion unless already supported, metadata backups.

### User Paths
```text
Open Recording detail
  -> Click export
  -> Download the real audio artifact
```

### Data / State / Architecture Boundary
Reads recording artifacts through service. Owns export UI state. Must not mutate artifacts.

### UI Design Requirements
Icon/button action with clear disabled/error states.

### Acceptance Criteria
- [ ] Export downloads real artifact bytes.
- [ ] Missing artifact shows recoverable error.
- [ ] Export does not alter metadata or artifact.
- [ ] Browser console remains clean.

### Test Plan
Unit filename; integration artifact read; Playwright export flow; specialized file/blob verification.

### Implementation Contract
May add export service/UI. Must not upload or transcode unexpectedly.

### Verification Contract
Verifier inspects downloaded blob/artifact evidence and E2E.

### Done Definition
Done when export is verified with real artifact bytes.

---

# Module: 04 Sheet Library

## Feature Contract: `library.tags-favorites`

### Purpose
Add local tags and favorite state for sheets.

### User Value
The user can organize a growing sheet library.

### Scope
- Tags, favorite flag, filters/search integration.
- Preserve existing categories.

### Out Of Scope
Cloud labels, sharing, batch edit, smart tags.

### User Paths
```text
Open Sheet Library
  -> Favorite and tag a sheet
  -> Reload
  -> Filter by tag/favorite
```

### Data / State / Architecture Boundary
Updates local sheet organization metadata. Must not mutate sheet artifacts.

### UI Design Requirements
Searchable rows with compact chips, star icon, restrained filters.

### Acceptance Criteria
- [ ] Tags/favorites persist.
- [ ] Filters/search include metadata.
- [ ] Existing categories remain.
- [ ] Sheet opening still works.

### Test Plan
Unit validation; integration sheet repository; Playwright tag/favorite/filter/open/reload.

### Implementation Contract
May add metadata/UI. Must not change import artifacts.

### Verification Contract
Verifier checks persistence, filters, E2E, console.

### Done Definition
Done when local organization is verified.

## Feature Contract: `library.batch-import`

### Purpose
Import multiple supported sheet files in one flow.

### User Value
The user can add a folder-like batch without repeating single import.

### Scope
- Multi-file import of supported types.
- Mixed success/failure summary.
- Preserve successful imports.

### Out Of Scope
Unsupported formats, cloud import, OCR/bar recognition, metadata scraping.

### User Paths
```text
Select multiple files
  -> Import batch
  -> See successes and failures
  -> Open successfully imported sheets
```

### Data / State / Architecture Boundary
Uses existing import/artifact services. Owns batch progress state. Must not parse artifacts in UI.

### UI Design Requirements
Compact progress/results list, clear per-file errors, no wizard-heavy flow.

### Acceptance Criteria
- [ ] Multiple supported files import.
- [ ] Mixed failures do not remove successes.
- [ ] Imported artifacts are real and openable.
- [ ] Errors are clear.

### Test Plan
Unit result aggregation; integration importer fixtures; Playwright batch import; specialized artifact inspection.

### Implementation Contract
May add batch orchestration/UI. Must not add OCR or unsupported formats.

### Verification Contract
Verifier checks mixed batch, real artifacts, E2E, console.

### Done Definition
Done when batch import is verified.

## Feature Contract: `library.recent-practice-summary`

### Purpose
Show recent local practice info on sheet rows/details.

### User Value
The user can choose what to practice based on recent sheet activity.

### Scope
- Last practiced, recent session/recording/segment counts, empty state.

### Out Of Scope
Scoring, cloud history, detailed analytics.

### User Paths
```text
Open Sheet Library
  -> See recent practice metadata on sheet row
  -> Open relevant sheet
```

### Data / State / Architecture Boundary
Reads sessions, recordings, segments by sheet. Must not create practice data.

### UI Design Requirements
Compact metadata on rows/details, no fake summaries.

### Acceptance Criteria
- [ ] Summaries derive from local data.
- [ ] Sheets with no data show honest empty state.
- [ ] Deleted references are ignored.
- [ ] Library remains searchable.

### Test Plan
Unit aggregation; integration joins; Playwright row/detail/reload; responsive QA.

### Implementation Contract
May add summary selectors/UI. Must not add analytics claims.

### Verification Contract
Verifier checks local provenance, E2E, console, layout.

### Done Definition
Done when summaries are verified.

## Feature Contract: `library.review-by-sheet`

### Purpose
Link from a sheet to review views grouped by that sheet.

### User Value
The user can find all recordings for a sheet quickly.

### Scope
- Sheet row/detail action to recordings review filtered by sheet.
- Include segment grouping when segment metadata exists.

### Out Of Scope
New review comparison, best take, cloud review.

### User Paths
```text
Open Sheet Library
  -> Click Review for a sheet
  -> See recordings for that sheet
```

### Data / State / Architecture Boundary
Reads sheet and recording metadata. Uses route/filter boundaries. Must not duplicate review storage.

### UI Design Requirements
Compact review action, clear empty state.

### Acceptance Criteria
- [ ] Review link filters by selected sheet.
- [ ] Empty state is honest.
- [ ] Segment groups appear only when data exists.
- [ ] Deleted sheet targets are safe.

### Test Plan
Unit route target; integration filter; Playwright navigation/filter/reload; console.

### Implementation Contract
May add library action and route params. Must not implement review internals beyond filter integration.

### Verification Contract
Verifier checks navigation, filter correctness, E2E, console.

### Done Definition
Done when review-by-sheet flow is verified.

---

# Module: 05a Sheet Viewer

## Feature Contract: `viewer.page-thumbnails`

### Purpose
Create visual page navigation from real sheet artifacts.

### User Value
The user can move through multi-page sheets faster.

### Scope
- Generate/display thumbnails for PDF/image pages through artifact/viewer services.
- Select page by thumbnail.

### Out Of Scope
OCR, bar recognition, annotations, cloud thumbnails.

### User Paths
```text
Open multi-page sheet
  -> See thumbnails
  -> Click page thumbnail
```

### Data / State / Architecture Boundary
Reads sheet artifacts through viewer service. Owns selected thumbnail panel state. Must not decode PDFs in UI.

### UI Design Requirements
Sheet remains dominant; thumbnail rail/drawer compact; stable during resize.

### Acceptance Criteria
- [ ] Thumbnails come from real artifacts.
- [ ] Page selection works.
- [ ] Missing thumbnail errors are recoverable.
- [ ] Mobile layout keeps transport usable.

### Test Plan
Unit page state; integration PDF/image fixtures; Playwright navigation; specialized rendered thumbnail inspection.

### Implementation Contract
May add thumbnail service/UI. Must not add OCR.

### Verification Contract
Verifier checks rendered artifact evidence, E2E, console, responsive layout.

### Done Definition
Done when thumbnail navigation is verified.

## Feature Contract: `viewer.multi-page-jump`

### Purpose
Let users jump to a page in longer sheets.

### User Value
The user can navigate large PDFs without excessive scrolling.

### Scope
- Page number entry and thumbnail selection if available.
- Clamp or reject invalid page choices clearly.

### Out Of Scope
Bookmarks, score following, auto page turn.

### User Paths
```text
Open long sheet
  -> Enter page number
  -> Jump to page
```

### Data / State / Architecture Boundary
Reads page count from viewer service. Owns current page/jump input state.

### UI Design Requirements
Compact page control, stable dimensions, no overlap with sheet/transport.

### Acceptance Criteria
- [ ] Page entry jumps correctly.
- [ ] Invalid input is clamped or rejected clearly.
- [ ] Current page persists according to existing viewer policy.
- [ ] Responsive layout works.

### Test Plan
Unit page validation; integration viewer state; Playwright jump/invalid/resize; visual QA.

### Implementation Contract
May add page jump UI/state. Must not add assisted turning.

### Verification Contract
Verifier checks real browser page jumps and console.

### Done Definition
Done when multi-page jump is verified.

## Feature Contract: `viewer.advanced-zoom-pan`

### Purpose
Improve sheet navigation at different viewport sizes.

### User Value
The user can inspect music comfortably on desktop, tablet, and mobile.

### Scope
- Zoom controls, pan behavior, reset/fit options.
- Preserve sheet-first layout.

### Out Of Scope
Annotations, overlays, bar detection, persistent per-device sync.

### User Paths
```text
Open sheet
  -> Zoom in
  -> Pan
  -> Reset or fit
```

### Data / State / Architecture Boundary
Owns viewer transform state. Reads artifact dimensions. Must not mutate sheet artifact.

### UI Design Requirements
Icon controls with tooltips, stable sheet frame, transport remains reachable.

### Acceptance Criteria
- [ ] Zoom in/out/reset works.
- [ ] Pan works at zoomed levels.
- [ ] Resize preserves usable framing.
- [ ] No incoherent overlap.

### Test Plan
Unit transform math; integration viewer state; Playwright desktop/mobile zoom-pan; screenshot visual checks.

### Implementation Contract
May add transform controls/state. Must not add overlays or annotations.

### Verification Contract
Verifier checks real browser interactions and screenshots.

### Done Definition
Done when zoom/pan is verified across viewports.

## Feature Contract: `viewer.assisted-page-turning`

### Purpose
Offer practice-aware page turning based on manual timing or segment boundaries.

### User Value
The user can reduce manual page navigation during practice.

### Scope
- Manual timing/segment-boundary turn cues where available.
- User-controlled enable/disable.

### Out Of Scope
Automatic score following, audio-based page turning, PDF recognition.

### User Paths
```text
Enable assisted page turning
  -> Practice through known timing/segment boundary
  -> Viewer advances page according to configured rule
```

### Data / State / Architecture Boundary
Reads viewer pages, manual timing, and segment boundaries. Owns enable/rule state. Must not call audio analysis.

### UI Design Requirements
Subtle toggle/settings, no claim of automatic score following, sheet remains dominant.

### Acceptance Criteria
- [ ] User can enable/disable.
- [ ] Turns occur only from approved manual/segment data.
- [ ] Manual override works.
- [ ] No score-following claim appears.

### Test Plan
Unit turn rules; integration segment/page state; Playwright enable/turn/override; timing evidence with deterministic clock.

### Implementation Contract
May add assisted rules. Must not use audio recognition.

### Verification Contract
Verifier checks deterministic turn evidence, E2E, console, no analysis calls.

### Done Definition
Done when assisted turning is verified without score following.

---

# Module: 05b Practice Controls

## Feature Contract: `controls.segment-tempo`

### Purpose
Use segment-specific target tempo inside Sheet Practice controls.

### User Value
The user can practice a segment at its intended tempo while retaining manual override.

### Scope
- Selecting a segment can offer/apply target BPM.
- User override does not mutate segment unless explicitly saved by segment feature.

### Out Of Scope
Auto increase, bar count-in, recording changes, segment editing.

### User Paths
```text
Select segment with target BPM
  -> Apply target tempo
  -> Override current BPM
```

### Data / State / Architecture Boundary
Reads selected segment target BPM. Updates current practice BPM through metronome controls. Must not write segment records.

### UI Design Requirements
Compact apply/override state, yellow selected segment accent, stable bottom controls.

### Acceptance Criteria
- [ ] Segment target BPM can initialize/apply to controls.
- [ ] Override changes current BPM only.
- [ ] Invalid/missing target BPM is handled.
- [ ] Metronome timing reflects applied BPM.

### Test Plan
Unit target policy; integration metronome update; Playwright select/apply/override; specialized timing evidence.

### Implementation Contract
May add tempo apply UI/wiring. Must not edit segments or implement count-in.

### Verification Contract
Verifier checks timing evidence, E2E, no segment mutation, console.

### Done Definition
Done when segment tempo is verified.

## Feature Contract: `controls.bar-aware-count-in`

### Purpose
Count in by beats or measures before a selected segment starts.

### User Value
The user can prepare before entering a focused passage.

### Scope
- Count-in beats/measures based on MeasureGrid and selected segment.
- Deterministic scheduler behavior.

### Out Of Scope
Automatic recording start, auto page turn, segment looping, scoring.

### User Paths
```text
Select segment
  -> Choose one-measure count-in
  -> Start
  -> Hear count-in then practice starts
```

### Data / State / Architecture Boundary
Reads MeasureGrid and selected segment timing. Owns count-in state. Calls metronome service boundary only.

### UI Design Requirements
Compact count-in controls near transport, no sheet overlap.

### Acceptance Criteria
- [ ] Count-in by beats works.
- [ ] Count-in by measures works.
- [ ] Timing follows MeasureGrid.
- [ ] Stop/cancel works.

### Test Plan
Unit count-in math; integration scheduler trace; Playwright configure/start/stop; timing evidence.

### Implementation Contract
May add count-in controls/service integration. Must not auto-record.

### Verification Contract
Verifier checks deterministic timing evidence and E2E.

### Done Definition
Done when bar-aware count-in is verified.

## Feature Contract: `controls.per-sheet-metronome-presets`

### Purpose
Store sheet-specific metronome presets.

### User Value
The user can return to sheet or segment practice settings quickly.

### Scope
- CRUD local presets by sheet, optionally segment.
- Load preset into Sheet Practice controls.

### Out Of Scope
Quick templates, cloud sync, routines, auto apply without user control.

### User Paths
```text
Open Sheet Practice
  -> Save current metronome preset
  -> Reload
  -> Load preset
```

### Data / State / Architecture Boundary
Creates local preset metadata scoped to sheet/segment. Updates current control state on load. Must not mutate sheet defaults unless later approved.

### UI Design Requirements
Compact menu/list, icon actions, transport remains stable.

### Acceptance Criteria
- [ ] Preset save/load/rename/delete persists.
- [ ] Presets are scoped by sheet.
- [ ] Optional segment association works.
- [ ] Loading updates metronome timing.

### Test Plan
Unit validation; integration repository/metronome update; Playwright CRUD/load/reload; timing evidence.

### Implementation Contract
May add preset service/UI. Must not add cloud or routines.

### Verification Contract
Verifier checks persistence, scoping, timing, E2E, console.

### Done Definition
Done when per-sheet presets are verified.

---

# Module: 05c Sheet Recording Review / Takes

## Feature Contract: `takes.multi-take-management`

### Purpose
Group multiple recordings under the same sheet and segment.

### User Value
The user can review repeated attempts without losing any take.

### Scope
- Store/read take groups by sheetId and optional segmentId.
- Preserve quick recordings in unified review without forcing segment metadata.

### Out Of Scope
Best-take selection, waveform comparison, scoring, audio comping.

### User Paths
```text
Record same segment multiple times
  -> Open review
  -> See takes grouped together
```

### Data / State / Architecture Boundary
Reads recordings and segments. Creates grouping views or metadata only if needed. Must not mutate artifacts.

### UI Design Requirements
Compact grouped rows, honest counts, no score cards.

### Acceptance Criteria
- [ ] Takes group by sheet/segment.
- [ ] Every artifact remains accessible.
- [ ] Quick recordings remain visible.
- [ ] Deleted segment fallback is safe.

### Test Plan
Unit grouping; integration recordings/segments; Playwright grouped review/play/reload; artifact evidence.

### Implementation Contract
May add grouping service/UI. Must not rank or score takes.

### Verification Contract
Verifier checks grouping, artifacts, E2E, console.

### Done Definition
Done when multi-take grouping is verified.

## Feature Contract: `takes.active-best-take`

### Purpose
Let users mark one take as active or best while latest remains derived.

### User Value
The user can identify the take they want to keep practicing from.

### Scope
- User-selected best/active flags within a sheet/segment group.
- Latest derived from recording time.
- Safe updates on deletion.

### Out Of Scope
Automatic best detection, scoring, waveform comparison.

### User Paths
```text
Open grouped takes
  -> Mark a take as best
  -> Reload
  -> See best marker preserved
```

### Data / State / Architecture Boundary
Updates local take metadata only. Reads recording timestamps. Must not alter artifacts.

### UI Design Requirements
Small badges/icons, no promotional cards.

### Acceptance Criteria
- [ ] User can mark/unmark best/active.
- [ ] Latest is derived, not manually stored incorrectly.
- [ ] Deleting a marked take clears/updates safely.
- [ ] Persistence after reload.

### Test Plan
Unit selection rules; integration metadata; Playwright mark/delete/reload; console.

### Implementation Contract
May add metadata/UI. Must not auto-score.

### Verification Contract
Verifier checks user selection, derived latest, deletion safety.

### Done Definition
Done when active/best behavior is verified.

## Feature Contract: `takes.take-history`

### Purpose
Show take history for a sheet or segment.

### User Value
The user can understand repeated practice attempts over time.

### Scope
- Display take count, latest, best, duration, BPM, time signature, marker summary.
- Navigate back to segment practice context.

### Out Of Scope
Waveform comparison, scoring, analytics predictions.

### User Paths
```text
Open segment review
  -> See take history
  -> Return to practice same segment
```

### Data / State / Architecture Boundary
Reads recordings, take metadata, markers, segment. Owns view filters. Must not mutate artifacts except allowed marker links.

### UI Design Requirements
Compact rows, clear badges, honest empty states.

### Acceptance Criteria
- [ ] History displays required metadata.
- [ ] Navigation returns to valid practice context.
- [ ] Missing/deleted targets are handled.
- [ ] No fake marker summaries.

### Test Plan
Unit summary formatting; integration joins; Playwright history/navigation/reload; artifact/playback spot check.

### Implementation Contract
May add history UI/selectors. Must not compare waveforms or score.

### Verification Contract
Verifier checks metadata provenance, E2E, console, layout.

### Done Definition
Done when take history is verified.

## Feature Contract: `takes.waveform-comparison`

### Purpose
Compare takes with waveform evidence from real decoded artifacts or trusted peaks.

### User Value
The user can visually inspect timing and shape differences without scoring.

### Scope
- Waveform comparison rows for selected takes.
- Use real artifacts or validated peak data.

### Out Of Scope
Automatic scoring, pitch/rhythm correctness, audio comping, cloud analysis.

### User Paths
```text
Open take comparison
  -> Select takes
  -> Compare waveform evidence
```

### Data / State / Architecture Boundary
Reads recordings and waveform/analysis services. Owns selection/zoom state. UI must not decode audio directly.

### UI Design Requirements
Stable waveform row heights, consistent colors, compact metadata.

### Acceptance Criteria
- [ ] Waveforms derive from real decoded artifacts or validated peaks.
- [ ] Invalid peaks are rejected.
- [ ] Missing artifacts show honest state.
- [ ] No scoring claims.

### Test Plan
Unit peak validation; integration decode/peaks; Playwright compare; specialized artifact/waveform evidence.

### Implementation Contract
May add waveform comparison UI. Must not add correctness scoring.

### Verification Contract
Verifier inspects waveform evidence, E2E, console, responsive layout.

### Done Definition
Done when waveform comparison is verified with real evidence.

---

# Module: 05d Error Markers

## Feature Contract: `markers.categories-severity`

### Purpose
Add manual marker category and severity metadata.

### User Value
The user can label practice issues more meaningfully.

### Scope
- Category, severity, filtering, visible labels.
- Preserve marker timestamps and recording scope.

### Out Of Scope
Automatic mistake detection, scoring, segment derivation.

### User Paths
```text
Add marker during review
  -> Choose category/severity
  -> Filter markers
```

### Data / State / Architecture Boundary
Updates marker metadata only. Must not create analysis results.

### UI Design Requirements
Compact labels/chips, restrained filters.

### Acceptance Criteria
- [ ] Category/severity save and persist.
- [ ] Filtering works.
- [ ] Timestamp scope remains intact.
- [ ] Existing markers remain valid.

### Test Plan
Unit validation; integration marker repository; Playwright add/filter/reload; console.

### Implementation Contract
May add metadata/UI. Must not auto-detect mistakes.

### Verification Contract
Verifier checks persistence, filtering, E2E, no scoring.

### Done Definition
Done when marker metadata is verified.

## Feature Contract: `markers.segment-markers`

### Purpose
Associate markers with segment context derived from recording or review context.

### User Value
The user can understand which segment a marker belongs to.

### Scope
- Derive segment relation from recording metadata or selected review context.
- Display/filter by segment.

### Out Of Scope
Markers becoming segment-owned instead of recording-scoped; automatic detection.

### User Paths
```text
Review segment-linked recording
  -> Add marker
  -> See segment context
```

### Data / State / Architecture Boundary
Reads recording segment metadata and marker timestamps. Marker remains recording-scoped.

### UI Design Requirements
Small segment badge on marker rows, no heavy overlays.

### Acceptance Criteria
- [ ] Segment relation derives safely.
- [ ] Marker remains recording-scoped.
- [ ] Deleted segment fallback works.
- [ ] Filtering by segment works.

### Test Plan
Unit derivation; integration marker/recording join; Playwright add/filter/reload; console.

### Implementation Contract
May add derived display/filter. Must not alter marker ownership.

### Verification Contract
Verifier checks derivation, persistence, E2E, no auto detection.

### Done Definition
Done when segment marker context is verified.

## Feature Contract: `markers.waveform-overlay`

### Purpose
Display markers on waveform views.

### User Value
The user can see where manual notes occur in audio.

### Scope
- Overlay marker positions from timestamps on waveform views.
- Seek behavior through playback service.

### Out Of Scope
Automatic marker generation, analysis scoring, waveform generation itself unless already available.

### User Paths
```text
Open waveform review
  -> See marker overlays
  -> Click marker to seek
```

### Data / State / Architecture Boundary
Reads markers and waveform/playback services. Owns overlay hover/selection state. Must not call audio internals directly.

### UI Design Requirements
Subtle overlay ticks/labels, stable waveform dimensions.

### Acceptance Criteria
- [ ] Overlay positions match timestamps.
- [ ] Seek uses playback service.
- [ ] Missing waveform/markers handled.
- [ ] Layout remains stable.

### Test Plan
Unit position math; integration playback seek; Playwright overlay/seek; specialized waveform screenshot evidence.

### Implementation Contract
May add overlay UI. Must not auto-generate markers.

### Verification Contract
Verifier checks timestamp mapping, E2E seek, console.

### Done Definition
Done when marker overlay is verified.

---

# Module: 05e Session Integration

## Feature Contract: `sessions.event-timeline`

### Purpose
Record meaningful practice events such as metronome, recording, and reference playback actions.

### User Value
The user and later features can reconstruct what happened during a session.

### Scope
- Local timeline events for start/stop recording, metronome, reference play/pause.
- Deterministic enough for tests.

### Out Of Scope
Cloud logs, analytics scoring, coupling transports together.

### User Paths
```text
Practice with metronome and recording
  -> Session timeline records events
  -> Reload and inspect history
```

### Data / State / Architecture Boundary
Creates session event records through session service. Must not own transport state.

### UI Design Requirements
If visible, compact timeline/list, no analytics claims.

### Acceptance Criteria
- [ ] Key events are recorded with session id/time.
- [ ] Events persist after reload.
- [ ] Transport controls remain independent.
- [ ] Invalid/no-session cases are safe.

### Test Plan
Unit event schema; integration service calls; Playwright event-producing flows; deterministic clock checks.

### Implementation Contract
May add event model/service integration. Must not couple controls.

### Verification Contract
Verifier checks event evidence, E2E, reload, console.

### Done Definition
Done when timeline events are verified.

## Feature Contract: `sessions.segment-sessions`

### Purpose
Associate sessions with selected practice segments.

### User Value
The user can resume and review segment-focused sessions.

### Scope
- Optional `segmentId` on sheet sessions/activity.
- Continue Practice can return to sheet and segment.

### Out Of Scope
Cross-device resume, take review, segment recording implementation.

### User Paths
```text
Select segment and practice
  -> End session
  -> Continue Practice returns to segment
```

### Data / State / Architecture Boundary
Updates local session metadata with optional segment context. Must not require recordings.

### UI Design Requirements
Compact session/continue labels, no heavy dashboard.

### Acceptance Criteria
- [ ] Sessions can include segmentId.
- [ ] Sessions without segment remain valid.
- [ ] Continue target restores sheet/segment.
- [ ] Deleted segment fallback works.

### Test Plan
Unit session validation; integration continuation target; Playwright segment session/reload/continue.

### Implementation Contract
May add optional segment fields and restore logic. Must not add cloud resume.

### Verification Contract
Verifier checks both segment/no-segment paths, E2E, console.

### Done Definition
Done when segment session behavior is verified.

## Feature Contract: `sessions.session-history-grouping`

### Purpose
Group session history by sheet, segment, or practice date.

### User Value
The user can understand practice history locally.

### Scope
- Local history grouping/filtering.
- Empty and stale target handling.

### Out Of Scope
Cloud merge, cross-device history, analytics scoring.

### User Paths
```text
Open session history
  -> Group by date or sheet
  -> Select valid session
```

### Data / State / Architecture Boundary
Reads sessions, sheets, segments. Owns grouping UI state. Must not mutate history.

### UI Design Requirements
Compact grouped rows, honest empty states.

### Acceptance Criteria
- [ ] Grouping by date/sheet/segment works.
- [ ] Missing targets handled.
- [ ] Local data only.
- [ ] Reload preserves data display.

### Test Plan
Unit grouping; integration joins; Playwright grouping/reload/stale; responsive QA.

### Implementation Contract
May add grouping selectors/UI. Must not add cloud merge.

### Verification Contract
Verifier checks local provenance, E2E, console.

### Done Definition
Done when history grouping is verified.

## Feature Contract: `sessions.goal-completion`

### Purpose
Track completion of local practice goals from session activity.

### User Value
The user can see goals completed by actual practice.

### Scope
- Evaluate simple local goals: minutes, sessions, takes.
- Completion events/status from local activity.

### Out Of Scope
Notifications, cloud goals, social achievements, scoring.

### User Paths
```text
Create local goal
  -> Complete practice sessions
  -> Goal shows completed
```

### Data / State / Architecture Boundary
Reads goals, sessions, recordings. Updates local goal completion state. Must not fabricate activity.

### UI Design Requirements
Small completion badges/progress, no celebratory full-screen UI.

### Acceptance Criteria
- [ ] Completion derives from local activity.
- [ ] Empty/partial states work.
- [ ] Completion persists after reload.
- [ ] Invalid goals ignored or surfaced safely.

### Test Plan
Unit completion logic; integration goals/sessions; Playwright goal progress/reload; console.

### Implementation Contract
May add completion evaluator. Must not add notifications/cloud.

### Verification Contract
Verifier checks local derivation and E2E.

### Done Definition
Done when goal completion is verified.

---

# Module: 06 Reference System

## Feature Contract: `reference.ab-loop`

### Purpose
Loop a selected reference range.

### User Value
The user can repeatedly hear a target passage.

### Scope
- Store local reference start/end range.
- Playback loop for local audio; Bilibili remains metadata/external.

### Out Of Scope
Automatic alignment, recording comparison, cloud upload.

### User Paths
```text
Open reference
  -> Set A and B
  -> Enable loop
```

### Data / State / Architecture Boundary
Reads reference metadata/audio via service. Stores loop points. Playback through reference service.

### UI Design Requirements
Compact A/B controls, clear loop toggle, sheet remains primary when in practice.

### Acceptance Criteria
- [ ] User can set valid A/B points.
- [ ] Local audio loops within range.
- [ ] Invalid ranges rejected.
- [ ] Bilibili behavior remains external/lightweight.

### Test Plan
Unit range validation; integration playback service; Playwright set/loop; specialized playback timing evidence.

### Implementation Contract
May add loop metadata/UI. Must not auto-align.

### Verification Contract
Verifier checks playback evidence, E2E, console.

### Done Definition
Done when AB loop is verified.

## Feature Contract: `reference.playback-speed`

### Purpose
Control local reference playback rate.

### User Value
The user can slow down or speed up references safely.

### Scope
- Safe speed values for local audio.
- Independent reference playback state.

### Out Of Scope
Pitch preservation guarantees unless supported, Bilibili speed control, recording speed changes.

### User Paths
```text
Open local reference
  -> Change speed
  -> Playback uses new rate
```

### Data / State / Architecture Boundary
Stores local reference speed setting. Calls reference playback service. Must not alter audio artifact.

### UI Design Requirements
Slider/stepper, compact display, stable controls.

### Acceptance Criteria
- [ ] Safe speeds can be selected.
- [ ] Playback rate changes audibly/traceably.
- [ ] Invalid values rejected.
- [ ] Recording/metronome unaffected.

### Test Plan
Unit validation; integration playback rate; Playwright speed changes; specialized playback trace.

### Implementation Contract
May add speed controls. Must not mutate artifacts.

### Verification Contract
Verifier checks playback evidence and independence.

### Done Definition
Done when playback speed is verified.

## Feature Contract: `reference.manual-offset-alignment`

### Purpose
Store manual offset between a reference and practice grid or recording.

### User Value
The user can align reference playback context without automatic claims.

### Scope
- User adjusts offset explicitly.
- Store offset scoped to reference/sheet or recording context.

### Out Of Scope
Automatic alignment, onset detection UI, scoring.

### User Paths
```text
Open reference alignment controls
  -> Adjust offset
  -> Save
  -> Reload and see same offset
```

### Data / State / Architecture Boundary
Reads reference, grid, recording metadata. Stores manual offset metadata. Must not run analysis.

### UI Design Requirements
Compact numeric/slider control, clear "manual" wording.

### Acceptance Criteria
- [ ] User can set/reset offset.
- [ ] Offset persists after reload.
- [ ] Offset applies to displayed/playback alignment context.
- [ ] No automatic alignment claim appears.

### Test Plan
Unit offset validation; integration persistence; Playwright set/reset/reload; timing display checks.

### Implementation Contract
May add manual offset service/UI. Must not auto-detect.

### Verification Contract
Verifier checks persistence, E2E, no analysis calls.

### Done Definition
Done when manual offset is verified.

## Feature Contract: `reference.segment-binding`

### Purpose
Attach a reference range to a practice segment.

### User Value
The user can connect a model passage to the segment they are practicing.

### Scope
- One active reference range binding per segment.
- Reference remains scoped to sheet.

### Out Of Scope
Automatic alignment, segment recording, AB loop generation unless existing.

### User Paths
```text
Select segment
  -> Choose reference range
  -> Save binding
```

### Data / State / Architecture Boundary
Reads segments and references. Creates local binding metadata. Must not duplicate reference artifacts.

### UI Design Requirements
Compact binding controls in right panel, clear missing-reference states.

### Acceptance Criteria
- [ ] Binding save/edit/remove persists.
- [ ] Binding is scoped to sheet/segment.
- [ ] Deleted reference/segment fallback works.
- [ ] No auto-alignment claim.

### Test Plan
Unit validation; integration binding repository; Playwright bind/reload/delete fallback.

### Implementation Contract
May add binding metadata/UI. Must not add analysis.

### Verification Contract
Verifier checks persistence, scope, E2E, console.

### Done Definition
Done when reference binding is verified.

## Feature Contract: `reference.waveform-display`

### Purpose
Show waveform data for local reference audio.

### User Value
The user can navigate and inspect reference audio visually.

### Scope
- Generate/read waveform peaks from real local reference audio.
- Display waveform with loading/error states.

### Out Of Scope
Automatic scoring, alignment, cloud waveform generation, Bilibili waveform.

### User Paths
```text
Open local reference
  -> See waveform
  -> Seek using waveform
```

### Data / State / Architecture Boundary
Reads local audio through reference/waveform service. UI must not decode audio directly.

### UI Design Requirements
Stable waveform dimensions, restrained color accents, honest missing data.

### Acceptance Criteria
- [ ] Waveform derives from real local audio.
- [ ] Seek behavior uses playback service.
- [ ] Invalid audio errors are clear.
- [ ] No scoring/alignment claim.

### Test Plan
Unit peak validation; integration decode fixtures; Playwright display/seek; specialized waveform evidence.

### Implementation Contract
May add waveform generation/display. Must not add scoring.

### Verification Contract
Verifier checks real audio/peak evidence, E2E, console.

### Done Definition
Done when waveform display is verified.

---

# Module: 07 Settings / Local Data

## Feature Contract: `settings.audio-device-selection`

### Purpose
Let users choose browser audio input/output devices where supported.

### User Value
The user can use the intended microphone or speaker.

### Scope
- Device list, selection, permission denial, unsupported output handling.
- Persist local preference where safe.

### Out Of Scope
Cloud device sync, advanced routing, driver troubleshooting.

### User Paths
```text
Open Settings
  -> Grant/select device
  -> Practice uses selected device where supported
```

### Data / State / Architecture Boundary
Uses browser media device adapter. Stores local preference. UI must not call raw APIs outside adapter.

### UI Design Requirements
Compact selects, clear permission/error states.

### Acceptance Criteria
- [ ] Supported devices list/select.
- [ ] Permission denial handled.
- [ ] Unsupported output is clear.
- [ ] Preference persists after reload.

### Test Plan
Unit preference; integration mocked adapter; Playwright permission states where feasible; manual browser QA.

### Implementation Contract
May add device adapter/settings UI. Must not break recording.

### Verification Contract
Verifier checks adapter boundaries, E2E/manual evidence, console.

### Done Definition
Done when device selection is verified.

## Feature Contract: `settings.theme-system`

### Purpose
Add local theme preferences while preserving v0 visual direction.

### User Value
The user can choose comfortable local appearance without losing app identity.

### Scope
- Local theme setting for approved modes.
- Apply consistently across app.

### Out Of Scope
Cloud theme sync, arbitrary theme builder, heavy dark redesign.

### User Paths
```text
Open Settings
  -> Choose theme
  -> Reload
  -> Theme remains
```

### Data / State / Architecture Boundary
Stores local theme preference. Owns theme provider state. Must not affect product data.

### UI Design Requirements
Preserve warm/light reference direction; avoid one-note palettes.

### Acceptance Criteria
- [ ] Theme preference persists.
- [ ] App applies theme consistently.
- [ ] Text contrast remains acceptable.
- [ ] Existing layouts do not break.

### Test Plan
Unit preference; integration provider; Playwright switch/reload/responsive screenshots.

### Implementation Contract
May add theme provider/settings. Must not redesign unrelated screens.

### Verification Contract
Verifier checks visual screenshots, E2E, console.

### Done Definition
Done when theme behavior is verified.

## Feature Contract: `settings.notification-settings`

### Purpose
Store local notification preferences with explicit permission request.

### User Value
The user controls whether the app may notify them locally.

### Scope
- Local preference toggles.
- Request browser permission only through explicit action.

### Out Of Scope
Cloud push, scheduled reminders unless later approved, service-worker sync.

### User Paths
```text
Open Settings
  -> Enable notifications
  -> Browser permission requested explicitly
```

### Data / State / Architecture Boundary
Stores local preferences. Uses notification adapter. Must not request permission on page load.

### UI Design Requirements
Clear toggles, permission state labels, no nagging UI.

### Acceptance Criteria
- [ ] Preferences persist.
- [ ] Permission requested only by explicit action.
- [ ] Denied/unsupported states are clear.
- [ ] No cloud dependency.

### Test Plan
Unit preference; integration adapter mocks; Playwright explicit action/denied states.

### Implementation Contract
May add settings UI/adapter. Must not create reminders or cloud push.

### Verification Contract
Verifier checks permission behavior, E2E, console.

### Done Definition
Done when notification settings are verified.

## Feature Contract: `settings.data-import-export`

### Purpose
Support local backup and restore files.

### User Value
The user can move or safeguard local metadata and supported artifacts.

### Scope
- Export local metadata and supported artifacts with integrity checks.
- Import validates before writing.

### Out Of Scope
Cloud sync, conflict merge, cross-device live resume.

### User Paths
```text
Open Settings
  -> Export local data
  -> Import backup
  -> Verify data restored
```

### Data / State / Architecture Boundary
Uses local data services and artifact services. Must validate import before writes and prevent dangling references.

### UI Design Requirements
Clear step states, progress/errors, no hidden destructive import.

### Acceptance Criteria
- [ ] Export creates valid backup file.
- [ ] Import validates structure/integrity.
- [ ] Restore preserves supported data/artifacts.
- [ ] Invalid backup is rejected safely.

### Test Plan
Unit schema validation; integration round-trip fixtures; Playwright export/import; specialized archive/integrity inspection.

### Implementation Contract
May add backup services/UI. Must not add cloud/conflict merge.

### Verification Contract
Verifier checks round-trip artifacts, E2E, no data corruption.

### Done Definition
Done when import/export is verified with real files.

## Feature Contract: `settings.storage-usage-breakdown`

### Purpose
Show storage usage by data type.

### User Value
The user can understand what consumes local space.

### Scope
- Usage by sheets, recordings, references, markers, sessions, settings.
- Approximate values with clear wording.

### Out Of Scope
Automatic cleanup, cloud storage, exact browser quota guarantees.

### User Paths
```text
Open Settings
  -> View storage breakdown
```

### Data / State / Architecture Boundary
Reads storage services/quota adapter. Must not scan storage directly from UI.

### UI Design Requirements
Compact list/bar, honest approximate labels.

### Acceptance Criteria
- [ ] Breakdown derives from storage services.
- [ ] Empty/error states handled.
- [ ] No unsupported precision claims.
- [ ] Reload display works.

### Test Plan
Unit formatting; integration quota/storage adapters; Playwright populated/empty/error.

### Implementation Contract
May add usage service/UI. Must not delete data.

### Verification Contract
Verifier checks service boundary, E2E, console.

### Done Definition
Done when usage breakdown is verified.

## Feature Contract: `settings.selective-cleanup`

### Purpose
Allow cleanup by data type while preventing dangling references.

### User Value
The user can reclaim local space without clearing everything.

### Scope
- Cleanup sheets, recordings, references, markers, sessions, settings categories as supported.
- Confirmation and dependency safety.

### Out Of Scope
Cloud cleanup, backup/restore, conflict resolution.

### User Paths
```text
Open Settings
  -> Choose recordings cleanup
  -> Confirm
  -> Related references remain valid or are handled safely
```

### Data / State / Architecture Boundary
Calls cleanup services with dependency checks. Must not delete via UI direct storage calls.

### UI Design Requirements
Clear confirmations, consequences, compact controls, no accidental destructive action.

### Acceptance Criteria
- [ ] User can clean selected supported categories.
- [ ] Dangling references are prevented.
- [ ] Clear All remains available.
- [ ] Cancel path changes nothing.

### Test Plan
Unit dependency rules; integration cleanup fixtures; Playwright confirm/cancel/reload; data integrity inspection.

### Implementation Contract
May add cleanup services/UI. Must not bypass dependency checks.

### Verification Contract
Verifier checks destructive paths carefully, integrity, E2E, console.

### Done Definition
Done when selective cleanup is verified safe.

---

# Module: 08 Practice Session

## Feature Contract: `practice-session.event-timeline`

### Purpose
Expose session event timelines in practice-session views.

### User Value
The user can review what occurred during a practice session.

### Scope
- Display local session events from `sessions.event-timeline`.
- Filter/highlight event types.

### Out Of Scope
Creating events, cloud history, analytics scoring.

### User Paths
```text
Open practice session detail
  -> See ordered event timeline
```

### Data / State / Architecture Boundary
Reads session events. Owns display/filter state. Must not mutate events.

### UI Design Requirements
Compact timeline rows, muted timestamps, honest empty state.

### Acceptance Criteria
- [ ] Events display in order.
- [ ] Empty sessions are valid.
- [ ] Filters work if implemented.
- [ ] Reload preserves display.

### Test Plan
Unit ordering; integration event read; Playwright detail/reload/filter.

### Implementation Contract
May add timeline UI. Must not create event records.

### Verification Contract
Verifier checks local event evidence, E2E, console.

### Done Definition
Done when session timeline view is verified.

## Feature Contract: `practice-session.segment-history`

### Purpose
Show segment activity within practice session history.

### User Value
The user can see which passages were practiced in a session.

### Scope
- Segment summaries in session history.
- Safe fallback for deleted segments.

### Out Of Scope
Take comparison, scoring, cross-device history.

### User Paths
```text
Open session history
  -> See segment entries
  -> Navigate to valid segment practice context
```

### Data / State / Architecture Boundary
Reads sessions, segments, recordings. Owns history display state.

### UI Design Requirements
Compact segment rows/badges, no fake activity.

### Acceptance Criteria
- [ ] Segment history derives from local sessions/recordings.
- [ ] Deleted segment fallback works.
- [ ] Navigation targets are valid.
- [ ] Reload works.

### Test Plan
Unit summaries; integration joins; Playwright history/navigation/reload.

### Implementation Contract
May add segment history UI/selectors. Must not create sessions.

### Verification Contract
Verifier checks provenance, E2E, console.

### Done Definition
Done when segment history is verified.

## Feature Contract: `practice-session.session-comparison`

### Purpose
Compare sessions using local metadata.

### User Value
The user can inspect differences between practice sessions without scoring claims.

### Scope
- Compare duration, events, recordings, sheets, segments, goals where data exists.

### Out Of Scope
Skill scoring, audio comparison, automatic recommendations.

### User Paths
```text
Select sessions
  -> Compare local metadata
```

### Data / State / Architecture Boundary
Reads sessions and related metadata. Owns comparison selection. Must not mutate sessions.

### UI Design Requirements
Compact comparison table/rows, no score-like visuals.

### Acceptance Criteria
- [ ] User can select sessions.
- [ ] Comparison uses local metadata.
- [ ] Missing data handled honestly.
- [ ] No scoring claims.

### Test Plan
Unit comparison model; integration metadata joins; Playwright select/compare/reload.

### Implementation Contract
May add comparison UI. Must not add audio analysis.

### Verification Contract
Verifier checks local provenance, E2E, console.

### Done Definition
Done when session comparison is verified.

## Feature Contract: `practice-session.duration-rules`

### Purpose
Define and apply consistent session duration calculations.

### User Value
The user sees consistent practice time across Home, history, and goals.

### Scope
- Local rules for active time, pauses, recording/metronome/reference events.
- Shared utility/service for duration.

### Out Of Scope
Cross-device reconciliation, background tracking, cloud merge.

### User Paths
```text
Practice with starts/stops
  -> View session duration consistently across screens
```

### Data / State / Architecture Boundary
Reads session events. Creates calculation utilities. Must not alter raw event history.

### UI Design Requirements
Display durations compactly with clear labels.

### Acceptance Criteria
- [ ] Duration rules are documented and implemented consistently.
- [ ] Edge cases with pauses/stops are tested.
- [ ] Consumers use shared utility.
- [ ] No unsupported precision claims.

### Test Plan
Unit duration fixtures; integration consumer checks; Playwright consistency spot checks.

### Implementation Contract
May add shared duration service. Must not rewrite historical events.

### Verification Contract
Verifier checks fixture coverage and cross-screen consistency.

### Done Definition
Done when duration rules are verified.

---

# Module: 09 Audio Analysis

## Feature Contract: `analysis.engine-boundary`

### Purpose
Define `AudioAnalysisEngine` so analysis can be replaced or moved to WASM later.

### User Value
Future waveform and review features can use analysis safely without coupling UI to implementation.

### Scope
- Engine interface, adapters, input/output validation, error model.
- TypeScript implementation acceptable for early bounded work.

### Out Of Scope
User-facing scoring, automatic mistake detection, cloud analysis.

### User Paths
```text
Review feature requests analysis
  -> Calls analysis service
  -> UI receives validated result
```

### Data / State / Architecture Boundary
Reads audio buffers/artifacts through services. Analysis internals hidden behind engine boundary. UI never calls engine directly.

### UI Design Requirements
No direct UI unless error/status surfaces consume engine results honestly.

### Acceptance Criteria
- [ ] Engine interface is documented/typed.
- [ ] Inputs/outputs validated.
- [ ] Errors are recoverable.
- [ ] UI cannot import engine internals directly.

### Test Plan
Unit interface/validation; integration sample engine; source boundary inspection.

### Implementation Contract
May add analysis boundary. Must not expose scoring UI.

### Verification Contract
Verifier checks architecture boundaries and fixtures.

### Done Definition
Done when boundary is verified.

## Feature Contract: `analysis.peak-precomputation`

### Purpose
Precompute waveform peaks for review performance.

### User Value
Waveform views can render faster using trusted local peaks.

### Scope
- Derive peaks from real audio.
- Store/read validated peaks.
- Reject invalid trusted peaks after decode verification.

### Out Of Scope
Scoring, pitch/rhythm analysis, cloud precompute.

### User Paths
```text
Open recording review
  -> Peaks generate or load
  -> Waveform renders from validated data
```

### Data / State / Architecture Boundary
Reads audio artifacts through services. Creates local peak cache. UI must not decode audio directly.

### UI Design Requirements
Waveform consumers show loading/error states honestly.

### Acceptance Criteria
- [ ] Peaks derive from real audio.
- [ ] Peak cache persists.
- [ ] Invalid peaks rejected.
- [ ] Missing artifact handled.

### Test Plan
Unit peak validation; integration decode fixtures/cache; specialized artifact evidence; Playwright consumer smoke where available.

### Implementation Contract
May add peak service/cache. Must not add scoring.

### Verification Contract
Verifier checks decode/peak evidence and boundaries.

### Done Definition
Done when peak precomputation is verified.

## Feature Contract: `analysis.onset-detection-infrastructure`

### Purpose
Introduce onset detection as an internal capability.

### User Value
Future review tools can analyze timing while v1 avoids user-facing scoring claims.

### Scope
- Internal onset detector with controlled fixtures and documented tolerances.
- Service boundary only.

### Out Of Scope
Mistake detection UI, automatic scoring, live feedback.

### User Paths
```text
Analysis service processes fixture audio
  -> Returns onset candidates for internal consumers
```

### Data / State / Architecture Boundary
Reads audio through analysis boundary. Creates internal results only. UI must not call detector directly.

### UI Design Requirements
No user-facing UI in this feature.

### Acceptance Criteria
- [ ] Detector works on controlled fixtures within tolerances.
- [ ] Errors/low-confidence states are represented.
- [ ] No user-facing scoring exposed.
- [ ] Boundary allows replacement later.

### Test Plan
Unit controlled fixtures; integration engine boundary; source inspection for UI exposure.

### Implementation Contract
May add internal detector. Must not expose product scoring.

### Verification Contract
Verifier checks fixture evidence, tolerances, boundaries.

### Done Definition
Done when internal onset capability is verified.

## Feature Contract: `analysis.reference-recording-support`

### Purpose
Provide analysis support for reference-to-recording comparison inputs.

### User Value
Future comparison features can align inputs without claiming correctness prematurely.

### Scope
- Prepare waveform/time alignment inputs for reference and recording artifacts.
- Validate tolerances and missing data.

### Out Of Scope
Automatic correctness scoring, final alignment UI, cloud processing.

### User Paths
```text
Comparison service requests reference and recording inputs
  -> Analysis support returns validated time/waveform data
```

### Data / State / Architecture Boundary
Reads reference and recording artifacts through services. Creates internal analysis support outputs only.

### UI Design Requirements
No direct UI unless consumers show honest loading/error states.

### Acceptance Criteria
- [ ] Supports local reference and recording inputs.
- [ ] Validates missing/invalid artifacts.
- [ ] Does not claim automatic correctness.
- [ ] Results are behind services.

### Test Plan
Unit validation; integration artifact fixtures; specialized decode/waveform evidence; boundary inspection.

### Implementation Contract
May add support service. Must not add scoring UI.

### Verification Contract
Verifier checks real/fixture artifact evidence and no scoring exposure.

### Done Definition
Done when reference-recording support is verified.

