# 06 Reference System Agent Index

## Contract

Spec: `docs/v0/06-reference-system.md`

This module owns Sheet Practice references: local audio reference upload,
decode/play/pause/volume, Bilibili search/URL save, persistence by sheetId,
error states, and independence from metronome/recording.

## Code Map

- UI: `src/components/sheet-practice/reference/reference-panel.tsx`
- Domain: `src/domain/reference/*`
- Service: `src/services/reference/service.ts`
- Browser composition: `src/infrastructure/reference/browser-reference-service.ts`
- Local audio inspection/player:
  `src/infrastructure/reference/local-audio-inspection-adapter.ts`,
  `src/infrastructure/reference/local-reference-audio-player.ts`
- Repository/artifacts: `src/infrastructure/reference/reference-repository.ts`
- Bilibili adapters: `src/infrastructure/bilibili/*`

## Technologies And Boundaries

- Local audio uses browser decode/media playback behind adapters.
- Production Bilibili search uses a small fetch-backed adapter; deterministic
  fixtures are test-only.
- Bilibili playback is an external link fallback in v0; do not load third-party
  iframe scripts into practice unless a future spec requires it.
- No Bilibili download, extraction, sync, A-B loop, speed, or offset.

## Tests

- Unit: `tests/unit/reference-domain.test.ts`,
  `tests/unit/reference-service.test.ts`,
  `tests/unit/bilibili-search-adapter.test.ts`
- E2E: `tests/e2e/reference-system.spec.ts`

## Spec Audit Notes

- Current status is verified.
- Post-audit fix `e125f8a` strengthened reference-playback session evidence.
- Known operational risk: live Bilibili endpoint may fail due to network/CORS or
  third-party changes; deterministic E2E does not depend on live network.
- No known unimplemented v0 reference item remains.

