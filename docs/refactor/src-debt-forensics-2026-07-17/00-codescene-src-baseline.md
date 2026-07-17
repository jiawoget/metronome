# CodeScene `src/**` technical-debt baseline

Date: 2026-07-17

Status: evidence baseline; not an implementation plan

## Source of truth

- CodeScene page: <https://codescene.io/projects/82175/jobs/6845237/results/code/technical-debt/system-map>
- Project: `82175`
- Job: `6845237`
- Aspect: `Refactoring Targets`
- Root: `System`
- Visible population: `312 files`
- Code Health range: `1.0–10.0`
- Commit threshold: `0`
- Filename filter: empty
- CodeScene analyzed commit: `ebc81aa8172ee8e9ee888d840cedcfb72b7b5337`
- Planning branch base: `origin/main@eb1730205784a88c0a5b6177d9c31b515071b069`

The paths below were extracted from the rendered CodeScene system map. Automation IDs were normalized by removing only the exact prefix `node-path:metronome/`, deduplicated, and then filtered to `src/**`. No local whole-repository debt scan was used to discover candidates.

## Freshness proof

The following command returned no paths and no diff summary:

```powershell
git diff --name-status ebc81aa8172ee8e9ee888d840cedcfb72b7b5337..origin/main -- src
git diff --stat ebc81aa8172ee8e9ee888d840cedcfb72b7b5337..origin/main -- src
```

Therefore, the CodeScene snapshot and the planning branch contain identical `src/**` content. Later documentation and workflow changes on `main` do not invalidate this source baseline.

## Result counts

| Population | All paths | `src/**` paths |
| --- | ---: | ---: |
| Recommended refactoring targets | 18 | 6 |
| Local refactoring opportunities | 65 | 37 |
| Local-only opportunities after removing recommended overlap | — | 31 |

The counts are evidence, not a fixed “Top 10” quota. The number of implementation plans will be determined by bounded debt roots and coupling evidence.

## Recommended `src/**` targets

| Path | Code Health | Commits / 1 year | Friction | LOC |
| --- | ---: | ---: | ---: | ---: |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | 6.51 | 32 | 36% | 1,271 |
| `src/components/recordings-review/recordings-review-experience.tsx` | 6.33 | 21 | 25% | 1,534 |
| `src/services/practice-session/service.ts` | 7.51 | 22 | 17% | 769 |
| `src/components/home/home-dashboard.tsx` | 7.34 | 13 | 11% | 1,532 |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | 6.69 | 8 | 8% | 929 |
| `src/lib/recordings-review/repository.ts` | 8.4 | 16 | 8% | 769 |

Raw `src/**` recommended IDs:

```text
node-path:metronome/src/components/home/home-dashboard.tsx
node-path:metronome/src/components/recordings-review/recordings-review-experience.tsx
node-path:metronome/src/components/sheet-practice/controls/sheet-practice-controls.tsx
node-path:metronome/src/components/sheet-practice/segments/practice-segment-selector-panel.tsx
node-path:metronome/src/lib/recordings-review/repository.ts
node-path:metronome/src/services/practice-session/service.ts
```

## Local-only `src/**` opportunities

These paths may help prove a bounded multi-file debt root. Their presence does not automatically place them in a refactor plan.

```text
src/components/quick-metronome/quick-metronome-experience.tsx
src/components/sheet-library/sheet-library-experience.tsx
src/components/sheet-practice/controls/metronome-settings-panel.tsx
src/components/sheet-practice/controls/types.ts
src/components/sheet-practice/viewer/sheet-viewer-experience.tsx
src/domain/practice/index.ts
src/domain/practice/rules.ts
src/domain/practice/types.ts
src/domain/practice/validation.ts
src/hooks/use-practice-session-dashboard.ts
src/infrastructure/db/practice-session-repository.ts
src/infrastructure/db/recording-history-metadata-repository.ts
src/infrastructure/files/sheet-library-repository.ts
src/lib/quick-metronome/control.ts
src/lib/quick-metronome/metronome-service.ts
src/lib/quick-metronome/recording-controller.ts
src/lib/quick-metronome/session.ts
src/lib/quick-metronome/types.ts
src/lib/quick-metronome/use-metronome-transport.ts
src/lib/recordings-review/audio-export.ts
src/lib/recordings-review/history.ts
src/lib/recordings-review/types.ts
src/lib/recordings-review/waveform-comparison-sources.ts
src/lib/sheet-practice/recording-service.ts
src/services/practice-session/types.ts
src/services/recording/index.ts
src/services/recordings-review/index.ts
src/services/sheet-library/service.ts
src/services/sheet-library/types.ts
src/services/sheet-viewer/service.ts
src/services/sheet-viewer/types.ts
```

## Stage boundary

- Candidate discovery is limited to CodeScene evidence from this page.
- The current refactor stage is centered on production code under `src/**`.
- Tests may change only when needed to preserve or prove behavior for a production refactor.
- Test-code debt is deferred to a later stage and cannot independently expand a current cluster.
- There is no hard single-file rule. A plan may cover multiple production files when targeted review proves they share one debt root.
- A directory, feature area, or CodeScene overlay is not sufficient by itself to justify broad scope.
