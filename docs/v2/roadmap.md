# Metronome Practice App v2 Roadmap

## Purpose

v2 stores deferred work from v1 planning so it remains visible without inflating v1 scope.

## Candidate v2 Areas

### Account And Cloud Sync

- User login.
- Account settings.
- Supabase-backed cloud sync.
- Cross-device settings sync.
- Cross-device sheet metadata sync.
- Cross-device recording history sync.
- Cross-device practice history sync.
- Cross-device resume.
- Device sync status.
- Conflict handling.
- Backup and restore.

### Cloud Artifacts

- Recording artifact upload.
- Reference artifact upload where appropriate.
- Artifact download and restore.
- Storage quota and upload failure handling.

### Automatic Recognition

- Automatic sheet bar-line recognition.
- Assisted bar detection from sheet images or PDFs.
- Automatic score following.
- Automatic BPM detection.
- Automatic time-signature detection.
- Guitar Pro import.
- MusicXML import.

### Advanced Analysis And Feedback

- User-facing automatic mistake detection.
- User-facing automatic scoring.
- Full timing deviation analysis as feedback.
- Pitch detection feedback.
- Audio alignment experiments promoted into product behavior.

## Promotion Criteria

Move a v2 feature into an implementation contract only after:

- The v1 local-first feature it depends on is verified.
- Data ownership and migration behavior are clear.
- Failure behavior is explicit.
- E2E and specialized verification can be deterministic.
- The feature does not weaken local-first practice.
