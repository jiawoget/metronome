#!/usr/bin/env node
import {execFileSync} from "node:child_process";
import {createHash} from "node:crypto";
import {existsSync, readFileSync} from "node:fs";
import process from "node:process";

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
	"AGENTS.md",
	".agents/skills/metronome-workflow/SKILL.md",
]);
const reuseAdmissionControlFiles = new Set([
	...overlayControlFiles,
	"skills/metronome_planner.md",
	"skills/metronome_coder.md",
	"skills/metronome_reviewer.md",
	"skills/metronome_chatgpt_review.md",
	"docs/v1/implementation-slices/rules/external-library-first.md",
	"docs/architecture/debt-gate-map.md",
	"scripts/validate-pr-debt-contract.mjs",
	"scripts/validate-metronome-gates.mjs",
	".github/pull_request_template.md",
	".github/workflows/metronome-debt-gates.yml",
]);
const overlayPlanPath = "docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md";
const overlayPlanReviewPolicies = new Set(["GPT-5.6 Terra standard", "GPT-5.6 Luna standard"]);
const reuseAdmissionConformanceLabels = {
	applicability: "Reuse-admission conformance applicability",
	status: "Reuse-admission conformance status",
	capabilityPlanReference: "Reuse-admission conformance Capability plan identity reference",
	candidateHead: "Reuse-admission conformance candidate HEAD",
	redBaseline: "RED baseline commit",
	redFamilies: "RED families with at least one oracle mismatch",
	greenFamilies: "GREEN families matched",
	greenNegatives: "GREEN negative cases matched",
	greenPositives: "GREEN positive controls matched",
	greenMetamorphicPairs: "GREEN metamorphic pairs matched",
};
const reuseAdmissionConformanceCounts = new Map([
	[reuseAdmissionConformanceLabels.redFamilies, "4/4"],
	[reuseAdmissionConformanceLabels.greenFamilies, "4/4"],
	[reuseAdmissionConformanceLabels.greenNegatives, "8/8"],
	[reuseAdmissionConformanceLabels.greenPositives, "4/4"],
	[reuseAdmissionConformanceLabels.greenMetamorphicPairs, "4/4"],
]);
const reuseAdmissionConformanceStatuses = new Map([
	["REQUIRED|MSO-5", new Set(["PENDING", "PASS"])],
	["REQUIRED|MSO-6", new Set(["PASS"])],
	["NOT_APPLICABLE|MSO-5", new Set(["NOT_APPLICABLE"])],
	["NOT_APPLICABLE|MSO-6", new Set(["NOT_APPLICABLE"])],
]);
const conformanceSuccessVerdicts = new Set(["PLAN_READY", "PASS", "PASS_WITH_NITS"]);
const conformanceBlockingVerdicts = new Set(["PLAN_BLOCKED", "CHANGES_REQUIRED"]);
const conformanceCodePattern = /^[0-9a-z]+(?:-[0-9a-z]+)*$/v;
const conformanceOpaqueIdPattern = /^\w[\w\u{2D}.]*$/v;

const capabilityHeaders = [
	"Capability ID",
	"Need",
	"Class",
	"Source kind",
	"Exact source / version",
	"Exact API / probe",
	"Files read",
	"Decision",
	"No-fit / policy evidence",
];
const capabilityStages = {
	plan: {
		section: "Existing Primitive Search",
		mapHeading: "Capability Delivery Map",
		mapHeaders: ["Capability ID", "Planned files / symbols", "Planned tests / probes"],
	},
	pr: {
		section: "Reuse Proof",
		mapHeading: "Capability Implementation Map",
		mapHeaders: ["Capability ID", "Changed files / symbols", "Tests / probes"],
	},
};
const capabilityIdPattern = /^C\d{2,}$/v;
const capabilityClasses = new Set(["generic", "product-policy"]);
const capabilitySourceKinds = new Set(["repo", "installed", "oss", "platform", "local"]);
const capabilityDecisions = new Set(["direct-use", "thin-policy", "local-no-fit", "local-policy"]);
const nonLocalSourceKinds = new Set(["repo", "installed", "oss", "platform"]);
const localNoFitEvidenceLabels = ["repo:", "installed:", "oss:", "platform:"];
const repoSourcePattern = /^(?!.*(?:^|\/)\.\.?(?:\/|#))[.0-9A-Za-z][\w\u{2D}.\/@]*#[$A-Z_a-z][\w$]*(?:\.[$A-Z_a-z][\w$]*)*$/v;
const packageSourcePattern = /^(?:@[0-9A-Za-z][\u{2D}.0-9A-Za-z]*\/)?[0-9A-Za-z][\u{2D}.0-9A-Za-z]*@\d+\.\d+\.\d+#[\w$][\w$\u{2D}.\/]*$/v;
const platformSourcePattern = /^https:\/\/[^\s#]+#[^\s#]+$/v;
const capabilityPlanPathPattern = /^docs\/v1\/implementation-slices\/plans\/(?:[^\/]+\/)*[^\/]+\.md$/v;

const requiredSections = [
	"Reuse Proof",
	"Retired Surface",
	"New Surface",
	"Boundary Delta",
	"Debt Gate Evidence",
	"Agent Gate Evidence",
];

const requiredCommands = [
	"npm run validate:debt-gates",
	"npm run lint:debt:changed",
	"npm run lint:xo:changed",
	"npm run lint",
	"npm run typecheck",
	"npm run test:unit",
	"npm run build",
];

const codeSceneMcpEvidenceLabel = "CodeScene MCP `analyze_change_set`";

const allowedPlanVerdicts = new Set(["PLAN_READY"]);
const allowedCodeVerdicts = new Set(["CODE_READY"]);
const allowedReviewVerdicts = new Set(["PASS", "PASS_WITH_NITS"]);
const allowedChatGptVerdicts = new Set(["PASS", "PASS_WITH_NITS"]);
const finalReviewEvidenceLabels = [
	"Codex final review prompt/verdict",
	"ChatGPT final review prompt/verdict",
];
const overlayPromotionVerdicts = new Map([["MSO-5", new Set(["PENDING"])], ["MSO-6", allowedChatGptVerdicts]]);

const requiredAgentSkillEvidence = [
	["Planner skill read evidence", "skills/metronome_planner.md"],
	["Coder skill read evidence", "skills/metronome_coder.md"],
	["Reviewer skill read evidence", "skills/metronome_reviewer.md"],
];
const debtContractDiffFilter = "ACMRD";
const positiveStatusPattern = /^(?:passed|success)\b/iv;
const blockingEvidencePattern = /\bnot\b|\bfails?\b|\bfailed\b|\bfailures?\b|\berrors?\b|\bblocked\b|\bchanges_required\b|\bchanges required\b/iv;

function runGit(args) {
	return execFileSync("git", args, {encoding: "utf8"}).trim();
}

function tryRunGit(args) {
	try {
		return runGit(args);
	} catch {
		return "";
	}
}

function getMergeBase() {
	const baseRef = process.env.BASE_REF || process.env.GITHUB_BASE_REF || "origin/main";

	for (const candidate of [baseRef, "origin/main"]) {
		const mergeBase = tryRunGit(["merge-base", candidate, "HEAD"]);
		if (mergeBase) {
			return mergeBase;
		}
	}

	return null;
}

function normalizePath(file) {
	return file.trim().replaceAll("\\", "/");
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
	return parseChangedFiles(output)
		.filter(file => requiresDebtContractEvidence(file));
}

function parseChangedFiles(output) {
	return output
		.split(/\r?\n/v)
		.map(file => normalizePath(file))
		.filter(Boolean);
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
		const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
		if (!event.pull_request) {
			return {isPullRequest: false, body: null};
		}

		return {
			isPullRequest: true,
			body: typeof event.pull_request.body === "string" ? event.pull_request.body : "",
		};
	} catch (error) {
		console.error(`Could not read GitHub pull request body: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	}
}

function getScanContexts(mergeBase, prContext) {
	if (prContext.isPullRequest) {
		if (!mergeBase) {
			console.error("Could not determine merge base for pull request debt contract scan.");
			process.exit(1);
		}

		return [{
			name: "pull request diff",
			diffArgs: ["diff", "--unified=0", mergeBase, "HEAD", "--"],
			files: parseFiles(tryRunGit(["diff", "--name-only", `--diff-filter=${debtContractDiffFilter}`, mergeBase, "HEAD"])),
			requiresPrBody: true,
		}];
	}

	const stagedFiles = parseFiles(tryRunGit(["diff", "--cached", "--name-only", `--diff-filter=${debtContractDiffFilter}`]));
	const workingTreeFiles = parseFiles(tryRunGit(["diff", "--name-only", `--diff-filter=${debtContractDiffFilter}`]));
	const committedBranchFiles = mergeBase
		? parseFiles(tryRunGit(["diff", "--name-only", `--diff-filter=${debtContractDiffFilter}`, mergeBase, "HEAD"]))
		: [];

	const contexts = [];

	if (stagedFiles.length > 0) {
		contexts.push({
			name: "staged diff",
			diffArgs: ["diff", "--cached", "--unified=0", "--"],
			files: stagedFiles,
			requiresPrBody: false,
			requireNoRiskyAdditions: true,
		});
	}

	if (workingTreeFiles.length > 0) {
		contexts.push({
			name: "working tree diff",
			diffArgs: ["diff", "--unified=0", "--"],
			files: workingTreeFiles,
			requiresPrBody: false,
			requireNoRiskyAdditions: true,
		});
	}

	if (contexts.length === 0 && committedBranchFiles.length > 0) {
		contexts.push({
			name: "committed branch diff",
			diffArgs: ["diff", "--unified=0", mergeBase, "HEAD", "--"],
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

		if (line.startsWith("+++")) {
			continue;
		}

		if (line.startsWith("+")) {
			lines.push({file, line: newLineNumber, text: line});
			newLineNumber += 1;
			continue;
		}

		if (!line.startsWith("-") && newLineNumber > 0) {
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
		return "primitive-like helper added";
	}

	if (
		file.startsWith("src/services/")
		&& /\breturn\s+(?:await\s+)?(?:this\.)?\w*repository\.\w+\(/iv.test(withoutPlus)
	) {
		return "service repository passthrough added";
	}

	if (
		/^src\/(?:components|hooks)\//v.test(file)
		&& /=\s*browser[A-Z]\w*Service\b/v.test(withoutPlus)
	) {
		return "browser service default added";
	}

	if (
		/^src\/(?:app|components|domain|hooks)\//v.test(file)
		&& /from\s+["']@\/infrastructure\//v.test(withoutPlus)
	) {
		return "infrastructure import added outside infrastructure";
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
		if (line.startsWith("## ")) {
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

function countSectionHeading(body, heading) {
	return body.split(/\r?\n/v)
		.filter(line => line.startsWith("## ") && line.slice(3).trim() === heading)
		.length;
}

function stripComments(value) {
	let output = "";
	let index = 0;

	while (index < value.length) {
		const start = value.indexOf("<!--", index);
		if (start === -1) {
			return output + value.slice(index);
		}

		output += value.slice(index, start);
		const end = value.indexOf("-->", start + 4);
		if (end === -1) {
			return output;
		}

		index = end + 3;
	}

	return output;
}

function normalizeCell(value) {
	return value.trim().replaceAll("`", "").replaceAll(/\s+/gv, " ");
}

function isPlaceholder(value) {
	const normalized = normalizeCell(value).toLowerCase();
	return ["", ".", "-", "n/a", "na", "none", "todo", "tbd", "placeholder", "not run"].includes(normalized);
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
		.filter(line => line.startsWith("|") && line.endsWith("|"))
		.filter(line => !/^\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|$/v.test(line))
		.map(line => line
			.slice(1, -1)
			.split("|")
			.map(cell => normalizeCell(cell)));
}

function getDataRows(sectionBody, firstHeaderCell) {
	return parseTable(sectionBody)
		.filter(row => row.length > 0)
		.filter(row => normalizeCell(row[0]).toLowerCase() !== firstHeaderCell.toLowerCase());
}

function hasExactCells(actual, expected) {
	return actual.length === expected.length
		&& actual.every((cell, index) => cell === expected[index]);
}

function escapePattern(value) {
	return value.replaceAll(/[$\(\)*+.?\[\\\]^\{\|\}]/gv, String.raw`\$&`);
}

function evidenceValues(value, label) {
	const pattern = new RegExp(String.raw`(?:^|;)\s*${escapePattern(label)}\s*:\s*([^;]+)`, "giv");
	return value.matchAll(pattern).map(match => normalizeCell(match[1])).toArray();
}

function hasEvidenceValue(value, label) {
	return evidenceValues(value, label).some(candidate => !isPlaceholder(candidate));
}

function hasExactEvidenceValue(value, label, expected) {
	const values = evidenceValues(value, label);
	return values.length === 1 && values[0] === expected;
}

function splitMapSection(sectionBody, heading) {
	const pattern = new RegExp(String.raw`^### ${escapePattern(heading)}\s*$`, "gmv");
	const matches = sectionBody.matchAll(pattern).toArray();
	if (matches.length !== 1) {
		return {main: sectionBody, map: null};
	}

	const match = matches[0];
	return {
		main: sectionBody.slice(0, match.index),
		map: sectionBody.slice(match.index + match[0].length),
	};
}

function inspectCapabilityTable(sectionBody, headers, name) {
	const table = parseTable(sectionBody);
	const headerCount = table.filter(row => hasExactCells(row, headers)).length;
	const failures = [];
	if (!hasExactCells(table[0] ?? [], headers) || headerCount !== 1) {
		failures.push(`${name} must use its exact header.`);
	}

	const rows = table.slice(1);
	if (rows.length === 0) {
		failures.push(`${name} must include at least one capability row.`);
	}

	for (const row of rows) {
		if (row.length !== headers.length) {
			failures.push(`${name} rows must contain exactly ${headers.length} cells.`);
			continue;
		}

		if (row.some(cell => isPlaceholder(cell))) {
			failures.push(`${name} rows must not contain placeholder cells.`);
		}
	}

	return {failures, rows};
}

function inspectCapabilityIds(rows, name) {
	const failures = [];
	const ids = new Set();
	for (const row of rows) {
		const id = row[0] ?? "";
		if (!capabilityIdPattern.test(id)) {
			failures.push(`${name} capability IDs must match Cxx.`);
			continue;
		}

		if (ids.has(id)) {
			failures.push(`${name} capability IDs must be unique.`);
		}

		ids.add(id);
	}

	return {failures, ids};
}

function hasSameIdSet(left, right) {
	return left.size === right.size && [...left].every(id => right.has(id));
}

function isValidCapabilitySource(sourceKind, source) {
	if (sourceKind === "repo") {
		return repoSourcePattern.test(source);
	}

	if (sourceKind === "installed" || sourceKind === "oss") {
		return packageSourcePattern.test(source);
	}

	if (sourceKind === "platform") {
		return platformSourcePattern.test(source);
	}

	return sourceKind === "local" && source.startsWith("local:") && repoSourcePattern.test(source.slice("local:".length));
}

function compositionTarget(evidence, allowNone) {
	const values = evidenceValues(evidence, "composes");
	if (values.length !== 1) {
		return null;
	}

	const target = values[0];
	return capabilityIdPattern.test(target) || (allowNone && target === "none") ? target : null;
}

function getCapabilityRowValues(row) {
	return {
		id: row[0],
		classification: row[2],
		sourceKind: row[3],
		source: row[4],
		apiProbe: row[5],
		decision: row[7],
		evidence: row[8],
	};
}

function validateCapabilityBasics(row) {
	const {id, classification, sourceKind, source, apiProbe, decision} = getCapabilityRowValues(row);
	const failures = [];
	if (!capabilityClasses.has(classification)) {
		failures.push(`Capability ${id} has an invalid class.`);
	}

	if (!capabilitySourceKinds.has(sourceKind)) {
		failures.push(`Capability ${id} has an invalid source kind.`);
	}

	if (!capabilityDecisions.has(decision)) {
		failures.push(`Capability ${id} has an invalid decision.`);
	}

	if (!isValidCapabilitySource(sourceKind, source)) {
		failures.push(`Capability ${id} has an invalid exact source / version.`);
	}

	if (!hasEvidenceValue(apiProbe, "API") || !hasEvidenceValue(apiProbe, "Probe")) {
		failures.push(`Capability ${id} must include non-empty API: and Probe: evidence.`);
	}

	return failures;
}

function validateDirectUseCapability(row) {
	const {id, classification, sourceKind, evidence} = getCapabilityRowValues(row);
	const failures = [];
	if (classification !== "generic" || !nonLocalSourceKinds.has(sourceKind)) {
		failures.push(`Capability ${id} direct-use must be a non-local generic source.`);
	}

	if (evidence !== "N/A - selected source fits") {
		failures.push(`Capability ${id} direct-use must use exact selected-source evidence.`);
	}

	return {failures, compositionTarget: null};
}

function validateThinPolicyCapability(row) {
	const {id, classification, sourceKind, evidence} = getCapabilityRowValues(row);
	const target = compositionTarget(evidence, false);
	const failures = [];
	if (classification !== "product-policy" || !nonLocalSourceKinds.has(sourceKind)) {
		failures.push(`Capability ${id} thin-policy must be a non-local product-policy source.`);
	}

	const hasCompositionEvidence = hasEvidenceValue(evidence, "policy-boundary") && target !== null;
	if (!hasCompositionEvidence) {
		failures.push(`Capability ${id} thin-policy requires policy-boundary and composes: Cxx evidence.`);
	}

	return {failures, compositionTarget: hasCompositionEvidence ? target : null};
}

function validateLocalNoFitCapability(row) {
	const {id, classification, sourceKind, evidence} = getCapabilityRowValues(row);
	const failures = [];
	if (classification !== "generic" || sourceKind !== "local") {
		failures.push(`Capability ${id} local-no-fit must be a local generic source.`);
	}

	for (const sourceLabel of localNoFitEvidenceLabels) {
		const sourceName = sourceLabel.slice(0, -1);
		if (!hasEvidenceValue(evidence, sourceName)) {
			failures.push(`Capability ${id} local-no-fit requires ${sourceLabel} evidence.`);
		}
	}

	return {failures, compositionTarget: null};
}

function validateLocalPolicyApproval(id, evidence, stage, identity) {
	const approval = evidenceValues(evidence, "approval");
	if (stage === "plan") {
		return approval.length === 1 && approval[0] === "pending-plan-review"
			? []
			: [`Capability ${id} local-policy requires approval: pending-plan-review in plan mode.`];
	}

	if (stage === "pr") {
		const expectedApproval = identity === null ? null : `${id}@${identity.commit}/${identity.blob}/${identity.sha256}`;
		const hasMatchingApproval = approval.length === 1
			&& /^C\d{2,}@[0-9a-f]{40}\/[0-9a-f]{40}\/[0-9a-f]{64}$/v.test(approval[0])
			&& approval[0] === expectedApproval;
		return hasMatchingApproval
			? []
			: [`Capability ${id} local-policy approval must match its tracked capability plan identity.`];
	}

	return [];
}

function validateLocalPolicyCapability(row, stage, identity) {
	const {id, classification, sourceKind, evidence} = getCapabilityRowValues(row);
	const target = compositionTarget(evidence, true);
	const failures = [];
	if (classification !== "product-policy" || sourceKind !== "local") {
		failures.push(`Capability ${id} local-policy must be a local product-policy source.`);
	}

	const hasValidPolicyEvidence = hasEvidenceValue(evidence, "policy-boundary")
		&& target !== null
		&& hasExactEvidenceValue(evidence, "generic-operation", "none");
	if (!hasValidPolicyEvidence) {
		failures.push(`Capability ${id} local-policy requires policy-boundary, composition, and generic-operation: none evidence.`);
	}

	failures.push(...validateLocalPolicyApproval(id, evidence, stage, identity));
	return {failures, compositionTarget: hasValidPolicyEvidence && target !== "none" ? target : null};
}

function validateCapabilityDecision(row, stage, identity) {
	switch (getCapabilityRowValues(row).decision) {
		case "direct-use": {
			return validateDirectUseCapability(row);
		}

		case "thin-policy": {
			return validateThinPolicyCapability(row);
		}

		case "local-no-fit": {
			return validateLocalNoFitCapability(row);
		}

		case "local-policy": {
			return validateLocalPolicyCapability(row, stage, identity);
		}

		default: {
			return {failures: [], compositionTarget: null};
		}
	}
}

function validateCapabilityRows(rows, stage, identity) {
	const failures = [];
	const capabilities = new Map(rows.map(row => [row[0], row]));
	const compositionTargets = [];

	for (const row of rows) {
		const [id] = row;
		const decisionValidation = validateCapabilityDecision(row, stage, identity);
		failures.push(...validateCapabilityBasics(row), ...decisionValidation.failures);
		if (decisionValidation.compositionTarget !== null) {
			compositionTargets.push({id, target: decisionValidation.compositionTarget});
		}
	}

	for (const {id, target} of compositionTargets) {
		if (capabilities.get(target)?.[2] !== "generic") {
			failures.push(`Capability ${id} must compose an existing generic capability.`);
		}
	}

	return failures;
}

function validateReuseProof(sectionBody, stage, identity = null) {
	const schema = capabilityStages[stage];
	const {main, map} = splitMapSection(sectionBody, schema.mapHeading);
	const capabilityTable = inspectCapabilityTable(main, capabilityHeaders, `${stage} capability table`);
	const mapTable = map === null
		? {failures: [`${stage} evidence must include ### ${schema.mapHeading}.`], rows: []}
		: inspectCapabilityTable(map, schema.mapHeaders, `${stage} capability map`);
	const capabilityIds = inspectCapabilityIds(capabilityTable.rows, `${stage} capability table`);
	const mapIds = inspectCapabilityIds(mapTable.rows, `${stage} capability map`);
	const failures = [
		...capabilityTable.failures,
		...mapTable.failures,
		...capabilityIds.failures,
		...mapIds.failures,
		...validateCapabilityRows(capabilityTable.rows, stage, identity),
	];

	if (!hasSameIdSet(capabilityIds.ids, mapIds.ids)) {
		failures.push(`${stage} capability table and map must contain the same capability ID set.`);
	}

	return failures;
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
		.join("\n");
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
		.split("\n")
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

function valuesAfterPlainColon(sectionBody, label) {
	const prefix = `${label}:`;
	return stripComments(sectionBody)
		.split(/\r?\n/v)
		.map(line => line.trim())
		.filter(line => line.startsWith(prefix))
		.map(line => normalizeCell(line.slice(prefix.length)));
}

function valueAfterPlainColon(sectionBody, label) {
	const values = valuesAfterPlainColon(sectionBody, label);
	return values.length === 1 ? values[0] : null;
}

function conformanceFieldLines(sectionBody) {
	return stripComments(sectionBody)
		.split(/\r?\n/v)
		.map(line => line.trim())
		.filter(Boolean);
}

function validateConformanceFieldShape(sectionBody) {
	const allowedLabels = new Set([
		...requiredAgentSkillEvidence.map(([label]) => label),
		"Planner skill verdict",
		"Coder repo map / primitive search",
		"Reviewer verdict",
		...finalReviewEvidenceLabels,
		"Overlay plan path",
		"Overlay plan commit",
		"Overlay plan blob",
		"Overlay plan SHA-256",
		"Independent plan review policy",
		"Independent plan review verdict",
		"Current metronome Stage",
		...Object.values(reuseAdmissionConformanceLabels),
	]);
	const compactCandidates = new Set(compactConformanceCandidates(sectionBody));
	const failures = [];

	for (const line of conformanceFieldLines(sectionBody)) {
		const hasAllowedLabel = [...allowedLabels].some(label => line.startsWith(`- ${label}:`));
		const isLocalPolicyApproval = /^LOCAL_POLICY_APPROVED C\d{2,} [0-9a-f]{40} [0-9a-f]{40} [0-9a-f]{64}$/v.test(line);
		if (!hasAllowedLabel && !compactCandidates.has(line) && !isLocalPolicyApproval) {
			failures.push(`Unexpected Agent Gate Evidence line: ${line}`);
		}
	}

	return failures;
}

function readRequiredConformanceField(sectionBody, label, failures) {
	const values = valuesAfterColon(sectionBody, label);
	if (values.length !== 1 || isPlaceholder(values[0])) {
		failures.push(`${label} must appear exactly once with a non-placeholder value.`);
		return null;
	}

	return values[0];
}

function compactConformanceCandidates(sectionBody) {
	return conformanceFieldLines(sectionBody)
		.filter(line => /^(?:red|green)(?:\s|\|)/iv.test(line));
}

function parseCompactConformanceLines(sectionBody) {
	const failures = [];
	const parsed = [];
	const pattern = /^(?<phase>RED|GREEN) \| (?<id>[^\|]+) \| (?<verdict>[^\|]+) \| (?<code>[^\|]+)$/v;

	for (const line of compactConformanceCandidates(sectionBody)) {
		const match = pattern.exec(line);
		if (!match) {
			failures.push(`Malformed compact reuse-admission conformance line: ${line}`);
			continue;
		}

		const {phase, id: rawId, verdict: rawVerdict, code: rawCode} = match.groups;
		const id = normalizeCell(rawId);
		const verdict = normalizeCell(rawVerdict);
		const code = normalizeCell(rawCode);
		if (!conformanceOpaqueIdPattern.test(id)) {
			failures.push(`Compact ${phase} output has an invalid opaque case ID.`);
		}

		if (conformanceSuccessVerdicts.has(verdict)) {
			if (code !== "NONE") {
				failures.push(`Compact ${phase} output requires NONE for ${verdict}.`);
			}
		} else if (conformanceBlockingVerdicts.has(verdict)) {
			if (code !== "NONE" && !conformanceCodePattern.test(code)) {
				failures.push(`Compact ${phase} blocking output requires NONE or one lowercase kebab code.`);
			}
		} else {
			failures.push(`Compact ${phase} output has an invalid answer-neutral verdict.`);
		}

		parsed.push({phase, id});
	}

	return {failures, parsed};
}

function validateCompactConformanceLines(sectionBody, isComplete) {
	const candidates = compactConformanceCandidates(sectionBody);
	if (!isComplete) {
		return candidates.length === 0
			? []
			: ["PENDING or NOT_APPLICABLE conformance must not persist compact RED/GREEN output lines."];
	}

	const {failures, parsed} = parseCompactConformanceLines(sectionBody);
	const red = parsed.filter(item => item.phase === "RED");
	const green = parsed.filter(item => item.phase === "GREEN");
	if (red.length !== 12 || green.length !== 12) {
		failures.push("PASS conformance requires exactly twelve RED and twelve GREEN compact output lines.");
	}

	const redIds = new Set(red.map(item => item.id));
	const greenIds = new Set(green.map(item => item.id));
	if (redIds.size !== red.length || greenIds.size !== green.length) {
		failures.push("Compact RED and GREEN opaque case IDs must be unique within each phase.");
	}

	if (!hasSameIdSet(redIds, greenIds)) {
		failures.push("Compact RED and GREEN output must use the same opaque case ID set.");
	}

	return failures;
}

function validateCompleteConformanceEvidence(sectionBody) {
	const failures = [];
	const baseline = readRequiredConformanceField(
		sectionBody,
		reuseAdmissionConformanceLabels.redBaseline,
		failures,
	);
	const commitPattern = /^[0-9a-f]{40}$/v;
	if (baseline !== null) {
		if (!commitPattern.test(baseline) || !isPlanCommitAncestor(baseline, commitPattern)) {
			failures.push("RED baseline commit must be one lowercase ancestor of candidate HEAD.");
		}

		if (baseline !== getMergeBase()) {
			failures.push("RED baseline commit must equal the current git merge-base of the base ref and HEAD.");
		}
	}

	for (const [label, expected] of reuseAdmissionConformanceCounts) {
		const values = valuesAfterColon(sectionBody, label);
		if (values.length !== 1 || values[0] !== expected) {
			failures.push(`${label} must be exactly ${expected}.`);
		}
	}

	return [...failures, ...validateCompactConformanceLines(sectionBody, true)];
}

function validateAbsentConformanceResults(sectionBody) {
	const failures = [];
	const resultLabels = [
		reuseAdmissionConformanceLabels.redBaseline,
		...reuseAdmissionConformanceCounts.keys(),
	];
	for (const label of resultLabels) {
		if (valuesAfterColon(sectionBody, label).length > 0) {
			failures.push(`${label} is allowed only when conformance status is PASS.`);
		}
	}

	return [...failures, ...validateCompactConformanceLines(sectionBody, false)];
}

function validateConformanceIdentityBinding(capabilityPlanReference, candidateHead) {
	const failures = [];
	if (capabilityPlanReference !== null && capabilityPlanReference !== "Reuse Proof") {
		failures.push("Reuse-admission conformance must reference the existing Reuse Proof Capability plan identity.");
	}

	if (candidateHead !== null && (!/^[0-9a-f]{40}$/v.test(candidateHead) || candidateHead !== runGit(["rev-parse", "HEAD"]))) {
		failures.push("Reuse-admission conformance candidate HEAD must be the exact lowercase current HEAD.");
	}

	return failures;
}

function validateReuseAdmissionConformance(sectionBody, changedFiles) {
	const failures = validateConformanceFieldShape(sectionBody);
	const isRequired = changedFiles.some(file => reuseAdmissionControlFiles.has(file));
	const expectedApplicability = isRequired ? "REQUIRED" : "NOT_APPLICABLE";
	const applicability = readRequiredConformanceField(
		sectionBody,
		reuseAdmissionConformanceLabels.applicability,
		failures,
	);
	const status = readRequiredConformanceField(
		sectionBody,
		reuseAdmissionConformanceLabels.status,
		failures,
	);
	const capabilityPlanReference = readRequiredConformanceField(
		sectionBody,
		reuseAdmissionConformanceLabels.capabilityPlanReference,
		failures,
	);
	const candidateHead = readRequiredConformanceField(
		sectionBody,
		reuseAdmissionConformanceLabels.candidateHead,
		failures,
	);
	const stage = valueAfterColon(sectionBody, "Current metronome Stage");

	if (applicability !== null && applicability !== expectedApplicability) {
		failures.push(`Reuse-admission conformance applicability must be exactly ${expectedApplicability}.`);
	}

	failures.push(...validateConformanceIdentityBinding(capabilityPlanReference, candidateHead));

	const allowedStatuses = reuseAdmissionConformanceStatuses.get(`${expectedApplicability}|${stage}`) ?? new Set();
	if (status !== null && !allowedStatuses.has(status)) {
		failures.push("Reuse-admission conformance status must match applicability and the MSO-5/MSO-6 promotion state.");
	}

	return status === "PASS"
		? [...failures, ...validateCompleteConformanceEvidence(sectionBody)]
		: [...failures, ...validateAbsentConformanceResults(sectionBody)];
}

function validateBoundaryDelta(sectionBody) {
	const requiredLabels = [
		"UI -> browser adapter direct imports added",
		"Domain -> UI/service imports added",
		"Service passthrough methods added",
		"Repository direct callers reduced",
	];

	const missing = requiredLabels.filter(label => {
		const value = valueAfterColon(sectionBody, label);
		return value === null || isPlaceholder(value) || !/^(?:yes|no)\b/iv.test(value);
	});

	return missing.length === 0
		? []
		: [`Boundary Delta is missing yes/no answers for: ${missing.join(", ")}`];
}

function validateDebtGateEvidence(sectionBody) {
	const missing = requiredCommands.filter(command => {
		const value = valueAfterColon(sectionBody, `\`${command}\``) ?? valueAfterColon(sectionBody, command);
		return !isPositiveStatusEvidence(value);
	});

	const failures = [];
	if (missing.length > 0) {
		failures.push(`Debt Gate Evidence must include positive passed/success output for: ${missing.join(", ")}`);
	}

	return [...failures, ...validateCodeSceneEvidence(sectionBody)];
}

function validateCodeSceneEvidence(sectionBody) {
	const evidence = valueAfterColon(sectionBody, codeSceneMcpEvidenceLabel);
	if (isPassingCodeSceneEvidence(evidence)) {
		return [];
	}

	return ["Debt Gate Evidence must include CodeScene MCP analyze_change_set output with no decline and quality_gates: passed."];
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

	if (!extractVerdict(sectionBody, "Planner skill verdict", allowedPlanVerdicts)) {
		failures.push("Planner skill verdict must be exactly PLAN_READY.");
	}

	if (!extractVerdict(sectionBody, "Coder repo map / primitive search", allowedCodeVerdicts)) {
		failures.push("Coder repo map / primitive search must be exactly CODE_READY.");
	}

	if (!extractVerdict(sectionBody, "Reviewer verdict", allowedReviewVerdicts)) {
		failures.push("Reviewer verdict must be exactly PASS or PASS_WITH_NITS.");
	}

	if (!extractFinalReviewVerdict(sectionBody, chatGptVerdicts)) {
		failures.push(chatGptVerdicts.has("PENDING")
			? "Exactly one Codex or ChatGPT final review prompt/verdict must be PENDING, PASS, or PASS_WITH_NITS."
			: "Exactly one Codex or ChatGPT final review prompt/verdict must be PASS or PASS_WITH_NITS.");
	}

	return failures;
}

function readImmutablePlanIdentity(sectionBody, config) {
	return {
		path: config.getValue(sectionBody, config.pathLabel),
		commit: config.getValue(sectionBody, config.commitLabel),
		blob: config.getValue(sectionBody, config.blobLabel),
		sha256: config.getValue(sectionBody, config.sha256Label),
	};
}

function isPlanCommitAncestor(commit, commitPattern) {
	if (!commitPattern.test(commit ?? "")) {
		return false;
	}

	try {
		execFileSync("git", ["merge-base", "--is-ancestor", commit, "HEAD"], {stdio: "ignore"});
		return true;
	} catch {
		return false;
	}
}

function getCurrentPlanBlob(path, pathIsValid) {
	return pathIsValid ? tryRunGit(["rev-parse", `HEAD:${path}`]) : "";
}

function getApprovedPlanBlob(identity, config, pathIsValid) {
	if (!pathIsValid || !config.commitPattern.test(identity.commit ?? "")) {
		return "";
	}

	return tryRunGit(["rev-parse", `${identity.commit}:${identity.path}`]);
}

function getCurrentPlanSha256(path, currentPlanBlob) {
	if (!currentPlanBlob) {
		return "";
	}

	return createHash("sha256").update(execFileSync("git", ["show", `HEAD:${path}`])).digest("hex");
}

function validateImmutablePlanIdentity(sectionBody, config) {
	const identity = readImmutablePlanIdentity(sectionBody, config);
	const failures = [];
	const pathIsValid = config.isValidPath(identity.path);
	const isAncestor = isPlanCommitAncestor(identity.commit, config.commitPattern);
	const currentPlanBlob = getCurrentPlanBlob(identity.path, pathIsValid);
	const approvedPlanBlob = getApprovedPlanBlob(identity, config, pathIsValid);
	const currentPlanSha256 = getCurrentPlanSha256(identity.path, currentPlanBlob);
	if (!pathIsValid) {
		failures.push(config.pathError);
	}

	if (!isAncestor) {
		failures.push(config.commitError);
	}

	if (
		!config.blobPattern.test(identity.blob ?? "")
		|| new Set([identity.blob, approvedPlanBlob, currentPlanBlob]).size !== 1
	) {
		failures.push(config.blobError);
	}

	if (!config.sha256Pattern.test(identity.sha256 ?? "") || identity.sha256 !== currentPlanSha256) {
		failures.push(config.sha256Error);
	}

	return {identity, failures};
}

function validateImmutableOverlayPlanIdentity(sectionBody) {
	return validateImmutablePlanIdentity(sectionBody, {
		pathLabel: "Overlay plan path",
		commitLabel: "Overlay plan commit",
		blobLabel: "Overlay plan blob",
		sha256Label: "Overlay plan SHA-256",
		getValue: valueAfterColon,
		isValidPath: value => value === overlayPlanPath,
		commitPattern: /^[0-9a-f]{40}$/iv,
		blobPattern: /^[0-9a-f]{40}$/iv,
		sha256Pattern: /^[0-9a-f]{64}$/iv,
		pathError: `Overlay plan path must be exactly ${overlayPlanPath}.`,
		commitError: "Overlay plan commit must be an ancestor of HEAD.",
		blobError: "Overlay plan blob must match the approved commit and current tracked plan.",
		sha256Error: "Overlay plan SHA-256 must match the current tracked plan.",
	}).failures;
}

function validateCapabilityPlanIdentity(sectionBody) {
	return validateImmutablePlanIdentity(sectionBody, {
		pathLabel: "Capability plan path",
		commitLabel: "Capability plan commit",
		blobLabel: "Capability plan blob",
		sha256Label: "Capability plan SHA-256",
		getValue: valueAfterPlainColon,
		isValidPath: value => capabilityPlanPathPattern.test(value ?? ""),
		commitPattern: /^[0-9a-f]{40}$/v,
		blobPattern: /^[0-9a-f]{40}$/v,
		sha256Pattern: /^[0-9a-f]{64}$/v,
		pathError: "Capability plan path must be under docs/v1/implementation-slices/plans/.",
		commitError: "Capability plan commit must be a lowercase ancestor of HEAD.",
		blobError: "Capability plan blob must match the approved commit and current tracked plan.",
		sha256Error: "Capability plan SHA-256 must match the current tracked plan.",
	});
}

function validateOverlayPromotionEvidence(sectionBody) {
	const stage = valueAfterColon(sectionBody, "Current metronome Stage");
	const chatGptVerdict = valueAfterColon(sectionBody, "ChatGPT final review prompt/verdict");
	const failures = validateImmutableOverlayPlanIdentity(sectionBody);

	if (!overlayPlanReviewPolicies.has(valueAfterColon(sectionBody, "Independent plan review policy") ?? "")) {
		failures.push("Independent plan review policy must be GPT-5.6 Terra standard or GPT-5.6 Luna standard.");
	}

	if (!extractVerdict(sectionBody, "Independent plan review verdict", new Set(["PLAN_REVIEW_PASS"]))) {
		failures.push("Independent plan review verdict must be exactly PLAN_REVIEW_PASS.");
	}

	if (!overlayPromotionVerdicts.get(stage)?.has(chatGptVerdict ?? "")) {
		failures.push("Overlay promotion evidence must pair MSO-5 with PENDING or MSO-6 with PASS or PASS_WITH_NITS.");
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
	if (countSectionHeading(body, "Reuse Proof") !== 1) {
		failures.push("Reuse Proof must appear exactly once.");
	}

	const agentGateEvidence = sections.get("Agent Gate Evidence").join("\n");
	const isOverlayControlChange = changedFiles.some(file => overlayControlFiles.has(file));
	const stage = valueAfterColon(agentGateEvidence, "Current metronome Stage");
	const reuseProof = sections.get("Reuse Proof").join("\n");
	const capabilityPlanIdentity = validateCapabilityPlanIdentity(reuseProof);
	const retiredSurface = sections.get("Retired Surface").join("\n");
	const newSurface = sections.get("New Surface").join("\n");
	const surfaceEvidenceResults = [
		validateReuseProof(reuseProof, "pr", capabilityPlanIdentity.identity),
		capabilityPlanIdentity.failures,
		hasValidRow(retiredSurface, "Removed / narrowed surface", 3) || hasExplicitNoRetiredSurface(retiredSurface)
			? []
			: ["Retired Surface must list removed/narrowed surface rows or explicitly say this is not a debt-reduction PR with no retired surface."],
		hasValidRow(newSurface, "New helper/service/type/component", 3) || hasExplicitNoNewSurface(newSurface)
			? []
			: ["New Surface must list new surface rows or explicitly say no new surface."],
		validateBoundaryDelta(sections.get("Boundary Delta").join("\n")),
		validateDebtGateEvidence(sections.get("Debt Gate Evidence").join("\n")),
		validateAgentGateEvidence(
			agentGateEvidence,
			stage === "MSO-5" ? new Set(["PENDING"]) : allowedChatGptVerdicts,
		),
		validateReuseAdmissionConformance(agentGateEvidence, changedFiles),
	];
	failures.push(...surfaceEvidenceResults.flat());

	if (isOverlayControlChange) {
		failures.push(...validateOverlayPromotionEvidence(agentGateEvidence));
	}

	return failures;
}

function validateConformanceOnly(body, changedFiles) {
	const sections = splitSections(body);
	const failures = [];
	if (countSectionHeading(body, "Reuse Proof") !== 1 || !sections.has("Reuse Proof")) {
		failures.push("Reuse-admission conformance must reference exactly one existing Reuse Proof section.");
	} else {
		const reuseProof = sections.get("Reuse Proof").join("\n");
		const capabilityPlanIdentity = validateCapabilityPlanIdentity(reuseProof);
		failures.push(
			...validateReuseProof(reuseProof, "pr", capabilityPlanIdentity.identity),
			...capabilityPlanIdentity.failures,
		);
	}

	if (countSectionHeading(body, "Agent Gate Evidence") !== 1 || !sections.has("Agent Gate Evidence")) {
		failures.push("Reuse-admission conformance requires exactly one Agent Gate Evidence section.");
		return failures;
	}

	const agentGateEvidence = sections.get("Agent Gate Evidence").join("\n");
	return [...failures, ...validateReuseAdmissionConformance(agentGateEvidence, changedFiles)];
}

function isRepositoryRelativePath(value) {
	const normalized = normalizePath(value);
	return normalized !== ""
		&& !normalized.startsWith("/")
		&& !/^[A-Za-z]:/v.test(normalized)
		&& !normalized.split("/").includes("..");
}

function getPlanInputRequest() {
	const args = process.argv.slice(2);
	if (args.length === 0) {
		return null;
	}

	if (args.length !== 2 || args[0] !== "--plan-input") {
		return {error: "Usage: validate-pr-debt-contract.mjs --plan-input <repo-relative-plan-path>"};
	}

	return {path: args[1]};
}

function validatePlanInput(path) {
	if (!isRepositoryRelativePath(path)) {
		return ["Plan input path must be repository-relative."];
	}

	let planBody = "";
	try {
		planBody = readFileSync(path, "utf8");
	} catch (error) {
		return [`Could not read plan input: ${error instanceof Error ? error.message : String(error)}`];
	}

	const sectionHeading = capabilityStages.plan.section;
	const sectionCount = countSectionHeading(planBody, sectionHeading);
	if (sectionCount !== 1) {
		return [sectionCount === 0
			? "Plan input must include ## Existing Primitive Search."
			: "Plan input must include exactly one ## Existing Primitive Search."];
	}

	const section = splitSections(planBody).get(sectionHeading);
	return validateReuseProof(section.join("\n"), "plan");
}

const planInputRequest = getPlanInputRequest();
if (planInputRequest !== null) {
	const failures = planInputRequest.error === undefined
		? validatePlanInput(planInputRequest.path)
		: [planInputRequest.error];
	if (failures.length > 0) {
		console.error("Plan capability evidence failed:");
		for (const failure of failures) {
			console.error(`- ${failure}`);
		}

		process.exit(1);
	}

	console.log("Plan capability evidence is present and specific.");
	process.exit(0);
}

const prContext = getPrContext();
const mergeBase = getMergeBase();
const changedCandidateFiles = prContext.isPullRequest && mergeBase
	? uniqueFiles(parseChangedFiles(tryRunGit([
		"diff",
		"--name-only",
		"--no-renames",
		`--diff-filter=${debtContractDiffFilter}`,
		mergeBase,
		"HEAD",
	])))
	: [];
const scanContexts = getScanContexts(mergeBase, prContext)
	.map(context => ({...context, files: uniqueFiles(context.files)}))
	.filter(context => context.files.length > 0);
const changedDebtContractFiles = uniqueFiles(scanContexts.flatMap(context => context.files));
const riskyFindings = scanRiskyAdditions(scanContexts);

if (changedDebtContractFiles.length === 0) {
	if (prContext.isPullRequest && changedCandidateFiles.length > 0) {
		if (prContext.body.trim() === "") {
			console.error("Pull request body is empty. Reuse-admission conformance applicability evidence is required.");
			process.exit(1);
		}

		const conformanceFailures = validateConformanceOnly(prContext.body, changedCandidateFiles);
		if (conformanceFailures.length > 0) {
			console.error("PR body reuse-admission conformance evidence failed:");
			for (const failure of conformanceFailures) {
				console.error(`- ${failure}`);
			}

			process.exit(1);
		}

		console.log("No broad debt-contract files changed; reuse-admission conformance is NOT_APPLICABLE and structurally valid.");
		process.exit(0);
	}

	console.log("No changed production source or gate-control files require debt contract evidence.");
	process.exit(0);
}

console.log(`Debt contract scope: ${changedDebtContractFiles.length} changed production source or gate-control file(s).`);
for (const context of scanContexts) {
	console.log(`- ${context.name}: ${context.files.length} file(s)`);
}

if (riskyFindings.length > 0) {
	console.log("Risky additions that require explicit PR evidence:");
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
		console.log("Local staged/working-tree risky additions require PR debt contract evidence; validation is deferred to pull request context.");
	}

	console.log("No GitHub PR context found; local source/risk scan completed.");
	process.exit(0);
}

if (prContext.body.trim() === "") {
	console.error("Pull request body is empty. Debt contract evidence is required for production source or gate-control changes.");
	process.exit(1);
}

const sectionFailures = validateSections(prContext.body, changedCandidateFiles);
if (sectionFailures.length > 0) {
	console.error("PR body debt contract evidence failed:");
	for (const failure of sectionFailures) {
		console.error(`- ${failure}`);
	}

	process.exit(1);
}

console.log("PR debt contract evidence sections are present and specific.");
