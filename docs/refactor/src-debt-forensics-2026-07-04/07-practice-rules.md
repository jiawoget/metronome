## Source Debt Forensics: `src/domain/practice/rules.ts`

Status: complete
Scope: `src/domain/practice/rules.ts`
Excluded: all `tests/**`, `*.test.*`, `*.spec.*`
Project: CodeScene `82174`

### 文件概况

`src/domain/practice/rules.ts` 当前是一个 733 行的 practice rules/read-model 混合模块。它并不只是“规则文件”，而是把多类彼此相邻但不完全同类的职责堆在了一起：

- session duration 计算与最近活动排序：`calculatePracticeDurationMs(...)`、`withUpdatedPracticeSessionDuration(...)`、`sortSessionsByRecentActivity(...)`
- continue practice 兼容导航包装：`getContinuePracticeTarget(...)`
- browser local day 语义与日期游标：`isBrowserLocalDay(...)`、`getBrowserLocalDayKey(...)`、`parseBrowserLocalDayKey(...)`、`getRelativeBrowserLocalDayKey(...)`
- Home read model selector：`getTodayPracticeSummary(...)`、`getHomeDashboardAnalyticsSource(...)`、`getHomePracticeStreaks(...)`
- Library read model selector：`getLibraryRecentPracticeSummaryBySheet(...)`
- goal evaluator：`evaluatePracticeGoalCompletion(...)`
- transport trigger reducer：`applyPracticeTrigger(...)`

这使它同时承接了时间规则、导航 DTO、Home dashboard 聚合、Library 聚合、goal 状态推导、以及 client transport 状态切换。文件名仍叫 `rules.ts`，但真实角色已经更接近“practice domain miscellany”。

### CodeScene 基线

Source:

- `select_project` -> default project `82174`
- `code_health_score`
- `code_health_review`
- `list_technical_debt_hotspots_for_project_file`

结论：

- Code Health: `7.22`，属于 yellow code。
- 当前项目快照里它不是 technical-debt hotspot；`list_technical_debt_hotspots_for_project_file` 返回空数组。
- Hotspot page: https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots

CodeScene 直接命中的债务信号：

| Category | CodeScene evidence |
|---|---|
| `Bumpy Road Ahead` | `getHomeDashboardAnalyticsSource` at `250-308`, `getLibraryRecentPracticeSummaryBySheet` at `402-493` |
| `Complex Method` | `getLibraryRecentPracticeSummaryBySheet` at `402-493`, `evaluatePracticeGoalCompletion` at `652-720`, `getHomeDashboardAnalyticsSource` at `250-308`, `getHomePracticeStreaks` at `180-226` |
| `Complex Conditional` | `parseBrowserLocalDayKey` at `140`, `getLibraryRecentPracticeSummaryBySheet` at `434`, `463` |
| `Large Method` | `getLibraryRecentPracticeSummaryBySheet` at `402-493` |
| `Excess Number of Function Arguments` | `createCompletedEvaluation` at `611-630` |
| `Primitive Obsession` | 32% of functions in the module take primitive arguments |

CodeScene 的信号很集中：这里的问题不是一个孤立 helper 写得丑，而是“多个相邻 slice 在同一文件里持续堆叠后，复杂度和职责面一起上涨”。

### 语义重复

1. `getHomeDashboardAnalyticsSource(...)` 和 `getLibraryRecentPracticeSummaryBySheet(...)` 维护了同一套“session/recording 双通道聚合骨架”。

   两者都对 `sessions` 和 `recordings` 做两段遍历；都做 `sheetId` trim/判空；都检查 segment presence；都对 duration/timestamp 做清洗；都在循环里手动维护 aggregate state。名字和输出不同，但输入规范化与遍历骨架高度相似。

   Evidence:
   - `src/domain/practice/rules.ts:250-308`
   - `src/domain/practice/rules.ts:402-493`

2. 旧的单目标 continue-practice 包装与新的兼容包装流语义重复。

   `getContinuePracticeTarget(...)` 直接把 session 映射成 quick/sheet `href` + label；而较新的 continue-practice 流已经先产出 target identity，再由 `getHomeCompatibleContinuePracticeTarget(...)` 产出同样的 quick/sheet 兼容对象。两条路径表达的是同一类“Home 兼容继续练习目标”，只是输入来源不同。

   Evidence:
   - `src/domain/practice/rules.ts:72-96`
   - `src/domain/practice/continue-practice.ts:129-151`

3. “trim 后为空即 null”的字符串清洗原语在 practice 家族被重复书写。

   `normalizeAnalyticsId(...)`、`normalizeGoalId(...)`、`requiredString(...)`、`normalizeRequiredString(...)`、`getRequiredTargetId(...)`、`normalizeOptionalContextId(...)` 本质都在做同一件事：字符串类型守卫 + `trim()` + 空串折叠为 `null`/空值。

   Evidence:
   - `src/domain/practice/rules.ts:310-313,510-512`
   - `src/domain/practice/recent-activity.ts:374-381`
   - `src/domain/practice/session-comparison.ts:559-566`
   - `src/domain/practice/session-history-groups.ts:332-339`
   - `src/components/home/continue-practice-navigation.ts:37-45`
   - `src/services/practice-session/service.ts:86-89`

4. goal 输入校验被重做了一遍。

   仓内已经有 `localPracticeGoalSchema` / `parseLocalPracticeGoal(...)` / `validateLocalPracticeGoal(...)`，但 `evaluatePracticeGoalCompletion(...)` 仍重新维护 `kind`、`period`、`status`、`target`、`createdAt` 的 normalize/invalid 分支矩阵。这里不是简单复用 schema 后做 evaluator，而是在 evaluator 里再造一层 parse/validation surface。

   Evidence:
   - `src/domain/practice/rules.ts:502-557,658-691`
   - `src/domain/practice/validation.ts:166-217`
   - `src/infrastructure/db/practice-goal-repository.ts:97-99`

5. 正数 duration 清洗有命名重复与内联重复两套写法。

   文件内既有 `validDurationMs(...)`，又在 `sumGoalDurationMs(...)` 里内联写 `Number.isFinite(session.durationMs) && session.durationMs > 0 ? session.durationMs : 0`。这是同一种防御性规则的两种实现。

   Evidence:
   - `src/domain/practice/rules.ts:316-318`
   - `src/domain/practice/rules.ts:567-578`

### 可删候选

1. `getContinuePracticeTarget(...)` 是明显的历史兼容残留候选。

   当前 source code 已经改走 `getContinuePracticeTargets(...)` + `getHomeCompatibleContinuePracticeTarget(...)` 的双层流，`getContinuePracticeTarget(session)` 在产品源码里没有调用点，只剩自身导出。它更像 P3-08 之前的旧单目标导航壳。

   Evidence:
   - `src/domain/practice/rules.ts:72-96`
   - `src/domain/practice/continue-practice.ts:93-151`
   - `src/services/practice-session/service.ts:815-822`
   - `docs/v1/implementation-slices/plans/P3-08-continue-practice-targets.md:158-160`

2. `applyPracticeTrigger(...)` 很像未被产品继续消费的旧 transport reducer。

   仓内 source grep 只命中 `rules.ts` 自身导出和旧状态文档，没有产品调用方。这说明它至少是“当前产品路径不可见”的导出表面积。

   Evidence:
   - `src/domain/practice/rules.ts:722-732`
   - `docs/v0/module-status.json:1308`

3. `HomeDashboardAnalyticsSource` 里的 `goals?` / `emptyState.hasGoals` 是可合并的占位状态。

   类型层允许 `goals?`，selector 与 UI empty defaults 却都把 `hasGoals` 固定为 `false`。这不是活跃的业务状态，而是被 later goal slices 推迟后的保留接口。

   Evidence:
   - `src/domain/practice/types.ts:80-98`
   - `src/domain/practice/rules.ts:300-306`
   - `src/hooks/use-practice-session-dashboard.ts:122-143`
   - `src/components/home/home-dashboard.tsx:122-143`
   - `docs/v1/implementation-slices/plans/P3-11-home-dashboard-analytics-source.md:128-129`
   - `docs/v1/implementation-slices/plans/P3-12-home-dashboard-analytics-ui.md:107`

4. `getHomeDashboardAnalyticsSource(...)` 里的 `summary: getTodayPracticeSummary([...sessions], now)` 带有无意义复制壳。

   `getTodayPracticeSummary(...)` 只读入参，但这里仍把 `readonly` sessions 展成新数组再调用。这不是大债，但属于“留着不痛不痒、删掉也不影响语义”的薄包装残留。

   Evidence:
   - `src/domain/practice/rules.ts:228-240`
   - `src/domain/practice/rules.ts:290-306`

### 过度复杂点

1. `getLibraryRecentPracticeSummaryBySheet(...)` 是手写 mutable draft 状态机。

   它同时维护 `lastPracticedAtMs`、`lastSessionAtMs`、`latestRecordingAtMs`、`sessionLatestRecordingId`、`sessionCount`、`recordingCount`、`segmentPracticeCount`、`durationMs` 等多条演进中的状态；然后再做过滤、排序、截断、映射。CodeScene 把它同时标成 `Bumpy Road Ahead`、`Complex Method`、`Large Method` 是合理的。

   Evidence:
   - `src/domain/practice/rules.ts:327-399`
   - `src/domain/practice/rules.ts:402-493`

2. `evaluatePracticeGoalCompletion(...)` 不是单纯 evaluator，而是 validator + normalizer + period policy + status resolver 的复合状态机。

   一个函数里要处理 goal id、kind、period、status、target、createdAt 是否有效，再根据 `minutes` / `sessions` / `takes` 走不同计算分支，还要在 derived progress 和 stored status 之间拼装最终状态。这会让读者同时保留“输入合法性模型”和“完成度模型”两套心智模型。

   Evidence:
   - `src/domain/practice/rules.ts:502-539`
   - `src/domain/practice/rules.ts:542-649`
   - `src/domain/practice/rules.ts:652-720`

3. `getHomePracticeStreaks(...)` 把本地日历运算拆成多段 string/date 游标逻辑。

   streak 计算要跨 `getBrowserLocalDayKeyFromIso(...)`、`parseBrowserLocalDayKey(...)`、`getRelativeBrowserLocalDayKey(...)`、`countConsecutiveLocalDaysEndingAt(...)` 才能建立完整推导路径。功能不算巨大，但局部算法被分散后，理解成本高于“一个明确的 local-day streak abstraction”。

   Evidence:
   - `src/domain/practice/rules.ts:117-171`
   - `src/domain/practice/rules.ts:180-226`

4. `getHomeDashboardAnalyticsSource(...)` 以多个计数器和占位状态拼接 Home DTO。

   这里同时统计 total duration、distinct practiced sheets、segment session 数、recording presence、today summary、empty-state booleans。业务判断并不深，但横向 state 很多，尤其 `hasRecordings` 与 `hasSessionRecordingCount` / `sheetTakes` 的组合、`hasGoals` 的硬编码常量，进一步增加了阅读噪音。

   Evidence:
   - `src/domain/practice/rules.ts:250-308`

5. 整个文件已经形成“多 read model 共居一室”的上下文切换负担。

   一个读者从 duration 规则读到 continue navigation，再跳到 local-day policy、streak、Home analytics、Library summary、goal evaluator、transport reducer。即使每段局部都能看懂，跨段切换也会持续消耗工作记忆。

   Evidence:
   - `src/domain/practice/rules.ts:38-96`
   - `src/domain/practice/rules.ts:180-308`
   - `src/domain/practice/rules.ts:402-720`
   - `src/domain/practice/rules.ts:722-732`

### 现成库 / 现有仓内原语本可复用但被重造的点

1. `validateLocalPracticeGoal(...)` / `parseLocalPracticeGoal(...)` 已经存在，但 goal evaluator 又维护了一套平行校验分支。

   目标类型枚举、正整数 target、日期合法性、默认 status 都已经在 `validation.ts` 里定义；goal repository 写路径也调用了 `validateLocalPracticeGoal(...)`。这意味着 evaluator 理论上不必再手写一整串 invalid reason 树，至少当前仓内已经存在更强的校验原语。

   Evidence:
   - `src/domain/practice/validation.ts:166-217`
   - `src/infrastructure/db/practice-goal-repository.ts:97-99`
   - `src/domain/practice/rules.ts:502-557,658-691`

2. continue-practice 家族已经有新的“身份对象 + 导航转换”分层，`rules.ts` 仍保留旧式导航包装。

   新路径是 `selectContinuePracticeTargets(...)` 先产生 `ContinuePracticeTargetIdentity[]`，再由 `getHomeCompatibleContinuePracticeTarget(...)` 或 UI 侧的 `getContinuePracticeTargetHref(...)` 转为具体导航。`rules.ts` 的 `getContinuePracticeTarget(...)` 等于又保留了一套旧版导航构造。

   Evidence:
   - `src/domain/practice/continue-practice.ts:93-151`
   - `src/components/home/continue-practice-navigation.ts:7-31`
   - `src/domain/practice/rules.ts:72-96`

3. 统一字符串规范化原语已经在仓内多次出现，但 practice 家族仍各自重写。

   `src/lib/recordings-review/string-normalization.ts` 已经导出了可复用的 `normalizeRequiredString(...)`；practice 家族却在 `rules.ts`、`recent-activity.ts`、`session-comparison.ts`、`session-history-groups.ts`、service、component 里各自维护变体。问题不只是一个 helper 写了几次，而是“trim-to-null”这种低层原语没有真正收口。

   Evidence:
   - `src/lib/recordings-review/string-normalization.ts:1-8`
   - `src/domain/practice/rules.ts:310-313,510-512`
   - `src/domain/practice/recent-activity.ts:374-381`
   - `src/domain/practice/session-comparison.ts:559-566`
   - `src/domain/practice/session-history-groups.ts:332-339`
   - `src/services/practice-session/service.ts:86-89`

4. 已有专门 goal service，但 analytics contract 仍携带第二条 dormant goal surface。

   `practice-goals` service 已经承担“持久化 goals + 评价 goals”的专门边界；与此同时，analytics source 类型仍保留 `goals?` / `hasGoals`。这说明仓内已经有更明确的 goal 边界，而 `rules.ts`/analytics contract 还背着先前切片留下的预留面。

   Evidence:
   - `src/services/practice-goals/service.ts:30-43`
   - `src/domain/practice/types.ts:80-98`
   - `src/domain/practice/rules.ts:300-306`

### 边界混用

1. domain rules 与 route/navigation 边界混用。

   `rules.ts` 直接 import `getSheetPracticeHref(...)`，并返回带 `href` 与文案 label 的 `ContinuePracticeTarget`。这已经不是纯 domain identity，而是可直接驱动 UI 导航的对象。

   Evidence:
   - `src/domain/practice/rules.ts:18`
   - `src/domain/practice/rules.ts:72-96`
   - `src/domain/sheet/routes.ts:1-31`

2. generic rules 文件承载了 Home 与 Library 专属 read model。

   `HomeDashboardAnalyticsSource`、`HomePracticeStreaks`、`LibraryRecentPracticeSummaryBySheetSource` 都是明显页面/场景命名，不是通用 domain invariant。它们放在 `rules.ts` 会把页面语义塞进基础规则模块。

   Evidence:
   - `src/domain/practice/types.ts:80-127`
   - `src/domain/practice/rules.ts:174-308`
   - `src/domain/practice/rules.ts:320-493`

3. browser-local-day policy 被直接编码成 domain 语义。

   API 名字就是 `isBrowserLocalDay(...)` / `getBrowserLocalDayKey(...)`，而 Home streak、today summary、goal period 都直接依赖这套 browser-local policy。这让 domain 规则层与 browser locale/timezone 假设绑定。

   Evidence:
   - `src/domain/practice/rules.ts:99-171`
   - `src/domain/practice/rules.ts:180-240`
   - `src/domain/practice/rules.ts:559-565`

4. 持久化活动聚合与 client transport reducer 混放。

   同一文件前半段在聚合 persisted sessions/recordings，末尾却又出现 `applyPracticeTrigger(...)` 这种瞬时 transport state reducer。它不共享同一聚合输入，也不共享同一输出形态，只是“正好都叫 practice”而被塞在一起。

   Evidence:
   - `src/domain/practice/rules.ts:250-720`
   - `src/domain/practice/rules.ts:722-732`

### 债务成因取证

1. 这是典型的 accretion debt，不是一次性失控。

   `git log --follow -- src/domain/practice/rules.ts` 显示该文件在四天内连续吸收了多次 slice：

   - `8180eab0` (`2026-06-30`) P3-05 duration rules，`+36`
   - `d31592a8` (`2026-07-01`) P3-10 goal evaluator，`+233`
   - `0c96d229` (`2026-07-01`) P3-11 analytics source，`+78`
   - `c7cbddfa` (`2026-07-01`) P3-13 streaks，`+116`
   - `24b7b0b6` (`2026-07-03`) P5-04 library summary，`+177`

   这条历史说明它不是因为某个大 PR 一次性变臃肿，而是因为每个小 slice 都选择“往已有 rules 文件再放一个纯 selector”。

2. 计划文档持续鼓励“复用现有 practice-rule surface”，自然会把新逻辑继续压到这里。

   P3-10 明确写了“复用 `src/domain/practice/rules.ts`，不要新建 `goal-completion.ts`”；P3-11、P3-13、P5-04 都把“在 `rules.ts` 里加 pure selector + 在 service 里加 thin read wrapper”定义为优先路径。这个工作流在单个 slice 上看是克制的，在累计层面却会把模块做成杂物柜。

   Evidence:
   - `docs/v1/implementation-slices/plans/P3-10-goal-completion-evaluator.md:74-88`
   - `docs/v1/implementation-slices/plans/P3-11-home-dashboard-analytics-source.md:156-161`
   - `docs/v1/implementation-slices/plans/P3-13-home-practice-streaks.md:164-169`
   - `docs/v1/implementation-slices/plans/P5-04-library-recent-practice-summary-source.md:133-138`

3. 兼容层残留是被有意保留的，不是偶然遗忘。

   P3-08 计划明确要求保留 `getContinuePracticeTarget()` 作为 Home 兼容 wrapper。这解释了为什么旧包装函数会在新 continue-target flow 上线后仍留在边界里。

   Evidence:
   - `docs/v1/implementation-slices/plans/P3-08-continue-practice-targets.md:158-160`

4. goal 相关的占位状态是“延后集成”留下的债，不是实现时漏了一行。

   P3-11 允许 analytics source 可选携带 `goals`，但同时强调没有 caller-provided goal input 就应 defer 到 P3-14/P3-15；P3-12 又明确 `hasGoals` 在后续 goal slices 前保持 `false`。这意味着现在看到的 dormant state 是计划驱动的预留壳。

   Evidence:
   - `docs/v1/implementation-slices/plans/P3-11-home-dashboard-analytics-source.md:108-129`
   - `docs/v1/implementation-slices/plans/P3-12-home-dashboard-analytics-ui.md:107`

### 审查漏检取证

1. 之前的 coding/review 循环主要在守“最小改动”和“复用边界”，不是在守“模块最终形状”。

   计划文档 repeatedly 把成功标准写成“一个 pure selector + 一个 thin service wrapper + 不新增模块家族”。这会让审查自然聚焦到局部 correctness、只读性、与 reuse 约束，而不是追问 `rules.ts` 是否已经过载。

   Evidence:
   - `docs/v1/implementation-slices/plans/P3-10-goal-completion-evaluator.md:76-82`
   - `docs/v1/implementation-slices/plans/P3-11-home-dashboard-analytics-source.md:157-161`
   - `docs/v1/implementation-slices/plans/P5-04-library-recent-practice-summary-source.md:133-138`

2. 项目级热点视角不会主动放大这个文件。

   这次 CodeScene baseline 里，`rules.ts` 不是 hotspot。也就是说，如果审查更依赖 change-frequency/hotspot 入口，而不是主动重读整文件，它不会被自动提级为“现在就得拆”的对象。

3. CodeScene 的单文件审查抓到了复杂度，但没有抓到跨文件语义重复。

   这次 baseline 能看到 `Complex Method`、`Bumpy Road Ahead`、`Primitive Obsession`，但看不到 `normalizeAnalyticsId` vs `requiredString` vs `normalizeRequiredString`、旧 continue wrapper vs 新 continue wrapper 这类跨文件重复。若 review agent 主要围绕当前 diff 与 CodeScene 输出工作，就容易错过这类横向重复。

4. 兼容 wrapper 被文档显式要求保留，导致它在 review 中更像“需求”而不是“债务”。

   `getContinuePracticeTarget()` 并不是无意识地漏删；计划文本直接要求保留兼容包装。既然它当时是 contract obligation，review 很容易把它看成合理的过渡层，而不是要追打的历史残留。

   Evidence:
   - `docs/v1/implementation-slices/plans/P3-08-continue-practice-targets.md:159-160`

5. 未使用导出与 dormant contract 在现有验证面里不显眼。

   `getContinuePracticeTarget(...)`、`applyPracticeTrigger(...)` 这类导出即使当前无调用者，也不会因为 barrel export 仍成立而自动暴露成运行错误；`hasGoals`/`goals?` 这种占位 contract 也能被 empty defaults 平滑吞掉。结果是行为测试能通过，但结构性残留继续存在。

### 证据清单

- `src/domain/practice/rules.ts:72-96` - 旧式 continue-practice 导航包装直接返回 `href` 与 UI label。
- `src/domain/practice/rules.ts:99-171` - browser-local-day 解析、key、相对日游标、连续天数算法都在同一模块内手写。
- `src/domain/practice/rules.ts:180-226` - streak selector 依赖前述 local-day string/date helper 串联。
- `src/domain/practice/rules.ts:228-240` - today summary 只是 Home DTO 片段，却放在通用 rules 模块。
- `src/domain/practice/rules.ts:250-308` - Home analytics 聚合、today summary 嵌套、empty-state 常量、`hasGoals: false`。
- `src/domain/practice/rules.ts:310-318` - `normalizeAnalyticsId(...)` 与 `validDurationMs(...)` 两个低层清洗 helper。
- `src/domain/practice/rules.ts:327-399` - Library summary draft 对象维护多条可变中间状态。
- `src/domain/practice/rules.ts:402-493` - Library summary 的 session/recording 双循环、排序、截断、映射都集中在一个方法里。
- `src/domain/practice/rules.ts:502-539` - goal kind/period/status/target 的本地枚举集合与 normalize 分支。
- `src/domain/practice/rules.ts:542-557` - invalid evaluation factory，把多种输入问题映射到统一 invalid 形态。
- `src/domain/practice/rules.ts:559-578` - goal period 判定与 duration 清洗再次内联。
- `src/domain/practice/rules.ts:611-630` - `createCompletedEvaluation(...)` 七参数 helper，CodeScene 标记为 Excess Number of Function Arguments。
- `src/domain/practice/rules.ts:652-720` - goal evaluator 主状态机。
- `src/domain/practice/rules.ts:722-732` - `applyPracticeTrigger(...)` transport reducer，和前面持久化聚合职责脱节。
- `src/domain/practice/continue-practice.ts:93-151` - 新 continue-target flow 已提供 target list 选择与 Home 兼容包装。
- `src/components/home/continue-practice-navigation.ts:7-31` - 导航 href 生成已经在 UI 侧有单独 helper。
- `src/domain/practice/validation.ts:166-217` - LocalPracticeGoal schema、parse、validate 原语已存在。
- `src/infrastructure/db/practice-goal-repository.ts:97-99` - goal 存储写路径已经调用 `validateLocalPracticeGoal(...)`。
- `src/services/practice-goals/service.ts:30-43` - goal evaluation 已经有单独 service 边界。
- `src/services/practice-session/service.ts:815-822` - service 当前通过 `getHomeCompatibleContinuePracticeTarget(...)` 实现兼容单目标，而不是使用 `rules.ts` 的旧 helper。
- `src/services/practice-session/service.ts:839-878` - analytics/streak/library summary 都是“thin read wrapper + selector”模式，证明这些 selector 是按 slice 增量堆进来的。
- `src/domain/practice/types.ts:80-98` - analytics contract 保留 `goals?` 与 `hasGoals`。
- `src/domain/sheet/routes.ts:1-31` - route builder 被 `rules.ts` 直接依赖。
- `docs/v1/implementation-slices/plans/P3-08-continue-practice-targets.md:158-160` - 计划明确要求保留 `getContinuePracticeTarget()` 兼容 wrapper。
- `docs/v1/implementation-slices/plans/P3-10-goal-completion-evaluator.md:74-88` - 计划明确要求复用 `rules.ts` 而不是新建 evaluator 模块。
- `docs/v1/implementation-slices/plans/P3-11-home-dashboard-analytics-source.md:156-161` - 计划要求在 `rules.ts` 加 pure helper，并在 service 加 thin wrapper。
- `docs/v1/implementation-slices/plans/P3-12-home-dashboard-analytics-ui.md:107` - `hasGoals` 明确保持 `false` 直到后续 goal slices。
- `docs/v1/implementation-slices/plans/P3-13-home-practice-streaks.md:164-169` - streak 计划要求把 local-day/streak selector 继续加在 `rules.ts` 旁边。
- `docs/v1/implementation-slices/plans/P5-04-library-recent-practice-summary-source.md:133-138` - library summary 计划再次要求在 `rules.ts` 加 pure selector。
