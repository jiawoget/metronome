#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import process from "node:process";

const SAFE_ID = /^[\dA-Za-z][\w\-.]*$/v;
const IDENTITY_CHARACTERS = new Set("-./:0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz");
const TERMINAL = new Set(["completed", "interrupted", "blocked"]);
const OPTIONS = new Set(["repo", "run"]);
const SORT_TEXT = (left, right) => left.localeCompare(right);
const BUDGETS = new Map([
  ["quick", 120_000],
  ["standard", 900_000],
  ["heavy", 2_700_000],
  ["external", 1_500_000]
]);
const MEASUREMENT_INCOMPLETE_REASONS = [
  ["tokens_unavailable", "token_attribution_unavailable"],
  ["external_wait_unavailable", "external_wait_unavailable"],
  ["tool_duration_unavailable", "tool_duration_unavailable"]
];

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
  const agents = path.join(runDirectory, "agents");
  if (existsSync(agents)) {
    files.push(...readdirSync(agents).filter((name) => name.endsWith(".jsonl")).map((name) => path.join(agents, name)));
  }

  const result = { events: [], incomplete: false };
  for (const file of files) {
    const ledger = readLedger(file);
    result.events.push(...ledger.events);
    result.incomplete ||= ledger.incomplete;
  }

  return result;
}

function wireValue(record, name) {
  return record?.[name];
}

function optionalNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function optionalIdentity(value) {
  return typeof value === "string" && value.length > 0
    && [...value].every((character) => IDENTITY_CHARACTERS.has(character))
    ? value
    : null;
}

function stepTiming(start, end) {
  const startMs = Date.parse(start.timestamp);
  const endTimestamp = end?.timestamp ?? new Date().toISOString();
  const endMs = Date.parse(endTimestamp);
  const wallDuration = Math.max(0, endMs - startMs);
  const suppliedExternalWait = optionalNumber(wireValue(end?.timing, "external_wait_ms"));
  const isExternalWaitBeyondWall = suppliedExternalWait !== null && suppliedExternalWait > wallDuration;
  const externalWait = isExternalWaitBeyondWall ? null : suppliedExternalWait;
  return { startMs, endMs, wallDuration, externalWait, isExternalWaitBeyondWall };
}

function externalWaitNotices(timing) {
  if (timing.isExternalWaitBeyondWall) {
    return ["external_wait_unavailable:exceeds_wall_duration"];
  }

  return timing.externalWait === null
    ? ["external_wait_unavailable:caller_did_not_supply_timing"]
    : [];
}

function stepFromGroup(group) {
  const { start } = group;
  const { end } = group;
  const timing = stepTiming(start, end);
  return {
    stepId: wireValue(start, "step_id"),
    stage: start.stage,
    step: start.step ?? wireValue(start, "step_id"),
    budgetClass: wireValue(start, "budget_class"),
    agentSessionId: wireValue(start, "agent_session_id"),
    agentType: optionalIdentity(wireValue(start.metadata, "agent_type")),
    agentModel: optionalIdentity(wireValue(start.metadata, "model")),
    reasoningEffort: optionalIdentity(wireValue(start.metadata, "reasoning_effort")),
    status: end?.event ?? "in_progress",
    startedAt: start.timestamp,
    endedAt: end?.timestamp ?? null,
    wallDuration: timing.wallDuration,
    externalWait: timing.externalWait,
    activeDuration: timing.externalWait === null
      ? null
      : Math.max(0, timing.wallDuration - timing.externalWait),
    toolDuration: optionalNumber(wireValue(end?.timing, "tool_ms")),
    attributionGranularity: "turn",
    inputs: start.inputs ?? [],
    outputs: end?.outputs ?? [],
    tokens: null,
    notices: group.notices,
    measurementNotices: [
      "tokens_unavailable:host_does_not_expose_step_usage",
      ...externalWaitNotices(timing),
      ...(optionalNumber(wireValue(end?.timing, "tool_ms")) === null
        ? ["tool_duration_unavailable:caller_did_not_supply_timing"]
        : [])
    ],
    startMs: timing.startMs,
    endMs: timing.endMs
  };
}

function eventGroupKey(event) {
  const stepId = wireValue(event, "step_id");
  if (!stepId || !Number.isFinite(Date.parse(event?.timestamp))) {return null;}

  const agentSessionId = wireValue(event, "agent_session_id");
  return `${agentSessionId ?? "controller"}\0${stepId}`;
}

function openStartedGroup(event, key, groups, open) {
  const prior = open.get(key);
  if (prior) {prior.notices.push("overlapping_start");}

  const group = { start: event, notices: [] };
  groups.push(group);
  open.set(key, group);
}

function appendGroupEvent(event, key, open) {
  const group = open.get(key);
  if (!group) {return false;}

  if (TERMINAL.has(event.event)) {
    group.end = event;
    open.delete(key);
  } else {
    group.notices.push(event.event);
  }

  return true;
}

function stepsFrom(events) {
  const groups = [];
  const open = new Map();
  let hasUnmatchedEvent = false;
  const orderedEvents = events.toSorted((first, second) =>
    Date.parse(first.timestamp) - Date.parse(second.timestamp)
  );
  for (const event of orderedEvents) {
    const key = eventGroupKey(event);
    if (key === null) {
      hasUnmatchedEvent = true;
      continue;
    }

    if (event.event === "started") {
      openStartedGroup(event, key, groups, open);
      continue;
    }

    if (!appendGroupEvent(event, key, open)) {hasUnmatchedEvent = true;}
  }

  const steps = groups
    .filter((group) => group.start)
    .map((group) => stepFromGroup(group))
    .toSorted((first, second) => first.startMs - second.startMs);
  return { steps, hasUnmatchedEvent };
}

function budgetStatus(step) {
  const budget = BUDGETS.get(step.budgetClass) ?? BUDGETS.get("standard");
  const ratio = step.wallDuration / budget;
  if (ratio > 2) {return "severe_over_budget";}
  if (ratio > 1) {return "over_budget";}

  return "within_budget";
}

function compact(step) {
  const processed = step.tokens?.processed ?? "n/a";
  const fresh = step.tokens?.fresh ?? "n/a";
  const identity = [
    step.agentType ? `agent=${step.agentType}` : null,
    step.agentModel ? `model=${step.agentModel}` : null,
    step.reasoningEffort ? `effort=${step.reasoningEffort}` : null
  ].filter(Boolean).join(" ");
  return `[${step.budgetStatus}] ${step.stage}/${step.step} wall=${(step.wallDuration / 1000).toFixed(1)}s processed=${processed} new=${fresh} in=${step.inputs.length} out=${step.outputs.length} status=${step.status}${identity ? ` ${identity}` : ""}`;
}

function wireStep(step) {
  return Object.fromEntries([
    ["step_id", step.stepId],
    ["stage", step.stage],
    ["step", step.step],
    ["budget_class", step.budgetClass],
    ["agent_session_id", step.agentSessionId],
    ["agent_type", step.agentType],
    ["agent_model", step.agentModel],
    ["reasoning_effort", step.reasoningEffort],
    ["status", step.status],
    ["started_at", step.startedAt],
    ["ended_at", step.endedAt],
    ["wall_duration_ms", step.wallDuration],
    ["external_wait_ms", step.externalWait],
    ["active_duration_ms", step.activeDuration],
    ["tool_duration_ms", step.toolDuration],
    ["attribution_granularity", step.attributionGranularity],
    ["inputs", step.inputs],
    ["outputs", step.outputs],
    ["tokens", null],
    ["notices", step.notices],
    ["measurement_notices", step.measurementNotices],
    ["budget_status", step.budgetStatus]
  ]);
}

function firstChangeAfter(steps, runStart, prefix) {
  const step = steps.find((candidate) => candidate.outputs.some((output) => output.startsWith(prefix)));
  return step && Number.isFinite(runStart)
    ? Date.parse(step.endedAt ?? step.startedAt) - runStart
    : null;
}

function progressStatus(firstTestChange, firstProductChange, elapsed, isEventSequenceComplete) {
  if (!isEventSequenceComplete) {return "metrics_incomplete";}
  if (firstProductChange === null && elapsed > 7_200_000) {return "severe_no_product_change";}
  if (firstTestChange === null && elapsed > 3_600_000) {return "warning_no_test_change";}
  return "on_track";
}

function wireSummary({ run, incompleteReasons, timings, steps, isEventSequenceComplete }) {
  return Object.fromEntries([
    ["schema_version", 1],
    ["run_id", run],
    ["generated_at", new Date().toISOString()],
    ["metrics_incomplete", incompleteReasons.length > 0],
    ["metrics_incomplete_reasons", incompleteReasons],
    ["run_wall_duration_ms", timings.elapsed],
    ["time_to_first_test_change_ms", timings.firstTestChange],
    ["time_to_first_product_change_ms", timings.firstProductChange],
    ["milestone_progress_status", progressStatus(
      timings.firstTestChange,
      timings.firstProductChange,
      timings.elapsed,
      isEventSequenceComplete
    )],
    ["steps", steps.map((step) => wireStep(step))]
  ]);
}

function timingSummary(events, steps) {
  const starts = events.filter((event) => event.event === "started").map((event) => Date.parse(event.timestamp));
  const runStart = Math.min(...starts);
  const firstTestChange = firstChangeAfter(steps, runStart, "tests/");
  const firstProductChange = firstChangeAfter(steps, runStart, "src/");
  const elapsed = Number.isFinite(runStart)
    ? Math.max(runStart, ...steps.map((step) => step.endMs)) - runStart
    : null;
  return { firstTestChange, firstProductChange, elapsed };
}

function withBudgetStatuses(steps) {
  return steps.map((step) => ({ ...step, budgetStatus: budgetStatus(step) }));
}

function measurementIncompleteReason(notice) {
  return MEASUREMENT_INCOMPLETE_REASONS
    .find(([prefix]) => notice.startsWith(prefix))?.[1];
}

function incompleteReasonsFrom(ledger, steps, hasUnmatchedEvent) {
  const structuralReasons = [
    [ledger.incomplete, "ledger_incomplete"],
    [hasUnmatchedEvent, "event_sequence_incomplete"],
    [steps.length === 0, "no_usable_steps"],
    [steps.some((step) => step.status === "in_progress"), "step_in_progress"]
  ]
    .filter(([isPresent]) => isPresent)
    .map(([, reason]) => reason);
  const measurementReasons = steps
    .flatMap((step) => step.measurementNotices)
    .map((notice) => measurementIncompleteReason(notice))
    .filter(Boolean);
  return new Set([...structuralReasons, ...measurementReasons]);
}

function isCompleteEventSequence(ledger, steps, hasUnmatchedEvent) {
  return !ledger.incomplete && !hasUnmatchedEvent && steps.length > 0;
}

function summarize(options, runDirectory) {
  const ledger = ledgerEvents(runDirectory);
  const grouped = stepsFrom(ledger.events);
  const steps = withBudgetStatuses(grouped.steps);
  const incompleteReasons = incompleteReasonsFrom(ledger, steps, grouped.hasUnmatchedEvent);
  const isEventSequenceComplete = isCompleteEventSequence(ledger, steps, grouped.hasUnmatchedEvent);

  const summary = wireSummary({
    run: options.run,
    incompleteReasons: [...incompleteReasons].toSorted(SORT_TEXT),
    timings: timingSummary(ledger.events, steps),
    steps,
    isEventSequenceComplete
  });

  mkdirSync(runDirectory, { recursive: true });
  writeFileSync(path.join(runDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(steps.length > 0 ? steps.map((step) => compact(step)).join("\n") : `[METRICS_INCOMPLETE] ${options.run} steps=0`);
}

function main() {
  const options = argumentsFrom(process.argv.slice(2));
  if (!options.repo || !SAFE_ID.test(options.run ?? "")) {
    stop("METRICS_ARGUMENT_ERROR", "--repo and a safe --run are required");
  }

  const runDirectory = path.join(path.resolve(options.repo), ".logs", "gsd-observability", options.run);
  summarize(options, runDirectory);
}

main();
