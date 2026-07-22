#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const EVENTS = new Map([
  ["start", "started"],
  ["complete", "completed"],
  ["interrupt", "interrupted"],
  ["block", "blocked"],
  ["warning", "warning"]
]);
const OPTIONS = new Set(["agent", "budget", "repo", "run", "stage", "step"]);
const BUDGETS = new Set(["quick", "standard", "heavy", "external"]);
const PAYLOAD_FIELDS = new Set(["inputs", "metadata", "outputs", "timing"]);
const METADATA_FIELDS = new Set(["agent_type", "model", "reasoning_effort"]);
const TIMING_FIELDS = new Set(["active_ms", "tool_ms", "queue_ms", "external_wait_ms"]);
const SAFE_ID = /^[\dA-Za-z][\w\-.]*$/v;
const SORT_TEXT = (left, right) => left.localeCompare(right);

function stop(code, detail = "") {
  console.error(`${code}${detail ? `: ${detail}` : ""}`);
  process.exit(1);
}

function argumentsFrom(values) {
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

function required(options, name) {
  return options[name] || stop("OBSERVABILITY_ARGUMENT_REJECTED", `--${name} is required`);
}

function safeId(value, label) {
  return SAFE_ID.test(value) && value !== "." && value !== ".."
    ? value
    : stop("OBSERVABILITY_PATH_REJECTED", label);
}

function repository(candidate) {
  try {
    return path.resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: path.resolve(candidate),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim());
  } catch {
    return stop("OBSERVABILITY_REPOSITORY_REJECTED", candidate);
  }
}

function readPayload() {
  if (process.stdin.isTTY) {return {};}
  const input = readFileSync(0, "utf8").trim();
  if (!input) {return {};}
  try {
    const value = JSON.parse(input);
    if (value && !Array.isArray(value) && typeof value === "object") {return value;}
  } catch {}

  return stop("OBSERVABILITY_PAYLOAD_REJECTED", "expected a JSON object");
}

function validateKeys(value, allowed, label) {
  const unknown = Object.keys(value).find((name) => !allowed.has(name));
  if (unknown) {stop("OBSERVABILITY_PAYLOAD_REJECTED", `${label}.${unknown}`);}
}

function optionalFields(payload, name, allowed, validate) {
  const value = payload[name];
  if (value === undefined) {return undefined;}
  if (!value || Array.isArray(value) || typeof value !== "object") {
    stop("OBSERVABILITY_PAYLOAD_REJECTED", `${name} must be an object`);
  }

  validateKeys(value, allowed, name);
  const entries = [...allowed]
    .filter((key) => Object.hasOwn(value, key))
    .map((key) => [key, validate(value[key], `${name}.${key}`)]);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

function textValue(value, label) {
  const hasControlCharacter = typeof value === "string"
    && [...value].some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint < 32 || codePoint === 127;
    });
  if (typeof value !== "string" || !value || value.trim() !== value || hasControlCharacter) {
    stop("OBSERVABILITY_PAYLOAD_REJECTED", `${label} must be text`);
  }

  return value;
}

function timingValue(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    stop("OBSERVABILITY_PAYLOAD_REJECTED", `${label} must be finite and non-negative`);
  }

  return value;
}

function relativePaths(root, value, label) {
  if (value === undefined) {return [];}
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    stop("OBSERVABILITY_PAYLOAD_REJECTED", `${label} must be paths`);
  }

  const normalized = value.map((candidate) => {
    const absolute = path.resolve(root, candidate);
    const relative = path.relative(root, absolute);
    if (path.isAbsolute(candidate) || !relative || relative === ".." || relative.startsWith(`..${path.sep}`)) {
      stop("OBSERVABILITY_PATH_REJECTED", label);
    }

    return relative.replaceAll(path.sep, "/");
  });
  return [...new Set(normalized)].toSorted(SORT_TEXT);
}

function writeEvent(command, options, root) {
  const run = safeId(required(options, "run"), "run id");
  const agent = safeId(required(options, "agent"), "agent id");
  const budget = required(options, "budget");
  if (!BUDGETS.has(budget)) {stop("OBSERVABILITY_ARGUMENT_REJECTED", "--budget");}

  const payload = readPayload();
  validateKeys(payload, PAYLOAD_FIELDS, "payload");
  const timing = optionalFields(payload, "timing", TIMING_FIELDS, timingValue);
  const metadata = optionalFields(payload, "metadata", METADATA_FIELDS, textValue);
  const event = Object.fromEntries([
    ["schema_version", 1],
    ["event_id", randomUUID()],
    ["event", EVENTS.get(command)],
    ["run_id", run],
    ["step_id", safeId(required(options, "step"), "step id")],
    ["stage", textValue(required(options, "stage"), "stage")],
    ["timestamp", new Date().toISOString()],
    ["budget_class", budget],
    ["agent_session_id", agent],
    ["inputs", relativePaths(root, payload.inputs, "inputs")],
    ["input_attribution", "declared_only"],
    ["outputs", relativePaths(root, payload.outputs, "outputs")],
    ...(timing ? [["timing", timing]] : []),
    ...(metadata ? [["metadata", metadata]] : [])
  ]);
  const directory = path.join(root, ".logs", "gsd-observability", run);
  const target = agent === "controller"
    ? path.join(directory, "controller.jsonl")
    : path.join(directory, "agents", `${agent}.jsonl`);
  mkdirSync(path.dirname(target), { recursive: true });
  appendFileSync(target, `${JSON.stringify(event)}\n`, "utf8");
}

const { command, options } = argumentsFrom(process.argv.slice(2));
if (!EVENTS.has(command)) {stop("OBSERVABILITY_ARGUMENT_REJECTED", command);}
writeEvent(command, options, repository(options.repo ?? "."));
