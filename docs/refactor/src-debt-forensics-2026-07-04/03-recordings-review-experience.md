# `recordings-review-experience.tsx` 债务取证

状态: complete
日期: 2026-07-05
目标文件: `src/components/recordings-review/recordings-review-experience.tsx`
取证方式: 先做 CodeScene 基线，再做静态源码阅读
范围: `src/components/recordings-review/**`, `src/lib/recordings-review/**`, `src/services/recordings-review/index.ts`
排除: 所有 `tests/**`, `*.test.*`, `*.spec.*`

本报告是债务取证，不是 remediation plan，不提供修复步骤，不提供测试计划。

## 文件概况

- 这是一个 `"use client"` 组件，但它不是单纯视图层。它同时承担了筛选、分组、跨录音比较、分组内 waveform 比较、详情查看、组织元数据编辑、音频导出、错误标记跳转、删除确认等多条交互链路。
- 物理行数为 `1534` 行；CodeScene 的 comments-stripped 结果为 `1057` LoC。
- 导入边界横跨 UI 子组件、controller hook、history/read-model helper、service 类型、browser playback controls 和 error-marker helper，说明这个文件已经是页面编排中心，而不是轻量容器。
- 读取过程中没有发现可以静态确定为“绝不会执行”的硬死代码；更明显的问题是重复包装、兼容残留、边界混用和局部状态机堆叠。

已阅读的同域源码:

- `src/components/recordings-review/recordings-review-experience.tsx`
- `src/components/recordings-review/use-recordings-review-controller.ts`
- `src/components/recordings-review/use-bounded-recording-selection.ts`
- `src/components/recordings-review/recording-comparison-panel.tsx`
- `src/components/recordings-review/recording-artifact-review.tsx`
- `src/lib/recordings-review/history.ts`
- `src/lib/recordings-review/take-groups.ts`
- `src/lib/recordings-review/take-history-summary.ts`
- `src/lib/recordings-review/recording-organization-metadata.ts`
- `src/lib/recordings-review/error-markers.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/types.ts`
- `src/services/recordings-review/index.ts`

## CodeScene 基线

- `code_health_score`: `6.33`
- `code_health_review` 直接命中四类问题:
- `Lines of Code in a Single File`: comments-stripped `1057` LoC，Brain Class 风险。
- `Complex Method`: `RecordingsReviewExperience` `cc = 17` (`75-468`)，`RecordingListItem` `cc = 21` (`888-1045`)，`getPracticeAgainAccessibleName` `cc = 13` (`1574-1595`)。
- `Large Method`: `RecordingsReviewExperience` `380` LoC，`RecordingListItem` `157` LoC。
- `Code Duplication`: `updateBestTake` / `updateActiveTake`，`toggleRecordingFavorite` / `toggleRecordingArchive`。
- 热点取证: 当前文件在项目热点里，`code_health_score = 6.3342`，`revisions = 21`，`loc = 1534`，`friction = 0.2721`，`refactoring_target = recommended-refactoring-target`。
- 热点链接: [CodeScene Hotspot](https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots)
- 文件级 debt goals 为空，没有额外 biomarker 目标把这个文件强制拉进整改队列。
- goals 链接: [CodeScene Biomarkers](https://codescene.io/projects/82174/jobs/6844258/results/code/biomarkers?name=src/components/recordings-review/recordings-review-experience.tsx)

## 语义重复

- controller 已经提供了 `toggleFavorite`、`toggleBestTake`、`toggleActiveTake`，但页面组件又本地重写了一轮语义相同的动作包装。
- `resolveRecordingOrganizationForRecord` 在本文件和 `recording-comparison-panel.tsx` 各写了一份，而且两处都绕过了 service 已暴露的 `resolveRecordingOrganization`。
- comparison selection hook 已经暴露 `isSelected` / `isDisabled`，但页面在 quick、ungrouped、take group 三个分支里仍然手写 `includes(...)` 和 “长度到上限则禁用” 逻辑。
- 录音元数据展示规则在列表行、comparison metadata card、details tile 三处分别拼装，字段名不同但语义高度重叠。
- `getPracticeAgainAccessibleName` 虽然产出的是 aria label，但它重走了一遍与 `getContinuePracticeHref` 平行的 quick/sheet/segment 分支判断。

## 可删候选

- 没有静态证据支持“确定死路径”的硬判断；本次只标可删候选，不把任何分支直接定性为 dead code。
- 重复包装候选:
- `resolveRecordingOrganizationForRecord`
- 根组件的 `toggleFavorite`
- `TakeGroupSection` 内的 `updateBestTake` / `updateActiveTake`
- `RecordingDetails` 内的 `toggleRecordingFavorite` / `toggleRecordingArchive`
- 历史兼容残留候选:
- `RecordingReviewSnapshot` 把 `recordingOrganization` 定义成 optional，同时 `emptyClientSnapshot` 不带这个字段，最终逼着消费端再做 `?? []` 兜底。
- 可合并状态候选:
- `markerMessage` 和 `markerErrorMessage`
- `selectionErrorMessage`
- `organizationErrorMessage`
- `audioExportState`
- 这些都在本文件内部各自维护一套局部反馈协议，形成多个小状态机而不是一个稳定的 view-model。
- 读模型残留候选:
- 根组件先建了 `visibleRecordingById`，但选中详情时仍然对 `visibleRecordings` 做线性 `find`；这更像旧实现路径和新实现路径并存，而不是一个收敛后的读取模型。

## 过度复杂点

- 根组件在真正 `return` 之前就先完成了 filter state、recording organization map、grouped view、visible list、comparison selection、take context map、waveform request id、selected markers、selected organization 等整套读模型装配。
- `TakeGroupSection` 同时处理标题文案、practice link、take summary、selection error、best/active 状态切换、waveform comparison 选择、waveform 数据加载、列表项渲染。
- `RecordingListItem` 不是纯展示组件，而是一个按 optional props 切换多套控制面的 feature switchboard。
- `RecordingDetails` 自带回放控制引用、marker seek 反馈、tag 输入、organization mutation 错误、audio export 生命周期、delete confirm 切换，已经是局部 workflow 容器。
- 同一屏幕里并存两套 comparison 交互模型:
- 全局 recording comparison 需要 `selected > 1`
- 分组内 waveform comparison 只要 `selected > 0`
- 这让相似概念拥有不同启用条件、不同请求 key、不同错误文案和不同状态显示。

## 现成库 / 现有仓内原语本可复用但被重造的点

- `useRecordingsReviewController` 已暴露现成动作原语，但页面没有完整复用。
- `RecordingsReviewService` 已暴露 `resolveRecordingOrganization`、`setRecordingFavorite`、`setRecordingArchived`、`setBestTake`、`setActiveTake`、`exportRecordingAudio`，但 UI 侧仍自己包 try/catch 和 toggle 语义。
- `useBoundedRecordingSelection` 已提供 `isSelected` 和 `isDisabled`，但调用侧继续展开细节。
- `history.ts` 已集中管理 practice href 和部分 display metadata 逻辑，但页面和 comparison panel 仍在本地重写相邻语义。
- `RecordingArtifactReview` 已把 playback controls 适配为稳定接口，父组件仍要继续管理 marker seek 的上下文拼装和消息状态。

## 边界混用

- UI / service 混用:
- 页面和子段落直接调用 `reviewService.setBestTake`、`setActiveTake`、`setRecordingFavorite`、`setRecordingArchived`、`addRecordingTag`、`removeRecordingTag`、`exportRecordingAudio`。
- UI / domain-read-model 混用:
- 页面自己做 `filterRecordings`、`groupRecordingsByTake`、`createTakeHistorySummary`、`resolveTakeSelection`、`sortErrorMarkers` 的编排。
- UI / browser adapter 混用:
- `RecordingDetails` 接住来自 `RecordingArtifactReview` 的 `RecordingPlaybackControls`，再把它喂给 `seekToErrorMarker` 完成浏览器端 seek。
- UI / routing 混用:
- 页面本身同时决定 `getContinuePracticeHref`、`getTakeGroupPracticeHref` 和 `Clear sheet filter` 的跳转。
- UI / persistence-compatibility 混用:
- optional snapshot 字段的兼容负担没有被 repository/controller 完全吸收，而是泄漏到了组件读模型里。

## 债务成因取证

- 这是典型的“单屏工作台持续加功能”债务。每新增一块能力时，把新链路挂进现有页面比抽象行为层更快，于是一个 orchestrator 文件持续膨胀。
- 抽取发生在“可见 UI 块”层，而不是“交互协议 / view-model / action policy”层。结果是 header、panel、review widget 被拆出来了，但真正的业务编排仍留在父文件。
- controller/service 的引入像是半途开始的收敛。新原语已经存在，但旧调用习惯没有被统一迁移，留下重复包装。
- snapshot 类型显式保留了未来字段和 optional 字段，说明实现优先考虑兼容和增量演进；代价是消费侧需要承担更多 null-guard 和解析责任。
- 两套 comparison 能力很像是分阶段接入的: 先有一套 bounded selection，再在全局比较和 take-group 比较上分别嫁接，最后变成“复用了 hook，但没有复用交互合同”。

## 审查漏检取证

- CodeScene 把它识别成 hotspot，但 file-level goals 为空，意味着依赖 goal 驱动的 review 流程时，没有额外的“必须继续下钻”信号。
- 热点里 `revisions = 21` 但 `friction_last_month = 0`、`friction_last_year = 0`，这类“结构上差、近期不热”的文件在增量 PR 审查里天然容易被后置。
- 这里的大量重复是短小、正确、局部的 wrapper duplication，不像业务 bug 那样会直接破坏行为，因此 coding agent、review agent、ChatGPT review 循环如果偏 correctness，会天然漏掉。
- 文件已经有多个看上去合理的子组件，容易制造“已经拆分得差不多了”的错觉；但真正的复杂度仍聚集在父 orchestrator。
- 最重的债不是一个明显错误算法，而是跨层编排密度过高、状态协议碎片化、已有原语未被完全收敛。这类债务对功能验收不敏感，对健康度工具更敏感。

## 证据清单

| 文件 | 行号 | 简短证据 |
|---|---:|---|
| `src/components/recordings-review/recordings-review-experience.tsx` | `1-70` | 单文件同时导入 UI、controller、history、service、browser playback、error-marker helper，边界跨度过大。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `80-201` | 根组件在渲染前完成 filter、grouping、selection、context map、waveform request、marker subset 等整套读模型装配。 |
| `src/components/recordings-review/use-recordings-review-controller.ts` | `45-75` | controller 已经提供 `toggleFavorite`、`toggleBestTake`、`toggleActiveTake` 原语。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `225-246` | 页面再次手写 selected organization 解析和 `toggleFavorite` 包装，重复 controller/service 语义。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `523-530` | 本文件定义 `resolveRecordingOrganizationForRecord`。 |
| `src/components/recordings-review/recording-comparison-panel.tsx` | `264-271` | comparison panel 再定义一份同名同义 helper，形成跨文件重复。 |
| `src/services/recordings-review/index.ts` | `28-55`, `69-106` | service 已暴露 organization/take/export 原语，但 UI 没有完整收敛到它。 |
| `src/components/recordings-review/use-bounded-recording-selection.ts` | `81-99` | hook 已提供 `isSelected` / `isDisabled`。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `590-597`, `626-633`, `812-830` | quick、ungrouped、take-group 三处手写相同的 comparison 禁用判定。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `717-738` | `updateBestTake` / `updateActiveTake` 结构完全平行，且与 controller 动作重复。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `888-1045` | `RecordingListItem` 既渲染元数据又切换多套控制面，是 CodeScene 指认的复杂长方法。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `1114-1569` | `RecordingDetails` 自带导出、组织、tag、marker、delete、playback 多状态协议，是页面内第二个 workflow hub。 |
| `src/components/recordings-review/recording-artifact-review.tsx` | `42-54`, `117-138` | playback controls 已被子组件抽象成稳定接口，父组件仍负责 seek 场景拼装。 |
| `src/lib/recordings-review/error-markers.ts` | `132-174` | marker seek helper 已存在，父组件只是在外层继续维护 message/error state。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `1368-1386` | details 视图手工拼 `Date/Duration/BPM/Time signature/Type/Artifact`。 |
| `src/components/recordings-review/recording-comparison-panel.tsx` | `189-233` | comparison 视图再次手工拼录音元数据字段。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `923-974` | list row 再次拼一轮录音元数据 pill，形成跨视图重复展示协议。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `1574-1595` | `getPracticeAgainAccessibleName` 重走 quick/sheet/segment 分支。 |
| `src/lib/recordings-review/history.ts` | `27-46` | `getContinuePracticeHref` 已经持有对应的 practice 路由分支逻辑。 |
| `src/lib/recordings-review/types.ts` | `43-50` | snapshot 类型把 `recordingOrganization` 保留为 optional。 |
| `src/components/recordings-review/use-recordings-review-controller.ts` | `16-20` | `emptyClientSnapshot` 不含 optional 扩展字段。 |
| `src/components/recordings-review/recordings-review-experience.tsx` | `107-110` | 组件被迫用 `snapshot.recordingOrganization ?? []` 做兼容归一化，说明兼容负担泄漏到 UI。 |
