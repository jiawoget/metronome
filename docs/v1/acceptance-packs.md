# v1 Acceptance Packs

## Purpose

Acceptance Packs define the units the user will review and accept during v1 development.

They are intentionally larger than atomic implementation slices and smaller than the full v1 roadmap. A pack should feel like a coherent product capability that can be manually accepted end to end.

Implementation agents do not implement an entire pack at once. The scheduling agent breaks each pack into atomic slices, runs fresh coding/review/verification agents for each slice, then presents the completed pack for user acceptance.

## Status Model

Pack status is separate from feature status and slice status.

```text
not_started
  -> slicing_ready
  -> implementation_in_progress
  -> pack_verification_in_progress
  -> ready_for_user_acceptance
  -> accepted
```

If pack verification or user acceptance fails:

```text
ready_for_user_acceptance
  -> needs_fix
  -> implementation_in_progress
```

## Pack 0: Design / Planning Foundation

### Goal

Confirm v1 planning, contracts, implementation-slice strategy, UI direction, status tracking, and development order.

### Includes

- v1 feature inventory.
- Product feature contracts.
- Acceptance pack plan.
- Implementation slice plan.
- UI design rules.
- Module and feature status tracking.

### User Acceptance Path

```text
Review v1 docs
  -> Confirm all features have a pack
  -> Confirm each pack has a clear user acceptance path
  -> Confirm implementation will happen by small fresh-agent slices
```

### Acceptance Criteria

- [ ] Every v1 feature belongs to exactly one acceptance pack.
- [ ] Product contracts remain separate from implementation slices.
- [ ] Each pack has a clear end-to-end user acceptance path.
- [ ] No product code is implemented in this planning pack.
- [ ] New scheduling agent has enough documentation to continue.

## Pack 1: Practice Segment MVP

### Goal

The user can calibrate measures, create a segment, record that segment, and immediately record it again without losing prior takes.

### Includes

- `practice.measure-grid`
- `practice.practice-segments`
- `practice.segment-recording`
- `practice.segment-rerecording`

### User Acceptance Path

```text
Open a sheet
  -> Calibrate measure 1
  -> Create a segment for measures 5-12
  -> Select the segment
  -> Record one take
  -> Record again
  -> Confirm both recordings exist and carry segment context
```

### Acceptance Criteria

- [ ] MeasureGrid calibration persists after reload.
- [ ] Segment CRUD works and is scoped to one sheet.
- [ ] Segment selection persists or restores according to the implemented local policy.
- [ ] Recording with a selected segment saves a real artifact and segment metadata.
- [ ] Recording without a selected segment remains valid.
- [ ] Record Again creates a separate real artifact and does not overwrite the first take.
- [ ] Legacy/no-segment recordings remain visible and playable.
- [ ] Desktop, tablet-like, and narrow mobile layouts keep sheet and transport usable.

## Pack 2: Segment Take Review

### Goal

The user can review repeated takes for a sheet or segment, mark useful takes, and navigate back to practice.

### Includes

- `takes.multi-take-management`
- `takes.active-best-take`
- `takes.take-history`
- `takes.waveform-comparison`
- Related `recordings.review-grouping` behavior when needed for review entry.

### User Acceptance Path

```text
Open segment review
  -> See multiple takes grouped by sheet and segment
  -> Play takes
  -> Mark one take as best or active
  -> Review take history
  -> Return to practicing the same segment
```

### Acceptance Criteria

- [ ] Multiple takes group correctly by sheet and segment.
- [ ] Quick and legacy recordings remain visible in unified review.
- [ ] Best/active take selection is user-controlled.
- [ ] Latest take is derived from recording time.
- [ ] Take history displays real metadata.
- [ ] Waveform comparison uses real artifacts or validated peaks when included.
- [ ] No automatic scoring or correctness claims appear.

## Pack 3: Session / Continue Practice

### Goal

The app can remember meaningful local practice activity and return the user to useful recent contexts.

### Includes

- `sessions.event-timeline`
- `sessions.segment-sessions`
- `sessions.session-history-grouping`
- `sessions.goal-completion`
- `home.recent-activity-timeline`
- `home.continue-practice-recommendations`
- `practice-session.event-timeline`
- `practice-session.segment-history`
- `practice-session.duration-rules`

### User Acceptance Path

```text
Practice a segment
  -> Stop and reload
  -> Open Home
  -> See recent activity and Continue Practice target
  -> Continue back to the correct sheet and segment
  -> Open session history and see local events
```

### Acceptance Criteria

- [ ] Session events are recorded locally.
- [ ] Segment sessions remain optional; no-segment sessions remain valid.
- [ ] Continue Practice validates deleted or stale targets.
- [ ] Home recent activity uses local data only.
- [ ] Session duration is consistent across consumers.
- [ ] No cross-device resume or cloud behavior appears.

## Pack 4: Practice Controls Upgrade

### Goal

Segment practice controls support target tempo, measure-aware count-in, and reusable sheet presets.

### Includes

- `controls.segment-tempo`
- `controls.bar-aware-count-in`
- `controls.per-sheet-metronome-presets`
- `quick.advanced-countdown` if it is implemented as shared countdown infrastructure.

### User Acceptance Path

```text
Select a segment with target BPM
  -> Apply target tempo
  -> Set one-measure count-in
  -> Start practice or recording
  -> Save and reload a sheet-specific preset
```

### Acceptance Criteria

- [ ] Segment target BPM can be applied without mutating the segment unexpectedly.
- [ ] Count-in by beats and measures follows MeasureGrid timing.
- [ ] Metronome timing evidence confirms selected BPM/count-in behavior.
- [ ] Per-sheet presets persist and reload.
- [ ] Recording remains independent from metronome controls.

## Pack 5: Library / Viewer Upgrade

### Goal

Sheet organization and navigation become efficient for larger local libraries and multi-page scores.

### Includes

- `library.tags-favorites`
- `library.batch-import`
- `library.recent-practice-summary`
- `library.review-by-sheet`
- `viewer.page-thumbnails`
- `viewer.multi-page-jump`
- `viewer.advanced-zoom-pan`
- `viewer.assisted-page-turning`

### User Acceptance Path

```text
Batch import sheets
  -> Tag/favorite sheets
  -> Open a long PDF
  -> Use thumbnails, page jump, zoom, and pan
  -> Navigate from a sheet to its review
```

### Acceptance Criteria

- [ ] Batch import handles mixed success and failure.
- [ ] Sheet tags/favorites persist after reload.
- [ ] Recent practice summaries derive from local data.
- [ ] Review-by-sheet links validate targets.
- [ ] Thumbnails come from real artifacts.
- [ ] Multi-page jump, zoom, and pan work across viewports.
- [ ] Assisted page turning never claims automatic score following.

## Pack 6: Quick Metronome Training

### Goal

Quick Metronome becomes a richer local training tool while keeping fast-start practice intact.

### Includes

- `quick.auto-increase`
- `quick.mute-training`
- `quick.practice-templates`
- `quick.warmup-routines`
- `quick.tempo-progress-history`
- `quick.advanced-countdown` if not already completed in Pack 4.

### User Acceptance Path

```text
Create a quick practice template
  -> Build a warmup routine
  -> Include auto increase or mute training
  -> Run the routine
  -> Reload and reuse the saved template/routine
```

### Acceptance Criteria

- [ ] Auto Increase changes generated click timing.
- [ ] Mute Training distinguishes intentional silence from broken audio.
- [ ] Templates persist and load settings.
- [ ] Warmup routines advance steps in order.
- [ ] Tempo history derives from local practice data only.
- [ ] Quick Metronome remains fast to start.

## Pack 7: Reference / Markers

### Goal

Reference playback and manual markers support more focused segment review without automatic scoring.

### Includes

- `reference.ab-loop`
- `reference.playback-speed`
- `reference.manual-offset-alignment`
- `reference.segment-binding`
- `reference.waveform-display`
- `markers.categories-severity`
- `markers.segment-markers`
- `markers.waveform-overlay`

### User Acceptance Path

```text
Bind a reference range to a segment
  -> Adjust playback speed and AB loop
  -> Record or review a take
  -> Add categorized markers
  -> See markers on waveform views
```

### Acceptance Criteria

- [ ] Reference AB loop works for local audio.
- [ ] Playback speed affects reference playback only.
- [ ] Manual offset persists and does not claim automatic alignment.
- [ ] Segment binding persists safely.
- [ ] Reference waveform derives from real local audio.
- [ ] Marker categories/severity persist.
- [ ] Segment marker context is derived safely.
- [ ] Marker waveform overlay uses timestamps.

## Pack 8: Settings / Local Data

### Goal

The app provides reliable local settings, device selection, storage visibility, and safe data management.

### Includes

- `settings.audio-device-selection`
- `settings.theme-system`
- `settings.notification-settings`
- `settings.data-import-export`
- `settings.storage-usage-breakdown`
- `settings.selective-cleanup`

### User Acceptance Path

```text
Open Settings
  -> Select audio devices
  -> Change local theme
  -> Review storage usage
  -> Export local data
  -> Clean selected data safely
```

### Acceptance Criteria

- [ ] Audio device selection handles permission and unsupported states.
- [ ] Theme preference persists without breaking v1 visual direction.
- [ ] Notification permission is requested only by explicit user action.
- [ ] Data export/import validates integrity.
- [ ] Storage usage uses service boundaries.
- [ ] Selective cleanup prevents dangling references.

## Pack 9: Audio Analysis Infrastructure

### Goal

Internal audio analysis boundaries support waveform and review features without exposing scoring or automatic correctness claims.

### Includes

- `analysis.engine-boundary`
- `analysis.peak-precomputation`
- `analysis.onset-detection-infrastructure`
- `analysis.reference-recording-support`

### User Acceptance Path

This pack is primarily technical acceptance:

```text
Run controlled audio fixtures
  -> Verify analysis engine boundary
  -> Generate and validate waveform peaks
  -> Run onset detection fixtures
  -> Validate reference-recording support data
```

### Acceptance Criteria

- [ ] UI never calls analysis engines directly.
- [ ] Peaks derive from real audio or controlled fixtures.
- [ ] Invalid trusted peaks are rejected.
- [ ] Onset detection is internal and fixture-tested.
- [ ] Reference-recording support does not claim automatic correctness.
- [ ] No user-facing scoring is shipped.

