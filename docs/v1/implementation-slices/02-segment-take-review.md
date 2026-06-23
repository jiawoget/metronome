# Pack 2 Slice Backlog: Segment Take Review

## Pack Goal

The user can review repeated takes for a sheet or segment, mark useful takes, and navigate back to practice.

## Slice Backlog

### P2-01 `take-grouping-domain`
- Group recordings by `sheetId` and optional `segmentId`.
- No UI.

### P2-02 `take-grouping-review-ui`
- Show grouped takes in Recordings/Review.
- Preserve quick and legacy recordings.

### P2-03 `best-active-take-metadata`
- Add local best/active take metadata.
- Latest remains derived from recording time.

### P2-04 `best-active-take-ui`
- Let the user mark/unmark best or active take.
- Handle deletion of marked takes.

### P2-05 `take-history-summary`
- Display take count, latest, best, duration, BPM, time signature, and marker summary.

### P2-06 `take-history-return-to-practice`
- Navigate from take history back to the correct sheet/segment practice context.

### P2-07 `waveform-comparison-source-boundary`
- Ensure comparison reads real decoded artifacts or validated peaks through services.

### P2-08 `waveform-comparison-ui`
- Compare selected takes with waveform evidence.
- No automatic scoring.

### P2-09 `recordings-tags-favorites-archive`
- Source feature: `recordings.tags-favorites-archive`
- Add local recording organization metadata and filters.

### P2-10 `recordings-recording-comparison`
- Source feature: `recordings.recording-comparison`
- Compare selected recordings using real metadata and waveform evidence where available.

### P2-11 `recordings-audio-export`
- Source feature: `recordings.audio-export`
- Export real local recording artifacts safely.

## Scheduling Notes

Do not start Pack 2 until Pack 1 is accepted unless the user reprioritizes.
