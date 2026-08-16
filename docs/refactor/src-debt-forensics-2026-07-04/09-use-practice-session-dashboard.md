## Source Debt Forensics: `src/hooks/use-practice-session-dashboard.ts`

Status: complete
Date: 2026-07-05
Scope: `src/hooks/use-practice-session-dashboard.ts`
Excluded: all `tests/**`, `*.test.*`, `*.spec.*`
Constraint: forensics only; no remediation plan; no test plan

Neighbor files reviewed:
- `src/domain/practice/index.ts`
- `src/domain/practice/types.ts`
- `src/domain/practice/rules.ts`
- `src/domain/practice/recent-activity.ts`
- `src/domain/practice/session-comparison.ts`
- `src/domain/practice/format.ts`
- `src/services/practice-session/types.ts`
- `src/services/practice-session/service.ts`
- `src/services/practice-goals/service.ts`
- `src/services/practice-goals/browser-service.ts`
- `src/infrastructure/db/browser-practice-session-service.ts`
- `src/infrastructure/db/browser-practice-goal-service.ts`
- `src/hooks/use-command-palette-continue-targets.ts`
- `src/components/home/home-dashboard.tsx`
- `src/components/home/session-comparison-panel.tsx`
- `src/components/recordings-review/recording-comparison-panel.tsx`

### 文件概况

- `src/hooks/use-practice-session-dashboard.ts` 当前是一个 656 行的 browser-only home dashboard coordinator。它不只是一个“读数据 hook”，还同时承接了 dashboard read model、goal read model、goal mutation lifecycle、browser subscription wiring，以及 session comparison 的 home 专用 view-model 格式化。
- 文件内部结构已经明显分层堆叠：
  - `23-103` 行导出了整套 dashboard/goal/session-comparison 类型契约。
  - `105-195` 行维护成组的 empty-state 常量。
  - `208-502` 行是 hook 本体，包含 3 条 refresh 时钟、2 条 mutation 路径、2 个 subscribe 入口。
  - `504-656` 行又内嵌了一整段 session comparison presentation mapper 和格式化 helpers。
- 这使得它更像 home dashboard 的本地 facade，而不是一个窄而纯的 React hook。

### CodeScene 基线

Project context:

- `select_project` 解析到默认 CodeScene 项目 `82174`。
- Project page: <https://codescene.io/projects>

File baseline:

- `code_health_score` => `8.11`
- 解释：yellow zone technical debt，还没到 red code，但已经明显偏离“轻量 hook”。
- `list_technical_debt_hotspots_for_project_file` 返回空 `data`，说明这个文件在当前项目快照里不是 hotspot。
- Hotspot page: <https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots>

`code_health_review` 取证情况：

- `Overall Code Complexity`：文件级总体复杂度预警。
- `Complex Method`：`usePracticeSessionDashboard`，`cc = 39`，位于 `208-502`。
- `Large Method`：`usePracticeSessionDashboard`，LoC `260`，位于 `208-502`。
- 这和源码阅读结果一致：主要债务不在某个坏掉的分支，而在于 hook 本体把多条读取链、mutation 生命周期、subscription wiring 和 comparison presentation 一起留在同一个长方法里。

### 语义重复

1. session comparison 在 hook 内又造了一套 home 专用读模型，和 domain `session-comparison.ts` 的现有表达基本同构。

- hook 先读取 `SessionComparisonResult`，再把 candidate 投影成 `HomeSessionComparisonCandidate`，并自行格式化 `startedText`、`updatedText`、`durationText`、`recordingsText`、`sheetText`、`segmentText`、`goalContributionText`、`eventText`。
- domain 侧其实已经有同一批语义：`metrics`、`unavailable`、`formatSheetLabel()`、`formatSegmentLabel()`、`formatGoalContribution()`、`formatTimestamp()`、`formatDuration()`。
- 这不是“完全拷贝同名函数”，而是“domain 已有表达，hook 又以 home 文案字段重造一遍”。

Evidence:

- hook projection: `src/hooks/use-practice-session-dashboard.ts:512-656`
- domain comparison model: `src/domain/practice/session-comparison.ts:67-76,131-140,312-466,487-523`
- consumer locked to hook-owned strings: `src/components/home/session-comparison-panel.tsx:12-42,49-193`

2. continue-target refresh 逻辑和 command palette hook 平行复制。

- `usePracticeSessionDashboard()` 里 continue targets 的 mounted guard、`latestRefreshId` 语义、service subscribe、loading/error state shell，和 `useCommandPaletteContinueTargets()` 是同一套路。
- 只是一个附带 recent activity / analytics / streaks，另一个只做 continue targets。

Evidence:

- dashboard continue targets path: `src/hooks/use-practice-session-dashboard.ts:215-295`
- command palette continue targets hook: `src/hooks/use-command-palette-continue-targets.ts:43-138`

3. practice goal evaluation 读取逻辑在同一文件里重复出现了两次。

- `refreshPracticeGoalEvaluations()` 单独走一次 `practiceGoalService.getPracticeGoalEvaluations()`，维护一套 loading/error/loaded 状态。
- `refreshPracticeGoals()` 在 goals 成功后又再次执行一轮几乎同样的 evaluation 读取与状态写回，只是额外夹带了 refresh id 协调。
- 这说明“goal list refresh”和“goal evaluation refresh”没有形成一个稳定的单一原语。

Evidence:

- standalone evaluation refresh: `src/hooks/use-practice-session-dashboard.ts:298-329`
- duplicated evaluation read branch inside goal refresh: `src/hooks/use-practice-session-dashboard.ts:372-401`

4. UTC 时间和时长格式化在 hook、home component、domain 三处横向扩散。

- hook 自己定义了 `formatSessionComparisonDuration()` / `formatSessionComparisonTimestamp()`。
- `home-dashboard.tsx` 也维护了 `formatActivityTime()` / `formatAnalyticsDuration()` / `formatAnalyticsTimestamp()`。
- `session-comparison.ts` 再有一套 `formatTimestamp()` / `formatDuration()`。
- 这些 helper 不是完全逐字符一致，但语义和输出风格高度重合。

Evidence:

- hook helpers: `src/hooks/use-practice-session-dashboard.ts:611-656`
- home dashboard helpers: `src/components/home/home-dashboard.tsx:1450-1505`
- domain session comparison helpers: `src/domain/practice/session-comparison.ts:444-452,487-523`

5. dashboard/home 合同镜像重复。

- hook 导出 `PracticeSessionDashboardState` / `PracticeSessionDashboardActions` / `HomeSessionComparisonData`。
- home dashboard component 又镜像了一套 `HomeDashboardData`、`HomeGoalManagementData`、`emptyHomeDashboardData`，字段基本沿用 hook 语义。
- 结果是相邻两个 home 层模块维护两份几乎同构的数据面。

Evidence:

- hook contract and empties: `src/hooks/use-practice-session-dashboard.ts:49-103,153-195`
- home dashboard contract and empties: `src/components/home/home-dashboard.tsx:58-103,157-190`

### 可删候选

1. 单个 `continueTarget` 路径看起来已经是历史残留。

- hook state 仍保留 `continueTarget` 字段，但默认值是 `null`，refresh 后仍然强制写回 `null`。
- service 类型仍暴露 `getContinuePracticeTarget()`，service 实现仍保留这一层包装，domain rules 里也还保留单个 target helper。
- 但源码扫描显示 `getContinuePracticeTarget` 在 `src` 内只剩定义，没有非测试调用方；`continueTarget` 只剩 hook/home state 字段。

Evidence:

- hook residue: `src/hooks/use-practice-session-dashboard.ts:67-72,171-176,277-280`
- home dashboard mirror residue: `src/components/home/home-dashboard.tsx:82-86,171-175`
- service API residue: `src/services/practice-session/types.ts:143-145`
- service implementation residue: `src/services/practice-session/service.ts:819-823`
- domain residue: `src/domain/practice/rules.ts:72-96`

2. `onSavePracticeGoal` / `onDeletePracticeGoal` 与 `savePracticeGoal` / `deletePracticeGoal` 是重复包装接口。

- hook 对同一函数同时导出两组命名。
- home dashboard 也要用 `??` 在两套命名之间并层。
- 这类兼容别名不会制造 bug，但会持续拉宽 contract 面。

Evidence:

- duplicate actions in hook type/export: `src/hooks/use-practice-session-dashboard.ts:93-99,494-500`
- alias merge point in component: `src/components/home/home-dashboard.tsx:67-70,325-326`

3. `formatSessionComparisonMinutes()` 是冗余包装。

- 它先调用 `formatSessionComparisonDuration()`，然后只在结果等于 `"<1 min"` 时返回 `"<1 min"`，其余情况原样返回。
- 这意味着它没有引入任何额外语义，只增加了一个函数层级。

Evidence:

- call site: `src/hooks/use-practice-session-dashboard.ts:604-608`
- wrapper body: `src/hooks/use-practice-session-dashboard.ts:632-636`

4. per-candidate `eventText` 占位文案像是已过时的残留表面。

- hook 为每个 comparison candidate 固定写入 `"Event details not available yet"`。
- domain `SessionComparisonResult` 已经有全局 `unavailable` 条目，并专门给出 `events` 不可用原因。
- 现在两边并存，说明 home hook 用更扁平但更重复的方式保留了一层占位结构。

Evidence:

- hook candidate field: `src/hooks/use-practice-session-dashboard.ts:33-47,541-545`
- domain unavailable model: `src/domain/practice/session-comparison.ts:61-76,454-466`

### 过度复杂点

1. 这个 hook 实际上维护了 3 套 refresh 时钟。

- `latestDashboardRefreshIdRef`
- `latestPracticeGoalRefreshIdRef`
- `latestPracticeGoalEvaluationRefreshIdRef`

这使得它不再是单一 `loading/error/data` 模式，而是一个并发协调器。

Evidence:

- refresh refs: `src/hooks/use-practice-session-dashboard.ts:210-213`
- dashboard refresh clock: `src/hooks/use-practice-session-dashboard.ts:220-221,271-295`
- goal refresh clocks: `src/hooks/use-practice-session-dashboard.ts:299-300,332-386`

2. `refreshDashboard()` 把 7 条读取链路塞进同一个 Promise.all 壳里，再为每条链路单独做本地错误兜底。

- 这让调用方只有一个 `refreshDashboard()`，但内部却要同时理解 partial failure、stale refresh、mounted guard、currentState fallback。
- 复杂度来自“一个入口聚合很多互相独立的数据面”，不是单个算法难。

Evidence:

- loading state fan-out: `src/hooks/use-practice-session-dashboard.ts:223-237`
- multiplexed reads: `src/hooks/use-practice-session-dashboard.ts:239-269`
- partial write-back logic: `src/hooks/use-practice-session-dashboard.ts:275-295`

3. `refreshPracticeGoals()` 是隐式状态机。

- 它同时负责 goals loading、goal progress loading、list read、evaluation read、partial failure 回退、跨 refresh 竞争判定。
- 出错时还要基于 `evaluationRefreshId === latestPracticeGoalEvaluationRefreshIdRef.current` 决定保留哪套 progress 状态。
- 这是典型的“没被命名成状态机，但已经表现成状态机”的代码。

Evidence:

- full control flow: `src/hooks/use-practice-session-dashboard.ts:331-402`

4. hook 底部 150 行比较像 presenter / formatter module，不像 hook 本体。

- `readHomeSessionComparison()` 之下的代码并不涉及 React state。
- 这些函数专门把 domain candidate 变成 home-specific 文案字段，扩大了文件认知半径。

Evidence:

- comparison mapper block: `src/hooks/use-practice-session-dashboard.ts:504-656`

5. browser 环境耦合被直接写进 hook 语义。

- 文件本身是 `"use client"`。
- 读取前先判断 `typeof indexedDB === "undefined"`。
- 生命周期安全靠 `isMountedRef`，数据更新靠 service `subscribe()`。
- 这让模块同时背着 React lifecycle、browser storage availability、client-store eventing 三种关注点。

Evidence:

- client boundary: `src/hooks/use-practice-session-dashboard.ts:1`
- browser guard: `src/hooks/use-practice-session-dashboard.ts:216-218`
- mount guard: `src/hooks/use-practice-session-dashboard.ts:210,223,271,302,319,337,352,381,406,417,427,440,451,461,474-489`
- subscription wiring: `src/hooks/use-practice-session-dashboard.ts:479-490`

### 现成库 / 现有仓内原语本可复用但被重造的点

1. domain comparison model 已经存在，但 hook 没有直接复用。

- `SessionComparisonResult` 已经带 `candidates`、`metrics`、`unavailable`、`limit`、`maxSelected`。
- hook 丢掉了 `metrics` / `unavailable`，重建 `HomeSessionComparisonData` 和 `HomeSessionComparisonCandidate`。
- 这等于把 domain selector 结果又变成第二层 home selector。

Evidence:

- domain result shape: `src/domain/practice/session-comparison.ts:67-76,131-140,312-466`
- hook rebuild: `src/hooks/use-practice-session-dashboard.ts:49-54,512-656`

2. domain comparison formatter 家族已经存在，但 hook 又造了同义 helper。

- domain: `formatSheetLabel()`、`formatSegmentLabel()`、`formatGoalContribution()`、`formatTimestamp()`、`formatDuration()`
- hook: `getSessionComparisonSheetText()`、`getSessionComparisonSegmentText()`、`formatSessionComparisonRecordings()`、`formatSessionComparisonGoalContribution()`、`formatSessionComparisonTimestamp()`、`formatSessionComparisonDuration()`

Evidence:

- hook helper family: `src/hooks/use-practice-session-dashboard.ts:549-656`
- domain helper family: `src/domain/practice/session-comparison.ts:380-452,487-523`

3. continue-target loader 模式已经在 repo 里以单职责 hook 形式存在，但 dashboard hook 仍重新实现。

- `useCommandPaletteContinueTargets()` 已经证明可以把 continue target 的 mounted/subscribed loader 独立出来。
- dashboard hook 并没有共享这类 loader primitive，而是在更宽的 facade 里再次写一套。

Evidence:

- standalone loader hook: `src/hooks/use-command-palette-continue-targets.ts:43-138`
- dashboard-internal loader: `src/hooks/use-practice-session-dashboard.ts:215-295`

4. `HomeDashboardAnalyticsSource` 类型已经预留 `goals?: GoalCompletionEvaluation[]`，但 hook 仍维护并行 goal evaluation lane。

- 类型侧已经暗示“analytics/home dashboard read model”与 goals 可能合并。
- 现实里 hook 仍把 goals、goal progress、analytics 分成平行状态轨，说明已有原语没有真正收口。

Evidence:

- type surface: `src/domain/practice/types.ts:80-98`
- separate goal lanes in hook state: `src/hooks/use-practice-session-dashboard.ts:56-91,298-403`

5. browser facade 已经在 hook 之下存在，但 hook 仍直接处理 storage availability。

- `browserPracticeSessionService` 与 `practiceGoalService` 本来就是给 UI 的 browser-facing facade。
- hook 仍直接写 `indexedDB` guard，说明 browser adapter 责任没有完全沉到底层。

Evidence:

- browser session facade composition: `src/infrastructure/db/browser-practice-session-service.ts:57-62`
- browser goal facade export: `src/services/practice-goals/browser-service.ts:3-6`
- hook-side storage guard: `src/hooks/use-practice-session-dashboard.ts:216-218`

### 边界混用

1. UI / service / browser adapter 混杂。

- hook 直接 import browser service facade，同时自己判断 `indexedDB` 是否存在。
- 这让 UI 层不只是“消费 service”，还参与了 browser storage 能力判断。

Evidence:

- imports: `src/hooks/use-practice-session-dashboard.ts:20-21`
- storage guard: `src/hooks/use-practice-session-dashboard.ts:216-218`

2. 读模型和写模型混在同一个 hook。

- 前半段 orchestrate dashboard reads。
- 后半段又承接 goal save/delete mutation lifecycle。
- “首页展示数据”与“目标编辑写路径”没有被切成两个心智单元。

Evidence:

- read surfaces: `src/hooks/use-practice-session-dashboard.ts:215-403`
- write surfaces: `src/hooks/use-practice-session-dashboard.ts:405-471`

3. domain-to-UI presentation mapping混在 hook 文件里。

- session comparison 文案拼装是明显的 presenter 逻辑。
- 但它与 React state orchestration 共处一个模块，使 hook 文件同时承担 orchestrator 和 formatter 角色。

Evidence:

- presentation block: `src/hooks/use-practice-session-dashboard.ts:504-656`

4. hook 文件变成了共享 DTO 模块。

- `SessionComparisonPanel` 直接从 hook 文件 import 类型。
- 这意味着组件层对 hook 内部数据 shape 建立了编译期依赖；hook 不再只是行为入口，也成了共享 contract source。

Evidence:

- hook-owned types consumed by panel: `src/components/home/session-comparison-panel.tsx:6-10,12-42`
- hook type exports: `src/hooks/use-practice-session-dashboard.ts:33-54,67-103`

### 债务成因取证

1. 这是一个典型的 append-only slice accretion 文件。

- `git log --follow --stat -- src/hooks/use-practice-session-dashboard.ts` 显示，这个文件在 2026-07-01 到 2026-07-02 两天内连续吸收了 home recent activity、continue practice、analytics、streaks、goal management、session comparison、goal progress refresh 等切片。
- 关键提交轨迹：
  - `dc0c9c61` on 2026-07-01: `Implement P3-07 home recent activity UI`
  - `c2f54269` on 2026-07-01: `Implement P3-09 continue practice navigation`
  - `6b14b66d` on 2026-07-01: `Implement P3-12 home dashboard analytics UI`
  - `c7cbddfa` on 2026-07-01: `Implement P3-13 home practice streaks`
  - `34cc5fed` on 2026-07-02: `Implement P3-15 goal management UI`
  - `bc0b9a2e` on 2026-07-02: `Implement P3-17 session comparison`
  - `234b8ac0` on 2026-07-02: `Close out P3 goal progress refresh`
- 这条演化线说明问题不是“一次写坏”，而是“每次都把新 home slice 往现有 hook 上加一层”。

2. “复用现有 hook”成了最短路径，但没有伴随旧表面的收缩。

- 新功能没有新建更窄的 home-specific hooks，而是不断把状态、空壳对象、error message、subscribe 行为叠加到现有文件。
- 这就是为什么老的 `continueTarget`、重复别名 action、第二套 comparison view model 会同时存活。

3. session comparison 的 consumer shape 反推了 hook 膨胀。

- `SessionComparisonPanel` 不是消费 domain `metrics` 模型，而是消费 hook 产出的平铺字符串字段。
- 一旦 consumer 绑定到这种 shape，mapping 最容易被放进现有 hook，而不是回收进 domain selector 或单独 presenter。

4. 目标管理后置接入让这个文件从“读 dashboard”变成“读写 home facade”。

- 2026-07-02 的 goal management 增量很大，之后又紧接 `goal progress refresh` 修补。
- 这说明文件在原本的 dashboard read coordinator 之上，又被加上了 mutation lifecycle 与并发 refresh 协调。

### 审查漏检取证

1. hotspot 视角不会优先盯住它。

- 当前 CodeScene hotspot 查询返回空结果。
- 也就是说，如果早期 triage 主要看 hotspot，而不是逐个 home file 做结构审查，这个文件很容易被放过。

2. 这类债务更像“跨层重复”和“合同膨胀”，不是明显的单点 bug。

- 比如 comparison duplication 不是逐行 copy，而是“domain 已有语义，hook 用另一套字段名再表达一遍”。
- 比如 `continueTarget`、`onSavePracticeGoal`、`onDeletePracticeGoal` 都属于兼容残留；它们很容易在行为测试和人工试用中保持静默。

3. 提交节奏天然把注意力拉向 diff，而不是整文件形状。

- 2026-07-01 到 2026-07-02 的提交是一串连续切片。
- 在这种节奏下，coding agent / review agent / chatgpt review 更可能问“这次新功能是否对”，而不是回头问“为什么这个 hook 现在同时做 6 件事”。

4. 文件的主要问题藏在 contract 和 orchestration，不在失败路径。

- 大量债务是额外状态槽、重复 formatter、重复 contract、历史兼容壳层。
- 它们不会立刻导致错误页面，因此 correctness-first review 很容易低估其代价。

5. 过去的 review loop 大概率没有把 detailed CodeScene review 当成强制入口。

- 这次补做 `code_health_review` 后，CodeScene 直接给出了 `Overall Code Complexity`、`Complex Method`、`Large Method` 三个明确信号。
- 如果之前的审查更依赖 diff review、功能验收、或者只看 hotspot/score，这种“不是热点、但 hook 本体已经长成 coordinator”的问题就很容易被持续放过。

### 证据清单

| 文件 | 行号 | 简短证据 |
|---|---|---|
| `src/hooks/use-practice-session-dashboard.ts` | `23-103` | 导出宽 dashboard/goal/comparison 契约，文件已成为共享 DTO 源。 |
| `src/hooks/use-practice-session-dashboard.ts` | `105-195` | 维护大块 empty-state scaffolding，不是窄 hook。 |
| `src/hooks/use-practice-session-dashboard.ts` | `210-213` | 三套 refresh id ref，显示并发协调复杂度。 |
| `src/hooks/use-practice-session-dashboard.ts` | `215-295` | `refreshDashboard()` 同时拉 7 条读取链并做局部错误兜底。 |
| `src/hooks/use-practice-session-dashboard.ts` | `298-329` | 单独的 goal evaluation refresh 路径。 |
| `src/hooks/use-practice-session-dashboard.ts` | `331-402` | goals refresh 内部再次复制 evaluation read 与状态写回。 |
| `src/hooks/use-practice-session-dashboard.ts` | `405-471` | save/delete mutation lifecycle 与 dashboard read 同文件共存。 |
| `src/hooks/use-practice-session-dashboard.ts` | `494-500` | 同一 action 以 `save*` / `onSave*` 两套名字重复导出。 |
| `src/hooks/use-practice-session-dashboard.ts` | `504-656` | 内嵌整段 comparison presenter/formatter family。 |
| `src/hooks/use-practice-session-dashboard.ts` | `632-636` | `formatSessionComparisonMinutes()` 是无额外语义的包装。 |
| `src/hooks/use-practice-session-dashboard.ts` | `67-72,171-176,277-280` | `continueTarget` 只剩状态字段与强制 `null` 写回。 |
| `src/domain/practice/session-comparison.ts` | `67-76,131-140,312-466` | domain 已有 `metrics` 与 `unavailable` 结果模型。 |
| `src/domain/practice/session-comparison.ts` | `397-452,487-523` | domain 已有 comparison label/time/duration/goal formatter。 |
| `src/hooks/use-command-palette-continue-targets.ts` | `43-138` | continue-target loader 模式已在别的 hook 单独存在。 |
| `src/services/practice-session/types.ts` | `143-151` | service API 同时暴露 multi-target 与 singular target 路径。 |
| `src/services/practice-session/service.ts` | `819-823` | singular `getContinuePracticeTarget()` 仍保留实现。 |
| `src/domain/practice/rules.ts` | `72-96` | singular continue-practice helper 仍保留在 domain。 |
| `src/domain/practice/types.ts` | `80-98` | analytics type 已预留 `goals?`，但 hook 仍维护并行 goal lane。 |
| `src/components/home/home-dashboard.tsx` | `67-70,325-326` | component 侧也为 save/delete 维持两套兼容命名。 |
| `src/components/home/home-dashboard.tsx` | `157-190` | home component 镜像了一套 dashboard/session comparison 空状态。 |
| `src/components/home/home-dashboard.tsx` | `1450-1505` | UTC 时间与时长格式化在 component 侧再次重复。 |
| `src/components/home/session-comparison-panel.tsx` | `12-42,49-193` | panel 依赖 hook 专用字符串字段，而不是 domain metrics 结果。 |
| `src/infrastructure/db/browser-practice-session-service.ts` | `57-62` | browser facade 已在 hook 之下完成依赖拼装。 |
| `src/services/practice-goals/browser-service.ts` | `3-6` | goal browser facade 已存在，但 hook 仍处理 browser/storage 关注点。 |
