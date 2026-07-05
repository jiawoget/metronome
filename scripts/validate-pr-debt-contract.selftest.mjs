#!/usr/bin/env node
import assert from 'node:assert/strict';
import {execFileSync, spawnSync} from 'node:child_process';
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

function createRepo() {
	const cwd = mkdtempSync(path.join(tmpdir(), 'metronome-debt-contract-'));

	git(cwd, ['init']);
	git(cwd, ['config', 'user.email', 'test@example.com']);
	git(cwd, ['config', 'user.name', 'Test User']);
	write(cwd, 'src/lib/existing.ts', 'export const existing = 1;\n');
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

const validBody = `## Summary

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

- CodeScene MCP \`analyze_change_set\`: passed, no decline
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
- ChatGPT final review prompt/verdict: PASS
`;

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
	commitSourceChange(cwd);
	const result = runGate(cwd, validBody);
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
