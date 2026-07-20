# Metronome Practice App v0 Plan

## Purpose

v0 is a local-first guitar practice app. It should help a player quickly start a metronome practice, open a sheet, record a take, replay the result, and keep basic practice history.

The first version should stay focused on the core practice loop instead of becoming a full music production or analysis tool.

## Product Shape

The top-level app structure is:

```text
Home
Quick Metronome
Sheet Library
Sheet Practice
Recordings
Settings
```

`Quick Metronome` is the fastest entry point for immediate practice.

`Sheet Practice` is the core workspace of the app. The overall architecture should be designed around this workspace, because it combines sheet viewing, metronome control, reference playback, recording, replay, and practice review.

## Core Practice Flow

```text
Choose practice material
  -> Enter practice workspace
  -> Set tempo, meter, reference source, or segment
  -> Play, follow, or record
  -> Replay, mark issues, or retry
  -> Save basic practice history
```

## Sheet Practice Path

`Sheet Practice` is the primary v0 workspace. It should behave like a reliable practice workbench rather than an intelligent coach.

The v0 user path is:

```text
Choose a sheet from Home or Sheet Library
  -> Enter Sheet Practice
  -> View the sheet in the main workspace
  -> Set BPM and time signature
  -> Optionally add a reference source
  -> Play the metronome or reference source
  -> Start recording
  -> Stop recording
  -> Replay the recording
  -> Manually mark problem points
  -> Save basic practice history
```

The user should be able to:

- View PDF or image sheets.
- Start, pause, and stop practice playback.
- Set BPM.
- Set time signature.
- Toggle the metronome.
- Add a local audio reference.
- Add a lightweight Bilibili reference.
- Start and stop recording.
- Replay the latest recording.
- See a basic waveform.
- Add manual error markers.

v0 should use these product decisions:

- The sheet is always the visual priority in `Sheet Practice`.
- Basic transport and recording controls should stay available at the bottom.
- Detailed metronome settings can live in a side panel.
- Reference sources should live in a side panel for v0.
- Recording replay details, waveform, and recording history can live in a side panel or lower drawer.
- Error markers should be bound to recording timestamps in v0, not to automatically detected bars.

v0 should not include these `Sheet Practice` features yet:

- Automatic page turning.
- Automatic current-bar detection.
- Automatic audio alignment.
- Automatic mistake detection.
- Multi-take audio comping.
- Precise re-recording from any arbitrary bar.
- Automatic beat sync between reference audio and user recording.

## Quick Metronome Path

`Quick Metronome` is the fastest v0 entry point. It should let a player practice immediately without choosing a sheet, creating a project, or setting up a structured session.

The v0 user path is:

```text
Open Quick Metronome
  -> See a large BPM value and primary play control
  -> Set BPM, time signature, subdivision, accent, or countdown
  -> Start the metronome
  -> Optionally start recording
  -> Stop recording
  -> Replay the recording
  -> Save as a Quick Practice Recording
  -> Find it later in Recordings
```

v0 should include:

- BPM adjustment.
- Play and stop.
- Time signature.
- Subdivision.
- Accent setting.
- Countdown.
- Tap Tempo.
- Recording.
- Replay after recording.
- Recent recordings entry.

v0 should use these product decisions:

- Quick metronome recordings do not need to be linked to a sheet.
- Quick metronome recordings should appear in the same `Recordings` list as sheet practice recordings.
- Recording type should distinguish `quick` and `sheet` recordings.
- `Quick Metronome` and `Sheet Practice` should reuse the same metronome, recording, playback, and practice history foundations.

v0 should not include these `Quick Metronome` features yet:

- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom metronome sounds.
- Preset practice templates.
- Practice plans.

## Recordings / Review Path

`Recordings` is the unified v0 place for finding, replaying, and reviewing practice recordings. It should be a simple review list, not a full audio manager.

The v0 user path is:

```text
Open Recordings
  -> See all practice recordings
  -> Filter by recording type or practice material
  -> Search recordings
  -> Open a recording
  -> Play or pause the recording
  -> View basic recording details
  -> View manual error markers
  -> Continue practice from the recording context
```

v0 should include:

- Unified recordings list.
- Play and pause.
- Basic waveform or simplified waveform.
- Search.
- Type filtering.
- Recording details.
- Error marker list.
- Delete recording.
- Continue practice from a recording.

Recording details should include:

- Recording name.
- Date.
- Duration.
- BPM.
- Time signature.
- Recording type: `quick` or `sheet`.
- Linked sheet name when available.

v0 should use these product decisions:

- `Recordings` should be one unified list, not separate pages for quick and sheet recordings.
- Quick recordings and sheet recordings should be separated by filters and metadata.
- Recording details should not support complex editing in v0.
- Error markers should display with timestamps and optional notes.
- Continuing from a linked sheet recording should return to `Sheet Practice`.
- Continuing from an unlinked quick recording should return to `Quick Metronome`.

v0 should not include these `Recordings` features yet:

- Recording comparison.
- Multi-take management.
- Bar-level navigation.
- Automatic scoring.
- Automatic timing analysis.
- Cloud backup.
- Tagging system.
- Favorites or archive.
- Audio export.

## Sheet Library Path

`Sheet Library` is the v0 entry point for managing practice materials. It should be a simple sheet list and import surface, not a full document management system.

The v0 user path is:

```text
Open Sheet Library
  -> See all sheets
  -> Import a PDF or image sheet
  -> Enter basic sheet metadata
  -> Search sheets
  -> Filter by fixed category
  -> Open a sheet
  -> Enter Sheet Practice
```

v0 should include:

- Sheet list.
- PDF import.
- Image import.
- Search.
- Fixed categories.
- Basic sheet metadata.
- Open in `Sheet Practice`.
- Delete sheet.

Sheet metadata should include:

- Sheet name.
- Category: `song`, `exercise`, or `scale`.
- Page count.
- BPM.
- Time signature.
- Last practiced date.

v0 should use these product decisions:

- Categories should be fixed to Songs, Exercises, and Scales.
- v0 should not include folders.
- The design may reserve room for folders later, but folder behavior should not shape v0.
- Users should manually enter sheet name, category, BPM, and time signature during import.
- v0 should not automatically detect BPM, time signature, or bars.
- A sheet can be a PDF or an ordered set of images.
- Clicking a sheet should open `Sheet Practice` directly.
- A separate sheet detail page is not required for v0.

v0 should not include these `Sheet Library` features yet:

- Complex folder system.
- Tags.
- Favorites.
- Batch import.
- Guitar Pro import.
- MusicXML import.
- Automatic BPM detection.
- Automatic time signature detection.
- Automatic bar detection.
- Cloud-synced sheet library.
- Sheet sharing.

## Reference System Path

`Reference System` in v0 should stay minimal. It exists to let the player play or pause a reference while practicing, not to provide precise synchronization or analysis.

The v0 user path is:

```text
Open Sheet Practice
  -> Add a local audio reference or Bilibili reference
  -> See the reference in the side panel
  -> Play or pause the reference
  -> Adjust basic reference volume when available
  -> Continue practicing with the sheet and metronome
```

v0 should include:

- Add a local audio reference.
- Add a Bilibili reference link.
- Display the active reference in the side panel.
- Play and pause the reference.
- Basic volume control when available.
- Save the reference association with the sheet.

v0 should use these product decisions:

- Local audio is the more important reference source for v0.
- Bilibili is a lightweight watching and follow-along reference.
- Reference controls should remain secondary to the sheet and practice controls.
- Reference sources should not require precise sync in v0.
- Reference sources should not be used as automatic analysis input in v0.

v0 should not include these `Reference System` features yet:

- A-B loop.
- Playback speed control.
- Manual offset alignment.
- Reference-to-recording waveform comparison.
- Precise start and end segment binding.
- Automatic reference synchronization.
- Bilibili download.
- Bilibili audio extraction.
- Reference audio analysis.

## Home / App Shell Path

`Home` is the v0 practice dashboard. It should not behave like a marketing landing page. It should help the player start, resume, or review practice quickly.

The v0 user path is:

```text
Open the app
  -> See today's practice summary
  -> Start Quick Metronome
  -> Continue recent practice
  -> Open a recent sheet
  -> Replay a recent recording
  -> Import a sheet when needed
```

v0 `Home` should include:

- Quick Metronome entry.
- Continue Practice entry.
- Recent Sheets.
- Recent Recordings.
- Today Practice Summary.
- Import Sheet entry.

v0 `App Shell` should include:

- Sidebar navigation for desktop and iPad landscape.
- Bottom navigation for iPhone portrait and narrow screens.
- Main content area.
- Current page highlight.
- Basic responsive layout.
- Settings entry.
- Lightweight global recording or playback status indicator.

v0 should use these product decisions:

- `Home` is a practice dashboard, not a landing page.
- `Quick Metronome` and `Continue Practice` are the two most important Home entries.
- Today summary should stay simple in v0.
- Today summary can include practice time, practice session count, and recording count.
- The app should make active recording or playback state visible across navigation.

v0 should not include these `Home / App Shell` features yet:

- Complex dashboard analytics.
- Practice streaks.
- Goal management.
- Practice plan entry.
- Global command palette.
- Multi-window or multi-workspace behavior.
- Advanced notifications.

## Settings Path

`Settings` in v0 should stay light. It should focus on default practice behavior, audio basics, recording permission visibility, and local data management.

The v0 user path is:

```text
Open Settings
  -> View or change default practice settings
  -> View audio and recording settings
  -> Read local data storage information
  -> Clear local data when needed
```

v0 should include:

- Default BPM.
- Default time signature.
- Default subdivision.
- Metronome volume.
- Reference audio default volume.
- Recording input permission status.
- Local data storage explanation.
- Clear local data entry.

v0 should use these product decisions:

- v0 should not include account settings.
- v0 should not include cloud sync settings.
- Imported files should be copied into local app storage when possible.
- Settings must include a local data cleanup entry.
- v0 should only include basic volume and default metronome settings.
- Advanced audio input device selection is not required for v0.
- Microphone permission can be handled by the browser, while the app shows status and guidance.

v0 should not include these `Settings` features yet:

- Account settings.
- Cloud sync settings.
- Device sync status.
- Advanced audio device selection.
- Theme system.
- Notification settings.
- Data import/export.
- Detailed privacy settings page.

## Local Data Boundary

v0 is local-first. It should save enough data for the practice loop to work reliably without requiring login or cloud sync.

v0 should save:

```text
User Settings
- Default BPM
- Default time signature
- Default subdivision
- Volume preferences

Sheets
- Sheet metadata
- PDF or image file copy when possible
- Category
- Page count
- Default BPM
- Default time signature
- Last practiced date

Recordings
- Recording metadata
- Recording file
- Recording type: quick or sheet
- BPM
- Time signature
- Duration
- Created date
- Optional linked sheetId

Error Markers
- Recording timestamp
- Optional note
- Linked recordingId

References
- Local audio copy when possible
- Bilibili link
- Linked sheetId

Practice History
- Today practice time
- Practice session count
- Recording count
- Recent practice context
```

v0 should use these local data decisions:

- Imported sheets and local audio references should be copied into app-local browser storage when possible.
- Local copies make the app less dependent on original file paths and browser file permissions.
- Browser storage limits should be expected.
- The app should provide a clear local data cleanup path.
- Supabase and cloud sync should remain a future boundary, not a v0 requirement.

## Practice Session Concept

`Practice Session` is the v0 concept for one continuous practice context. It should allow the app to track practice even when the player does not record audio.

A v0 practice session can come from:

- Quick Metronome.
- Sheet Practice.

The v0 user path is:

```text
Enter Quick Metronome or Sheet Practice
  -> Start metronome playback, reference playback, or recording
  -> Create or resume the current Practice Session
  -> Practice for a period of time
  -> Attach recordings to the session when they exist
  -> Attach error markers to recordings when they exist
  -> Update Practice History when the session ends or becomes inactive
```

v0 `Practice Session` should record:

```text
sessionId
sourceType: quick or sheet
optional sheetId
startedAt
optional endedAt
duration
BPM
time signature
recording count
latest recordingId
```

v0 should use these product decisions:

- v0 should have a `Practice Session` concept.
- A session can exist without any recording.
- A session can be linked to a sheet or remain unlinked.
- Quick Metronome sessions do not have a sheetId.
- Sheet Practice sessions have a sheetId.
- Every recording should be linked to a session.
- Error markers should link to recordings, not directly to sessions.
- `Continue Practice` should use the most recent session.
- If the most recent session has a sheetId, continue into `Sheet Practice`.
- If the most recent session has no sheetId, continue into `Quick Metronome`.

v0 should not include these `Practice Session` features yet:

- Precise event timeline.
- Every play and pause event.
- Practice goal completion tracking.
- Practice Segment-level sessions.
- Multi-take comp sessions.
- Automatic analysis result attachments.
- Cross-device session merging.

## v0 Development Phases

v0 should be built in phases so the core practice loop becomes usable before the broader sheet and reference features are added.

The agreed phase order is:

```text
Phase 0: Foundation
Phase 1: Quick Metronome Loop
Phase 2: Recordings / Review
Phase 3: Sheet Library
Phase 4: Sheet Practice Workspace
Phase 5: Minimal Reference System
```

### Phase 0: Foundation

Goal: establish the app foundation and architecture boundaries.

Scope:

- App Shell.
- Basic routing.
- Basic responsive layout.
- Basic UI system.
- Local data boundary.
- Core domain types.
- Service and adapter boundaries.

### Phase 1: Quick Metronome Loop

Goal: build the fastest usable practice loop first.

Scope:

- Quick Metronome page.
- BPM.
- Time signature.
- Subdivision.
- Accent.
- Countdown.
- Play and stop.
- Tap Tempo.
- Recording.
- Replay after recording.
- Practice Session creation.
- Recording creation.

### Phase 2: Recordings / Review

Goal: make recordings findable, replayable, removable, and useful for continuing practice.

Scope:

- Recordings list.
- Search and filtering.
- Recording details.
- Play and pause.
- Basic waveform.
- Error marker list.
- Delete recording.
- Continue Practice.

### Phase 3: Sheet Library

Goal: allow users to import and manage practice materials.

Scope:

- Import PDF.
- Import image sheets.
- Enter sheet metadata.
- Sheet list.
- Search.
- Fixed category filtering.
- Delete sheet.
- Open Sheet Practice.

### Phase 4: Sheet Practice Workspace

Goal: combine sheet viewing, metronome, recording, replay, and manual review into the main practice workspace.

Scope:

- Sheet Viewer.
- Bottom practice controls.
- Side metronome settings.
- Recording and replay.
- Basic waveform.
- Error markers.
- Practice Session linked to sheet.

### Phase 5: Minimal Reference System

Goal: add lightweight reference playback after the core practice workspace is stable.

Scope:

- Add local audio reference.
- Add Bilibili reference link.
- Show active reference in the side panel.
- Play and pause reference.
- Basic volume control.
- Save reference association with sheet.

v0 should use these phase decisions:

- Use the six-phase plan above.
- Build Quick Metronome and Recording before Sheet Library and Sheet Practice.
- Add the minimal Reference System at the end of v0.
- Do not let reference playback delay the core metronome, recording, review, and sheet practice loop.

## Top-Level Systems

```text
MetronomeApp
├── App Shell
│   ├── Navigation
│   ├── Responsive Layout
│   └── Global Commands
│
├── Practice Core
│   ├── Metronome
│   ├── Practice Session
│   ├── Recording
│   ├── Playback
│   └── Error Marking
│
├── Sheet System
│   ├── Sheet Library
│   ├── PDF/Image Viewer
│   └── Sheet Metadata
│
├── Reference System
│   ├── Local Audio Reference
│   ├── Bilibili Reference
│   └── Segment Binding
│
├── Review System
│   ├── Recording List
│   ├── Take Playback
│   ├── Waveform
│   └── Practice History
│
└── Data System
    ├── Local Storage
    ├── User Settings
    └── Future Cloud Sync Boundary
```

## v0 Boundary

v0 should prioritize:

- Local-first usage.
- Web desktop, iPad landscape, and iPhone portrait layouts.
- Quick metronome practice.
- Basic sheet library.
- PDF and image sheet display.
- Sheet practice workspace.
- Local audio reference playback.
- Lightweight Bilibili reference embedding.
- Recording and replay.
- Basic waveform display.
- Manual error marking.
- Basic practice history.

v0 should avoid:

- Required login.
- Required cloud sync.
- Automatic audio analysis.
- Automatic mistake detection.
- Automatic sheet structure recognition.
- Guitar Pro or MusicXML parsing.
- Bilibili or YouTube downloading.
- Full DAW-style editing.
- Final mixed audio export.

## Architecture Direction

v0 should use a TypeScript-first web app architecture.

The UI should not directly depend on audio libraries, waveform libraries, storage libraries, or future WASM modules. Those details should sit behind service interfaces and adapters.

At the highest level:

```text
UI Layer
Pages, components, and interaction state

Application / Service Layer
Metronome service, recording service, practice session service, sheet service

Domain Layer
PracticeSession, RecordingTake, PracticeSegment, BeatGrid, Sheet

Infrastructure Layer
Tone.js, MediaRecorder, wavesurfer, IndexedDB, PDF rendering, Bilibili embed
```

## Initial Technical Direction

The preferred v0 stack is:

```text
Next.js
React
TypeScript strict mode
Tailwind CSS
shadcn/ui
Zustand
IndexedDB / Dexie
Tone.js
MediaRecorder API
wavesurfer.js
PDF.js / react-pdf
```

Supabase can be reserved as a future sync boundary, but it should not be required for the first usable version.
