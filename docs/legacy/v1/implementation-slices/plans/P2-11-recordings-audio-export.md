# P2-11 Recordings Audio Export Plan

## Slice

- Slice id: P2-11 `recordings-audio-export`
- Pack: Pack 2 Segment Take Review
- Product contract: `recordings.audio-export` in `docs/v1/03-recordings-review.md`
- Related contracts: `takes.multi-take-management`, `takes.waveform-comparison`, `recordings.tags-favorites-archive`, `recordings.recording-comparison`, and sheet recording export expectations in `docs/v1/05c-sheet-recording-review.md`
- Depends on:
  - P2-01 through P2-08 grouping, best/active, take summary, return-to-practice, and waveform evidence behavior
  - P2-09 `recordings-tags-favorites-archive`
  - P2-10 `recordings-recording-comparison`
- Planning model requirement: GPT-5.5, medium effort, standard speed
- Coding tier: Tier D recommended because this slice touches real local audio artifacts and browser download behavior
- Status: ready for a fresh coding agent after this planning artifact; no product code is changed by this plan

## Goal

Let users export a real local audio artifact for one visible recording from the unified Recordings Review surface. Export must preserve the recording bytes/data URL already stored locally, use browser-safe download semantics, and stay inside repository/service/browser adapter boundaries. It must not encode, analyze, transform, upload, sync, or batch-process recordings.

## Product Contract Covered

This slice covers `recordings.audio-export`:

- A user can download an existing local quick or sheet recording artifact from Recordings Review.
- The exported file represents the actual stored recording artifact, not a regenerated or analyzed version.
- Export respects current Pack 2 visibility rules, including archive filters and the unified quick/sheet review model.
- The app remains local-first: no backend, cloud, sharing service, or account behavior.

## Refined Scope

- Add a single-recording export affordance in the selected recording details panel.
- Optional row-level export is allowed only if it reuses the same service boundary and does not crowd existing favorite/compare/playback/delete controls; details-only is preferred for first implementation.
- Export is available only for recordings that are currently visible in the Recordings Review list after type/search/tag/favorite/archive filters.
- Archived recordings can be exported only when visible through `Archived recordings` or `All including archived`.
- Quick recordings and sheet recordings are both eligible when they have a supported local audio artifact.
- Unsupported or missing artifacts show an honest disabled/error state and do not create a download.
- Use the recording's existing `audioDataUrl`, `mimeType`, size metadata, and factual recording metadata for validation and filename generation.
- Add a small UI-agnostic export service plus a browser download adapter if no suitable boundary already exists.
- Add unit/component/E2E coverage for download eligibility, filename rules, archived visibility, quick/sheet behavior, unsupported artifacts, and no direct UI access to storage/audio internals.

## Explicit Out Of Scope

- No batch export, multi-select export, export-all-visible, export-all-recordings, zip creation, or export queues.
- No exporting hidden archived recordings from the default active view.
- No data backup/restore export; this is audio artifact download only, not app data export.
- No cloud upload, share sheet integration, backend route, server action, account sync, or remote storage.
- No audio re-encoding, transcoding, compression, normalization, trimming, concatenation, stitching, metadata tag writing, waveform image export, or file conversion.
- No new audio analysis, onset detection, scoring, recommendations, alignment, beat matching, AI feedback, or comparison expansion.
- No new waveform/onset/alignment UI beyond what P2-07/P2-08/P2-10 already provide.
- No changes to recording capture, MediaRecorder, Tone.js, metronome scheduling, playback lifecycle, wavesurfer adapter, Dexie/localStorage internals, or Pack 9 analysis infrastructure.
- No destructive cleanup. Export must not delete, archive, unarchive, favorite, tag, or mutate best/active selections.

## Product Decisions

- Export granularity: single recording only.
- Batch behavior: explicitly not supported in P2-11.
- Visible-only rule: only recordings visible under the current filters can expose export controls.
- Archived rule: archived recordings are exportable only when the user has made them visible through the archive filter.
- Selection source: the details panel selected recording is the primary export target. P2-10 review-wide comparison selection is not an export queue and must not drive export.
- Filename rule: generate a safe deterministic filename from factual metadata:
  - prefix: `metronome`
  - type: `quick` or `sheet`
  - sheet/segment label when present
  - local created date/time in compact sortable form
  - recording id suffix for uniqueness
  - extension derived from MIME type, with a conservative fallback of `.webm`
- Filename sanitization:
  - trim labels
  - lowercase or preserve readable casing according to existing project style
  - replace whitespace with hyphens
  - remove path separators, control characters, reserved Windows filename characters, and repeated separators
  - cap the base filename length before appending extension
- MIME/extension mapping:
  - `audio/webm` and `audio/webm;codecs=opus` -> `.webm`
  - `audio/ogg` and `audio/ogg;codecs=opus` -> `.ogg`
  - `audio/mp4` or `audio/mpeg` if ever present -> `.mp4` or `.mp3`
  - unknown but `audio/*` MIME -> fallback `.webm` and keep the original MIME for Blob type when possible
  - non-audio MIME -> unsupported
- Browser download semantics:
  - Decode the data URL only enough to create a `Blob` or object URL for download; do not decode audio samples.
  - Create an `<a download>` click through a browser adapter.
  - Revoke object URLs after triggering download.
  - Return structured success/failure results for UI status.
  - Do not navigate away from `/recordings`.

## Functional Behavior

- The details panel includes an `Export Audio` button near the recording artifact actions, separate from `Practice Again` and `Delete Recording`.
- The button uses a download icon from `lucide-react` if available.
- When the selected visible recording has a supported artifact:
  - clicking `Export Audio` validates the recording through the export service
  - the browser download adapter triggers one file download
  - the UI shows a concise status such as `Audio export started.`
- When the selected recording has no artifact:
  - the control is disabled or clicking returns a clear error: `This recording has no local audio artifact to export.`
- When the MIME type is unsupported:
  - the control is disabled or returns: `This recording artifact is not a supported audio file.`
- When the data URL is malformed or cannot be converted:
  - no download is attempted
  - the UI shows a recoverable error
- If the selected recording is deleted before export completes:
  - no stale download should be created from cached UI state
  - the service should resolve the current recording by id through the repository before export
- Export must not change recording metadata, organization metadata, take selections, markers, comparison selection, playback state, or filters.
- Playback, waveform review, P2-10 comparison, tags/favorite/archive, best/active controls, delete, reload, and Practice Again remain coherent after export.

## UX States

- Ready:
  - `Export Audio` is enabled for supported visible recordings.
  - The details panel displays factual artifact metadata as it already does.
- In progress:
  - The button may show a short busy state and be temporarily disabled.
  - Use `role="status"` for export progress/status text.
- Success:
  - Show a non-blocking status message.
  - Keep the selected recording and page state unchanged.
- Missing artifact:
  - Show an unavailable explanation; no fake download link.
- Unsupported artifact:
  - Show an unavailable explanation; no fake download link.
- Browser download blocked or adapter failure:
  - Show `Audio export could not be started in this browser.`
  - Keep the page usable.
- Hidden archived recording:
  - No export control is reachable because the recording is not visible/selected in the default active view.
- No recordings or no filter matches:
  - Preserve existing empty states; do not add export-specific empty copy.

## Data, Service, And Adapter Boundary

UI must not directly call Tone.js, MediaRecorder, wavesurfer, Web Audio, WASM, Dexie, localStorage, raw storage keys, or low-level browser file APIs beyond an injected/export adapter call.

Recommended boundary:

```ts
export type RecordingAudioExportRequest = {
  recordingId: string;
};

export type RecordingAudioExportResult =
  | { ok: true; recordingId: string; filename: string; mimeType: string; sizeBytes: number }
  | { ok: false; recordingId: string; reason: RecordingAudioExportUnavailableReason; message: string };

export type RecordingAudioDownloadAdapter = {
  downloadBlob(input: { blob: Blob; filename: string }): Promise<void> | void;
};
```

Suggested implementation files:

- `src/lib/recordings-review/audio-export.ts`
  - pure eligibility, MIME/extension, filename, data URL conversion, and service orchestration helpers
  - accepts a repository-like dependency and a download adapter for tests
- `src/infrastructure/files/browser-audio-download-adapter.ts` or `src/lib/recordings-review/browser-download-adapter.ts`
  - small browser-only adapter for object URL and `<a download>` behavior
  - if an existing browser-safe download helper exists, reuse it instead of adding a new adapter

Repository boundary:

- Use `recordingHistoryRepository.getRecording(recordingId)` to resolve the current recording.
- Do not read `recordingHistoryRepository.getArtifact(recordingId)` directly in UI.
- Do not add storage schema, migrations, or new persisted export metadata.
- Do not write to the recording review snapshot during export.

Artifact handling:

- Validate `recording.audioDataUrl` exists and is a data URL or other already-supported local artifact URL shape.
- Convert data URL to `Blob` through browser-safe parsing/fetching without audio sample decode.
- Preserve MIME type as the Blob type where safe.
- Confirm resulting blob size is greater than zero.
- Use existing `sizeBytes` for display/result metadata, but do not trust it as the only integrity check.

## Relationship To Existing P2 Behavior

- Grouping:
  - Export applies to individual recordings inside groups, not whole groups.
  - Group counts, latest, best, active, and summaries do not change.
- Tags/favorite/archive:
  - Export does not modify organization metadata.
  - Active archive filter hides archived recordings and therefore hides their export affordance.
  - Archived/all filters make archived recordings visible and exportable if their artifact is supported.
- Comparison:
  - P2-10 comparison selection is separate from export and must not become batch export.
  - Export controls should not be placed inside waveform evidence rows unless they reuse the same single-recording export service and remain clearly per-recording.
- Delete:
  - Delete remains the only destructive action.
  - Export copy must not use remove/delete/cleanup language.
- Playback/reload:
  - Export does not interrupt playback unless the browser naturally prompts a download.
  - Export status may reset on reload; no persistence required.
- Quick vs sheet recordings:
  - Both are eligible with valid audio artifacts.
  - Sheet segment, whole-sheet/no-segment, legacy, and ungrouped/stale sheet recordings use the same single-recording export behavior.
  - Missing sheet links do not block export when the artifact itself is valid.

## Accessibility And Responsive Design

- Follow `docs/v1/ui-design.md` and `docs/v0/design-style-guide.md`.
- Keep Recordings Review dense, calm, and practice-focused.
- Use an icon+text button for export; icon-only is not necessary in details.
- Button needs an accessible label naming the recording, e.g. `Export audio for <recording name>`.
- Busy and success text uses `role="status"`.
- Failure text uses `role="alert"`.
- Disabled/unavailable controls must expose why export is unavailable through visible text or accessible description.
- Do not rely on color alone for export readiness or errors.
- Desktop: details panel remains readable; export does not crowd playback/delete controls.
- Tablet/mobile: button wraps cleanly with Practice Again and other detail actions; no clipped labels or horizontal overflow.
- Do not add nested cards, hero sections, decorative illustration, or a broad visual redesign.

## Expected Files And Areas To Touch

Likely touch:

- `src/components/recordings-review/recordings-review-experience.tsx`
- `tests/unit/recordings-review-experience.test.tsx`
- `tests/e2e/recordings-review.spec.ts`

Likely add:

- `src/lib/recordings-review/audio-export.ts`
- `tests/unit/recordings-review-audio-export.test.ts`

Maybe touch/add:

- `src/infrastructure/files/browser-audio-download-adapter.ts` or a nearby existing browser-safe download helper
- `src/lib/recordings-review/format.ts` only if filename/date formatting can reuse a small existing helper cleanly
- `tests/unit/recordings-review-history.test.ts` only if a visible-recording export helper is added

Avoid:

- Recording capture services and MediaRecorder adapters
- Tone.js/metronome services
- Playback service rewrites
- `src/lib/recordings-review/artifact-service.ts` unless there is a small shared MIME/data URL helper already present and clearly appropriate
- `src/lib/recordings-review/wavesurfer-adapter.ts`
- Waveform comparison source loading except for ensuring no coupling is introduced
- Storage schema/migrations, settings data export, import/restore, cleanup, cloud/backend, Pack 9 analysis

## Acceptance Criteria

- A user can export one supported visible recording from `/recordings`.
- Export works for quick recordings and sheet recordings that have a supported local audio artifact.
- Exported filename is deterministic, safe for common filesystems, has an audio extension derived from MIME type, and includes enough metadata/id suffix to avoid collisions.
- Archived recordings are exportable only when visible through archived/all archive filters.
- Missing, malformed, empty, non-audio, or unsupported artifacts do not download and show clear recoverable UI states.
- Export uses a service/adapter boundary; React UI does not directly parse storage, call Web Audio, call Tone.js, call wavesurfer, call WASM, or access Dexie/localStorage internals.
- Export does not mutate recordings, markers, organization metadata, best/active selections, filters, comparison selections, playback data, or archive state.
- P2-09 organization controls and P2-10 comparison remain usable after export.
- Existing delete behavior remains the only destructive path and is not visually or textually confused with export.
- Desktop, tablet, and mobile layouts have no clipped export labels, overlap, or horizontal overflow.
- Unit/component/E2E tests cover success, unsupported cases, archived visibility, quick/sheet behavior, filename rules, and no batch/export-queue behavior.

## Test Plan

Unit tests for export helpers/service:

- Builds filename for quick recording with created date and id suffix.
- Builds filename for sheet segment recording with sanitized sheet/segment labels.
- Builds filename for whole-sheet/no-segment and missing-sheet recordings without `undefined` or empty separator artifacts.
- Sanitizes Windows-reserved characters, path separators, control characters, repeated whitespace, and overly long names.
- Maps `audio/webm`, `audio/webm;codecs=opus`, `audio/ogg`, `audio/mp4`, and `audio/mpeg` to expected extensions.
- Treats non-audio MIME as unsupported.
- Uses fallback extension for unknown `audio/*` MIME.
- Returns missing-recording when repository no longer contains the id.
- Returns missing-artifact when `audioDataUrl` is null/empty.
- Returns invalid-artifact for malformed data URL or zero-byte Blob.
- Calls the injected download adapter exactly once for a valid artifact.
- Revokes object URLs in the browser adapter test if that adapter is unit-testable.
- Does not call decode APIs, waveform source loaders, playback services, or storage APIs from the export helper.

Component tests:

- Details panel renders `Export Audio` for a supported visible quick recording.
- Details panel renders `Export Audio` for a supported visible sheet segment recording.
- Clicking export invokes the service/adapter and shows success status without changing selection.
- Missing artifact shows unavailable/error status and does not call download.
- Unsupported MIME disables export or shows an error and does not call download.
- Archived recording has no reachable export in default active mode because it is hidden.
- Archived recording can be selected and exported in archived/all mode.
- Export does not clear tags, favorite, archive state, best/active badges, comparison selection, markers, or delete confirmation state.
- P2-10 comparison controls remain separate; selecting comparison recordings does not export anything.
- Button labels/status/error messages are accessible.

E2E tests:

- Seed:
  - one quick recording with a valid audio data URL
  - one sheet segment recording with a valid audio data URL
  - one sheet/no-segment or legacy recording
  - one recording with missing artifact
  - one archived recording with valid artifact
  - organization metadata and comparison-capable data where existing fixtures support it
- Verify:
  - exporting a quick recording triggers a browser download with expected filename/extension
  - exporting a sheet recording triggers a browser download with expected filename/extension
  - missing artifact does not trigger download and shows an unavailable message
  - default active archive filter hides archived recordings and therefore hides export
  - archived/all mode shows archived recording and allows export
  - filters/search/tag/favorite visibility determines which recordings can be exported
  - comparison selection is not treated as batch export
  - playback/details/delete/Practice Again still operate after an export attempt
- Responsive E2E:
  - desktop details panel keeps export visible and aligned
  - tablet-like viewport wraps artifact actions without overflow
  - narrow mobile shows export action and status without clipped text or overlap

## Edge Cases

- Recording id contains unusual characters: filename uses sanitized id suffix.
- Recording name/sheet/segment names contain slashes, emoji, punctuation, reserved Windows device names, or only whitespace: filename remains safe and non-empty.
- `mimeType` has parameters or uppercase letters: MIME mapping normalizes safely.
- `audioDataUrl` MIME and recording `mimeType` disagree: prefer validated recording MIME for eligibility and extension, but keep Blob type safe; document final choice in code comments/tests.
- Data URL is very large: implementation should avoid unnecessary audio decode or duplicate analysis work; one Blob conversion is acceptable.
- Download adapter throws: UI reports failure and no metadata changes.
- Recording is deleted between render and click: service returns missing-recording.
- Archived recording becomes hidden after filter change: export button disappears with selection fallback.

## Verification Commands

Use the local npm wrapper from the repo root:

```powershell
.\scripts\npm-local.ps1 run lint
.\scripts\npm-local.ps1 run typecheck
.\scripts\npm-local.ps1 run test:unit
.\scripts\npm-local.ps1 run test:e2e -- recordings-review.spec.ts
```

For a narrower development loop:

```powershell
.\scripts\npm-local.ps1 exec vitest run tests/unit/recordings-review-audio-export.test.ts tests/unit/recordings-review-experience.test.tsx
```

If the browser download adapter gets its own focused test, include that file in the narrow Vitest command.

## Model Tier Recommendation

- Coding agent: GPT-5.5, high effort, standard speed
- Review agent: GPT-5.4, high effort, standard speed
- Verification agent: GPT-5.4, high effort, standard speed

Rationale: this is a media-adjacent export feature that must preserve real local artifacts, avoid fake/generated downloads, and enforce UI-to-service-to-adapter boundaries. It is narrower than recording capture or waveform analysis, but browser download behavior and artifact integrity justify Tier D care. Do not use fast tier.

## Constraints For Coding Agent

- Reuse existing recording repository, visible filtering, grouping, details panel, organization metadata, comparison, and test fixture patterns.
- Introduce only a small export port/adapter if no existing browser-safe download boundary exists.
- Keep export single-recording and visible-recording only.
- Do not add packages.
- Do not add backend/cloud/network behavior.
- Do not add storage schema, migrations, export history, or persisted UI state.
- Do not let UI call Tone.js, MediaRecorder, wavesurfer, Web Audio, WASM, Dexie, localStorage, or storage internals.
- Do not re-encode, transcode, normalize, analyze, score, align, or generate waveform/onset data.
- Do not couple export to P2-10 comparison selection or P2-08 waveform evidence rendering.
- Do not mutate recording data, tags, favorite, archive, best/active, markers, playback, filters, or comparison state during export.

## Handoff Notes

- P2-11 should leave future batch export to a separate slice because batch semantics require explicit decisions about visible-only, archived inclusion, zip naming, progress, cancellation, and large local memory usage.
- P2-11 should leave app data backup/export to Pack 8 settings local data; do not mix audio artifact export with data export/restore.
- If implementation discovers that stored artifacts are not consistently represented as downloadable data URLs, stop and request a contract update rather than adding encoding or storage rewrites.
