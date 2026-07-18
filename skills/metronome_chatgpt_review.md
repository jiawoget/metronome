# Metronome ChatGPT Review Skill

Read `.agents/skills/metronome-workflow/SKILL.md` first. The full role contract below remains in force; the overlay takes precedence only for shared workflow, model-routing, pause, and promotion rules.

This skill is the mandatory external ChatGPT gate for metronome debt-prevention plan and PR review. It defines the required packets, review criteria, shared output contract, and verdict handling.

When also using `metronome-v1-chrome-chatgpt-review`, use this file's plan/PR prompt instead of that skill's generic prompt. A web ChatGPT verdict produced without this debt-contract prompt does not satisfy `Agent Gate Evidence`.

Use the logged-in ChatGPT `metronome` project with Extra High effort by default. Send the full original plan or PR evidence without compression. Wait for the final verdict; intermediate "Thinking" output is not a verdict.

## Common Output Contract

Every ChatGPT response must use this structure:

```md
## Verdict

PASS / PASS_WITH_NITS / PASS_WITH_CHANGES / CHANGES_REQUIRED

## Evidence Checked

| Gate | Result | Evidence |
|---|---|---|

## Blocking Issues

1. [BLOCKER] ...
   Evidence: plan section, PR body section, file:line, or diff excerpt
   Required fix:

## Non-Blocking Nits

1. ...

## Readiness

- Coding may proceed: yes/no/not applicable
- PR may be marked ready: yes/no/not applicable
- PR may merge after CI: yes/no/not applicable
```

Hard rules:

- Any missing, placeholder, or unverifiable evidence means `CHANGES_REQUIRED`.
- Machine validation proves evidence shape only. Independently verify capability coverage, source fit, official API/version freshness, probe relevance, policy thinness, and diff truth.
- A handwritten equivalent of an admitted repository, installed, OSS, or platform primitive means `CHANGES_REQUIRED`, even when tests and structural gates pass.
- Plan review may use `PASS_WITH_CHANGES`; PR review must not use it.
- `PASS_WITH_NITS` is allowed only when no evidence is missing.
- Do not accept "later cleanup" for retired surface, wrappers, aliases, or compatibility paths.
- The monitor records the final ChatGPT verdict only after this review passes.

## Required Plan Review Packet

Send all of this before asking for review:

- Slice/stage name.
- Full original plan text.
- Plan file path under `docs/v1/implementation-slices/plans/`.
- Immutable plan commit, blob, and Git-object SHA-256; read-only `--plan-input` exit-0 output.
- Independent plan-review output, including every applicable `LOCAL_POLICY_APPROVED` line and `PLAN_REVIEW_PASS`.
- `docs/architecture/debt-gate-map.md` content or relevant excerpt.
- Any known reviewer concern or no-go question.

If any item is missing, fix the packet before review.

## Plan Review Prompt

```text
你是 metronome 项目的最终计划 hard gate。请只审这个 plan 是否满足技术债 prevention contract，不要扩展需求，不要替我补证据。

请按照 Common Output Contract 输出，并只允许这些 verdict：
- PASS
- PASS_WITH_CHANGES
- CHANGES_REQUIRED

必须验证这些 Gate，并在 Evidence Checked 表里逐项给 pass/fail/not applicable 和证据：
1. Inputs Read / Coding Read Set：普通 slice 是否包含相关 docs/agent-index、v1 slice docs、prior plans、docs/architecture/debt-gate-map.md、必要代码和测试；refactor pipeline 是否把 coding read set 分成 Must read、Planner-only evidence、Read only if blocked，且 Must read 不超过 5 个文件。
2. Repo Map / Construction Evidence：普通 slice 的 repo-map 搜索是否覆盖 src、tests、必要 scripts/docs 和 normalize/format/validate/resolve/select/build/create、service/repository/hook/controller/adapter、旧 alias/compat/wrapper/direct caller；refactor pipeline 是否把 repo-map 证据压缩为可执行 construction/implementation steps，而不是把搜索噪音交给 coding agent。
3. Reuse-First Capability Admission：不要相信表格结论，先从原始需求独立重推 architecture-free capability atoms，再验证 C-ID 覆盖。`Existing Primitive Search` 是否使用 canonical capability 表和 `Capability Delivery Map`，两表 C-ID 是否完全一致；repo/installed 是否给出精确路径、lockfile 版本、export 和真实 probe；仍未覆盖的 generic atom 是否同时搜索成熟 OSS 与适用的官方 platform API，并打开官方文档/registry 核对精确版本、API 和新鲜度；Context7 不可用时是否记录 `provider_fallback` 到官方 web 文档；是否遵守总共最多 2 lanes、每 lane 最多 2 candidates、fit 即停止。`platform: inapplicable - reason` 是否真实。package-legitimacy 只能是风险信号，不能代替 API fit/license/OSV。`direct-use`、`thin-policy`、`local-no-fit`、`local-policy` 的 class/source/composition 是否语义真实；product-policy 是否只做薄约束而没有隐藏 generic operation；local-policy 在 plan 中是否仍是 pending，并且独立 review 是否用同一 immutable identity 给出逐 C-ID `LOCAL_POLICY_APPROVED`。plan-input 通过只证明结构，不能代替这些语义检查。
4. Required Retired Surface：普通 slice 是否列出旧 helper、alias、state 字段、service method、wrapper、direct import；refactor pipeline 是否列出至少一个 `RS-*` required retired surface，并要求 same-PR actual deletion。重命名、搬文件、narrowing、保留 compatibility wrapper 不能算 deletion。
5. New Surface Budget：每个新增 helper/service/wrapper/controller/hook/formatter/validator/parser/adapter/repository method 是否都有 rejected alternative 和 same-PR retired surface；refactor pipeline 中 new file 默认 no，除非 plan blocked/request monitor review。
6. Implementation Specificity：refactor pipeline 是否以 delete X -> replace with Y -> must not change Z -> proof command/test 的形式给 coding handoff；普通 slice 是否有足够具体的 implementation/test plan。
7. Boundary Impact：是否避免新增 UI -> browser/infrastructure、domain -> UI/service、service passthrough；composition root 例外是否明确。
8. Async / State / Side-Effect Safety：如果涉及 async reads、effects、store writes、capture/save、persistence、UI messages，是否规定 pure resolver/helper、stale guard、store ownership、capture/save ordering。
9. Tests Required / Verification Before Review Handoff：删除兼容 surface 后是否包含 behavior-equivalence coverage、deletion proof、focused tests、typecheck/lint evidence。
10. Scope Integrity：是否没有把单个 pipeline 宣称为整个 remediation phase closeout；如果需要 split，是否输出 blocked 而不是自己拆。

如果任何 gate 缺 evidence 或只是占位，输出 CHANGES_REQUIRED。
```

## Required PR Review Packet

Send all of this before asking for review:

- PR URL, branch, head SHA, and base branch.
- Diffstat and changed-file list split into production/tests/docs/scripts/workflows.
- Draft PR body with exact `MSO-5` and ChatGPT `PENDING` overlay evidence.
- Approved plan text or plan path plus relevant excerpt.
- Exact capability-plan path/commit/blob/SHA-256 and matching immutable local-policy approval output.
- Exact-head CI and full local-gate output copied from the commands actually run.
- Exact-head CodeScene MCP `analyze_change_set` output with no decline and `quality_gates: passed`.
- Reviewer `PASS` or `PASS_WITH_NITS` output from `skills/metronome_reviewer.md`.

Do not require a final ChatGPT verdict in this packet. If any other item is missing for a production-source or gate-control PR, fix the packet before review.

## PR Review Prompt

```text
你是 metronome 项目的最终 PR hard gate。请审证据，不要只审功能是否能跑，不要替 PR 补证据。

请按照 Common Output Contract 输出，并只允许这些 verdict：
- PASS
- PASS_WITH_NITS
- CHANGES_REQUIRED

必须验证这些 Gate，并在 Evidence Checked 表里逐项给 pass/fail/not applicable 和证据：
1. Reuse Proof / Capability Conformance：从原始需求和 diff 独立重推 capability atoms，不要相信 planner、PR 表格或结构 validator。canonical capability 表与 `Capability Implementation Map` 是否具有完全相同且完整的 C-ID；plan 与 PR 的 source/version/API 是否一致且仍然可用；repo/installed/OSS/platform 的官方来源和实际 implementation probe 是否精确、新鲜并支持选择；repo/installed miss 后是否有成熟 OSS 与适用官方 platform 搜索；capability-plan path/commit/blob/SHA-256 是否对应同一 tracked immutable plan，local-policy token 是否逐 C-ID 匹配批准；map 中每个文件、symbol、test、probe 是否被 diff 和 exact-head 输出支持。逐个 `direct-use` 检查 diff 是否偷偷手写等价 parser/formatter/normalizer/helper；逐个 product-policy 检查是否只做薄约束并真实 compose generic C-ID。任何隐藏等价实现、过期 identity、probe 不匹配或未审批本地 fallback 都必须 CHANGES_REQUIRED。
2. Retired Surface：旧 helper、alias、state 字段、service method、wrapper、direct import 是否真的删除/收窄；旧调用点是否迁移。
3. New Surface / Net Surface Delta：每个新 helper/service/type/component 是否有 why-not-reuse 和 same-PR old surface；Net surface delta 是否与 diff 一致。
4. Shared Primitive Two-Call-Site Rule：shared primitive/controller/service/presenter/helper 是否至少迁移两个旧调用点并让旧实现消失；少于两个时是否有全仓搜索证据且没有声称 debt reduction。
5. Boundary Delta：是否没有新增 UI -> browser/infrastructure、domain -> UI/service、service passthrough；composition-root 例外是否明确。
6. Agent Gate Evidence：draft PR 是否精确为 MSO-5 和 PENDING，并看到 planner/coder/reviewer skill read evidence、PLAN_READY、CODE_READY、reviewer PASS/PASS_WITH_NITS。
7. CodeScene Pre-Review：是否有 exact-head CodeScene MCP analyze_change_set，且没有 Code Health decline 并包含 quality_gates: passed；如果失败是否拒绝并要求 rework。
8. Semgrep Pre-Review：monitor 的 lint:debt:changed 是否在 review 前运行且通过；如果失败是否拒绝并要求 rework。
9. Behavior-Equivalence Tests：是否覆盖 retired compatibility surface；不能只是更新旧测试或 snapshot。
10. Static Gates：validate:debt-gates、lint:debt:changed、lint:xo:changed、lint、typecheck、test:unit、build 是否真实通过。
11. Cleanup Integrity：是否没有 later cleanup、兼容旧入口不退休、wrapper 叠 wrapper、或 N/A/TODO/占位证据。

如果任何 gate 缺 evidence，输出 CHANGES_REQUIRED。
如果 PR diff 手写了 reviewed `direct-use` capability 的等价实现，在 `CHANGES_REQUIRED` 后增加精确行 `FINDING_CODE reuse-decision-mismatch`；其他问题不要伪造这个 code。
```

## Verdict Handling

- Plan `PASS`: coding may proceed.
- Plan `PASS_WITH_CHANGES`: apply required plan changes, resend the full plan, and wait for a new verdict.
- Plan `CHANGES_REQUIRED`: do not code.
- PR `PASS`: the monitor may replace only the draft overlay evidence with `MSO-6` and this verdict.
- PR `PASS_WITH_NITS`: the monitor may promote only when nits are non-blocking and no evidence is missing.
- PR `CHANGES_REQUIRED`: do not advance the draft PR.
