#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";

const runnerPath = path.join(
  process.cwd(),
  "scripts",
  "run-metronome-semgrep-changed.mjs"
);

function git(cwd, args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe"
  }).trim();
}

function write(cwd, file, content) {
  const fullPath = path.join(cwd, file);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, "utf8");
}

function createRepo({
  sourceFile = "src/example.ts",
  sourceContent = "dangerousCall();\nexport const value = 1;\n"
} = {}) {
  const cwd = mkdtempSync(path.join(tmpdir(), "metronome-semgrep-changed-"));

  git(cwd, ["init"]);
  git(cwd, ["config", "user.email", "test@example.com"]);
  git(cwd, ["config", "user.name", "Test User"]);
  git(cwd, ["config", "core.autocrlf", "false"]);
  write(
    cwd,
    ".semgrep/probe.yml",
    "rules:\n  - id: probe.dangerous-call\n    languages: [typescript]\n    severity: ERROR\n    message: probe\n    pattern: dangerousCall(...)\n"
  );
  write(cwd, sourceFile, sourceContent);
  git(cwd, ["add", "-A"]);
  git(cwd, ["commit", "-m", "baseline"]);

  return { cwd, baseline: git(cwd, ["rev-parse", "HEAD"]) };
}

function runRunner(cwd, baseline, environment = {}) {
  return spawnSync(process.execPath, [runnerPath], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      BASE_REF: baseline,
      SEMGREP_ENABLE_VERSION_CHECK: "0",
      ...environment
    },
    timeout: 120_000
  });
}

function recordedInvocations(file) {
  const content = readFileSync(file, "utf8").trim();
  return content === ""
    ? []
    : content.split(/\r?\n/v).map(line => JSON.parse(line));
}

function combinedOutput(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function withRepo(callback) {
  const repo = createRepo();
  try {
    callback(repo);
  } finally {
    rmSync(repo.cwd, { recursive: true, force: true });
  }
}

withRepo(({ cwd, baseline }) => {
  write(cwd, "src/example.ts", "dangerousCall();\nexport const value = 2;\n");
  git(cwd, ["add", "src/example.ts"]);
  const fakeBin = path.join(cwd, "fake semgrep executable");
  const recorderDirectory = path.join(cwd, "fake semgrep recorder");
  const invocationLog = path.join(recorderDirectory, "invocations.jsonl");
  const preloadFile = path.join(recorderDirectory, "preload.cjs");
  write(cwd, path.relative(cwd, preloadFile), String.raw`"use strict";
const childProcess = require("node:child_process");
const { appendFileSync } = require("node:fs");
const { syncBuiltinESMExports } = require("node:module");
const originalSpawnSync = childProcess.spawnSync;
childProcess.spawnSync = function (...parameters) {
  const [command, args = []] = parameters;
  if (command !== process.env.FAKE_SEMGREP_BIN) {
    return Reflect.apply(originalSpawnSync, childProcess, parameters);
  }

  appendFileSync(process.env.FAKE_SEMGREP_LOG, JSON.stringify({ args, command }) + "\n");
  return { output: [null, null, null], pid: 0, signal: null, status: 0, stderr: null, stdout: null };
};
syncBuiltinESMExports();
`);
  const environment = {
    FAKE_SEMGREP_BIN: fakeBin,
    FAKE_SEMGREP_LOG: invocationLog,
    NODE_OPTIONS: [
      process.env.NODE_OPTIONS,
      `--require=${JSON.stringify(preloadFile.split(path.win32.sep).join(path.posix.sep))}`
    ].filter(Boolean).join(" "),
    SEMGREP_BIN: fakeBin
  };
  const probe = spawnSync(process.execPath, [
    "-e",
    "const {spawnSync}=require('node:child_process');spawnSync(process.env.FAKE_SEMGREP_BIN,['--help']);spawnSync(process.env.FAKE_SEMGREP_BIN,['scan']);"
  ], { cwd, encoding: "utf8", env: { ...process.env, ...environment } });
  assert.equal(probe.status, 0, `fake recorder probe must pass:\n${combinedOutput(probe)}`);
  assert.deepEqual(
    recordedInvocations(invocationLog).map(invocation => invocation.args),
    [["--help"], ["scan"]],
    "fake recorder must retain every invocation, including unknown option-like arguments"
  );
  writeFileSync(invocationLog, "", "utf8");

  const result = runRunner(cwd, baseline, environment);
  const output = combinedOutput(result);
  const semgrepInvocations = recordedInvocations(invocationLog);

  assert.equal(result.status, 0, `fake Semgrep scan must pass:\n${output}`);
  assert.equal(semgrepInvocations.length, 1, "selected Semgrep executable must be invoked exactly once");
  assert.equal(semgrepInvocations[0].command, fakeBin, "recorder must identify the selected executable");
  assert.equal(semgrepInvocations[0].args[0], "scan", "the first Semgrep argument must be scan");
});

withRepo(({ cwd, baseline }) => {
  write(cwd, "src/example.ts", "dangerousCall();\nexport const value = 2;\n");
  git(cwd, ["add", "src/example.ts"]);
  const missingExecutable = path.join(cwd, "missing-semgrep-executable");
  const startedAt = Date.now();
  const result = runRunner(cwd, baseline, { SEMGREP_BIN: missingExecutable });
  const elapsedMs = Date.now() - startedAt;

  assert.notEqual(result.status, 0, "missing Semgrep executable must fail closed");
  assert.ok(elapsedMs < 10_000, `missing executable must fail promptly; took ${elapsedMs} ms`);
  assert.match(
    result.stdout,
    /Running Semgrep debt gates/v,
    "missing executable failure must come from the actual scan spawn"
  );
  assert.match(
    result.stderr,
    /resolve Semgrep executable/v,
    "missing executable must report an executable-resolution diagnostic"
  );
});

withRepo(({ cwd, baseline }) => {
  write(cwd, "src/example.ts", "dangerousCall();\nexport const value = 2;\n");
  git(cwd, ["add", "src/example.ts"]);
  const result = runRunner(cwd, baseline);
  const output = combinedOutput(result);

  assert.equal(
    result.status,
    0,
    `unchanged baseline finding must remain non-blocking:\n${output}`
  );
  assert.match(
    result.stdout,
    /src\/example\.ts/v,
    "staged-only candidate must be listed and scanned"
  );
});

withRepo(({ cwd, baseline }) => {
  write(
    cwd,
    "src/example.ts",
    "dangerousCall();\ndangerousCall();\nexport const value = 1;\n"
  );
  git(cwd, ["add", "src/example.ts"]);
  const result = runRunner(cwd, baseline);
  const output = combinedOutput(result);

  assert.notEqual(
    result.status,
    0,
    `new staged finding must block:\n${output}`
  );
  assert.match(
    output,
    /probe\.dangerous-call/v,
    "new staged finding must be reported"
  );
});

withRepo(({ cwd, baseline }) => {
  write(cwd, "src/example.ts", "dangerousCall();\nexport const value = 2;\n");
  git(cwd, ["add", "src/example.ts"]);
  write(cwd, "src/example.ts", "dangerousCall();\nexport const value = 3;\n");
  const result = runRunner(cwd, baseline);

  assert.notEqual(result.status, 0, "candidate with unstaged drift must fail");
  assert.match(
    result.stderr,
    /cannot verify the committed\/staged snapshot/v,
    "unstaged drift must explain the snapshot conflict"
  );
  assert.match(
    result.stderr,
    /src\/example\.ts/v,
    "unstaged drift must name the candidate file"
  );
});

withRepo(({ cwd, baseline }) => {
  git(cwd, ["rm", "src/example.ts"]);
  write(
    cwd,
    "src/example.ts",
    "dangerousCall();\nexport const shadow = true;\n"
  );
  const result = runRunner(cwd, baseline);

  assert.notEqual(result.status, 0, "untracked candidate shadow must fail");
  assert.match(
    result.stderr,
    /untracked or ignored working-tree files/v,
    "untracked candidate shadow must explain the snapshot conflict"
  );
  assert.match(
    result.stderr,
    /src\/example\.ts/v,
    "untracked candidate shadow must name the candidate file"
  );
});

{
  const repo = createRepo();
  try {
    write(repo.cwd, ".gitignore", "src/example.ts\n");
    git(repo.cwd, ["add", ".gitignore"]);
    git(repo.cwd, ["commit", "-m", "ignore source path"]);
    const baseline = git(repo.cwd, ["rev-parse", "HEAD"]);
    git(repo.cwd, ["rm", "src/example.ts"]);
    write(
      repo.cwd,
      "src/example.ts",
      "dangerousCall();\nexport const shadow = true;\n"
    );
    const result = runRunner(repo.cwd, baseline);

    assert.notEqual(result.status, 0, "ignored candidate shadow must fail");
    assert.match(
      result.stderr,
      /untracked or ignored working-tree files/v,
      "ignored candidate shadow must explain the snapshot conflict"
    );
    assert.match(
      result.stderr,
      /src\/example\.ts/v,
      "ignored candidate shadow must name the candidate file"
    );
  } finally {
    rmSync(repo.cwd, { recursive: true, force: true });
  }
}

{
  const repo = createRepo({
    sourceFile: "src/Foo.ts",
    sourceContent: "export const value = 1;\n"
  });
  try {
    git(repo.cwd, ["config", "core.ignorecase", "true"]);
    git(repo.cwd, ["mv", "src/Foo.ts", "src/Foo.tmp"]);
    git(repo.cwd, ["mv", "src/Foo.tmp", "src/foo.ts"]);
    const result = runRunner(repo.cwd, repo.baseline);
    const output = combinedOutput(result);

    assert.equal(result.status, 0, `case-only rename must pass:\n${output}`);
    assert.match(
      result.stdout,
      /src\/foo\.ts/v,
      "case-only rename must scan the exact indexed path"
    );
    assert.doesNotMatch(
      result.stdout,
      /src\/Foo\.ts/v,
      "case-only rename must not scan the deleted old spelling"
    );
  } finally {
    rmSync(repo.cwd, { recursive: true, force: true });
  }
}

console.log("Semgrep changed-file selftest passed.");
