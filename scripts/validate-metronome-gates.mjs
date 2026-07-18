#!/usr/bin/env node
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import process from 'node:process';

const required = [
	'.codescene/code-health-rules.json',
	'.codescene/quality-gate-policy.md',
	'.semgrep/metronome-architecture.yml',
	'.semgrep/metronome-duplication.yml',
	'.semgrep/metronome-library-primitives.yml',
	'.semgrep/metronome-ui-ownership.yml',
	'skills/code_review.md',
	'scripts/run-metronome-semgrep-changed.mjs',
	"scripts/run-metronome-semgrep-changed.selftest.mjs",
	'scripts/validate-pr-debt-contract.mjs',
	'scripts/validate-pr-debt-contract.selftest.mjs',
	'.github/workflows/metronome-debt-gates.yml',
	'.github/pull_request_template.md',
	'skills/metronome_planner.md',
	'skills/metronome_coder.md',
	'skills/metronome_reviewer.md',
	'skills/metronome_chatgpt_review.md',
	'AGENTS.md',
	'.agents/skills/metronome-workflow/SKILL.md',
	'docs/architecture/debt-gate-map.md',
];

const requiredContent = {
	"scripts/run-metronome-semgrep-changed.selftest.mjs": [
		"staged-only candidate",
		"unchanged baseline finding",
		"new staged finding",
		"unstaged drift",
		"Semgrep changed-file selftest passed.",
	],
	'skills/code_review.md': [
		'canonical hard-gate workflow',
		'skills/metronome_reviewer.md',
		'Additional Known Debt Patterns',
	],
	'skills/metronome_planner.md': [
		'.agents/skills/metronome-workflow/SKILL.md',
		'Required Input Packet',
		'Planning Workflow',
		'Hard Fail',
		'Skill Evidence',
		'Existing Primitive Search',
		'New Surface Budget',
		'Shared Primitive Call-Site Audit',
		'PLAN_READY / BLOCKED',
	],
	'skills/metronome_coder.md': [
		'.agents/skills/metronome-workflow/SKILL.md',
		'Required Input Packet',
		'Coding Workflow',
		'Forbidden Without Hard Evidence',
		'Skill Evidence',
		'Required PR Body Evidence',
		'CODE_READY / BLOCKED',
	],
	'skills/metronome_reviewer.md': [
		'.agents/skills/metronome-workflow/SKILL.md',
		'Required Input Packet',
		'Review Workflow',
		'CodeScene MCP `analyze_change_set`',
		'gate-control PR',
		'Semgrep pre-review',
		'Immediate CHANGES_REQUIRED',
		'Skill Evidence',
		'Net surface delta',
		'PASS / PASS_WITH_NITS / CHANGES_REQUIRED',
	],
	'skills/metronome_chatgpt_review.md': [
		'.agents/skills/metronome-workflow/SKILL.md',
		'Required Plan Review Packet',
		'Required PR Review Packet',
		'CodeScene Pre-Review',
		'Semgrep Pre-Review',
		'skill read evidence',
		'Evidence Checked',
		'CHANGES_REQUIRED',
		'Agent Gate Evidence',
	],
	'scripts/validate-pr-debt-contract.mjs': [
		String.raw`package\.json`,
		String.raw`package-lock\.json`,
		'positiveStatusPattern',
		'blockingEvidencePattern',
		'exactly PASS or PASS_WITH_NITS',
		'Overlay plan path',
		'validateImmutableOverlayPlanIdentity',
		'MSO-5',
		'PENDING',
		'quality_gates: passed',
		'Codex final review prompt/verdict',
	],
	'scripts/validate-pr-debt-contract.selftest.mjs': [
		'commitPackageManifestChange',
		'not passed',
		'not PASS',
		'CHANGES_REQUIRED; PASS later',
		'Overlay plan path',
		'MSO-5',
		'PENDING',
		'Codex final review prompt/verdict',
	],
	'.github/workflows/metronome-debt-gates.yml': [
		'edited',
		'ready_for_review',
	],
	'.github/pull_request_template.md': [
		'Planner skill read evidence',
		'Coder skill read evidence',
		'Reviewer skill read evidence',
		'Codex final review prompt/verdict',
		'Overlay plan path',
		'Current metronome Stage',
		'MSO-5',
		'PENDING',
	],
	'AGENTS.md': [
		'.agents/skills/metronome-workflow/SKILL.md',
	],
	'.agents/skills/metronome-workflow/SKILL.md': [
		'Superpowers Task is the Metronome Stage',
		'unexpected production LOC growth',
		'Code Health decline',
		'scope expansion',
		'unplanned wrapper/public API',
		'explicit user decision',
		'Never route diagnosis, fix, or review to GPT-5.6 Sol',
		'superpowers:executing-plans',
		'superpowers:subagent-driven-development',
		'CodeScene is monitor-owned',
		'STAGE_BLOCKED',
	],
	'docs/architecture/debt-gate-map.md': [
		'Shared Primitive Rule',
		'Boundary Rules',
		'Review Preflight Gates',
		'Gate-control changes always require PR debt-contract evidence',
		'package.json',
		'package-lock.json',
		'Agent Skill Load Gates',
		'CodeScene MCP `analyze_change_set`',
		'Repo Map Inputs',
	],
};

let failed = false;

for (const path of required) {
	if (!existsSync(path)) {
		console.error(`Missing required debt gate file: ${path}`);
		failed = true;
	}
}

for (const [path, snippets] of Object.entries(requiredContent)) {
	if (!existsSync(path)) {
		continue;
	}

	const content = readFileSync(path, 'utf8');
	for (const snippet of snippets) {
		if (!content.includes(snippet)) {
			console.error(`Missing required debt gate content in ${path}: ${snippet}`);
			failed = true;
		}
	}
}

try {
	const config = JSON.parse(readFileSync('.codescene/code-health-rules.json', 'utf8'));
	if (!Array.isArray(config.rule_sets)) {
		console.error('.codescene/code-health-rules.json must contain rule_sets array.');
		failed = true;
	}
} catch (error) {
	console.error(`Invalid CodeScene JSON: ${error instanceof Error ? error.message : String(error)}`);
	failed = true;
}

if (failed) {
	process.exit(1);
}

console.log('Metronome debt gate package files are present.');

const semgrepSelftestResult = spawnSync(process.execPath, ["scripts/run-metronome-semgrep-changed.selftest.mjs"], {stdio: "inherit"});
if (semgrepSelftestResult.status !== 0) {
	process.exit(semgrepSelftestResult.status ?? 1);
}

const selftestResult = spawnSync(process.execPath, ['scripts/validate-pr-debt-contract.selftest.mjs'], {stdio: 'inherit'});
if (selftestResult.status !== 0) {
	process.exit(selftestResult.status ?? 1);
}

const contractResult = spawnSync(process.execPath, ['scripts/validate-pr-debt-contract.mjs'], {stdio: 'inherit'});
process.exit(contractResult.status ?? 1);
