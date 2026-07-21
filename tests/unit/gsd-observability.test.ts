import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
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

function parseRecord(value: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(value);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new TypeError("Expected a JSON object");
  }

  return parsed as Record<string, unknown>;
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
    "--name",
    step,
    "--gate-stage",
    "pre_edit",
    "--plane",
    "control",
    "--budget",
    "quick",
    "--agent",
    "controller",
    "--rollout",
    "rollout-a",
    "--resume-key",
    `${step}-resume`
  ];
}

afterEach(() => {
  const repositories = [...temporaryRepositories];
  temporaryRepositories.length = 0;
  for (const cwd of repositories) {
    rmSync(cwd, { recursive: true, force: true });
  }
});

describe("GSD observability writer", () => {
  it("writes a sanitized append-only event inside the repository log boundary", () => {
    const cwd = createRepository();
    write(cwd, ".gitignore", ".logs/\n");
    const result = run(writer, ["start", ...baseStepArguments(cwd)], {
      input: JSON.stringify({
        inputs: [".planning/STATE.md"],
        metadata: record([
          ["api_key", "must-not-leak"],
          ["label", "safe"]
        ])
      })
    });

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toBe("");
    const log = readFileSync(
      path.join(cwd, ".logs/gsd-observability/run-1/controller.jsonl"),
      "utf8"
    );
    expect(log).not.toContain("must-not-leak");
    expect(parseRecord(log)).toMatchObject(
      record([
        ["schema_version", 1],
        ["event", "started"],
        ["run_id", "run-1"],
        ["step_id", "context-load"],
        ["plane", "control"],
        ["git", record([["changed_paths", [".gitignore"]]])],
        [
          "metadata",
          record([
            ["api_key", "[REDACTED]"],
            ["label", "safe"]
          ])
        ]
      ])
    );
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

  it("blocks completed cache keys and requires explicit retry lineage after interruption", () => {
    const cwd = createRepository();
    const common = [...baseStepArguments(cwd), "--cache-key", "cache-a"];
    expect(run(writer, ["start", ...common]).status).toBe(0);
    expect(run(writer, ["complete", ...common]).status).toBe(0);

    const duplicate = run(writer, [
      "start",
      ...baseStepArguments(cwd, "duplicate"),
      "--cache-key",
      "cache-a"
    ]);
    expect(duplicate.status).not.toBe(0);
    expect(duplicate.stderr).toContain("STEP_ALREADY_COMPLETED");

    const interrupted = [...baseStepArguments(cwd, "external-a"), "--cache-key", "cache-b"];
    expect(run(writer, ["start", ...interrupted]).status).toBe(0);
    expect(run(writer, ["interrupt", ...interrupted]).status).toBe(0);
    const implicitRetry = run(writer, [
      "start",
      ...baseStepArguments(cwd, "external-b"),
      "--cache-key",
      "cache-b"
    ]);
    expect(implicitRetry.status).not.toBe(0);
    expect(implicitRetry.stderr).toContain("EXPLICIT_RETRY_REQUIRED");
    expect(
      run(writer, [
        "start",
        ...baseStepArguments(cwd, "external-b"),
        "--cache-key",
        "cache-b",
        "--retry-of",
        "external-a"
      ]).status
    ).toBe(0);
  });

  it("separates product, dependency, search, and policy fingerprints and ignores logs", () => {
    const cwd = createRepository();
    const fingerprint = () => {
      const result = run(writer, ["fingerprint", "--repo", cwd]);
      expect(result.status, result.stderr).toBe(0);
      return JSON.parse(result.stdout) as Record<string, string>;
    };

    const initial = fingerprint();

    write(cwd, ".logs/gsd-observability/noise.jsonl", "ignored\n");
    expect(fingerprint()).toEqual(initial);

    write(cwd, "src/example.ts", "export const value = 2;\n");
    const productChange = fingerprint();
    expect(productChange.product).not.toBe(initial.product);
    expect(productChange.search).toBe(initial.search);
    expect(productChange.dependency).toBe(initial.dependency);

    write(cwd, "package-lock.json", '{"lockfileVersion":3,"changed":true}\n');
    const dependencyChange = fingerprint();
    expect(dependencyChange.dependency).not.toBe(productChange.dependency);

    write(cwd, ".lumenignore", ".logs/\n.tmp/\n");
    const searchChange = fingerprint();
    expect(searchChange.search).not.toBe(dependencyChange.search);

    write(cwd, "skills/metronome-policy/SKILL.md", "# Changed policy\n");
    expect(fingerprint().policy).not.toBe(searchChange.policy);
  });
});

describe("GSD plan liveness", () => {
  it("passes a staged, receipt-driven plan and rejects known reset-loop shapes", () => {
    const cwd = createRepository();
    const receipt = "approved execution evidence\n";
    const receiptHash = createHash("sha256").update(receipt).digest("hex");
    write(cwd, "01-EXECUTION-RECEIPT.md", receipt);
    const goodPlan = `
<execution_contract evidence_receipt="01-EXECUTION-RECEIPT.md" receipt_sha256="${receiptHash}" no_auto_retry="true" />
<context>\n@01-EXECUTION-RECEIPT.md\n</context>
<task id="T1" gate_stage="pre_edit" budget="quick" plane="control" resumable="true" resume_key="t1" cache_key="product+search" inputs="receipt,tests" outputs="tests">
  <action>Check fingerprints and run focused tests.</action>
</task>
<task id="T2" gate_stage="task" budget="standard" plane="product" resumable="true" resume_key="t2" cache_key="product+policy" inputs="receipt,tests,source" outputs="source">
  <action>Implement only the approved surface.</action>
</task>
<task id="T3" gate_stage="pre_merge" budget="external" plane="external" resumable="true" resume_key="t3" cache_key="final-revision" inputs="final-revision" outputs="evidence" external_job_id="required">
  <action>Run final CodeScene and the 89-line LOC verifier.</action>
</task>`;
    write(cwd, "good-plan.md", goodPlan);
    const good = run(writer, [
      "validate-plan",
      "--repo",
      cwd,
      "--plan",
      "good-plan.md"
    ]);
    expect(good.status, good.stderr).toBe(0);
    expect(good.stdout.startsWith("PLAN_LIVENESS_OK")).toBe(true);

    const wrongReceiptHash = "0000000000000000000000000000000000000000000000000000000000000000";
    const badPlans = [
      goodPlan.split(` receipt_sha256="${receiptHash}"`).join(""),
      goodPlan.split(receiptHash).join(wrongReceiptHash),
      goodPlan.replace("Check fingerprints", "Run CodeScene then check fingerprints"),
      goodPlan.replace("@01-EXECUTION-RECEIPT.md", "@01-RESEARCH.md"),
      goodPlan.replace('resumable="true"', 'resumable="false"'),
      goodPlan.replace('gate_stage="task"', ""),
      goodPlan.replace(' cache_key="product+policy"', ""),
      goodPlan.replace(' outputs="source"', ""),
      goodPlan.replace("Implement only", "Automatically retry and implement only"),
      goodPlan.replace("Check fingerprints", "Reindex Lumen and search installed dependencies"),
      goodPlan.replace("Implement only", "Run CodeScene and implement only")
    ];
    for (const [index, plan] of badPlans.entries()) {
      const planPath = `bad-${index}.md`;
      write(cwd, planPath, plan);
      const result = run(writer, [
        "validate-plan",
        "--repo",
        cwd,
        "--plan",
        planPath
      ]);
      expect(result.status, `${planPath}: ${result.stderr}`).not.toBe(0);
      expect(result.stderr).toContain("PLAN_LIVENESS_BLOCKED");
    }
  });
});

describe("GSD observability summarizer", () => {
  it("streams rollout tokens, reports durations and soft budgets, and tolerates a truncated tail", () => {
    const cwd = createRepository();
    const runDirectory = path.join(cwd, ".logs/gsd-observability/run-1");
    mkdirSync(runDirectory, { recursive: true });
    const started = record([
      ["schema_version", 1],
      ["event", "started"],
      ["run_id", "run-1"],
      ["step_id", "external"],
      ["stage", "execute"],
      ["step", "codescene"],
      ["timestamp", "2026-07-21T10:00:00.000Z"],
      ["plane", "external"],
      ["budget_class", "quick"],
      ["agent_session_id", "agent-a"],
      ["rollout_id", "rollout-a"],
      ["inputs", ["src/example.ts"]],
      ["outputs", []],
      ["resume_key", "external-resume"],
      ["cache_key", "cache-a"],
      ["fingerprints", { product: "p", dependency: "d", search: "s", policy: "x" }],
      ["git", record([["head", "before"], ["changed_paths", []]])]
    ]);
    const completed = {
      ...started,
      event: "completed",
      timestamp: "2026-07-21T10:03:00.000Z",
      outputs: ["src/example.ts"],
      timing: record([
        ["external_wait_ms", 120_000],
        ["tool_ms", 30_000]
      ])
    };
    write(
      cwd,
      ".logs/gsd-observability/run-1/controller.jsonl",
      `${JSON.stringify(started)}\n${JSON.stringify(completed)}\n`
    );
    const rollout = path.join(cwd, "rollout.jsonl");
    const tokenEvent = (usage: {
      timestamp: string;
      input: number;
      cached: number;
      output: number;
      reasoning: number;
    }) =>
      JSON.stringify({
        timestamp: usage.timestamp,
        type: "event_msg",
        payload: {
          type: "token_count",
          info: record([
            [
              "last_token_usage",
              record([
                ["input_tokens", usage.input],
                ["cached_input_tokens", usage.cached],
                ["output_tokens", usage.output],
                ["reasoning_output_tokens", usage.reasoning],
                ["total_tokens", usage.input + usage.output]
              ])
            ]
          ])
        }
      });
    writeFileSync(
      rollout,
      `${tokenEvent({ timestamp: "2026-07-21T10:01:00.000Z", input: 200_000, cached: 170_000, output: 20_000, reasoning: 5000 })}\n${tokenEvent({ timestamp: "2026-07-21T10:02:00.000Z", input: 150_000, cached: 140_000, output: 15_000, reasoning: 3000 })}\n{"truncated":`,
      "utf8"
    );

    const result = run(summarizer, [
      "--repo",
      cwd,
      "--run",
      "run-1",
      "--rollout",
      `rollout-a=${rollout}`
    ]);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout.trim().split("\n")).toHaveLength(1);
    expect(result.stdout).toContain("over_budget");
    expect(result.stdout).toContain("codescene");
    const summary = parseRecord(
      readFileSync(path.join(runDirectory, "summary.json"), "utf8")
    );
    const summaryFields = new Map(Object.entries(summary));
    expect(summaryFields.get("metrics_incomplete")).toBe(true);
    const steps = summaryFields.get("steps");
    expect(Array.isArray(steps)).toBe(true);
    expect((steps as unknown[])[0]).toMatchObject(
      record([
        ["step_id", "external"],
        ["wall_duration_ms", 180_000],
        ["external_wait_ms", 120_000],
        ["active_duration_ms", 60_000],
        ["attribution_granularity", "turn"],
        ["budget_status", "over_budget"],
        [
          "tokens",
          record([
            ["input_tokens", 350_000],
            ["cached_input_tokens", 310_000],
            ["output_tokens", 35_000],
            ["reasoning_output_tokens", 8000],
            ["processed_tokens", 393_000],
            ["new_tokens", 83_000]
          ])
        ],
        ["inputs", ["src/example.ts"]],
        ["outputs", ["src/example.ts"]]
      ])
    );
    expect(summaryFields.get("time_to_first_product_change_ms")).toBe(180_000);
  });
});
