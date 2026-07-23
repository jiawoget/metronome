import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { readFileSync } from "node:fs";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import process from "node:process";
import type { Readable } from "node:stream";
import { describe, expect, it } from "vitest";

const evaluator = path.join(process.cwd(), "scripts", "evaluate-codex-exact-head-review.mjs");
const workflow = readFileSync(
  path.join(process.cwd(), ".github", "workflows", "codex-exact-head-review.yml"),
  "utf8"
);
const windowsWorkflow = readFileSync(
  path.join(process.cwd(), ".github", "workflows", "windows-observability.yml"),
  "utf8"
);
const bot = { id: 199_175_422, login: "chatgpt-codex-connector[bot]" };
const repositoryOwner = { id: 123, login: "repository-owner" };
const repository = "jiawoget/metronome";
const head = "379bc414a9".padEnd(40, "1");
const other = "50a083f2".padEnd(40, "2");
const ambiguous = "379bc414a9".padEnd(40, "3");
const pullPath = "/repos/jiawoget/metronome/pulls/128";
const commentsPath = "/repos/jiawoget/metronome/issues/128/comments";
const context = "Metronome Codex exact-head review";
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

function topLevelYamlBlock(source: string, key: string) {
  const lines = source.replaceAll("\r\n", "\n").split("\n");
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

function pullResponse(headSha = head, headRepository: string | null = repository) {
  return record([
    ["base", record([["repo", record([["full_name", repository]])]])],
    [
      "head",
      record([
        ["repo", headRepository === null ? null : record([["full_name", headRepository]])],
        ["sha", headSha]
      ])
    ]
  ]);
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

describe("Codex exact-head review runtime", () => {
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
    const execution = await runRuntime(responses({}, [pullResponse(head, headRepository)]));

    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.requests).toEqual([
      getRequest(pullPath),
      statusRequest(head, "failure", "Fork-origin pull requests are unsupported")
    ]);
    expect(execution.requests.some((request) => hasState(request, "success"))).toBe(false);
  });

  it("aggregates metadata pages and publishes pending before reads then success after an unchanged-head read", async () => {
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
      statusRequest(head, "pending", "No verified Codex review for current head"),
      statusRequest(head, "success", "Verified clean Codex review for current head")
    ]);
    const pendingIndex = execution.requests.indexOf(writes[0]);
    const successIndex = execution.requests.indexOf(writes[1]);
    const metadataIndexes = execution.requests
      .map((request, index) => request.path.includes("per_page=100") ? index : -1)
      .filter((index) => index >= 0);
    const pullIndexes = execution.requests
      .map((request, index) => request.method === "GET" && request.path === pullPath ? index : -1)
      .filter((index) => index >= 0);
    expect(metadataIndexes).toHaveLength(6);
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
      statusRequest(head, "pending", "No verified Codex review for current head"),
      statusRequest(head, "pending", "No verified Codex review for current head")
    ]);
    expect(execution.requests.some((httpRequest) => hasState(httpRequest, "success"))).toBe(false);
  });

  it("publishes error to the captured head when metadata retrieval fails", async () => {
    const execution = await runRuntime(responses({
      [page(`${pullPath}/reviews`)]: { body: {}, status: 500 }
    }));

    expect(execution.status).toBe(1);
    expect(execution.stderr).toContain("GitHub API 500");
    expect(execution.requests.filter((request) => request.method === "POST")).toEqual([
      statusRequest(head, "pending", "No verified Codex review for current head"),
      statusRequest(head, "error", "Codex review metadata could not be evaluated")
    ]);
    expect(execution.requests.filter((request) => request.path === pullPath)).toHaveLength(1);
  });

  it("exits nonzero and stops before metadata when pending publication fails", async () => {
    const execution = await runRuntime(responses({}, [pullResponse()], 500));

    expect(execution.status).toBe(1);
    expect(execution.stderr).toContain(`GitHub API 500 for ${statusPath(head)}`);
    expect(execution.requests).toEqual([
      getRequest(pullPath),
      statusRequest(head, "pending", "No verified Codex review for current head")
    ]);
  });

  it("publishes pending to a changed live head and never publishes stale success", async () => {
    const execution = await runRuntime(responses({
      [page(commentsPath)]: { body: [issueComment()] },
      [page(`${pullPath}/commits`)]: { body: [record([["sha", head]])] }
    }, [pullResponse(), pullResponse(other)]));

    expect(execution.status, execution.stderr).toBe(0);
    expect(execution.requests.filter((request) => request.method === "POST")).toEqual([
      statusRequest(head, "pending", "No verified Codex review for current head"),
      statusRequest(other, "pending", "No verified Codex review for current head")
    ]);
    expect(execution.requests.some((request) => hasState(request, "success"))).toBe(false);
  });
});

describe("Codex exact-head review workflow", () => {
  it("uses only the owner-approved default-definition trigger allowlist", () => {
    const triggerBlock = topLevelYamlBlock(workflow, "on");

    expect(yamlKeys(triggerBlock)).toEqual([
      "pull_request_target",
      "issue_comment",
      "repository_dispatch"
    ]);
    expect(triggerBlock).toBe([
      "  pull_request_target:",
      "    branches: [main]",
      "    types: [opened, reopened, synchronize, ready_for_review]",
      "  issue_comment:",
      "    types: [created, edited, deleted]",
      "  repository_dispatch:",
      "    types: [codex_exact_head_review_recovery]"
    ].join("\n"));
    for (const unsafeTrigger of [
      "pull_request_review",
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
    expect(workflow).toContain("if: github.event_name != 'issue_comment' || github.event.issue.pull_request");
  });

  it("uses one simple PR-scoped concurrency group for every trusted trigger", () => {
    expect(topLevelYamlBlock(workflow, "concurrency")).toBe([
      `  group: codex-exact-head-${githubExpression("github.event.pull_request.number || github.event.issue.number || github.event.client_payload.pr_number")}`,
      "  cancel-in-progress: true"
    ].join("\n"));
  });

  it("locks the complete evaluator job to default-branch, evaluator-only execution", () => {
    expect(topLevelYamlBlock(workflow, "jobs")).toBe([
      "  evaluate:",
      "    if: github.event_name != 'issue_comment' || github.event.issue.pull_request",
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
      "      - name: Evaluate current pull-request head",
      "        run: node scripts/evaluate-codex-exact-head-review.mjs",
      "        env:",
      `          GITHUB_API_URL: ${githubExpression("github.api_url")}`,
      `          GITHUB_REPOSITORY: ${githubExpression("github.repository")}`,
      `          GITHUB_TOKEN: ${githubExpression("secrets.GITHUB_TOKEN")}`,
      `          PR_NUMBER: ${githubExpression("github.event.pull_request.number || github.event.issue.number || github.event.client_payload.pr_number")}`,
      `          RUN_URL: ${githubExpression("github.server_url")}/${githubExpression("github.repository")}/actions/runs/${githubExpression("github.run_id")}`
    ].join("\n"));
  });
});

describe("Windows observability workflow", () => {
  it("always runs for pull requests and main pushes without path filters", () => {
    const triggerBlock = topLevelYamlBlock(windowsWorkflow, "on");

    expect(yamlKeys(triggerBlock)).toEqual(["pull_request", "push"]);
    expect(triggerBlock).toBe([
      "  pull_request:",
      "  push:",
      "    branches:",
      "      - main"
    ].join("\n"));
    expect(triggerBlock.split("\n").some((line) => ["paths:", "paths-ignore:"].includes(line.trim()))).toBe(false);
  });
});
