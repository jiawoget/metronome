import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";

import packageJson from "../../package.json";

type SourceFile = {
  path: string;
  source: string;
};

const repoRoot = process.cwd();

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
      /@\/lib\/recordings-review\/repository/,
      /\brecordingHistoryRepository\b/,
      /\brecordingAudioExportService\b/
    ]);

    expect(violations).toEqual([]);
  });

  it("keeps the PDF worker local instead of loading it from a CDN", () => {
    const pdfRenderer = readFileSync(
      "src/components/sheet-practice/viewer/pdf-sheet-renderer.tsx",
      "utf8"
    );

    expect(pdfRenderer).not.toMatch(/https?:\/\//);
    expect(pdfRenderer).not.toContain("unpkg.com");
    expect(pdfRenderer).toContain("pdfjs-dist/build/pdf.worker.min.mjs");
  });
});
