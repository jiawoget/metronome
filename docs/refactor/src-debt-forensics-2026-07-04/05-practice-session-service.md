## Source Debt Forensics: `src/services/practice-session/service.ts`

Status: complete
Scope: `src/services/practice-session/service.ts`
Excluded: all `tests/**`, `*.test.*`, `*.spec.*`
Project: CodeScene `82174`

### 文件概况

`src/services/practice-session/service.ts` 当前是一个 916 行的宽接口 service factory，单文件同时承接了这些职责：

- practice session 写路径：建 session、更新时间、结束 session、链接 recording、保存 sheet recording 元数据。
- event 协调：事件上下文校验、事件对象构造、event sink 调用。
- read model 组装：home recent activity、continue practice、today summary、dashboard analytics、practice streaks、library recent practice、session comparison。
- lookup 协调：通过 `sheetGateway` / `segmentGateway` 把 session / recording snapshot 补成 UI 可消费的 target 名称与状态。
- client-store facade：`listSessions`、`listRecordingMetadata`、`clear`、`subscribe`、snapshot rollback 入口。

这不是“一个 service 管一个聚合”的形态，而是一个 browser-side practice facade。接口面本身也已经很宽，`PracticeSessionService` 在 [src/services/practice-session/types.ts](src/services/practice-session/types.ts) `124-155` 行公开了 20+ 个方法。

### CodeScene 基线

Source:

- `select_project` -> default project `82174`
- `code_health_score`
- `code_health_review`
- `list_technical_debt_hotspots_for_project_file`

结论：

- Code Health: `6.65`，属于 yellow code。
- 当前项目快照里它不是 project hotspot；`list_technical_debt_hotspots_for_project_file` 返回空数组。
- Hotspot page: [CodeScene technical debt hotspots](https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots)

CodeScene 直接命中的债务信号：

| Category | CodeScene evidence |
|---|---|
| `Bumpy Road Ahead` | `validateEventContext` at `92-149` |
| `Complex Method` | `validateEventContext` at `92-149`, `resolveSessionHistorySegmentTargets` at `229-292`, `resolveHomeRecentActivitySegmentTargets` at `364-428` |
| `Complex Conditional` | `commitPreparedSheetRecordingSession` at `646-649`, `validateEventContext` at `112`, `135`, `getRecordingSession` at `579`, `585`, `updateSheetSessionDuration` at `720` |
| `Code Duplication` | `resolveSessionHistorySheetTargets` / `resolveHomeRecentActivitySheetTargets`, `resolveSessionHistorySegmentTargets` / `resolveHomeRecentActivitySegmentTargets`, `updatePracticeSessionDuration` / `updateSheetSessionDuration`, `getHomeDashboardAnalyticsSource` / `getLibraryRecentPracticeSummaryBySheet` |

CodeScene 的价值在这里很明确：这个文件的问题不是单点 bug，而是“职责扩张后形成的重复和条件矩阵”。

### 语义重复

这里最突出的不是 copy-paste 文本完全相同，而是“名字不同、消费者不同，但逻辑骨架相同”的重复。

1. session history 与 home recent activity 各自维护一套 sheet target hydration。

- `resolveSessionHistorySheetTargets` 在 [src/services/practice-session/service.ts](src/services/practice-session/service.ts) `192-227`。
- `resolveHomeRecentActivitySheetTargets` 在同文件 `324-362`。
- 两者都做了相同三步：收集 `sheetId`、去重、`sheetGateway.getSheetContext()`、再映射为 `valid` / `missing` / `lookup-failed`。

2. session history 与 home recent activity 各自维护一套 segment target hydration。

- `resolveSessionHistorySegmentTargets` 在 `229-292`。
- `resolveHomeRecentActivitySegmentTargets` 在 `364-428`。
- 两者都做了相同三步：从 snapshot 提取 `(sheetId, segmentId)`、跳过缺失或 lookup-failed sheet、`segmentGateway.getSegmentContext()`、再映射为 `valid` / `missing` / `lookup-failed`。

3. duration 更新路径分裂成两个外观方法，但核心行为完全相同。

- `updatePracticeSessionDuration` 在 `707-715`。
- `updateSheetSessionDuration` 在 `717-725`。
- 差别只剩一个 `sheet` 前置条件，真正更新都委托给 `updateSessionDuration` (`471-482`)。

4. 多个 read-model 入口重复同一个“全量拉 session + recording -> 调 domain selector”的壳层。

- `readContinuePracticeTargets` 在 `457-468`。
- `getHomeRecentActivity` 在 `776-782`。
- `evaluateGoalCompletion` 在 `825-836`。
- `getHomeDashboardAnalyticsSource` 在 `839-852`。
- `getLibraryRecentPracticeSummaryBySheet` 在 `865-878`。
- `getSessionComparison` 在 `880-895`。

这些入口的差别主要在最终 selector，不在读数据的编排骨架。

5. “trim 后为空即 null”的字符串清洗原语在 service 和多个 domain 文件里重复出现，只是名字不同。

- `normalizeOptionalContextId` in [src/services/practice-session/service.ts](src/services/practice-session/service.ts) `86-89`
- `normalizeAnalyticsId` in [src/domain/practice/rules.ts](src/domain/practice/rules.ts) `310-313`
- `requiredString` in [src/domain/practice/recent-activity.ts](src/domain/practice/recent-activity.ts) `374-381`
- `requiredString` in [src/domain/practice/session-comparison.ts](src/domain/practice/session-comparison.ts) `559-566`
- `normalizeRequiredString` in [src/domain/practice/session-history-groups.ts](src/domain/practice/session-history-groups.ts) `332-339`

这说明重复已经不是一个文件内的问题，而是 practice read-model 家族的横向扩散。

### 可删候选

没有发现可以直接判定为“完全死代码”的 service 方法；引用检索显示这些公开入口大多仍有消费者。真正的问题更像“可并层、可收口、可去壳”的残留。

1. 明显的薄包装 surface。

- `restorePracticeSessionSnapshot` 在 [src/services/practice-session/service.ts](src/services/practice-session/service.ts) `697-701` 只做 `saveSession`。
- `deletePracticeSessionSnapshot` 在 `703-705` 只透传 repository。
- `listSessions` 在 `772-774`、`getRecentSession` 在 `807-809`、`getRecentSheetSession` 在 `811-813`、`listRecordingMetadata` 在 `897-899` 都是单层透传。

这些方法不是死的，但它们把 repository / rollback port 暴露成了 service API 的一部分，增加了表面积。

2. 可并层的 prepare/commit 双阶段壳层。

- `prepareSheetRecordingMetadata` 在 `602-640`。
- `commitPreparedSheetRecordingSession` 在 `642-657`。
- `createSheetRecordingMetadata` 在 `756-769` 又把这两步重新包了一次。

三者同时存在，意味着“对外暴露事务分解版本”和“对外暴露一键版本”并存。它不是错误，但确实是 surface 冗余。

3. 历史兼容残留把 service 继续拉宽。

- browser 组合入口使用 [src/infrastructure/db/global-practice-session-repository.ts](src/infrastructure/db/global-practice-session-repository.ts) `127-182`，把 legacy quick session 从 `recordingHistoryRepository` 拼回 practice session 视图。
- `listLegacyQuickPracticeSessions` 在该文件 `117-125`，`getSession` 也会回退到 legacy quick session 查找 (`140-147`)。

这说明当前 practice session service 并不只服务“现行 sheet session 存储”，还背着旧 quick-session 数据兼容层。

4. repository 已经提供了更窄读取口，但这个文件没有利用。

- `PracticeRecordingMetadataRepository` 在 [src/services/practice-session/types.ts](src/services/practice-session/types.ts) `52-58` 定义了 `listRecordingMetadataForSession`。
- 实现位于 [src/infrastructure/db/recording-history-metadata-repository.ts](src/infrastructure/db/recording-history-metadata-repository.ts) `90-94`。
- 仓内检索只命中实现，没有消费者。

这不是 service.ts 内部的死代码，但它揭示了一个现象：文件倾向于全量拉取后在更上层聚合，而不是消费已有的窄接口。

### 过度复杂点

1. `validateEventContext` 是典型条件矩阵。

- 位置：`92-149`
- 它同时约束了 `sourceType`、`sheetId`、`segmentId`、`recordingId`、`referenceId` 和 `input.kind`。
- 复杂度不是来自业务本身有多深，而是来自“事件种类 x session 来源 x 可选上下文”的交叉约束全部堆在一个函数里。

2. recording 保存流程是补偿式状态机，只是没有显式命名成状态机。

- service 侧：`prepareSheetRecordingMetadata` (`602-640`) -> `recordingRepository.saveRecordingMetadata` + `commitPreparedSheetRecordingSession` (`763-767`)
- 调用侧：`src/lib/sheet-practice/recording-service.ts` `177-277`

外部调用要先 `prepare`，再写 artifact，再写 metadata，再 `commit`，失败时还要通过 `restoreOrDeletePracticeSessionSnapshot` 做补偿回滚。这个行为已经具备状态机特征，只是状态散落在 service、recording service、artifact storage 三层里。

3. 同一条读取链路被拆成多个相近私有 helper，增加理解切换成本。

- `getHomeRecentActivityTargetSources` (`306-322`)
- `resolveHomeRecentActivitySheetTargets` (`324-362`)
- `resolveHomeRecentActivitySegmentTargets` (`364-428`)
- `readHomeRecentActivity` (`430-455`)
- `readContinuePracticeTargets` (`457-468`)

每个 helper 都不算特别长，但串起来就是一整段 read-model pipeline，需要读者跨 150+ 行才能建立完整心智模型。

4. 存在隐式双重查找与快照一致性假设。

- `getRecordingSession` 先在 `583` 读取一次 `sheetGateway.getSheetContext(session.sheetId)`。
- `prepareSheetRecordingMetadata` 又在 `611` 再读同一个 sheet context。

这意味着同一条录音保存链路内部对同一外部实体做了两次 lookup，并隐式假设两次结果一致。

5. `ensureQuickSession` 对 repository 排序语义存在隐藏耦合。

- 它在 [src/services/practice-session/service.ts](src/services/practice-session/service.ts) `486-490` 通过 `(await repository.listSessions()).find((session) => session.sourceType === "quick")` 找“最近 quick session”。
- 这只在 repository 返回值已按 recent activity 排序时才成立。
- 排序语义实际定义在 [src/domain/practice/rules.ts](src/domain/practice/rules.ts) `63-69`，并在 [src/infrastructure/db/global-practice-session-repository.ts](src/infrastructure/db/global-practice-session-repository.ts) `130-135`、[src/infrastructure/db/practice-session-repository.ts](src/infrastructure/db/practice-session-repository.ts) `58-60` 才被保证。

也就是说，这个 service 的正确性并不完全由它自己的代码保证。

### 现成库 / 现有仓内原语本可复用但被重造的点

1. target-state 解析原语在 domain 内已经出现两次，service 之上又复制了一层准备逻辑。

- `resolveTarget` in [src/domain/practice/recent-activity.ts](src/domain/practice/recent-activity.ts) `198-238`
- `resolveTarget` in [src/domain/practice/session-comparison.ts](src/domain/practice/session-comparison.ts) `202-252`

两者都消费 `targets.sheets` / `targets.segments`，并做同一类 `valid` / `missing-sheet` / `missing-segment` / `lookup-failed` / `no-target` 判定。service 侧再各自准备 history/recent-activity 的 target maps，说明这个家族已经缺少统一原语。

2. 字符串清洗原语已经在仓内多次存在，但 service 仍维护自己的版本。

- 见上面的 `normalizeOptionalContextId` / `normalizeAnalyticsId` / `requiredString` / `normalizeRequiredString` 证据。

3. recording metadata repository 提供了更窄的按 session 查询，但 service 家族统一走“全量读取再派生”。

- 接口定义：[src/services/practice-session/types.ts](src/services/practice-session/types.ts) `52-58`
- 实现：[src/infrastructure/db/recording-history-metadata-repository.ts](src/infrastructure/db/recording-history-metadata-repository.ts) `90-94`
- 未被消费：仓内检索只命中实现

4. browser 组合层已经负责把 sheet / segment / legacy quick session 适配进来，但 service 仍继续承担多个 UI read-model facade。

- browser adapter 组合点在 [src/infrastructure/db/browser-practice-session-service.ts](src/infrastructure/db/browser-practice-session-service.ts) `21-62`
- UI 直接消费集中式 facade，例如 [src/hooks/use-practice-session-dashboard.ts](src/hooks/use-practice-session-dashboard.ts) `248-263`、`505`，以及 [src/hooks/use-command-palette-continue-targets.ts](src/hooks/use-command-palette-continue-targets.ts) `95`

这意味着已有 adapter/facade 已经够宽，service 本体却继续吸收新的读取语义。

### 边界混用

1. service / repository 边界混用。

- 文件内部既有纯 service 协调，也有 repository 级别的直通方法：`listSessions`、`getRecentSession`、`getRecentSheetSession`、`listRecordingMetadata`、`clear`、`subscribe`。
- 这使得调用方很难分辨“这是业务操作”还是“这是存储外观”。

2. service / domain read-model 边界混用。

- service 同时暴露 `getHomeRecentActivity`、`getContinuePracticeTargets`、`getHomeDashboardAnalyticsSource`、`getHomePracticeStreaks`、`getLibraryRecentPracticeSummaryBySheet`、`getSessionComparison`。
- 这些返回值明显是 home dashboard、library、command palette、comparison UI 的读取模型，而不是单一 practice session 领域行为。

3. service / browser adapter 边界混用。

- `canReuseActiveSession` 在 `82-84` 直接依赖 browser local day 语义。
- browser 组合实现是 `"use client"` 的 [src/infrastructure/db/browser-practice-session-service.ts](src/infrastructure/db/browser-practice-session-service.ts) `1-62`。
- service 的 `subscribe` (`906-914`) 也暴露了明显的 client-store 风格 API。

4. service / external side-effect 边界混用。

- `captureSessionEvent` (`151-190`) 直接负责编排 event id、时间戳、schemaVersion、payload 和 side-effect sink。
- `updateSessionDuration` (`471-482`)、`endPracticeSession` (`727-749`)、`commitPreparedSheetRecordingSession` (`642-657`) 又直接更新 `sheetGateway.updateLastPracticedAt(...)`。

这说明文件既做 domain-facing orchestration，也做 adapter-facing side effect dispatch。

### 债务成因取证

1. 这是“复用优先”下的 accretion debt，不是一次性设计失误。

- 从代码形态看，新能力基本都没有新建独立 service，而是继续往这个 facade 添加入口。
- `getHomeDashboardAnalyticsSource` (`839-852`)、`getHomePracticeStreaks` (`854-863`)、`getLibraryRecentPracticeSummaryBySheet` (`865-878`)、`getSessionComparison` (`880-895`) 都是典型例子：复用同一批 repository，再追加一个 selector。

2. 旧 quick-session 兼容路径把 service 变成了新旧模型拼接层。

- [src/infrastructure/db/global-practice-session-repository.ts](src/infrastructure/db/global-practice-session-repository.ts) `117-145` 说明 session 视图不是单一来源，而是 sheet repository + legacy recording history 的拼接。
- 这类历史兼容通常不会马上表现成 bug，但会持续推高条件分支和认知负担。

3. recording 保存链路要求补偿回滚，推动 service API 外扩。

- `prepareSheetRecordingMetadata` / `commitPreparedSheetRecordingSession` / snapshot rollback 口子并存，不像典型 CRUD service，更像把半事务协议公开给了调用层。
- 这一层 debt 的形成不是因为“没人做抽象”，而是因为系统已经跨 session store、recording metadata store、artifact store 三块状态。

4. 多个 UI 面都直接挂在 `browserPracticeSessionService` 上，推动“一个 service 接所有 practice 读取语义”。

- dashboard、command palette、sheet library、quick metronome、sheet practice controls 都直接消费这个 facade。
- 一旦入口被视作稳定依赖面，新增读取能力就更容易继续堆进来，而不是迁走。

### 审查漏检取证

1. 在 CodeScene 项目视角里，它当前不是 hotspot。

- `list_technical_debt_hotspots_for_project_file` 返回空数组。
- 这会降低它在“按项目热点排查”流程里的优先级，即使单文件 `Code Health 6.65` 已经偏黄。

2. 很多新增入口是“薄包装式增量”，diff 看起来安全。

- `getHomeDashboardAnalyticsSource` (`839-852`)
- `getHomePracticeStreaks` (`854-863`)
- `getLibraryRecentPracticeSummaryBySheet` (`865-878`)
- `getSessionComparison` (`880-895`)

每一个入口单独看都只是“读两份 repository，然后调 selector”，更容易被当作低风险复用，而不是 service 继续膨胀的信号。

3. 重复主要是语义级重复，不总是文本级重复。

- history 与 recent-activity 的 target hydration，recent-activity 与 session-comparison 的 target resolution，都是同构逻辑但命名不同。
- 普通 diff review 和轻量自动 review 更容易抓到 copy-paste，未必能稳定抓到这类“平行演化”的重复。

4. 事务性复杂度主要分散在跨文件编排里，不在单一 diff 块里完整出现。

- service 文件只暴露 `prepare` / `commit`。
- 真正的失败补偿和回滚在 [src/lib/sheet-practice/recording-service.ts](src/lib/sheet-practice/recording-service.ts) `241-277` 与 [src/services/practice-session/snapshot-rollback.ts](src/services/practice-session/snapshot-rollback.ts) `10-25`。

如果 review 只盯一个文件或一个 feature diff，很容易看到“流程能跑通”，却看不到“系统已经在靠补偿协议维持一致性”。

5. 文件过大，导致局部改动很容易隐藏在既有复杂度里。

- 单文件 916 行。
- 评审注意力通常会集中在新增 10-30 行逻辑是否正确，而不是顺手重构已有 800+ 行的结构债。

### 证据清单

- `src/services/practice-session/service.ts:69-916` - 单文件 service factory，职责从写路径一路扩到 read model、store facade、rollback 端口。
- `src/services/practice-session/types.ts:124-155` - `PracticeSessionService` 公开面很宽，已经不是窄领域服务接口。
- `src/services/practice-session/service.ts:92-149` - `validateEventContext` 条件矩阵，是 CodeScene 命中的 `Bumpy Road Ahead` / `Complex Method`。
- `src/services/practice-session/service.ts:192-227` - session history 的 sheet target hydration。
- `src/services/practice-session/service.ts:324-362` - home recent activity 的 sheet target hydration，与上者语义重复。
- `src/services/practice-session/service.ts:229-292` - session history 的 segment target hydration。
- `src/services/practice-session/service.ts:364-428` - home recent activity 的 segment target hydration，与上者语义重复。
- `src/services/practice-session/service.ts:471-482` - `updateSessionDuration` 封装了保存 + `updateLastPracticedAt` 副作用。
- `src/services/practice-session/service.ts:707-725` - `updatePracticeSessionDuration` / `updateSheetSessionDuration` 是薄分叉包装。
- `src/services/practice-session/service.ts:602-640` - `prepareSheetRecordingMetadata` 先构造 metadata，再同步更新 session snapshot。
- `src/services/practice-session/service.ts:642-657` - `commitPreparedSheetRecordingSession` 用复杂条件守卫 prepare/commit 一致性。
- `src/services/practice-session/service.ts:756-769` - `createSheetRecordingMetadata` 把 `prepare` + repo 保存 + `commit` 重新打一层壳。
- `src/lib/sheet-practice/recording-service.ts:177-277` - 外部调用方需要手动编排 prepare/save/commit/rollback，证明 service 已暴露半事务协议。
- `src/services/practice-session/snapshot-rollback.ts:10-25` - rollback port 只关心 restore-or-delete，反向说明 snapshot API 是为补偿流程暴露出来的。
- `src/services/practice-session/service.ts:457-468` - continue-practice 入口重复“全量拉 session + recording -> 派生”的骨架。
- `src/services/practice-session/service.ts:776-895` - home recent activity / analytics / streaks / library summary / comparison 一组 UI read model 全集中在同一 service。
- `src/services/practice-session/service.ts:86-89` - `normalizeOptionalContextId` 自己维护一套 trim-or-null。
- `src/domain/practice/rules.ts:310-313` - `normalizeAnalyticsId` 是另一套同义字符串清洗。
- `src/domain/practice/recent-activity.ts:374-381` - `requiredString` 是第三套同义字符串清洗。
- `src/domain/practice/session-comparison.ts:559-566` - `requiredString` 再次重复。
- `src/domain/practice/session-history-groups.ts:332-339` - `normalizeRequiredString` 再次重复。
- `src/domain/practice/recent-activity.ts:198-238` - recent-activity 的 target state 解析。
- `src/domain/practice/session-comparison.ts:202-252` - session-comparison 的 target state 解析，和上者平行演化。
- `src/infrastructure/db/global-practice-session-repository.ts:117-145` - legacy quick-session 兼容仍在活跃路径中。
- `src/infrastructure/db/recording-history-metadata-repository.ts:90-94` - 已有按 session 读取 recording metadata 的窄接口，但无消费者。
- `src/infrastructure/db/browser-practice-session-service.ts:21-62` - browser adapter 已负责 wiring sheet/segment/global repository，说明 service 本体继续扩张的主要方向是 facade 职责，不是基础接线。
