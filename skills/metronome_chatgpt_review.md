# Metronome ChatGPT Review Skill

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
- Plan review may use `PASS_WITH_CHANGES`; PR review must not use it.
- `PASS_WITH_NITS` is allowed only when no evidence is missing.
- Do not accept "later cleanup" for retired surface, wrappers, aliases, or compatibility paths.
- Record the final ChatGPT verdict in the PR body's `Agent Gate Evidence` section.

## Required Plan Review Packet

Send all of this before asking for review:

- Slice/stage name.
- Full original plan text.
- Plan file path under `docs/v1/implementation-slices/plans/`.
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
1. Inputs Read：是否包含相关 docs/agent-index、v1 slice docs、prior plans、docs/architecture/debt-gate-map.md、必要代码和测试。
2. Repo Map Evidence：搜索范围是否覆盖 src、tests、必要 scripts/docs；搜索词是否覆盖 normalize/format/validate/resolve/select/build/create、service/repository/hook/controller/adapter、旧 alias/compat/wrapper/direct caller。
3. Existing Primitive Search：Need、Search terms、Existing primitive/library、Files read、Decision 是否具体。
4. Shared Primitive Call-Site Audit：抽 shared primitive/controller/service/presenter/helper 时，是否至少迁移两个旧调用点并让旧实现删除/收窄；少于两个时是否有全仓搜索证据且不得声称 debt reduction。
5. New Surface Budget：每个新增 helper/service/wrapper/controller/hook/formatter/validator/parser/adapter/repository method 是否都有 rejected alternative 和 same-PR retired surface。
6. Retired Surface Target：是否列出旧 helper、旧 alias、旧 state 字段、旧 service method、旧 wrapper、旧 direct import，或明确说明本 PR 不声称 debt reduction。
7. Boundary Impact：是否避免新增 UI -> browser/infrastructure、domain -> UI/service、service passthrough；composition root 例外是否明确。
8. Tests Required：删除兼容 surface 后是否包含 behavior-equivalence coverage。

如果任何 gate 缺 evidence 或只是占位，输出 CHANGES_REQUIRED。
```

## Required PR Review Packet

Send all of this before asking for review:

- PR URL, branch, head SHA, and base branch.
- Diffstat and changed-file list split into production/tests/docs/scripts/workflows.
- PR body.
- Approved plan text or plan path plus relevant excerpt.
- Local verification output copied from the commands actually run.
- Reviewer gate output from `skills/metronome_reviewer.md`.
- CodeScene summary or explicit note that CodeScene is not connected.

If any item is missing for a production-source PR, fix the packet before review.

## PR Review Prompt

```text
你是 metronome 项目的最终 PR hard gate。请审证据，不要只审功能是否能跑，不要替 PR 补证据。

请按照 Common Output Contract 输出，并只允许这些 verdict：
- PASS
- PASS_WITH_NITS
- CHANGES_REQUIRED

必须验证这些 Gate，并在 Evidence Checked 表里逐项给 pass/fail/not applicable 和证据：
1. Reuse Proof：是否被 diff 支持；已有 primitive/library、搜索词、已读文件、reuse/extract/no-go decision 是否具体。
2. Retired Surface：旧 helper、alias、state 字段、service method、wrapper、direct import 是否真的删除/收窄；旧调用点是否迁移。
3. New Surface / Net Surface Delta：每个新 helper/service/type/component 是否有 why-not-reuse 和 same-PR old surface；Net surface delta 是否与 diff 一致。
4. Shared Primitive Two-Call-Site Rule：shared primitive/controller/service/presenter/helper 是否至少迁移两个旧调用点并让旧实现消失；少于两个时是否有全仓搜索证据且没有声称 debt reduction。
5. Boundary Delta：是否没有新增 UI -> browser/infrastructure、domain -> UI/service、service passthrough；composition-root 例外是否明确。
6. Agent Gate Evidence：是否看到 PLAN_READY、CODE_READY、reviewer PASS/PASS_WITH_NITS，以及本次 ChatGPT verdict 之前的 reviewer output。
7. Behavior-Equivalence Tests：是否覆盖 retired compatibility surface；不能只是更新旧测试或 snapshot。
8. Static Gates：validate:debt-gates、lint:debt:changed、lint:xo:changed、lint、typecheck、test:unit、build 是否真实通过。
9. Cleanup Integrity：是否没有 later cleanup、兼容旧入口不退休、wrapper 叠 wrapper、或 N/A/TODO/占位证据。

如果任何 gate 缺 evidence，输出 CHANGES_REQUIRED。
```

## Verdict Handling

- Plan `PASS`: coding may proceed.
- Plan `PASS_WITH_CHANGES`: apply required plan changes, resend the full plan, and wait for a new verdict.
- Plan `CHANGES_REQUIRED`: do not code.
- PR `PASS`: PR may proceed if local verification and CI are green.
- PR `PASS_WITH_NITS`: PR may proceed only if nits are non-blocking and no evidence is missing.
- PR `CHANGES_REQUIRED`: do not mark ready, merge, or continue to the next stage.
