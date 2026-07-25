import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { readdirSync, readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import process from "node:process";
import type { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

function sortedStrings(values: readonly string[]) {
  const sorted: string[] = [];
  for (const value of values) {
    const index = sorted.findIndex((candidate) => value.localeCompare(candidate) < 0);
    sorted.splice(index === -1 ? sorted.length : index, 0, value);
  }

  return sorted;
}

const evaluator = path.join(process.cwd(), "scripts", "evaluate-codex-exact-head-review.mjs");
const workflowDirectory = path.join(process.cwd(), ".github", "workflows");
const workflowNames = sortedStrings(readdirSync(workflowDirectory)
  .filter((name) => [".yaml", ".yml"].includes(path.extname(name).toLowerCase())));
const workflowFiles = workflowNames
  .map((name) => ({
    name,
    source: readFileSync(path.join(workflowDirectory, name), "utf8")
  }));

function sourceFilesUnder(directory: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...sourceFilesUnder(entryPath));
    } else if ([".cjs", ".js", ".json", ".mjs", ".ps1", ".sh", ".ts", ".yaml", ".yml"].includes(path.extname(entry.name).toLowerCase())) {
      files.push(entryPath);
    }
  }

  return files;
}

const publisherFiles = [
  ...sourceFilesUnder(path.join(process.cwd(), "scripts")).map((file) => ({
    name: path.relative(process.cwd(), file).replaceAll("\\", "/"),
    source: readFileSync(file, "utf8")
  })),
  ...workflowFiles.map((entry) => ({ ...entry, name: `.github/workflows/${entry.name}` }))
];

function workflowSource(name: string) {
  const entry = workflowFiles.find((candidate) => candidate.name === name);
  if (!entry) {throw new Error(`Missing workflow: ${name}`);}
  return entry.source;
}

const workflow = workflowSource("codex-exact-head-review.yml");
const windowsWorkflow = workflowSource("windows-observability.yml");
const bot = { id: 199_175_422, login: "chatgpt-codex-connector[bot]" };
const repositoryOwner = { id: 123, login: "repository-owner" };
const repository = "jiawoget/metronome";
const head = "379bc414a9".padEnd(40, "1");
const other = "50a083f2".padEnd(40, "2");
const ambiguous = "379bc414a9".padEnd(40, "3");
const baseSha = "a766e9e40e".padEnd(40, "4");
const otherBaseSha = "9199d17e9d".padEnd(40, "5");
const mergeSha = "ec6cfbfc4d".padEnd(40, "6");
const otherMergeSha = "fa81bb3dc4".padEnd(40, "7");
const pullPath = "/repos/jiawoget/metronome/pulls/128";
const commentsPath = "/repos/jiawoget/metronome/issues/128/comments";
const eventsPath = "/repos/jiawoget/metronome/issues/128/events";
const context = "Metronome Codex test-merge review";
const runUrl = "https://github.test/jiawoget/metronome/actions/runs/1";
const aboutCodex = [
  "<details> <summary>ℹ️ About Codex in GitHub</summary>\n<br/>\n",
  "[Your team has set up Codex to review pull requests in this repo](https://chatgpt.com/codex/cloud/settings/general). Reviews are triggered when you\n- Open a pull request for review\n- Mark a draft as ready\n- Comment \"@codex review\".\n",
  "If Codex has suggestions, it will comment; otherwise it will react with 👍.\n\n\n\n\nCodex can also answer questions or update the PR. Try commenting \"@codex address that feedback\".\n",
  "</details>"
].join("\n");

type User = { id: number; login: string };
type HttpRequest = { body: unknown; method: string; path: string };
type FakeResponse = { body?: unknown; status?: number };
type ResponsePlan = (request: HttpRequest, requests: readonly HttpRequest[]) => FakeResponse;

function record(entries: ReadonlyArray<readonly [string, unknown]>) {
  return Object.fromEntries(entries);
}

function stringRecord(entries: ReadonlyArray<readonly [string, string]>) {
  return Object.fromEntries(entries);
}

function cleanBody(prefix = "379bc414a9") {
  return `Codex Review: Didn't find any major issues. :tada:\n\n**Reviewed commit:** \`${prefix}\``;
}

function issueComment(options: {
  authorAssociation?: string;
  body?: string;
  id?: number;
  updatedAt?: string;
  user?: User;
} = {}) {
  const {
    authorAssociation = "NONE",
    body = cleanBody(),
    id = 5_009_800_322,
    updatedAt = "2026-07-20T10:00:00Z",
    user = bot
  } = options;
  return record([
    ["author_association", authorAssociation],
    ["body", body],
    ["created_at", updatedAt],
    ["id", id],
    ["updated_at", updatedAt],
    ["user", user]
  ]);
}

function reviewRequest(options: {
  authorAssociation?: string;
  body?: string;
  id?: number;
  updatedAt?: string;
} = {}) {
  return issueComment({
    authorAssociation: options.authorAssociation ?? "OWNER",
    body: options.body ?? "@codex review",
    id: options.id ?? 5_009_800_400,
    updatedAt: options.updatedAt ?? "2026-07-20T11:00:00Z",
    user: repositoryOwner
  });
}

function issueEvent(options: {
  createdAt?: string;
  event?: string;
  id?: number;
} = {}) {
  return record([
    ["created_at", options.createdAt ?? "2026-07-20T11:00:00Z"],
    ["event", options.event ?? "base_ref_changed"],
    ["id", options.id ?? 5_009_800_500]
  ]);
}

function review(options: {
  body?: string;
  commitId?: string;
  id?: number;
  state?: string;
  submittedAt?: string;
  user?: User;
} = {}) {
  const {
    body = "### 💡 Codex Review\n\nHere are some automated review suggestions.",
    commitId = head,
    id = 4_753_387_658,
    state = "COMMENTED",
    submittedAt = "2026-07-20T10:00:00Z",
    user = bot
  } = options;
  return record([
    ["body", body],
    ["commit_id", commitId],
    ["id", id],
    ["state", state],
    ["submitted_at", submittedAt],
    ["user", user]
  ]);
}

function evaluate(overrides: Record<string, unknown> = {}) {
  const input = {
    commits: [head, other],
    head,
    issueComments: [],
    issueEvents: [],
    reviews: [],
    ...overrides
  };
  const result = spawnSync(process.execPath, [evaluator, "--evaluate"], {
    cwd: process.cwd(),
    encoding: "utf8",
    input: JSON.stringify(input)
  });

  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout) as { state: string };
}

function normalizeWorkflow(source: string) {
  return source.replaceAll("\r\n", "\n").trim();
}

function topLevelYamlKeyCount(source: string, key: string) {
  return normalizeWorkflow(source).split("\n").filter((line) => line === `${key}:`).length;
}

function topLevelYamlBlock(source: string, key: string) {
  const lines = normalizeWorkflow(source).split("\n");
  const start = lines.indexOf(`${key}:`);
  if (start === -1) {
    throw new Error(`Missing top-level YAML key: ${key}`);
  }

  let end = start + 1;
  while (end < lines.length && (lines[end] === "" || lines[end].startsWith(" ") || lines[end].startsWith("\t"))) {
    end += 1;
  }

  return lines.slice(start + 1, end).join("\n").trimEnd();
}

function yamlKeys(block: string, indentation = 2) {
  const prefix = " ".repeat(indentation);
  return block.split("\n")
    .filter((line) => line.startsWith(prefix) && !line.startsWith(`${prefix} `))
    .map((line) => line.slice(indentation).split(":", 1)[0]);
}

function githubExpression(value: string) {
  return `\${{ ${value} }}`;
}

function usesProtectedStatusPublisher(source: string) {
  const normalized = source.toLowerCase();
  return [
    "statuses: write",
    "evaluate-codex-exact-head-review.mjs",
    "/statuses/",
    "createcommitstatus",
    "create_commit_status"
  ].some((token) => normalized.includes(token));
}

type PullResponseOptions = {
  baseRef?: unknown;
  baseRepository?: string | null;
  baseSha?: unknown;
  draft?: unknown;
  headRepository?: string | null;
  headSha?: unknown;
  mergeCommitSha?: unknown;
  mergeable?: unknown;
  state?: unknown;
};

function pullResponse(options: PullResponseOptions = {}) {
  const {
    baseRef = "main",
    baseRepository = repository,
    baseSha: currentBaseSha = baseSha,
    draft = false,
    headRepository = repository,
    headSha = head,
    mergeCommitSha = mergeSha,
    mergeable = true,
    state = "open"
  } = options;
  return record([
    [
      "base",
      record([
        ["ref", baseRef],
        ["repo", baseRepository === null ? null : record([["full_name", baseRepository]])],
        ["sha", currentBaseSha]
      ])
    ],
    ["draft", draft],
    [
      "head",
      record([
        ["repo", headRepository === null ? null : record([["full_name", headRepository]])],
        ["sha", headSha]
      ])
    ],
    ["merge_commit_sha", mergeCommitSha],
    ["mergeable", mergeable],
    ["state", state]
  ]);
}

function pullWithoutBaseField(field: "ref" | "repo" | "sha") {
  const pull = pullResponse();
  const { base } = pull;
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    throw new TypeError("Expected pull-request base metadata");
  }

  Reflect.deleteProperty(base, field);
  return pull;
}

function pullWithoutField(field: "draft" | "merge_commit_sha" | "mergeable" | "state") {
  const pull = pullResponse();
  Reflect.deleteProperty(pull, field);
  return pull;
}

function statusPath(sha: string) {
  return `/repos/jiawoget/metronome/statuses/${sha}`;
}

function page(pathname: string, number = 1) {
  return `${pathname}?per_page=100&page=${number}`;
}

function statusBody(state: string, description: string) {
  return record([
    ["context", context],
    ["description", description],
    ["state", state],
    ["target_url", runUrl]
  ]);
}

function getRequest(pathname: string): HttpRequest {
  return { body: undefined, method: "GET", path: pathname };
}

function statusRequest(sha: string, state: string, description: string): HttpRequest {
  return { body: statusBody(state, description), method: "POST", path: statusPath(sha) };
}

function responses(
  metadata: Readonly<Record<string, FakeResponse>> = {},
  pulls: readonly unknown[] = [pullResponse()],
  status = 200
): ResponsePlan {
  let pullRead = 0;
  return (request) => {
    if (request.method === "POST") {return { body: {}, status };}
    if (request.path === pullPath) {
      const body = pulls[Math.min(pullRead, pulls.length - 1)];
      pullRead += 1;
      return { body };
    }

    return metadata[request.path] ?? { body: [] };
  };
}

function hasState(request: HttpRequest, state: string) {
  return (request.body as { state?: unknown } | undefined)?.state === state;
}

async function readStream(stream: Readable | IncomingMessage) {
  let output = "";
  for await (const chunk of stream) {
    output += String(chunk);
  }

  return output;
}

async function answerRequest(
  incoming: IncomingMessage,
  outgoing: ServerResponse,
  requests: HttpRequest[],
  respond: ResponsePlan
) {
  const raw = await readStream(incoming);
  const request = {
    body: raw.length > 0 ? (JSON.parse(raw) as unknown) : undefined,
    method: incoming.method ?? "GET",
    path: incoming.url ?? "/"
  };
  requests.push(request);
  try {
    const reply = respond(request, requests);
    outgoing.statusCode = reply.status ?? 200;
    outgoing.setHeader("Content-Type", "application/json");
    outgoing.end(JSON.stringify(reply.body ?? {}));
  } catch (error) {
    outgoing.statusCode = 500;
    outgoing.end(JSON.stringify({ error: String(error) }));
  }
}

async function runRuntime(
  respond: ResponsePlan,
  environmentOverrides: Readonly<Record<string, string>> = {}
) {
  const requests: HttpRequest[] = [];
  const server = createServer((incoming, outgoing) => {
    void answerRequest(incoming, outgoing, requests, respond);
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("Fake GitHub server did not bind a TCP port");
  }

  const environment = {
    ...process.env,
    ...stringRecord([
      ["GITHUB_API_URL", `http://127.0.0.1:${address.port}`],
      ["GITHUB_REPOSITORY", repository],
      ["GITHUB_TOKEN", "test-token"],
      ["PR_NUMBER", "128"],
      ["RUN_URL", runUrl]
    ]),
    ...environmentOverrides
  };
  const child = spawn(process.execPath, [evaluator], {
    cwd: process.cwd(),
    env: environment,
    stdio: ["ignore", "pipe", "pipe"]
  });
  const completion = new Promise<number | null>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  const [status, stdout, stderr] = await Promise.all([
    completion,
    readStream(child.stdout),
    readStream(child.stderr)
  ]);
  const closed = once(server, "close");
  server.close();
  await closed;
  return { requests, status, stderr, stdout };
}

describe("Codex exact-head review evaluator", () => {
  it.each([
    ["wrong login", { id: bot.id, login: "github-actions[bot]" }],
    ["wrong REST user id", { id: 1, login: bot.login }]
  ])("ignores the %s even when the review looks clean", (_name, user) => {
    expect(evaluate({ issueComments: [issueComment({ user })] }).state).toBe("pending");
  });

  it("ignores an owner-authored FINDING_FREE lookalike", () => {
    const spoof = review({
      body: "FINDING_FREE",
      id: 4_753_452_139,
      user: { id: 123, login: "repository-owner" }
    });

    expect(evaluate({ reviews: [spoof] }).state).toBe("pending");
  });

  it.each([
    ["the unique current-head prefix", cleanBody(), [head, other], "success"],
    ["a different commit prefix", cleanBody("50a083f2"), [head, other], "pending"],
    ["an ambiguous prefix", cleanBody(), [head, ambiguous], "pending"]
  ])("handles %s", (_name, body, commits, state) => {
    expect(evaluate({ commits, issueComments: [issueComment({ body })] }).state).toBe(state);
  });

  it("uses timestamps rather than input order across artifact kinds", () => {
    const olderFinding = review({ submittedAt: "2026-07-20T09:00:00Z" });
    const newerClean = issueComment({ updatedAt: "2026-07-20T11:00:00Z" });

    expect(evaluate({ issueComments: [newerClean], reviews: [olderFinding] }).state).toBe("success");
  });

  it("lets a newer current-head finding supersede an older clean review", () => {
    const olderClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
    const newerFinding = review({ submittedAt: "2026-07-20T11:00:00Z" });

    expect(evaluate({ issueComments: [olderClean], reviews: [newerFinding] }).state).toBe("failure");
  });

  it.each(["OWNER", "MEMBER", "COLLABORATOR"])(
    "treats a newer %s-authored @codex review request as a reset barrier",
    (authorAssociation) => {
      const olderClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
      const request = reviewRequest({
        authorAssociation,
        body: "Please @codex review this pull request."
      });

      expect(evaluate({ issueComments: [olderClean, request] }).state).toBe("pending");
    }
  );

  it("lets a trusted request reset an older finding and fails closed on a timestamp tie", () => {
    const olderFinding = review({ submittedAt: "2026-07-20T09:00:00Z" });
    const request = reviewRequest();
    const tiedClean = issueComment({
      id: 5_009_800_401,
      updatedAt: "2026-07-20T11:00:00Z"
    });

    expect(evaluate({ issueComments: [request], reviews: [olderFinding] }).state).toBe("pending");
    expect(evaluate({ issueComments: [request, tiedClean] }).state).toBe("pending");
  });

  it.each(["NONE", "CONTRIBUTOR", "FIRST_TIME_CONTRIBUTOR"])(
    "does not let an untrusted %s-authored request reset clean evidence",
    (authorAssociation) => {
      const olderClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
      const request = reviewRequest({ authorAssociation });

      expect(evaluate({ issueComments: [olderClean, request] }).state).toBe("success");
    }
  );

  it("lets newer connector evidence determine the result after a trusted request", () => {
    const request = reviewRequest({
      authorAssociation: "MEMBER",
      body: "Could you @codex review this?",
      updatedAt: "2026-07-20T10:00:00Z"
    });
    const newerClean = issueComment({ id: 5_009_800_401, updatedAt: "2026-07-20T11:00:00Z" });
    const newerFinding = review({ id: 4_753_387_700, submittedAt: "2026-07-20T11:00:00Z" });

    expect(evaluate({ issueComments: [request, newerClean] }).state).toBe("success");
    expect(evaluate({ issueComments: [request], reviews: [newerFinding] }).state).toBe("failure");
  });

  it.each([
    ["before", "2026-07-20T10:00:00Z"],
    ["at", "2026-07-20T11:00:00Z"]
  ])("does not accept a clean artifact %s the latest base change", (_name, updatedAt) => {
    const clean = issueComment({ updatedAt });
    const baseChange = issueEvent({ createdAt: "2026-07-20T11:00:00Z" });

    expect(evaluate({ issueComments: [clean], issueEvents: [baseChange] }).state).toBe("pending");
  });

  it("accepts a fresh clean artifact after the latest base change", () => {
    const clean = issueComment({ updatedAt: "2026-07-20T12:00:00Z" });
    const baseChanges = [
      issueEvent({ createdAt: "2026-07-20T09:00:00Z", id: 5_009_800_499 }),
      issueEvent({ createdAt: "2026-07-20T11:00:00Z" })
    ];

    expect(evaluate({ issueComments: [clean], issueEvents: baseChanges }).state).toBe("success");
  });

  it("rejects prefix-matched clean evidence older than a force push", () => {
    const clean = issueComment({ updatedAt: "2026-07-20T10:00:00Z" });
    const forcePush = issueEvent({
      createdAt: "2026-07-20T11:00:00Z",
      event: "head_ref_force_pushed"
    });

    expect(evaluate({ issueComments: [clean], issueEvents: [forcePush] }).state).toBe("pending");
  });

  it("does not invalidate clean evidence for an ordinary non-base edit", () => {
    const clean = issueComment({ updatedAt: "2026-07-20T10:00:00Z" });
    const titleEdit = issueEvent({
      createdAt: "2026-07-20T11:00:00Z",
      event: "renamed"
    });

    expect(evaluate({ issueComments: [clean], issueEvents: [titleEdit] }).state).toBe("success");
  });

  it.each(["base_ref_changed", "head_ref_force_pushed"])(
    "fails closed when a %s event has an invalid timestamp",
    (event) => {
      const clean = issueComment({ updatedAt: "2026-07-20T12:00:00Z" });
      const malformed = issueEvent({ createdAt: "not-a-date", event });

      expect(evaluate({ issueComments: [clean], issueEvents: [malformed] }).state).toBe("failure");
    }
  );

  it("fails closed on a dateless clean connector artifact", () => {
    const datelessClean = issueComment();
    Reflect.deleteProperty(datelessClean, "created_at");
    Reflect.deleteProperty(datelessClean, "updated_at");

    expect(evaluate({ issueComments: [datelessClean] }).state).toBe("failure");
  });

  it("fails closed when a trusted request barrier has an invalid date", () => {
    const olderClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
    const invalidRequest = reviewRequest({ updatedAt: "not-a-date" });

    expect(evaluate({ issueComments: [olderClean, invalidRequest] }).state).toBe("failure");
  });

  it("does not let a trusted request borrow created_at when updated_at is missing", () => {
    const olderClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
    const requestWithoutUpdatedAt = reviewRequest();
    Reflect.deleteProperty(requestWithoutUpdatedAt, "updated_at");

    expect(evaluate({ issueComments: [olderClean, requestWithoutUpdatedAt] }).state).toBe("failure");
  });

  it.each(["0", "2026-02-30T11:00:00Z"])("rejects Date.parse-permissive timestamp %s", (updatedAt) => {
    const olderClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
    const permissiveRequest = reviewRequest({ updatedAt });

    expect(evaluate({ issueComments: [olderClean, permissiveRequest] }).state).toBe("failure");
  });

  it("does not let a clean artifact outrank a missing-date PENDING review", () => {
    const clean = issueComment({ updatedAt: "2026-07-20T10:00:00Z" });
    const pendingReview = review({ state: "PENDING" });
    Reflect.deleteProperty(pendingReview, "submitted_at");

    expect(evaluate({ issueComments: [clean], reviews: [pendingReview] }).state).toBe("failure");
  });

  it("does not let a review borrow updated_at when submitted_at is missing", () => {
    const clean = issueComment({ updatedAt: "2026-07-20T10:00:00Z" });
    const pendingReview = review({ state: "PENDING" });
    Reflect.deleteProperty(pendingReview, "submitted_at");
    pendingReview.updated_at = "2026-07-20T09:00:00Z";

    expect(evaluate({ issueComments: [clean], reviews: [pendingReview] }).state).toBe("failure");
  });

  it("does not classify a malformed nonempty review commit_id as elsewhere", () => {
    const olderClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
    const malformedFinding = review({
      commitId: "not-a-full-sha",
      submittedAt: "2026-07-20T11:00:00Z"
    });

    expect(evaluate({ issueComments: [olderClean], reviews: [malformedFinding] }).state).toBe("failure");
  });

  it("ignores malformed untrusted requests and valid old-head evidence", () => {
    const currentClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
    const untrustedRequest = reviewRequest({
      authorAssociation: "CONTRIBUTOR",
      updatedAt: "not-a-date"
    });
    const oldHeadFinding = review({
      commitId: other,
      submittedAt: "2026-07-20T11:00:00Z"
    });

    expect(evaluate({ issueComments: [currentClean, untrustedRequest] }).state).toBe("success");
    expect(evaluate({ issueComments: [currentClean], reviews: [oldHeadFinding] }).state).toBe("success");
  });

  it.each(["missing", "invalid"])(
    "fails closed on an authenticated old-head review with a %s submitted_at",
    (timestampKind) => {
      const currentClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
      const malformedOldHeadReview = review({
        commitId: other,
        submittedAt: "not-a-date"
      });
      if (timestampKind === "missing") {
        Reflect.deleteProperty(malformedOldHeadReview, "submitted_at");
      }

      expect(evaluate({ issueComments: [currentClean], reviews: [malformedOldHeadReview] }).state).toBe("failure");
    }
  );

  it("fails closed on tied timestamps when one artifact is not clean", () => {
    expect(evaluate({ issueComments: [issueComment()], reviews: [review()] }).state).toBe("failure");
  });

  it.each([
    ["the clean core only", cleanBody()],
    ["the exact PR #128 About Codex suffix", `${cleanBody()}\n\n${aboutCodex}`],
    [
      "CRLF plus whitespace on blank boilerplate lines",
      `${cleanBody()}\n\n${aboutCodex}`
        .split("\n")
        .map((line) => line.length > 0 ? line : " \t")
        .join("\r\n")
    ]
  ])("accepts %s", (_name, body) => {
    expect(evaluate({ issueComments: [issueComment({ body })] }).state).toBe("success");
  });

  it.each([
    ["unknown leading text", `Review result\n\n${cleanBody()}`],
    ["quoted clean text", cleanBody().split("\n").map((line) => `> ${line}`).join("\n")],
    ["changed capitalization", cleanBody().replace("Reviewed commit", "reviewed commit")],
    ["an extra result section", `${cleanBody()}\n\n### Result\nNo findings.`],
    ["duplicate commit lines", `${cleanBody()}\n**Reviewed commit:** \`379bc414a9\``],
    ["unknown details", `${cleanBody()}\n\n<details><summary>Other</summary>text</details>`]
  ])("does not accept %s", (_name, body) => {
    expect(evaluate({ issueComments: [issueComment({ body })] }).state).not.toBe("success");
  });

  it("rejects the verified current-head findings review shape", () => {
    expect(evaluate({ reviews: [review()] }).state).toBe("failure");
  });

  it.each([
    ["COMMENTED", "success"],
    ["DISMISSED", "failure"],
    ["APPROVED", "failure"],
    ["CHANGES_REQUESTED", "failure"],
    ["PENDING", "failure"],
    ["UNKNOWN_STATE", "failure"]
  ])("treats a clean-looking %s review as %s", (state, expected) => {
    const cleanReview = review({ body: cleanBody(), state });

    expect(evaluate({ reviews: [cleanReview] }).state).toBe(expected);
  });

  it("does not accept a clean-looking review whose state is missing", () => {
    const cleanReview = review({ body: cleanBody() });
    Reflect.deleteProperty(cleanReview, "state");

    expect(evaluate({ reviews: [cleanReview] }).state).toBe("failure");
  });

  it("keeps a service error pending and lets a newer one block an older clean result", () => {
    const serviceError = issueComment({
      body: "Codex couldn't create an environment for this repo.",
      id: 5_043_461_980,
      updatedAt: "2026-07-20T11:00:00Z"
    });
    const olderClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });

    expect(evaluate({ issueComments: [serviceError] }).state).toBe("pending");
    expect(evaluate({ issueComments: [olderClean, serviceError] }).state).toBe("failure");
  });

  it("rejects an authentic unknown completion for the current head", () => {
    const unknown = review({ body: "Codex Review completed without a recognized outcome." });

    expect(evaluate({ reviews: [unknown] }).state).toBe("failure");
  });
});

describe("Codex test-merge review runtime", () => {
  it.each(["00128", "+128", "128.0", "1e2", " 128 "])(
    "rejects the non-canonical pull-request number %j before API access",
    async (prNumber) => {
      const execution = await runRuntime(responses(), stringRecord([["PR_NUMBER", prNumber]]));

      expect(execution.status).toBe(1);
      expect(execution.stderr).toContain("Invalid repository or pull-request number");
      expect(execution.requests).toEqual([]);
    }
  );

  it.each([
    ["missing", null],
    ["different", "contributor/metronome"]
  ])("fails closed for a %s live head repository without metadata reads", async (_name, headRepository) => {
    const execution = await runRuntime(responses({}, [pullResponse({ headRepository })]));

    expect(execution.status).toBe(1);
    expect(execution.requests).toEqual([getRequest(pullPath)]);
  });

  it.each([
    ["a non-main ref", pullResponse({ baseRef: "release" })],
    ["a missing base repository", pullWithoutBaseField("repo")],
    ["a malformed base repository", pullResponse({ baseRepository: null })],
    ["an unexpected base repository", pullResponse({ baseRepository: "other/metronome" })],
    ["a missing base ref", pullWithoutBaseField("ref")],
    ["a malformed base ref", pullResponse({ baseRef: 42 })]
  ])("keeps %s non-successful", async (_name, pull) => {
    const execution = await runRuntime(responses({}, [pull]));

    expect(execution.status).toBe(1);
    expect(execution.requests).toEqual([getRequest(pullPath)]);
  });

  it.each([
    ["a closed pull request", pullResponse({ state: "closed" })],
    ["a missing state", pullWithoutField("state")],
    ["a draft pull request", pullResponse({ draft: true })],
    ["a missing draft flag", pullWithoutField("draft")],
    ["a conflicting pull request", pullResponse({ mergeable: false })],
    ["unknown mergeability", pullResponse({ mergeable: null })],
    ["a missing mergeability flag", pullWithoutField("mergeable")],
    ["a missing base SHA", pullWithoutBaseField("sha")],
    ["a malformed base SHA", pullResponse({ baseSha: "not-a-sha" })],
    ["a malformed head SHA", pullResponse({ headSha: null })],
    ["a missing test-merge SHA", pullWithoutField("merge_commit_sha")],
    ["a malformed test-merge SHA", pullResponse({ mergeCommitSha: "not-a-sha" })],
    ["a head SHA reused as the test-merge SHA", pullResponse({ mergeCommitSha: head })],
    ["a base SHA reused as the test-merge SHA", pullResponse({ mergeCommitSha: baseSha })]
  ])("fails closed before publication for %s", async (_name, pull) => {
    const execution = await runRuntime(responses({}, [pull]));

    expect(execution.status).toBe(1);
    expect(execution.requests).toEqual([getRequest(pullPath)]);
  });

  it.each([
    ["head SHA", pullResponse({ headSha: other })],
    ["base ref", pullResponse({ baseRef: "release" })],
    ["base SHA", pullResponse({ baseSha: otherBaseSha })],
    ["test-merge SHA", pullResponse({ mergeCommitSha: otherMergeSha })],
    ["mergeability", pullResponse({ mergeable: false })],
    ["draft state", pullResponse({ draft: true })],
    ["open state", pullResponse({ state: "closed" })]
  ])("never publishes a stale terminal result when the final %s changes", async (_name, latestPull) => {
    const execution = await runRuntime(responses({
      [page(commentsPath)]: { body: [issueComment()] },
      [page(`${pullPath}/commits`)]: { body: [record([["sha", head]])] }
    }, [pullResponse(), latestPull]));

    expect(execution.status).toBe(1);
    expect(execution.requests.filter((request) => request.method === "POST")).toEqual([
      statusRequest(mergeSha, "pending", "No verified Codex review for current head")
    ]);
  });

  it("fetches issue events and rejects clean evidence before the latest base change", async () => {
    const execution = await runRuntime(responses({
      [page(commentsPath)]: {
        body: [issueComment({ updatedAt: "2026-07-20T10:00:00Z" })]
      },
      [page(eventsPath)]: {
        body: [issueEvent({ createdAt: "2026-07-20T11:00:00Z" })]
      },
      [page(`${pullPath}/commits`)]: { body: [record([["sha", head]])] }
    }));

    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.requests).toContainEqual(getRequest(page(eventsPath)));
    expect(execution.requests.some((request) => hasState(request, "success"))).toBe(false);
  });

  it("fetches issue events and rejects clean evidence before the latest force push", async () => {
    const execution = await runRuntime(responses({
      [page(commentsPath)]: {
        body: [issueComment({ updatedAt: "2026-07-20T10:00:00Z" })]
      },
      [page(eventsPath)]: {
        body: [issueEvent({ createdAt: "2026-07-20T11:00:00Z", event: "head_ref_force_pushed" })]
      },
      [page(`${pullPath}/commits`)]: { body: [record([["sha", head]])] }
    }));

    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.requests.filter((request) => request.method === "POST")).toEqual([
      statusRequest(mergeSha, "pending", "No verified Codex review for current head"),
      statusRequest(mergeSha, "pending", "No verified Codex review for current head")
    ]);
  });

  it("aggregates metadata pages and publishes pending before reads then success to an unchanged test merge", async () => {
    const wrongUser = { id: 1, login: "someone-else" };
    const fillerComments = Array.from({ length: 100 }, (_, index) => issueComment({ id: index + 1, user: wrongUser }));
    const fillerReviews = Array.from({ length: 100 }, (_, index) => review({ id: index + 1, user: wrongUser }));
    const fillerCommits = Array.from({ length: 100 }, (_, index) => record([["sha", index.toString(16).padStart(40, "0")]]));
    const execution = await runRuntime(responses({
      [page(`${pullPath}/reviews`)]: { body: fillerReviews },
      [page(`${pullPath}/reviews`, 2)]: { body: [] },
      [page(commentsPath)]: { body: fillerComments },
      [page(commentsPath, 2)]: { body: [issueComment()] },
      [page(`${pullPath}/commits`)]: { body: fillerCommits },
      [page(`${pullPath}/commits`, 2)]: { body: [record([["sha", head]])] }
    }));

    expect(execution.status, execution.stderr).toBe(0);
    const writes = execution.requests.filter((request) => request.method === "POST");
    expect(writes).toEqual([
      statusRequest(mergeSha, "pending", "No verified Codex review for current head"),
      statusRequest(mergeSha, "success", "Verified clean Codex review for current head")
    ]);
    expect(writes.some((request) => request.path === statusPath(head))).toBe(false);
    const pendingIndex = execution.requests.indexOf(writes[0]);
    const successIndex = execution.requests.indexOf(writes[1]);
    const metadataIndexes = execution.requests
      .map((request, index) => request.path.includes("per_page=100") ? index : -1)
      .filter((index) => index >= 0);
    const pullIndexes = execution.requests
      .map((request, index) => request.method === "GET" && request.path === pullPath ? index : -1)
      .filter((index) => index >= 0);
    expect(metadataIndexes).toHaveLength(7);
    expect(Math.min(...metadataIndexes)).toBeGreaterThan(pendingIndex);
    expect(pullIndexes).toHaveLength(2);
    expect(pullIndexes[1]).toBeGreaterThan(Math.max(...metadataIndexes));
    expect(successIndex).toBeGreaterThan(pullIndexes[1]);
  });

  it("derives the trusted review-request barrier from fetched issue-comment API data", async () => {
    const olderClean = issueComment({ updatedAt: "2026-07-20T09:00:00Z" });
    const request = reviewRequest({ authorAssociation: "COLLABORATOR" });
    const execution = await runRuntime(responses({
      [page(commentsPath)]: { body: [olderClean, request] },
      [page(`${pullPath}/commits`)]: { body: [record([["sha", head]])] }
    }));

    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.requests.filter((httpRequest) => httpRequest.method === "POST")).toEqual([
      statusRequest(mergeSha, "pending", "No verified Codex review for current head"),
      statusRequest(mergeSha, "pending", "No verified Codex review for current head")
    ]);
    expect(execution.requests.some((httpRequest) => hasState(httpRequest, "success"))).toBe(false);
  });

  it("rereads identity before publishing an error to the captured test merge", async () => {
    const execution = await runRuntime(responses({
      [page(`${pullPath}/reviews`)]: { body: {}, status: 500 }
    }));

    expect(execution.status).toBe(1);
    expect(execution.stderr).toContain("GitHub API 500");
    expect(execution.requests.filter((request) => request.method === "POST")).toEqual([
      statusRequest(mergeSha, "pending", "No verified Codex review for current head"),
      statusRequest(mergeSha, "error", "Codex review metadata could not be evaluated")
    ]);
    expect(execution.requests.filter((request) => request.path === pullPath)).toHaveLength(2);
  });

  it("exits nonzero and stops before metadata when pending publication fails", async () => {
    const execution = await runRuntime(responses({}, [pullResponse()], 500));

    expect(execution.status).toBe(1);
    expect(execution.stderr).toContain(`GitHub API 500 for ${statusPath(mergeSha)}`);
    expect(execution.requests).toEqual([
      getRequest(pullPath),
      statusRequest(mergeSha, "pending", "No verified Codex review for current head")
    ]);
  });

  it("leaves a regenerated test merge without a terminal result", async () => {
    const execution = await runRuntime(responses({
      [page(commentsPath)]: { body: [issueComment()] },
      [page(`${pullPath}/commits`)]: { body: [record([["sha", head]])] }
    }, [pullResponse(), pullResponse({ mergeCommitSha: otherMergeSha })]));

    expect(execution.status).toBe(1);
    expect(execution.requests.filter((request) => request.method === "POST")).toEqual([
      statusRequest(mergeSha, "pending", "No verified Codex review for current head")
    ]);
    expect(execution.requests.some((request) => hasState(request, "success"))).toBe(false);
  });
});

const expectedPrivilegedWorkflow = [
  "name: Codex test-merge review",
  "",
  "on:",
  "  pull_request_target:",
  "    branches: [main]",
  "    types: [opened, reopened, synchronize, edited, converted_to_draft, ready_for_review]",
  "  issue_comment:",
  "    types: [created, edited, deleted]",
  "  pull_request_review:",
  "    types: [submitted, edited, dismissed]",
  "  repository_dispatch:",
  "    types: [codex_exact_head_review_recovery]",
  "",
  "permissions:",
  "  contents: read",
  "  issues: read",
  "  pull-requests: read",
  "  statuses: write",
  "",
  "jobs:",
  "  evaluate:",
  "    if: >-",
  "      github.event_name != 'issue_comment' ||",
  "      (github.event.issue.pull_request &&",
  "        ((github.event.comment.user.login == 'chatgpt-codex-connector[bot]' &&",
  "          github.event.comment.user.id == 199175422) ||",
  "         contains(fromJSON('[\"OWNER\",\"MEMBER\",\"COLLABORATOR\"]'), github.event.comment.author_association)))",
  "    concurrency:",
  `      group: codex-test-merge-${githubExpression("github.event.pull_request.number || github.event.issue.number || github.event.client_payload.pr_number")}`,
  "      cancel-in-progress: true",
  "    runs-on: ubuntu-latest",
  "    steps:",
  "      - name: Check out default branch",
  "        uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4",
  "        with:",
  `          ref: ${githubExpression("github.event.repository.default_branch")}`,
  "          persist-credentials: false",
  "",
  "      - name: Set up Node.js",
  "        uses: actions/setup-node@a0853c24544627f65ddf259abe73b1d18a591444 # v5",
  "        with:",
  "          node-version-file: .nvmrc",
  "",
  "      - name: Evaluate current pull-request test merge",
  "        run: node scripts/evaluate-codex-exact-head-review.mjs",
  "        env:",
  `          GITHUB_API_URL: ${githubExpression("github.api_url")}`,
  `          GITHUB_REPOSITORY: ${githubExpression("github.repository")}`,
  `          GITHUB_TOKEN: ${githubExpression("secrets.GITHUB_TOKEN")}`,
  `          PR_NUMBER: ${githubExpression("github.event.pull_request.number || github.event.issue.number || github.event.client_payload.pr_number")}`,
  `          RUN_URL: ${githubExpression("github.server_url")}/${githubExpression("github.repository")}/actions/runs/${githubExpression("github.run_id")}`
].join("\n");

describe("Repository workflow privilege boundary", () => {
  it("enumerates workflows in sorted order and permits only the five independent status publishers", () => {
    const names = workflowFiles.map((entry) => entry.name);
    const privileged = workflowFiles.filter((entry) => usesProtectedStatusPublisher(entry.source))
      .map((entry) => entry.name);

    for (let index = 1; index < names.length; index += 1) {
      expect(names[index - 1].localeCompare(names[index])).toBeLessThanOrEqual(0);
    }

    expect(privileged).toEqual([
      "ci.yml",
      "codex-exact-head-review.yml",
      "metronome-debt-gates.yml",
      "metronome-xo-gate.yml",
      "windows-observability.yml"
    ]);
  });

  it("rejects duplicate top-level workflow control blocks", () => {
    for (const entry of workflowFiles) {
      expect(topLevelYamlKeyCount(entry.source, "on"), `${entry.name}: on`).toBe(1);
      expect(topLevelYamlKeyCount(entry.source, "jobs"), `${entry.name}: jobs`).toBe(1);
      expect(topLevelYamlKeyCount(entry.source, "permissions"), `${entry.name}: permissions`).toBeLessThanOrEqual(1);
      expect(topLevelYamlKeyCount(entry.source, "concurrency"), `${entry.name}: concurrency`).toBeLessThanOrEqual(1);
    }
  });

  it("locks the complete normalized privileged workflow definition", () => {
    expect(normalizeWorkflow(workflow)).toBe(expectedPrivilegedWorkflow);
  });

  it("reserves the required Codex context to the shared allowlisted mapper alone", () => {
    const owners = publisherFiles.filter((entry) => entry.source.includes(context))
      .map((entry) => entry.name);
    const obsoleteContext = ["Metronome Codex", "exact-head review"].join(" ");
    const obsoleteOwners = publisherFiles.filter((entry) => entry.source.includes(obsoleteContext))
      .map((entry) => entry.name);

    expect(owners).toEqual(["scripts/test-merge-status-reporter.mjs"]);
    expect(obsoleteOwners).toEqual([]);
  });
});

describe("Codex test-merge review workflow", () => {
  it("uses only the owner-approved default-definition trigger allowlist", () => {
    const triggerBlock = topLevelYamlBlock(workflow, "on");

    expect(yamlKeys(triggerBlock)).toEqual([
      "pull_request_target",
      "issue_comment",
      "pull_request_review",
      "repository_dispatch"
    ]);
    expect(triggerBlock).toBe([
      "  pull_request_target:",
      "    branches: [main]",
      "    types: [opened, reopened, synchronize, edited, converted_to_draft, ready_for_review]",
      "  issue_comment:",
      "    types: [created, edited, deleted]",
      "  pull_request_review:",
      "    types: [submitted, edited, dismissed]",
      "  repository_dispatch:",
      "    types: [codex_exact_head_review_recovery]"
    ].join("\n"));
    for (const unsafeTrigger of [
      "pull_request",
      "merge_group",
      "workflow_dispatch",
      "schedule",
      "workflow_run"
    ]) {
      expect(yamlKeys(triggerBlock)).not.toContain(unsafeTrigger);
    }
  });

  it("keeps exact minimal permissions and filters issue comments to pull requests", () => {
    expect(topLevelYamlBlock(workflow, "permissions")).toBe([
      "  contents: read",
      "  issues: read",
      "  pull-requests: read",
      "  statuses: write"
    ].join("\n"));
  });

  it("filters issue comments before they enter trusted PR concurrency", () => {
    const job = topLevelYamlBlock(workflow, "jobs");

    expect(topLevelYamlKeyCount(workflow, "concurrency")).toBe(0);
    expect(job).toContain([
      "    if: >-",
      "      github.event_name != 'issue_comment' ||",
      "      (github.event.issue.pull_request &&",
      "        ((github.event.comment.user.login == 'chatgpt-codex-connector[bot]' &&",
      "          github.event.comment.user.id == 199175422) ||",
      "         contains(fromJSON('[\"OWNER\",\"MEMBER\",\"COLLABORATOR\"]'), github.event.comment.author_association)))",
      "    concurrency:",
      `      group: codex-test-merge-${githubExpression("github.event.pull_request.number || github.event.issue.number || github.event.client_payload.pr_number")}`,
      "      cancel-in-progress: true"
    ].join("\n"));
  });

  it("locks the complete evaluator job to default-branch, evaluator-only execution", () => {
    expect(topLevelYamlBlock(workflow, "jobs")).toBe(topLevelYamlBlock(expectedPrivilegedWorkflow, "jobs"));
  });
});

describe("Windows observability workflow", () => {
  it("always runs from the trusted PR definition and on main pushes without path filters", () => {
    const triggerBlock = topLevelYamlBlock(windowsWorkflow, "on");

    expect(yamlKeys(triggerBlock)).toEqual(["pull_request_target", "push"]);
    expect(triggerBlock).toBe([
      "  pull_request_target:",
      "    branches: [main]",
      "    types: [opened, reopened, synchronize, edited, converted_to_draft, ready_for_review]",
      "  push:",
      "    branches:",
      "      - main"
    ].join("\n"));
    expect(triggerBlock.split("\n").some((line) => ["paths:", "paths-ignore:"].includes(line.trim()))).toBe(false);
  });
});
