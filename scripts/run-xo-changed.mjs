#!/usr/bin/env node

import {execFileSync, spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import process from 'node:process';

const xoIgnoredSuffixes = [
	'.config.js',
	'.config.mjs',
	'.config.cjs',
	'.config.ts',
	'.config.cts',
	'.config.mts',
	'.config.tsx',
	'.config.jsx',
];
const xoCliPath = 'node_modules/xo/dist/cli.js';

function isXoIgnoredFile(file) {
	return xoIgnoredSuffixes.some((suffix) => file.endsWith(suffix));
}

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
	.split(/\r?\n/v)
	.map(file => file.trim())
	.filter(Boolean)
	.filter(file => /\.(?:js|jsx|mjs|cjs|ts|tsx|mts|cts)$/v.test(file))
	.filter(file => !isXoIgnoredFile(file))
	.filter(file => existsSync(file));

if (changedFiles.length === 0) {
	console.log('No changed JS/TS files to scan with XO.');
	process.exit(0);
}

if (!existsSync(xoCliPath)) {
	console.error(`Missing local XO CLI at ${xoCliPath}. Run npm install first.`);
	process.exit(1);
}

console.log(`Running XO on ${changedFiles.length} changed file(s):`);
for (const file of changedFiles) {
	console.log(`- ${file}`);
}

const result = spawnSync(
	process.execPath,
	[xoCliPath, '--max-warnings=0', ...changedFiles],
	{stdio: 'inherit'},
);

process.exit(result.status ?? 1);
