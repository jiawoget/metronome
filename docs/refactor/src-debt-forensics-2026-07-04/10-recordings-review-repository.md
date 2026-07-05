# `repository.ts` 债务取证

状态: complete
日期: 2026-07-05
目标文件: `src/lib/recordings-review/repository.ts`
取证方式: 先做 CodeScene 基线，再做静态源码阅读
范围: `src/lib/recordings-review/**`, `src/services/recordings-review/index.ts`, `src/lib/quick-metronome/recording-controller.ts`, `src/lib/sheet-practice/**`, `src/infrastructure/db/**`, `src/infrastructure/reference/reference-repository.ts`
排除: 所有 `tests/**`, `*.test.*`, `*.spec.*`

本报告是债务取证，不是 remediation plan，不提供修复步骤，不提供测试计划。

## 文件概况

- 这个文件表面上叫 `repository`，但它不是窄接口的持久化适配器。它同时承担了 `localStorage` 读写、快照归一化、兼容字段保留、并发写保护、模块级缓存、窗口事件分发、take selection 变更、recording organization 变更、error marker CRUD，以及 quick/sheet recording 历史操作的总入口。
- 导入边界横跨 `domain`、`infrastructure`、`recordings-review lib`，运行时直接依赖 `window.localStorage` 与 `window.dispatchEvent`。这说明它已经不是单纯 repository，而是浏览器端状态中心。
- 文件内部有明显的“半抽取”痕迹: `recording-history-operations.ts` 已经把一部分 save/delete/rollback 逻辑抽走，但 take selection、organization、marker、订阅和并发保护仍留在本文件，导致职责没有真正收口。
- 非测试调用面非常广。除 `recordings review` 自身 UI 外，`quick-metronome`、`sheet-practice`、`global practice session`、`browser settings local data cleanup` 都直接依赖它，进一步放大了单文件中心化带来的耦合成本。

已阅读的同域源码:

- `src/lib/recordings-review/repository.ts`
- `src/lib/recordings-review/recording-history-operations.ts`
- `src/lib/recordings-review/recording-history-snapshot.ts`
- `src/lib/recordings-review/recording-organization-metadata.ts`
- `src/lib/recordings-review/take-selection-metadata.ts`
- `src/lib/recordings-review/history.ts`
- `src/lib/recordings-review/error-markers.ts`
- `src/lib/recordings-review/artifact-storage.ts`
- `src/lib/recordings-review/waveform-comparison-sources.ts`
- `src/lib/recordings-review/types.ts`
- `src/services/recordings-review/index.ts`
- `src/lib/quick-metronome/recording-controller.ts`
- `src/lib/sheet-practice/recording-service.ts`
- `src/lib/sheet-practice/error-marker-service.ts`
- `src/infrastructure/db/recording-history-metadata-repository.ts`
- `src/infrastructure/db/browser-settings-local-data-service.ts`
- `src/infrastructure/db/global-practice-session-repository.ts`
- `src/infrastructure/db/practice-session-repository.ts`
- `src/infrastructure/reference/reference-repository.ts`
- `src/infrastructure/db/recording-artifact-repository.ts`

## CodeScene 基线

- 项目上下文: CodeScene 默认项目已锁定为 `82174`。
- `code_health_review` 返回 `score = 8.4`。
- `code_health_review` 命中的问题:
- `Complex Method`: `isRecording`，`cc = 17`，位于 `73-96`。
- `Code Duplication`: `setBestTake` / `setActiveTake`，以及 `setRecordingTags` / `setRecordingFavorite` / `setRecordingArchived` 这组平行 mutator。
- `Primitive Obsession`: CodeScene 指出模块中约 `40%` 的函数参数仍是原始类型，没有被更稳定的领域语义包裹。
- `list_technical_debt_hotspots_for_project_file` 返回空数组，说明它当前不在 CodeScene 文件级热点列表中。
- 热点链接: [CodeScene Hotspot](https://codescene.io/projects/82174/jobs/6844258/results/code/technical-debt/system-map?max-code-health=10.00&min-change-freq=0&showHotspotsOnly=true&min-coverage=0.00&max-coverage=100.00#hotspots)
- 本次 worker 回合里，单独的 `code_health_score` 调用没有稳定拿到独立返回值；因此这里记录的分值采用 `code_health_review` 返回的同一 Code Health 数值 `8.4`。其余章节基于已成功拿到的 CodeScene review 结果与静态源码阅读完成。

基线结论:

- 这个文件的 Code Health 没低到会自动触发“红灯”心智，但问题类型高度集中在结构债而不是直接行为错误。
- 它不在热点里，意味着按热点优先级做 review 时很容易被跳过。
- 它的债务更像“黏性结构债”: 每个局部方法都不算特别夸张，但整个文件把太多不同层的协议绑在同一处。

## 语义重复

- `normalizeSnapshot` 与 `parseRawSnapshotObject` 都在解析同一个 `localStorage` 原始 JSON，只是前者走“读快照”路径，后者走“写前基底对象”路径。名字不同，但都在重复承担“把 raw string 变成对象形态”的职责。
- `mutateSnapshotWithStaleWriteProtection` 与 `clear` 都实现了“读取当前 raw 值 -> 比较是否陈旧 -> `setItem` -> 发布事件”的 compare-before-write 事务壳。`clear` 没有复用通用 helper，而是又写了一套缩小版。
- `setBestTake` 与 `setActiveTake` 结构完全平行: 先读 snapshot，再取当前 selection/group，再校验 recordingId 属组，再拼另一个字段的持久值，最后调用 `updateTakeSelection`。
- `clearTakeSelection` 与 `updateTakeSelection` 在语义上都在重写同一个 `takeSelections` 集合，但一个走集中 helper，一个又单独手写过滤和 `buildSnapshot`。
- `setRecordingTags`、`addRecordingTag`、`removeRecordingTag`、`setRecordingFavorite`、`setRecordingArchived` 五个方法都遵循同一个模板:
- 读取 snapshot
- 校验当前 recording 仍存在
- 读取当前 organization
- 仅改一个字段
- 把完整 organization 再写回
- `addRecordingTag` 本地先做一次“大小写不敏感的重复 tag”检查，而 `createRecordingOrganizationMetadata -> normalizeRecordingTagsForWrite` 已经能对 tag 列表做重复校验。这里形成了跨模块、不同命名下的重复验证。
- `services/recordings-review/index.ts`、`sheet-practice/error-marker-service.ts`、`quick-metronome/recording-controller.ts` 里又存在一批“一层转发 wrapper”，只是把调用透传给 `recordingHistoryRepository`。这些 wrapper 各自命名不同，但逻辑重复度很高。

## 可删候选

- `seedRecordingHistoryForTests` 暴露在生产模块里，但当前非测试源码搜索没有发现调用方。它更像测试接缝残留，而不是活跃业务 API。
- `getTakeSelections`、`getRecordingOrganizations`、`clearTakeSelection`、`setRecordingTags`、`clearRecordingOrganization` 在当前非测试源码里也未找到调用者。它们未必已经可以直接删，但至少属于“公开面先膨胀、后未收口”的候选。
- `writeSnapshot` 只是 `mutateSnapshotWithStaleWriteProtection(() => snapshot)` 的一层薄包装，本身不承载额外领域语义。
- `STORE_EVENT` 与 `QUICK_STORE_EVENT` 两个事件名都只在本文件内部定义、派发和订阅；当前非测试源码搜索没有发现别处直接按事件名监听。它们更像一个内部双通道残留，而不是被外部消费的稳定协议。
- `cachedRawValue` + `cachedSnapshot` 与浏览器真实存储形成了“双份状态”。这不是硬死代码，但属于很典型的可合并状态候选: 同一份事实同时存在于 `localStorage` 和模块级可变缓存。
- `recordingHistoryOperations` 已经承接了部分 recording metadata 生命周期，但剩余 mutator 仍堆在本文件里，形成“抽了一半的 façade”。从债务视角看，这是可以继续收口的结构残留，而不是一个稳定完成的分层结果。

## 过度复杂点

- `normalizeSnapshotValue` 不只是格式修正。它还做了:
- future field 保留
- recordings 过滤与 `segmentContext` 解析
- error marker 过滤与重建
- take selection 正规化
- recording organization 正规化
- `sheetRecordingMetadata` 正规化
- 最后再 `buildSnapshot`
- 这已经是一个“兼容迁移 + 读模型重建”函数，而不是单纯 repository parse。
- `mutateSnapshotWithStaleWriteProtection` 在 repository 内部实现了一个小型事务系统: 浏览器可用性分支、最多 3 次重试、raw snapshot 解析、base snapshot 归一化、序列化、陈旧写比较、事件发布。这个复杂度已经接近 storage coordinator，而不是普通写入方法。
- `serializeSnapshotForWrite` 在一次写路径里会先 `normalizeSnapshotValue(snapshot)`，再构造 `nextRaw`，最后又对 `nextRaw` 调一次 `normalizeSnapshotValue`。这让“归一化”和“持久化序列化”耦在一起，形成写放大和脑力放大。
- `recordingHistoryRepository` 对外暴露的 surface 太宽: 快照读取、组织解析、take selection 解析、metadata 保存/回滚/清理、组织变更、marker 变更、删除、清空、订阅都在同一个对象上。
- `isRecording` 被 CodeScene 命中为复杂方法，但更值得注意的是: 它只是这个文件复杂度里最显眼、也最容易被工具捕捉的一段。真正重的复杂度来自全文件的职责聚集，而不是单个 if 分支。
- `clear` 没走统一 write helper，反而自带一套局部事务逻辑。这意味着同一个“如何安全写 snapshot”问题，在文件里至少存在两套实现。
- `publishSnapshotWrite` 会同时发 `recordings-review-change` 和 `quick-metronome-recordings-change`，再加上 `subscribe` 同时监听两个自定义事件和原生 `storage`。这已经是一个隐式状态机，而不是简单事件通知。

## 现成库 / 现有仓内原语本可复用但被重造的点

- 仓内已经存在成熟的 repository 事件骨架:
- `practice-session-repository.ts` 有独立的 `dispatchPracticeSessionChange` 和统一 `subscribe`
- `reference-repository.ts` 有独立的 `dispatchReferenceChange` 和统一 `subscribe`
- `repository.ts` 又自行重造了一套 `STORE_EVENT` / `QUICK_STORE_EVENT` / `storage` 三重监听协议。
- 仓内已经存在 Dexie-based 的持久化 repository 原语:
- `practiceSessionRepository`
- `referenceRepository`
- `recordingArtifactRepository`
- 但 recording history metadata 仍留在单个 `localStorage` JSON blob 里，于是本文件被迫自带 JSON parse、兼容字段保留、并发写保护、模块缓存、事件广播等一整套手写基础设施。
- `recording-organization-metadata.ts` 已经提供 `normalizeRecordingTagsForWrite` 的唯一化与数量约束，但 `addRecordingTag` 仍在 repository 层又手写一次大小写不敏感重复检查。
- `recording-history-operations.ts` 已经抽出了 quick/sheet metadata 生命周期操作，但 repository 没有沿同样模式继续抽离 selection / organization / marker 族方法，形成“现成抽象已出现，但没有贯彻”。
- `recordingsReviewService` 名义上是 service 边界，但 `sheet-practice`、`quick-metronome`、`waveform-comparison-sources`、`global-practice-session-repository`、`browser-settings-local-data-service` 仍大量直接 import `recordingHistoryRepository`。也就是说，服务边界存在，但没有被稳定复用。

## 边界混用

- repository / domain 混用:
- 本文件直接从 `@/domain/practice` 读取 `parseSheetRecordingMetadata` 与 `parseSheetRecordingSegmentContext`，说明 repository 自己在做领域值对象解析。
- repository / infrastructure 混用:
- 本文件从 `@/infrastructure/storage/storage-contracts` 直接拿存储 key，同时又自行操作浏览器存储。
- repository / browser adapter 混用:
- `getStorage`、`window.localStorage`、`window.dispatchEvent`、`window.addEventListener("storage")` 都直接写在 repository 里，没有经过单独 adapter。
- repository / feature-crossing 混用:
- `QUICK_STORE_EVENT` 明确把 `quick-metronome` 特性名带进 `recordings-review` repository，表示 quick feature 协议已经渗入这里。
- repository / service 混用:
- `recordingsReviewService` 虽然存在，但许多其他模块没有经过 service，而是直接依赖 repository 这个大对象。
- repository / test seam 混用:
- `seedRecordingHistoryForTests` 暴露在生产模块文件里，让测试接缝与生产 API 共处。

## 债务成因取证

- 这是典型的“单一浏览器存储中心持续加职责”债务。最初可能只是本地录音历史的持久化，随后逐步叠加了:
- quick recording metadata
- sheet recording metadata
- take selection
- recording organization
- error markers
- 回滚与清理
- 兼容字段保留
- 并发写保护
- feature-specific 事件广播
- 文件里保留 `futureFields`、optional arrays、`sheetRecordingMetadata` 条件删除/恢复，说明实现长期在兼容旧快照与增量字段。这类兼容压力往往会把 repository 从“存储层”推成“迁移层”。
- `recordingHistoryOperations` 的出现说明团队已经察觉到文件变重，开始抽取；但抽取只覆盖了一部分 recording metadata 生命周期，没把中心职责真正拆散，于是留下半完成结构。
- 多个 feature 直接依赖同一个 repository，会反过来抬高后续整理门槛。越多人直接 import，越容易在后续迭代里继续往这里挂一个新方法，而不是去整理边界。
- 从 quick-metronome、sheet-practice、recordings-review 三条线同时接入来看，这更像“跨 feature 共享状态中心”的自然膨胀，而不是一次性设计出来的清晰分层。

## 审查漏检取证

- CodeScene 给出的 `8.4` 不够刺眼，又不在热点里。这种组合很容易让 review 把它归类为“有点旧，但还行”的文件。
- CodeScene 命中的重复主要是短平快 mutator，不像明显 bug 或超长 UI 方法那样醒目。行为上它们多数也是正确的，因此 correctness 导向的 review 容易放过。
- 很多新增改动只会触碰 repository surface 的某一小块，例如 favorite、tag、marker、clear、rollback。单个 PR 看到的是“又加一个方法”，不容易感知整个文件正在继续中心化。
- 因为已经抽出了 `recording-history-operations.ts`、`recordingsReviewService`、`quickRecordingController` 等周边层，review 很容易产生“分层已经有了”的错觉；但真正的状态协调核心仍在本文件。
- 公开 API 中有多处当前无非测试调用者的方法，说明历史 slice/计划里扩出来的接口没有被后续回收。增量 review 往往只关心新调用链，不会回头做 API surface 清点。
- 这份债务的核心不是“某个算法写错”，而是“边界没有持续收口”。这类问题对功能验收和测试通过率都不敏感，因此 coding agent / review agent / ChatGPT review 循环如果偏重行为正确性，就天然容易漏掉。

## 证据清单

| 文件 | 行号 | 简短证据 |
|---|---:|---|
| `src/lib/recordings-review/repository.ts` | `10-15`, `34-46`, `65-70` | 同时依赖 `domain` 解析、`infrastructure` storage key、feature-specific 事件名和浏览器 `localStorage`。 |
| `src/lib/recordings-review/repository.ts` | `48-56`, `233-245`, `316-317` | 模块级 `cachedRawValue` / `cachedSnapshot` 与真实存储并存，形成双份状态。 |
| `src/lib/recordings-review/repository.ts` | `73-96` | `isRecording` 被 CodeScene 标为 `Complex Method`，`cc = 17`。 |
| `src/lib/recordings-review/repository.ts` | `175-216` | `normalizeSnapshotValue` 兼做兼容迁移、领域解析、组织归一化和快照重建。 |
| `src/lib/recordings-review/repository.ts` | `219-261` | `normalizeSnapshot` 与 `parseRawSnapshotObject` 分别重复解析同一 raw JSON。 |
| `src/lib/recordings-review/repository.ts` | `264-305` | 写路径里先归一化 `snapshot`，再构造 `nextRaw`，最后又对 `nextRaw` 再归一化一次。 |
| `src/lib/recordings-review/repository.ts` | `309-320` | `publishSnapshotWrite` 同时广播两个 feature-specific 自定义事件。 |
| `src/lib/recordings-review/repository.ts` | `322-352` | `mutateSnapshotWithStaleWriteProtection` 自带重试、并发检测、序列化和事件发布，是小型事务壳。 |
| `src/lib/recordings-review/repository.ts` | `470-507` | `updateTakeSelection` 已经是统一 helper，但 `clearTakeSelection` 没复用它。 |
| `src/lib/recordings-review/repository.ts` | `510-547` | `updateRecordingOrganization` 是统一 helper，但上层仍保留五个平行 mutator 模板。 |
| `src/lib/recordings-review/repository.ts` | `549-550` | `seedRecordingHistoryForTests` 作为测试接缝暴露在生产模块中。 |
| `src/lib/recordings-review/repository.ts` | `553-556` | `recordingHistoryOperations` 只抽走一部分生命周期操作，显示出半完成抽取。 |
| `src/lib/recordings-review/repository.ts` | `567-572`, `696-706`, `708-723`, `806-816` | `getTakeSelections`、`getRecordingOrganizations`、`clearTakeSelection`、`setRecordingTags`、`clearRecordingOrganization` 当前无非测试源码调用。 |
| `src/lib/recordings-review/repository.ts` | `638-694` | `setBestTake` / `setActiveTake` 是 CodeScene 直接命中的平行重复组。 |
| `src/lib/recordings-review/repository.ts` | `708-804` | tags/favorite/archive 五组写入方法都在重复“读当前状态 -> 改一位 -> 写整条 organization”模板。 |
| `src/lib/recordings-review/repository.ts` | `860-878` | `clear` 手写 compare-before-write 逻辑，与通用 stale-write helper 语义重复。 |
| `src/lib/recordings-review/repository.ts` | `881-896` | `subscribe` 同时监听两个内部事件和原生 `storage`，形成隐式状态机。 |
| `src/lib/recordings-review/recording-organization-metadata.ts` | `125-149` | `normalizeRecordingTagsForWrite` 已有重复 tag 校验，repository 的 `addRecordingTag` 又手写一轮。 |
| `src/services/recordings-review/index.ts` | `59-107` | service 层大部分方法只是透传到 `recordingHistoryRepository`，形成一层重复包装。 |
| `src/lib/sheet-practice/error-marker-service.ts` | `13-25` | error marker service 纯 forward 到 repository，没有新增边界价值。 |
| `src/lib/quick-metronome/recording-controller.ts` | `23-43`, `67-76` | quick recording controller 直接把读取、删除、订阅、清空挂在同一个 repository 中心上。 |
| `src/lib/sheet-practice/recording-service.ts` | `69-97`, `125-137` | sheet recording flow 直接依赖 repository 保存、回滚、读取与订阅。 |
| `src/infrastructure/db/recording-history-metadata-repository.ts` | `71-116` | 另一个 metadata repository 继续建立在 `recordingHistoryRepository` 之上，说明中心化继续向外扩散。 |
| `src/infrastructure/db/browser-settings-local-data-service.ts` | `19-34`, `55-78` | settings/local-data 服务直接读取 repository snapshot 并直接 `clear()` 它。 |
| `src/infrastructure/db/global-practice-session-repository.ts` | `117-180` | global session repository 从 recording history snapshot 反推 legacy quick session，并直接订阅它。 |
| `src/infrastructure/db/practice-session-repository.ts` | `47-51`, `95-108` | 仓内已有统一的 repository 事件派发/订阅骨架。 |
| `src/infrastructure/reference/reference-repository.ts` | `41-45`, `115-128` | 仓内已有另一套统一的 repository 事件派发/订阅骨架。 |
| `src/infrastructure/db/recording-artifact-repository.ts` | `26-47`, `89-147` | 仓内已有 Dexie-based artifact repository，但 recording history metadata 仍停留在手写 JSON blob 基础设施上。 |
