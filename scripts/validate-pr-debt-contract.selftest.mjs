#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {mkdirSync, mkdtempSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import process from 'node:process';

const scriptPath = path.join(
	process.cwd(),
	'scripts',
	'validate-pr-debt-contract.mjs',
);

function git(cwd, args) {
	return execFileSync('git', args, {cwd, encoding: 'utf8', stdio: 'pipe'}).trim();
}

function write(cwd, file, content) {
	const fullPath = path.join(cwd, file);
	mkdirSync(path.dirname(fullPath), {recursive: true});
	writeFileSync(fullPath, content);
}

function createRepo({withGateControlFile = false} = {}) {
	const cwd = mkdtempSync(path.join(tmpdir(), 'metronome-debt-contract-'));

	git(cwd, ['init']);
	git(cwd, ['config', 'user.email', 'test@example.com']);
	git(cwd, ['config', 'user.name', 'Test User']);
	write(cwd, 'src/lib/existing.ts', 'export const existing = 1;\n');
	write(cwd, 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md', '# Overlay plan\n');
	if (withGateControlFile) {
		write(cwd, 'scripts/existing-gate.mjs', 'export const existingGate = true;\n');
	}

	git(cwd, ['add', '-A']);
	git(cwd, ['commit', '-m', 'base']);
	git(cwd, ['branch', '-M', 'main']);
	git(cwd, ['switch', '-c', 'feature']);

	return cwd;
}

function createEvent(cwd, body) {
	const eventPath = path.join(cwd, 'event.json');
	writeFileSync(
		eventPath,
		JSON.stringify({
			'pull_request': {body},
		}),
	);

	return eventPath;
}

function runGate(cwd, eventBody) {
	const eventPath = eventBody === undefined ? undefined : createEvent(cwd, eventBody);

	return spawnSync(process.execPath, [scriptPath], {
		cwd,
		encoding: 'utf8',
		env: {
			...process.env,
			BASE_REF: 'main',
			GITHUB_EVENT_PATH: eventPath ?? '',
		},
	});
}

function commitSourceChange(cwd) {
	write(cwd, 'src/lib/changed.ts', 'export const changed = 1;\n');
	git(cwd, ['add', '-A']);
	git(cwd, ['commit', '-m', 'change']);
}

function commitGateControlChange(cwd) {
	write(cwd, 'scripts/gate-package.mjs', 'export const gatePackage = true;\n');
	write(cwd, 'docs/architecture/debt-gate-map.md', '# Debt gate map\n');
	git(cwd, ['add', '-A']);
	git(cwd, ['commit', '-m', 'gate package change']);
}

function commitGateControlDeletion(cwd) {
	git(cwd, ['rm', 'scripts/existing-gate.mjs']);
	git(cwd, ['commit', '-m', 'delete gate package file']);
}

function commitPackageManifestChange(cwd) {
	write(
		cwd,
		'package.json',
		'{\n  "scripts": {\n    "validate:debt-gates": "node scripts/validate-metronome-gates.mjs"\n  }\n}\n',
	);
	git(cwd, ['add', 'package.json']);
	git(cwd, ['commit', '-m', 'package gate scripts']);
}

function commitAgentsRouterChange(cwd) {
	write(cwd, 'AGENTS.md', '# Router\n');
	git(cwd, ['add', 'AGENTS.md']);
	git(cwd, ['commit', '-m', 'add router']);
}

function commitMetronomeWorkflowSkillChange(cwd) {
	write(cwd, '.agents/skills/metronome-workflow/SKILL.md', '---\nname: metronome-workflow\n---\n');
	git(cwd, ['add', '.agents/skills/metronome-workflow/SKILL.md']);
	git(cwd, ['commit', '-m', 'add workflow skill']);
}

function createNonAncestorCommit(cwd) {
	const base = git(cwd, ['rev-parse', 'HEAD~1']);
	git(cwd, ['switch', '-c', 'non-ancestor', base]);
	write(cwd, 'non-ancestor-proof.txt', 'not on feature\n');
	git(cwd, ['add', 'non-ancestor-proof.txt']);
	git(cwd, ['commit', '-m', 'non-ancestor proof']);
	const commit = git(cwd, ['rev-parse', 'HEAD']);
	git(cwd, ['switch', 'feature']);
	return commit;
}

function validBody(cwd, {stage = 'MSO-6', chatGptVerdict = 'PASS'} = {}) {
	const planPath = 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md';
	const planCommit = git(cwd, ['rev-parse', 'HEAD']);
	const planBlob = git(cwd, ['rev-parse', `HEAD:${planPath}`]);
	const planSha256 = createHash('sha256').update(execFileSync('git', ['show', `HEAD:${planPath}`], {cwd})).digest('hex');

	return `## Summary

Tighten the debt gate.

## Reuse Proof

| Need | Existing primitive/library checked | Files read | Decision |
|---|---|---|---|
| debt contract validation | existing Semgrep/XO gates | package.json, scripts/run-xo-changed.mjs | Reuse |

Shared primitive call-site migration: no shared primitive extracted.

## Retired Surface

Not a debt-reduction PR; no retired surface.

## New Surface

No new surface.

## Boundary Delta

- UI -> browser adapter direct imports added: no
- Domain -> UI/service imports added: no
- Service passthrough methods added: no
- Repository direct callers reduced: no

## Debt Gate Evidence

- CodeScene MCP \`analyze_change_set\`: passed, no decline, quality_gates: passed
- \`npm run validate:debt-gates\`: passed
- \`npm run lint:debt:changed\`: passed
- \`npm run lint:xo:changed\`: passed
- \`npm run lint\`: passed
- \`npm run typecheck\`: passed
- \`npm run test:unit\`: passed
- \`npm run build\`: passed

## Agent Gate Evidence

- Planner skill read evidence: Skill file read: skills/metronome_planner.md
- Planner skill verdict: PLAN_READY
- Coder skill read evidence: Skill file read: skills/metronome_coder.md
- Coder repo map / primitive search: CODE_READY
- Reviewer skill read evidence: Skill file read: skills/metronome_reviewer.md
- Reviewer verdict: PASS
- ChatGPT final review prompt/verdict: ${chatGptVerdict}

- Overlay plan path: ${planPath}
- Overlay plan commit: ${planCommit}
- Overlay plan blob: ${planBlob}
- Overlay plan SHA-256: ${planSha256}
- Independent plan review policy: GPT-5.6 Luna standard
- Independent plan review verdict: PLAN_REVIEW_PASS
- Current metronome Stage: ${stage}
`;
}

function replaceLine(body, from, to) {
	const sourceLine = `${from}\n`;
	const index = body.indexOf(sourceLine);
	assert.notEqual(index, -1, `Missing source line in test body: ${from}`);
	return `${body.slice(0, index)}${to}\n${body.slice(index + sourceLine.length)}`;
}

function assertOverlayEvidenceFails(changeBody) {
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, changeBody(validBody(cwd)));
	assert.equal(result.status, 1);
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, replaceLine(validBody(cwd), '- Overlay plan path: docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md', '- Overlay plan path:'));
	assert.equal(result.status, 1, 'AGENTS.md change must require overlay promotion evidence');
}

{
	const cwd = createRepo();
	commitMetronomeWorkflowSkillChange(cwd);
	const result = runGate(cwd, replaceLine(validBody(cwd), '- Overlay plan path: docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md', '- Overlay plan path:'));
	assert.equal(result.status, 1, 'metronome-workflow skill change must require overlay promotion evidence');
}

assertOverlayEvidenceFails(body => replaceLine(body, '- Current metronome Stage: MSO-6', '- Current metronome Stage: MSO-unknown'));
assertOverlayEvidenceFails(body => replaceLine(body, '- Current metronome Stage: MSO-6', '- Current metronome Stage: MSO-6 later'));
assertOverlayEvidenceFails(body => replaceLine(body, '- Current metronome Stage: MSO-6', '- Current metronome Stage: MSO-5'));
assertOverlayEvidenceFails(body => replaceLine(body, '- Current metronome Stage: MSO-6', '- Current metronome Stage: MSO-6\n- Current metronome Stage: MSO-5'));
assertOverlayEvidenceFails(body => replaceLine(body, '- ChatGPT final review prompt/verdict: PASS', '- ChatGPT final review prompt/verdict: PENDING'));
assertOverlayEvidenceFails(body => replaceLine(body, '- ChatGPT final review prompt/verdict: PASS', '- ChatGPT final review prompt/verdict: PASS later'));
assertOverlayEvidenceFails(body => replaceLine(body, '- Independent plan review verdict: PLAN_REVIEW_PASS', '- Independent plan review verdict:'));
assertOverlayEvidenceFails(body => replaceLine(body, '- Independent plan review verdict: PLAN_REVIEW_PASS', '- Independent plan review verdict: PASS'));
{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const nonAncestorCommit = createNonAncestorCommit(cwd);
	const result = runGate(cwd, replaceLine(
		validBody(cwd),
		`- Overlay plan commit: ${git(cwd, ['rev-parse', 'HEAD'])}`,
		`- Overlay plan commit: ${nonAncestorCommit}`,
	));
	assert.equal(result.status, 1, 'a valid non-ancestor overlay plan commit must fail');
}

assertOverlayEvidenceFails(body => replaceLine(body, body.split('\n').find(line => line.startsWith('- Overlay plan commit:')), '- Overlay plan commit: malformed'));
assertOverlayEvidenceFails(body => replaceLine(body, body.split('\n').find(line => line.startsWith('- Overlay plan commit:')), `- Overlay plan commit: ${'0'.repeat(40)}`));
{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, replaceLine(validBody(cwd), `- Overlay plan blob: ${git(cwd, ['rev-parse', 'HEAD:docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md'])}`, '- Overlay plan blob:'));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Overlay plan blob must match the approved commit and current tracked plan\./v);
}

assertOverlayEvidenceFails(body => replaceLine(body, body.split('\n').find(line => line.startsWith('- Overlay plan blob:')), `- Overlay plan blob: ${'0'.repeat(40)}`));
assertOverlayEvidenceFails(body => replaceLine(body, body.split('\n').find(line => line.startsWith('- Overlay plan SHA-256:')), `- Overlay plan SHA-256: ${'0'.repeat(64)}`));
assertOverlayEvidenceFails(body => replaceLine(body, body.split('\n').find(line => line.startsWith('- Overlay plan SHA-256:')), `${body.split('\n').find(line => line.startsWith('- Overlay plan SHA-256:'))}\n- Overlay plan SHA-256: ${'0'.repeat(64)}`));
{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, replaceLine(validBody(cwd), '- Independent plan review policy: GPT-5.6 Luna standard', '- Independent plan review policy:'));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Independent plan review policy must be GPT-5\.6 Terra standard or GPT-5\.6 Luna standard\./v);
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, replaceLine(validBody(cwd), '- Independent plan review policy: GPT-5.6 Luna standard', '- Independent plan review policy: GPT-5.6 Sol standard'));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Independent plan review policy must be GPT-5\.6 Terra standard or GPT-5\.6 Luna standard\./v);
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, validBody(cwd));
	assert.equal(result.status, 0);
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, validBody(cwd, {stage: 'MSO-5', chatGptVerdict: 'PENDING'}));
	assert.equal(result.status, 0);
}

{
	const cwd = createRepo();
	commitMetronomeWorkflowSkillChange(cwd);
	const result = runGate(cwd, validBody(cwd));
	assert.equal(result.status, 0);
}

{
	const cwd = createRepo();
	commitMetronomeWorkflowSkillChange(cwd);
	const result = runGate(cwd, validBody(cwd, {stage: 'MSO-5', chatGptVerdict: 'PENDING'}));
	assert.equal(result.status, 0);
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const body = validBody(cwd);
	write(cwd, 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md', 'unstaged mutation\n');
	const result = runGate(cwd, body);
	assert.equal(result.status, 0, 'tracked overlay identity must ignore an unstaged plan mutation');
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const planCommit = git(cwd, ['rev-parse', 'HEAD']);
	write(cwd, 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md', '# Replaced overlay plan\n');
	git(cwd, ['add', 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md']);
	git(cwd, ['commit', '-m', 'replace overlay plan']);
	const result = runGate(cwd, replaceLine(validBody(cwd), `- Overlay plan commit: ${git(cwd, ['rev-parse', 'HEAD'])}`, `- Overlay plan commit: ${planCommit}`));
	assert.equal(result.status, 1, 'a stale approved plan blob must fail');
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(cwd, '');
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Pull request body is empty/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(
		cwd,
		'## Reuse Proof\n\nTODO\n\n## Retired Surface\n\nN/A\n',
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Missing section: New Surface/v);
}

{
	const cwd = createRepo();
	commitGateControlChange(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			'- ChatGPT final review prompt/verdict: PASS',
			'- ChatGPT final review prompt/verdict: not run yet',
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /ChatGPT final review prompt\/verdict must be exactly PASS or PASS_WITH_NITS/v);
}

{
	const cwd = createRepo({withGateControlFile: true});
	commitGateControlDeletion(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			'- ChatGPT final review prompt/verdict: PASS',
			'- ChatGPT final review prompt/verdict: not run yet',
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /ChatGPT final review prompt\/verdict must be exactly PASS or PASS_WITH_NITS/v);
}

{
	const cwd = createRepo();
	commitPackageManifestChange(cwd);
	const result = runGate(cwd, '');
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Pull request body is empty/v);
}

{
	const cwd = createRepo();
	commitPackageManifestChange(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			'- ChatGPT final review prompt/verdict: PASS',
			'- ChatGPT final review prompt/verdict: not run yet',
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /ChatGPT final review prompt\/verdict must be exactly PASS or PASS_WITH_NITS/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			'- `npm run lint`: passed',
			'- `npm run lint`: not passed',
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Debt Gate Evidence must include positive passed\/success output for: npm run lint/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			'- CodeScene MCP `analyze_change_set`: passed, no decline, quality_gates: passed',
			'- CodeScene MCP `analyze_change_set`: failed, not passed',
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Debt Gate Evidence must include CodeScene MCP analyze_change_set output with no decline and quality_gates: passed/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(cwd, replaceLine(
		validBody(cwd),
		'- CodeScene MCP `analyze_change_set`: passed, no decline, quality_gates: passed',
		'- CodeScene MCP `analyze_change_set`: passed, no decline',
	));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /quality_gates: passed/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			'- Reviewer verdict: PASS',
			'- Reviewer verdict: not PASS',
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Reviewer verdict must be exactly PASS or PASS_WITH_NITS/v);
}

assertOverlayEvidenceFails(body => replaceLine(body, '- Reviewer verdict: PASS', '- Reviewer verdict: PASS\n- Reviewer verdict: CHANGES_REQUIRED'));

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			'- ChatGPT final review prompt/verdict: PASS',
			'- ChatGPT final review prompt/verdict: CHANGES_REQUIRED; PASS later',
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /ChatGPT final review prompt\/verdict must be exactly PASS or PASS_WITH_NITS/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(cwd, validBody(cwd));
	assert.equal(result.status, 0);
	assert.match(result.stdout, /PR debt contract evidence sections are present and specific/v);
}

{
	const cwd = createRepo();
	commitGateControlChange(cwd);
	const result = runGate(cwd, validBody(cwd));
	assert.equal(result.status, 0);
	assert.match(result.stdout, /PR debt contract evidence sections are present and specific/v);
}

{
	const cwd = createRepo();
	commitPackageManifestChange(cwd);
	const result = runGate(cwd, validBody(cwd));
	assert.equal(result.status, 0);
	assert.match(result.stdout, /PR debt contract evidence sections are present and specific/v);
}

{
	const cwd = createRepo({withGateControlFile: true});
	commitGateControlDeletion(cwd);
	const result = runGate(cwd, validBody(cwd));
	assert.equal(result.status, 0);
	assert.match(result.stdout, /PR debt contract evidence sections are present and specific/v);
}

{
	const cwd = createRepo();
	write(
		cwd,
		'src/lib/risky.ts',
		'export function normalizeRiskyValue(value: string) {\n  return value.trim();\n}\n',
	);
	git(cwd, ['add', 'src/lib/risky.ts']);
	const result = runGate(cwd);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Local staged\/working-tree risky additions require PR debt contract evidence/v);
}

console.log('validate-pr-debt-contract selftest passed.');
