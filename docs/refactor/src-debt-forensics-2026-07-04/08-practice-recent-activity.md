# 08 practice recent activity 债务取证

## 文件概况

- 目标文件：`src/domain/practice/recent-activity.ts`
- 角色定位：把 `PracticeSession[]`、`SheetRecordingMetadata[]` 和目标解析结果组装成首页 Recent Activity 读模型。
- 对外产物：`HomeRecentActivityItem`、`HomeRecentActivityResult`、`selectHomeRecentActivity(...)`。
- 实际承担的职责不止“挑选最近活动”：
  - 目标解析：把 sheet / segment lookup 结果折叠成 `targetState`。
  - 展示文案：直接产出 `label`、`metadata`、`disabledReason`。
  - 排序裁剪：做去重、排序、limit 归一化。
  - 容错清洗：做 timestamp / bpm / duration / string 归一化。
- 读取范围说明：本次只读了目标文件及必要同域/相邻边界源码，忽略了所有 tests 文件。

## CodeScene 基线

- 项目上下文：CodeScene 默认项目 `82174`（当前环境由 `CS_DEFAULT_PROJECT_ID` 锁定）。
- `code_health_score`：`8.1`
  - 解释：仍在黄区，不是红区烂文件，但已出现结构性维护债。
- `code_health_review` 主要信号：
  - `resolveTarget` 复杂度 `cc = 23`，位于 `src/domain/practice/recent-activity.ts:198-238`。
  - `disabledReasonFor` 复杂度 `cc = 7`，位于 `src/domain/practice/recent-activity.ts:324-338`。
  - 复杂条件：
    - `src/domain/practice/recent-activity.ts:208`
    - `src/domain/practice/recent-activity.ts:307`
  - 参数过多：
    - `target(...)` 5 个参数，`src/domain/practice/recent-activity.ts:240-248`
    - `labelFor(...)` 5 个参数，`src/domain/practice/recent-activity.ts:250-266`
- `list_technical_debt_hotspots_for_project_file`：当前不是 CodeScene 热点文件，返回空列表。
- 基线结论：这不是“马上炸”的热点文件，但已经进入“功能可交付、结构开始散”的典型黄区状态。

CodeScene hotspot 链接：

- <https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots>

## 语义重复

### 1. target 解析逻辑成片复制

`recent-activity.ts` 的 `resolveTarget(...)` 和 `session-comparison.ts` 的 `resolveTarget(...)` 本质上在做同一件事：  
给 session / recording 归一化出 `sheetId`、`segmentId`、lookup 状态，再产出 valid / missing / lookup-failed / no-target。

- `src/domain/practice/recent-activity.ts:198-238`
- `src/domain/practice/session-comparison.ts:202-252`

重复点不是“几行 helper 一样”，而是完整的状态决策树一样：

- quick 特判
- `sheetId` 缺失和 `segmentId` 缺失判断
- `sheetTarget` 的 `lookup-failed` / `missing`
- `segmentTarget` 的 `lookup-failed` / `missing`
- valid 收口

差别只是在 `session-comparison.ts` 额外带了 `segmentRangeLabel`，这说明两边已经不是共享原语，而是各自 fork 出了一个近亲版本。

### 2. 归一化 helper 重复

以下 helper 在 home 读模型附近重复出现，命名不同但语义相同：

- 字符串归一化
  - `src/domain/practice/recent-activity.ts:374-382` `requiredString(...)`
  - `src/domain/practice/session-comparison.ts:559-567` `requiredString(...)`
  - `src/domain/practice/session-history-groups.ts:332-340` `normalizeRequiredString(...)`
  - `src/domain/practice/rules.ts:310-314` `normalizeAnalyticsId(...)`
- timestamp 归一化 / 排序值
  - `src/domain/practice/recent-activity.ts:348-357`
  - `src/domain/practice/session-comparison.ts:479-485,533-535`
  - `src/domain/practice/session-history-groups.ts:314-330,342-348`
  - `src/domain/practice/rules.ts:344-356`
- 数值清洗
  - `src/domain/practice/recent-activity.ts:360-366`
  - `src/domain/practice/session-comparison.ts:537-550`
  - `src/domain/practice/rules.ts:316-318`
- limit 归一化
  - `src/domain/practice/recent-activity.ts:368-372`
  - `src/domain/practice/continue-practice.ts:290-294`
  - `src/domain/practice/session-comparison.ts:553-557`

这些 helper 不是偶发撞车，而是“home dashboard 旁边每长一个新读模型，就复制一套局部清洗函数”的模式。

### 3. segment range 表达被重复定义，甚至发生反向解析

- `recent-activity.ts` 负责把 range 编码成展示字符串：`m{start}-{end}`
  - `src/domain/practice/recent-activity.ts:316-321`
- `continue-practice.ts` 再从 `metadata` 字符串数组里用正则把这个 range 反解回来
  - `src/domain/practice/continue-practice.ts:261-263`
- `session-comparison.ts` 还保留了另一份几乎相同的 `formatSegmentRange(...)`
  - `src/domain/practice/session-comparison.ts:525-531`

这类重复比普通 helper 复制更重，因为它已经形成“展示字符串即隐式协议”。

### 4. 状态文案在 domain / UI 多处重复表达

- `recent-activity.ts` 里直接产出：
  - `Quick Practice`
  - `Deleted sheet`
  - `Sheet practice`
  - `Sheet no longer exists.`
  - `Segment no longer exists.`
  - `No target is available for this local activity.`
- 证据：
  - `src/domain/practice/recent-activity.ts:250-266`
  - `src/domain/practice/recent-activity.ts:324-338`
- 同类文案在别处再次出现：
  - `src/domain/practice/session-history-groups.ts:124-158,165-216`
  - `src/components/home/home-dashboard.tsx:1415-1445`
  - `src/hooks/use-practice-session-dashboard.ts:549-567,569-586`

这说明 repo 里没有稳定的“target state -> 文案/展示语义”单一出口。

## 可删候选

### 1. `target(...)` 是零行为包装

- 位置：`src/domain/practice/recent-activity.ts:240-248`
- 现状：只把 5 个参数原样装箱成对象，没有额外约束、校验或标准化。
- 取证判断：这是典型的历史残留包装。它存在的主要作用是让 `resolveTarget(...)` 的 `return` 句更短，但没有真正抽象价值。

### 2. `occurredAt` 与 `sortTimestamp` 是并行状态

- 生成处：`src/domain/practice/recent-activity.ts:180-181`
- 排序消费：`src/domain/practice/recent-activity.ts:348-353`
- 下游消费：`src/components/home/home-dashboard.tsx:1243`, `1335`
- 取证判断：
  - `sortTimestamp` 完全由 `occurredAt` 派生。
  - 下游又保留了 `sortTimestamp ?? occurredAt` 的双轨读取。
  - 这说明当前模型把“原始时间”和“已验证排序时间”同时暴露成状态，而不是在一个边界里完成归一化后只保留一种表达。

### 3. `durationMs` / `bpm` / `timeSignature` 当前更像写入即闲置字段

- 定义：`src/domain/practice/recent-activity.ts:33-35`
- 写入：`src/domain/practice/recent-activity.ts:191-193`
- 已读到的当前消费者：
  - `src/components/home/home-dashboard.tsx:1333-1384`
  - `src/domain/practice/continue-practice.ts:156-223`
- 取证判断：
  - 已读消费者使用的是 `label`、`metadata`、`targetState`、`sheetId`、`segmentId`、`sessionId`、`recordingId`。
  - 没有看到消费者直接读取 `durationMs`、`bpm`、`timeSignature`。
  - 这些字段当前更像“为了将来可能有用先挂上”的搬运态，而不是被稳定消费的必要状态。

### 4. `targetState` 与 `disabledReason` 也是可合并状态候选

- 派生处：`src/domain/practice/recent-activity.ts:184,194,324-338`
- UI 再解释：`src/components/home/home-dashboard.tsx:1334-1361,1378-1381,1415-1445`
- 取证判断：
  - `disabledReason` 是从 `targetState` 单向派生出来的。
  - UI 仍然必须重新解释 `targetState` 来画状态 badge。
  - 结果是同一个状态源被拆成两个平行表达：一个给文案，一个给样式/状态标签。

## 过度复杂点

### 1. `resolveTarget(...)` 实际上是一个小型状态机

- 位置：`src/domain/practice/recent-activity.ts:198-238`
- CodeScene 复杂度：`cc = 23`
- 复杂来源：
  - quick / sheet 两种来源
  - sheetId 有无
  - segmentContext 有无
  - segmentId 有无
  - sheet lookup 三态
  - segment lookup 三态
- 结果：一个函数同时编码了数据清洗、状态判定、缺失容错、展示回退所需字段，已经超出普通 selector helper 的复杂度。

### 2. `createItem(...)` 同时生成多条并行派生语义

- 位置：`src/domain/practice/recent-activity.ts:174-196`
- 同时派生：
  - `sortTimestamp`
  - `label`
  - `metadata`
  - `targetState`
  - `disabledReason`
- 取证判断：这意味着一个输入变动会同时影响排序、展示标题、展示 pills、禁用提示，多种关注点绑在一个装配点上，耦合度很高。

### 3. `selectHomeRecentActivity(...)` 的行为契约大部分是隐式的

- 位置：`src/domain/practice/recent-activity.ts:93-118`
- 隐式规则：
  - sessions 和 recordings 拼成一个临时数组
  - 通过 `id` 做去重
  - 通过 `sortTimestamp` + `KIND_PRIORITY` + `id` 排序
  - 再 slice limit
- 问题不在于代码长，而在于“为什么 recording 优先于 session”“为什么 dedupe key 这样定”“为什么 quick 最后排”这些业务契约没有被显式命名，只埋在 selector 内部常量和排序链里。

### 4. `labelFor(...)` / `disabledReasonFor(...)` 把展示语义硬编码进 domain

- `src/domain/practice/recent-activity.ts:250-266`
- `src/domain/practice/recent-activity.ts:324-338`
- 这会让 domain 层同时承担：
  - 业务状态含义
  - UI 文案选择
  - 缺失资源的最终用户提示

## 现成库 / 现有仓内原语本可复用但被重造的点

### 1. target 解析原语已在相邻读模型中重复存在

- `src/domain/practice/session-comparison.ts:202-252` 已经有一套近乎同构的 target 解析。
- `src/domain/practice/session-history-groups.ts:258-281` 已经有 sheet / segment target state 归类函数。
- 取证结论：仓内不是没有原语，而是原语散落在相邻读模型内部，没有被抽出来复用。

### 2. string / timestamp / duration 清洗原语早已存在

- `src/domain/practice/session-history-groups.ts:326-340`
- `src/domain/practice/rules.ts:310-318,344-356`
- `src/domain/practice/session-comparison.ts:533-567`

`recent-activity.ts` 又重写了一套 `requiredString(...)`、`validTimestamp(...)`、`validDuration(...)`、`validBpm(...)`。  
这不是缺基础设施，而是选择了“每个读模型自带一套私有净化逻辑”。

### 3. `formatRange(...)` 没复用现成同义实现

- `src/domain/practice/recent-activity.ts:316-321`
- `src/domain/practice/session-comparison.ts:525-531`

这两段逻辑几乎是逐字符同义，只是名字不同。

### 4. target state 文案没有统一出口

- Domain 已有：
  - `src/domain/practice/recent-activity.ts:250-266,324-338`
  - `src/domain/practice/session-history-groups.ts:124-158,165-216`
- UI / hook 仍然再做一套：
  - `src/components/home/home-dashboard.tsx:1415-1445`
  - `src/hooks/use-practice-session-dashboard.ts:549-567,569-586`

这说明现成仓内原语不是不存在，而是没有收敛成共享契约。

## 边界混用

### 1. domain 层直接输出 UI 文案和 UI 展示片段

- `label`、`metadata`、`disabledReason` 都是 UI 可直接显示的字符串。
- 证据：
  - `src/domain/practice/recent-activity.ts:24-25,36`
  - `src/domain/practice/recent-activity.ts:250-321`
  - `src/domain/practice/recent-activity.ts:324-338`

这里混入了明显的展示层语义：

- `"Quick Practice"`
- `"Deleted sheet"`
- `"0s"`
- `"120 BPM"`
- `"m12-16"`
- `"Sheet no longer exists."`

这些更像 view-model / presenter 的职责，而不是纯 domain 状态。

### 2. domain-to-domain 通过展示字符串耦合

- 生产字符串：`src/domain/practice/recent-activity.ts:268-321`
- 反解字符串：`src/domain/practice/continue-practice.ts:261-263`

`continue-practice.ts` 并不是读取结构化 `segmentRangeLabel`，而是在 `metadata` 中用正则找 `mX-Y`。  
这说明两个 domain 文件之间传递的不是稳定结构，而是展示层字符串协议。

### 3. service / domain 共同拼成一个读模型状态机

- service 负责 sheet/segment lookup：
  - `src/services/practice-session/service.ts:306-427`
- domain 再负责把 lookup 结果解释成 recent activity item：
  - `src/domain/practice/recent-activity.ts:198-238`

这不是简单的“service 拿数据、domain 算业务”，而是一个 home read-model 被拆成两半：

- service half：收集 lookup source、打 sheet/segment target map
- domain half：消费 target map，决定 missing / failed / valid / no-target 语义

边界并不脏到无法理解，但职责切面已经是按“本次首页功能需求”切，而不是按稳定领域原语切。

### 4. UI 仍要重新解释同一个 target state

- `src/components/home/home-dashboard.tsx:1415-1445`

domain 已经给了：

- `label`
- `disabledReason`
- `targetState`

但 UI 仍然必须再把 `targetState` 映射成：

- badge label
- badge className
- stale 样式分支

这说明展示职责并没有真正留在某一层，而是 domain 和 component 各拿了一半。

## 债务成因取证

以下为基于源码结构的取证推断，不是提交历史结论：

### 1. 首页同域读模型是并排长出来的，不是先抽公共原语再长功能

从文件形态看，`recent-activity.ts`、`continue-practice.ts`、`session-comparison.ts` 明显属于同一批 home / dashboard / continue experience 读模型家族：

- 都处理 session / recording 的最近活动语义
- 都自带自己的 normalize helper
- 都自带自己的 target 状态映射
- 都带 home 特有的文案或展示字段

这更像“为一个新卡片/新面板快速补一个读模型”，而不是“先形成稳定活动原语，再由各面板消费”。

### 2. 为了让 UI 变薄，把展示文案前推到了 domain

`recent-activity.ts` 不只输出结构化状态，还直接输出最终用户可读文案。  
这通常是为了让组件层更简单、更少 if/switch，但代价是：

- 文案散落在 domain
- 结构化状态和展示状态并行存在
- 新面板很容易复制同一套展示判断

### 3. 退化状态支持把 selector 推成了状态机

文件并不只处理 happy path，还要处理：

- sheet 已删除
- segment 已删除
- lookup 失败
- 本地活动没有 target
- quick 活动

一旦这些退化状态被要求直接体现在首页列表上，selector 很容易从“选最近活动”膨胀成“最近活动 + 目标资源可达性解释器”。

### 4. CodeScene 不把它列成 hotspot，降低了早期重构压力

当前它：

- 分数是 `8.1`
- 不是 hotspot

这意味着它很容易在 review 心智里被归为“可接受的中等复杂文件”，从而延迟了对重复和边界扩散的处理。

## 审查漏检取证

### 1. file-level review 很容易看见“功能完整”，看不见“家族式复制”

如果只看 `recent-activity.ts`，它会像一个自洽 selector。  
但真正的债是在它和：

- `session-comparison.ts`
- `continue-practice.ts`
- `session-history-groups.ts`
- `use-practice-session-dashboard.ts`
- `home-dashboard.tsx`

之间形成的重复与边界分裂。  
这类债需要跨文件对照，普通 coding agent / review agent / ChatGPT PR review 很容易只盯行为正确性。

### 2. 重复不是逐字复制，而是“轻微变体复制”

最容易漏检的是这种情况：

- 逻辑骨架一样
- 字段略有不同
- 一个多了 `segmentRangeLabel`
- 一个多了 `disabledReason`
- 一个输出文案，一个输出 warning tone

这让 reviewer 很容易把它们误判为“相近但独立的需求实现”，而不是应该共享的原语。

### 3. 字符串协议耦合藏得很深

`continue-practice.ts` 对 `metadata` 做正则反解这件事，如果不同时打开两份文件，很难第一眼发现：

- `recent-activity.ts` 先把 range 变成 UI 字符串
- `continue-practice.ts` 又把 UI 字符串当结构化数据读回来

这种问题测试可能照样全绿，行为上也未必立刻错，因此常规 review 流程很容易漏掉。

### 4. CodeScene 给的是“黄区但不尖叫”的信号

自动化信号本身也解释了为什么之前循环没把它挑出来：

- 不是红区
- 不是 hotspot
- smell 集中在复杂度和参数数，不是显式的“duplicate code”报警

在这种情况下，review 往往会优先处理功能 bug、类型错误、测试失败、构建失败，而不是主动追查读模型家族里的结构扩散。

## 证据清单

- `src/domain/practice/recent-activity.ts:93-118`  
  `selectHomeRecentActivity(...)` 同时负责拼接、去重、排序、裁剪，行为契约集中在单个 selector。
- `src/domain/practice/recent-activity.ts:198-238`  
  `resolveTarget(...)` 是本文件复杂度最高的状态决策树，CodeScene 标记 `cc = 23`。
- `src/domain/practice/recent-activity.ts:240-248`  
  `target(...)` 只是零行为对象包装，属于可删候选。
- `src/domain/practice/recent-activity.ts:250-266`  
  `labelFor(...)` 在 domain 内直接决定最终显示文案。
- `src/domain/practice/recent-activity.ts:268-321`  
  `metadataFor(...)` / `formatRange(...)` 生成 UI metadata，其中 `mX-Y` 成为后续隐式协议。
- `src/domain/practice/recent-activity.ts:324-338`  
  `disabledReasonFor(...)` 把 `targetState` 再派生为第二套状态表达。
- `src/domain/practice/recent-activity.ts:348-382`  
  timestamp / string / number 归一化 helper 在文件尾部自成一套私有原语。
- `src/domain/practice/session-comparison.ts:202-252`  
  存在近乎同构的 `resolveTarget(...)`，说明 target 解析没有抽成共享原语。
- `src/domain/practice/session-comparison.ts:525-567`  
  `formatSegmentRange(...)`、`validTimestamp(...)`、`requiredString(...)` 等 helper 与 `recent-activity.ts` 重复。
- `src/domain/practice/session-history-groups.ts:124-158,165-216`  
  “Quick Practice”“Deleted sheet”和 target state 判定在另一份 domain 文件里再次实现。
- `src/domain/practice/session-history-groups.ts:258-281`  
  已存在 sheet / segment target state 归类 helper，但没有被 recent activity 复用。
- `src/domain/practice/continue-practice.ts:156-223`  
  继续练习目标直接消费 `HomeRecentActivityItem`，说明 recent activity 已成为别的 domain 逻辑输入。
- `src/domain/practice/continue-practice.ts:261-263`  
  通过正则从 `metadata` 反解 `segmentRangeLabel`，证实展示字符串协议耦合。
- `src/domain/practice/rules.ts:310-318,344-356`  
  已有 `normalizeAnalyticsId(...)`、`validDurationMs(...)`、timestamp helper，同义净化原语分散存在。
- `src/services/practice-session/service.ts:306-427`  
  service 为 recent activity 单独构造 sheet / segment target maps，读模型跨 service/domain 切开。
- `src/services/practice-session/service.ts:430-455`  
  `readHomeRecentActivity(...)` 先做 gateway lookup，再把结果交给 domain selector，表明一个读模型横跨两层。
- `src/components/home/home-dashboard.tsx:1333-1384`  
  UI 只读取 `label`、`metadata`、`targetState`、`disabledReason`，未直接使用 `durationMs` / `bpm` / `timeSignature`。
- `src/components/home/home-dashboard.tsx:1415-1445`  
  UI 再次把 `targetState` 翻译成状态 badge 文案和样式，说明展示职责没有收口。
- `src/components/home/home-dashboard.tsx:1237-1265`  
  continue practice 行内容仍保留 `sortTimestamp ?? occurredAt` 双轨读取，证实时间状态并行存在。
- `src/hooks/use-practice-session-dashboard.ts:549-567,569-586`  
  home hook 对另一块读模型再次实现 sheet / segment target 文案翻译，说明 home 侧展示语义分散。

## 总结性判断

`src/domain/practice/recent-activity.ts` 的主要债，不是单点 bug，也不是单个超长函数本身，而是它作为“首页活动读模型”的中心节点，逐渐吸收了：

- target 资源解析语义
- 展示文案
- 格式化协议
- 轻量排序规则
- 多个 home 近邻读模型之间本应共享的原语

所以它现在呈现出的不是“坏到不能用”，而是“已经形成家族式复制、边界前移和隐式协议”的中期结构债。
