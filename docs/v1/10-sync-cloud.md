# Sync / Cloud v1 Roadmap

## Purpose

This v1-only module collects account, cloud storage, and cross-device sync work.

v0 must remain local-first and usable without login.

## Builds On

- v0 local data persistence is stable.
- v0 Settings can clear all local data.
- v0 sheets, recordings, references, markers, and sessions have clear local data contracts.
- v0 practice loop works without cloud services.

## Candidate v1 Features

- User login.
- Supabase-backed cloud sync.
- Cross-device settings sync.
- Cross-device sheet metadata sync.
- Recording artifact upload.
- Reference artifact upload where appropriate.
- Practice history sync.
- Device sync status.
- Conflict handling.
- Backup and restore.

## Product Value

- Let users continue practice across devices.
- Protect practice history and recordings from local browser storage loss.
- Enable richer long-term practice history.

## Required v0 Boundaries to Preserve

- Local-first practice loop remains available without login.
- Sync is a layer over local data, not a replacement for it.
- UI should not directly call cloud APIs.
- Local cleanup remains available.
- Cloud sync must not silently delete local user data.

## Possible Architecture Changes

- Auth service.
- Sync service.
- Cloud repository adapters.
- Artifact upload/download service.
- Conflict resolution model.
- Sync status model.
- Migration model from local-only to local-plus-cloud.

## Testing Implications

- Sync tests need offline and online scenarios.
- Conflict tests need same record changed on two devices.
- Upload tests need artifact integrity verification.
- Restore tests need local empty state plus remote data.
- Logout tests need clear data ownership behavior.
- E2E tests must still use real browser interaction.

## Risks

- Sync can break local-first guarantees if introduced too early.
- Large audio artifacts can create storage and bandwidth issues.
- Conflict resolution can create duplicate sessions or recordings.
- Auth flows can distract from core practice experience.

## Promotion Criteria

Promote v1 sync/cloud only after:

- v0 local data contracts are verified.
- v0 cleanup behavior is verified.
- Recording and sheet artifact persistence are stable.
- A concrete sync conflict policy is agreed.
- The selected sync feature has deterministic integration and E2E tests.
