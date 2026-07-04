#!/usr/bin/env node
import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';

function runGit(args) {
	return execFileSync('git', args, {encoding: 'utf8'}).trim();
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

const changedFiles = runGit(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD'])
	.split(/\r?\n/)
	.map(file => file.trim())
	.filter(Boolean)
	.filter(file => /\.(?:js|jsx|mjs|cjs|ts|tsx|mts|cts)$/.test(file))
	.filter(file => existsSync(file));

if (changedFiles.length === 0) {
	console.log('No changed JS/TS files to scan with XO.');
	process.exit(0);
}

console.log(`Running XO on ${changedFiles.length} changed file(s):`);
for (const file of changedFiles) {
	console.log(`- ${file}`);
}

const result = spawnSync(
	'npx',
	['xo', '--max-warnings=0', ...changedFiles],
	{stdio: 'inherit'},
);

process.exit(result.status ?? 1);
