#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const OPTIONS = new Set(["repo", "run"]);
const TERMINAL = new Set(["completed", "interrupted", "blocked"]);
const SAFE_ID = /^[\dA-Za-z][\w\-.]*$/v;
const SORT_TEXT = (left, right) => left.localeCompare(right);
const METADATA_FIELDS = new Set(["agent_type", "model", "reasoning_effort"]);
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

function explicitRecord(event, field, allowed) {
  const value = event?.[field];
  if (value === undefined) {return {};}
  if (!value || Array.isArray(value) || typeof value !== "object") {
    stop("METRICS_DATA_ERROR", `${field} must be an object`);
  }

  const unknown = Object.keys(value).find((key) => !allowed.has(key));
  if (unknown) {stop("METRICS_DATA_ERROR", `${field}.${unknown}`);}
  return value;
}

function captureTiming(result, timing, field) {
  if (!Object.hasOwn(timing, field)) {return;}
  const value = timing[field];
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    stop("METRICS_DATA_ERROR", `timing.${field}`);
  }

  result[field] = value;
}

function hostTiming(events) {
  const result = {};
  for (const event of events) {
    const timing = explicitRecord(event, "timing", TIMING_FIELDS);
    for (const [field] of HOST_TIMING) {
      captureTiming(result, timing, field);
    }
  }

  return result;
}

function metadataFrom(event) {
  const metadata = explicitRecord(event, "metadata", METADATA_FIELDS);
  for (const value of Object.values(metadata)) {
    const hasControlCharacter = typeof value === "string"
      && [...value].some((character) => {
        const codePoint = character.codePointAt(0);
        return codePoint < 32 || codePoint === 127;
      });
    if (typeof value !== "string" || !value || value.trim() !== value || hasControlCharacter) {
      stop("METRICS_DATA_ERROR", "invalid metadata value");
    }
  }

  return metadata;
}

function declaredPaths(events, field) {
  const result = [];
  for (const event of events) {
    const values = event?.[field] ?? [];
    if (!Array.isArray(values)) {stop("METRICS_DATA_ERROR", field);}
    for (const value of values) {
      if (typeof value !== "string" || path.isAbsolute(value)) {
        stop("METRICS_DATA_ERROR", field);
      }

      const normalized = path.posix.normalize(value.replaceAll("\\", "/"));
      if (!normalized || normalized === "." || normalized === ".." || normalized.startsWith("../")) {
        stop("METRICS_DATA_ERROR", field);
      }

      result.push(normalized);
    }
  }

  return [...new Set(result)].toSorted(SORT_TEXT);
}

function eventKey(event) {
  if (typeof event?.step_id !== "string" || !Number.isFinite(Date.parse(event.timestamp))) {
    return null;
  }

  return `${event.agent_session_id ?? "controller"}\0${event.step_id}`;
}

function groupsFrom(events) {
  const groups = [];
  const open = new Map();
  let hasUnmatchedEvent = false;
  for (const event of events.toSorted((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp))) {
    const key = eventKey(event);
    if (key === null) {
      hasUnmatchedEvent = true;
      continue;
    }

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

function budgetStatus(budgetClass, observedWindow) {
  const budget = BUDGETS.get(budgetClass);
  if (budget === undefined) {stop("METRICS_DATA_ERROR", `unknown budget class ${budgetClass}`);}
  if (observedWindow > budget * 2) {return "severe_over_budget";}
  if (observedWindow > budget) {return "over_budget";}
  return "within_budget";
}

function stepFrom(group, generatedAt) {
  const startMs = Date.parse(group.start.timestamp);
  const endMs = Date.parse(group.end?.timestamp ?? generatedAt);
  const observedWindow = Math.max(0, endMs - startMs);
  const timing = hostTiming(group.events);
  const metadata = metadataFrom(group.start);
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
    inputs: declaredPaths(group.events, "inputs"),
    outputs: declaredPaths(group.events, "outputs"),
    notices: group.notices,
    measurementNotices,
    budgetStatus: budgetStatus(group.start.budget_class, observedWindow),
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

function firstChangeAfter(steps, runStart, prefix) {
  const step = steps.find((candidate) => candidate.outputs.some((output) => output.startsWith(prefix)));
  return step && Number.isFinite(runStart) ? step.endMs - runStart : null;
}

function timingSummary(events, steps) {
  const starts = events
    .filter((event) => event.event === "started")
    .map((event) => Date.parse(event.timestamp));
  const runStart = Math.min(...starts);
  const observedWindow = Number.isFinite(runStart)
    ? Math.max(runStart, ...steps.map((step) => step.endMs)) - runStart
    : null;
  return {
    observedWindow,
    firstTestChange: firstChangeAfter(steps, runStart, "tests/"),
    firstProductChange: firstChangeAfter(steps, runStart, "src/")
  };
}

function progressStatus(timings, isEventSequenceComplete) {
  if (!isEventSequenceComplete) {return "metrics_incomplete";}
  if (timings.firstProductChange === null && timings.observedWindow > 7_200_000) {
    return "severe_no_product_change";
  }

  if (timings.firstTestChange === null && timings.observedWindow > 3_600_000) {
    return "warning_no_test_change";
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
  const generatedAt = new Date().toISOString();
  const grouped = stepsFrom(ledger.events, generatedAt);
  const timings = timingSummary(ledger.events, grouped.steps);
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
    ["time_to_first_test_change_ms", timings.firstTestChange],
    ["time_to_first_product_change_ms", timings.firstProductChange],
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
