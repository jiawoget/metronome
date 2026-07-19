#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const required = [
  ".codescene/code-health-rules.json",
  ".codescene/quality-gate-policy.md",
  ".semgrep/metronome-architecture.yml",
  ".semgrep/metronome-duplication.yml",
  ".semgrep/metronome-library-primitives.yml",
  ".semgrep/metronome-ui-ownership.yml",
  "skills/code_review.md",
  "scripts/run-metronome-semgrep-changed.mjs",
  "scripts/run-metronome-semgrep-changed.selftest.mjs",
  "scripts/validate-pr-debt-contract.mjs",
  "scripts/validate-pr-debt-contract.selftest.mjs",
  ".github/workflows/metronome-debt-gates.yml",
  ".github/pull_request_template.md",
  "skills/metronome_planner.md",
  "skills/metronome_coder.md",
  "skills/metronome_reviewer.md",
  "skills/metronome_chatgpt_review.md",
  "AGENTS.md",
  ".agents/skills/metronome-workflow/SKILL.md",
  "docs/architecture/debt-gate-map.md",
  "docs/v1/implementation-slices/rules/external-library-first.md"
];

const requiredContent = {
  "scripts/run-metronome-semgrep-changed.selftest.mjs": [
    "staged-only candidate",
    "unchanged baseline finding",
    "new staged finding",
    "unstaged drift",
    "untracked candidate shadow",
    "ignored candidate shadow",
    "case-only rename",
    "Semgrep changed-file selftest passed."
  ],
  "skills/code_review.md": [
    "canonical hard-gate workflow",
    "skills/metronome_reviewer.md",
    "Additional Known Debt Patterns"
  ],
  "skills/metronome_planner.md": [
    ".agents/skills/metronome-workflow/SKILL.md",
    "Required Input Packet",
    "Planning Workflow",
    "Hard Fail",
    "Skill Evidence",
    "Existing Primitive Search",
    "New Surface Budget",
    "Shared Primitive Call-Site Audit",
    "PLAN_READY / PLAN_BLOCKED",
    "BLOCKER_CODE",
    "provider_fallback",
    "Interim Monitor Handoff",
    "docs/v1/implementation-slices/rules/external-library-first.md",
    "Capability Delivery Map",
    "Read-Only Admission Projection",
    "<actual-top-level-verdict>",
    "read-only decision sample"
  ],
  "skills/metronome_coder.md": [
    ".agents/skills/metronome-workflow/SKILL.md",
    "Required Input Packet",
    "Coding Workflow",
    "Forbidden Without Hard Evidence",
    "Skill Evidence",
    "Required PR Body Evidence",
    "CODE_READY / BLOCKED",
    "Capability Implementation Map",
    "Capability plan path",
    "Conditional reuse-admission conformance",
    "monitor-owned"
  ],
  "skills/metronome_reviewer.md": [
    ".agents/skills/metronome-workflow/SKILL.md",
    "Required Input Packet",
    "Review Workflow",
    "CodeScene MCP `analyze_change_set`",
    "gate-control PR",
    "Semgrep pre-review",
    "Immediate CHANGES_REQUIRED",
    "Skill Evidence",
    "Net surface delta",
    "PASS / PASS_WITH_NITS / CHANGES_REQUIRED",
    "FINDING_CODE",
    "Immutable Plan Review",
    "Candidate Review",
    "PLAN_REVIEW_PASS",
    "LOCAL_POLICY_APPROVED",
    "Read-Only Candidate Projection",
    "<actual-stable-code-or-NONE>",
    "read-only decision sample"
  ],
  "skills/metronome_chatgpt_review.md": [
    ".agents/skills/metronome-workflow/SKILL.md",
    "Required Plan Review Packet",
    "Required PR Review Packet",
    "CodeScene Pre-Review",
    "Semgrep Pre-Review",
    "skill read evidence",
    "Evidence Checked",
    "CHANGES_REQUIRED",
    "Agent Gate Evidence",
    "FINDING_CODE",
    "LOCAL_POLICY_APPROVED",
    "reuse-admission conformance applicability",
    "hidden-oracle agreement"
  ],
  "scripts/validate-pr-debt-contract.mjs": [
    String.raw`package\.json`,
    String.raw`package-lock\.json`,
    "positiveStatusPattern",
    "blockingEvidencePattern",
    "exactly PASS or PASS_WITH_NITS",
    "Overlay plan path",
    "validateImmutableOverlayPlanIdentity",
    "MSO-5",
    "PENDING",
    "quality_gates: passed",
    "Codex final review prompt/verdict",
    "validateReuseProof",
    "--plan-input",
    "Capability Delivery Map",
    "Capability Implementation Map",
    "Capability plan path",
    "generic-operation:",
    "platform:",
    "reuseAdmissionControlFiles",
    "validateReuseAdmissionConformance",
    "Reuse-admission conformance applicability",
    "Reuse-admission conformance status",
    "Reuse-admission conformance Capability plan identity reference",
    "Reuse-admission conformance candidate HEAD",
    "RED baseline commit",
    "RED families with at least one oracle mismatch",
    "GREEN negative cases matched",
    "answer-neutral verdict",
    ".github/workflows/metronome-debt-gates.yml"
  ],
  "scripts/validate-pr-debt-contract.selftest.mjs": [
    "commitPackageManifestChange",
    "not passed",
    "not PASS",
    "CHANGES_REQUIRED; PASS later",
    "Overlay plan path",
    "MSO-5",
    "PENDING",
    "Codex final review prompt/verdict",
    "reuseAdmissionControlFiles",
    "nonTriggerPaths",
    "wrongApplicability",
    "RED baseline commit",
    "GREEN metamorphic pairs matched",
    "answer-neutral enum",
    "hidden oracle"
  ],
  ".github/workflows/metronome-debt-gates.yml": ["edited", "ready_for_review"],
  ".github/pull_request_template.md": [
    "Planner skill read evidence",
    "Coder skill read evidence",
    "Reviewer skill read evidence",
    "Codex final review prompt/verdict",
    "Overlay plan path",
    "Current metronome Stage",
    "MSO-5",
    "PENDING",
    "Capability ID",
    "Capability Implementation Map",
    "Capability plan path",
    "Capability plan commit",
    "Capability plan blob",
    "Capability plan SHA-256",
    "LOCAL_POLICY_APPROVED",
    "Reuse-admission conformance applicability",
    "Reuse-admission conformance status",
    "Reuse-admission conformance Capability plan identity reference",
    "Reuse-admission conformance candidate HEAD",
    "RED families with at least one oracle mismatch: 4/4",
    "GREEN negative cases matched: 8/8",
    "actual-code-or-NONE"
  ],
  "AGENTS.md": [".agents/skills/metronome-workflow/SKILL.md"],
  ".agents/skills/metronome-workflow/SKILL.md": [
    "Superpowers Task is the Metronome Stage",
    "unexpected production LOC growth",
    "Code Health decline",
    "scope expansion",
    "unplanned wrapper/public API",
    "explicit user decision",
    "Never route diagnosis, fix, or review to GPT-5.6 Sol",
    "superpowers:executing-plans",
    "superpowers:subagent-driven-development",
    "CodeScene is monitor-owned",
    "STAGE_BLOCKED"
  ],
  "docs/architecture/debt-gate-map.md": [
    "Shared Primitive Rule",
    "Boundary Rules",
    "Review Preflight Gates",
    "Gate-control changes always require PR debt-contract evidence",
    "package.json",
    "package-lock.json",
    "Agent Skill Load Gates",
    "CodeScene MCP `analyze_change_set`",
    "Repo Map Inputs",
    "Capability Admission Gate",
    "--plan-input",
    "Capability Delivery Map",
    "Capability Implementation Map",
    "provider_fallback",
    "LOCAL_POLICY_APPROVED",
    "BLOCKER_CODE",
    "FINDING_CODE",
    "Conditional Control Conformance",
    "reuseAdmissionControlFiles",
    "NOT_APPLICABLE",
    "current branch merge-base",
    "hidden oracle"
  ],
  "docs/v1/implementation-slices/rules/external-library-first.md": [
    "Universal Capability Admission",
    "Capability ID",
    "Capability Delivery Map",
    "Capability Implementation Map",
    "--plan-input",
    "provider_fallback",
    "LOCAL_POLICY_APPROVED",
    "BLOCKER_CODE",
    "FINDING_CODE",
    "Conditional Reuse-Admission Control Conformance",
    "scripts/validate-pr-debt-contract.selftest.mjs",
    ".github/workflows/metronome-debt-gates.yml",
    "Reuse-admission conformance applicability",
    "RED families with at least one oracle mismatch: 4/4",
    "twelve unique RED and twelve unique GREEN",
    "answer-neutral",
    "hidden oracle",
    "Pack F audio, music, recording, waveform, and timing work"
  ]
};

let isFailed = false;

function hasMissingRequiredContent(path, snippets) {
  const content = readFileSync(path, "utf8");
  let isMissing = false;
  for (const snippet of snippets) {
    if (!content.includes(snippet)) {
      console.error(`Missing required debt gate content in ${path}: ${snippet}`);
      isMissing = true;
    }
  }

  return isMissing;
}

for (const path of required) {
  if (existsSync(path)) {
    continue;
  }

  console.error(`Missing required debt gate file: ${path}`);
  isFailed = true;
}

for (const [path, snippets] of Object.entries(requiredContent)) {
  if (!existsSync(path)) {
    continue;
  }

  if (hasMissingRequiredContent(path, snippets)) {
    isFailed = true;
  }
}

try {
  const config = JSON.parse(
    readFileSync(".codescene/code-health-rules.json", "utf8")
  );
  if (!Array.isArray(config.rule_sets)) {
    console.error(
      ".codescene/code-health-rules.json must contain rule_sets array."
    );
    isFailed = true;
  }
} catch (error) {
  console.error(
    `Invalid CodeScene JSON: ${error instanceof Error ? error.message : String(error)}`
  );
  isFailed = true;
}

if (isFailed) {
  process.exit(1);
}

console.log("Metronome debt gate package files are present.");

const semgrepSelftestResult = spawnSync(
  process.execPath,
  ["scripts/run-metronome-semgrep-changed.selftest.mjs"],
  { stdio: "inherit" }
);
if (semgrepSelftestResult.status !== 0) {
  process.exit(semgrepSelftestResult.status ?? 1);
}

const selftestResult = spawnSync(
  process.execPath,
  ["scripts/validate-pr-debt-contract.selftest.mjs"],
  { stdio: "inherit" }
);
if (selftestResult.status !== 0) {
  process.exit(selftestResult.status ?? 1);
}

const contractResult = spawnSync(
  process.execPath,
  ["scripts/validate-pr-debt-contract.mjs"],
  { stdio: "inherit" }
);
process.exit(contractResult.status ?? 1);
