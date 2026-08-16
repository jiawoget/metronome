## Source Debt Forensics: CodeScene Project Scan

Status: complete
Scope: `src` only
Excluded: all `tests/**`, `*.test.*`, `*.spec.*`, docs-only files
Project: CodeScene `metronome` project `82174`

### Project-wide CodeScene hotspots

Source: `list_technical_debt_hotspots_for_project`

| File | Code Health | Revisions | LOC | In project hotspots |
|---|---:|---:|---:|---|
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | 6.51 | 29 | 1254 | yes |
| `src/components/recordings-review/recordings-review-experience.tsx` | 6.33 | 21 | 1534 | yes |

Notes:
- Current project hotspot payload also included test files, but those are intentionally excluded from this analysis.
- `list_technical_debt_goals_for_project` returned no file-level goals for this project snapshot.

### CodeScene-selected top 10 source files

Selection rule:
- Start from project hotspots.
- Fill the rest of the list using file-level `code_health_score` and `code_health_review`.
- Do not use local heuristics as debt evidence.

| Rank | File | Code Health | In project hotspots | Primary CodeScene evidence |
|---|---:|---|---|---|
| 1 | `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | 6.22 | yes | `Complex Method`, `Complex Conditional`, `Large Method` |
| 2 | `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | 6.31 | no | `Bumpy Road Ahead`, `Deep, Nested Complexity`, `Complex Method`, `Large Method` |
| 3 | `src/components/recordings-review/recordings-review-experience.tsx` | 6.33 | yes | project hotspot with `revisions=21`, `loc=1534`, `friction=0.2721` |
| 4 | `src/components/home/home-dashboard.tsx` | 6.46 | no | low `code_health_score` in component slice |
| 5 | `src/services/practice-session/service.ts` | 6.65 | no | `Bumpy Road Ahead`, `Complex Method`, `Complex Conditional`, `Code Duplication` |
| 6 | `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | 6.88 | no | `Complex Method`, `Complex Conditional`, `Large Method` |
| 7 | `src/domain/practice/rules.ts` | 7.22 | no | `Bumpy Road Ahead`, `Complex Method` |
| 8 | `src/domain/practice/recent-activity.ts` | 8.10 | no | `Overall Code Complexity`, `Complex Method` |
| 9 | `src/hooks/use-practice-session-dashboard.ts` | 8.11 | no | `Overall Code Complexity`, `Complex Method`, `Large Method` |
| 10 | `src/lib/recordings-review/repository.ts` | 8.40 | no | `Complex Method`, `Code Duplication` |

### Per-file report targets

1. `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
2. `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
3. `src/components/recordings-review/recordings-review-experience.tsx`
4. `src/components/home/home-dashboard.tsx`
5. `src/services/practice-session/service.ts`
6. `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
7. `src/domain/practice/rules.ts`
8. `src/domain/practice/recent-activity.ts`
9. `src/hooks/use-practice-session-dashboard.ts`
10. `src/lib/recordings-review/repository.ts`

### Completion note

All 10 per-file debt-forensics reports are now complete in this directory:

1. `01-sheet-practice-controls.md`
2. `02-practice-segment-selector-panel.md`
3. `03-recordings-review-experience.md`
4. `04-home-dashboard.md`
5. `05-practice-session-service.md`
6. `06-measure-grid-calibration-panel.md`
7. `07-practice-rules.md`
8. `08-practice-recent-activity.md`
9. `09-use-practice-session-dashboard.md`
10. `10-recordings-review-repository.md`
