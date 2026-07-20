# Pack 7 Slice Backlog: Reference / Markers

## Pack Goal

Reference playback and manual markers support more focused segment review without automatic scoring.

## Slice Backlog

### P7-01 `reference-ab-loop-domain`
- Store and validate A/B loop ranges.

### P7-02 `reference-ab-loop-playback`
- Loop local reference audio through playback service.

### P7-03 `reference-playback-speed`
- Control safe local reference playback rates.

### P7-04 `reference-manual-offset`
- Store/reset manual reference offset.

### P7-05 `reference-segment-binding`
- Bind one active reference range to a segment.

### P7-06 `reference-waveform-service`
- Generate/read waveform data from real local reference audio.

### P7-07 `reference-waveform-ui`
- Display reference waveform and seek through playback service.

### P7-08 `marker-category-severity-domain`
- Add category/severity validation for manual markers.

### P7-09 `marker-category-severity-ui`
- Edit/filter marker category and severity.

### P7-10 `marker-segment-context`
- Derive marker segment context from recording/review state.

### P7-11 `marker-waveform-overlay`
- Overlay manual marker timestamps on waveform views.

## Scheduling Notes

Reference waveform and overlay slices need real audio/waveform evidence.

