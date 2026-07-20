# Pack 9 Slice Backlog: Audio Analysis Infrastructure

## Pack Goal

Internal audio analysis boundaries support waveform and review features without exposing scoring or automatic correctness claims.

## Slice Backlog

### P9-01 `analysis-engine-interface`
- Define `AudioAnalysisEngine` interface, input/output validation, and error model.

### P9-02 `analysis-service-boundary`
- Ensure UI and review features call analysis through services only.

### P9-03 `peak-precomputation-service`
- Generate waveform peaks from real audio or controlled fixtures.

### P9-04 `peak-cache-validation`
- Store/read validated peaks and reject invalid trusted peaks.

### P9-05 `onset-detection-fixtures`
- Add controlled fixture set and tolerance definitions.

### P9-06 `onset-detection-engine`
- Implement internal onset detection behind analysis boundary.

### P9-07 `reference-recording-analysis-inputs`
- Prepare validated reference/recording waveform-time inputs.

### P9-08 `analysis-boundary-verification`
- Add boundary tests proving UI does not call analysis engines directly.

## Scheduling Notes

Pack 9 is technical and should be scheduled only when consuming waveform/review features need it, unless the user explicitly prioritizes infrastructure.

