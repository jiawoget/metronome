# Pack 4 Slice Backlog: Practice Controls Upgrade

## Pack Goal

Segment practice controls support target tempo, measure-aware count-in, and reusable sheet presets.

## Slice Backlog

### P4-01 `segment-tempo-apply-policy`
- Define how selected segment target BPM applies to current practice BPM.

### P4-02 `segment-tempo-ui`
- Add compact apply/override controls in Sheet Practice.

### P4-03 `bar-count-in-domain`
- Calculate beat/measure count-in timing from MeasureGrid and selected segment.

### P4-04 `bar-count-in-scheduler`
- Wire count-in to metronome scheduler/service boundary.

### P4-05 `bar-count-in-ui`
- Add count-in controls and visible countdown state.

### P4-06 `per-sheet-presets-domain-repository`
- Store sheet-specific metronome presets locally.

### P4-07 `per-sheet-presets-ui`
- Save/load/rename/delete presets from Sheet Practice.

### P4-08 `advanced-countdown-shared-infrastructure`
- Implement shared advanced countdown only if not already covered by Pack 6.

## Scheduling Notes

Timing slices use higher-risk model tiers and need scheduler evidence.

