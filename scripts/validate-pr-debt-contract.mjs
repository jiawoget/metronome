#!/usr/bin/env node
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import process from 'node:process';

const sourceFilePattern = /^src\/.*\.(?:ts|tsx)$/v;
const ignoredFilePattern = /(?:^|\/)__tests__\/|(?:\.test|\.spec)\.(?:ts|tsx)$/v;
const primitiveNamePattern = /\b(?:normalize|format|validate|resolve|select|build|create)[A-Z]\w*\b/v;
const gateControlFilePatterns = [
	/^package\.json$/v,
	/^package-lock\.json$/v,
	/^npm-shrinkwrap\.json$/v,
	/^pnpm-lock\.yaml$/v,
	/^yarn\.lock$/v,
	/^scripts\//v,
	/^skills\//v,
	/^\.github\/workflows\//v,
	/^\.github\/pull_request_template\.md$/v,
	/^\.semgrep\//v,
	/^\.codescene\//v,
	/^docs\/architecture\/debt-gate-map\.md$/v,
	/^AGENTS\.md$/v,
	/^\.agents\/skills\/metronome-workflow\/SKILL\.md$/v,
];

const overlayControlFiles = new Set([
	'AGENTS.md',
	'.agents/skills/metronome-workflow/SKILL.md',
]);
const overlayPlanPath = 'docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md';
const overlayPlanReviewPolicies = new Set(['GPT-5.6 Terra standard', 'GPT-5.6 Luna standard']);

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
const finalReviewEvidenceLabels = [
	'Codex final review prompt/verdict',
	'ChatGPT final review prompt/verdict',
];
const overlayPromotionVerdicts = new Map([['MSO-5', new Set(['PENDING'])], ['MSO-6', allowedChatGptVerdicts]]);

const requiredAgentSkillEvidence = [
	['Planner skill read evidence', 'skills/metronome_planner.md'],
	['Coder skill read evidence', 'skills/metronome_coder.md'],
	['Reviewer skill read evidence', 'skills/metronome_reviewer.md'],
];
const debtContractDiffFilter = 'ACMRD';
const positiveStatusPattern = /^(?:passed|success)\b/iv;
const blockingEvidencePattern = /\bnot\b|\bfails?\b|\bfailed\b|\bfailures?\b|\berrors?\b|\bblocked\b|\bchanges_required\b|\bchanges required\b/iv;

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
	return sourceFilePattern.test(file) && !ignoredFilePattern.test(file);
}

function isGateControlFile(file) {
	return gateControlFilePatterns.some(pattern => pattern.test(file));
}

function requiresDebtContractEvidence(file) {
	return isProductionSourceFile(file) || isGateControlFile(file);
}

function parseFiles(output) {
	return output
		.split(/\r?\n/v)
		.map(file => normalizePath(file))
		.filter(Boolean)
		.filter(file => requiresDebtContractEvidence(file));
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
			files: parseFiles(tryRunGit(['diff', '--name-only', `--diff-filter=${debtContractDiffFilter}`, mergeBase, 'HEAD'])),
			requiresPrBody: true,
		}];
	}

	const stagedFiles = parseFiles(tryRunGit(['diff', '--cached', '--name-only', `--diff-filter=${debtContractDiffFilter}`]));
	const workingTreeFiles = parseFiles(tryRunGit(['diff', '--name-only', `--diff-filter=${debtContractDiffFilter}`]));
	const committedBranchFiles = mergeBase
		? parseFiles(tryRunGit(['diff', '--name-only', `--diff-filter=${debtContractDiffFilter}`, mergeBase, 'HEAD']))
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
	return context.files.flatMap(file => (
		isProductionSourceFile(file) ? scanFileRiskyAdditions(context, file) : []
	));
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
	let output = '';
	let index = 0;

	while (index < value.length) {
		const start = value.indexOf('<!--', index);
		if (start === -1) {
			return output + value.slice(index);
		}

		output += value.slice(index, start);
		const end = value.indexOf('-->', start + 4);
		if (end === -1) {
			return output;
		}

		index = end + 3;
	}

	return output;
}

function normalizeCell(value) {
	return value.trim().replaceAll('`', '').replaceAll(/\s+/gv, ' ');
}

function isPlaceholder(value) {
	const normalized = normalizeCell(value).toLowerCase();
	return ['', '.', '-', 'n/a', 'na', 'none', 'todo', 'tbd', 'placeholder', 'not run'].includes(normalized);
}

function isPositiveStatusEvidence(value) {
	if (value === null || isPlaceholder(value)) {
		return false;
	}

	const normalized = normalizeCell(value);
	return positiveStatusPattern.test(normalized) && !blockingEvidencePattern.test(normalized);
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

function valuesAfterColon(sectionBody, label) {
	const prefix = `- ${label}:`;
	return sectionText(sectionBody)
		.split('\n')
		.filter(candidate => candidate.toLowerCase().startsWith(prefix.toLowerCase()))
		.map(line => normalizeCell(line.slice(prefix.length)));
}

function valueAfterColon(sectionBody, label) {
	const values = valuesAfterColon(sectionBody, label);

	if (values.length !== 1) {
		return null;
	}

	return values[0];
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
		return !isPositiveStatusEvidence(value);
	});

	const failures = [];
	if (missing.length > 0) {
		failures.push(`Debt Gate Evidence must include positive passed/success output for: ${missing.join(', ')}`);
	}

	return [...failures, ...validateCodeSceneEvidence(sectionBody)];
}

function validateCodeSceneEvidence(sectionBody) {
	const evidence = valueAfterColon(sectionBody, codeSceneMcpEvidenceLabel);
	if (isPassingCodeSceneEvidence(evidence)) {
		return [];
	}

	return ['Debt Gate Evidence must include CodeScene MCP analyze_change_set output with no decline and quality_gates: passed.'];
}

function isPassingCodeSceneEvidence(evidence) {
	return isPositiveStatusEvidence(evidence)
		&& /\bno decline\b/iv.test(evidence)
		&& /\bquality_gates:\s*passed\b/iv.test(evidence);
}

function extractVerdict(sectionBody, label, allowedVerdicts) {
	const value = valueAfterColon(sectionBody, label);

	if (!value || isPlaceholder(value)) {
		return false;
	}

	const normalized = normalizeCell(value).toUpperCase();
	return allowedVerdicts.has(normalized);
}

function extractFinalReviewVerdict(sectionBody, allowedVerdicts) {
	const evidenceGroups = finalReviewEvidenceLabels
		.map(label => valuesAfterColon(sectionBody, label));
	if (evidenceGroups.some(values => values.length > 1)) {
		return false;
	}

	const verdicts = evidenceGroups
		.flat()
		.filter(value => value !== null && !isPlaceholder(value))
		.map(value => normalizeCell(value).toUpperCase());

	return verdicts.length === 1 && allowedVerdicts.has(verdicts[0]);
}

function validateAgentGateEvidence(sectionBody, chatGptVerdicts = allowedChatGptVerdicts) {
	const failures = [];

	for (const [label, expectedPath] of requiredAgentSkillEvidence) {
		if (!hasSkillReadEvidence(sectionBody, label, expectedPath)) {
			failures.push(`${label} must mention ${expectedPath}.`);
		}
	}

	if (!extractVerdict(sectionBody, 'Planner skill verdict', allowedPlanVerdicts)) {
		failures.push('Planner skill verdict must be exactly PLAN_READY.');
	}

	if (!extractVerdict(sectionBody, 'Coder repo map / primitive search', allowedCodeVerdicts)) {
		failures.push('Coder repo map / primitive search must be exactly CODE_READY.');
	}

	if (!extractVerdict(sectionBody, 'Reviewer verdict', allowedReviewVerdicts)) {
		failures.push('Reviewer verdict must be exactly PASS or PASS_WITH_NITS.');
	}

	if (!extractFinalReviewVerdict(sectionBody, chatGptVerdicts)) {
		failures.push(chatGptVerdicts.has('PENDING')
			? 'Exactly one Codex or ChatGPT final review prompt/verdict must be PENDING, PASS, or PASS_WITH_NITS.'
			: 'Exactly one Codex or ChatGPT final review prompt/verdict must be PASS or PASS_WITH_NITS.');
	}

	return failures;
}

function validateImmutableOverlayPlanIdentity(sectionBody) {
	const failures = [];
	const planCommit = valueAfterColon(sectionBody, 'Overlay plan commit');
	const planBlob = valueAfterColon(sectionBody, 'Overlay plan blob');
	const planSha256 = valueAfterColon(sectionBody, 'Overlay plan SHA-256');

	if (valueAfterColon(sectionBody, 'Overlay plan path') !== overlayPlanPath) {
		failures.push(`Overlay plan path must be exactly ${overlayPlanPath}.`);
	}

	let isPlanCommitAncestor = false;
	if (/^[0-9a-f]{40}$/iv.test(planCommit ?? '')) {
		try {
			execFileSync('git', ['merge-base', '--is-ancestor', planCommit, 'HEAD'], {stdio: 'ignore'});
			isPlanCommitAncestor = true;
		} catch {}
	}

	if (!isPlanCommitAncestor) {
		failures.push('Overlay plan commit must be an ancestor of HEAD.');
	}

	const currentPlanBlob = tryRunGit(['rev-parse', `HEAD:${overlayPlanPath}`]);
	const approvedPlanBlob = /^[0-9a-f]{40}$/iv.test(planCommit ?? '')
		? tryRunGit(['rev-parse', `${planCommit}:${overlayPlanPath}`])
		: '';
	if (new Set([planBlob, approvedPlanBlob, currentPlanBlob]).size > 1) {
		failures.push('Overlay plan blob must match the approved commit and current tracked plan.');
	}

	const currentPlanSha256 = currentPlanBlob
		? createHash('sha256').update(execFileSync('git', ['show', `HEAD:${overlayPlanPath}`])).digest('hex')
		: '';
	if (!/^[0-9a-f]{64}$/iv.test(planSha256 ?? '') || planSha256 !== currentPlanSha256) {
		failures.push('Overlay plan SHA-256 must match the current tracked plan.');
	}

	return failures;
}

function validateOverlayPromotionEvidence(sectionBody) {
	const stage = valueAfterColon(sectionBody, 'Current metronome Stage');
	const chatGptVerdict = valueAfterColon(sectionBody, 'ChatGPT final review prompt/verdict');
	const failures = validateImmutableOverlayPlanIdentity(sectionBody);

	if (!overlayPlanReviewPolicies.has(valueAfterColon(sectionBody, 'Independent plan review policy') ?? '')) {
		failures.push('Independent plan review policy must be GPT-5.6 Terra standard or GPT-5.6 Luna standard.');
	}

	if (!extractVerdict(sectionBody, 'Independent plan review verdict', new Set(['PLAN_REVIEW_PASS']))) {
		failures.push('Independent plan review verdict must be exactly PLAN_REVIEW_PASS.');
	}

	if (!overlayPromotionVerdicts.get(stage)?.has(chatGptVerdict ?? '')) {
		failures.push('Overlay promotion evidence must pair MSO-5 with PENDING or MSO-6 with PASS or PASS_WITH_NITS.');
	}

	return failures;
}

function hasSkillReadEvidence(sectionBody, label, expectedPath) {
	const value = valueAfterColon(sectionBody, label);
	return value !== null && !isPlaceholder(value) && normalizePath(value).includes(expectedPath);
}

function validateSections(body, changedFiles) {
	const sections = splitSections(body);
	const missingSections = requiredSections
		.filter(section => !sections.has(section))
		.map(section => `Missing section: ${section}`);
	if (missingSections.length > 0) {
		return missingSections;
	}

	const failures = [];
	const agentGateEvidence = sections.get('Agent Gate Evidence').join('\n');
	const isOverlayControlChange = changedFiles.some(file => overlayControlFiles.has(file));
	const reuseProof = sections.get('Reuse Proof').join('\n');
	const retiredSurface = sections.get('Retired Surface').join('\n');
	const newSurface = sections.get('New Surface').join('\n');
	const surfaceEvidenceResults = [
		hasValidRow(reuseProof, 'Need', 4)
			? []
			: ['Reuse Proof must include at least one filled table row with need, checked primitive/library, files read, and decision.'],
		hasValidRow(retiredSurface, 'Removed / narrowed surface', 3) || hasExplicitNoRetiredSurface(retiredSurface)
			? []
			: ['Retired Surface must list removed/narrowed surface rows or explicitly say this is not a debt-reduction PR with no retired surface.'],
		hasValidRow(newSurface, 'New helper/service/type/component', 3) || hasExplicitNoNewSurface(newSurface)
			? []
			: ['New Surface must list new surface rows or explicitly say no new surface.'],
		validateBoundaryDelta(sections.get('Boundary Delta').join('\n')),
		validateDebtGateEvidence(sections.get('Debt Gate Evidence').join('\n')),
		validateAgentGateEvidence(
			agentGateEvidence,
			isOverlayControlChange ? new Set(['PENDING', ...allowedChatGptVerdicts]) : allowedChatGptVerdicts,
		),
	];
	failures.push(...surfaceEvidenceResults.flat());

	if (isOverlayControlChange) {
		failures.push(...validateOverlayPromotionEvidence(agentGateEvidence));
	}

	return failures;
}

const prContext = getPrContext();
const mergeBase = getMergeBase();
const scanContexts = getScanContexts(mergeBase, prContext)
	.map(context => ({...context, files: uniqueFiles(context.files)}))
	.filter(context => context.files.length > 0);
const changedDebtContractFiles = uniqueFiles(scanContexts.flatMap(context => context.files));
const riskyFindings = scanRiskyAdditions(scanContexts);

if (changedDebtContractFiles.length === 0) {
	console.log('No changed production source or gate-control files require debt contract evidence.');
	process.exit(0);
}

console.log(`Debt contract scope: ${changedDebtContractFiles.length} changed production source or gate-control file(s).`);
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
		console.log('Local staged/working-tree risky additions require PR debt contract evidence; validation is deferred to pull request context.');
	}

	console.log('No GitHub PR context found; local source/risk scan completed.');
	process.exit(0);
}

if (prContext.body.trim() === '') {
	console.error('Pull request body is empty. Debt contract evidence is required for production source or gate-control changes.');
	process.exit(1);
}

const sectionFailures = validateSections(prContext.body, changedDebtContractFiles);
if (sectionFailures.length > 0) {
	console.error('PR body debt contract evidence failed:');
	for (const failure of sectionFailures) {
		console.error(`- ${failure}`);
	}

	process.exit(1);
}

console.log('PR debt contract evidence sections are present and specific.');
