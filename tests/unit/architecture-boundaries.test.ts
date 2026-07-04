import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import packageJson from "../../package.json";

type SourceFile = {
  path: string;
  source: string;
};

type ApprovedUsage = {
  count: number;
  reason: string;
  expiresAtStage?: "F3" | "F4" | "F5" | "F7";
};

const repoRoot = process.cwd();
const primitiveExceptionMarker = "PACK_F_APPROVED_PRIMITIVE_EXCEPTION";
const runtimeTimerExceptionMarker = "PACK_F_APPROVED_RUNTIME_TIMER_EXCEPTION";

const musicPrimitiveTableAllowlist = new Map<string, ApprovedUsage>([
  [
    "src/domain/music/meter-policy.ts",
    { count: 2, reason: "F5-approved product policy owner for supported time signatures and subdivisions" }
  ]
]);

const componentInfrastructureImportAllowlist = new Map<string, ApprovedUsage>([
  [
    "src/components/quick-metronome/quick-metronome-experience.tsx",
    { count: 1, reason: "session service composition remains until Pack F service boundary cleanup", expiresAtStage: "F7" }
  ],
  [
    "src/components/settings/settings-experience.tsx",
    { count: 2, reason: "settings browser service composition remains until Pack F boundary cleanup", expiresAtStage: "F7" }
  ],
  [
    "src/components/sheet-library/sheet-library-experience.tsx",
    { count: 2, reason: "library import and session service composition remains until Pack F boundary cleanup", expiresAtStage: "F7" }
  ],
  [
    "src/components/sheet-practice/controls/sheet-practice-controls.tsx",
    { count: 4, reason: "practice controls still compose browser services before Pack F boundary cleanup", expiresAtStage: "F7" }
  ],
  [
    "src/components/sheet-practice/measure-grid/measure-grid-calibration-panel.tsx",
    { count: 1, reason: "measure grid browser service composition remains until Pack F boundary cleanup", expiresAtStage: "F7" }
  ],
  [
    "src/components/sheet-practice/reference/reference-panel.tsx",
    { count: 3, reason: "reference service and player composition remains until Pack F boundary cleanup", expiresAtStage: "F7" }
  ],
  [
    "src/components/sheet-practice/segments/practice-segment-selector-panel.tsx",
    { count: 2, reason: "segment and measure service composition remains until Pack F boundary cleanup", expiresAtStage: "F7" }
  ],
  [
    "src/components/sheet-practice/viewer/sheet-page-thumbnails.tsx",
    { count: 1, reason: "viewer hook state type remains until Pack F viewer boundary cleanup", expiresAtStage: "F7" }
  ],
  [
    "src/components/sheet-practice/viewer/sheet-viewer-experience.tsx",
    { count: 3, reason: "viewer browser service and hooks remain until Pack F viewer boundary cleanup", expiresAtStage: "F7" }
  ]
]);

const runtimeTimerSchedulingAllowlist = new Map<string, ApprovedUsage>([
  [
    "src/components/sheet-practice/controls/sheet-practice-controls.tsx",
    { count: 1, reason: "non-audio zero-delay session hydration refresh remains until Pack F boundary cleanup", expiresAtStage: "F7" }
  ]
]);

function listSourceFiles(root: string, extensions: string[]) {
  const paths: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stats = statSync(path);

    if (stats.isDirectory()) {
      paths.push(...listSourceFiles(path, extensions));
    } else if (extensions.some((extension) => path.endsWith(extension))) {
      paths.push(path);
    }
  }

  return paths;
}

function readSources(paths: string[]): SourceFile[] {
  return paths.map((path) => ({
    path: relative(repoRoot, path).split(sep).join("/"),
    source: readFileSync(path, "utf8")
  }));
}

function matchingFiles(files: SourceFile[], patterns: RegExp[]) {
  return files
    .filter((file) => patterns.some((pattern) => pattern.test(file.source)))
    .map((file) => file.path);
}

function countedMatches(files: SourceFile[], pattern: RegExp) {
  return files
    .map((file) => ({
      path: file.path,
      count: Array.from(file.source.matchAll(pattern)).length
    }))
    .filter((usage) => usage.count > 0);
}

function unexpectedUsages(usages: { path: string; count: number }[], allowlist: Map<string, ApprovedUsage>) {
  return usages
    .filter((usage) => {
      const approved = allowlist.get(usage.path);

      return !approved || usage.count > approved.count;
    })
    .map((usage) => ({
      path: usage.path,
      count: usage.count,
      approvedCount: allowlist.get(usage.path)?.count ?? 0
    }));
}

function staleAllowlistEntries(usages: { path: string; count: number }[], allowlist: Map<string, ApprovedUsage>) {
  const usageCounts = new Map(usages.map((usage) => [usage.path, usage.count]));

  return Array.from(allowlist.entries())
    .filter(([path, approval]) => usageCounts.get(path) !== approval.count)
    .map(([path, approval]) => ({
      path,
      approvedCount: approval.count,
      currentCount: usageCounts.get(path) ?? 0
    }));
}

describe("source architecture boundaries", () => {
  it("keeps UI components away from concrete browser audio and recording adapters", () => {
    const files = readSources(listSourceFiles(join(repoRoot, "src/components"), [".tsx"]));
    const violations = matchingFiles(files, [
      /from\s+["']tone["']/,
      /import\(["']tone["']\)/,
      /@\/infrastructure\/audio/,
      /\bBrowserMetronomeService\b/,
      /\bBrowserRecordingService\b/,
      /\bBrowserSheetRecordingService\b/,
      /new\s+MediaRecorder\b/,
      /navigator\.mediaDevices\.getUserMedia/
    ]);

    expect(violations).toEqual([]);
  });

  it("keeps browser capture and Tone imports in infrastructure audio adapters", () => {
    const files = readSources(listSourceFiles(join(repoRoot, "src"), [".ts", ".tsx"]));
    const captureViolations = matchingFiles(
      files.filter((file) => !file.path.startsWith("src/infrastructure/audio/")),
      [/MediaRecorder/, /navigator\.mediaDevices\.getUserMedia/]
    );
    const toneViolations = matchingFiles(
      files.filter((file) => file.path !== "src/infrastructure/audio/tone-metronome-adapter.ts"),
      [/from\s+["']tone["']/, /import\(["']tone["']\)/]
    );

    expect(captureViolations).toEqual([]);
    expect(toneViolations).toEqual([]);
  });

  it("default-blocks UI components from importing infrastructure unless temporarily reviewed", () => {
    const files = readSources(listSourceFiles(join(repoRoot, "src/components"), [".ts", ".tsx"]));
    const usages = countedMatches(files, /@\/infrastructure\//g);

    expect(unexpectedUsages(usages, componentInfrastructureImportAllowlist)).toEqual([]);
    expect(staleAllowlistEntries(usages, componentInfrastructureImportAllowlist)).toEqual([]);
    for (const approval of componentInfrastructureImportAllowlist.values()) {
      expect(approval.reason).not.toHaveLength(0);
    }
  });

  it("blocks custom music primitive tables unless they are approved policy or facade exceptions", () => {
    const files = readSources(listSourceFiles(join(repoRoot, "src"), [".ts", ".tsx"])).filter(
      (file) => !file.source.includes(primitiveExceptionMarker)
    );
    const primitiveTablePattern =
      /\b(?:export\s+)?(?:const|let|var)\s+(?:[A-Z0-9_]*(?:NOTE|NOTES|INTERVAL|INTERVALS|CHORD|CHORDS|SCALE|SCALES|KEY_SIGNATURE|KEY_SIGNATURES|TIME_SIGNATURE|TIME_SIGNATURES|SUBDIVISION|SUBDIVISIONS|RHYTHM|RHYTHMS|DURATION|DURATIONS|DURATION_VALUE|DURATION_VALUES|NOTE_VALUE|NOTE_VALUES|BEAT_VALUE|BEAT_VALUES|PITCH|MIDI)[A-Z0-9_]*|noteNames|notesByName|intervalNames|intervalsByName|chordNames|chordsByName|scaleNames|scalesByName|keySignatures|keysByName|timeSignatures|timeSignaturesByName|subdivisions|subdivisionsByName|rhythms|rhythmPatterns|durations|durationValues|noteDurations|beatValues|pitchClasses|midiNotes)\s*=\s*(?:\[|{)/g;
    const usages = countedMatches(files, primitiveTablePattern);

    expect(unexpectedUsages(usages, musicPrimitiveTableAllowlist)).toEqual([]);
    expect(staleAllowlistEntries(usages, musicPrimitiveTableAllowlist)).toEqual([]);
    for (const approval of musicPrimitiveTableAllowlist.values()) {
      expect(approval.reason).not.toHaveLength(0);
    }
  });

  it("blocks direct time-signature string parsing outside the music domain", () => {
    const files = readSources(listSourceFiles(join(repoRoot, "src"), [".ts", ".tsx"])).filter(
      (file) => !file.path.startsWith("src/domain/music/")
    );
    const usages = countedMatches(files, /\btimeSignature\.split\(["']\/["']\)/g);

    expect(usages).toEqual([]);
  });

  it("blocks new beat, countdown, and metronome runtime setTimeout scheduling", () => {
    const files = readSources(listSourceFiles(join(repoRoot, "src"), [".ts", ".tsx"]))
      .filter((file) => !file.source.includes(runtimeTimerExceptionMarker))
      .filter(
        (file) =>
          file.path.startsWith("src/services/metronome/") ||
          file.path.startsWith("src/lib/quick-metronome/") ||
          file.path === "src/components/sheet-practice/controls/sheet-practice-controls.tsx"
      );
    const usages = countedMatches(files, /\bsetTimeout\b/g);

    expect(unexpectedUsages(usages, runtimeTimerSchedulingAllowlist)).toEqual([]);
    expect(staleAllowlistEntries(usages, runtimeTimerSchedulingAllowlist)).toEqual([]);
    for (const approval of runtimeTimerSchedulingAllowlist.values()) {
      expect(approval.reason).not.toHaveLength(0);
    }
  });

  it("documents the Zustand boundary and keeps the dependency explicit", () => {
    expect(packageJson.dependencies).toHaveProperty("zustand");

    const storesReadme = readFileSync("src/stores/README.md", "utf8");

    expect(storesReadme).toContain("ephemeral client UI/workflow");
    expect(storesReadme).toContain("must not become a persistence layer");
  });

  it("keeps Recordings Review UI behind the review service boundary", () => {
    const files = readSources(
      listSourceFiles(join(repoRoot, "src/components/recordings-review"), [
        ".ts",
        ".tsx"
      ])
    );
    const violations = matchingFiles(files, [
      /@\/lib\/recordings-review\/artifact-details/,
      /@\/lib\/recordings-review\/artifact-storage/,
      /@\/lib\/recordings-review\/repository/,
      /\brecordingHistoryRepository\b/,
      /\brecordingAudioExportService\b/,
      /\bRecordingWaveformPlaybackAdapter\b/,
      /\brecordingArtifactRepository\b/,
      /from\s+["']dexie["']/
    ]);

    expect(violations).toEqual([]);
  });

  it("keeps Quick Metronome UI behind artifact controller boundaries", () => {
    const files = readSources(
      listSourceFiles(join(repoRoot, "src/components/quick-metronome"), [
        ".ts",
        ".tsx"
      ])
    );
    const violations = matchingFiles(files, [
      /@\/lib\/recordings-review\/artifact-storage/,
      /@\/infrastructure\/db\/recording-artifact-repository/,
      /@\/lib\/recordings-review\/repository/,
      /@\/lib\/quick-metronome\/persistence/,
      /@\/infrastructure\/storage\/storage-contracts/,
      /\bquickRecordingRepository\b/,
      /\brecordingArtifactRepository\b/,
      /\brecordingHistoryRepository\b/,
      /\bsaveCapturedRecordingArtifact\b/,
      /\bdeleteRecordingArtifactById\b/,
      /from\s+["']dexie["']/
    ]);

    expect(violations).toEqual([]);
  });

  it("keeps Sheet Practice UI away from recordings-review repositories", () => {
    const files = readSources(
      listSourceFiles(join(repoRoot, "src/components/sheet-practice"), [
        ".ts",
        ".tsx"
      ])
    );
    const violations = matchingFiles(files, [
      /@\/lib\/recordings-review\/repository/,
      /\brecordingHistoryRepository\b/
    ]);

    expect(violations).toEqual([]);
  });

  it("keeps app and server layers away from browser recording storage", () => {
    const appFiles = readSources(
      listSourceFiles(join(repoRoot, "src/app"), [".ts", ".tsx"])
    );
    const violations = matchingFiles(appFiles, [
      /@\/infrastructure\/db\/recording-artifact-repository/,
      /\brecordingArtifactRepository\b/,
      /from\s+["']dexie["']/,
      /@\/lib\/recordings-review\/repository/,
      /\brecordingHistoryRepository\b/
    ]);

    expect(violations).toEqual([]);
  });

  it("keeps the PDF worker local instead of loading it from a CDN", () => {
    const pdfRenderer = readFileSync(
      "src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx",
      "utf8"
    );
    const pdfImportAdapter = readFileSync(
      "src/infrastructure/files/sheet-import-adapter.ts",
      "utf8"
    );
    const pdfViewerAdapter = readFileSync(
      "src/infrastructure/sheet-viewer/browser-sheet-viewer-adapter.ts",
      "utf8"
    );

    expect(pdfRenderer).not.toMatch(/https?:\/\//);
    expect(pdfRenderer).not.toContain("unpkg.com");
    expect(pdfRenderer).toContain("pdfjs-dist/build/pdf.worker.min.mjs");
    for (const source of [pdfRenderer, pdfImportAdapter, pdfViewerAdapter]) {
      expect(source).not.toContain("pdfjs-dist/legacy");
    }
    expect(pdfImportAdapter).toContain('import("pdfjs-dist")');
    expect(pdfViewerAdapter).toContain('import("pdfjs-dist")');
    expect(pdfImportAdapter).toContain("pdfjs-dist/build/pdf.worker.min.mjs");
    expect(pdfViewerAdapter).toContain("pdfjs-dist/build/pdf.worker.min.mjs");
  });
});
