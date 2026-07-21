#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync
} from "node:fs";
import path from "node:path";
import process from "node:process";

const EVENTS = {
  start: "started",
  complete: "completed",
  interrupt: "interrupted",
  block: "blocked",
  warning: "warning"
};
const TERMINAL = new Set(["completed", "interrupted", "blocked"]);
const SECRET = /api(?:-|_)?key|authorization|cookie|credential|password|private(?:-|_)?key|secret|token/iv;
const ALPHANUMERIC = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");
const SAFE_ID_CHARACTERS = new Set("-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz");
const DEPENDENCY_FILES = new Set([
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "package.json",
  "pnpm-lock.yaml",
  "yarn.lock"
]);
const SORT_TEXT = (left, right) => left < right ? -1 : left > right ? 1 : 0;

function stop(code, detail = "") {
  console.error(`${code}${detail ? `: ${detail}` : ""}`);
  process.exit(1);
}

function parseArguments(values) {
  const options = {};
  for (let index = 1; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      stop("OBSERVABILITY_ARGUMENT_REJECTED", name);
    }

    options[name.slice(2)] = value;
  }

  return { command: values[0], options };
}

function git(root, arguments_) {
  return execFileSync("git", arguments_, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trimEnd();
}

function repository(candidate) {
  try {
    return path.resolve(git(path.resolve(candidate ?? "."), ["rev-parse", "--show-toplevel"]));
  } catch {
    return stop("OBSERVABILITY_REPOSITORY_REJECTED", candidate);
  }
}

function required(options, name) {
  return options[name] || stop("OBSERVABILITY_ARGUMENT_REJECTED", `--${name} is required`);
}

function safeId(value, label) {
  const isValid = ALPHANUMERIC.has(value[0])
    && [...value].every((character) => SAFE_ID_CHARACTERS.has(character));
  return isValid && value !== "." && value !== ".."
    ? value
    : stop("OBSERVABILITY_PATH_REJECTED", label);
}

function relativePath(root, candidate, label) {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  if (path.isAbsolute(candidate) || relative === ".." || relative.startsWith(`..${path.sep}`)) {
    stop("OBSERVABILITY_PATH_REJECTED", label);
  }

  return { absolute, relative: relative.replaceAll("\\", "/") };
}

function readPayload() {
  const input = readFileSync(0, "utf8").trim();
  if (!input) {return {};}
  try {
    const parsed = JSON.parse(input);
    return parsed && !Array.isArray(parsed) && typeof parsed === "object"
      ? parsed
      : stop("OBSERVABILITY_PAYLOAD_REJECTED", "expected an object");
  } catch {
    return stop("OBSERVABILITY_PAYLOAD_REJECTED", "invalid JSON");
  }
}

function redact(value, key = "") {
  if (SECRET.test(key)) {return "[REDACTED]";}
  if (Array.isArray(value)) {return value.map((item) => redact(item));}
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([name, child]) => [name, redact(child, name)])
    );
  }

  return value;
}

function evidencePaths(root, value, label) {
  if (value === undefined) {return [];}
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    stop("OBSERVABILITY_PAYLOAD_REJECTED", `${label} must be paths`);
  }

  return [...new Set(value.map((item) => relativePath(root, item, label).relative))].toSorted(SORT_TEXT);
}

function repositoryFiles(root) {
  return [...new Set(
    git(root, ["ls-files", "--cached", "--others", "--exclude-standard"])
      .split(/\r?\n/v)
      .filter(Boolean)
      .map((file) => file.replaceAll("\\", "/"))
  )];
}

function hashFiles(root, files) {
  const hash = createHash("sha256");
  for (const file of files.toSorted(SORT_TEXT)) {
    const absolute = path.join(root, ...file.split("/"));
    hash.update(`${file}\0`);
    hash.update(existsSync(absolute) ? readFileSync(absolute) : "[missing]");
    hash.update("\0");
  }

  return hash.digest("hex");
}

function isDependencyFile(file) {
  return DEPENDENCY_FILES.has(file.split("/").at(-1));
}

function isSearchFile(file) {
  const normalized = file.toLowerCase();
  return normalized === ".lumenignore"
    || normalized.startsWith(".lumen/")
    || normalized.split("/").some((segment) => segment.startsWith("lumen-") || segment.startsWith("lumen."));
}

function isPolicyFile(file) {
  const normalized = file.toLowerCase();
  const basename = normalized.split("/").at(-1);
  return basename === "agents.md"
    || basename === "claude.md"
    || [".planning/config.json", ".planning/requirements.md", ".planning/roadmap.md"].includes(normalized)
    || normalized.startsWith("skills/metronome-policy/");
}

function isProductFile(file) {
  const segments = file.split("/");
  const filename = segments.at(-1);
  const isProductRoot = segments.length > 1 && ["app", "lib", "packages", "src"].includes(segments[0]);
  const isTestPath = segments.some((segment) => ["__tests__", "test", "tests"].includes(segment));
  const isTestFile = filename.includes(".spec.") || filename.includes(".test.");
  return isProductRoot && !isTestPath && !isTestFile;
}

function fingerprints(root) {
  const files = repositoryFiles(root);
  return {
    product: hashFiles(root, files.filter((file) => isProductFile(file))),
    dependency: hashFiles(root, files.filter((file) => isDependencyFile(file))),
    search: hashFiles(root, files.filter((file) => isSearchFile(file))),
    policy: hashFiles(root, files.filter((file) => isPolicyFile(file)))
  };
}

function gitState(root) {
  const changedPaths = git(root, ["status", "--porcelain=v1", "--untracked-files=all"])
    .split(/\r?\n/v)
    .filter(Boolean)
    .map((line) => line.slice(3).split(" -> ").at(-1).replaceAll("\\", "/"))
    .filter((file) => !file.startsWith(".logs/"))
    .toSorted(SORT_TEXT);
  return { head: git(root, ["rev-parse", "HEAD"]), changedPaths };
}

function ledger(root, options) {
  const run = safeId(required(options, "run"), "run id");
  const agent = safeId(required(options, "agent"), "agent id");
  const directory = path.join(root, ".logs", "gsd-observability", run);
  return agent === "controller"
    ? path.join(directory, "controller.jsonl")
    : path.join(directory, "agents", `${agent}.jsonl`);
}

function priorEvents(target) {
  const runDirectory = path.basename(target) === "controller.jsonl"
    ? path.dirname(target)
    : path.dirname(path.dirname(target));
  if (!existsSync(runDirectory)) {return [];}
  const files = [path.join(runDirectory, "controller.jsonl")];
  const agents = path.join(runDirectory, "agents");
  if (existsSync(agents)) {
    files.push(...readdirSync(agents).filter((name) => name.endsWith(".jsonl")).map((name) => path.join(agents, name)));
  }

  return files.filter(existsSync).flatMap((file) =>
    readFileSync(file, "utf8").split(/\r?\n/v).filter(Boolean).map((line) => {
      try { return eventFromWire(JSON.parse(line)); } catch { return stop("OBSERVABILITY_LOG_CORRUPT", file); }
    })
  );
}

function eventFromWire(event) {
  return {
    event: event.event,
    stepId: Reflect.get(event, "step_id"),
    cacheKey: Reflect.get(event, "cache_key"),
    inputs: event.inputs,
    inputAttribution: Reflect.get(event, "input_attribution"),
    git: {
      changedPaths: Reflect.get(event.git ?? {}, "changed_paths") ?? []
    }
  };
}

function checkTransition(command, options, events) {
  const step = required(options, "step");
  if (command === "start" && options["cache-key"]) {
    const related = events.filter((event) => event.cacheKey === options["cache-key"]);
    if (related.some((event) => event.event === "completed")) {stop("STEP_ALREADY_COMPLETED", options["cache-key"]);}
    const terminal = related.findLast((event) => TERMINAL.has(event.event));
    if (!terminal && related.some((event) => event.event === "started")) {stop("STEP_ALREADY_STARTED", options["cache-key"]);}
    if (terminal && !options["retry-of"]) {stop("EXPLICIT_RETRY_REQUIRED", options["cache-key"]);}
    if (terminal && options["retry-of"] !== terminal.stepId) {stop("RETRY_LINEAGE_NOT_FOUND", options["retry-of"]);}
  } else if (command !== "start" && command !== "warning") {
    const related = events.filter((event) => event.stepId === step);
    if (related.every((event) => event.event !== "started")) {stop("STEP_NOT_STARTED", step);}
    if (related.some((event) => TERMINAL.has(event.event))) {stop("STEP_ALREADY_TERMINAL", step);}
  }
}

function eventOutputs(command, declared, changedPaths, previousPaths) {
  if (command === "start") {return declared;}
  return [...new Set([...declared, ...changedPaths.filter((file) => !previousPaths.has(file))])].toSorted(SORT_TEXT);
}

function eventToWire(event) {
  return Object.fromEntries([
    ["schema_version", event.schemaVersion],
    ["event_id", event.eventId],
    ["event", event.event],
    ["run_id", event.runId],
    ["step_id", event.stepId],
    ["stage", event.stage],
    ["step", event.step],
    ["gate_stage", event.gateStage],
    ["timestamp", event.timestamp],
    ["plane", event.plane],
    ["budget_class", event.budgetClass],
    ["agent_session_id", event.agentSessionId],
    ["rollout_id", event.rolloutId],
    ["inputs", event.inputs],
    ["input_attribution", event.inputAttribution],
    ["outputs", event.outputs],
    ["resume_key", event.resumeKey],
    ...(event.cacheKey ? [["cache_key", event.cacheKey]] : []),
    ...(event.retryOf ? [["retry_of", event.retryOf]] : []),
    ...(event.parentStepId ? [["parent_step_id", event.parentStepId]] : []),
    ["fingerprints", event.fingerprints],
    ["git", Object.fromEntries([
      ["head", event.git.head],
      ["changed_paths", event.git.changedPaths]
    ])],
    ...(event.timing ? [["timing", event.timing]] : []),
    ...(event.metadata ? [["metadata", event.metadata]] : [])
  ]);
}

function writeEvent(command, options, root) {
  const target = ledger(root, options);
  const events = priorEvents(target);
  checkTransition(command, options, events);
  const data = readPayload();
  const state = gitState(root);
  const started = events.findLast((event) => event.stepId === options.step && event.event === "started");
  const before = new Set(started?.git.changedPaths);
  const declared = evidencePaths(root, data.outputs, "outputs");
  const inputs = evidencePaths(root, data.inputs, "inputs");
  const event = {
    schemaVersion: 1,
    eventId: randomUUID(),
    event: Reflect.get(EVENTS, command),
    runId: required(options, "run"),
    stepId: safeId(required(options, "step"), "step id"),
    stage: required(options, "stage"),
    step: required(options, "name"),
    gateStage: required(options, "gate-stage"),
    timestamp: new Date().toISOString(),
    plane: required(options, "plane"),
    budgetClass: required(options, "budget"),
    agentSessionId: required(options, "agent"),
    rolloutId: required(options, "rollout"),
    inputs: inputs.length > 0 ? inputs : (started?.inputs ?? []),
    inputAttribution: Reflect.get(data, "input_attribution") ?? started?.inputAttribution ?? "declared_only",
    outputs: eventOutputs(command, declared, state.changedPaths, before),
    resumeKey: required(options, "resume-key"),
    cacheKey: options["cache-key"],
    retryOf: options["retry-of"],
    parentStepId: options["parent-step"] ? safeId(options["parent-step"], "parent step id") : undefined,
    fingerprints: fingerprints(root),
    git: state,
    timing: data.timing ? redact(data.timing) : undefined,
    metadata: data.metadata ? redact(data.metadata) : undefined
  };
  mkdirSync(path.dirname(target), { recursive: true });
  appendFileSync(target, `${JSON.stringify(eventToWire(event))}\n`, "utf8");
}

function attributes(text) {
  return Object.fromEntries(
    text.matchAll(/(?:^|\s)(?<name>\w+)="(?<value>[^"]*)"/gv)
      .map((match) => [match.groups.name, match.groups.value])
  );
}

function attribute(values, name) {
  return Reflect.get(values, name) ?? "";
}

function executionContractProblems(root, plan) {
  const match = plan.match(/<execution_contract\b(?<attributes>[^>]*)\/>/iv);
  const contract = attributes(match?.groups?.attributes ?? "");
  const receiptPath = attribute(contract, "evidence_receipt");
  const receiptHash = attribute(contract, "receipt_sha256");
  const hasValidHash = /^[0-9a-f]{64}$/v.test(receiptHash);
  const problems = [];
  if (!receiptPath || !hasValidHash || attribute(contract, "no_auto_retry") !== "true") {
    problems.push("execution contract");
  }

  if (receiptPath && hasValidHash) {
    const receipt = relativePath(root, receiptPath, "evidence receipt").absolute;
    const actualHash = existsSync(receipt) ? createHash("sha256").update(readFileSync(receipt)).digest("hex") : "missing";
    if (actualHash !== receiptHash) {problems.push("receipt hash");}
  }

  return problems;
}

function hasBroadContext(plan) {
  return plan.toLowerCase().split(/\s+/v)
    .some((token) => token.startsWith("@") && (token.includes("research") || token.includes("validation")));
}

function planLevelProblems(plan) {
  const problems = [];
  if (hasBroadContext(plan)) {problems.push("broad context");}
  const retryText = plan.replaceAll(/(?:no|not|never|without|forbid(?:s|den)?)\s+(?:an?\s+)?automatic(?: |-)retry/giv, "");
  if (/automatically\s+retry|auto(?:matic)?(?: |-)retry/iv.test(retryText)) {problems.push("automatic retry");}
  return problems;
}

function taskFromAttributes(raw) {
  const values = attributes(raw);
  return {
    gateStage: attribute(values, "gate_stage"),
    budget: attribute(values, "budget"),
    plane: attribute(values, "plane"),
    resumable: attribute(values, "resumable"),
    resumeKey: attribute(values, "resume_key"),
    cacheKey: attribute(values, "cache_key"),
    inputs: attribute(values, "inputs"),
    outputs: attribute(values, "outputs"),
    externalJobId: attribute(values, "external_job_id")
  };
}

function hasTaskContract(task) {
  const fields = [
    task.gateStage,
    task.budget,
    task.plane,
    task.resumeKey,
    task.cacheKey,
    task.inputs,
    task.outputs
  ];
  return fields.every(Boolean) && task.resumable === "true";
}

function hasExternalDurability(task) {
  return task.plane !== "external"
    || (task.gateStage === "pre_merge" && Boolean(task.externalJobId));
}

function hasNoEarlyExternal(task, body) {
  return task.gateStage === "pre_merge"
    || !/codescene|sonar|external\s+analysis/iv.test(body);
}

function hasNoDuplicateDiscovery(task, body) {
  return !/reindex\s+lumen|search\s+installed\s+dependencies|semantic\s+search|open(?: |-)source\s+(?:search|research)/iv.test(body);
}

function hasNoEarlyVerifier(task, body) {
  return task.gateStage === "pre_merge" || !/89-line|loc verifier/iv.test(body);
}

function hasNoVerifierReset(task, body) {
  return task.gateStage !== "pre_merge"
    || !/(?:return|send|go back).{0,40}research/isv.test(body);
}

const TASK_RULES = [
  ["task contract", (task) => hasTaskContract(task)],
  ["gate stage", (task) => ["pre_edit", "task", "pre_merge"].includes(task.gateStage)],
  ["budget class", (task) => ["quick", "standard", "heavy", "external"].includes(task.budget)],
  ["plane", (task) => ["control", "product", "external"].includes(task.plane)],
  ["external durability", (task) => hasExternalDurability(task)],
  ["early external", hasNoEarlyExternal],
  ["duplicate discovery", hasNoDuplicateDiscovery],
  ["early final verifier", hasNoEarlyVerifier],
  ["verifier reset loop", hasNoVerifierReset]
];

function taskProblems(raw, body) {
  const task = taskFromAttributes(raw);
  return TASK_RULES
    .filter(([, isValid]) => !isValid(task, body))
    .map(([problem]) => problem);
}

function allTaskProblems(plan) {
  const matches = plan.matchAll(/<task\b(?<attributes>[^>]*)>(?<body>.*?)<\/task>/gisv).toArray();
  if (matches.length === 0) {return ["tasks"];}
  return matches.flatMap((match) => taskProblems(match.groups.attributes, match.groups.body));
}

function validatePlan(root, candidate) {
  const { absolute, relative } = relativePath(root, required({ plan: candidate ?? "" }, "plan"), "plan");
  const plan = existsSync(absolute) ? readFileSync(absolute, "utf8") : "";
  const problems = [
    ...executionContractProblems(root, plan),
    ...planLevelProblems(plan),
    ...allTaskProblems(plan)
  ];

  if (problems.length > 0) {stop("PLAN_LIVENESS_BLOCKED", [...new Set(problems)].join(", "));}
  console.log(`PLAN_LIVENESS_OK ${relative}`);
}

const { command, options } = parseArguments(process.argv.slice(2));
const root = repository(options.repo);
if (command === "fingerprint") {console.log(JSON.stringify(fingerprints(root)));}
else if (command === "validate-plan") {validatePlan(root, options.plan);}
else if (Reflect.get(EVENTS, command)) {writeEvent(command, options, root);}
else {stop("OBSERVABILITY_ARGUMENT_REJECTED", command);}
