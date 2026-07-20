# Sheet Library v1 Roadmap

## Purpose

This module extends the v0 sheet list and import flow into a more useful library for larger practice collections.

## Builds On

- v0 supports PDF and image import.
- v0 imported sheets have real persisted file artifacts.
- v0 supports fixed categories: song, exercise, and scale.
- v0 supports search, category filtering, delete, and direct open into Sheet Practice.
- v0 does not require folders, tags, or cloud sync.

## Candidate v1 Features

- Folder system.
- Tags.
- Favorites.
- Batch import.
- Richer sheet detail pages.
- Recent practice summary per sheet.
- Review grouped by sheet.

Guitar Pro import, MusicXML import, automatic BPM detection, automatic time-signature detection, assisted bar detection, cloud-synced library, and sheet sharing are deferred to v2.

## Product Value

- Help users manage larger sheet collections.
- Make it easier to organize material by practice purpose.
- Reduce navigation friction for larger local collections.

## Required v0 Boundaries to Preserve

- Clicking a sheet should continue to open Sheet Practice directly.
- File artifact persistence must remain reliable.
- v0 fixed category behavior should migrate cleanly into richer organization.
- UI should not directly depend on storage, PDF, or image internals.

## Possible Architecture Changes

- Folder and tag domain models.
- Batch import queue.
- Sheet metadata enrichment service.
- Sheet detail route.

## Testing Implications

- Batch import requires mixed success and failure tests.
- Folder and tag tests need migration from fixed categories.
- E2E tests must still use real browser interaction.

## Risks

- Folder and tag systems can create unnecessary management burden.
- Batch import can create confusing partial success states if not explained clearly.

## Promotion Criteria

Promote v1 Sheet Library features only after:

- v0 Sheet Library is verified with real PDF and image artifacts.
- Sheet Practice can open persisted sheets reliably.
- Local data cleanup behavior exists.
- The selected v1 feature has fixtures and E2E coverage planned.
