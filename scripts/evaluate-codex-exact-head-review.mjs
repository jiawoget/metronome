#!/usr/bin/env node
import { readFileSync } from "node:fs";
import process from "node:process";
import { githubClient, isSameIdentity, publishTestMergeStatus, readPullIdentity, settingsFromEnvironment, statusResult, TEST_MERGE_CONTEXTS } from "./test-merge-status-reporter.mjs";

const BOT_LOGIN = "chatgpt-codex-connector[bot]";
const BOT_ID = 199_175_422;
const CONTEXT = TEST_MERGE_CONTEXTS[4];
const CLEAN_RESULT = "Codex Review: Didn't find any major issues. :tada:";
const REVIEWED_COMMIT = /^\*\*Reviewed commit:\*\* `(?<prefix>[\da-f]{7,40})`$/gmv;
const REVIEW_REQUEST = /@codex\s+review\b/iv;
const SHA = /^[\da-f]{40}$/v;
const GITHUB_TIMESTAMP = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\dZ$/v;
const REVIEW_QUERY = "query CodexReviews($owner:String!,$name:String!,$number:Int!,$cursor:String){repository(owner:$owner,name:$name){pullRequest(number:$number){reviews(first:100,after:$cursor){nodes{author{login ... on Bot{databaseId} ... on User{databaseId}} body commit{oid} databaseId lastEditedAt state submittedAt updatedAt} pageInfo{endCursor hasNextPage}}}}}";
const TRUSTED_ASSOCIATIONS = new Set(["COLLABORATOR", "MEMBER", "OWNER"]);
const ABOUT_CODEX = ["<details> <summary>ℹ️ About Codex in GitHub</summary>\n<br/>\n", "[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you\n- Open a pull request for review\n- Mark a draft as ready\n- Comment \"@codex review\".\n", "If Codex has suggestions, it will comment; otherwise it will react with 👍.\n\n\n\n\nCodex can also answer questions or update the PR. Try commenting \"@codex address that feedback\".\n", "</details>"].join("\n");
const RESULTS = Object.fromEntries(["error", "failure", "pending", "success"].map((outcome) => [outcome, statusResult(CONTEXT, outcome)]));
function parsedTimestamp(value) {
  if (typeof value !== "string" || !GITHUB_TIMESTAMP.test(value)) {return undefined;}
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value.replace(/Z$/v, ".000Z") ? parsed : undefined;
}

function reviewTimestamp(item) {
  if (!Object.hasOwn(item, "lastEditedAt")) {return undefined;}
  const submitted = parsedTimestamp(item.submittedAt);
  const updated = parsedTimestamp(item.updatedAt);
  const lastEdited = item.lastEditedAt === null ? undefined : parsedTimestamp(item.lastEditedAt);
  if (submitted === undefined || updated === undefined || updated < submitted) {return undefined;}
  if (item.lastEditedAt !== null && (lastEdited === undefined || lastEdited < submitted || lastEdited > updated)) {return undefined;}
  if (item.state === "DISMISSED" && updated === submitted) {return undefined;}
  return updated;
}

function timestamp(item, kind) {return kind === "review" ? reviewTimestamp(item) : parsedTimestamp(kind === "issue-event" ? item.created_at : item.updated_at);}

function isCleanReview(body, isPrefixHead, prefix) {const core = `${CLEAN_RESULT}\n\n**Reviewed commit:** \`${prefix}\``; return isPrefixHead && (body === core || body === `${core}\n\n${ABOUT_CODEX}`);}

function reviewCommit(item, kind) {
  const raw = kind === "review" ? item.commit?.oid : undefined;
  if ([undefined, null, ""].includes(raw)) {return { malformed: false, value: "" };}
  const value = typeof raw === "string" ? raw.toLowerCase() : "";
  return { malformed: !SHA.test(value), value: SHA.test(value) ? value : "" };
}

function artifactAssociation(commit, head, prefixes, matches) {
  const isPrefixHead = matches.length === 1 && matches[0] === head;
  if (commit.value === head || isPrefixHead) {return { association: "current", isPrefixHead };}
  if (commit.malformed) {return { association: "uncertain", isPrefixHead };}
  if (commit.value || (prefixes.length === 1 && matches.length < 2)) {return { association: "elsewhere", isPrefixHead };}
  return { association: "uncertain", isPrefixHead };
}

function isCodexArtifact(item, kind) {
  const user = kind === "review" ? item?.author : item?.user;
  return user?.login === BOT_LOGIN && [user.databaseId, user.id].includes(BOT_ID);
}

function normalize(item, kind, head, commits) {
  if (!isCodexArtifact(item, kind)) {return undefined;}
  const body = String(item.body).replaceAll("\r\n", "\n").replaceAll(/^[\t ]+$/gmv, "");
  const prefixes = body.matchAll(REVIEWED_COMMIT).map((match) => match.groups.prefix.toLowerCase()).toArray();
  const matches = prefixes.length === 1 ? commits.filter((commit) => commit.startsWith(prefixes[0])) : [];
  const commit = reviewCommit(item, kind);
  const { association, isPrefixHead } = artifactAssociation(commit, head, prefixes, matches);
  const state = kind === "review" && typeof item.state === "string" ? item.state : undefined;
  const time = timestamp(item, kind);
  const isClean = isCleanReview(body, isPrefixHead, prefixes[0]) && (kind === "issue-comment" || state === "COMMENTED");
  const id = kind === "review" ? item.databaseId : item.id;
  return { id: Number.isSafeInteger(Number(id)) ? Number(id) : 0, isClean, isCurrent: association === "current", isMalformed: commit.malformed || time === undefined, isUncertain: association === "uncertain", kind, state, time };
}

function isTrustedReviewRequest(item) {
  const isCodexBot = item?.user?.login === BOT_LOGIN && item.user.id === BOT_ID;
  return !isCodexBot && TRUSTED_ASSOCIATIONS.has(item?.author_association) && typeof item.body === "string" && REVIEW_REQUEST.test(item.body);
}

function evidenceBarrier(issueComments, issueEvents) {
  let latest = -Infinity;
  const barriers = [
    ...issueComments.filter((item) => isTrustedReviewRequest(item)).map((item) => [item, "issue-comment"]),
    ...issueEvents.filter((item) => ["base_ref_changed", "head_ref_force_pushed"].includes(item?.event)).map((item) => [item, "issue-event"])
  ];
  for (const [item, kind] of barriers) {
    const time = timestamp(item, kind);
    if (time === undefined) {return { isMalformed: true, time: latest };}
    latest = Math.max(latest, time);
  }

  return { isMalformed: false, time: latest };
}

function evaluateCodexReview(input) {
  const head = typeof input?.head === "string" ? input.head.toLowerCase() : "";
  const suppliedCommits = Array.isArray(input?.commits) ? input.commits : [];
  if (!SHA.test(head) || suppliedCommits.some((sha) => typeof sha !== "string")) {
    throw new TypeError("Expected a full head SHA and PR commit SHAs");
  }

  const commits = [...new Set(suppliedCommits.map((sha) => sha.toLowerCase()))];
  const issueComments = Array.isArray(input.issueComments) ? input.issueComments : [];
  const issueEvents = Array.isArray(input.issueEvents) ? input.issueEvents : [];
  const reviews = Array.isArray(input.reviews) ? input.reviews : [];
  const barrier = evidenceBarrier(issueComments, issueEvents);
  if (barrier.isMalformed) {return RESULTS.failure;}
  const artifacts = [
    ...issueComments.map((item) => normalize(item, "issue-comment", head, commits)),
    ...reviews.map((item) => normalize(item, "review", head, commits))
  ].filter((artifact) => artifact && (artifact.time === undefined || artifact.time > barrier.time));
  if (artifacts.some((artifact) => artifact.isMalformed)) {return RESULTS.failure;}
  if (artifacts.every((artifact) => !artifact.isCurrent)) {return RESULTS.pending;}
  const [latest] = artifacts.filter((artifact) => artifact.isCurrent || artifact.isUncertain)
    .toSorted((left, right) => right.time - left.time || Number(left.isClean) - Number(right.isClean) || right.id - left.id);
  return latest.isClean ? RESULTS.success : RESULTS.failure;
}

function readInput() {
  const raw = readFileSync(0, "utf8").trim();
  if (!raw) {throw new TypeError("Expected JSON input");}
  const value = JSON.parse(raw);
  if (!value || Array.isArray(value) || typeof value !== "object") {throw new TypeError("Expected a JSON object");}

  return value;
}

async function paginate(request, path, page = 1) {
  const values = await request(`${path}?per_page=100&page=${page}`);
  if (!Array.isArray(values)) {throw new TypeError("Expected a GitHub API list");}
  if (values.length < 100) {return values;}
  return [...values, ...await paginate(request, path, page + 1)];
}

function hasGraphQlErrors(response) {
  if (!Object.hasOwn(response ?? {}, "errors")) {return false;}
  return !Array.isArray(response.errors) || response.errors.length > 0;
}

function reviewConnection(response) {
  if (hasGraphQlErrors(response)) {
    throw new TypeError("GitHub GraphQL review query failed");
  }

  const connection = response?.data?.repository?.pullRequest?.reviews;
  if (!Array.isArray(connection?.nodes)) {
    throw new TypeError("Expected a GitHub GraphQL review connection");
  }

  const { endCursor, hasNextPage } = connection.pageInfo ?? {};
  if (typeof hasNextPage !== "boolean") {
    throw new TypeError("Expected GitHub GraphQL review pagination metadata");
  }

  if (hasNextPage && (typeof endCursor !== "string" || endCursor.length === 0)) {
    throw new TypeError("Expected a GitHub GraphQL review cursor");
  }

  return connection;
}

async function paginateReviews(request, settings, cursor = null) {
  const [owner, name] = settings.repository.split("/");
  const response = await request("", {
    body: JSON.stringify({ query: REVIEW_QUERY, variables: { cursor, name, number: settings.prNumber, owner } }),
    method: "POST"
  });
  const connection = reviewConnection(response);
  const { endCursor, hasNextPage } = connection.pageInfo;

  if (!hasNextPage) {return connection.nodes;}
  return [...connection.nodes, ...await paginateReviews(request, settings, endCursor)];
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
  const graphqlUrl = process.env.GITHUB_GRAPHQL_URL;
  if (!graphqlUrl) {throw new Error("Missing required environment");}
  const reviewRequest = githubClient(settings, graphqlUrl.replace(/\/$/v, ""));
  const pullPath = `${settings.base}/pulls/${settings.prNumber}`;
  const initial = await readPullIdentity(request, settings);
  const { head } = initial;
  const publish = (outcome) => publishTestMergeStatus(request, { context: CONTEXT, identity: initial, outcome, settings });
  await publish("pending");
  let evaluation;
  let evaluationError;
  try {
    const issuePath = `${settings.base}/issues/${settings.prNumber}`;
    const [reviews, issueComments, issueEvents, commits] = await Promise.all([paginateReviews(reviewRequest, settings), paginate(request, `${issuePath}/comments`), paginate(request, `${issuePath}/events`), paginate(request, `${pullPath}/commits`)]);
    evaluation = evaluateCodexReview({ commits: commits.map((commit) => commit.sha), head, issueComments, issueEvents, reviews });
  } catch (error) {
    evaluation = RESULTS.error;
    evaluationError = error;
  }

  const latest = await readPullIdentity(request, settings);
  if (!isSameIdentity(initial, latest)) {throw new Error("Pull request identity changed during evaluation");}

  await publish(evaluation.state);
  if (evaluationError) {throw evaluationError;}
}

try {
  await run();
} catch (error) {
  console.error(`CODEX_EXACT_HEAD_ERROR: ${error instanceof Error ? error.message : "unknown"}`);
  process.exitCode = 1;
}
