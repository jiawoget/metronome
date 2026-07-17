# `src/**` refactor cluster register

Date: 2026-07-17

Status: candidate register; boundaries require targeted review

## Purpose

This register converts the fresh CodeScene baseline into a small set of investigation units. It does not recreate the deleted R01 plan and does not authorize implementation.

CodeScene is the discovery source. Local code, dependency, history, and test reads are used only to prove or reject a proposed boundary; they must not introduce unrelated debt candidates.

## Investigation order

The order reflects the combined CodeScene signals. It is the order for boundary review, not yet the final implementation sequence.

| Order | Candidate cluster | Recommended seeds | Why investigate now | Possible adjacent evidence; not scope |
| ---: | --- | --- | --- | --- |
| 1 | Sheet Practice controls | `sheet-practice-controls.tsx`; `practice-segment-selector-panel.tsx` | Highest friction and churn in the `src/**` recommended set; both seeds are in the same user workflow | Boundary review complete: split into independent debt roots; see `02-sheet-practice-boundary-review.md` |
| 2 | Recordings Review | `recordings-review-experience.tsx`; `lib/recordings-review/repository.ts` | Lowest Code Health seed plus 25% friction; UI and persistence may expose one workflow debt root or may need separation | `lib/recordings-review/{types,history,audio-export,waveform-comparison-sources}.ts`; `services/recordings-review/index.ts`; `infrastructure/db/recording-history-metadata-repository.ts` |
| 3 | Practice Session | `services/practice-session/service.ts` | 22 commits and 17% friction in a service boundary with several local opportunities | `services/practice-session/types.ts`; `domain/practice/{rules,types,validation,index}.ts`; `infrastructure/db/practice-session-repository.ts`; `hooks/use-practice-session-dashboard.ts` |
| 4 | Home Dashboard | `components/home/home-dashboard.tsx` | Large component with problematic Code Health; likely downstream of Practice Session boundaries | `hooks/use-practice-session-dashboard.ts`; existing home-domain sources already used by the component |

## Boundary rules

A cluster can become an implementation plan only when targeted review establishes all of the following:

1. One precise debt root explains the proposed production changes.
2. Every included `src/**` file is necessary to remove that root; adjacency alone is insufficient.
3. The plan identifies existing code that must be reused before proposing a new helper, service, repository, read model, or parallel path.
4. Behavior that must remain unchanged is tied to existing tests or to the smallest necessary test update.
5. Files are owned by one cluster only. Shared files remain unassigned until the dependency direction is explicit.
6. The rollback boundary is understandable from one PR.
7. CodeScene review can evaluate the before/after production scope.

There is deliberately no “must modify exactly one file” gate. There is also no permission for an open-ended feature-area rewrite: multi-file scope is valid only when the files form one bounded refactor transaction.

## Required review output for each candidate

Before a candidate is named R01 or receives an implementation plan, its review must record:

- CodeScene seed and metrics;
- exact unhealthy construct or responsibility mix;
- current dependency and ownership boundary;
- proposed production file set, with one reason per file;
- explicitly excluded adjacent files;
- behavior-preservation tests;
- expected Code Health improvement or structural outcome;
- stop condition if evidence shows multiple debt roots.

The result is either `PLAN_READY` with one bounded cluster or `PLAN_BLOCKED` with the missing evidence. A plan must not be widened merely to avoid `PLAN_BLOCKED`.

## Next action

The targeted boundary review for candidate 1 is complete. It concludes that the two recommended seeds contain separate debt roots:

- proposed R01 candidate: `sheet-practice-controls.tsx`, limited first to duplicated Record Again source validation, with one pure sibling helper allowed;
- later independent candidate: `practice-segment-selector-panel.tsx`, limited to segment loading, editor, mutation, and selection state.

The boundary review is approved and the new implementation plan is `docs/v1/implementation-slices/plans/R-01-sheet-rerecord-source-validation.md`. The eventual implementation PR will use repository gates and `@codex review`; this register does not test that integration.
