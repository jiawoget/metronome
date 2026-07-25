import { appendFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const BASE_REF = "main";
const FULL_SHA = /^[\da-f]{40}$/v;
const POSITIVE_DECIMAL = /^[1-9]\d*$/v;
const CONTEXT_LABELS = new Map([
  ["Metronome CI test-merge", "CI"],
  ["Metronome XO test-merge", "XO"],
  ["Metronome debt test-merge", "Debt"],
  ["Metronome observability test-merge", "Observability"],
  ["Metronome Codex test-merge review", "Codex"]
]);
const CODEX_RESULTS = Object.freeze({
  error: "Codex review metadata could not be evaluated",
  failure: "Latest Codex result is not verified clean",
  pending: "No verified Codex review for current head",
  success: "Verified clean Codex review for current head"
});
const PLATFORM_RESULTS = Object.freeze({
  failure: "did not pass",
  pending: "is pending",
  success: "passed"
});

export const TEST_MERGE_CONTEXTS = Object.freeze(CONTEXT_LABELS.keys().toArray());
const PLATFORM_GATE_CONTEXTS = new Set(TEST_MERGE_CONTEXTS.slice(0, 4));

function fullSha(value, label) {
  const sha = typeof value === "string" ? value.toLowerCase() : "";
  if (!FULL_SHA.test(sha)) {throw new Error(`${label} is unavailable`);}
  return sha;
}

function assertPullState(pull) {
  if (pull?.state !== "open") {throw new Error("Pull request is not open");}
  if (pull.draft !== false) {throw new Error("Pull request is draft or draft state is unavailable");}
  if (pull.mergeable !== true) {throw new Error("Pull request is not currently mergeable");}
}

function identityShas(pull) {
  const head = fullSha(pull?.head?.sha, "Pull request head SHA");
  const baseSha = fullSha(pull?.base?.sha, "Pull request base SHA");
  const { merge_commit_sha: mergeCommitSha } = pull ?? {};
  const mergeSha = fullSha(mergeCommitSha, "Pull request test-merge SHA");
  if (new Set([head, baseSha, mergeSha]).size !== 3) {
    throw new Error("Pull request identity SHAs are not distinct");
  }

  return { baseSha, head, mergeSha };
}

function identityBaseRef(pull, repository) {
  const { full_name: headRepository } = pull?.head?.repo ?? {};
  if (headRepository !== repository) {
    throw new Error("Fork-origin pull requests are unsupported");
  }

  const baseRef = pull?.base?.ref;
  const { full_name: baseRepository } = pull?.base?.repo ?? {};
  if (baseRepository !== repository || baseRef !== BASE_REF) {
    throw new Error("Pull request base is unsupported");
  }

  return baseRef;
}

export function pullIdentity(pull, repository) {
  assertPullState(pull);
  const { baseSha, head, mergeSha } = identityShas(pull);
  const baseRef = identityBaseRef(pull, repository);
  return Object.freeze({ baseRef, baseSha, head, mergeSha });
}

export function isSameIdentity(left, right) {
  return left.head === right.head
    && left.baseRef === right.baseRef
    && left.baseSha === right.baseSha
    && left.mergeSha === right.mergeSha;
}

export function statusResult(context, outcome) {
  const label = CONTEXT_LABELS.get(context);
  const description = label === "Codex"
    ? CODEX_RESULTS[outcome]
    : PLATFORM_RESULTS[outcome] && `${label} gate ${PLATFORM_RESULTS[outcome]} on the validated test merge`;
  if (!label || !description) {
    throw new Error("Unsupported test-merge status context or outcome");
  }

  return Object.freeze({ description, state: outcome });
}

export function settingsFromEnvironment(environment = process.env) {
  const {
    GITHUB_API_URL: apiUrl,
    GITHUB_REPOSITORY: repository,
    GITHUB_TOKEN: token,
    PR_NUMBER: prNumberText,
    RUN_URL: runUrl
  } = environment;
  if (!apiUrl || !repository || !token || !prNumberText || !runUrl) {
    throw new Error("Missing required environment");
  }

  const [owner, name, extra] = repository.split("/", 3);
  const prNumber = POSITIVE_DECIMAL.test(prNumberText) ? Number(prNumberText) : NaN;
  if (!owner || !name || extra || !Number.isSafeInteger(prNumber)) {
    throw new Error("Invalid repository or pull-request number");
  }

  return Object.freeze({
    apiUrl: apiUrl.replace(/\/$/v, ""),
    base: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`,
    prNumber,
    repository,
    runUrl,
    token
  });
}

export function githubClient(settings) {
  return async (requestPath, options = {}) => {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${settings.token}`,
      "X-GitHub-Api-Version": "2022-11-28"
    };
    const response = await fetch(`${settings.apiUrl}${requestPath}`, { ...options, headers });
    if (!response.ok) {
      throw new Error(`GitHub API ${response.status} for ${requestPath.split("?", 1)[0]}`);
    }

    return response.json();
  };
}

export async function readPullIdentity(request, settings) {
  const pull = await request(`${settings.base}/pulls/${settings.prNumber}`);
  return pullIdentity(pull, settings.repository);
}

export async function publishTestMergeStatus(request, options) {
  const { context, identity, outcome, settings } = options;
  const result = statusResult(context, outcome);
  const payload = Object.fromEntries([
    ["context", context],
    ["description", result.description],
    ["state", result.state],
    ["target_url", settings.runUrl]
  ]);
  await request(`${settings.base}/statuses/${identity.mergeSha}`, {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

function writeIdentity(outputPath, identity) {
  const output = [
    `head_sha=${identity.head}`,
    `base_ref=${identity.baseRef}`,
    `base_sha=${identity.baseSha}`,
    `merge_sha=${identity.mergeSha}`
  ].join("\n");
  appendFileSync(outputPath, `${output}\n`, "utf8");
}

async function initialize(environment) {
  const settings = settingsFromEnvironment(environment);
  const request = githubClient(settings);
  const context = environment.STATUS_CONTEXT;
  statusResult(context, "pending");
  const identity = await readPullIdentity(request, settings);
  await publishTestMergeStatus(request, {
    context,
    identity,
    outcome: "pending",
    settings
  });
  if (!environment.GITHUB_OUTPUT) {throw new Error("Missing GitHub output path");}
  writeIdentity(environment.GITHUB_OUTPUT, identity);
}

function identityFromEnvironment(environment) {
  if (environment.BASE_REF !== BASE_REF) {throw new Error("Pull request base is unsupported");}
  const head = fullSha(environment.HEAD_SHA, "Pull request head SHA");
  const baseSha = fullSha(environment.BASE_SHA, "Pull request base SHA");
  const mergeSha = fullSha(environment.MERGE_SHA, "Pull request test-merge SHA");
  if (new Set([head, baseSha, mergeSha]).size !== 3) {
    throw new Error("Pull request identity SHAs are not distinct");
  }

  return Object.freeze({ baseRef: BASE_REF, baseSha, head, mergeSha });
}

function terminalOutcome(result) {
  if (result === "success") {return "success";}
  if (["failure", "cancelled", "skipped"].includes(result)) {return "failure";}
  throw new Error("Unsupported platform gate result");
}

async function reportTerminal(environment) {
  const settings = settingsFromEnvironment(environment);
  const context = environment.STATUS_CONTEXT;
  if (!PLATFORM_GATE_CONTEXTS.has(context)) {
    throw new Error("Platform terminal mode requires a CI gate context");
  }

  const outcome = terminalOutcome(environment.GATE_RESULT);
  statusResult(context, outcome);
  const initial = identityFromEnvironment(environment);
  const request = githubClient(settings);
  const latest = await readPullIdentity(request, settings);
  if (!isSameIdentity(initial, latest)) {
    throw new Error("Pull request identity changed during gate execution");
  }

  await publishTestMergeStatus(request, {
    context,
    identity: initial,
    outcome,
    settings
  });
}

async function runCli() {
  const [argument, extra] = process.argv.slice(2);
  if (extra || !["initialize", "terminal"].includes(argument)) {
    throw new Error("Expected initialize or terminal mode");
  }

  if (argument === "initialize") {
    await initialize(process.env);
    return;
  }

  await reportTerminal(process.env);
}

const isMain = process.argv[1] !== undefined
  && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (isMain) {
  try {
    await runCli();
  } catch (error) {
    console.error(`TEST_MERGE_STATUS_ERROR: ${error instanceof Error ? error.message : "unknown"}`);
    process.exitCode = 1;
  }
}
