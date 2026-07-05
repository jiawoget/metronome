#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import process from 'node:process';

const sourceFilePattern = /^src\/.*\.(?:ts|tsx)$/v;
const ignoredFilePattern = /(?:^|\/)__tests__\/|(?:\.test|\.spec)\.(?:ts|tsx)$/v;
const primitiveNamePattern = /\b(?:normalize|format|validate|resolve|select|build|create)[A-Z]\w*\b/v;

const requiredSections = [
	'Reuse Proof',
	'Retired Surface',
	'New Surface',
	'Boundary Delta',
	'Debt Gate Evidence',
	'Agent Gate Evidence',
];

const requiredCommands = [
	'npm run validate:debt-gates',
	'npm run lint:debt:changed',
	'npm run lint:xo:changed',
	'npm run lint',
	'npm run typecheck',
	'npm run test:unit',
	'npm run build',
];

const codeSceneMcpEvidenceLabel = 'CodeScene MCP `analyze_change_set`';

const allowedPlanVerdicts = new Set(['PLAN_READY']);
const allowedCodeVerdicts = new Set(['CODE_READY']);
const allowedReviewVerdicts = new Set(['PASS', 'PASS_WITH_NITS']);
const allowedChatGptVerdicts = new Set(['PASS', 'PASS_WITH_NITS']);

function runGit(args) {
	return execFileSync('git', args, {encoding: 'utf8'}).trim();
}

function tryRunGit(args) {
	try {
		return runGit(args);
	} catch {
		return '';
	}
}

function getMergeBase() {
	const baseRef = process.env.BASE_REF || process.env.GITHUB_BASE_REF || 'origin/main';

	for (const candidate of [baseRef, 'origin/main']) {
		const mergeBase = tryRunGit(['merge-base', candidate, 'HEAD']);
		if (mergeBase) {
			return mergeBase;
		}
	}

	return null;
}

function normalizePath(file) {
	return file.trim().replaceAll('\\', '/');
}

function isProductionSourceFile(file) {
	return sourceFilePattern.test(file) && !ignoredFilePattern.test(file) && existsSync(file);
}

function parseFiles(output) {
	return output
		.split(/\r?\n/v)
		.map(file => normalizePath(file))
		.filter(Boolean)
		.filter(file => isProductionSourceFile(file));
}

function uniqueFiles(files) {
	return [...new Set(files)];
}

function getPrContext() {
	if (!process.env.GITHUB_EVENT_PATH) {
		return {isPullRequest: false, body: null};
	}

	if (!existsSync(process.env.GITHUB_EVENT_PATH)) {
		console.error(`GITHUB_EVENT_PATH does not exist: ${process.env.GITHUB_EVENT_PATH}`);
		process.exit(1);
	}

	try {
		const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
		if (!event.pull_request) {
			return {isPullRequest: false, body: null};
		}

		return {
			isPullRequest: true,
			body: typeof event.pull_request.body === 'string' ? event.pull_request.body : '',
		};
	} catch (error) {
		console.error(`Could not read GitHub pull request body: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}

function getScanContexts(mergeBase, prContext) {
	if (prContext.isPullRequest) {
		if (!mergeBase) {
			console.error('Could not determine merge base for pull request debt contract scan.');
			process.exit(1);
		}

		return [{
			name: 'pull request diff',
			diffArgs: ['diff', '--unified=0', mergeBase, 'HEAD', '--'],
			files: parseFiles(tryRunGit(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD'])),
			requiresPrBody: true,
		}];
	}

	const stagedFiles = parseFiles(tryRunGit(['diff', '--cached', '--name-only', '--diff-filter=ACMR']));
	const workingTreeFiles = parseFiles(tryRunGit(['diff', '--name-only', '--diff-filter=ACMR']));
	const committedBranchFiles = mergeBase
		? parseFiles(tryRunGit(['diff', '--name-only', '--diff-filter=ACMR', mergeBase, 'HEAD']))
		: [];

	const contexts = [];

	if (stagedFiles.length > 0) {
		contexts.push({
			name: 'staged diff',
			diffArgs: ['diff', '--cached', '--unified=0', '--'],
			files: stagedFiles,
			requiresPrBody: false,
			requireNoRiskyAdditions: true,
		});
	}

	if (workingTreeFiles.length > 0) {
		contexts.push({
			name: 'working tree diff',
			diffArgs: ['diff', '--unified=0', '--'],
			files: workingTreeFiles,
			requiresPrBody: false,
			requireNoRiskyAdditions: true,
		});
	}

	if (contexts.length === 0 && committedBranchFiles.length > 0) {
		contexts.push({
			name: 'committed branch diff',
			diffArgs: ['diff', '--unified=0', mergeBase, 'HEAD', '--'],
			files: committedBranchFiles,
			requiresPrBody: false,
			requireNoRiskyAdditions: false,
		});
	}

	return contexts;
}

function getDiffLines(context, file) {
	const diff = runGit([...context.diffArgs, file]);
	const lines = [];
	let newLineNumber = 0;

	for (const line of diff.split(/\r?\n/v)) {
		const hunkMatch = /^@@ -\d+(?:,\d+)? \+(?<line>\d+)(?:,\d+)? @@/v.exec(line);
		if (hunkMatch) {
			newLineNumber = Number(hunkMatch.groups.line);
			continue;
		}

		if (line.startsWith('+++')) {
			continue;
		}

		if (line.startsWith('+')) {
			lines.push({file, line: newLineNumber, text: line});
			newLineNumber += 1;
			continue;
		}

		if (!line.startsWith('-') && newLineNumber > 0) {
			newLineNumber += 1;
		}
	}

	return lines;
}

function isPrimitiveHelper(line) {
	return (
		/^\+\s*(?:export\s+)?(?:async\s+)?function\s+/v.test(line)
		&& primitiveNamePattern.test(line)
	) || (
		/^\+\s*(?:export\s+)?const\s+/v.test(line)
		&& primitiveNamePattern.test(line)
		&& /=/v.test(line)
	);
}

function getRiskKind(file, text) {
	const withoutPlus = text.slice(1);

	if (isPrimitiveHelper(text)) {
		return 'primitive-like helper added';
	}

	if (
		file.startsWith('src/services/')
		&& /\breturn\s+(?:await\s+)?(?:this\.)?\w*repository\.\w+\(/iv.test(withoutPlus)
	) {
		return 'service repository passthrough added';
	}

	if (
		/^src\/(?:components|hooks)\//v.test(file)
		&& /=\s*browser[A-Z]\w*Service\b/v.test(withoutPlus)
	) {
		return 'browser service default added';
	}

	if (
		/^src\/(?:app|components|domain|hooks)\//v.test(file)
		&& /from\s+["']@\/infrastructure\//v.test(withoutPlus)
	) {
		return 'infrastructure import added outside infrastructure';
	}

	return null;
}

function scanRiskyAdditions(contexts) {
	return contexts.flatMap(context => scanContextRiskyAdditions(context));
}

function scanContextRiskyAdditions(context) {
	return context.files.flatMap(file => scanFileRiskyAdditions(context, file));
}

function scanFileRiskyAdditions(context, file) {
	return getDiffLines(context, file)
		.map(added => createRiskFinding(context, added))
		.filter(Boolean);
}

function createRiskFinding(context, added) {
	const kind = getRiskKind(added.file, added.text);
	return kind ? {...added, context: context.name, kind} : null;
}

function splitSections(body) {
	const sections = new Map();
	let currentHeading = null;

	for (const line of body.split(/\r?\n/v)) {
		if (line.startsWith('## ')) {
			currentHeading = line.slice(3).trim();
			sections.set(currentHeading, []);
			continue;
		}

		if (currentHeading) {
			sections.get(currentHeading).push(line);
		}
	}

	return sections;
}

function stripComments(value) {
	return value.replaceAll(/<!--[\s\S]*?-->/gv, '');
}

function normalizeCell(value) {
	return value.trim().replaceAll('`', '').replaceAll(/\s+/gv, ' ');
}

function isPlaceholder(value) {
	const normalized = normalizeCell(value).toLowerCase();
	return ['', '.', '-', 'n/a', 'na', 'none', 'todo', 'tbd', 'placeholder', 'not run'].includes(normalized);
}

function parseTable(sectionBody) {
	return stripComments(sectionBody)
		.split(/\r?\n/v)
		.map(line => line.trim())
		.filter(line => line.startsWith('|') && line.endsWith('|'))
		.filter(line => !/^\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|$/v.test(line))
		.map(line => line
			.slice(1, -1)
			.split('|')
			.map(cell => normalizeCell(cell)));
}

function getDataRows(sectionBody, firstHeaderCell) {
	return parseTable(sectionBody)
		.filter(row => row.length > 0)
		.filter(row => normalizeCell(row[0]).toLowerCase() !== firstHeaderCell.toLowerCase());
}

function hasValidRow(sectionBody, firstHeaderCell, minimumCells) {
	return getDataRows(sectionBody, firstHeaderCell)
		.some(row => row.length >= minimumCells && row.slice(0, minimumCells).every(cell => !isPlaceholder(cell)));
}

function sectionText(sectionBody) {
	return stripComments(sectionBody)
		.split(/\r?\n/v)
		.map(line => line.trim())
		.filter(Boolean)
		.join('\n');
}

function hasExplicitNoNewSurface(sectionBody) {
	return /\bno new surface\b/iv.test(sectionText(sectionBody));
}

function hasExplicitNoRetiredSurface(sectionBody) {
	return /\bnot a debt(?:-| )reduction pr\b/iv.test(sectionText(sectionBody))
		&& /\bno retired surface\b/iv.test(sectionText(sectionBody));
}

function valueAfterColon(sectionBody, label) {
	const line = sectionText(sectionBody)
		.split('\n')
		.find(candidate => candidate.toLowerCase().startsWith(`- ${label.toLowerCase()}:`));

	if (!line) {
		return null;
	}

	return normalizeCell(line.slice(line.indexOf(':') + 1));
}

function validateBoundaryDelta(sectionBody) {
	const requiredLabels = [
		'UI -> browser adapter direct imports added',
		'Domain -> UI/service imports added',
		'Service passthrough methods added',
		'Repository direct callers reduced',
	];

	const missing = requiredLabels.filter(label => {
		const value = valueAfterColon(sectionBody, label);
		return value === null || isPlaceholder(value) || !/^(?:yes|no)\b/iv.test(value);
	});

	return missing.length === 0
		? []
		: [`Boundary Delta is missing yes/no answers for: ${missing.join(', ')}`];
}

function validateDebtGateEvidence(sectionBody) {
	const missing = requiredCommands.filter(command => {
		const value = valueAfterColon(sectionBody, `\`${command}\``) ?? valueAfterColon(sectionBody, command);
		return value === null || isPlaceholder(value) || !/\bpass(?:ed)?\b/iv.test(value);
	});

	const failures = [];
	if (missing.length > 0) {
		failures.push(`Debt Gate Evidence must include passed output for: ${missing.join(', ')}`);
	}

	return [...failures, ...validateCodeSceneEvidence(sectionBody)];
}

function validateCodeSceneEvidence(sectionBody) {
	const evidence = valueAfterColon(sectionBody, codeSceneMcpEvidenceLabel);
	if (isPassingCodeSceneEvidence(evidence)) {
		return [];
	}

	return ['Debt Gate Evidence must include CodeScene MCP analyze_change_set output with no decline.'];
}

function isPassingCodeSceneEvidence(evidence) {
	if (evidence === null || isPlaceholder(evidence)) {
		return false;
	}

	return /\b(?:pass(?:ed)?|no decline|no regression)\b/iv.test(evidence);
}

function extractVerdict(sectionBody, label, allowedVerdicts) {
	const value = valueAfterColon(sectionBody, label);

	if (!value) {
		return false;
	}

	const verdictTokens = new Set(value.toUpperCase().split(/[^A-Z_]+/v));
	return [...allowedVerdicts].some(verdict => verdictTokens.has(verdict));
}

function validateAgentGateEvidence(sectionBody) {
	const failures = [];

	if (!extractVerdict(sectionBody, 'Planner skill verdict', allowedPlanVerdicts)) {
		failures.push('Planner skill verdict must include PLAN_READY.');
	}

	if (!extractVerdict(sectionBody, 'Coder repo map / primitive search', allowedCodeVerdicts)) {
		failures.push('Coder repo map / primitive search must include CODE_READY.');
	}

	if (!extractVerdict(sectionBody, 'Reviewer verdict', allowedReviewVerdicts)) {
		failures.push('Reviewer verdict must include PASS or PASS_WITH_NITS.');
	}

	if (!extractVerdict(sectionBody, 'ChatGPT final review prompt/verdict', allowedChatGptVerdicts)) {
		failures.push('ChatGPT final review prompt/verdict must include PASS or PASS_WITH_NITS.');
	}

	return failures;
}

function validateSections(body) {
	const sections = splitSections(body);
	const failures = [];

	for (const section of requiredSections) {
		if (!sections.has(section)) {
			failures.push(`Missing section: ${section}`);
		}
	}

	if (failures.length > 0) {
		return failures;
	}

	const reuseProof = sections.get('Reuse Proof').join('\n');
	if (!hasValidRow(reuseProof, 'Need', 4)) {
		failures.push('Reuse Proof must include at least one filled table row with need, checked primitive/library, files read, and decision.');
	}

	const retiredSurface = sections.get('Retired Surface').join('\n');
	if (!hasValidRow(retiredSurface, 'Removed / narrowed surface', 3) && !hasExplicitNoRetiredSurface(retiredSurface)) {
		failures.push('Retired Surface must list removed/narrowed surface rows or explicitly say this is not a debt-reduction PR with no retired surface.');
	}

	const newSurface = sections.get('New Surface').join('\n');
	if (!hasValidRow(newSurface, 'New helper/service/type/component', 3) && !hasExplicitNoNewSurface(newSurface)) {
		failures.push('New Surface must list new surface rows or explicitly say no new surface.');
	}

	failures.push(
		...validateBoundaryDelta(sections.get('Boundary Delta').join('\n')),
		...validateDebtGateEvidence(sections.get('Debt Gate Evidence').join('\n')),
		...validateAgentGateEvidence(sections.get('Agent Gate Evidence').join('\n')),
	);

	return failures;
}

const prContext = getPrContext();
const mergeBase = getMergeBase();
const scanContexts = getScanContexts(mergeBase, prContext)
	.map(context => ({...context, files: uniqueFiles(context.files)}))
	.filter(context => context.files.length > 0);
const changedSourceFiles = uniqueFiles(scanContexts.flatMap(context => context.files));
const riskyFindings = scanRiskyAdditions(scanContexts);

if (changedSourceFiles.length === 0) {
	console.log('No changed production source files require debt contract evidence.');
	process.exit(0);
}

console.log(`Debt contract source scope: ${changedSourceFiles.length} changed production source file(s).`);
for (const context of scanContexts) {
	console.log(`- ${context.name}: ${context.files.length} file(s)`);
}

if (riskyFindings.length > 0) {
	console.log('Risky additions that require explicit PR evidence:');
	for (const finding of riskyFindings) {
		console.log(`- ${finding.kind}: ${finding.file}:${finding.line} (${finding.context})`);
	}
}

if (!prContext.isPullRequest) {
	const localRiskContexts = new Set(scanContexts
		.filter(context => context.requireNoRiskyAdditions)
		.map(context => context.name));
	const localRiskyFindings = riskyFindings.filter(finding => localRiskContexts.has(finding.context));

	if (localRiskyFindings.length > 0) {
		console.error('Local staged/working-tree risky additions require PR debt contract evidence.');
		process.exit(1);
	}

	console.log('No GitHub PR context found; local source/risk scan passed.');
	process.exit(0);
}

if (prContext.body.trim() === '') {
	console.error('Pull request body is empty. Debt contract evidence is required for production source changes.');
	process.exit(1);
}

const sectionFailures = validateSections(prContext.body);
if (sectionFailures.length > 0) {
	console.error('PR body debt contract evidence failed:');
	for (const failure of sectionFailures) {
		console.error(`- ${failure}`);
	}

	process.exit(1);
}

console.log('PR debt contract evidence sections are present and specific.');
