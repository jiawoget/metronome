#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const OPTIONS = new Set(["repo", "run"]);
const EVENTS = new Set(["started", "completed", "interrupted", "blocked", "warning"]);
const TERMINAL = new Set(["completed", "interrupted", "blocked"]);
const SAFE_ID = /^[\dA-Za-z][\w\-.]*$/v;
const WINDOWS_DEVICE = /^(?:aux|con|nul|prn|com[1-9]|lpt[1-9])(?:\.|$)/iv;
const SORT_TEXT = (left, right) => left.localeCompare(right);
const METADATA_FIELDS = new Set(["agent_type", "model", "reasoning_effort"]);
const EVENT_FIELDS = new Set(["schema_version", "event_id", "event", "run_id", "step_id", "stage", "timestamp", "budget_class", "agent_session_id", "inputs", "input_attribution", "outputs", "timing", "metadata"]);
const HOST_TIMING = [
  ["active_ms", "active_time_unavailable"],
  ["tool_ms", "tool_duration_unavailable"],
  ["queue_ms", "queue_time_unavailable"],
  ["external_wait_ms", "external_wait_unavailable"]
];
const TIMING_FIELDS = new Set(HOST_TIMING.map(([field]) => field));
const BUDGETS = new Map([
  ["quick", 120_000],
  ["standard", 900_000],
  ["heavy", 2_700_000],
  ["external", 1_500_000]
]);

function stop(code, detail) {
  console.error(`${code}: ${detail}`);
  process.exit(1);
}

function argumentsFrom(values) {
  const options = {};
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      stop("METRICS_ARGUMENT_ERROR", name);
    }

    const key = name.slice(2);
    if (!OPTIONS.has(key)) {stop("METRICS_ARGUMENT_ERROR", name);}
    options[key] = value;
  }

  return options;
}

function repository(candidate) {
  try {
    return path.resolve(execFileSync("git", ["rev-parse", "--show-toplevel"], {
      cwd: path.resolve(candidate),
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim());
  } catch {
    return stop("METRICS_REPOSITORY_ERROR", candidate);
  }
}

function readLedger(file) {
  if (!existsSync(file)) {return { events: [], incomplete: true };}
  const events = [];
  let isIncomplete = false;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/v)) {
    if (!line) {continue;}
    try { events.push(JSON.parse(line)); } catch { isIncomplete = true; }
  }

  return { events, incomplete: isIncomplete };
}

function ledgerEvents(runDirectory) {
  const files = [path.join(runDirectory, "controller.jsonl")];
  const agentDirectory = path.join(runDirectory, "agents");
  if (existsSync(agentDirectory)) {
    files.push(...readdirSync(agentDirectory)
      .filter((name) => name.endsWith(".jsonl"))
      .toSorted(SORT_TEXT)
      .map((name) => path.join(agentDirectory, name)));
  }

  const result = { events: [], incomplete: false };
  for (const file of files) {
    const ledger = readLedger(file);
    result.events.push(...ledger.events);
    result.incomplete ||= ledger.incomplete;
  }

  return result;
}

function hasControl(value) {
  return [...value].some((character) => character.codePointAt(0) < 32 || character.codePointAt(0) === 127);
}

function isSafeText(value) {
  return typeof value === "string" && Boolean(value) && value.trim() === value && !hasControl(value);
}

function explicitRecord(event, field, allowed, validate) {
  const value = event?.[field];
  if (value === undefined) {return {};}
  if (!value || Array.isArray(value) || typeof value !== "object") {
    stop("METRICS_DATA_ERROR", `${field} must be an object`);
  }

  const invalid = Object.entries(value)
    .find(([key, item]) => !allowed.has(key) || !validate(item));
  if (invalid) {stop("METRICS_DATA_ERROR", `${field}.${invalid[0]}`);}
  return value;
}

function normalizedPath(value, field) {
  const normalized = value.replaceAll("\\", "/");
  const parts = normalized.split("/");
  if (value.trim() !== value || hasControl(value) || /^[A-Za-z]:/v.test(normalized)
    || parts.some((part) => !part || part === "." || part === ".." || part.includes(":")
      || /[ .]$/v.test(part) || WINDOWS_DEVICE.test(part))) {
    stop("METRICS_DATA_ERROR", field);
  }

  return normalized;
}

function eventPaths(event, field) {
  const values = event?.[field];
  if (!Array.isArray(values) || values.some((value) => typeof value !== "string")) {
    stop("METRICS_DATA_ERROR", field);
  }

  return values.map((value) => normalizedPath(value, field));
}

function validateEvent(value, run) {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    stop("METRICS_DATA_ERROR", "event must be an object");
  }

  const unknown = Object.keys(value).find((field) => !EVENT_FIELDS.has(field));
  const timestamp = typeof value.timestamp === "string" ? Date.parse(value.timestamp) : NaN;
  const hasMismatch = [
    ["schema_version", 1], ["run_id", run], ["input_attribution", "declared_only"]
  ].some(([field, expected]) => value[field] !== expected);
  const isSafeId = (candidate) => typeof candidate === "string" && SAFE_ID.test(candidate);
  const identifiers = [value.step_id, value.agent_session_id, value.event_id]
    .filter((candidate) => candidate !== undefined);
  const isSafeTimestamp = Number.isFinite(timestamp)
    && new Date(timestamp).toISOString() === value.timestamp;
  if (unknown || hasMismatch || !EVENTS.has(value.event) || !BUDGETS.has(value.budget_class)
    || identifiers.some((candidate) => !isSafeId(candidate)) || !isSafeText(value.stage)
    || !isSafeTimestamp) {
    stop("METRICS_DATA_ERROR", unknown ?? "invalid event envelope");
  }

  explicitRecord(value, "metadata", METADATA_FIELDS, isSafeText);
  explicitRecord(value, "timing", TIMING_FIELDS,
    (item) => typeof item === "number" && Number.isFinite(item) && item >= 0);
  return {
    ...value,
    inputs: eventPaths(value, "inputs"),
    outputs: eventPaths(value, "outputs")
  };
}

function metadataFrom(events) {
  const result = {};
  for (const event of events) {
    for (const [field, value] of Object.entries(event.metadata ?? {})) {
      if (Object.hasOwn(result, field) && result[field] !== value) {
        stop("METRICS_DATA_ERROR", `conflicting metadata.${field}`);
      }

      result[field] = value;
    }
  }

  return result;
}

function groupsFrom(events) {
  const groups = [];
  const open = new Map();
  let hasUnmatchedEvent = false;
  for (const event of events.toSorted((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))) {
    const key = `${event.agent_session_id}\0${event.step_id}`;
    if (event.event === "started") {
      const prior = open.get(key);
      if (prior) {prior.notices.push("overlapping_start");}
      const group = { start: event, events: [event], notices: [] };
      groups.push(group);
      open.set(key, group);
      continue;
    }

    const group = open.get(key);
    if (!group) {
      hasUnmatchedEvent = true;
      continue;
    }

    group.events.push(event);
    if (TERMINAL.has(event.event)) {
      group.end = event;
      open.delete(key);
    } else {
      group.notices.push(event.event);
    }
  }

  return { groups, hasUnmatchedEvent };
}

function budgetStatus(events, observedWindow) {
  const budgetClass = events[0].budget_class;
  const budget = BUDGETS.get(budgetClass);
  for (const event of events) {
    if (event.budget_class !== budgetClass) {
      stop("METRICS_DATA_ERROR", `budget class differs from attempt start ${event.budget_class}`);
    }
  }

  if (observedWindow > budget * 2) {return "severe_over_budget";}
  if (observedWindow > budget) {return "over_budget";}
  return "within_budget";
}

function stepFrom(group, generatedAt) {
  const startMs = Date.parse(group.start.timestamp);
  const endMs = Date.parse(group.end?.timestamp ?? generatedAt);
  const observedWindow = Math.max(0, endMs - startMs);
  const timing = Object.assign({}, ...group.events.map((event) => event.timing ?? {}));
  const metadata = metadataFrom(group.events);
  const paths = (field) => [...new Set(group.events.flatMap((event) => event[field]))]
    .toSorted(SORT_TEXT);
  const firstOutputAt = (prefix) => {
    const declarations = group.events
      .filter((event) => event.outputs.some((output) => output.startsWith(prefix)))
      .map((event) => Date.parse(event.timestamp));
    return declarations.length > 0 ? Math.min(...declarations) : null;
  };

  const measurementNotices = [
    "tokens_unavailable:host_does_not_expose_step_usage",
    ...HOST_TIMING
      .filter(([field]) => !Object.hasOwn(timing, field))
      .map(([, reason]) => `${reason}:caller_did_not_supply_timing`)
  ];
  return {
    stepId: group.start.step_id,
    stage: group.start.stage,
    budgetClass: group.start.budget_class,
    agentSessionId: group.start.agent_session_id,
    agentType: metadata.agent_type ?? null,
    model: metadata.model ?? null,
    reasoningEffort: metadata.reasoning_effort ?? null,
    status: group.end?.event ?? "in_progress",
    startedAt: group.start.timestamp,
    endedAt: group.end?.timestamp ?? null,
    observedWindow,
    hostActive: timing.active_ms ?? null,
    hostTool: timing.tool_ms ?? null,
    hostQueue: timing.queue_ms ?? null,
    hostExternalWait: timing.external_wait_ms ?? null,
    inputs: paths("inputs"),
    outputs: paths("outputs"),
    notices: group.notices,
    measurementNotices,
    budgetStatus: budgetStatus(group.events, observedWindow),
    firstDeclaredTestOutputAt: firstOutputAt("tests/"),
    firstDeclaredProductOutputAt: firstOutputAt("src/"),
    startMs,
    endMs
  };
}

function stepsFrom(events, generatedAt) {
  const grouped = groupsFrom(events);
  const steps = grouped.groups
    .map((group) => stepFrom(group, generatedAt))
    .toSorted((left, right) => left.startMs - right.startMs);
  return { steps, hasUnmatchedEvent: grouped.hasUnmatchedEvent };
}

function wireStep(step) {
  return Object.fromEntries([
    ["step_id", step.stepId],
    ["stage", step.stage],
    ["step", step.stepId],
    ["budget_class", step.budgetClass],
    ["agent_session_id", step.agentSessionId],
    ["agent_type", step.agentType],
    ["model", step.model],
    ["reasoning_effort", step.reasoningEffort],
    ["status", step.status],
    ["started_at", step.startedAt],
    ["ended_at", step.endedAt],
    ["observed_window_ms", step.observedWindow],
    ["host_active_ms", step.hostActive],
    ["host_tool_ms", step.hostTool],
    ["host_queue_ms", step.hostQueue],
    ["host_external_wait_ms", step.hostExternalWait],
    ["input_attribution", "declared_only"],
    ["inputs", step.inputs],
    ["outputs", step.outputs],
    ["tokens", null],
    ["notices", step.notices],
    ["measurement_notices", step.measurementNotices],
    ["budget_status", step.budgetStatus]
  ]);
}

function compact(step) {
  const identity = [
    step.agentType ? `agent=${step.agentType}` : null,
    step.model ? `model=${step.model}` : null,
    step.reasoningEffort ? `effort=${step.reasoningEffort}` : null
  ].filter(Boolean).join(" ");
  return `[${step.budgetStatus}] ${step.stage}/${step.stepId} observed=${(step.observedWindow / 1000).toFixed(1)}s tokens=unavailable in=${step.inputs.length} out=${step.outputs.length} status=${step.status}${identity ? ` ${identity}` : ""}`;
}

function timingSummary(steps) {
  const runStart = Math.min(...steps.map((step) => step.startMs));
  const observedWindow = Number.isFinite(runStart)
    ? Math.max(runStart, ...steps.map((step) => step.endMs)) - runStart
    : null;
  const firstOutputAfter = (field) => {
    const declarations = steps.map((step) => step[field])
      .filter((value) => Number.isFinite(value));
    return declarations.length > 0 && Number.isFinite(runStart)
      ? Math.min(...declarations) - runStart
      : null;
  };

  return {
    observedWindow,
    firstDeclaredTestOutput: firstOutputAfter("firstDeclaredTestOutputAt"),
    firstDeclaredProductOutput: firstOutputAfter("firstDeclaredProductOutputAt")
  };
}

function progressStatus(timings, isEventSequenceComplete) {
  if (!isEventSequenceComplete) {return "metrics_incomplete";}
  if (timings.firstDeclaredProductOutput === null && timings.observedWindow > 7_200_000) {
    return "severe_no_declared_product_output";
  }

  if (timings.firstDeclaredTestOutput === null && timings.observedWindow > 3_600_000) {
    return "warning_no_declared_test_output";
  }

  return "on_track";
}

function incompleteReasons(ledger, steps, hasUnmatchedEvent) {
  const reasons = new Set([
    ...(ledger.incomplete ? ["ledger_incomplete"] : []),
    ...(hasUnmatchedEvent ? ["event_sequence_incomplete"] : []),
    ...(steps.length === 0 ? ["no_usable_steps"] : []),
    ...(steps.some((step) => step.status === "in_progress") ? ["step_in_progress"] : [])
  ]);
  for (const notice of steps.flatMap((step) => step.measurementNotices)) {
    if (notice.startsWith("tokens_unavailable")) {reasons.add("token_attribution_unavailable");}
    const timing = HOST_TIMING.find(([, reason]) => notice.startsWith(reason));
    if (timing) {reasons.add(timing[1]);}
  }

  return [...reasons].toSorted((left, right) => left.localeCompare(right));
}

function summarize(options, runDirectory) {
  const ledger = ledgerEvents(runDirectory);
  const events = ledger.events.map((event) => validateEvent(event, options.run));
  const generatedAt = new Date().toISOString();
  const grouped = stepsFrom(events, generatedAt);
  const timings = timingSummary(grouped.steps);
  const reasons = incompleteReasons(ledger, grouped.steps, grouped.hasUnmatchedEvent);
  const isEventSequenceComplete = !ledger.incomplete
    && !grouped.hasUnmatchedEvent
    && grouped.steps.length > 0;
  const summary = Object.fromEntries([
    ["schema_version", 1],
    ["run_id", options.run],
    ["generated_at", generatedAt],
    ["metrics_incomplete", reasons.length > 0],
    ["metrics_incomplete_reasons", reasons],
    ["run_observed_window_ms", timings.observedWindow],
    ["time_to_first_declared_test_output_ms", timings.firstDeclaredTestOutput],
    ["time_to_first_declared_product_output_ms", timings.firstDeclaredProductOutput],
    ["milestone_progress_status", progressStatus(timings, isEventSequenceComplete)],
    ["steps", grouped.steps.map((step) => wireStep(step))]
  ]);
  mkdirSync(runDirectory, { recursive: true });
  writeFileSync(path.join(runDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(grouped.steps.length > 0
    ? grouped.steps.map((step) => compact(step)).join("\n")
    : `[METRICS_INCOMPLETE] ${options.run} steps=0`);
}

const options = argumentsFrom(process.argv.slice(2));
if (!options.repo || !SAFE_ID.test(options.run ?? "")) {
  stop("METRICS_ARGUMENT_ERROR", "--repo and a safe --run are required");
}

const root = repository(options.repo);
summarize(options, path.join(root, ".logs", "gsd-observability", options.run));
