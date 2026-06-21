# 吉他练习节拍器 App 技术选型文档 v0.1

## 1. 项目定位

本项目是一个 **Web-first 的吉他练习 App**，第一版优先实现：

* 快速节拍器练习
* 看谱练习
* PDF / 图片谱导入与显示
* 本地音频参考
* Bilibili 视频参考
* 录音 / 回放
* 手动错误标记
* Practice Segment 练习片段
* 从指定小节开始重录

第一版优先适配：

* Web 桌面端
* iPad 横屏
* iPhone 竖屏

---

## 2. 总体技术原则

项目采用：

```text
TypeScript-first Web App
```

而不是松散的 JavaScript 工程。

核心原则：

1. 主工程使用 TypeScript strict mode。
2. UI / 业务逻辑 / 数据模型全部强类型约束。
3. 尽量使用成熟开源组件，减少自研。
4. 音频相关能力先用 Web 生态实现 MVP。
5. 性能敏感模块预留 Rust/WASM 或 C++/WASM 替换空间。
6. UI 层不要直接依赖 Tone.js / wavesurfer.js / WASM，而是通过 adapter 调用。

---

## 3. 推荐技术栈

### 3.1 前端主工程

```text
Next.js
React
TypeScript
Tailwind CSS
shadcn/ui
```

用途：

* App 页面组织
* 响应式 UI
* Web / iPad / iPhone 适配
* 快速构建现代化扁平 UI

---

### 3.2 状态管理

```text
Zustand
```

用途：

* 节拍器状态
* 当前练习会话状态
* 当前谱子状态
* 当前录音状态
* Practice Segment 状态

---

### 3.3 类型与运行时校验

```text
TypeScript strict mode
Zod
ESLint
Prettier / Biome
```

用途：

* TypeScript 提供编译期类型约束
* Zod 用于校验数据库返回、用户上传、WASM 返回、外部 API 返回
* 避免数据结构失控

---

### 3.4 本地数据

```text
IndexedDB
Dexie.js
```

用途：

* 本地练习记录缓存
* 本地录音 metadata
* 离线访问谱子 metadata
* 本地用户设置

---

### 3.5 云端数据与存储

```text
Supabase
PostgreSQL
Supabase Auth
Supabase Storage
```

用途：

* 用户登录
* 曲谱 metadata
* 练习记录
* 录音文件
* 本地音频参考文件
* Practice Segment 数据

第一版也可以先做本地优先，后续再接 Supabase 同步。

---

## 4. 音频技术选型

### 4.1 MVP 音频方案

```text
Web Audio API
MediaRecorder API
Tone.js
wavesurfer.js
```

用途：

| 能力            | 推荐实现                      |
| ------------- | ------------------------- |
| 节拍器           | Tone.js                   |
| BPM / 拍号 / 细分 | Tone.js + 自定义业务层          |
| 录音            | MediaRecorder API         |
| 波形显示          | wavesurfer.js             |
| A-B 循环        | wavesurfer Regions plugin |
| 录音波形          | wavesurfer.js             |
| 本地音频播放        | Web Audio / wavesurfer    |
| 播放速度          | Web Audio / wavesurfer    |
| 手动对齐          | 保存 offsetMs               |

---

### 4.2 高性能扩展方案

后续性能不够时，引入：

```text
Rust + wasm-bindgen
```

优先用于：

* peak 计算
* onset detection
* BPM detection
* 节奏偏差分析
* pitch detection
* 音频对齐
* 多 take 合成前处理

如果需要复用成熟 C/C++ 音频库，再考虑：

```text
C++ + Emscripten
```

适合用于：

* ffmpeg
* aubio
* Essentia
* Rubber Band
* SoundTouch
* 自研 DSP 库

---

## 5. 架构设计原则

采用：

```text
Clean Architecture / Ports & Adapters
```

也就是：

```text
Domain 层定义接口
Infrastructure 层实现接口
UI 层只调用 service / hook
```

不要让 UI 组件直接调用第三方音频库。

---

## 6. 推荐目录结构

```text
src/
├── app/
├── components/
│   ├── metronome/
│   ├── sheet/
│   ├── waveform/
│   └── practice/
│
├── domain/
│   ├── audio/
│   │   ├── AudioEngine.ts
│   │   ├── AudioAnalysisEngine.ts
│   │   ├── AudioTypes.ts
│   │   └── BeatGrid.ts
│   │
│   ├── practice/
│   │   ├── PracticeSession.ts
│   │   ├── RecordingTake.ts
│   │   ├── PracticeSegment.ts
│   │   └── ErrorMarker.ts
│   │
│   └── sheet/
│       ├── Sheet.ts
│       └── ReferenceTrack.ts
│
├── services/
│   ├── metronome/
│   ├── recording/
│   ├── practice/
│   ├── sheet/
│   └── bilibili/
│
├── infrastructure/
│   ├── audio/
│   │   ├── WebAudioEngine.ts
│   │   ├── ToneMetronomeAdapter.ts
│   │   ├── WaveSurferAdapter.ts
│   │   ├── MediaRecorderAdapter.ts
│   │   └── WasmAudioEngine.ts
│   │
│   ├── db/
│   ├── storage/
│   └── bilibili/
│
├── stores/
├── hooks/
├── lib/
└── wasm/
    ├── audio-core-rs/
    └── audio-core-cpp/
```

---

## 7. 核心接口设计方向

### 7.1 AudioEngine

负责播放、暂停、停止、录音、加载音频。

```ts
export interface AudioEngine {
  loadAudio(input: Blob | ArrayBuffer | string): Promise<void>

  play(options?: {
    startSec?: number
    endSec?: number
    loop?: boolean
    playbackRate?: number
  }): Promise<void>

  pause(): void
  stop(): void

  startRecording(options: {
    startBar: number
    startBeat: number
    bpm: number
    timeSignature: TimeSignature
  }): Promise<void>

  stopRecording(): Promise<RecordingTake>
}
```

---

### 7.2 AudioAnalysisEngine

负责音频分析，后续可以替换为 Rust/WASM。

```ts
export interface AudioAnalysisEngine {
  computePeaks(input: {
    samples: Float32Array
    sampleRate: number
    samplesPerPixel: number
  }): Promise<Float32Array>

  detectOnsets?(input: {
    samples: Float32Array
    sampleRate: number
  }): Promise<Float32Array>

  analyzeTiming?(input: {
    onsetsSec: Float32Array
    bpm: number
    beatsPerBar: number
    offsetSec: number
  }): Promise<TimingDeviation[]>
}
```

---

## 8. 分段重录设计

不要把“从某小节开始重录”设计成直接编辑音频文件。

推荐采用：

```text
RecordingTake + BeatGrid + ActiveComp
```

也就是：

```text
第 1-4 小节使用 Take A
第 5-8 小节使用 Take B
第 9-12 小节使用 Take C
```

核心数据结构：

```ts
export type RecordingTake = {
  id: string
  sessionId: string
  audioUrl: string
  startBar: number
  startBeat: number
  endBar?: number
  endBeat?: number
  bpm: number
  timeSignature: TimeSignature
  offsetMs: number
  createdAt: string
}
```

第一版只需要支持：

* 选择起始小节
* 倒计时 1-2 小节
* 从该小节开始新录一个 take
* 保存 take
* 回放时按小节选择 active take

第一版不需要做完整音频导出。

---

## 9. Bilibili 方案

第一版只做轻量集成：

* Bilibili 搜索
* 保存视频链接
* 保存 bvid / aid / cid 等信息
* iframe 嵌入播放
* 保存 startTime / endTime
* 绑定到 Sheet 或 Practice Segment

第一版不做：

* 视频下载
* 音频提取
* 精确同步控制
* 自动分析 B站音频

B站视频在第一版中定位为：

```text
参考观看 / 跟练 / 保存片段
```

不是精确音频分析来源。

---

## 10. 本地音频方案

本地音频是第一版更重要的 reference source。

支持：

* mp3
* wav
* m4a

第一版能力：

* 上传
* 播放 / 暂停
* 音量
* 播放速度
* A-B 循环
* 波形显示
* 与用户录音波形对照
* 手动 offset 对齐

---

## 11. MVP 开发顺序

### Phase 1：基础工程与快速节拍器

```text
Next.js + TypeScript
shadcn/ui + Tailwind
Zustand
Tone.js 节拍器
MediaRecorder 录音
wavesurfer 录音回放
```

### Phase 2：看谱练习

```text
Sheet Library
PDF.js / react-pdf
图片谱显示
Sheet Practice 页面
看谱 + 节拍器 + 录音
```

### Phase 3：本地音频参考

```text
上传本地音频
wavesurfer 波形
A-B loop
播放速度
用户录音波形对照
手动 offset 对齐
```

### Phase 4：Practice Segment 与分段重录

```text
BeatGrid
Practice Segment
从指定小节开始录音
RecordingTake 管理
Active take 选择
```

### Phase 5：Bilibili Reference

```text
B站搜索
iframe 嵌入
保存 start/end
绑定到 Sheet / Practice Segment
```

---

## 12. 第一版不做

为了降低复杂度，MVP 不做：

* AI 自动错音判断
* 自动识别谱面小节线
* Guitar Pro / MusicXML 解析
* 自动下载 B站 / YouTube 视频
* 自动提取 B站音频
* 自动 BPM 检测
* 自动音频对齐
* 完整音频导出
* 多轨 DAW 式编辑

---

## 13. 最终技术结论

本项目推荐采用：

```text
TypeScript-first Web App
+
Web Audio MVP
+
WASM-ready Audio Analysis Layer
```

最终选型：

```text
Language:
- TypeScript

Frontend:
- Next.js
- React
- Tailwind CSS
- shadcn/ui

State:
- Zustand

Validation:
- Zod

Local DB:
- IndexedDB
- Dexie.js

Cloud:
- Supabase
- PostgreSQL
- Supabase Storage

Audio MVP:
- Web Audio API
- MediaRecorder API
- Tone.js
- wavesurfer.js

Future Performance Layer:
- Rust + wasm-bindgen
- C++ + Emscripten only when reusing C/C++ audio libraries
```

核心架构要求：

```text
业务逻辑不要直接绑定第三方音频库。
所有音频能力通过 AudioEngine / AudioAnalysisEngine 接口访问。
MVP 用 TypeScript adapter 实现。
后续性能不足时替换为 Rust/WASM 或 C++/WASM。
```
