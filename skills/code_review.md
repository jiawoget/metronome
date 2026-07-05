# Metronome Code Review Entry

This is the legacy reviewer entrypoint. The canonical hard-gate workflow is `skills/metronome_reviewer.md`.

Before reviewing any production-source or gate-control PR:

1. Read `skills/metronome_reviewer.md`.
2. Run its pre-review gates in order: CodeScene MCP `analyze_change_set` first, Semgrep changed-file second.
3. If CodeScene reports any changed source file Code Health decline, or Semgrep fails, return `CHANGES_REQUIRED` before normal review.
4. Use its Required Input Packet, Review Workflow, Immediate `CHANGES_REQUIRED`, Required Output Schema, and Verdict Handling.
5. If `skills/metronome_reviewer.md` is missing or conflicts with this file, return `CHANGES_REQUIRED`; do not fall back to a softer review.

## Additional Known Debt Patterns

Apply these checks in addition to the canonical reviewer skill.

### Architecture Boundaries

Block if:

- UI imports `@/infrastructure/**` directly outside a named composition root.
- UI imports Tone.js, wavesurfer.js, MediaRecorder, or WebAudio directly instead of going through adapters/services.
- Services/domain import React or contain `"use client"`.
- Recordings review UI mutates `reviewService.set*` directly instead of going through controller/action boundaries.
- A component owns a recording transaction, such as `startCapture` plus `ensureSheetSession`, or `stopAndSave` plus metadata refresh, in one UI function.

### Known Bad Patterns

Block if:

- `JSON.stringify(a) === JSON.stringify(b)` or `!==` is used for domain equality.
- Production code uses `window.__*Harness`, `window.__*Test*`, or harness `CustomEvent`.
- New local `Date.now() + Math.random()` ID generation is added.
- New trim-empty-to-null ID normalization is added instead of a shared helper/domain type.
- Manual UTC timestamp or duration formatter copies are added.
- Practice goal validation/building is added in UI instead of domain/service.
- Fake data contract fields are added but not rendered or consumed.

### Semantic Duplication Clusters

Run independent searches for these clusters:

- Rerecord source validation: source exists, sheet recording type, sheet id match, segment context existence, live segment existence, live segment context match.
- Target resolution: collect sheet/segment IDs, gateway lookup, valid/missing/lookup-failed state, target maps.
- Recording organization mutation: favorite, archived, add/remove tags, local error presentation.
- Dashboard formatting: UTC timestamp, duration, streak/day labels, goal progress.

### Hot Files

Apply extra scrutiny when these files are touched:

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/recordings-review/recordings-review-experience.tsx`
- `src/services/practice-session/service.ts`
- `src/components/home/home-dashboard.tsx`
- `src/hooks/use-practice-session-dashboard.ts`

## Output

Use the exact output schema from `skills/metronome_reviewer.md`.
