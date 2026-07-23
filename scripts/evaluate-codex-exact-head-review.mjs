#!/usr/bin/env node
import { readFileSync } from "node:fs";
import process from "node:process";

const BOT_LOGIN = "chatgpt-codex-connector[bot]";
const BOT_ID = 199_175_422;
const CONTEXT = "Metronome Codex exact-head review";
const CLEAN_RESULT = "Codex Review: Didn't find any major issues. :tada:";
const REVIEWED_COMMIT = /^\*\*Reviewed commit:\*\* `(?<prefix>[\da-f]{7,40})`$/gmv;
const REVIEW_REQUEST = /@codex\s+review\b/iv;
const SHA = /^[\da-f]{40}$/v;
const POSITIVE_DECIMAL = /^[1-9]\d*$/v;
const TRUSTED_ASSOCIATIONS = new Set(["COLLABORATOR", "MEMBER", "OWNER"]);
const ABOUT_CODEX = [
  "<details> <summary>ℹ️ About Codex in GitHub</summary>\n<br/>\n",
  "[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you\n- Open a pull request for review\n- Mark a draft as ready\n- Comment \"@codex review\".\n",
  "If Codex has suggestions, it will comment; otherwise it will react with 👍.\n\n\n\n\nCodex can also answer questions or update the PR. Try commenting \"@codex address that feedback\".\n",
  "</details>"
].join("\n");
const RESULTS = {
  error: { description: "Codex review metadata could not be evaluated", state: "error" },
  failure: { description: "Latest Codex result is not verified clean", state: "failure" },
  fork: { description: "Fork-origin pull requests are unsupported", state: "failure" },
  pending: { description: "No verified Codex review for current head", state: "pending" },
  success: { description: "Verified clean Codex review for current head", state: "success" }
};
function timestamp(item) {
  const parsed = Date.parse(item.updated_at ?? item.submitted_at ?? item.created_at ?? "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function isCleanReview(body, isPrefixHead, prefix) {
  const core = `${CLEAN_RESULT}\n\n**Reviewed commit:** \`${prefix}\``;
  return isPrefixHead && (body === core || body === `${core}\n\n${ABOUT_CODEX}`);
}

function artifactAssociation(item, head, prefixes, matches) {
  const isPrefixHead = matches.length === 1 && matches[0] === head;
  const commitId = typeof item.commit_id === "string" ? item.commit_id.toLowerCase() : "";
  if (commitId === head || isPrefixHead) {return { association: "current", isPrefixHead };}
  if (commitId || (prefixes.length === 1 && matches.length < 2)) {return { association: "elsewhere", isPrefixHead };}
  return { association: "uncertain", isPrefixHead };
}

function normalize(item, kind, head, commits) {
  if (item?.user?.login !== BOT_LOGIN || item.user.id !== BOT_ID) {return undefined;}
  const body = String(item.body).replaceAll("\r\n", "\n").replaceAll(/^[\t ]+$/gmv, "");
  const prefixes = body.matchAll(REVIEWED_COMMIT).map((match) => match.groups.prefix.toLowerCase()).toArray();
  const matches = prefixes.length === 1 ? commits.filter((commit) => commit.startsWith(prefixes[0])) : [];
  const { association, isPrefixHead } = artifactAssociation(item, head, prefixes, matches);
  const state = kind === "review" && typeof item.state === "string" ? item.state : undefined;
  const isClean = isCleanReview(body, isPrefixHead, prefixes[0]) && (kind === "issue-comment" || state === "COMMENTED");
  return { id: Number.isSafeInteger(Number(item.id)) ? Number(item.id) : 0, isClean, isCurrent: association === "current", isUncertain: association === "uncertain", kind, state, time: timestamp(item) };
}

function isTrustedReviewRequest(item) {
  const isCodexBot = item?.user?.login === BOT_LOGIN && item.user.id === BOT_ID;
  return !isCodexBot && TRUSTED_ASSOCIATIONS.has(item?.author_association) && typeof item.body === "string" && REVIEW_REQUEST.test(item.body);
}

function latestRequestTime(issueComments) {
  let latest = -Infinity;
  for (const item of issueComments) {
    if (isTrustedReviewRequest(item)) {latest = Math.max(latest, timestamp(item));}
  }

  return latest;
}

function evaluateCodexReview(input) {
  const head = typeof input?.head === "string" ? input.head.toLowerCase() : "";
  const suppliedCommits = Array.isArray(input?.commits) ? input.commits : [];
  if (!SHA.test(head) || suppliedCommits.some((sha) => typeof sha !== "string")) {
    throw new TypeError("Expected a full head SHA and PR commit SHAs");
  }

  const commits = [...new Set(suppliedCommits.map((sha) => sha.toLowerCase()))];
  const issueComments = Array.isArray(input.issueComments) ? input.issueComments : [];
  const reviews = Array.isArray(input.reviews) ? input.reviews : [];
  const requestBarrier = latestRequestTime(issueComments);
  const artifacts = [
    ...issueComments.map((item) => normalize(item, "issue-comment", head, commits)),
    ...reviews.map((item) => normalize(item, "review", head, commits))
  ].filter((artifact) => artifact && artifact.time > requestBarrier);
  if (artifacts.every((artifact) => !artifact.isCurrent)) {return RESULTS.pending;}
  const [latest] = artifacts.filter((artifact) => artifact.isCurrent || artifact.isUncertain)
    .toSorted((left, right) => right.time - left.time || Number(left.isClean) - Number(right.isClean) || right.id - left.id);
  return latest.isClean ? RESULTS.success : RESULTS.failure;
}

function readInput() {
  const raw = readFileSync(0, "utf8").trim();
  if (!raw) {throw new TypeError("Expected JSON input");}
  const value = JSON.parse(raw);
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new TypeError("Expected a JSON object");
  }

  return value;
}

function settingsFromEnvironment() {
  const { GITHUB_API_URL: apiUrl, GITHUB_REPOSITORY: repository, GITHUB_TOKEN: token, PR_NUMBER: prNumberText, RUN_URL: runUrl } = process.env;
  if (!apiUrl || !repository || !token || !prNumberText || !runUrl) {
    throw new Error("Missing required environment");
  }

  const [owner, name, extra] = repository.split("/", 3);
  const prNumber = POSITIVE_DECIMAL.test(prNumberText) ? Number(prNumberText) : NaN;
  if (!owner || !name || extra || !Number.isSafeInteger(prNumber)) {
    throw new Error("Invalid repository or pull-request number");
  }

  return { apiUrl: apiUrl.replace(/\/$/v, ""), base: `/repos/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`, prNumber, runUrl, token };
}

function githubClient(settings) {
  return async (path, options = {}) => {
    const headers = { Accept: "application/vnd.github+json", Authorization: `Bearer ${settings.token}`, "X-GitHub-Api-Version": "2022-11-28" };
    const response = await fetch(`${settings.apiUrl}${path}`, { ...options, headers });
    if (!response.ok) {throw new Error(`GitHub API ${response.status} for ${path.split("?", 1)[0]}`);}
    return response.json();
  };
}

async function paginate(request, path, page = 1) {
  const values = await request(`${path}?per_page=100&page=${page}`);
  if (!Array.isArray(values)) {throw new TypeError("Expected a GitHub API list");}
  if (values.length < 100) {return values;}
  return [...values, ...await paginate(request, path, page + 1)];
}

function pullHead(pull) {
  const head = pull?.head?.sha?.toLowerCase();
  if (!SHA.test(head ?? "")) {throw new Error("Pull request head is unavailable");}
  return head;
}

function isFork(pull) {
  const headRepository = pull?.head?.repo?.full_name;
  return typeof headRepository !== "string" || headRepository !== pull?.base?.repo?.full_name;
}

async function publish(request, settings, head, result) {
  const payload = Object.fromEntries([["context", CONTEXT], ["description", result.description], ["state", result.state], ["target_url", settings.runUrl]]);
  await request(`${settings.base}/statuses/${head}`, {
    body: JSON.stringify(payload),
    method: "POST"
  });
}

async function run() {
  if (process.argv[2] === "--evaluate") {
    const evaluation = evaluateCodexReview(readInput());
    process.stdout.write(`${JSON.stringify(evaluation)}\n`);
    return;
  }

  if (process.argv.length > 2) {throw new Error("Unexpected command arguments");}
  const settings = settingsFromEnvironment();
  const request = githubClient(settings);
  const pullPath = `${settings.base}/pulls/${settings.prNumber}`;
  const pull = await request(pullPath);
  const head = pullHead(pull);
  if (isFork(pull)) {
    await publish(request, settings, head, RESULTS.fork);
    return;
  }

  await publish(request, settings, head, RESULTS.pending);
  let evaluation;
  let latestHead;
  let latestPull;
  try {
    const [reviews, issueComments, commits] = await Promise.all([paginate(request, `${pullPath}/reviews`), paginate(request, `${settings.base}/issues/${settings.prNumber}/comments`), paginate(request, `${pullPath}/commits`)]);
    evaluation = evaluateCodexReview({ commits: commits.map((commit) => commit.sha), head, issueComments, reviews });
    latestPull = await request(pullPath);
    latestHead = pullHead(latestPull);
  } catch (error) {
    await publish(request, settings, head, RESULTS.error);
    throw error;
  }

  if (isFork(latestPull)) {
    await publish(request, settings, latestHead, RESULTS.fork);
    return;
  }

  if (latestHead !== head) {
    await publish(request, settings, latestHead, RESULTS.pending);
    return;
  }

  await publish(request, settings, head, evaluation);
}

try {
  await run();
} catch (error) {
  console.error(`CODEX_EXACT_HEAD_ERROR: ${error instanceof Error ? error.message : "unknown"}`);
  process.exitCode = 1;
}
