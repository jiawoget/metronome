import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const evaluator = path.join(
  process.cwd(),
  "scripts",
  "evaluate-codex-exact-head-review.mjs"
);
const bot = { id: 199_175_422, login: "chatgpt-codex-connector[bot]" };
const head = "379bc414a9".padEnd(40, "1");
const other = "50a083f2".padEnd(40, "2");
const ambiguous = "379bc414a9".padEnd(40, "3");

type User = { id: number; login: string };

function record(entries: ReadonlyArray<readonly [string, unknown]>) {
  return Object.fromEntries(entries);
}

function cleanBody(prefix = "379bc414a9") {
  return [
    "Codex Review: Didn't find any major issues. :tada:",
    "",
    `**Reviewed commit:** \`${prefix}\``
  ].join("\n");
}

function issueComment(options: {
  body?: string;
  id?: number;
  updatedAt?: string;
  user?: User;
} = {}) {
  const {
    body = cleanBody(),
    id = 5_009_800_322,
    updatedAt = "2026-07-20T10:00:00Z",
    user = bot
  } = options;
  return record([
    ["body", body],
    ["created_at", updatedAt],
    ["id", id],
    ["updated_at", updatedAt],
    ["user", user]
  ]);
}

function review(options: {
  body?: string;
  commitId?: string;
  id?: number;
  submittedAt?: string;
  user?: User;
} = {}) {
  const {
    body = "### 💡 Codex Review\n\nHere are some automated review suggestions.",
    commitId = head,
    id = 4_753_387_658,
    submittedAt = "2026-07-20T10:00:00Z",
    user = bot
  } = options;
  return record([
    ["body", body],
    ["commit_id", commitId],
    ["id", id],
    ["state", "COMMENTED"],
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

  it("fails closed on tied timestamps when one artifact is not clean", () => {
    expect(evaluate({ issueComments: [issueComment()], reviews: [review()] }).state).toBe("failure");
  });

  it("accepts only the verified clean sentence with one reviewed-commit line", () => {
    const duplicateLine = `${cleanBody()}\n**Reviewed commit:** \`379bc414a9\``;

    expect(evaluate({ issueComments: [issueComment()] }).state).toBe("success");
    expect(evaluate({ issueComments: [issueComment({ body: duplicateLine })] }).state).not.toBe("success");
  });

  it("rejects the verified current-head findings review shape", () => {
    expect(evaluate({ reviews: [review()] }).state).toBe("failure");
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
