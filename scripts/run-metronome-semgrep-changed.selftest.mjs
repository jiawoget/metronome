#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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

function runRunner(cwd, baseline) {
  return spawnSync(process.execPath, [runnerPath], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      BASE_REF: baseline,
      SEMGREP_ENABLE_VERSION_CHECK: "0"
    },
    timeout: 120_000
  });
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
