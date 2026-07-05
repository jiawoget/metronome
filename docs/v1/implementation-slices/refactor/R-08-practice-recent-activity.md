## 0. Verdict

Verdict: `PLAN_BLOCKED`

- missing file/evidence: Skill file read: `skills/metronome_planner.md`; Debt gate map read: `docs/architecture/debt-gate-map.md`; agent/v1/prior-plan evidence read: `docs/agent-index/01-app-shell-home.md`, `docs/agent-index/08-practice-session.md`, `docs/v1/01-app-shell-home.md`, `docs/v1/08-practice-session.md`, R-05/R-07/R-09 plans; repo-map searches over `src/**`, `tests/**`, `docs/v1/**`, `docs/refactor/**` for `normalize|format|validate|resolve|select|build|create`, service/repository/controller/hook/adapter, `resolveTarget|target(|getSegmentRangeLabel|HomeRecentActivityItem.metadata` found the cross-file target-resolution debt but no monitor-approved exact R-08 scope.
- why it blocks safe coding: remediation and debt-gate evidence require shared primitives to migrate at least two old production call sites and make old implementations disappear; a narrow R-08 handoff cannot prove that, while a broad target-resolution/segment-range PR is not authorized by the current one-target plan.
- what must be read or produced next: produce monitor/user approval for the exact R-08 scope that can satisfy the retired-surface requirement, then rerun planner output with full sections before any coding handoff is written.
