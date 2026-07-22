#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import {
  appendFileSync,
  mkdirSync,
  readFileSync
} from "node:fs";
import path from "node:path";
import process from "node:process";

const EVENTS = new Map([
  ["start", "started"],
  ["complete", "completed"],
  ["interrupt", "interrupted"],
  ["block", "blocked"],
  ["warning", "warning"]
]);
const RETIRED_METADATA_KEYS = new Set([
  "cache_key",
  "fingerprint",
  "fingerprints",
  "gate_stage",
  "parent_step",
  "plane",
  "receipt_sha256",
  "resume_key",
  "retry_of",
  "rollout_id"
]);
const SECRET = /api(?:-|_)?key|authorization|cookie|credential|password|private(?:-|_)?key|secret|token/iv;
const OPTIONS = new Set(["agent", "budget", "repo", "run", "stage", "step"]);
const ALPHANUMERIC = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz");
const SAFE_ID_CHARACTERS = new Set("-.0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz");

function sortText(left, right) {
  if (left < right) {return -1;}
  if (left > right) {return 1;}

  return 0;
}

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

    const key = name.slice(2);
    if (!OPTIONS.has(key)) {stop("OBSERVABILITY_ARGUMENT_REJECTED", name);}
    options[key] = value;
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

function isOutsideRoot(relative) {
  if (relative === "..") {return true;}
  return relative.startsWith(`..${path.sep}`);
}

function assertRelativePath(candidate, relative, label) {
  if (path.isAbsolute(candidate)) {stop("OBSERVABILITY_PATH_REJECTED", label);}
  if (isOutsideRoot(relative)) {stop("OBSERVABILITY_PATH_REJECTED", label);}
}

function relativePath(root, candidate, label) {
  const absolute = path.resolve(root, candidate);
  const relative = path.relative(root, absolute);
  assertRelativePath(candidate, relative, label);

  return { absolute, relative: relative.replaceAll(path.sep, "/") };
}

function readPayload() {
  if (process.stdin.isTTY) {return {};}
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

function isRetiredMetadataKey(name) {
  const normalized = name.replaceAll("-", "_").toLowerCase();
  return RETIRED_METADATA_KEYS.has(normalized);
}

function redact(value, key = "") {
  if (SECRET.test(key)) {return "[REDACTED]";}
  if (Array.isArray(value)) {return value.map((item) => redact(item));}
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([name]) => !isRetiredMetadataKey(name))
        .map(([name, child]) => [name, redact(child, name)])
    );
  }

  return value;
}

function evidencePaths(root, value, label) {
  if (value === undefined) {return [];}
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    stop("OBSERVABILITY_PAYLOAD_REJECTED", `${label} must be paths`);
  }

  return [...new Set(value.map((item) => relativePath(root, item, label).relative))].toSorted(sortText);
}

function ledger(root, options) {
  const run = safeId(required(options, "run"), "run id");
  const agent = safeId(required(options, "agent"), "agent id");
  const directory = path.join(root, ".logs", "gsd-observability", run);
  return agent === "controller"
    ? path.join(directory, "controller.jsonl")
    : path.join(directory, "agents", `${agent}.jsonl`);
}

function eventToWire(event) {
  return Object.fromEntries([
    ["schema_version", event.schemaVersion],
    ["event_id", event.eventId],
    ["event", event.event],
    ["run_id", event.runId],
    ["step_id", event.stepId],
    ["stage", event.stage],
    ["timestamp", event.timestamp],
    ["budget_class", event.budgetClass],
    ["agent_session_id", event.agentSessionId],
    ["inputs", event.inputs],
    ["input_attribution", event.inputAttribution],
    ["outputs", event.outputs],
    ...(event.timing ? [["timing", event.timing]] : []),
    ...(event.metadata ? [["metadata", event.metadata]] : [])
  ]);
}

function writeEvent(command, options, root) {
  const target = ledger(root, options);
  const data = readPayload();
  const outputs = evidencePaths(root, data.outputs, "outputs");
  const inputs = evidencePaths(root, data.inputs, "inputs");
  const event = {
    schemaVersion: 1,
    eventId: randomUUID(),
    event: EVENTS.get(command),
    runId: required(options, "run"),
    stepId: safeId(required(options, "step"), "step id"),
    stage: required(options, "stage"),
    timestamp: new Date().toISOString(),
    budgetClass: required(options, "budget"),
    agentSessionId: required(options, "agent"),
    inputs,
    inputAttribution: "declared_only",
    outputs,
    timing: data.timing ? redact(data.timing) : undefined,
    metadata: data.metadata ? redact(data.metadata) : undefined
  };

  mkdirSync(path.dirname(target), { recursive: true });
  appendFileSync(target, `${JSON.stringify(eventToWire(event))}\n`, "utf8");
}

const { command, options } = parseArguments(process.argv.slice(2));
const root = repository(options.repo);
if (EVENTS.has(command)) {writeEvent(command, options, root);}
else {stop("OBSERVABILITY_ARGUMENT_REJECTED", command);}
