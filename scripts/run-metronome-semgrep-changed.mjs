#!/usr/bin/env node
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import process from 'node:process';

function runGit(args) {
	return execFileSync('git', args, {encoding: 'utf8'}).trim();
}

function hasCommand(command) {
	const result = spawnSync(command, ['--version'], {stdio: 'ignore'});
	return result.status === 0;
}

const semgrepBin = process.env.SEMGREP_BIN || 'semgrep';

if (!existsSync('.semgrep')) {
	console.error('Missing .semgrep directory.');
	process.exit(1);
}

if (!hasCommand(semgrepBin)) {
	console.error(`Missing ${semgrepBin}. Install with: python -m pip install semgrep`);
	process.exit(1);
}

const baseRef = process.env.BASE_REF || process.env.GITHUB_BASE_REF || 'origin/main';

let mergeBase;
try {
	mergeBase = runGit(['merge-base', baseRef, 'HEAD']);
} catch {
	try {
		mergeBase = runGit(['merge-base', 'origin/main', 'HEAD']);
	} catch {
		console.error(`Could not determine merge base from ${baseRef} or origin/main.`);
		process.exit(1);
	}
}

const changed = runGit(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD'])
	.split(/\r?\n/v)
	.map(line => line.trim())
	.filter(Boolean)
	.filter(file => /\.(?:ts|tsx|js|jsx)$/v.test(file))
	.filter(file => existsSync(file));

if (changed.length === 0) {
	console.log('No changed JS/TS files to scan.');
	process.exit(0);
}

console.log(`Running Semgrep debt gates on ${changed.length} changed file(s):`);
for (const file of changed) {
	console.log(`- ${file}`);
}

const result = spawnSync(
	semgrepBin,
	['--config', '.semgrep', '--error', ...changed],
	{stdio: 'inherit'},
);

process.exit(result.status ?? 1);
