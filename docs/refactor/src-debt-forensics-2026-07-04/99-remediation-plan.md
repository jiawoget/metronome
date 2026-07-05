## Source Debt Forensics: Remediation Plan

Status: complete
Scope: `src` only
Excluded: all `tests/**`, `*.test.*`, `*.spec.*`
Basis: CodeScene project scan + 10 file-specific debt-forensics reports in this directory

This file is the only artifact in this batch that contains remediation guidance. The other 10 files are forensics only.

## 1. Executive Summary

这 10 个文件里的技术债不是 10 个彼此独立的小问题，而是 5 类跨文件、重复出现的结构模式：

1. UI/controller 过度增厚
   代表文件：`01-sheet-practice-controls.md`、`02-practice-segment-selector-panel.md`、`04-home-dashboard.md`、`06-measure-grid-calibration-panel.md`、`03-recordings-review-experience.md`，以及同一边界模式下的 `src/components/sheet-practice/reference/reference-panel.tsx`
   共同症状：单个组件或 hook 同时承担渲染、读模型拼装、表单校验、service orchestration、workflow state machine、默认浏览器适配器绑定。

2. practice read-model 家族横向复制
   代表文件：`05-practice-session-service.md`、`07-practice-rules.md`、`08-practice-recent-activity.md`、`09-use-practice-session-dashboard.md`、`04-home-dashboard.md`
   共同症状：session/recording 聚合骨架、target 解析、string normalize、timestamp/duration format、continue-practice 兼容包装，在 domain / service / hook / component 多层平行演化。

3. 边界没有持续收口
   代表文件：`01`、`02`、`05`、`06`、`10`
   共同症状：UI 直接知道 browser adapter；repository 直接解析 domain 值对象；service 直接拼 read-model；feature service 存在但调用方继续绕过它直连大 repository。

4. 历史兼容层和别名接口持续累积
   代表文件：`07`、`09`、`10`、`04`
   共同症状：旧的单目标 continue 包装、新旧 action 命名双轨、empty-state 占位字段、半抽出的 service/controller facade、只剩少量调用者甚至无调用者的薄包装 API。

5. CodeScene 能抓到复杂度，但抓不完横向重复
   代表文件：几乎所有报告
   共同症状：CodeScene 对单文件复杂方法、长方法、条件矩阵、重复 mutator 发出明确信号；但“同一业务语义在相邻文件分别重写”仍需要人工横向取证。

## 2. Why Current Guardrails Failed

### 2.1 Hotspot-first triage 把注意力集中到少数热点

项目级 hotspot 只有两个 `src` 文件：

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- `src/components/recordings-review/recordings-review-experience.tsx`

其余 8 个文件虽然分数已经在黄区，但都不是项目 hotspot。结果是：

- 如果 triage 只从 `list_technical_debt_hotspots_for_project` 开始，再配合 change frequency 判断优先级，这 8 个文件会自然后置。
- 它们会被长期归类为“有点复杂，但还没痛到必须拆”的对象。

### 2.2 Review loop 更偏 correctness，而不是重复/边界/残留

这 10 份取证里反复出现的模式是：

- 行为是对的
- 错误提示也在
- 状态迁移也能跑通
- 但同一业务语义在多个边界都写了一遍

这类债很难靠功能测试、人工点点点、或 diff-based AI review 自动暴露。

### 2.3 每个切片都在“局部补齐”，但没有强制 retire 旧原语

多个区域都出现了“新抽象已存在，但旧路径没有退场”的形态：

- `recordings-review` 已有 controller/service，但页面仍继续包一层本地 wrapper
- `practice-goal` 和 dashboard hook 已有新 contract，但旧 action alias 仍并存
- `continue-practice` 已有新 target family，但旧单目标 wrapper 仍留着
- `recording-history-operations.ts` 已经开始抽离 repository 职责，但剩余 mutator 没有继续收口

也就是说，我们允许“新增新抽象”，但没有同步要求“把旧抽象压缩掉”。

### 2.4 CodeScene 调用了，但没有变成强制门槛

从现有结果看，CodeScene 更多被用来：

- 看一个分数
- 看热点
- 看某个长方法

但没有变成以下强制动作：

- 新增或改动大文件时，必须附带 `code_health_review`
- 不是热点但分数进入黄区的 home/hook/domain file，也要做主动下钻
- 若出现新的 wrapper/alias/duplicate validator，review 不能只说“功能通过”

### 2.5 没有跨文件“语义重复”扫描契约

很多最贵的债都不是单文件里一眼能看出的 copy-paste，而是：

- 同一 target 解析在 `recent-activity.ts` 和 `session-comparison.ts` 平行实现
- 同一 segment/grid 表单控制器在两个 panel 中各写一套
- 同一 rerecord invalidation 语义分散在 selector panel 和 controls
- 同一 normalize/format/helper family 在 domain、service、hook、component 分别起不同名字重写

如果 review contract 不要求“找平行语义”，这些债会稳定漏过。

## 3. Cross-file Repair Strategy

修复顺序不建议按文件编号平推，而应该按“先收 guardrail，再收共享原语，再拆最痛的 orchestration”。

### Phase 0: 先补 guardrail，再动代码

目标：避免边修边继续生债。

需要新增或强化的规则：

1. 对任何 Code Health < 8.5 且涉及 `src/components/**`、`src/hooks/**`、`src/domain/practice/**`、`src/services/practice-session/**` 的改动，review 必须附带 `code_health_review` 摘要，而不能只给 score。
2. 对任何新增 wrapper、alias action、compat adapter、`normalize*`/`format*`/`validate*` helper，review 必须回答：
   - 仓内是否已有同语义原语？
   - 旧入口是否同步删除或收口？
3. 对超过约 400 LoC 的 UI component / hook / domain aggregator，禁止继续“顺手再塞一个小功能”，必须先说明为何不拆。
4. 对非-hotspot 但黄区文件，建立“二级强制下钻”规则，不允许因为“不在 hotspot”就直接放行。
5. 上述规则不能只停留在计划文本里，必须落成三个可执行入口：
   - PR checklist
   - review template
   - CI / automated review gate
6. 每个 refactor PR 必须附带 `retired surface` 清单。
   - 需要列出本次实际删除的旧 helper、旧 alias、旧 state 字段、旧 service method、旧 direct import。
   - 如果这次确实删不掉，必须明确写出阻塞原因和下一 PR 的删除承诺。
7. 任何“抽 shared primitive / controller / service / presenter”的 PR，如果没有同步迁移至少两个旧调用点并让旧实现消失，不能算技术债减少。
8. 所有“候选删除”都必须先做全仓调用点审计，不只看 `src`。
   - 至少覆盖 `src`、`tests`、必要时还要看 test helpers / docs / scripts。
   - 像 `seedRecordingHistoryForTests` 这类测试接缝，目标应是迁出生产模块或重挂 test helper，而不是不看调用点直接删。
9. 删除兼容 surface 的 PR 必须补行为等价测试，重点覆盖：
   - continue practice
   - record again
   - goal progress refresh
   - recording history persistence
   - sheet reference session side effect

### Phase 1: 先收 sheet-practice 这组 UI/controller 债

优先文件：

1. `01-sheet-practice-controls.md`
2. `02-practice-segment-selector-panel.md`
3. `06-measure-grid-calibration-panel.md`
4. `src/components/sheet-practice/reference/reference-panel.tsx`

原因：

- 这一组同时拥有高复杂度、边界混用、表单校验重造、workflow rule 双写。
- 这组文件之间已经出现明显的“同域 sibling 平行复制”。
- `ReferencePanel` 也属于同一轮 boundary debt：它默认绑定 `browserReferenceService`、`browserPracticeSessionService`、browser audio player，并直接调用 `ensureSheetSession()` / `captureSessionEvent()`。
- 如果不把 `ReferencePanel` 一起收进来，sheet-practice 的“UI 不直接编排 practice-session side effect”目标会留下一个结构性缺口。

修复方向：

1. 抽出统一的 sheet-practice panel/controller primitive
   把 string draft -> parsed domain fields -> validation errors -> save lifecycle 这一整套壳从两个 panel 中收成共享原语。
2. 抽出统一的 rerecord / selected-segment transition primitive
   让 selector panel 和 controls 不再各自拼 `invalidateRerecordSource(...)` 规则。
3. 把 browser adapter 默认绑定移出 UI component
   component 只吃接口，不直接知道浏览器实现入口。
4. 把 `ReferencePanel` 一并纳入这一轮 session/reference orchestration 收口
   让 reference side effect 也回到更薄的 use-case / controller 边界，而不是继续在 client component 里直接 `ensureSheetSession()` / `captureSessionEvent()`。
5. 明确区分 composition wrapper 和债务 wrapper
   允许保留一个很薄的 route/page composition root 负责注入 browser service，但业务组件本体不能再默认 import browser adapter。

### Phase 2: 再收 practice read-model 家族

优先文件 / 家族：

1. `05-practice-session-service.md`
2. `07-practice-rules.md`
3. `08-practice-recent-activity.md`
4. `src/domain/practice/session-comparison.ts`
5. `src/domain/practice/session-history-groups.ts`
6. `src/domain/practice/continue-practice.ts`
7. `09-use-practice-session-dashboard.md`
8. `04-home-dashboard.md`

原因：

- 这是当前仓内最明显的“同一语义横向复制带”。
- 很多债并不在某一处特别烂，而是每一层都各重写 20%-40%。
- 如果不先把 shared primitive 收回来，单拆 `home-dashboard.tsx` 只会把重复搬到更多文件里。

修复方向：

1. 先统一 normalize/format/target-resolution family
   包括 string normalize、timestamp sanitize、duration format、segment range format、target-state resolution；目标状态必须同时覆盖 `recent-activity.ts`、`session-comparison.ts`、`session-history-groups.ts`、`continue-practice.ts`，而不是只在其中一个文件新建第三套 helper。
2. 再统一 continue-practice contract
   先迁移 production contract，再删除旧 singular surface。
   - 迁移顺序应是：`service.ts` / `types.ts` -> `use-practice-session-dashboard.ts` -> `home-dashboard.tsx` -> command palette 相关消费方 -> tests。
   - `getContinuePracticeTarget()`、`continueTarget`、以及 `onSavePracticeGoal` / `onDeletePracticeGoal` 这类兼容 alias 不允许长期保留。
3. 把 practice-session service 从“browser practice facade”收回到更窄的 use-case 集合
   读模型 selector 尽量回 domain，持久化协调留 service，避免两边都做 aggregation。
4. 去掉 `continue-practice.ts` 对 `recent-activity` metadata 字符串的正则反解析
   `segmentRange` 必须走结构化字段，而不是在旧 metadata 上再叠一层 parser。
5. target-resolution shared primitive 的完成标准必须是“旧 fork 消失”
   至少同时替换 `recent-activity.ts` 和 `session-comparison.ts`，并移除 `continue-practice.ts` 对 metadata regex 的依赖；否则只是新增了第三套 target abstraction。
6. 最后再拆 home hook / home dashboard
   否则 UI 只是从一个大文件变成几个仍然共享重复 contract 的中等文件。

### Phase 3: 处理 recordings-review 的页面与 repository 双中心

优先文件：

1. `03-recordings-review-experience.md`
2. `10-recordings-review-repository.md`

原因：

- 一个是 UI orchestration brain class。
- 一个是 browser-side state center / localStorage transaction center。
- 两边都有“半抽出一层 service/controller，但旧直连路径未退场”的共病。

修复方向：

1. 页面层去掉重复 wrapper 和重复文案/metadata protocol。
2. repository 层继续沿 `recording-history-operations.ts` 的方向收口，把 selection / organization / marker / clear 逻辑按责任拆开。
3. 明确 `recordingsReviewService` 是否是唯一入口；如果是，就压缩绕过 service 的直连调用。

## 4. Deletion and Consolidation Priorities

这部分不是逐个文件全删，而是最值得优先清退的一批“低行为收益、高长期噪音”对象。

### 第一优先级：旧兼容入口

- `getContinuePracticeTarget(...)`
- `continueTarget` 镜像状态
- `onSavePracticeGoal` / `onDeletePracticeGoal` 这类 alias action
- `seedRecordingHistoryForTests` 这类生产模块内测试接缝

原因：这些接口会持续拉宽 contract 面，却很少承载核心行为价值。

执行要求：

1. `getContinuePracticeTarget(...)` 不是“先看到就删”，而是先迁移 production contract，再删 `service/type/hook/component` 的 singular 字段与方法，最后更新测试。
2. 不允许为了平滑过渡而长期保留 singular/plural 双轨 alias。
3. `seedRecordingHistoryForTests` 这类对象要先做全仓调用点审计；若 tests 仍大量依赖，优先迁到 test helper 或 test-only seam，而不是直接删除。

### 第二优先级：零行为 wrapper / 重复包装

- `target(...)` 这种只装箱、不加语义的 helper
- 本地 `isSupportedTimeSignature` 这种一级转调 wrapper
- `writeSnapshot` 这种只有一层透传意义的薄包装
- 页面层 `toggleFavorite` / `resolveRecordingOrganizationForRecord` 等重复 service/controller 语义的 wrapper

原因：这类对象不会制造即时 bug，但会放大理解成本，并掩盖“真正应该只有一个入口”的事实。

### 第三优先级：镜像 contract / 双轨状态

- `occurredAt` / `sortTimestamp`
- `loadedSheetId` + `effective*`
- dashboard/home 的镜像 empty-state 与 DTO
- 本地 state 与 store 同时描述同一 recording workflow

原因：这些双轨表达最容易在未来演化中再次漂移。

## 5. Primitive and Library Adoption Priorities

本次取证里最值得先复用、而不是继续自造的仓内原语有这些：

1. `domain/practice/segments` 的 schema / validate 原语
   不要继续在 panel 内手写 segment 字段校验。

2. `domain/practice/measure-grid` 的 schema / validate 原语
   不要让 UI、service、repository 三层各写一套近似 grid 校验。

3. `getMeasureGridVersion` / 现有 canonical identity 表达
   不要继续在 UI 本地写新的 grid equality 规则。

4. `recording-organization-metadata.ts` 的 tag normalize 原语
   不要在 repository mutator 里再写一次重复 tag 校验。

5. `recordingsReviewService` / controller hook 已经存在的边界
   新代码应该优先收敛到它们，而不是继续在页面层或 feature sidecar service 里复制包装。

6. 现有 repository subscribe/event 骨架
   不要每个 browser-state center 再发明一套事件协议。

## 6. Suggested Repair Order by Outcome

如果要在交付和风险之间取平衡，建议实际执行顺序如下：

1. 建立 review guardrail 与 CodeScene gate
   先阻止继续生新债。
2. 收 sheet-practice shared primitive
   先拿下 `SheetPracticeControls`、`PracticeSegmentSelectorPanel`、`MeasureGridCalibrationPanel`、`ReferencePanel` 这一整组 panel/controller 平行复制与 session side-effect 直编排。
3. 收 practice read-model primitive
   先统一 `recent-activity`、`session-comparison`、`session-history-groups`、`continue-practice` 的 normalize/target/format/structured field，再动 service/domain/home。
4. 拆 `home-dashboard.tsx` 和 `use-practice-session-dashboard.ts`
   这时拆出来的模块才不会只是复制旧 contract。
5. 收 recordings-review page/service/repository
   最后处理这一整块独立领域，避免同时开两片大 surgery。

## 7. Refactor PR Acceptance Gates

这些 gate 比“建议”更硬，目标是避免 shared primitive PR 最终只是多包一层。

1. 每个 refactor PR 必须列出 `retired surface` 清单。
   例如删除 `continueTarget` 字段、删除 `onSavePracticeGoal` / `onDeletePracticeGoal` alias、删除 `formatSessionComparisonMinutes()`、删除 `getContinuePracticeTarget()` singular API，或者明确说明为什么本 PR 还删不掉、下一 PR 必须删什么。
2. 每个 shared primitive 必须至少迁移两个旧调用点，并让旧实现消失。
   例如 target-resolution primitive 必须同时替换 `recent-activity.ts` 和 `session-comparison.ts`，并移除 `continue-practice.ts` 对 metadata 的 regex 反解；否则不算债务下降。
3. UI 去 browser adapter default 时，要区分 composition wrapper 和债务 wrapper。
   允许保留一个很薄的 route/page composition root，但 `SheetPracticeControls`、`PracticeSegmentSelectorPanel`、`MeasureGridCalibrationPanel`、`ReferencePanel` 这类业务组件本体不能再默认 import browser service。
4. 所有“候选删除”都要跑全仓调用点，而不是只搜 `src`。
   tests 仍在依赖的 surface，应该迁到 test helper / test seam，而不是直接砍掉。
5. 删除兼容 surface 的 PR 必须附带行为等价测试。
   特别是 continue practice、record again、goal progress refresh、recording history persistence、sheet reference session side effect 这几条高风险路径。

## 8. Review Contract Changes

后续 coding agent / review agent / ChatGPT review 如果还沿用原先心智，这批债会再次回来。建议把下面几条写成明确 contract：

1. 任何新增 helper 都要回答“为什么不能复用现有原语”。
2. 任何新增 facade / wrapper / alias 都要回答“旧入口何时删除”。
3. 任何 UI component 若直接 import browser adapter 默认实现，视为边界异常，必须解释。
4. 任何 hook / service / domain selector 若同时做 read-model 拼装和 mutation orchestration，默认视为候选拆分点。
5. AI review 不能只报 bug 和测试缺失；必须单列：
   - semantic duplication
   - compatibility residue
   - boundary mixing
   - contract widening
6. 对 CodeScene 非-hotspot 黄区文件，不能因为“不在热点”就跳过 detailed review。

## 9. Completion Note

本计划基于以下 10 份单文件债务取证：

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

建议后续每进入一个修复阶段，都先用 CodeScene 建立该阶段的 file baseline，再在阶段结束后重跑对应文件的 `code_health_review` / `code_health_score`，确认不是只把代码搬家，而是真的在降低维护成本。
