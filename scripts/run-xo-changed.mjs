#!/usr/bin/env node

import {execFileSync, spawnSync} from "node:child_process";
import {existsSync} from "node:fs";
import process from "node:process";

const xoIgnoredSuffixes = [
	".config.js",
	".config.mjs",
	".config.cjs",
	".config.ts",
	".config.cts",
	".config.mts",
	".config.tsx",
	".config.jsx",
];
const xoCliPath = "node_modules/xo/dist/cli.js";
const xoSuppressionsPath = ".xo-suppressions.json";
const xoControlFiles = new Set([
	"package-lock.json",
	"package.json",
	"scripts/run-xo-changed.mjs",
	"xo.config.js",
	xoSuppressionsPath,
]);

function isXoIgnoredFile(file) {
	return xoIgnoredSuffixes.some((suffix) => file.endsWith(suffix));
}

function runGit(args) {
	return execFileSync("git", args, {encoding: "utf8"}).trim();
}

function isInIndex(file) {
	return spawnSync("git", ["cat-file", "-e", `:${file}`], {stdio: "ignore"}).status === 0;
}

const baseRef = process.env.BASE_REF || process.env.GITHUB_BASE_REF || "origin/main";

let mergeBase;
try {
	mergeBase = runGit(["merge-base", baseRef, "HEAD"]);
} catch {
	try {
		mergeBase = runGit(["merge-base", "origin/main", "HEAD"]);
	} catch {
		console.error(`Could not determine merge base from ${baseRef} or origin/main.`);
		process.exit(1);
	}
}

const committedFiles = runGit(["diff", "--name-only", "--no-renames", "--diff-filter=ACMRD", mergeBase, "HEAD"])
	.split(/\r?\n/v)
	.map(file => file.trim())
	.filter(Boolean);
const stagedFiles = runGit(["diff", "--cached", "--name-only", "--no-renames", "--diff-filter=ACMRD"])
	.split(/\r?\n/v)
	.map(file => file.trim())
	.filter(Boolean);
const allChangedFiles = [...new Set([...committedFiles, ...stagedFiles])];
const changedControlFiles = allChangedFiles.filter(file => xoControlFiles.has(file));
const deletedControlFiles = changedControlFiles.filter(file => !isInIndex(file));

if (deletedControlFiles.length > 0) {
	console.error("XO control files cannot be deleted or renamed because that would remove part of the gate:");
	for (const file of deletedControlFiles) {
		console.error(`- ${file}`);
	}

	process.exit(1);
}

const hasControlChanges = changedControlFiles.length > 0;
const scanCandidateFiles = hasControlChanges
	? runGit(["ls-files"]).split(/\r?\n/v).map(file => file.trim()).filter(Boolean)
	: allChangedFiles;
const lintableCandidateFiles = scanCandidateFiles
	.filter(file => /\.(?:js|jsx|mjs|cjs|ts|tsx|mts|cts)$/v.test(file))
	.filter(file => !isXoIgnoredFile(file));
const unstagedFiles = new Set(
	runGit(["diff", "--name-only", "--diff-filter=ACMRD"])
		.split(/\r?\n/v)
		.map(file => file.trim())
		.filter(Boolean),
);

function rejectUnstagedDrift(files) {
	const filesWithUnstagedChanges = [...new Set(files)]
		.filter(file => unstagedFiles.has(file))
		.toSorted((first, second) => first.localeCompare(second));

	if (filesWithUnstagedChanges.length === 0) {
		return;
	}

	console.error("XO cannot verify the committed/staged snapshot while its inputs have unstaged changes:");
	for (const file of filesWithUnstagedChanges) {
		console.error(`- ${file}`);
	}

	console.error("Stage or stash those changes before running the XO gate.");
	process.exit(1);
}

// Reject drift before reading config or suppression inputs from the working tree.
rejectUnstagedDrift(xoControlFiles);

const changedFiles = lintableCandidateFiles.filter(file => existsSync(file));

changedFiles.sort((first, second) => first.localeCompare(second));
rejectUnstagedDrift(lintableCandidateFiles);

if (changedFiles.length === 0) {
	console.log("No changed JS/TS files to scan with XO.");
	process.exit(0);
}

if (!existsSync(xoCliPath)) {
	console.error(`Missing local XO CLI at ${xoCliPath}. Run npm install first.`);
	process.exit(1);
}

console.log(`Running XO on ${changedFiles.length} ${hasControlChanges ? "repository" : "changed"} file(s):`);
for (const file of changedFiles) {
	console.log(`- ${file}`);
}

const result = spawnSync(
	process.execPath,
	[xoCliPath, "--suppressions-location", xoSuppressionsPath, "--max-warnings=0", ...changedFiles],
	{stdio: "inherit"},
);

process.exit(result.status ?? 1);
