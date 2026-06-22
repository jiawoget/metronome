# Metronome Practice App v1 Roadmap

## Purpose

v1 evolves the app from a local-first practice tool into a more complete practice system.

This document is intentionally separate from the v0 plan. Future ideas should live here until they are deliberately promoted into a concrete version plan.

## Product Direction

v1 should deepen the local-first practice workflow after the v0 loop is stable:

```text
Practice material
  -> Structured practice segment
  -> Reference alignment
  -> Multiple takes
  -> Review and comparison
  -> Local long-term history
```

## Candidate v1 Areas

v1 may include:

- More complete Practice Segment management.
- Segment-level history.
- Start recording from a selected bar.
- Countdown before segment recording.
- Active take selection by bar range.
- Better waveform comparison between reference audio and user recording.
- Manual offset alignment improvements.
- More detailed practice statistics.
- Richer Bilibili reference metadata.
- Better review workflow for repeated takes.

Cloud sync, login, cross-device resume, cloud storage, backup/restore, and conflict handling are tracked in `docs/v2`.

## Sheet Practice Expansion

After the v0 `Sheet Practice` workbench is stable, v1 can make it more structured and more practice-aware.

Candidate improvements include:

- Automatic or assisted page turning.
- Current-bar tracking.
- Bar-aware error markers.
- Segment-aware practice setup.
- More precise re-recording from a selected bar.
- Countdown before recording from a segment.
- Multiple takes attached to the same sheet or segment.
- Active take selection by bar range.
- Better reference-to-recording comparison.
- Optional beat sync between reference audio and user recording.

These features should build on the v0 timestamp-based model instead of requiring automatic score understanding from the beginning.

## Quick Metronome Expansion

After the v0 quick practice loop is stable, v1 can make the metronome more adaptive and training-oriented.

Candidate improvements include:

- Auto Increase.
- Mute Training.
- Complex rhythm patterns.
- Custom metronome sounds.
- Preset practice templates.
- Practice plans.
- More detailed tempo progress tracking.
- Reusable warmup routines.
- More advanced countdown and count-in options.

These features should build on the same metronome and recording foundations used by `Sheet Practice`, rather than becoming a separate practice mode with separate behavior.

## Recordings / Review Expansion

After the v0 unified recording list is stable, v1 can turn review into a deeper practice feedback workflow.

Candidate improvements include:

- Recording comparison.
- Multi-take management.
- Bar-level navigation.
- Analysis-backed waveform support.
- Tags.
- Favorites.
- Archive.
- Audio export.
- More detailed recording metadata.
- Comparison between user recording and local reference audio.
- Review views grouped by sheet, segment, or practice date.

These features should preserve the v0 decision that quick recordings and sheet recordings live in one unified review system.

## Sheet Library Expansion

After the v0 sheet list and import flow are stable, v1 can make the sheet library more useful for larger collections.

Candidate improvements include:

- Folder system.
- Tags.
- Favorites.
- Batch import.
- Sheet sharing.
- Richer sheet detail pages.
- Recent practice summary per sheet.
- Review grouped by sheet.

These features should build on the v0 decision that a sheet can be opened directly into `Sheet Practice`.

Guitar Pro import, MusicXML import, automatic BPM detection, automatic time-signature detection, and assisted bar detection are deferred to v2.

## Reference System Expansion

After v0 supports basic reference playback, v1 can make references more useful for focused practice and review.

Candidate improvements include:

- A-B loop.
- Playback speed control.
- Manual offset alignment.
- Reference-to-recording waveform comparison.
- Precise start and end segment binding.
- Reference source attached to a Practice Segment.
- Optional beat sync between reference audio and user recording.
- Local audio waveform display.
- Bilibili start and end time saving.
- Richer Bilibili metadata.
- Reference audio analysis experiments.

Bilibili should remain a lightweight watching and follow-along reference unless a later version explicitly chooses to support extraction or deeper media processing.

## Home / App Shell Expansion

After the v0 practice dashboard and navigation are stable, v1 can make the app feel more like a long-term local practice companion.

Candidate improvements include:

- More detailed dashboard analytics.
- Practice streaks.
- Goal management.
- Practice plan entry.
- Global command palette.
- Advanced notifications.
- Recent activity timeline.
- More detailed continue-practice recommendations.

Cross-device resume is deferred to v2.

These features should keep `Home` focused on practice entry and review, not marketing content.

## Settings / Data Expansion

After the v0 local-first data model is stable, v1 can add more advanced local data controls.

Candidate improvements include:

- Advanced audio device selection.
- Theme system.
- Notification settings.
- Data import/export.
- Detailed privacy settings page.
- Storage usage breakdown.
- Selective cleanup by data type.

Account and cloud sync work is deferred to v2, where it should be added as a layer over the local-first model rather than replacing the local practice loop.

## Practice Session Expansion

After the v0 session model supports basic history and continue-practice behavior, v1 can make sessions more structured and analytics-ready.

Candidate improvements include:

- Precise event timeline.
- Play and pause event tracking.
- Practice goal completion tracking.
- Practice Segment-level sessions.
- Multi-take comp sessions.
- Automatic analysis result attachments.
- Session history grouped by sheet or segment.
- Session comparison over time.
- More detailed practice duration rules.

Cross-device session merging is deferred to v2.

These features should extend the v0 session concept instead of replacing it with recording-only history.

## Audio Analysis Direction

v1 can start introducing bounded analysis infrastructure where it directly improves practice:

- Peak precomputation for faster waveform rendering.
- Onset detection infrastructure.
- Reference-to-recording comparison support.
- Analysis result boundaries for future review features.

These features should remain behind an `AudioAnalysisEngine` boundary so the app can start with TypeScript implementations and later replace expensive parts with Rust/WASM or C++/WASM.

User-facing timing deviation feedback, BPM detection, pitch detection, automatic scoring, and productized audio alignment are deferred to v2.

## Future WASM Expansion Boundary

The preferred future performance path for later analysis-heavy work is:

```text
Rust + wasm-bindgen
```

This is suitable for:

- Peak calculation.
- Onset detection.
- Timing analysis.
- Pitch detection.
- Audio alignment.

C++ / Emscripten should only be considered when reusing mature C or C++ audio libraries.

## Not Automatically Included

These ideas should not be assumed for v1 unless explicitly selected later:

- Full automatic mistake detection.
- Full automatic score following.
- Automatic sheet bar-line recognition.
- Guitar Pro parsing.
- MusicXML parsing.
- Automatic BPM detection.
- Automatic time-signature detection.
- Bilibili or YouTube downloading.
- Automatic extraction of video audio.
- Full multitrack DAW editing.
- Final mixed audio export.

They may become future roadmap items, but they should not shape the v0 implementation too early.
