import { spawn } from "node:child_process";
import { once } from "node:events";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import type { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

const contexts = [
  "Metronome CI test-merge",
  "Metronome XO test-merge",
  "Metronome debt test-merge",
  "Metronome observability test-merge",
  "Metronome Codex test-merge review"
] as const;
const repository = "jiawoget/metronome";
const headSha = "1".repeat(40);
const baseSha = "2".repeat(40);
const mergeSha = "3".repeat(40);
const pullPath = "/repos/jiawoget/metronome/pulls/128";
const runUrl = "https://github.test/jiawoget/metronome/actions/runs/42";
const reporterPath = path.join(process.cwd(), "scripts", "test-merge-status-reporter.mjs");
const workflowDirectory = path.join(process.cwd(), ".github", "workflows");
const forensicPath = path.join(process.cwd(), ".planning", "forensics", "report-20260722-214242.md");
const triggerTypes = "[opened, reopened, synchronize, edited, converted_to_draft, ready_for_review]";
const workflows = [
  {
    commands: [
      "npm install -g npm@11.17.0",
      "node --version",
      "npm --version",
      "npm ci",
      "npm run lint",
      "npm run typecheck",
      "npm run test:unit",
      "npm run build"
    ],
    context: contexts[0],
    file: "ci.yml",
    gateJob: "verify",
    label: "CI",
    pushMain: true,
    runSteps: 7
  },
  {
    commands: ["npm install -g npm@11.17.0", "npm ci", "npm run lint:xo:changed"],
    context: contexts[1],
    file: "metronome-xo-gate.yml",
    gateJob: "xo_changed",
    label: "XO",
    pushMain: false,
    runSteps: 3
  },
  {
    commands: [
      "npm install -g npm@11.17.0",
      "npm ci",
      "python -m pip install semgrep",
      "npm run validate:debt-gates",
      "node scripts/run-metronome-semgrep-changed.mjs",
      "npm run typecheck --if-present",
      "npm run lint --if-present"
    ],
    context: contexts[2],
    file: "metronome-debt-gates.yml",
    gateJob: "semgrep_debt_gates",
    label: "Debt",
    pushMain: false,
    runSteps: 7
  },
  {
    commands: [
      String.raw`& .\scripts\npm-local.ps1 --% ci`,
      String.raw`& .\scripts\npm-local.ps1 --% run test:unit -- tests/unit/gsd-observability.test.ts`
    ],
    context: contexts[3],
    file: "windows-observability.yml",
    gateJob: "observability",
    label: "Observability",
    pushMain: true,
    runSteps: 3
  }
] as const;

type HttpRequest = { body: unknown; method: string; path: string };
type PullOptions = {
  baseRef?: unknown;
  baseRepository?: unknown;
  baseSha?: unknown;
  draft?: unknown;
  headRepository?: unknown;
  headSha?: unknown;
  mergeSha?: unknown;
  mergeable?: unknown;
  state?: unknown;
};
type ResponsePlan = (request: HttpRequest) => { body?: unknown; status?: number };

function record(entries: ReadonlyArray<readonly [string, unknown]>) {
  return Object.fromEntries(entries);
}

function stringRecord(entries: ReadonlyArray<readonly [string, string]>) {
  return Object.fromEntries(entries);
}

function pullResponse(options: PullOptions = {}) {
  return record([
    ["base", record([
      ["ref", options.baseRef ?? "main"],
      ["repo", record([["full_name", options.baseRepository ?? repository]])],
      ["sha", options.baseSha ?? baseSha]
    ])],
    ["draft", options.draft ?? false],
    ["head", record([
      ["repo", record([["full_name", options.headRepository ?? repository]])],
      ["sha", options.headSha ?? headSha]
    ])],
    ["merge_commit_sha", options.mergeSha ?? mergeSha],
    ["mergeable", options.mergeable ?? true],
    ["state", options.state ?? "open"]
  ]);
}

function normalized(source: string) {
  return source.replaceAll("\r\n", "\n").trim();
}

function topLevelBlock(source: string, key: string) {
  const lines = normalized(source).split("\n");
  const start = lines.indexOf(`${key}:`);
  if (start === -1) {throw new Error(`Missing ${key} block`);}
  let end = start + 1;
  while (end < lines.length && (lines[end] === "" || lines[end].startsWith(" ") || lines[end].startsWith("\t"))) {end += 1;}
  return lines.slice(start + 1, end).join("\n").trimEnd();
}

function isJobHeader(line: string) {
  const name = line.slice(2, -1);
  const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_";
  return line.startsWith("  ")
    && !line.startsWith(" ".repeat(3))
    && line.endsWith(":")
    && name.length > 0
    && name.split("").every((character) => characters.includes(character));
}

function jobBlock(source: string, name: string) {
  const lines = normalized(source).split("\n");
  const start = lines.indexOf(`  ${name}:`);
  if (start === -1) {throw new Error(`Missing ${name} job`);}
  let end = start + 1;
  while (end < lines.length && !isJobHeader(lines[end])) {end += 1;}
  return lines.slice(start + 1, end).join("\n").trimEnd();
}

function nestedEntries(source: string, key: string, indentation: number) {
  const lines = normalized(source).split("\n");
  const prefix = " ".repeat(indentation);
  const start = lines.indexOf(`${prefix}${key}:`);
  if (start === -1) {throw new Error(`Missing ${key} block`);}
  let end = start + 1;
  while (end < lines.length && (lines[end] === "" || lines[end].length - lines[end].trimStart().length > indentation)) {end += 1;}
  return lines.slice(start + 1, end)
    .filter((line) => line.length - line.trimStart().length === indentation + 2)
    .map((line) => line.trim());
}

function occurrences(source: string, value: string) {
  return source.split(value).length - 1;
}

function expression(value: string) {
  return `\${{ ${value} }}`;
}

function isPinnedAction(action: string) {
  const [label, reference, marker, version, extra] = action.split(" ");
  const referenceText = reference ?? "";
  const versionText = version ?? "";
  const separator = referenceText.lastIndexOf("@");
  const sha = separator === -1 ? "" : referenceText.slice(separator + 1);
  const versionDigits = versionText.slice(1);
  return [
    label === "uses:",
    separator > 0,
    sha.length === 40,
    sha.split("").every((character) => "0123456789abcdef".includes(character)),
    marker === "#",
    versionText.startsWith("v"),
    versionDigits.length > 0,
    versionDigits.split("").every((character) => "0123456789".includes(character)),
    extra === undefined
  ].every(Boolean);
}

async function readStream(stream: Readable | IncomingMessage) {
  let output = "";
  for await (const chunk of stream) {output += String(chunk);}
  return output;
}

async function reply(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  requests: HttpRequest[],
  respond: ResponsePlan
) {
  const raw = await readStream(incoming);
  const request = {
    body: raw.length > 0 ? (JSON.parse(raw) as unknown) : undefined,
    method: incoming.method ?? "GET",
    path: incoming.url ?? "/"
  };
  requests.push(request);
  const response = respond(request);
  outgoing.statusCode = response.status ?? 200;
  outgoing.setHeader("Content-Type", "application/json");
  outgoing.end(JSON.stringify(response.body ?? {}));
}

async function runReporter(
  mode: "initialize" | "terminal",
  respond: ResponsePlan,
  overrides: Readonly<Record<string, string>> = {}
) {
  const requests: HttpRequest[] = [];
  const server = createServer((incoming, outgoing) => {
    void reply(incoming, outgoing, requests, respond);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {throw new Error("Fake GitHub server did not bind");}

  const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "metronome-test-merge-"));
  const outputPath = path.join(temporaryDirectory, "github-output.txt");
  const child = spawn(process.execPath, [reporterPath, mode], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...stringRecord([
        ["BASE_REF", "main"],
        ["BASE_SHA", baseSha],
        ["GATE_RESULT", "success"],
        ["GITHUB_API_URL", `http://127.0.0.1:${address.port}`],
        ["GITHUB_OUTPUT", outputPath],
        ["GITHUB_REPOSITORY", repository],
        ["GITHUB_TOKEN", "test-token"],
        ["HEAD_SHA", headSha],
        ["MERGE_SHA", mergeSha],
        ["PR_NUMBER", "128"],
        ["RUN_URL", runUrl],
        ["STATUS_CONTEXT", contexts[0]]
      ]),
      ...overrides
    },
    stdio: ["ignore", "pipe", "pipe"]
  });
  const [status, stdout, stderr] = await Promise.all([
    once(child, "close").then(([code]) => code as number | null),
    readStream(child.stdout),
    readStream(child.stderr)
  ]);
  const closed = once(server, "close");
  server.close();
  await closed;
  const output = existsSync(outputPath) ? readFileSync(outputPath, "utf8") : "";
  rmSync(temporaryDirectory, { force: true, recursive: true });
  return { output, requests, status, stderr, stdout };
}

function statusRequest(sha: string, context: string, state: string, description: string) {
  return {
    body: record([["context", context], ["description", description], ["state", state], ["target_url", runUrl]]),
    method: "POST",
    path: `/repos/jiawoget/metronome/statuses/${sha}`
  };
}

describe("test-merge status reporter", () => {
  it("owns exactly the five independent context names", () => {
    const source = readFileSync(reporterPath, "utf8");
    const declared = source.split("\n")
      .filter((line) => line.startsWith('  ["Metronome '))
      .map((line) => line.slice(4, line.indexOf('", "')));

    expect(declared).toEqual(contexts);
    expect(source).not.toContain("aggregate");
    expect(source).not.toContain("summary");
    expect(source).not.toContain("Metronome Codex exact-head review");
  });

  it("publishes pending only to the validated test merge and emits the full identity", async () => {
    const result = await runReporter("initialize", (request) => (
      request.method === "GET" ? { body: pullResponse() } : { status: 201 }
    ));

    expect(result.status, result.stderr).toBe(0);
    expect(result.requests).toEqual([
      { body: undefined, method: "GET", path: pullPath },
      statusRequest(mergeSha, contexts[0], "pending", "CI gate is pending on the validated test merge")
    ]);
    expect(result.output.trim().replaceAll("\r\n", "\n").split("\n")).toEqual([
      `head_sha=${headSha}`,
      "base_ref=main",
      `base_sha=${baseSha}`,
      `merge_sha=${mergeSha}`
    ]);
  });

  it.each([
    ["closed", { state: "closed" }],
    ["draft", { draft: true }],
    ["not mergeable", { mergeable: false }],
    ["unknown mergeability", { mergeable: "unknown" }],
    ["fork", { headRepository: "other/metronome" }],
    ["wrong base repository", { baseRepository: "other/metronome" }],
    ["wrong base ref", { baseRef: "release" }],
    ["short head", { headSha: "abc1234" }],
    ["short base", { baseSha: "abc1234" }],
    ["short merge", { mergeSha: "abc1234" }],
    ["head equals base", { baseSha: headSha }],
    ["head equals merge", { mergeSha: headSha }],
    ["base equals merge", { mergeSha: baseSha }]
  ] as const)("rejects %s before publication", async (_name, options) => {
    const result = await runReporter("initialize", () => ({ body: pullResponse(options) }));
    expect(result.status).toBe(1);
    expect(result.requests).toEqual([{ body: undefined, method: "GET", path: pullPath }]);
  });

  it.each(workflows)("publishes $label success only after a complete identity reread", async ({ context, label }) => {
    const result = await runReporter(
      "terminal",
      (request) => request.method === "GET" ? { body: pullResponse() } : { status: 201 },
      stringRecord([["STATUS_CONTEXT", context]])
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.requests).toEqual([
      { body: undefined, method: "GET", path: pullPath },
      statusRequest(mergeSha, context, "success", `${label} gate passed on the validated test merge`)
    ]);
    expect(result.requests.some((request) => request.path.includes(headSha))).toBe(false);
  });

  it.each(["failure", "cancelled", "skipped"])("maps %s to failure", async (gateResult) => {
    const result = await runReporter(
      "terminal",
      (request) => request.method === "GET" ? { body: pullResponse() } : { status: 201 },
      stringRecord([["GATE_RESULT", gateResult]])
    );
    expect(result.status, result.stderr).toBe(0);
    expect(result.requests.at(-1)).toEqual(
      statusRequest(mergeSha, contexts[0], "failure", "CI gate did not pass on the validated test merge")
    );
  });

  it.each([
    ["head", { headSha: "4".repeat(40) }],
    ["base", { baseSha: "5".repeat(40) }],
    ["merge", { mergeSha: "6".repeat(40) }],
    ["base ref", { baseRef: "release" }],
    ["draft", { draft: true }],
    ["mergeability", { mergeable: false }],
    ["open state", { state: "closed" }]
  ] as const)("leaves pending without terminal publication after %s drift", async (_name, options) => {
    const result = await runReporter("terminal", () => ({ body: pullResponse(options) }));
    expect(result.status).toBe(1);
    expect(result.requests).toEqual([{ body: undefined, method: "GET", path: pullPath }]);
  });

  it.each([
    ["pending", stringRecord([["GATE_RESULT", "pending"]])],
    ["unknown result", stringRecord([["GATE_RESULT", "unknown"]])],
    ["unapproved context", stringRecord([["STATUS_CONTEXT", "Metronome aggregate test-merge"]])],
    ["Codex platform write", stringRecord([["STATUS_CONTEXT", contexts[4]]])]
  ])("fails closed for %s before API access", async (_name, overrides) => {
    const result = await runReporter("terminal", () => ({ body: pullResponse() }), overrides);
    expect(result.status).toBe(1);
    expect(result.requests).toEqual([]);
  });

  it("fails closed when GitHub rejects terminal publication", async () => {
    const result = await runReporter("terminal", (request) => (
      request.method === "GET" ? { body: pullResponse() } : { status: 500 }
    ));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("GitHub API 500");
    expect(result.requests).toHaveLength(2);
  });
});

describe("independent test-merge workflows", () => {
  it.each(workflows)("$file preserves its gate and separates untrusted testing from status writes", (contract) => {
    const source = readFileSync(path.join(workflowDirectory, contract.file), "utf8");
    const trigger = topLevelBlock(source, "on");
    const gate = jobBlock(source, contract.gateJob);
    const initialize = jobBlock(source, "initialize_test_merge");
    const terminal = jobBlock(source, "report_test_merge");
    const gateRef = contract.pushMain
      ? "github.event_name == 'push' && github.sha || needs.initialize_test_merge.outputs.merge_sha"
      : "needs.initialize_test_merge.outputs.merge_sha";
    const expectedTrigger = [
      "  pull_request_target:",
      "    branches: [main]",
      `    types: ${triggerTypes}`,
      ...(contract.pushMain ? ["  push:", "    branches:", "      - main"] : [])
    ].join("\n");

    expect(trigger).toBe(expectedTrigger);
    expect(source).not.toContain("merge_group");
    expect(normalized(source)).toContain("\npermissions: {}\n");
    expect(topLevelBlock(source, "jobs").split("\n").filter((line) => isJobHeader(line))).toEqual([
      "  initialize_test_merge:",
      `  ${contract.gateJob}:`,
      "  report_test_merge:"
    ]);
    expect(nestedEntries(initialize, "permissions", 4)).toEqual([
      "contents: read",
      "pull-requests: read",
      "statuses: write"
    ]);
    expect(nestedEntries(gate, "permissions", 4)).toEqual(["contents: read"]);
    expect(nestedEntries(terminal, "permissions", 4)).toEqual([
      "contents: read",
      "pull-requests: read",
      "statuses: write"
    ]);
    for (const block of [initialize, gate, terminal]) {
      expect(occurrences(block, "    permissions:")).toBe(1);
    }

    expect(gate.split("\n").filter((line) => line.trimStart().startsWith("needs:"))).toEqual([
      "    needs: initialize_test_merge"
    ]);
    expect(terminal.split("\n").filter((line) => line.trimStart().startsWith("needs:"))).toEqual([
      `    needs: [initialize_test_merge, ${contract.gateJob}]`
    ]);
    expect(occurrences(gate, "uses: actions/checkout@")).toBe(1);
    expect(gate.split("\n").filter((line) => ["uses: ", "- uses: "].some((prefix) => line.trim().startsWith(prefix)))).toHaveLength(2);
    expect(gate.split("\n").filter((line) => line.startsWith("        run:"))).toHaveLength(contract.runSteps);
    expect(gate.split("\n").filter((line) => line.trimStart().startsWith("ref: "))).toEqual([
      `          ref: ${expression(gateRef)}`
    ]);
    expect(occurrences(gate, "persist-credentials: false")).toBe(1);
    expect(gate).not.toContain("strategy:");
    expect(gate).not.toContain("uses: ./");
    for (const forbidden of ["statuses: write", "secrets.", "environment:", "test-merge-status-reporter"]) {
      expect(gate).not.toContain(forbidden);
    }

    let commandIndex = -1;
    for (const command of contract.commands) {
      expect(occurrences(gate, command), command).toBe(1);
      const nextIndex = gate.indexOf(command);
      expect(nextIndex, command).toBeGreaterThan(commandIndex);
      commandIndex = nextIndex;
    }

    expect(gate).not.toContain("continue-on-error:");
    expect(gate.split("\n").filter((line) => line.startsWith("        if:"))).toEqual([]);

    for (const block of [initialize, terminal]) {
      expect(block).toContain("pull-requests: read");
      expect(block).toContain("statuses: write");
      expect(block).toContain(`ref: ${expression("github.event.repository.default_branch")}`);
      expect(block).toContain("persist-credentials: false");
      expect(block).not.toContain("npm ci");
      expect(block).not.toContain("environment:");
    }

    for (const output of ["head_sha", "base_ref", "base_sha", "merge_sha"]) {
      expect(initialize).toContain(`${output}: ${expression(`steps.initialize.outputs.${output}`)}`);
      expect(terminal).toContain(`${output.toUpperCase()}: ${expression(`needs.initialize_test_merge.outputs.${output}`)}`);
    }

    expect(initialize).toContain("test-merge-status-reporter.mjs initialize");
    expect(terminal).toContain("test-merge-status-reporter.mjs terminal");
    expect(terminal).toContain(`GATE_RESULT: ${expression(`needs.${contract.gateJob}.result`)}`);
    expect(occurrences(terminal, `needs.${contract.gateJob}.result`)).toBe(1);
    expect(terminal).toContain("always()");
    for (const forbidden of ["!cancelled()", "continue-on-error", "/statuses", "/check-runs", "aggregate", "summary"]) {
      expect(terminal.toLowerCase()).not.toContain(forbidden);
    }

    for (const otherContext of contexts) {
      if (otherContext !== contract.context) {expect(source).not.toContain(otherContext);}
    }

    const actions = normalized(source).split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("uses: "));
    expect(actions.length).toBeGreaterThan(0);
    for (const action of actions) {
      expect(isPinnedAction(action), action).toBe(true);
    }
  });

  it("records a truthful merge-resident bootstrap and the no-aggregation rule", () => {
    const report = readFileSync(forensicPath, "utf8");
    for (const context of contexts) {expect(report).toContain(`\`${context}\``);}
    expect(report).toContain("No context may aggregate, query, summarize, or substitute for another gate.");
    expect(report).toContain("this bootstrap PR cannot self-prove contexts that are not merge-resident yet");
    expect(report).toContain("require exactly those five independent contexts, each pinned to GitHub Actions App ID `15368`");
  });
});
