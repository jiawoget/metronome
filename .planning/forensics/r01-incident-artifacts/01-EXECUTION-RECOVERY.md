# R01 Execution Recovery Contract

This is a control-plane repair for the already-approved Phase 01 plan. It does not create a phase, change the selected capability, widen the six-file product/test surface, or claim product progress.

## Failure record

The first executor spent its entire turn loading broad context, re-establishing evidence already produced by research, rebuilding Lumen, and waiting for pre-edit CodeScene analysis. The external wait was tied to the transient agent turn, no durable substep checkpoint existed, and the interrupted run produced zero test or product changes. A continuation therefore repeated setup instead of resuming from a durable boundary.

## Root-cause repairs

| Failure mode | Enforced repair |
|---|---|
| Lifecycle activity looked like product progress | Every event declares `plane=control|product|external`; summaries report first test and first product change separately. |
| Planning-only commits invalidated evidence | Cache identity uses separate product, dependency, search-config, and policy fingerprints. |
| Pre-edit work invoked slow providers | Tasks declare `gate_stage`; external analysis is forbidden in `pre_edit` and belongs to the immutable `pre_merge` revision. |
| Executor reproduced research | Research is the sole evidence producer; execution reads a compact fingerprinted receipt. |
| Expensive gates ran before code existed | Pre-edit retains only fingerprint checks and focused characterization; full gates, LOC, and CodeScene run once at final revision. |
| Completed setup was repeated | A completed cache key cannot start again; interrupted work requires an explicit `retry_of`; there is no automatic retry. |
| External wait died with an agent turn | The controller owns the external step and records a resumable external job identity. |
| Full research and validation inflated each agent context | Executor context uses a manifest/receipt plus exact task files, not whole research documents. |
| A valid-looking plan could still make no forward progress | A generic liveness check rejects pre-edit external work, duplicate evidence production, broad research context, non-resumable external work, missing stage ownership, and automatic retry language. |
| A wrapper started becoming a subsystem | Implementation is limited to one append-only writer and one streaming summarizer, using Node built-ins only. |
| Configuration drift caused repeated bake/setup | Fingerprints make drift explicit and rebake/reindex occurs only when the relevant identity changes. |
| Limits silently became abort/retry loops | Time and token budgets are soft measurements; correctness gates remain hard and retries remain explicit. |
| Control-plane edits triggered repeated hooks/pushes | Control-plane changes are batched; hooks run at the commit boundary; the branch is pushed only after final evidence. |
| The 89-line LOC verifier caused reset loops | It remains final-only and may not send execution back to research or characterization.

## Runtime data boundary

Runtime records live only at `.logs/gsd-observability/<run-id>/`. They are ignored by Git and Lumen and are excluded from product fingerprints. The writer records paths, hashes, status and counts, never file contents, environment values, credentials, or provider payloads. Raw Codex rollouts stay in their original location; the summarizer streams them and writes only `summary.json` plus one compact line per step.

## Initial soft budgets

| Class | Wall/active allowance | Processed tokens | New tokens |
|---|---:|---:|---:|
| quick | 2 min | 300,000 | 50,000 |
| standard | 15 min | 1,500,000 | 200,000 |
| heavy | 45 min | 4,000,000 | 500,000 |
| external | 5 min active / 20 min wait | 500,000 | 75,000 |

Crossing 1x records `over_budget`; crossing 2x records `severe_over_budget`; neither automatically stops or retries work. Before the first test diff, 60 minutes is a milestone warning; before the first product diff, 120 minutes is severe.

## Implementation order

1. Test and implement the fail-closed event writer, path boundary, redaction, fingerprints, cache/retry rules, and generic plan liveness check.
2. Test and implement the streaming rollout summarizer, exact raw token dimensions, turn-granularity attribution, durations, I/O, and soft-budget labels.
3. Replace Phase 01's broad executor context with a compact execution receipt and move external analysis to the final immutable revision without changing product intent.
4. Run the formal R01 once. On interruption or block, record it and stop; do not silently restart.
