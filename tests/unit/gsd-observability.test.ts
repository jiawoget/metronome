import { Buffer } from "node:buffer";
import { execFileSync, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import process from "node:process";
import { afterEach, describe, expect, it } from "vitest";

const repositoryRoot = process.cwd();
const writer = path.join(
  repositoryRoot,
  "scripts",
  "gsd-observability-write.mjs"
);
const summarizer = path.join(
  repositoryRoot,
  "scripts",
  "gsd-observability-summarize.mjs"
);
const temporaryRepositories: string[] = [];

function record(entries: ReadonlyArray<readonly [string, unknown]>) {
  return Object.fromEntries(entries);
}

function parseJson(value: string): unknown {
  return JSON.parse(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null) {return false;}
  if (Array.isArray(value)) {return false;}
  return typeof value === "object";
}

function assertRecord(value: unknown): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {throw new TypeError("Expected a JSON object");}
}

function parseRecord(value: string): Record<string, unknown> {
  const parsed = parseJson(value);
  assertRecord(parsed);
  return parsed;
}

function git(cwd: string, arguments_: string[]) {
  return execFileSync("git", arguments_, { cwd, encoding: "utf8" }).trim();
}

function write(cwd: string, file: string, contents: string) {
  const absolutePath = path.join(cwd, file);
  mkdirSync(path.dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, contents, "utf8");
}

function createRepository() {
  const cwd = mkdtempSync(path.join(tmpdir(), "metronome-observability-"));
  temporaryRepositories.push(cwd);
  git(cwd, ["init"]);
  git(cwd, ["config", "user.email", "test@example.com"]);
  git(cwd, ["config", "user.name", "Test User"]);
  git(cwd, ["config", "core.autocrlf", "false"]);
  write(cwd, "src/example.ts", "export const value = 1;\n");
  write(cwd, "package.json", '{"name":"fixture"}\n');
  write(cwd, "package-lock.json", '{"lockfileVersion":3}\n');
  write(cwd, ".gitignore", ".logs/\n");
  write(cwd, ".lumenignore", ".logs/\n");
  write(cwd, "AGENTS.md", "# Policy\n");
  write(cwd, ".planning/config.json", "{}\n");
  write(cwd, "skills/metronome-policy/SKILL.md", "# Skill\n");
  git(cwd, ["add", "-A"]);
  git(cwd, ["commit", "-m", "fixture"]);
  return cwd;
}

function run(
  script: string,
  arguments_: string[],
  options: { cwd?: string; input?: string } = {}
) {
  return spawnSync(process.execPath, [script, ...arguments_], {
    cwd: options.cwd ?? repositoryRoot,
    encoding: "utf8",
    input: options.input
  });
}

function baseStepArguments(cwd: string, step = "context-load") {
  return [
    "--repo",
    cwd,
    "--run",
    "run-1",
    "--step",
    step,
    "--stage",
    "execute",
    "--budget",
    "quick",
    "--agent",
    "controller"
  ];
}

function suppliedTimingEvents() {
  const started = record([
    ["schema_version", 1],
    ["event", "started"],
    ["run_id", "run-1"],
    ["step_id", "codescene"],
    ["stage", "execute"],
    ["timestamp", "2026-07-21T10:00:00.000Z"],
    ["budget_class", "quick"],
    ["agent_session_id", "agent-a"],
    ["metadata", record([
      ["agent_type", "gsd-planner"],
      ["model", "gpt-5.6-sol"],
      ["reasoning_effort", "xhigh"]
    ])],
    ["inputs", ["src/example.ts"]],
    ["outputs", []],
    ["git", record([["head", "before"], ["changed_paths", []]])]
  ]);
  const completed = {
    ...started,
    event: "completed",
    timestamp: "2026-07-21T10:03:00.000Z",
    outputs: ["src/example.ts"],
    timing: record([
      ["active_ms", 45_000],
      ["tool_ms", 30_000],
      ["queue_ms", 15_000],
      ["external_wait_ms", 90_000]
    ])
  };
  return { completed, started };
}

afterEach(() => {
  const repositories = [...temporaryRepositories];
  temporaryRepositories.length = 0;
  for (const cwd of repositories) {
    rmSync(cwd, { recursive: true, force: true });
  }
});

describe("GSD observability writer", () => {
  it("writes explicit metadata inside the ignored repository log boundary", () => {
    const cwd = createRepository();
    const metadata = record([
      ["agent_type", "gsd-executor"],
      ["model", "gpt-5.6-sol"],
      ["reasoning_effort", "ultra"]
    ]);
    const payload = record([
      ["inputs", [".planning/STATE.md"]],
      ["metadata", metadata]
    ]);
    const result = run(writer, ["start", ...baseStepArguments(cwd)], {
      input: JSON.stringify(payload)
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
    const log = readFileSync(
      path.join(cwd, ".logs/gsd-observability/run-1/controller.jsonl"),
      "utf8"
    );
    const event = parseRecord(log);
    expect(event).not.toHaveProperty("git");
    expect(event.input_attribution).toBe("declared_only");
    expect(event.metadata).toEqual(metadata);
    expect(event).toMatchObject(
      record([
        ["schema_version", 1],
        ["event", "started"],
        ["run_id", "run-1"],
        ["step_id", "context-load"],
        [
          "metadata",
          metadata
        ]
      ])
    );
    expect(git(cwd, ["status", "--porcelain=v1", "--untracked-files=all"])).toBe("");
  });

  it("repair contract rejects unsupported and secret-shaped metadata", () => {
    const cwd = createRepository();
    for (const metadata of [
      record([["label", "unsupported"]]),
      record([["api_key", "must-not-leak"]]),
      record([["cache_key", "retired-cache"]]),
      record([["agent_model", "gpt-5.6-sol"]])
    ]) {
      const result = run(writer, ["start", ...baseStepArguments(cwd)], {
        input: JSON.stringify({ metadata })
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("OBSERVABILITY_PAYLOAD_REJECTED");
    }
  });

  it("repair contract rejects unsupported or invalid host timing values", () => {
    const cwd = createRepository();
    for (const timing of [
      record([["active_ms", -1]]),
      record([["tool_ms", "1"]]),
      record([["wall_ms", 1]])
    ]) {
      const result = run(writer, ["complete", ...baseStepArguments(cwd)], {
        input: JSON.stringify({ timing })
      });
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("OBSERVABILITY_PAYLOAD_REJECTED");
    }
  });

  it("rejects path traversal and absolute log targets", () => {
    const cwd = createRepository();
    const result = run(writer, [
      "start",
      ...baseStepArguments(cwd),
      "--run",
      "../outside"
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("OBSERVABILITY_PATH_REJECTED");
    expect(() =>
      readFileSync(path.join(cwd, ".logs/outside/controller.jsonl"), "utf8")
    ).toThrow();
  });

  it("records repeated attempts without deciding whether the controller may retry", () => {
    const cwd = createRepository();
    const common = baseStepArguments(cwd, "repeated-step");
    expect(run(writer, ["start", ...common]).status).toBe(0);
    expect(run(writer, ["complete", ...common]).status).toBe(0);
    expect(run(writer, ["start", ...common]).status).toBe(0);
    expect(run(writer, ["block", ...common]).status).toBe(0);

    const events = readFileSync(
      path.join(cwd, ".logs/gsd-observability/run-1/controller.jsonl"),
      "utf8"
    ).trim().split("\n").map((line) => parseRecord(line));
    expect(events.map((event) => event.event)).toEqual([
      "started",
      "completed",
      "started",
      "blocked"
    ]);
  });

  it("rejects retired lifecycle commands and metadata instead of silently accepting them", () => {
    const cwd = createRepository();
    for (const command of ["fingerprint", "validate-plan"]) {
      const result = run(writer, [command, ...baseStepArguments(cwd)]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("OBSERVABILITY_ARGUMENT_REJECTED");
    }

    const rollout = run(writer, [
      "start",
      ...baseStepArguments(cwd),
      "--rollout",
      "legacy-rollout"
    ]);
    expect(rollout.status).not.toBe(0);
    expect(rollout.stderr).toContain("OBSERVABILITY_ARGUMENT_REJECTED");
  });

  it("rejects commands inherited from Object.prototype", () => {
    const cwd = createRepository();
    const result = run(writer, ["constructor", ...baseStepArguments(cwd)]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("OBSERVABILITY_ARGUMENT_REJECTED");
  });

  it("attributes outputs only when the controller declares them", () => {
    const cwd = createRepository();
    const arguments_ = baseStepArguments(cwd, "declared-output");
    expect(run(writer, ["start", ...arguments_]).status).toBe(0);
    write(cwd, "src/other-agent.ts", "export const other = true;\n");
    expect(run(writer, ["complete", ...arguments_]).status).toBe(0);

    const events = readFileSync(
      path.join(cwd, ".logs/gsd-observability/run-1/controller.jsonl"),
      "utf8"
    ).trim().split("\n").map((line) => parseRecord(line));
    expect(events.at(-1)?.outputs).toEqual([]);
  });
});

const localCorepack = path.join(
  repositoryRoot,
  ".tools",
  "node-v24.17.0-win-x64",
  "corepack.cmd"
);
const windowsPipelineTest = process.platform === "win32" && existsSync(localCorepack)
  ? it
  : it.skip;

describe("repository-local npm wrapper", () => {
  windowsPipelineTest("forwards pipeline JSON to observability commands", () => {
    const runId = `npm-local-pipeline-${process.pid}-${Date.now()}`;
    const runDirectory = path.join(
      repositoryRoot,
      ".logs",
      "gsd-observability",
      runId
    );
    const payload = JSON.stringify({ inputs: ["AGENTS.md"] });
    const invocation = [
      String.raw`& .\scripts\npm-local.ps1 --% run gsd:observe -- start`,
      "--repo .",
      `--run ${runId}`,
      "--step pipeline-input",
      "--stage workflow-debug",
      "--budget quick",
      "--agent controller"
    ].join(" ");
    const command = `$payload = '${payload}'; $payload | ${invocation}`;
    const encodedCommand = Buffer.from(command, "utf16le").toString("base64");
    const powerShell = path.join(
      process.env.SystemRoot ?? String.raw`C:\Windows`,
      "System32",
      "WindowsPowerShell",
      "v1.0",
      "powershell.exe"
    );

    try {
      const result = spawnSync(
        powerShell,
        ["-NoProfile", "-NonInteractive", "-EncodedCommand", encodedCommand],
        { cwd: repositoryRoot, encoding: "utf8" }
      );
      expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0);
      const event = parseRecord(
        readFileSync(path.join(runDirectory, "controller.jsonl"), "utf8")
      );
      expect(event.inputs).toEqual(["AGENTS.md"]);
    } finally {
      rmSync(runDirectory, { recursive: true, force: true });
    }
  });
});

describe("GSD observability summarizer", () => {
  it("repair contract uses one canonical Git root", () => {
    const cwd = createRepository();
    const nested = path.join(cwd, "nested", "work");
    mkdirSync(nested, { recursive: true });
    const stepArguments = baseStepArguments(nested, "canonical-root");
    expect(run(writer, ["start", ...stepArguments]).status).toBe(0);
    expect(run(writer, ["complete", ...stepArguments]).status).toBe(0);

    const result = run(summarizer, ["--repo", nested, "--run", "run-1"]);
    expect(result.status, result.stderr).toBe(0);
    expect(existsSync(path.join(
      cwd,
      ".logs/gsd-observability/run-1/summary.json"
    ))).toBe(true);
    expect(existsSync(path.join(
      nested,
      ".logs/gsd-observability/run-1/summary.json"
    ))).toBe(false);
    expect(git(cwd, ["status", "--porcelain=v1", "--untracked-files=all"])).toBe("");
  });

  it("repair contract aggregates declared I/O from every event", () => {
    const cwd = createRepository();
    const arguments_ = baseStepArguments(cwd, "all-events");
    const events = [
      ["start", { inputs: ["AGENTS.md"], outputs: [".planning/STATE.md"] }],
      ["warning", {
        inputs: ["package.json"],
        outputs: ["tests/unit/gsd-observability.test.ts"]
      }],
      ["complete", {
        inputs: ["scripts/gsd-observability-write.mjs"],
        outputs: ["scripts/gsd-observability-summarize.mjs"]
      }]
    ] as const;
    for (const [event, payload] of events) {
      const result = run(writer, [event, ...arguments_], {
        input: JSON.stringify(payload)
      });
      expect(result.status, result.stderr).toBe(0);
    }

    const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
    expect(result.status, result.stderr).toBe(0);
    const summary = parseRecord(readFileSync(
      path.join(cwd, ".logs/gsd-observability/run-1/summary.json"),
      "utf8"
    ));
    const [step] = summary.steps as Array<Record<string, unknown>>;
    expect(step.inputs).toEqual(expect.arrayContaining([
      "AGENTS.md",
      "package.json",
      "scripts/gsd-observability-write.mjs"
    ]));
    expect(step.outputs).toEqual(expect.arrayContaining([
      ".planning/STATE.md",
      "scripts/gsd-observability-summarize.mjs",
      "tests/unit/gsd-observability.test.ts"
    ]));
    expect(step.inputs).toHaveLength(3);
    expect(step.outputs).toHaveLength(3);
    expect(step.input_attribution).toBe("declared_only");
  });

  it("review contract aggregates compatible identity metadata from every event", () => {
    const cwd = createRepository();
    const runDirectory = path.join(cwd, ".logs/gsd-observability/run-1");
    const started = record([
      ["event", "started"],
      ["run_id", "run-1"],
      ["step_id", "identity"],
      ["stage", "planning"],
      ["timestamp", "2026-07-22T10:00:00.000Z"],
      ["budget_class", "quick"],
      ["agent_session_id", "planner"],
      ["metadata", record([["agent_type", "gsd-planner"]])],
      ["inputs", []],
      ["outputs", []]
    ]);
    const warning = {
      ...started,
      event: "warning",
      timestamp: "2026-07-22T10:00:30.000Z",
      metadata: record([["model", "gpt-5.6-sol"]])
    };
    const completed = {
      ...started,
      event: "completed",
      timestamp: "2026-07-22T10:01:00.000Z",
      metadata: record([["reasoning_effort", "ultra"]])
    };
    write(
      cwd,
      ".logs/gsd-observability/run-1/controller.jsonl",
      `${[started, warning, completed].map((event) => JSON.stringify(event)).join("\n")}\n`
    );

    const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
    expect(result.status, result.stderr).toBe(0);
    const summary = parseRecord(readFileSync(
      path.join(runDirectory, "summary.json"),
      "utf8"
    ));
    expect(summary.steps).toMatchObject([
      record([
        ["agent_type", "gsd-planner"],
        ["model", "gpt-5.6-sol"],
        ["reasoning_effort", "ultra"]
      ])
    ]);
  });

  it("review contract rejects invalid or conflicting metadata on later events", () => {
    const cases = [
      ["warning", record([["api_key", "must-not-leak"]])],
      ["completed", record([["agent_model", "retired-alias"]])],
      ["completed", record([["model", "different-model"]])]
    ] as const;
    for (const [eventName, metadata] of cases) {
      const cwd = createRepository();
      const started = record([
        ["event", "started"],
        ["run_id", "run-1"],
        ["step_id", "identity"],
        ["stage", "planning"],
        ["timestamp", "2026-07-22T10:00:00.000Z"],
        ["budget_class", "quick"],
        ["agent_session_id", "planner"],
        ["metadata", record([["model", "gpt-5.6-sol"]])],
        ["inputs", []],
        ["outputs", []]
      ]);
      const later = {
        ...started,
        event: eventName,
        timestamp: "2026-07-22T10:00:30.000Z",
        metadata
      };
      const events = eventName === "warning"
        ? [started, later, {
          ...started,
          event: "completed",
          timestamp: "2026-07-22T10:01:00.000Z"
        }]
        : [started, later];
      write(
        cwd,
        ".logs/gsd-observability/run-1/controller.jsonl",
        `${events.map((event) => JSON.stringify(event)).join("\n")}\n`
      );

      const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("METRICS_DATA_ERROR");
    }
  });

  it("review contract validates every event budget against the attempt start", () => {
    const cases = [
      ["warning", "constructor"],
      ["completed", "constructor"],
      ["warning", "standard"],
      ["completed", "standard"]
    ] as const;
    for (const [eventName, budgetClass] of cases) {
      const cwd = createRepository();
      const started = record([
        ["event", "started"],
        ["run_id", "run-1"],
        ["step_id", "budget"],
        ["stage", "planning"],
        ["timestamp", "2026-07-22T10:00:00.000Z"],
        ["budget_class", "quick"],
        ["agent_session_id", "planner"],
        ["inputs", []],
        ["outputs", []]
      ]);
      const later = {
        ...started,
        event: eventName,
        timestamp: "2026-07-22T10:00:30.000Z",
        ...record([["budget_class", budgetClass]])
      };
      const events = eventName === "warning"
        ? [started, later, {
          ...started,
          event: "completed",
          timestamp: "2026-07-22T10:01:00.000Z"
        }]
        : [started, later];
      write(
        cwd,
        ".logs/gsd-observability/run-1/controller.jsonl",
        `${events.map((event) => JSON.stringify(event)).join("\n")}\n`
      );

      const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain("METRICS_DATA_ERROR");
    }
  });

  it("repair contract rejects unknown budget classes", () => {
    const cwd = createRepository();
    const writerResult = run(writer, [
      "start",
      ...baseStepArguments(cwd),
      "--budget",
      "constructor"
    ]);
    expect(writerResult.status).not.toBe(0);
    expect(writerResult.stderr).toContain("OBSERVABILITY_ARGUMENT_REJECTED");

    const runDirectory = path.join(cwd, ".logs/gsd-observability/run-1");
    mkdirSync(runDirectory, { recursive: true });
    const started = record([
      ["event", "started"],
      ["run_id", "run-1"],
      ["step_id", "unknown-budget"],
      ["stage", "planning"],
      ["timestamp", "2026-07-22T10:00:00.000Z"],
      ["budget_class", "constructor"],
      ["agent_session_id", "planner"],
      ["inputs", []],
      ["outputs", []]
    ]);
    const completed = {
      ...started,
      event: "completed",
      timestamp: "2026-07-22T10:15:01.000Z"
    };
    write(
      cwd,
      ".logs/gsd-observability/run-1/controller.jsonl",
      `${JSON.stringify(started)}\n${JSON.stringify(completed)}\n`
    );

    const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("METRICS_DATA_ERROR");
  });

  it("repair contract names the in-progress controller-observed window", () => {
    const cwd = createRepository();
    const runDirectory = path.join(cwd, ".logs/gsd-observability/run-1");
    mkdirSync(runDirectory, { recursive: true });
    const startedAt = new Date(Date.now() - 3_720_000).toISOString();
    const started = record([
      ["event", "started"],
      ["run_id", "run-1"],
      ["step_id", "long-step"],
      ["stage", "planning"],
      ["step", "long-step"],
      ["timestamp", startedAt],
      ["budget_class", "quick"],
      ["agent_session_id", "planner"],
      ["inputs", []],
      ["outputs", []]
    ]);
    write(
      cwd,
      ".logs/gsd-observability/run-1/controller.jsonl",
      `${JSON.stringify(started)}\n`
    );

    const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("tokens=unavailable");
    expect(result.stdout).not.toContain("processed=n/a");
    const summary = parseRecord(
      readFileSync(path.join(runDirectory, "summary.json"), "utf8")
    );
    const [step] = summary.steps as Array<Record<string, unknown>>;
    expect(step.observed_window_ms).toBeGreaterThanOrEqual(3_719_000);
    expect(step).not.toHaveProperty("wall_duration_ms");
    expect(step.budget_status).toBe("severe_over_budget");
    expect(summary.milestone_progress_status).toBe("warning_no_test_change");
  });

  it("preserves sequential attempts instead of folding repeated work into one step", () => {
    const cwd = createRepository();
    const runDirectory = path.join(cwd, ".logs/gsd-observability/run-1");
    mkdirSync(runDirectory, { recursive: true });
    const event = (name: string, timestamp: string) => record([
      ["event", name],
      ["run_id", "run-1"],
      ["step_id", "plan-check"],
      ["stage", "planning"],
      ["step", "plan-check"],
      ["timestamp", timestamp],
      ["budget_class", "quick"],
      ["agent_session_id", "checker"],
      ["inputs", []],
      ["outputs", []]
    ]);
    const events = [
      event("started", "2026-07-22T10:00:00.000Z"),
      event("completed", "2026-07-22T10:01:00.000Z"),
      event("started", "2026-07-22T10:02:00.000Z"),
      event("blocked", "2026-07-22T10:05:00.000Z")
    ];
    write(
      cwd,
      ".logs/gsd-observability/run-1/controller.jsonl",
      `${events.map((item) => JSON.stringify(item)).join("\n")}\n`
    );

    const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
    expect(result.status, result.stderr).toBe(0);
    const summary = parseRecord(
      readFileSync(path.join(runDirectory, "summary.json"), "utf8")
    );
    expect(summary.steps).toMatchObject([
      record([["status", "completed"], ["observed_window_ms", 60_000]]),
      record([["status", "blocked"], ["observed_window_ms", 180_000]])
    ]);
    expect(summary.run_observed_window_ms).toBe(300_000);
    expect(summary).not.toHaveProperty("run_wall_duration_ms");
  });

  it("marks an unmatched terminal event as incomplete instead of on track", () => {
    const cwd = createRepository();
    const terminal = run(writer, ["block", ...baseStepArguments(cwd, "missing-start")]);
    expect(terminal.status).toBe(0);
    const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
    expect(result.status, result.stderr).toBe(0);
    const summary = parseRecord(
      readFileSync(path.join(cwd, ".logs/gsd-observability/run-1/summary.json"), "utf8")
    );
    expect(summary).toMatchObject(record([
      ["metrics_incomplete", true],
      ["milestone_progress_status", "metrics_incomplete"],
      ["run_observed_window_ms", null],
      ["steps", []]
    ]));
  });

  it("repair contract makes unavailable token and host data explicit", () => {
    const cwd = createRepository();
    const runDirectory = path.join(cwd, ".logs/gsd-observability/run-1");
    mkdirSync(runDirectory, { recursive: true });
    const started = record([
      ["event", "started"],
      ["run_id", "run-1"],
      ["step_id", "plan-check"],
      ["stage", "planning"],
      ["step", "plan-check"],
      ["timestamp", "2026-07-22T10:00:00.000Z"],
      ["budget_class", "quick"],
      ["agent_session_id", "checker"],
      ["inputs", [".planning/ROADMAP.md"]],
      ["outputs", []]
    ]);
    write(
      cwd,
      ".logs/gsd-observability/run-1/controller.jsonl",
      `${JSON.stringify(started)}\n${JSON.stringify({ ...started, event: "blocked", timestamp: "2026-07-22T10:01:00.000Z" })}\n`
    );

    const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
    expect(result.status, result.stderr).toBe(0);
    const summary = parseRecord(
      readFileSync(path.join(runDirectory, "summary.json"), "utf8")
    );
    const steps = summary.steps as Array<Record<string, unknown>>;
    expect(steps[0]).toMatchObject(record([
      ["host_active_ms", null],
      ["host_tool_ms", null],
      ["host_queue_ms", null],
      ["host_external_wait_ms", null],
      ["tokens", null],
      ["measurement_notices", [
        "tokens_unavailable:host_does_not_expose_step_usage",
        "active_time_unavailable:caller_did_not_supply_timing",
        "tool_duration_unavailable:caller_did_not_supply_timing",
        "queue_time_unavailable:caller_did_not_supply_timing",
        "external_wait_unavailable:caller_did_not_supply_timing",
      ]]
    ]));
    expect(summary.metrics_incomplete_reasons).toEqual([
      "active_time_unavailable",
      "external_wait_unavailable",
      "queue_time_unavailable",
      "token_attribution_unavailable",
      "tool_duration_unavailable"
    ]);
  });

  it("repair contract never infers host active time", () => {
    const cwd = createRepository();
    const runDirectory = path.join(cwd, ".logs/gsd-observability/run-1");
    mkdirSync(runDirectory, { recursive: true });
    const started = record([
      ["event", "started"],
      ["run_id", "run-1"],
      ["step_id", "external"],
      ["stage", "verify"],
      ["timestamp", "2026-07-22T10:00:00.000Z"],
      ["budget_class", "quick"],
      ["agent_session_id", "controller"],
      ["inputs", []],
      ["outputs", []]
    ]);
    const completed = {
      ...started,
      event: "completed",
      timestamp: "2026-07-22T10:01:00.000Z",
      timing: record([["external_wait_ms", 120_000]])
    };
    write(
      cwd,
      ".logs/gsd-observability/run-1/controller.jsonl",
      `${JSON.stringify(started)}\n${JSON.stringify(completed)}\n`
    );

    const result = run(summarizer, ["--repo", cwd, "--run", "run-1"]);
    expect(result.status, result.stderr).toBe(0);
    const summary = parseRecord(
      readFileSync(path.join(runDirectory, "summary.json"), "utf8")
    );
    const [step] = summary.steps as Array<Record<string, unknown>>;
    expect(step).toMatchObject(record([
      ["observed_window_ms", 60_000],
      ["host_external_wait_ms", 120_000],
      ["host_active_ms", null]
    ]));
    expect(step).not.toHaveProperty("active_duration_ms");
  });

  it("repair contract uses canonical model and host timing fields", () => {
    const cwd = createRepository();
    const runDirectory = path.join(cwd, ".logs/gsd-observability/run-1");
    mkdirSync(runDirectory, { recursive: true });
    const { completed, started } = suppliedTimingEvents();
    write(
      cwd,
      ".logs/gsd-observability/run-1/controller.jsonl",
      `${JSON.stringify(started)}\n${JSON.stringify(completed)}\n`
    );
    const result = run(summarizer, [
      "--repo",
      cwd,
      "--run",
      "run-1"
    ]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim().split("\n")).toHaveLength(1);
    expect(result.stdout).toContain("over_budget");
    expect(result.stdout).toContain("codescene");
    expect(result.stdout).toContain("observed=180.0s");
    expect(result.stdout).not.toContain("wall=");
    expect(result.stdout).toContain("tokens=unavailable");
    expect(result.stdout).toContain("model=gpt-5.6-sol");
    expect(result.stdout).toContain("effort=xhigh");
    const summary = parseRecord(
      readFileSync(path.join(runDirectory, "summary.json"), "utf8")
    );
    const summaryFields = new Map(Object.entries(summary));
    expect(summaryFields.get("metrics_incomplete")).toBe(true);
    expect(summaryFields.get("metrics_incomplete_reasons")).toEqual(["token_attribution_unavailable"]);
    const steps = summaryFields.get("steps");
    expect(Array.isArray(steps)).toBe(true);
    expect((steps as unknown[])[0]).toMatchObject(
      record([
        ["step_id", "codescene"],
        ["observed_window_ms", 180_000],
        ["host_active_ms", 45_000],
        ["host_tool_ms", 30_000],
        ["host_queue_ms", 15_000],
        ["host_external_wait_ms", 90_000],
        ["agent_type", "gsd-planner"],
        ["model", "gpt-5.6-sol"],
        ["reasoning_effort", "xhigh"],
        ["input_attribution", "declared_only"],
        ["budget_status", "over_budget"],
        ["tokens", null],
        ["measurement_notices", ["tokens_unavailable:host_does_not_expose_step_usage"]],
        ["inputs", ["src/example.ts"]],
        ["outputs", ["src/example.ts"]]
      ])
    );
    expect((steps as unknown[])[0]).not.toHaveProperty("agent_model");
    expect((steps as unknown[])[0]).not.toHaveProperty("wall_duration_ms");
    expect(summaryFields.get("time_to_first_product_change_ms")).toBe(180_000);
  });

  it("rejects retired rollout attribution instead of silently ignoring it", () => {
    const cwd = createRepository();
    const result = run(summarizer, [
      "--repo",
      cwd,
      "--run",
      "run-1",
      "--rollout",
      "legacy=rollout.jsonl"
    ]);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("METRICS_ARGUMENT_ERROR");
  });
});
