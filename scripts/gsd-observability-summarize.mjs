#!/usr/bin/env node
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync
} from "node:fs";
import path from "node:path";
import process from "node:process";
import readline from "node:readline";

const SAFE_ID = /^[\dA-Za-z][\w\-.]*$/v;
const TERMINAL = new Set(["completed", "interrupted", "blocked"]);
const BUDGETS = {
  quick: { wall: 120_000, processed: 300_000, fresh: 50_000 },
  standard: { wall: 900_000, processed: 1_500_000, fresh: 200_000 },
  heavy: { wall: 2_700_000, processed: 4_000_000, fresh: 500_000 },
  external: { active: 300_000, wait: 1_200_000, processed: 500_000, fresh: 75_000 }
};

function stop(code, detail) {
  console.error(`${code}: ${detail}`);
  process.exit(1);
}

function argumentsFrom(values) {
  const options = { rollouts: new Map() };
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    if (!name?.startsWith("--") || value === undefined) {
      stop("METRICS_ARGUMENT_ERROR", name);
    }

    if (name === "--rollout") {
      const split = value.indexOf("=");
      if (split < 1 || split === value.length - 1) {
        stop("METRICS_ARGUMENT_ERROR", "--rollout must be ID=PATH");
      }

      options.rollouts.set(value.slice(0, split), path.resolve(value.slice(split + 1)));
    } else {
      options[name.slice(2)] = value;
    }
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

function stepTiming(start, end) {
  const startMs = Date.parse(start.timestamp);
  const endTimestamp = end?.timestamp ?? start.timestamp;
  const endMs = Date.parse(endTimestamp);
  const wallDuration = Math.max(0, endMs - startMs);
  const externalWait = Number(wireValue(end?.timing, "external_wait_ms") ?? 0);
  return { startMs, endMs, wallDuration, externalWait };
}

function stepFromGroup(group) {
  const {start} = group;
  const {end} = group;
  const timing = stepTiming(start, end);
  return {
    stepId: wireValue(start, "step_id"),
    stage: start.stage,
    step: start.step,
    gateStage: wireValue(start, "gate_stage"),
    plane: start.plane,
    budgetClass: wireValue(start, "budget_class"),
    agentSessionId: wireValue(start, "agent_session_id"),
    rolloutId: wireValue(start, "rollout_id"),
    status: end?.event ?? "in_progress",
    startedAt: start.timestamp,
    endedAt: end?.timestamp ?? null,
    wallDuration: timing.wallDuration,
    externalWait: timing.externalWait,
    activeDuration: Math.max(0, timing.wallDuration - timing.externalWait),
    toolDuration: Number(wireValue(end?.timing, "tool_ms") ?? 0),
    attributionGranularity: "turn",
    inputs: start.inputs ?? [],
    outputs: end?.outputs ?? [],
    cacheKey: wireValue(start, "cache_key"),
    resumeKey: wireValue(start, "resume_key"),
    retryOf: wireValue(start, "retry_of") ?? null,
    tokens: {
      input: 0,
      cachedInput: 0,
      output: 0,
      reasoningOutput: 0,
      processed: 0,
      fresh: 0
    },
    notices: group.notices,
    startMs: timing.startMs,
    endMs: timing.endMs
  };
}

function stepsFrom(events) {
  const groups = new Map();
  for (const event of events) {
    const stepId = wireValue(event, "step_id");
    const agentSessionId = wireValue(event, "agent_session_id");
    if (!stepId || !event?.timestamp) {continue;}
    const key = `${agentSessionId ?? "controller"}\0${stepId}`;
    const group = groups.get(key) ?? { notices: [] };
    if (event.event === "started" && !group.start) {group.start = event;}
    else if (TERMINAL.has(event.event)) {group.end = event;}
    else {group.notices.push(event.event);}

    groups.set(key, group);
  }

  return groups.values()
    .filter((group) => group.start)
    .map((group) => stepFromGroup(group))
    .toArray()
    .toSorted((first, second) => first.startMs - second.startMs);
}

function usageFrom(record) {
  const usage = record?.type === "event_msg" && record.payload?.type === "token_count"
    ? wireValue(record.payload.info, "last_token_usage")
    : undefined;
  if (!usage) {return undefined;}
  const input = Number(wireValue(usage, "input_tokens") ?? 0);
  const cached = Number(wireValue(usage, "cached_input_tokens") ?? 0);
  const output = Number(wireValue(usage, "output_tokens") ?? 0);
  const reasoning = Number(wireValue(usage, "reasoning_output_tokens") ?? 0);
  if ([input, cached, output, reasoning].some((value) => !Number.isFinite(value))) {return undefined;}
  return {
    input,
    cachedInput: cached,
    output,
    reasoningOutput: reasoning,
    processed: input + output + reasoning,
    fresh: Math.max(0, input - cached) + output + reasoning
  };
}

function addUsage(steps, timestamp, usage) {
  for (const step of steps) {
    if (timestamp < step.startMs || timestamp > step.endMs) {continue;}
    step.tokens.input += usage.input;
    step.tokens.cachedInput += usage.cachedInput;
    step.tokens.output += usage.output;
    step.tokens.reasoningOutput += usage.reasoningOutput;
    step.tokens.processed += usage.processed;
    step.tokens.fresh += usage.fresh;
  }
}

async function addRolloutTokens(file, steps) {
  if (!existsSync(file)) {return true;}
  let isIncomplete = false;
  const lines = readline.createInterface({ input: createReadStream(file, "utf8"), crlfDelay: Infinity });
  for await (const line of lines) {
    if (!line.trim()) {continue;}
    let record;
    try { record = JSON.parse(line); } catch { isIncomplete = true; continue; }
    const usage = usageFrom(record);
    const timestamp = Date.parse(record.timestamp);
    if (!usage || !Number.isFinite(timestamp)) {continue;}
    addUsage(steps, timestamp, usage);
  }

  return isIncomplete;
}

function budgetStatus(step) {
  const budget = BUDGETS[step.budgetClass] ?? BUDGETS.standard;
  const ratios = [
    step.tokens.processed / budget.processed,
    step.tokens.fresh / budget.fresh
  ];
  if (budget.wall) {ratios.push(step.wallDuration / budget.wall);}
  else {ratios.push(step.activeDuration / budget.active, step.externalWait / budget.wait);}

  const ratio = Math.max(...ratios.filter((value) => Number.isFinite(value)));
  return ratio > 2 ? "severe_over_budget" : ratio > 1 ? "over_budget" : "within_budget";
}

function compact(step) {
  return `[${step.budgetStatus}] ${step.stage}/${step.step} wall=${(step.wallDuration / 1000).toFixed(1)}s processed=${step.tokens.processed} new=${step.tokens.fresh} in=${step.inputs.length} out=${step.outputs.length} status=${step.status}`;
}

function wireTokens(tokens) {
  return Object.fromEntries([
    ["input_tokens", tokens.input],
    ["cached_input_tokens", tokens.cachedInput],
    ["output_tokens", tokens.output],
    ["reasoning_output_tokens", tokens.reasoningOutput],
    ["processed_tokens", tokens.processed],
    ["new_tokens", tokens.fresh]
  ]);
}

function wireStep(step) {
  return Object.fromEntries([
    ["step_id", step.stepId],
    ["stage", step.stage],
    ["step", step.step],
    ["gate_stage", step.gateStage],
    ["plane", step.plane],
    ["budget_class", step.budgetClass],
    ["agent_session_id", step.agentSessionId],
    ["rollout_id", step.rolloutId],
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
    ["cache_key", step.cacheKey],
    ["resume_key", step.resumeKey],
    ["retry_of", step.retryOf],
    ["tokens", wireTokens(step.tokens)],
    ["notices", step.notices],
    ["budget_status", step.budgetStatus]
  ]);
}

async function readRolloutUsage(options, steps) {
  const checks = options.rollouts.entries().map(async ([rolloutId, file]) =>
    addRolloutTokens(file, steps.filter((step) => step.rolloutId === rolloutId))
  ).toArray();
  const results = await Promise.all(checks);
  return results.some(Boolean);
}

function firstChangeAfter(steps, runStart, prefix) {
  const step = steps.find((candidate) => candidate.outputs.some((output) => output.startsWith(prefix)));
  return step && Number.isFinite(runStart)
    ? Date.parse(step.endedAt ?? step.startedAt) - runStart
    : null;
}

function progressStatus(firstTestChange, firstProductChange, elapsed) {
  if (firstProductChange === null && elapsed > 7_200_000) {return "severe_no_product_change";}
  if (firstTestChange === null && elapsed > 3_600_000) {return "warning_no_test_change";}
  return "on_track";
}

function wireSummary(run, incomplete, timings, steps) {
  return Object.fromEntries([
    ["schema_version", 1],
    ["run_id", run],
    ["generated_at", new Date().toISOString()],
    ["metrics_incomplete", incomplete],
    ["time_to_first_test_change_ms", timings.firstTestChange],
    ["time_to_first_product_change_ms", timings.firstProductChange],
    ["milestone_progress_status", progressStatus(timings.firstTestChange, timings.firstProductChange, timings.elapsed)],
    ["steps", steps.map((step) => wireStep(step))]
  ]);
}

function timingSummary(events, steps) {
  const starts = events.filter((event) => event.event === "started").map((event) => Date.parse(event.timestamp));
  const runStart = Math.min(...starts);
  const firstTestChange = firstChangeAfter(steps, runStart, "tests/");
  const firstProductChange = firstChangeAfter(steps, runStart, "src/");
  const elapsed = Number.isFinite(runStart)
    ? Math.max(runStart, ...steps.map((step) => Date.parse(step.endedAt ?? step.startedAt))) - runStart
    : 0;
  return { firstTestChange, firstProductChange, elapsed };
}

async function summarize(options, runDirectory) {
  const ledger = ledgerEvents(runDirectory);
  const steps = stepsFrom(ledger.events);
  const rolloutIncomplete = await readRolloutUsage(options, steps);
  const missingRollout = steps.some((step) => step.rolloutId && !options.rollouts.has(step.rolloutId));
  const inProgress = steps.some((step) => step.status === "in_progress");
  for (const step of steps) {
    step.budgetStatus = budgetStatus(step);
  }

  const incomplete = ledger.incomplete || inProgress || rolloutIncomplete || missingRollout;
  const summary = wireSummary(options.run, incomplete, timingSummary(ledger.events, steps), steps);
  mkdirSync(runDirectory, { recursive: true });
  writeFileSync(path.join(runDirectory, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(steps.length > 0 ? steps.map((step) => compact(step)).join("\n") : `[METRICS_INCOMPLETE] ${options.run} steps=0`);
}

async function main() {
  const options = argumentsFrom(process.argv.slice(2));
  if (!options.repo || !SAFE_ID.test(options.run ?? "")) {
    stop("METRICS_ARGUMENT_ERROR", "--repo and a safe --run are required");
  }

  const runDirectory = path.join(path.resolve(options.repo), ".logs", "gsd-observability", options.run);
  await summarize(options, runDirectory);
}

await main();
