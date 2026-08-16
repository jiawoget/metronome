# `sheet-practice-controls.tsx` 债务取证

- 取证对象：`src/components/sheet-practice/controls/sheet-practice-controls.tsx`
- 取证方式：CodeScene 基线 + 源码静态阅读
- 排除范围：所有 tests 文件
- 口径说明：本文是债务取证，不是修复方案，不包含 remediation plan 或测试计划

## 文件概况

- 该文件是一个高耦合 orchestration 组件，不只是 UI controls。它同时负责 metronome transport、sheet recording 开始/停止、practice-again 来源校验、bar count-in 预备流程、session 刷新、workflow store 协调、browser harness 事件桥接，以及子面板组装。
- 组件入口直接注入并默认绑定 browser adapter：`createBrowserMetronomeService`、`createBrowserCountdownExecutor`、`browserPracticeSessionService`、`browserPracticeSegmentService`、`createBrowserSheetRecordingService`、`browserSheetMetronomePresetService`，说明它同时承担了 composition root 和 use-case orchestrator 两种职责。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:212-249`
- 本文件物理长度 1420 行；CodeScene 热点快照里统计 LoC 为 1254。两组数字都说明它已经超过常规单组件规模。
- 本地状态面过宽：单文件内至少维护 16 个 `useState` 状态位和 4 个 `useRef` 并发/流程哨兵，同时又从 `useSheetPracticeRecordingWorkflowStore` 取 10+ 个状态/动作。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:258-333`
- 同一个“当前 segment”概念被拆成两条通道：
  - `selectedTempoSegment` 只服务于 tempo apply UI。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:273-275,346-355`
  - `activeSegmentId` 通过 store 参与 recording/rerecord 工作流。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:289-333`
  - `PracticeSegmentSelectorPanel` 又同时维护自己的 `selectedSegmentKey` 并通过回调回传 `segment`。证据：`src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:20-31,432-469`

## CodeScene 基线

- `code_health_score`：`6.22`
- 结论级别：Yellow，已经落入“problematic technical debt”区间
- `list_technical_debt_hotspots_for_project_file` 返回：
  - hotspot Code Health：`6.510454214610458`
  - revisions：`29`
  - LoC：`1254`
  - refactoring_target：`recommended-refactoring-target`
  - 详情链接：[CodeScene Hotspot](https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots)
- `code_health_review` 直接点名的复杂方法：
  - `SheetPracticeControls.startSheetRecording`，`cc = 19`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1061-1145`
  - `SheetPracticeControls.validateRecordAgainSource`，`cc = 16`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1000-1059`
  - `SheetPracticeControls.hydratePracticeAgainSource`，`cc = 13`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:431-520`
  - `SheetPracticeControls` 顶层上下文，`cc = 13`，且单方法 158 行。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:212-374`
  - `SheetPracticeControls.handleRecordingHarnessEvent`，`cc = 10`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1251-1282`
  - `formatRerecordUnavailableMessage`，`cc = 10`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:118-141`
  - `SheetPracticeControls.stopSheetRecording`，`cc = 9`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1182-1242`
  - `SheetPracticeControls.resolveSelectedSegmentContext`，`cc = 8`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1147-1180`
- CodeScene 还指出了多处复杂条件，尤其集中在 record-again 启动、source 校验、harness 事件处理这三段。这和源码阅读结果一致：复杂度不是集中在某一个算法点，而是集中在“流程编排 + 边界校验”。

## 语义重复

- `record-again` 来源校验被拆成三套相近但不相同的流程：
  - 首次 hydration：读取 `sourceRecordingId`，校验 recording 类型、sheet 归属、segmentContext、返回 segment 是否一致，再拉 live segment 做二次比对。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:431-520`
  - ready 态再校验：当 store 里已有 rerecord source 时，再次 `getRecording()` 并跑 `getRerecordSourceInvalidReason()`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:551-574`
  - 点击 `Record again` 前再校验：再次读取 store、再次 `getRecording()`、再次拉 `getSegment()`、再次创建 segment context、再次比对。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1000-1059`
- segment context 校验语义重复：
  - `validateRecordAgainSource()` 里对 `selectedSegment` 做 `null`、`sheetId`、`createSheetRecordingSegmentContext()`、`segmentContextsMatch()` 四连校验。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1027-1058`
  - `resolveSelectedSegmentContext()` 对当前选中 segment 又做了一遍 `null`、`sheetId`、`createSheetRecordingSegmentContext()` 校验。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1147-1179`
- bar count-in 清理序列高度重复。`invalidateBarCountInPrepare(); setActiveBarCountInPlan(null); setActiveBarCountInTick(null);` 这一组在多个分支重复出现，说明缺少单一 reset primitive。证据：
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx:648-650`
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx:774-776`
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx:803-805`
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx:831-833`
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx:932-945`
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx:954-964`
  - `src/components/sheet-practice/controls/sheet-practice-controls.tsx:977-979`
- segment tempo apply policy 重算了一次：
  - 先 `useMemo(getSegmentTempoApplyPolicy(...))` 得到 `segmentTempoPolicy`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:348-355`
  - 点击应用时又重新调用 `getSegmentTempoApplyPolicy(...)`，而不是消费已 memo 的结果。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:374-385`
- session/recording 刷新逻辑被手写了两遍：
  - `refreshSession()` 统一拉 `getRecentSheetSession()`、`listRecordingMetadata()`、`getLatestSheetRecording()`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:387-398`
  - `stopSheetRecording()` 保存成功后又内联拉一遍 `getRecentSheetSession()` 和 `listRecordingMetadata()`。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1215-1222`

## 可删候选

- harness-only 浏览器路径是明显的“产品主路径外逻辑”候选：
  - `window.__sheetPracticeControlsTestHarness`
  - `window.__sheetPracticeControlsBarCountIn`
  - `CustomEvent` 派发/监听
  - 这些分支只有在特殊全局标志存在时才生效，正常产品运行默认不走。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:63-78,143-173,1244-1295`
- bar count-in 存在三条配置输入通道：
  - props `barCountIn`
  - window harness override
  - 本地 UI state `isBarCountInEnabled` + `barCountInMeasures`
  - 三者由 `getEffectiveBarCountInOptions()` 汇总，像是历史兼容层不断叠加出来的结果。证据：`src/components/sheet-practice/controls/types.ts:51-57,75`，`src/components/sheet-practice/controls/sheet-practice-controls.tsx:143-159,275-280,626-636`
- `refreshSession()` 已存在且已有订阅驱动，但 stop/save 成功后仍保留一条手写刷新路径，属于重复 wrapper 候选。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:387-398,410-426,1215-1222`
- recording workflow 状态有可合并迹象：
  - 本地有 `recordingState`、`isStartingRecordAgain`、`recordingHarnessActive`、`message`、`errorMessage`
  - store 又有 `status`、`error`、`rerecord`
  - 同一业务流程被本地 state 和 store 双重描述。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:258-288`，`src/stores/sheet-practice-recording-workflow-store.ts:40-68,218-287`
- `consumedSourceRecordingId` 是一个粘在 UI 组件里的“一次性业务记忆位”，只为了驱动 `shouldCreatePracticeAgainSession`。这更像 session policy 残留而不是纯 UI 状态。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:264-266,585-625,778-780,1104`

## 过度复杂点

- 顶层组件上下文本身就是 Brain Method。初始化服务、hook 状态、workflow store、tempo policy、segment 回调全部塞在一个函数开头。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:212-374`
- `startSheetRecording()` 同时处理：
  - 入口幂等保护
  - record-again 前置校验
  - capture 启动
  - session 创建
  - session event 写入
  - workflow store 状态推进
  - message/error 写入
  - 失败回滚
  - 这是典型的长方法 + 复杂条件 + 隐式事务边界混合。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1061-1145`
- `stopSheetRecording()` 同时处理：
  - segmentContext 解析
  - 失败时 discard capture
  - workflow store 状态推进
  - `stopAndSave()` 持久化
  - 手动刷新 session/recordings
  - 成功/失败消息分派
  - 这也是一个 UI handler 内嵌 persistence transaction 的例子。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1182-1242`
- bar count-in 不是显式状态机，而是 refs + state 的拼接式并发控制：
  - `pendingBarCountInStartRef`
  - `barCountInPrepareRunIdRef`
  - `isPreparingBarCountInRef`
  - `activeBarCountInPlan`
  - `activeBarCountInTick`
  - 这组变量分散在 prepare、start、stop、preset load、enabled change 多个路径里。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:278-284,637-745,887-941,953-985`
- `record-again` 实际上是一个分布式状态机，但实现上没有单独的状态机对象，而是散落在：
  - hydration effect
  - ready 态 revalidation effect
  - start 前 validator
  - segment selector 对 store 的失效处理
  - store 内部的 rerecord state constructors
  - 这会让读者必须跨 3 个文件拼出全貌。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:431-574,1000-1059`，`src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:345-356,400-401,609-616,651-657`，`src/stores/sheet-practice-recording-workflow-store.ts:98-196`
- `showRecordAgain` / `canRecordAgain` 依赖 store 状态、本地 recording 状态、browser harness、capture service、countdown 状态五种来源，说明业务可用性判定已经跨多个边界拼接。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:986-998`

## 现成库 / 现有仓内原语本可复用但被重造的点

- rerecord 状态迁移在 store 里其实已经有半套原语：
  - `getRerecordStateAfterSegmentChange()`
  - `getRerecordStateFromSavedRecording()`
  - `clearRerecordForReason()`
  - 但 `SheetPracticeControls` 仍本地构造了 `getRerecordSourceInvalidReason()`，并在 hydration / revalidation / start 前各自重跑一轮业务规则。证据：`src/stores/sheet-practice-recording-workflow-store.ts:149-196,215-245,273-281`，`src/components/sheet-practice/controls/sheet-practice-controls.tsx:181-209,431-520,551-574,1000-1059`
- `refreshSession()` 已经是本文件内部的统一投影原语，但保存完成后没有复用，而是重复拉数据并重复组装 state。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:387-398,1215-1222`
- `PracticeSessionService` 已经持有 session 创建、prepared metadata、commit、duration update 等持久化原语，但 `SheetPracticeControls` 仍保存了 `consumedSourceRecordingId`、rollback 上下文、手动 duration 更新、消息态等额外流程控制，说明业务边界没有真正沉到底层 service。证据：`src/services/practice-session/service.ts:522-569,602-657,717-725`，`src/components/sheet-practice/controls/sheet-practice-controls.tsx:80-93,585-625,802-862,1103-1109`
- `PracticeSegmentSelectorPanel` 已经掌握“当前选中 segment”并通过 `onSelectedSegmentChange()` 回传，但 `SheetPracticeControls` 仍保留一套 `selectedTempoSegment` 本地状态，与 store 里的 `activeSegmentId` 并存，等于把“当前 segment”重造为两个概念。证据：`src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:20-31,432-469`，`src/components/sheet-practice/controls/sheet-practice-controls.tsx:273-275,330-355`

## 边界混用

- UI / domain / service / store / browser adapter / browser global 在一个组件里混在一起：
  - domain：`createSheetRecordingSegmentContext`、`getBarCountInPlan`、`getSegmentTempoApplyPolicy`
  - service：practice session、practice segment、recording、measure grid、preset、metronome
  - store：`useSheetPracticeRecordingWorkflowStore`
  - browser adapter：`createBrowser*`、`browser*Service`
  - browser global：`window`、`CustomEvent`
  - 证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:6-61,72-78`
- 组件 render 树是 UI 面板组合，但行为树不是。UI 看起来被拆成 `PracticeStatusPanel`、`MetronomeSettingsPanel`、`TransportActionsPanel`、`PracticeSegmentSelectorPanel`、`MeasureGridCalibrationPanel`，实际业务却大多仍留在顶层组件。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1297-1419`
- `TransportActionsPanel` 本身是纯展示 + callback props，但 props 已经被顶层灌入大量流程控制结果，说明“拆组件”没有真正拆走行为复杂度。证据：`src/components/sheet-practice/controls/transport-actions-panel.tsx:10-31,33-163`
- sheet practice 的 session / workflow 逻辑分散到多个 sibling UI：
  - `SheetPracticeControls` 负责 metronome/recording session
  - `PracticeSegmentSelectorPanel` 负责 active segment / rerecord 失效
  - `ReferencePanel` 也直接写 `ensureSheetSession()` 和 `captureSessionEvent()`
  - 同一 sheet-practice 业务没有单一协调边界。证据：`src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:298-309,345-356,400-401,609-616,651-657`，`src/components/sheet-practice/reference/reference-panel.tsx:255-269,342-345,411-436`
- recording 持久化事务已经在 `BrowserSheetRecordingService.stopAndSave()` 内部涵盖 artifact 校验、prepared metadata、session commit、rollback；但顶层组件仍要在外层拼接 workflow 状态、session refresh、error wording，说明边界切分停在“技术服务”层，没有形成“业务用例”层。证据：`src/lib/sheet-practice/recording-service.ts:152-278`，`src/components/sheet-practice/controls/sheet-practice-controls.tsx:1182-1242`

## 债务成因取证

- 这是典型的“功能叠加在单一入口”形成的债，不是单次失误：
  - metronome
  - record-again
  - sheet recording
  - bar count-in
  - preset load
  - segment select
  - measure-grid calibration
  - harness instrumentation
  - 每一项看上去都合理，但都落在了同一个组件上。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:6-61,1297-1419`
- rerecord 规则天然跨 recording history、live segment、sheet route 参数、workflow store、UI 消息面板五种来源；仓内又没有一个公开的“单一 validator/use-case primitive”承接这件事，所以校验规则只能在多个生命周期节点重复书写。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:181-209,431-520,551-574,1000-1059`
- 多个 `cancelled` / `runId` / `pending` / `isPreparing` ref 说明这份代码不是从一个显式状态机设计出来的，而是随着 race condition 和边界 case 被逐步补丁化。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:282-284,428-538,637-745,887-941`
- 顶层组件既保留 browser 默认依赖注入，又承担业务 orchestration，这种“为了可替换性先把依赖留在组件上”的做法，长期会把 UI 容器演变成业务壳层。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:219-225`
- sibling 组件也直接写 session/workflow，说明债不是此文件孤立产生，而是 sheet-practice 整个 slice 在边界上一直偏向“UI 组件直连 service/store”。证据：`src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:263-271`，`src/components/sheet-practice/reference/reference-panel.tsx:255-269,342-345`

## 审查漏检取证

- 以下判断属于基于代码形态的取证推测，不是对历史 reviewer 意图的断言。
- 这类债容易漏掉，因为重复语义不是连在一起复制，而是分散在 hydration、ready revalidation、button click、segment mutation、store constructor 几个不同触发点。单看某一个 diff，很像“多补一个边界 case”，不容易被看成同一规则被重复实现。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:431-574,1000-1059`，`src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:345-356,400-401,609-616,651-657`
- 多数复杂路径都是低频或条件路径：
  - `record-again` 只有有 `sourceRecordingId` 时才触发
  - harness 只有特定 window flag 时才触发
  - bar count-in 只有启用后才触发
  - 低频路径在 feature review 里更容易被当成必要防御代码接受。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:143-173,431-520,626-636,1244-1295`
- 文件表面上“已经在用 domain/service/store abstraction”，容易形成一种假象：看起来没有直接碰 repository，就像边界已经干净。但真正的问题是 orchestration 仍堆在组件里，这种债不一定会在 correctness review 中被优先指出。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:6-61,212-249`
- 业务状态被本地 state、store、service 回调、window harness 四路同时驱动，review 时如果没有先画 contract / ownership map，很难在一次循环内看见完整状态机。证据：`src/components/sheet-practice/controls/sheet-practice-controls.tsx:258-333,986-998,1244-1295`
- 代码行为仍大概率“能工作”，因为底层 service 已经做了很多持久化与 rollback 兜底；这会让行为验证通过，但不会自动暴露组件层的维护性问题。证据：`src/lib/sheet-practice/recording-service.ts:152-278`

## 证据清单

- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:212-249`
  - 顶层组件默认注入多个 browser adapter，兼任 composition root。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:258-333`
  - 本地状态、refs、workflow store taps 在一个组件里密集堆叠。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:387-398`
  - 已存在统一 `refreshSession()` 投影逻辑。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:410-426`
  - 组件同时订阅 `sessionService` 和 `sheetRecordingService`，说明已有自动刷新通道。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:431-520`
  - 第一次完整 rerecord hydration/校验流程。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:551-574`
  - ready 态下的 rerecord 再校验流程。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:626-636`
  - `barCountIn` props、harness override、本地 state 三路合并。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:648-650,774-776,803-805,831-833,932-945,954-964,977-979`
  - bar count-in reset 逻辑多处重复。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:986-998`
  - `showRecordAgain` / `canRecordAgain` 跨 store、本地 state、service、countdown 四路拼装。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:1000-1059`
  - 点击 `Record again` 前第三次 source 校验，并重复抛同一句错误。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:1061-1145`
  - `startSheetRecording()` 是 CodeScene 最高复杂度方法。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:1147-1179`
  - `resolveSelectedSegmentContext()` 重新拉 segment 并再做 context 校验。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:1182-1242`
  - `stopSheetRecording()` 将保存、工作流推进、手动刷新、消息更新混在一起。
- `src/components/sheet-practice/controls/sheet-practice-controls.tsx:1244-1295`
  - harness 事件桥接依赖 browser global 和 `CustomEvent`。
- `src/stores/sheet-practice-recording-workflow-store.ts:149-196,215-245,273-281`
  - store 内已经存在 rerecord 状态构造/迁移原语。
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:298-309,345-356,400-401,609-616,651-657`
  - sibling 组件也在直接驱动 recording workflow store 和 rerecord 失效。
- `src/components/sheet-practice/segments/practice-segment-selector-panel.tsx:432-469`
  - selector 既维护自己的 selected segment，又把结果回传给 controls。
- `src/components/sheet-practice/reference/reference-panel.tsx:255-269,342-345,411-436`
  - sibling UI 组件直接调用 `captureSessionEvent()` / `ensureSheetSession()`。
- `src/lib/sheet-practice/recording-service.ts:152-278`
  - recording service 已经持有 artifact 校验、prepared metadata、commit、rollback 事务。
- `src/services/practice-session/service.ts:522-569,602-657,717-725`
  - session service 已经持有 sheet session、prepared metadata、duration update 原语。
