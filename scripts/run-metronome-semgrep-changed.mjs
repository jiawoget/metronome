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

function isInIndex(file) {
	return spawnSync("git", ["cat-file", "-e", `:${file}`], {stdio: "ignore"}).status === 0;
}

function isUntrackedOrIgnored(file) {
	const literalPathspec = `:(literal)${file}`;
	return runGit(["ls-files", "--others", "--exclude-standard", "--", literalPathspec]) !== ""
		|| runGit(["ls-files", "--others", "--ignored", "--exclude-standard", "--", literalPathspec]) !== "";
}

const semgrepBin = process.env.SEMGREP_BIN || 'semgrep';
const semgrepChangedFilePattern = /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/v;

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

const committedFiles = runGit(["diff", "--name-only", "--no-renames", "--diff-filter=ACMRD", mergeBase, "HEAD"])
	.split(/\r?\n/v)
	.map(line => line.trim())
	.filter(Boolean);
const stagedFiles = runGit(["diff", "--cached", "--name-only", "--no-renames", "--diff-filter=ACMRD"])
	.split(/\r?\n/v)
	.map(line => line.trim())
	.filter(Boolean);
const candidateFiles = [...new Set([...committedFiles, ...stagedFiles])]
	.filter(file => semgrepChangedFilePattern.test(file))
	.toSorted((first, second) => first.localeCompare(second));
const unstagedFiles = new Set(
	runGit(["diff", "--name-only", "--no-renames", "--diff-filter=ACMRD"])
		.split(/\r?\n/v)
		.map(line => line.trim())
		.filter(Boolean),
);
const filesWithUnstagedChanges = candidateFiles.filter(file => unstagedFiles.has(file));
const indexBackedCandidates = candidateFiles.filter(file => isInIndex(file));
const indexBackedCandidateSet = new Set(indexBackedCandidates);
const untrackedCandidateShadows = candidateFiles.filter(file =>
	!indexBackedCandidateSet.has(file) && existsSync(file) && isUntrackedOrIgnored(file),
);

if (untrackedCandidateShadows.length > 0) {
	console.error("Semgrep cannot verify staged deletions or renames shadowed by untracked or ignored working-tree files:");
	for (const file of untrackedCandidateShadows) {
		console.error(`- ${file}`);
	}

	console.error("Remove or move those files before running the Semgrep gate.");
	process.exit(1);
}

if (filesWithUnstagedChanges.length > 0) {
	console.error("Semgrep cannot verify the committed/staged snapshot while its inputs have unstaged changes:");
	for (const file of filesWithUnstagedChanges) {
		console.error(`- ${file}`);
	}

	console.error("Stage or stash those changes before running the Semgrep gate.");
	process.exit(1);
}

const changed = indexBackedCandidates.filter(file => existsSync(file));

if (changed.length === 0) {
	console.log('No changed JavaScript or TypeScript files to scan.');
	process.exit(0);
}

if (!existsSync('.semgrep')) {
	console.error('Missing .semgrep directory.');
	process.exit(1);
}

if (!hasCommand(semgrepBin)) {
	console.error(`Missing ${semgrepBin}. Install with: python -m pip install semgrep`);
	process.exit(1);
}

console.log(`Running Semgrep debt gates on ${changed.length} changed file(s):`);
for (const file of changed) {
	console.log(`- ${file}`);
}

const result = spawnSync(
	semgrepBin,
	["scan", "--config", ".semgrep", "--error", "--baseline-commit", mergeBase, ...changed],
	{stdio: 'inherit'},
);

process.exit(result.status ?? 1);
