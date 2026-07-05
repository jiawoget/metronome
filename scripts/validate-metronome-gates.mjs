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
	'docs/refactor/src-debt-inventory.template.md',
	'docs/refactor/primitive-check.template.md',
	'scripts/run-metronome-semgrep-changed.mjs',
	'scripts/validate-pr-debt-contract.mjs',
	'scripts/validate-pr-debt-contract.selftest.mjs',
	'.github/pull_request_template.md',
	'skills/metronome_planner.md',
	'skills/metronome_coder.md',
	'skills/metronome_reviewer.md',
	'skills/metronome_chatgpt_review.md',
	'docs/architecture/debt-gate-map.md',
];

const requiredContent = {
	'skills/code_review.md': [
		'canonical hard-gate workflow',
		'skills/metronome_reviewer.md',
		'Additional Known Debt Patterns',
	],
	'skills/metronome_planner.md': [
		'Required Input Packet',
		'Planning Workflow',
		'Hard Fail',
		'Existing Primitive Search',
		'New Surface Budget',
		'Shared Primitive Call-Site Audit',
		'PLAN_READY / BLOCKED',
	],
	'skills/metronome_coder.md': [
		'Required Input Packet',
		'Coding Workflow',
		'Forbidden Without Hard Evidence',
		'Required PR Body Evidence',
		'CODE_READY / BLOCKED',
	],
	'skills/metronome_reviewer.md': [
		'Required Input Packet',
		'Review Workflow',
		'CodeScene MCP `analyze_change_set`',
		'Semgrep pre-review',
		'Immediate CHANGES_REQUIRED',
		'Net surface delta',
		'PASS / PASS_WITH_NITS / CHANGES_REQUIRED',
	],
	'skills/metronome_chatgpt_review.md': [
		'Required Plan Review Packet',
		'Required PR Review Packet',
		'CodeScene Pre-Review',
		'Semgrep Pre-Review',
		'Evidence Checked',
		'CHANGES_REQUIRED',
		'Agent Gate Evidence',
	],
	'docs/architecture/debt-gate-map.md': [
		'Shared Primitive Rule',
		'Boundary Rules',
		'Review Preflight Gates',
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

const selftestResult = spawnSync(process.execPath, ['scripts/validate-pr-debt-contract.selftest.mjs'], {stdio: 'inherit'});
if (selftestResult.status !== 0) {
	process.exit(selftestResult.status ?? 1);
}

const contractResult = spawnSync(process.execPath, ['scripts/validate-pr-debt-contract.mjs'], {stdio: 'inherit'});
process.exit(contractResult.status ?? 1);
