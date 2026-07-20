# Sync / Cloud Deferred To v2

## Purpose

This file remains as a v1 redirect so older roadmap references do not hide the scope decision.

Account, cloud storage, cross-device sync, backup/restore, and conflict handling are not v1 implementation work. They are tracked in `docs/v2`.

## v1 Boundary

v1 must preserve local-first contracts so v2 sync can layer on top later:

- Practice remains usable without login.
- Local settings, sheets, recordings, references, markers, sessions, segments, and takes stay authoritative on the current device.
- UI code does not call cloud APIs directly.
- Local cleanup remains available.
- No v1 feature should silently delete local user data in preparation for future sync.

## v2 Documents

See:

- `docs/v2/00-overview.md`
- `docs/v2/roadmap.md`
- `docs/v2/module-status.json`
