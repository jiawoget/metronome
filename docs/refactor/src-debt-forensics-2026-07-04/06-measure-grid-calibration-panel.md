## Source Debt Forensics: `measure-grid-calibration-panel`

Status: complete
Target: `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx`
Method: CodeScene baseline + static source reading, no product-code edits
Excluded: all `tests/**`, `*.test.*`, `*.spec.*`

## 文件概况

目标文件是一个单文件客户端控制面板。它不只是渲染四个表单字段和两个按钮，还在同一个文件里承接了默认值归一化、字符串草稿解析、domain 校验影子实现、异步加载、保存编排、状态徽章计算、以及和播放时间戳的联动。

- 文件总长约 `540` 行，主导出组件 `MeasureGridCalibrationPanel` 位于 `215-540`。
- 组件前面内嵌了 `10` 个本地 helper，覆盖 time-signature 支持判断、整数草稿解析、默认值创建、草稿校验、grid equality、状态映射与 badge class 选择，见 `51-213`。
- 组件内部同时维护 `draft`、`savedGrid`、`loadedSheetId`、`loadState`、`saveState`、`errorMessage` 六套状态，并再派生 `effectiveLoadState`、`effectiveDraft`、`effectiveSavedGrid`、`validation`、`status`、`canSave` 等计算值，见 `224-302`。
- 它既接收抽象的 `MeasureGridService`，又直接把 `browserMeasureGridService` 设为默认实现，见 `19-20,47,221`。
- 它还消费父层传入的 `currentTimestampMs`，把“当前播放时间”直接折算成 `measureOneOffsetMs`，见 `46,288-291,498-503`。
- 本次取证额外阅读的同域源码文件：
  - `src/domain/practice/measure-grid/index.ts`
  - `src/domain/practice/segments/index.ts`
  - `src/domain/music/meter-policy.ts`
  - `src/lib/quick-metronome/control.ts`
  - `src/lib/quick-metronome/types.ts`
  - `src/services/measure-grid/types.ts`
  - `src/services/measure-grid/service.ts`
  - `src/services/measure-grid/validation.ts`
  - `src/services/measure-grid/browser.ts`
  - `src/infrastructure/db/browser-measure-grid-service.ts`
  - `src/components/sheet-practice/controls/practice-control-state.ts`
  - `src/components/sheet-practice/controls/metronome-settings-panel.tsx`
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx`
  - `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx`

## CodeScene 基线

项目上下文：

- `select_project` 返回默认锁定项目 `82174`，来源是 `CS_DEFAULT_PROJECT_ID`。

文件级基线：

| 项目 | 结果 |
|---|---|
| `code_health_score` | `6.88` |
| Code Health 区间 | 黄区，已经是明确技术债 |
| `code_health_review` 主要发现 | `Overall Code Complexity`、`Complex Method`、`Complex Conditional`、`Large Method` |
| 重点函数 | `MeasureGridCalibrationPanel` (`215-540`)、`validateDraft` (`111-170`) |
| project hotspot | `list_technical_debt_hotspots_for_project_file` 返回空数组；当前不在项目热点名单中 |
| 项目扫描排位 | 在 `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md:35-36` 里列为 `rank 6`，但 `In project hotspots = no` |

CodeScene 细项摘要：

- 顶层组件 `MeasureGridCalibrationPanel` 被标成 `Complex Method`，`cc = 34`，同时还是 `Large Method`，LoC `307`，位置 `215-540`。
- `validateDraft` 被标成 `Complex Method`，`cc = 15`，位置 `111-170`。
- `validateDraft` 的复杂条件集中在 `119`、`123`、`139-143`。
- `getStatus` 也命中了复杂条件，位置 `196`。

CodeScene 辅助链接：

- Hotspots: [CodeScene hotspot view](https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots)

## 语义重复

这里更明显的不是 copy-paste，而是“名字不同，但同一业务语义被重复承载”。

| 重复簇 | 本文件证据 | 对照证据 | 取证结论 |
|---|---|---|---|
| measure-grid 字段约束重复 | `validateDraft` 手写 `bpm` 的 `30-300`、`pickupBeats < numerator`、`measureOneOffsetMs >= 0`、supported time signature 检查，见 `111-169` | `src/domain/practice/measure-grid/index.ts:43-60,72-74` 已定义同一套 `measureGridSchema` 与 `validateMeasureGrid` | UI 和 domain 各维护一份 grid 合法性语义；不是同名函数，但校验规则基本同构 |
| 保存链路上的重复校验 | 本文件先手写校验，再调用 `validateMeasureGrid` 产出 `grid`，见 `139-155,312-317` | `src/services/measure-grid/service.ts:11-17` 保存前再次 `validateMeasureGrid`；`src/infrastructure/db/browser-measure-grid-service.ts:58-66` repository 层又校验一次 | 单次 save 流程在 UI、service、repository 三层各跑一次近似相同的 grid 校验语义 |
| time-signature 支持判断重复包装 | 本文件本地 `isSupportedTimeSignature` 只是转调 `isQuickMetronomeTimeSignature`，见 `51-55` | `src/components/sheet-practice/controls/practice-control-state.ts:22-24` 还有同名本地包装；`src/lib/quick-metronome/control.ts:57-60` 又只是转调 `src/domain/music/meter-policy.ts:7-8` | 同一个 predicate 被包了多层、起了多次局部名字，说明支持判断语义在多个边界都各自存在 |
| grid equality 语义重复 | 本文件 `gridsEqual` 逐字段比较 `bpm/timeSignature/pickupBeats/measureOneOffsetMs`，见 `172-182` | `src/domain/practice/segments/index.ts:125-133` 的 `getMeasureGridVersion` 用同四个字段形成 canonical version | 这是相同“grid 身份/等价性”的两套表达方式：一套在 UI，一套在 domain |
| 默认值归一化重复 | 本文件 `createDefaultDraft` 自己决定 default BPM/time signature 是否可用，见 `84-108` | `src/components/sheet-practice/controls/practice-control-state.ts:32-50` 已有 `createSheetPracticeControlInitialState`；父组件又把其 `initialState.settings` 作为 `fallbackSettings` 传回本面板，见 `src/components/sheet-practice/controls/sheet-practice-controls.tsx:230-235,1401-1405` | 相同的“从 sheet 默认值退回到受支持 metronome defaults”语义，在父层和子层各跑一遍 |

## 可删候选

这里列的是“强候选”，不是已证实可立即删掉的死代码。没有运行时和调用图证据时，不把它们直接定性成已死路径。

### 已确认没有的项

- 没有从静态源码直接证明的“绝不会执行”的硬死分支。

### 强候选

| 候选 | 类型 | 证据 | 取证判断 |
|---|---|---|---|
| 双份错误提示渲染块 | 重复包装 | `528-537` 在 `effectiveLoadState === "error"` 和 `!== "error"` 两个条件下渲染完全相同的 `<p role="alert">` 结构 | 这是可直接合并的重复 UI 包装，保留两个分支只是在复制模板 |
| 本地 `isSupportedTimeSignature` | 重复包装 / 历史残留 | `51-55` 只是 `return isQuickMetronomeTimeSignature(value);` | 这种一级转调 wrapper 没有新增语义，像是早期封装习惯留下的局部别名 |
| `loadedSheetId` + `effective*` 三件套 | 可合并状态 / 重复包装 | `236,280-282` 用 `loadedSheetId === sheetId` 分别包住 `loadState`、`draft`、`savedGrid` | 同一个“当前载入结果是否仍属于当前 sheet”守卫被拆成状态字段和三个平行派生值 |
| `defaultBpm/defaultTimeSignature/fallbackSettings` 三源默认值 | 历史残留 / 可合并输入 | props 定义见 `41-49`，默认值归一化见 `84-108`，父层传值见 `src/components/sheet-practice/controls/sheet-practice-controls.tsx:230-235,1401-1405` | 子组件同时依赖原始 defaults 和已归一化 fallback，像是演进过程中没有回收干净的双源输入 |
| `gridsEqual` 本地比较器 | 重复包装 | `172-182` | 仓内已存在 `getMeasureGridVersion` 这种 canonical grid identity 表达；本地再写一份字段比较，属于重复包装候选 |

## 过度复杂点

| 复杂点 | 证据 | 复杂来源 |
|---|---|---|
| 顶层组件已经是长方法 | `215-540`；CodeScene 标注 `cc = 34`、LoC `307` | 单个组件同时承担加载、草稿、校验、保存、状态展示和表单渲染 |
| `validateDraft` 是条件矩阵 | `111-170`，尤其 `119-145` | 它既做字符串解析，又做字段边界检查，还做 domain-level validate，再把失败映射回字段错误 |
| 异步加载防抖是隐式状态机 | `243-282` | 同时使用 `isActive` 局部标志和 `loadedSheetId === sheetId` 派生门控，说明 stale request 防御不是一层，而是两层拼接 |
| 状态徽章依赖 validator 内部产物 | `185-201,283-299` | `status` 不直接看原始 draft，而是依赖 `validation.grid`、`validation.hasOffset`、`savedGrid` 和 `gridsEqual` 的联动结果；这形成了隐式耦合 |
| grid BPM 规则和 metronome fallback 规则交叉 | 本文件把 grid BPM 视为 `30-300`，见 `23-24,119-120`；但父层 fallback settings 源自 metronome defaults，而 metronome `MAX_BPM = 240`，见 `src/lib/quick-metronome/types.ts:11-13` 与 `src/components/sheet-practice/controls/practice-control-state.ts:43-47` | 一个 panel 内混入了两套 BPM 政策域；这不是 bug 证据，但确实提高了理解和审查成本 |
| “当前播放时间 -> 校准偏移”把表单和运行态耦在一起 | `288-291,498-503` | 这个表单不是单纯 CRUD，它依赖播放控制流的实时状态，增加了行为解释成本 |

## 现成库 / 现有仓内原语本可复用但被重造的点

| 已存在原语 | 本文件重造点 | 证据 | 取证结论 |
|---|---|---|---|
| `measureGridSchema` / `validateMeasureGrid` | 本地 `validateDraft` 再写一遍字段合法性 | `src/domain/practice/measure-grid/index.ts:43-74` 对照 `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx:111-169` | UI 没有只做 UX error projection，而是把 domain 约束本身也重造了一份 |
| `getMeasureGridVersion` | 本地 `gridsEqual` | `src/domain/practice/segments/index.ts:125-133` 对照 `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx:172-182` | 仓内已经有 canonical grid identity 原语，本文件再次手写四字段相等规则 |
| `createSheetPracticeControlInitialState` / `parseTimeSignature` / `clampBpm` | 本地 `createDefaultDraft` 与 `isSupportedTimeSignature` | `src/components/sheet-practice/controls/practice-control-state.ts:32-50`、`src/lib/quick-metronome/control.ts:27-33,49-60` 对照 `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx:51-55,84-108` | 默认值和支持集判断已经在 sibling control primitive 里存在，但这里又自己维护一套 |
| `LabeledSelect` 共享 UI 原语 | time-signature 下拉框使用手写 `label + select` | `src/components/sheet-practice/controls/metronome-settings-panel.tsx:169-177` 对照 `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx:400-423` | 仓内已有表单控件 primitive，但该面板仍采用局部拼装方式 |
| `MeasureGridService` 的保存验证职责 | 本地 save 前再次做全量 validation snapshot | `src/services/measure-grid/service.ts:11-17` 对照 `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx:312-326` | 即便考虑 UX 需要，本文件仍然把 service 已承担的 validate-save 边界又拉回了 UI |

## 边界混用

这份债的核心之一不是“某个 if 很长”，而是多个边界在同一个 client component 里同时出现。

| 边界混用 | 证据 | 说明 |
|---|---|---|
| UI + browser adapter | 导入 `browserMeasureGridService` 并设为默认 prop，见 `19-20,221`；其实现来自 `src/services/measure-grid/browser.ts:1`，再落到 `src/infrastructure/db/browser-measure-grid-service.ts:74` | 组件不只是知道 service 接口，还知道浏览器侧具体实现入口 |
| UI + service orchestration | `243-278` 直接编排 `getGrid(sheetId)` 的加载流，`312-339` 直接编排 `saveGrid(sheetId, grid)` 的保存流 | 这已经不是单纯表单 view，而是本地 feature controller |
| UI + domain | 组件直接导入 `getTimeSignatureParts`、`validateMeasureGrid`、`MeasureGrid`，并在 `111-182` 内构造与比较 domain entity | UI 不只消费 domain 结果，它还重做了 domain 合法性与实体等价性逻辑 |
| UI + repository / persistence chain | 组件的默认服务链最终落到 Dexie repository，见 `src/infrastructure/db/browser-measure-grid-service.ts:23-31,51-74` | 即使组件没有直接 import Dexie，它对“浏览器持久化默认实现”的认知已经进入了 UI 边界 |
| UI + playback controller | `currentTimestampMs` 作为 prop 输入，`288-291,498-503` 把运行态播放时间直接写入 grid offset | 校准面板同时依赖静态配置和运行态 transport 数据，边界并不纯粹 |

## 债务成因取证

从源码形态看，这些债更像多轮功能叠加后的沉积，而不是一次性的粗心写法。

1. 这个面板明显采用了“在 client component 内就地闭合一个 feature slice”的做法。helper、load/save orchestration、render 全部共存于一个文件，导致职责很自然地持续外扩。
2. domain / service 已经提供了 validate 和 normalize 原语，但它们返回的是 parse/throw 语义；为了做逐字段错误提示，开发过程里又在 UI 端补了一套字符串草稿校验。时间一长，这套 UX 校验不再只是“提示层”，而是逐渐复制了 domain 规则本身。
3. 父层 `sheet-practice-controls.tsx` 已经拥有 metronome 初始状态与播放时间戳，但子面板仍保留自己的默认值归一化与加载保存控制器，说明这个功能更像是后接进来的独立小面板，而不是从一开始就纳入统一控制流。
4. sibling 文件已经存在类似模式。`practice-segment-selector-panel.tsx` 同样采取“本地 draft + validate + service orchestration + error state”的结构，见 `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:278-292,316-423,559-631`。这会让这种模式看起来像 repo 既有风格，而不是待收敛的债。
5. CodeScene 视角下它不是项目 hotspot，只是 file scan 的第 `6` 位目标，见 `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md:28-39`。这种“复杂但不够热”的文件最容易在迭代中继续积累债务。

## 审查漏检取证

这里关注的是为什么此前的 coding agent / review agent / ChatGPT review 循环容易放过它，而不是现在应该怎么改。

1. CodeScene 热点导向会先把注意力拉去别处。项目 hotspot 当前是 `sheet-practice-controls.tsx` 和 `recordings-review-experience.tsx`，见 `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md:12-19`；本文件虽然上榜，但不是 hotspot，见 `35-36`。优先级天然靠后。
2. CodeScene 对它给出的直接信号是 `Complex Method / Complex Conditional / Large Method`，这些更像“复杂度警报”，不会自动指出“校验语义和 domain/service 已重复三层”这种跨文件债。
3. 大部分债不会立刻打坏功能。表单仍可加载、显示错误、保存成功，review 更容易停留在“行为通了”，不容易继续追问“为什么同一合法性规则在三层重复出现”。
4. 很多问题必须横向对照多个文件才显形：例如 `createDefaultDraft` 只有放到 `practice-control-state.ts` 和 `sheet-practice-controls.tsx` 旁边看，才会发现默认值管线重复；`gridsEqual` 只有对照 `getMeasureGridVersion` 才会暴露重复身份语义。差分式 review 很难自动做到这一步。
5. 仓内已有相邻面板采用近似写法，特别是 `practice-segment-selector-panel.tsx`。当同一模式已经存在时，后续审查更容易把它当作“与现有风格一致”，而不是新债。

## 证据清单

| 文件 | 行号 | 证据 |
|---|---|---|
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `19-20,221` | UI 组件直接绑定 browser measure-grid service 默认实现 |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `51-55` | 本地 `isSupportedTimeSignature` 只是上层 wrapper |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `84-108` | 本地重新做 default BPM / time-signature 归一化 |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `111-169` | 本地手写 grid 字段校验与错误映射 |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `172-182` | 本地 `gridsEqual` 手写四字段相等判断 |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `234-241,280-302` | 一个面板内维护多套 load/save/draft/error 状态并再派生 `effective*` 包装 |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `243-278` | 单个 effect 编排 async load、state reset、error mapping、stale guard |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `312-339` | save 流中再次做 validation snapshot，再调 service 保存 |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `498-503` | 播放时间戳被直接转成 `measureOneOffsetMs` |
| `src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx` | `528-537` | 同一错误提示模板被复制成两份互斥分支 |
| `src/domain/practice/measure-grid/index.ts` | `43-60,72-74` | domain 已有 measure-grid schema 与 validate 原语 |
| `src/domain/practice/segments/index.ts` | `125-133` | 仓内已存在 canonical grid identity 表达 `getMeasureGridVersion` |
| `src/domain/music/meter-policy.ts` | `7-8` | 最底层 time-signature 支持判断已存在 |
| `src/lib/quick-metronome/control.ts` | `27-33,49-60` | sibling primitive 已有 BPM clamp 与 time-signature parsing/support wrapper |
| `src/lib/quick-metronome/types.ts` | `11-13` | metronome policy 的 `MAX_BPM = 240`，与本文件 grid `MAX_GRID_BPM = 300` 形成双政策域 |
| `src/services/measure-grid/service.ts` | `11-17` | service 保存前再次验证 grid |
| `src/infrastructure/db/browser-measure-grid-service.ts` | `23-31,51-74` | 默认 browser adapter 最终落到 Dexie repository，并在 repository 再次验证 grid |
| `src/components/sheet-practice/controls/practice-control-state.ts` | `22-24,32-50` | sibling control primitive 已有 time-signature wrapper 和 default-state 归一化 |
| `src/components/sheet-practice/controls/metronome-settings-panel.tsx` | `169-177` | 仓内已有共享 `LabeledSelect` 形式的 time-signature UI primitive |
| `src/components/sheet-practice/controls/sheet-practice-controls.tsx` | `230-235,1401-1407` | 父层已先算 `initialState.settings`，又把它作为 `fallbackSettings` 传给本面板 |
| `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx` | `278-292,316-423,559-631` | sibling 面板也采用本地 draft/load/save/controller 模式，说明这类债有模式性 |
| `docs/refactor/src-debt-forensics-2026-07-04/00-project-codescene-scan.md` | `12-19,28-39` | 本文件在项目扫描中入选，但不是热点，解释了优先级为何长期偏低 |

## 结论

这份债的核心不是某一行代码写错，而是 `measure-grid-calibration-panel.tsx` 已经演化成一个混合型 panel controller：

- 它同时持有 UI、domain 校验影子实现、service orchestration、browser adapter 默认绑定、以及运行态时间戳耦合。
- 同一组 measure-grid 合法性、默认值、等价性语义在 UI、service、repository、sibling primitives 之间重复出现。
- CodeScene 已经把它标成黄区复杂文件，但因为不是项目 hotspot，这类“能工作、但语义重复和边界混用不断增长”的债更容易在多轮审查中被当成功能性增量而漏掉。

本报告到此为止，不包含 remediation plan，也不包含测试计划。
