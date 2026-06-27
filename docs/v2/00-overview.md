# v2 Overview

## Purpose

v2 collects work that should not be forgotten but should not shape v1 implementation too early.

v1 focuses on a stronger local-first practice system. v2 can add cross-device, cloud, automatic recognition, and higher-confidence analysis features after v1 data contracts are stable.

## Direction

v2 may include:

- Account and identity.
- Supabase-backed cloud sync.
- Cross-device resume.
- Backup and restore.
- Conflict handling.
- Cloud artifact upload and download.
- Automatic score following.
- Automatic sheet bar-line recognition.
- User-facing automatic scoring.
- Guitar Pro and MusicXML import.
- Automatic BPM and time-signature detection.

## Relationship To v1

v2 should build on v1 local data contracts instead of replacing them.

Important v1 decisions to preserve:

- Local-first practice remains usable without login.
- Practice Segment is first defined by MeasureGrid and manual calibration.
- Review and multi-take workflows use real local recording artifacts.
- Analysis remains behind service boundaries.
- UI does not directly call cloud, storage, audio, or analysis internals.
