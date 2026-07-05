## Source Debt Forensics: `practice-segment-selector-panel`

Status: complete
Target: `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`
Method: read-only forensics, no product-code edits
Excluded: all `tests/**`, `*.test.*`, `*.spec.*`

## 文件概况

目标文件是一个单文件复合面板，既负责 UI 展示，也负责异步加载、表单校验、保存/删除编排、录音工作流失效处理、以及与 browser adapter 的默认绑定。

- 文件总长约 `1042` 行，主导出组件 `PracticeSegmentSelectorPanel` 位于 `254-1042`。
- 组件前面还内嵌了 `13` 个本地 helper，包括格式化、状态映射、草稿解析、草稿校验、ID 生成、错误规整等，见 `95-248`。
- 组件内部同时维护 `loadResult`、`selectedSegmentKey`、`editor`、`confirmingDeleteId`、`mutationState`、`mutationErrorMessage`、`returnSegmentMessage`，并额外依赖 `currentSheetIdRef`、`appliedInitialSegmentKeyRef` 两个 ref 兜底异步一致性，见 `272-292`。
- 读过的同域源码文件如下：
  - `src/domain/practice/segments/index.ts`
  - `src/services/practice-segments/types.ts`
  - `src/services/practice-segments/service.ts`
  - `src/services/practice-segments/validation.ts`
  - `src/infrastructure/db/browser-practice-segment-service.ts`
  - `src/services/measure-grid/types.ts`
  - `src/services/measure-grid/service.ts`
  - `src/infrastructure/db/browser-measure-grid-service.ts`
  - `src/stores/sheet-practice-recording-workflow-store.ts`
  - `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx`

## CodeScene 基线

项目上下文：

- `select_project` 返回默认锁定项目 `82174`，来源是 `CS_DEFAULT_PROJECT_ID`。

文件级基线：

| 项目 | 结果 |
|---|---|
| `code_health_score` | `6.31` |
| Code Health 区间 | 黄区，已是明确技术债，不是绿区 |
| `code_health_review` 主要发现 | `Bumpy Road Ahead`、`Deep, Nested Complexity`、`Complex Method`、`Complex Conditional`、`Large Method` |
| 重点函数 | `PracticeSegmentSelectorPanel.saveEditor` (`559-631`)、`validateSegmentDraft` (`184-234`)、`deleteSegment` (`633-670`) |
| project hotspot | 文件级 `list_technical_debt_hotspots_for_project_file` 返回空数组；该文件当前不在项目热点名单中 |
| file-level goal | `list_technical_debt_goals_for_project_file` 返回空 goals |

CodeScene 细项摘要：

- 顶层组件上下文被标成 `Complex Method`，`cc = 49`，位置 `254-478`。
- `saveEditor` 同时被标成 `Bumpy Road Ahead`、`Deep, Nested Complexity`、`Complex Method`，位置 `559-631`。
- `validateSegmentDraft` 被标成 `Complex Method` 与 `Complex Conditional`，位置 `184-234`。
- `deleteSegment` 被标成 `Complex Method`，位置 `633-670`。

CodeScene 辅助链接：

- Hotspots: [CodeScene hotspot view](https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots)
- Biomarkers: [CodeScene biomarkers view](https://codescene.io/projects/82174/jobs/6844258/results/code/biomarkers?name=src/components/sheet-practice/segments/practice-segment-selector-panel.tsx)

## 语义重复

这里的重复不是“同名复制粘贴”，而是“名字不同，但重复承载了同一套业务语义”。

| 重复簇 | 本文件证据 | 对照证据 | 取证结论 |
|---|---|---|---|
| 表单字段校验语义重复 | `validateSegmentDraft` 手写 `name` 长度、`targetBpm` 范围、`notes` 长度、trim/null 规约，见 `184-233` | `src/domain/practice/segments/index.ts:35-70,79-100` 已定义 `practiceSegmentNameSchema`、`practiceSegmentTargetBpmSchema`、`practiceSegmentNotesSchema` 与 validate/parse 原语 | 同一套 segment 字段约束在 UI 和 domain 各维护一份，名称不同但语义完全重叠 |
| 数字字符串草稿解析模式重复 | 本文件有 `isValidIntegerString`、`parsePositiveIntegerDraft`、`parseOptionalTargetBpmDraft`，见 `146-171` | `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx:57-69,111-170` 另起一套 `isValidIntegerString`、`parseIntegerDraft`、`validateDraft` | 两个相邻面板都在本地重造 “string draft -> parsed domain fields -> error map” 模式 |
| 同域编辑面板骨架重复 | 本文件用 `createDraftFromSegment`、`updateEditorDraft`、`saveEditor`、本地错误状态、按钮禁用、输入控件拼接编辑流，见 `174-233,516-631,744-896` | `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx:75-82,111-170,234-340,372-517` 有对应的 `createDraftFromGrid`、`updateDraft`、`saveGrid`、本地错误状态、控件布局 | 不是代码拷贝，但属于同一 UI 控制器模板在 sibling panel 中各写一遍 |
| rerecord/source-segment 失效规则重复 | 本文件在初始返回段恢复、刷新后缺失、保存后缺失、删除后缺失时，反复执行 `setActiveRecordingSegment(..., null)` + `invalidateRerecordSource(..., reason)`，见 `344-360,400-408,507-510,612-615,653-656` | `src/components/sheet-practice/controls/sheet-practice-controls.tsx:428-520,1000-1058,1147-1179` 对 missing/mismatch/invalid/selection-changed 做了另一套近似判断与同类状态推进 | 同一录音工作流语义分散在 selector panel 与 controls 两处，业务规则被双写 |
| 错误信息降级逻辑重复 | 本文件 `getUnknownErrorMessage` 负责 `Error.message` 和 fallback 二选一，见 `244-246` | `src/components/sheet-practice/controls/sheet-practice-controls.tsx:175-179` 的 `getSessionWriteFailureMessage` 是同型逻辑 | 轻量重复，但它说明“错误规整原语”也在多组件内各自存在 |

## 可删候选

读源码能确认的是“候选”，不是已证实可安全删除的死代码。没有运行时与调用链证据时，不把它们定性成已死路径。

### 已确认没有的项

- 没有从源码直接证明的“完全无人到达”死分支。

### 强候选

| 候选 | 类型 | 证据 | 取证判断 |
|---|---|---|---|
| `GridLoadState` 单独类型别名 | 可合并状态/重复包装 | `34-35` 同时定义 `LoadState` 与 `GridLoadState`，值域完全相同 | 更像曾经准备分化、最后没有分化完成的状态别名残留 |
| `sheetId` 被四套状态同时携带 | 可合并状态 | `39-52` 的 `loadResult.sheetId`，`49-52` 的 `SelectedSegmentKey.sheetId`，`272` 的 `currentSheetIdRef`，`273` 的 `appliedInitialSegmentKeyRef` | 同一“当前 sheet 作用域”被 state/ref 多点携带，是典型历史补丁累积痕迹 |
| 清空 mutation 错误的重复小包装 | 重复包装 | `516-528,531-543,545-557,762-765,885-888,991-993` 多处手工 `setMutationErrorMessage(null)` | 行为很轻，但重复出现，说明交互状态清理没有收口点 |
| 名称长度 `120` 的输入上限 | 历史残留 | `194-195` 校验上限是 `80`，但 `781` 仍保留 `maxLength={120}` | 这是明确的 UI/领域约束漂移，通常来自旧限制未回收 |
| Active summary 与 list row 的展示拼装 | 重复展示块 | `947-949` 与 `1015-1026` 都重复调用 `formatMeasureRange`、`formatTargetBpm`、状态 label/class 组合 | 不是死代码，但属于重复展示包装，维护时需要双点同步 |

## 过度复杂点

| 复杂点 | 证据 | 复杂来源 |
|---|---|---|
| 初始加载 effect 过载 | `316-423` 同时做 segments/grid 并发加载、initial segment 恢复、store side effect、error mapping、selection 修复、return message 推进 | 单个 effect 承担了“读模型加载 + 业务校正 + UI 状态迁移”三类职责 |
| `saveEditor` 是实际的小状态机 | `559-631` | 函数里同时处理 create/edit 分岔、grid 前置条件、existing segment 校验、save、refresh、selection 修复、workflow 失效、error/finally 收尾 |
| 选择状态与返回来源恢复是三态哨兵逻辑 | `331` 的 `SelectedSegmentKey | null | undefined`，以及 `387-409` 的分支 | 这里不是简单 boolean，而是“未决定 / 有值 / 明确清空”三态驱动，阅读成本高 |
| “loading” 被映射成业务状态 “missing-grid” | `138-143` | UI 加载阶段与领域状态阶段被复用同一枚举，导致“未加载完成”和“确实缺失 grid”共享一个状态槽 |
| 组件主体本身过大 | CodeScene 标注 `254-478` 为 `cc=49` 顶层复杂方法；整文件到 `1042` 行 | 复杂度不是出在某一个 if，而是多套职责长期共存 |
| 删除流仍需回写 workflow 失效 | `633-669` | 删 segment 不只是删数据，还要回写 editor、selection、recording workflow，表明删除动作已跨越多个边界 |

## 现成库 / 现有仓内原语本可复用但被重造的点

| 已存在原语 | 本文件重造点 | 证据 | 取证结论 |
|---|---|---|---|
| domain segment schema 与 validate/parse 原语 | 本地 `validateSegmentDraft` | `src/domain/practice/segments/index.ts:35-70,79-123` 对照 `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:184-233` | UI 没有复用 domain 的字段约束定义，而是自己再写一套 UX 校验版本 |
| service 层 sheetId/segmentId/name normalize 规则 | 本文件本地 trim 与 edit/save 判定 | `src/services/practice-segments/validation.ts:3-18`, `src/services/practice-segments/service.ts:23-52` 对照 `184-233,576-595` | 规则分布在 domain、service、UI 三层，各层都有一部分判断 |
| 专门的 recording workflow store | 本文件直接组合多个 store action 拼接状态迁移 | `src/stores/sheet-practice-recording-workflow-store.ts:199-287` 对照本文件 `263-270,344-360,400-408,507-510,609-615,653-656,926-929` | store 只暴露原子动作，没有收口成高层 segment-selection transition；于是 UI 继续手写迁移 |
| sibling panel 的通用编辑面板模式 | 本文件本地自管 draft/load/save/error 体系 | `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx:111-170,234-340` 对照本文件 `184-233,278-292,516-631` | 仓内已有相似控制器结构，但没有沉淀成可复用 panel/form primitive |

## 边界混用

这是本文件最明显的债务之一，不是某个 if 太长，而是多个边界在一个客户端组件里直接交叉。

| 边界混用 | 证据 | 说明 |
|---|---|---|
| UI + browser adapter | 导入 `browserPracticeSegmentService`、`browserMeasureGridService` 作为默认 props，见 `13-16,257-258` | 组件本身知道浏览器基础设施实现，而不只是知道服务接口 |
| UI + domain entity construction | `saveEditor` 内直接调用 `createPracticeSegmentGridAssociation(effectiveGrid)`，见 `590-595` | UI 在拼装可持久化 segment 实体，而不是只提交 view model |
| UI + workflow state machine | 多处调用 `setActiveRecordingSegment`、`invalidateRerecordSource`，并决定 `sheet-mismatch` / `source-segment-missing` 等原因，见 `344-360,400-408,507-510,609-615,653-656,926-929` | 这已经不是纯 selector UI，而是在驱动录音工作流状态机 |
| UI + async race control | `currentSheetIdRef`、`appliedInitialSegmentKeyRef`、`loadResult.sheetId`、`selectedSegmentKey.sheetId` 共同承担 stale request 防御，见 `272-273,278-292,425-432,479-514` | 组件承担了协调器/控制器层职责 |
| UI + identifier policy | `createSegmentId` 在组件内生成实体 ID，见 `236-242` | 说明“实体创建策略”也放在了界面层 |

## 债务成因取证

从源码形态看，这些债不是一次性设计失误，更像多轮增量功能叠加后的沉积。

1. 这个文件大概率不是从一开始就想做成“segment 控制器”，而是从一个选择器面板逐步长出 create/edit/delete、return segment 恢复、measure-grid gating、录音工作流联动等职责。`316-423` 和 `559-669` 的累积痕迹最明显。
2. 同域 sibling `measure-grid-calibration-panel` 也采用“组件自带 draft parser + validate + service orchestration”的结构，说明当时的开发风格是就地在 client component 内完成 feature slice，而不是先沉淀 shared primitive。
3. recording workflow store 只提供原子动作，不提供“segment 选中/失效/恢复”的高层过渡，因此 selector panel 与 controls 都各自拼接业务规则，导致同一语义在两个组件各长一份。
4. CodeScene 维度上，这个文件目前不是 project hotspot，意味着它更像“局部复杂度被不断累加，但还没进入高频修改名单”的债；这种债最容易长期滞留。

## 审查漏检取证

这里关注的是“为什么之前的 coding agent / review agent / ChatGPT review 循环没有把它抓出来”，不是“现在应该怎么改”。

1. CodeScene 项目热点天然会把注意力吸走。`docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md:14-15` 显示项目 hotspot 是 `sheet-practice-controls.tsx` 和 `recordings-review-experience.tsx`；本文件在同一文档里被标成 `rank 2` 但 `In project hotspots = no`，见 `31`。这意味着审查流若优先看热点，本文件容易被排到次级目标。
2. 这份债务多数是“语义重复”和“边界扩散”，不是显性的功能 bug。行为上它仍然能工作，review 更容易确认“功能通了、错误提示有了、按钮状态也对了”，不容易在没有对照文件的情况下识别重复。
3. 录音工作流规则跨 `practice-segment-selector-panel` 和 `sheet-practice-controls` 分散，review 若只看单文件 diff，很容易把这些分支理解为必要防御，而不是另一个组件里已经存在过的业务判定。
4. sibling `measure-grid-calibration-panel` 已经形成了“面板内自管 parse/validate/save”的先例。这样一来，新的 selector panel 延续同样模式时，审查者会把它看成 repo 既有风格，而不是新债。
5. `maxLength={120}` 对 `80` 字符 domain 限制的漂移、`LoadState/GridLoadState` 双别名、重复清错等问题都属于“局部不一致”而不是“失败行为”，通常不会在功能验收或 AI review 摘要里自动浮出来。

## 证据清单

| 文件 | 行号 | 证据 |
|---|---|---|
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `13-17,257-258` | UI 组件直接绑定 browser adapter 默认实现与 workflow store |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `34-35` | `LoadState` 与 `GridLoadState` 值域完全相同，形成重复状态类型 |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `184-233` | 本地手写 segment 表单校验与 trim/null 规约 |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `194-195,781` | domain/validator 限制 `80` 字符，但 input 仍允许 `120` 字符输入 |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `294-423` | 单个 effect 同时完成数据加载、选择恢复、workflow side effect、错误映射 |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `479-514` | mutation 后刷新列表时再次手写 selected segment 丢失修复逻辑 |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `559-631` | `saveEditor` 兼顾 create/edit、grid 依赖、existence check、save、refresh、selection repair |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `633-669` | `deleteSegment` 除删除外还要协调 editor、selection、workflow invalidation |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `926-929` | 单击 row 直接驱动 active segment 与 return message，UI 触达 workflow 状态 |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `947-949,1015-1026` | row 与 active summary 双处重复拼接 range/BPM/status 展示 |
| `src/domain/practice/segments/index.ts` | `35-70,79-123,136-163` | domain 已有 segment 名称、BPM、notes、grid association、grid status 的合法性原语 |
| `src/services/practice-segments/service.ts` | `23-52` | service 已承担 validated segment 保存与 duplicate-name 保护 |
| `src/services/practice-segments/validation.ts` | `8-18` | service 层已有 sheetId/segmentId/name normalize 规则 |
| `src/stores/sheet-practice-recording-workflow-store.ts` | `199-287` | 录音工作流已有集中 store，但高层 segment transition 没有被封装 |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `57-69,111-170,234-340` | sibling panel 也本地维护 string draft、validate、save、error 状态，形成模式级重复 |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | `428-520` | hydrate rerecord source 时重新实现 source/segment 有效性判定 |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | `1000-1058` | validate record-again source 再次实现 selection/source/segment invalidation 规则 |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | `1147-1179` | resolve selected segment context 再次实现 missing/mismatch/invalid 判定 |
| `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md` | `14-15,31` | 项目 hotspot 聚焦别处，本文件仅在 file scan 中入选，解释了为何更容易漏检 |

## 结论

这份债的核心不是“某个函数写得丑”，而是 `practice-segment-selector-panel.tsx` 已经从一个 segment selector 演化成了一个混合型 feature controller：

- 它同时持有 UI 渲染、draft parsing、domain validation 影子实现、service orchestration、browser adapter 默认绑定、recording workflow 失效规则。
- 同一 segment/rerecord 语义同时散落在本文件、`sheet-practice-controls.tsx`、以及 sibling panel 的本地控制器模式里。
- CodeScene 没把它列为项目热点，导致它更容易在多轮以“功能通过”为主的审查链条里长期滞留。

本报告到此为止，不包含 remediation plan，也不包含测试计划。
