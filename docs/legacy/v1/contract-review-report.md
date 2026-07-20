# v1 Contract Review Report

## Summary

All v1 product features in `docs/v1/status.json` are now promoted to `contract_ready`.

Contract sources:

- `docs/v1/05f-practice-segments.md` contains the detailed Practice Segment spine contracts:
  - `practice.measure-grid`
  - `practice.practice-segments`
  - `practice.segment-recording`
  - `practice.segment-rerecording`
- `docs/v1/remaining-feature-contracts.md` contains the remaining v1 feature contracts across design-style, Home, Quick Metronome, Recordings, Sheet Library, Sheet Viewer, Practice Controls, Takes, Markers, Sessions, Reference, Settings, Practice Session, and Audio Analysis.

No product implementation code was intentionally changed.

## Status Result

Every module and product feature status in `docs/v1/status.json` is `contract_ready`.

Status count after planning:

```text
contract_ready=79
```

This count includes module-level status entries and feature-level status entries.

## Coverage Result

The review pass checked every feature id from `docs/v1/status.json` under `product.modules` against the contract source files:

```text
docs/v1/05f-practice-segments.md
docs/v1/remaining-feature-contracts.md
```

Coverage check result: no missing `Feature Contract` headings.

## Files Changed

- `docs/v1/05f-practice-segments.md`
- `docs/v1/remaining-feature-contracts.md`
- `docs/v1/status.json`
- `docs/v1/contract-review-report.md`

## Review Focus

Reviewers should check:

- Each feature has an implementation-sized scope and does not absorb adjacent feature behavior.
- Out-of-scope sections keep v2 deferrals out of v1 implementation.
- User-facing features reference the v1 UI direction and require desktop, tablet-like, and mobile checks.
- Persistence claims include reload verification.
- Media, metronome, waveform, recording, and analysis claims require real artifact, decode, timing, scheduler, or controlled fixture evidence.
- Implementation contracts require fresh coding agents, `fork_context: false`, standard speed, and service/adaptor boundaries.
- Verification contracts require fresh verification agents, real browser E2E for UI, console checks, and PASS/FAIL evidence.

## Important Risks To Review

- `docs/v1/remaining-feature-contracts.md` uses compact contracts with shared common rules to avoid repeating the same lifecycle language dozens of times. Reviewers should confirm this format is acceptable before implementation agents are launched.
- Some later-spine features depend on earlier features being implemented and verified first. Contract-ready status does not mean they should all be implemented in parallel.
- Module-level statuses are now `contract_ready` because all contained feature contracts exist. If the team wants module status to remain independent from feature status, adjust module-level statuses before implementation scheduling.
- Audio analysis contracts are intentionally infrastructure-only and must not be treated as permission to ship user-facing scoring.
- Settings cleanup/import-export contracts include destructive or data migration behavior; implementation should be scheduled later and reviewed with extra care.

## Recommended Implementation Order

Use one fresh coding/review/verification lifecycle per feature:

1. `practice.measure-grid`
2. `practice.practice-segments`
3. `practice.segment-recording`
4. `practice.segment-rerecording`
5. `takes.multi-take-management`
6. `takes.active-best-take`
7. `takes.take-history`
8. `takes.waveform-comparison`
9. Continue adjacent modules only after their dependencies are verified.

Do not launch implementation until the relevant contract has been reviewed and approved.

## Review Checklist

- [ ] Confirm contract packet format is acceptable.
- [ ] Confirm all feature statuses should be `contract_ready`.
- [ ] Confirm module-level statuses should also be `contract_ready`.
- [ ] Confirm implementation should begin with the Practice Segment spine.
- [ ] Confirm no product code changes are included in this planning pass.


