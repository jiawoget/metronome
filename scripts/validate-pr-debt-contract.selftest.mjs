#!/usr/bin/env node
import assert from "node:assert/strict";
import {execFileSync, spawnSync} from "node:child_process";
import {createHash} from "node:crypto";
import {mkdirSync, mkdtempSync, writeFileSync} from "node:fs";
import {tmpdir} from "node:os";
import path from "node:path";
import process from "node:process";

const scriptPath = path.join(
	process.cwd(),
	"scripts",
	"validate-pr-debt-contract.mjs",
);
const capabilityPlanPath = "docs/v1/implementation-slices/plans/capability-admission.md";
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
const planMapHeaders = ["Capability ID", "Planned files / symbols", "Planned tests / probes"];
const prMapHeaders = ["Capability ID", "Changed files / symbols", "Tests / probes"];
const legacyReuseHeaders = ["Need", "Existing primitive/library checked", "Files read", "Decision"];
const reuseAdmissionControlFiles = new Set([
	"AGENTS.md",
	".agents/skills/metronome-workflow/SKILL.md",
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
const conformanceLabels = {
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
const opaqueConformanceIds = [
	"q7m-01",
	"q7m-02",
	"q7m-03",
	"v2k-04",
	"v2k-05",
	"v2k-06",
	"r9x-07",
	"r9x-08",
	"r9x-09",
	"b4n-10",
	"b4n-11",
	"b4n-12",
];

function git(cwd, args) {
	return execFileSync("git", args, {cwd, encoding: "utf8", stdio: "pipe"}).trim();
}

function write(cwd, file, content) {
	const fullPath = path.join(cwd, file);
	mkdirSync(path.dirname(fullPath), {recursive: true});
	writeFileSync(fullPath, content);
}

function markdownTable(headers, rows) {
	return [
		`| ${headers.join(" | ")} |`,
		`| ${headers.map(() => "---").join(" | ")} |`,
		...rows.map(row => `| ${row.join(" | ")} |`),
	].join("\n");
}

function capabilityPlanIdentity(cwd) {
	const commit = git(cwd, ["rev-parse", "HEAD"]);
	const blob = git(cwd, ["rev-parse", `HEAD:${capabilityPlanPath}`]);
	const sha256 = createHash("sha256")
		.update(execFileSync("git", ["show", `HEAD:${capabilityPlanPath}`], {cwd}))
		.digest("hex");
	return {path: capabilityPlanPath, commit, blob, sha256};
}

function genericCapability(overrides = {}) {
	return {
		id: "C01",
		need: "Read normalized capability evidence",
		classification: "generic",
		sourceKind: "repo",
		source: "scripts/reuse-evidence.mjs#readCapability",
		apiProbe: "API: readCapability(value); Probe: fixture probe passed",
		filesRead: "scripts/reuse-evidence.mjs",
		decision: "direct-use",
		evidence: "N/A - selected source fits",
		...overrides,
	};
}

function localPolicyCapability(cwd, stage, overrides = {}) {
	const id = overrides.id ?? "C02";
	let approval = "pending-plan-review";
	if (stage === "pr") {
		const identity = capabilityPlanIdentity(cwd);
		approval = `${id}@${identity.commit}/${identity.blob}/${identity.sha256}`;
	}

	approval = overrides.approval ?? approval;
	return {
		id,
		need: "Constrain capability usage for product policy",
		classification: "product-policy",
		sourceKind: "local",
		source: "local:scripts/policy.mjs#applyPolicy",
		apiProbe: "API: applyPolicy(value); Probe: policy fixture passed",
		filesRead: "scripts/policy.mjs",
		decision: "local-policy",
		evidence: `policy-boundary: product constraints; composes: C01; generic-operation: none; approval: ${approval}`,
		...overrides,
	};
}

function thinPolicyCapability(overrides = {}) {
	return {
		id: "C02",
		need: "Apply a policy around a selected primitive",
		classification: "product-policy",
		sourceKind: "repo",
		source: "scripts/policy.mjs#applyPolicy",
		apiProbe: "API: applyPolicy(value); Probe: policy fixture passed",
		filesRead: "scripts/policy.mjs",
		decision: "thin-policy",
		evidence: "policy-boundary: product constraints; composes: C01",
		...overrides,
	};
}

function localNoFitCapability(overrides = {}) {
	return {
		id: "C01",
		need: "Perform an uncovered generic operation",
		classification: "generic",
		sourceKind: "local",
		source: "local:scripts/local-operation.mjs#operate",
		apiProbe: "API: operate(value); Probe: local fixture passed",
		filesRead: "scripts/local-operation.mjs",
		decision: "local-no-fit",
		evidence: "repo: no fit; installed: no fit; oss: no fit; platform: inapplicable - no official platform API applies",
		...overrides,
	};
}

function capabilityCells(row) {
	return [
		row.id,
		row.need,
		row.classification,
		row.sourceKind,
		row.source,
		row.apiProbe,
		row.filesRead,
		row.decision,
		row.evidence,
	];
}

function mapRowsFor(rows) {
	return rows.map(row => mapRow(row.id));
}

function validCapabilityRows(cwd, stage) {
	return [genericCapability(), localPolicyCapability(cwd, stage)];
}

function capabilityEvidence(cwd, {
	stage,
	headers = capabilityHeaders,
	rows = validCapabilityRows(cwd, stage),
	tableRows = rows.map(row => capabilityCells(row)),
	mapHeaders = stage === "plan" ? planMapHeaders : prMapHeaders,
	mapRows = mapRowsFor(rows),
} = {}) {
	const mapHeading = stage === "plan" ? "Capability Delivery Map" : "Capability Implementation Map";
	const identity = stage === "pr" ? capabilityPlanIdentity(cwd) : null;
	const identityLines = identity
		? `\n\nCapability plan path: ${identity.path}\nCapability plan commit: ${identity.commit}\nCapability plan blob: ${identity.blob}\nCapability plan SHA-256: ${identity.sha256}`
		: "";

	return `${markdownTable(headers, tableRows)}\n\n### ${mapHeading}\n\n${markdownTable(mapHeaders, mapRows)}${identityLines}`;
}

function validPlanInput(cwd, options = {}) {
	return `# Capability admission fixture\n\n## Existing Primitive Search\n\n${capabilityEvidence(cwd, {stage: "plan", ...options})}\n`;
}

function validReuseProof(cwd, options = {}) {
	return capabilityEvidence(cwd, {stage: "pr", ...options});
}

function replaceCapability(rows, id, overrides) {
	return rows.map(row => row.id === id ? {...row, ...overrides} : row);
}

function createRepo({withGateControlFile = false} = {}) {
	const cwd = mkdtempSync(path.join(tmpdir(), "metronome-debt-contract-"));

	git(cwd, ["init"]);
	git(cwd, ["config", "user.email", "test@example.com"]);
	git(cwd, ["config", "user.name", "Test User"]);
	write(cwd, "src/lib/existing.ts", "export const existing = 1;\n");
	write(cwd, "docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md", "# Overlay plan\n");
	write(cwd, capabilityPlanPath, "# Capability admission plan\n");
	if (withGateControlFile) {
		write(cwd, "scripts/existing-gate.mjs", "export const existingGate = true;\n");
	}

	git(cwd, ["add", "-A"]);
	git(cwd, ["commit", "-m", "base"]);
	git(cwd, ["branch", "-M", "main"]);
	git(cwd, ["switch", "-c", "feature"]);

	return cwd;
}

function createEvent(cwd, body, {headSha = git(cwd, ["rev-parse", "HEAD"]), includeHead = true} = {}) {
	const eventPath = path.join(cwd, "event.json");
	writeFileSync(eventPath, JSON.stringify({
		"pull_request": {body, ...(includeHead && {head: {sha: headSha}})},
	}));

	return eventPath;
}

function runGate(cwd, eventBody, eventOptions) {
	const eventPath = eventBody === undefined ? undefined : createEvent(cwd, eventBody, eventOptions);

	return spawnSync(process.execPath, [scriptPath], {
		cwd,
		encoding: "utf8",
		env: {
			...process.env,
			BASE_REF: "main",
			GITHUB_EVENT_PATH: eventPath ?? "",
		},
	});
}

function runPlanInput(cwd, content) {
	const planPath = "docs/v1/implementation-slices/plans/plan-input-fixture.md";
	write(cwd, planPath, content);

	return spawnSync(process.execPath, [scriptPath, "--plan-input", planPath], {
		cwd,
		encoding: "utf8",
		env: {
			...process.env,
			BASE_REF: "main",
		},
	});
}

function commitSourceChange(cwd) {
	write(cwd, "src/lib/changed.ts", "export const changed = 1;\n");
	git(cwd, ["add", "-A"]);
	git(cwd, ["commit", "-m", "change"]);
}

function commitGateControlChange(cwd) {
	write(cwd, "scripts/gate-package.mjs", "export const gatePackage = true;\n");
	write(cwd, "docs/architecture/debt-gate-map.md", "# Debt gate map\n");
	git(cwd, ["add", "-A"]);
	git(cwd, ["commit", "-m", "gate package change"]);
}

function commitGateControlDeletion(cwd) {
	git(cwd, ["rm", "scripts/existing-gate.mjs"]);
	git(cwd, ["commit", "-m", "delete gate package file"]);
}

function commitPackageManifestChange(cwd) {
	write(
		cwd,
		"package.json",
		'{\n  "scripts": {\n    "validate:debt-gates": "node scripts/validate-metronome-gates.mjs"\n  }\n}\n',
	);
	git(cwd, ["add", "package.json"]);
	git(cwd, ["commit", "-m", "package gate scripts"]);
}

function commitAgentsRouterChange(cwd) {
	write(cwd, "AGENTS.md", "# Router\n");
	git(cwd, ["add", "AGENTS.md"]);
	git(cwd, ["commit", "-m", "add router"]);
}

function commitMetronomeWorkflowSkillChange(cwd) {
	write(cwd, ".agents/skills/metronome-workflow/SKILL.md", "---\nname: metronome-workflow\n---\n");
	git(cwd, ["add", ".agents/skills/metronome-workflow/SKILL.md"]);
	git(cwd, ["commit", "-m", "add workflow skill"]);
}

function createNonAncestorCommit(cwd) {
	const base = git(cwd, ["rev-parse", "HEAD~1"]);
	git(cwd, ["switch", "-c", "non-ancestor", base]);
	write(cwd, "non-ancestor-proof.txt", "not on feature\n");
	git(cwd, ["add", "non-ancestor-proof.txt"]);
	git(cwd, ["commit", "-m", "non-ancestor proof"]);
	const commit = git(cwd, ["rev-parse", "HEAD"]);
	git(cwd, ["switch", "feature"]);
	return commit;
}

function commitPathChange(cwd, file) {
	write(cwd, file, `fixture change for ${file}\n`);
	git(cwd, ["add", "-A"]);
	git(cwd, ["commit", "-m", `change ${file}`]);
}

function changedPaths(cwd) {
	return git(cwd, ["diff", "--name-only", "main", "HEAD"])
		.split(/\r?\n/v)
		.filter(Boolean);
}

function requiresReuseAdmissionConformance(cwd) {
	return changedPaths(cwd).some(file => reuseAdmissionControlFiles.has(file));
}

function compactConformanceLines(phase, ids = opaqueConformanceIds) {
	const outputs = [
		["PLAN_READY", "NONE"],
		["PLAN_BLOCKED", "NONE"],
		["PLAN_BLOCKED", "opaque-code"],
		["PASS", "NONE"],
		["PASS_WITH_NITS", "NONE"],
		["CHANGES_REQUIRED", "NONE"],
		["CHANGES_REQUIRED", "opaque-code"],
	];

	return ids.map((id, index) => {
		const [verdict, code] = outputs[index % outputs.length];
		return `${phase} | ${id} | ${verdict} | ${code}`;
	});
}

function conformanceEvidence(cwd, {
	applicability,
	status,
	redIds = opaqueConformanceIds,
	greenIds = opaqueConformanceIds,
} = {}) {
	const candidateHead = git(cwd, ["rev-parse", "HEAD"]);
	const lines = [
		`- ${conformanceLabels.applicability}: ${applicability}`,
		`- ${conformanceLabels.status}: ${status}`,
		`- ${conformanceLabels.capabilityPlanReference}: Reuse Proof`,
		`- ${conformanceLabels.candidateHead}: ${candidateHead}`,
	];

	if (status === "PASS") {
		lines.push(
			`- ${conformanceLabels.redBaseline}: ${git(cwd, ["merge-base", "main", "HEAD"])}`,
			`- ${conformanceLabels.redFamilies}: 4/4`,
			`- ${conformanceLabels.greenFamilies}: 4/4`,
			`- ${conformanceLabels.greenNegatives}: 8/8`,
			`- ${conformanceLabels.greenPositives}: 4/4`,
			`- ${conformanceLabels.greenMetamorphicPairs}: 4/4`,
			...compactConformanceLines("RED", redIds),
			...compactConformanceLines("GREEN", greenIds),
		);
	}

	return lines.join("\n");
}

function validBody(cwd, {
	stage = "MSO-6",
	chatGptVerdict = "PASS",
	reuseProof = validReuseProof(cwd),
	conformanceStatus,
} = {}) {
	const planPath = "docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md";
	const planCommit = git(cwd, ["rev-parse", "HEAD"]);
	const planBlob = git(cwd, ["rev-parse", `HEAD:${planPath}`]);
	const planSha256 = createHash("sha256").update(execFileSync("git", ["show", `HEAD:${planPath}`], {cwd})).digest("hex");
	const isConformanceRequired = requiresReuseAdmissionConformance(cwd);
	const applicability = isConformanceRequired ? "REQUIRED" : "NOT_APPLICABLE";
	const status = conformanceStatus
		?? (isConformanceRequired ? (stage === "MSO-5" ? "PENDING" : "PASS") : "NOT_APPLICABLE");
	const conformance = conformanceEvidence(cwd, {applicability, status});

	return `## Summary

Tighten the debt gate.

## Reuse Proof

${reuseProof}

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

${conformance}
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
	const result = runGate(cwd, replaceLine(validBody(cwd), "- Overlay plan path: docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md", "- Overlay plan path:"));
	assert.equal(result.status, 1, "AGENTS.md change must require overlay promotion evidence");
}

{
	const cwd = createRepo();
	commitMetronomeWorkflowSkillChange(cwd);
	const result = runGate(cwd, replaceLine(validBody(cwd), "- Overlay plan path: docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md", "- Overlay plan path:"));
	assert.equal(result.status, 1, "metronome-workflow skill change must require overlay promotion evidence");
}

assertOverlayEvidenceFails(body => replaceLine(body, "- Current metronome Stage: MSO-6", "- Current metronome Stage: MSO-unknown"));
assertOverlayEvidenceFails(body => replaceLine(body, "- Current metronome Stage: MSO-6", "- Current metronome Stage: MSO-6 later"));
assertOverlayEvidenceFails(body => replaceLine(body, "- Current metronome Stage: MSO-6", "- Current metronome Stage: MSO-5"));
assertOverlayEvidenceFails(body => replaceLine(body, "- Current metronome Stage: MSO-6", "- Current metronome Stage: MSO-6\n- Current metronome Stage: MSO-5"));
assertOverlayEvidenceFails(body => replaceLine(body, "- ChatGPT final review prompt/verdict: PASS", "- ChatGPT final review prompt/verdict: PENDING"));
assertOverlayEvidenceFails(body => replaceLine(body, "- ChatGPT final review prompt/verdict: PASS", "- ChatGPT final review prompt/verdict: PASS later"));
assertOverlayEvidenceFails(body => replaceLine(body, "- Independent plan review verdict: PLAN_REVIEW_PASS", "- Independent plan review verdict:"));
assertOverlayEvidenceFails(body => replaceLine(body, "- Independent plan review verdict: PLAN_REVIEW_PASS", "- Independent plan review verdict: PASS"));
{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const nonAncestorCommit = createNonAncestorCommit(cwd);
	const result = runGate(cwd, replaceLine(
		validBody(cwd),
		`- Overlay plan commit: ${git(cwd, ["rev-parse", "HEAD"])}`,
		`- Overlay plan commit: ${nonAncestorCommit}`,
	));
	assert.equal(result.status, 1, "a valid non-ancestor overlay plan commit must fail");
}

assertOverlayEvidenceFails(body => replaceLine(body, body.split("\n").find(line => line.startsWith("- Overlay plan commit:")), "- Overlay plan commit: malformed"));
assertOverlayEvidenceFails(body => replaceLine(body, body.split("\n").find(line => line.startsWith("- Overlay plan commit:")), `- Overlay plan commit: ${"0".repeat(40)}`));
{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, replaceLine(validBody(cwd), `- Overlay plan blob: ${git(cwd, ["rev-parse", "HEAD:docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md"])}`, "- Overlay plan blob:"));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Overlay plan blob must match the approved commit and current tracked plan\./v);
}

assertOverlayEvidenceFails(body => replaceLine(body, body.split("\n").find(line => line.startsWith("- Overlay plan blob:")), `- Overlay plan blob: ${"0".repeat(40)}`));
assertOverlayEvidenceFails(body => replaceLine(body, body.split("\n").find(line => line.startsWith("- Overlay plan SHA-256:")), `- Overlay plan SHA-256: ${"0".repeat(64)}`));
assertOverlayEvidenceFails(body => replaceLine(body, body.split("\n").find(line => line.startsWith("- Overlay plan SHA-256:")), `${body.split("\n").find(line => line.startsWith("- Overlay plan SHA-256:"))}\n- Overlay plan SHA-256: ${"0".repeat(64)}`));
{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, replaceLine(validBody(cwd), "- Independent plan review policy: GPT-5.6 Luna standard", "- Independent plan review policy:"));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Independent plan review policy must be GPT-5\.6 Terra standard or GPT-5\.6 Luna standard\./v);
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const result = runGate(cwd, replaceLine(validBody(cwd), "- Independent plan review policy: GPT-5.6 Luna standard", "- Independent plan review policy: GPT-5.6 Sol standard"));
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
	const result = runGate(cwd, validBody(cwd, {stage: "MSO-5", chatGptVerdict: "PENDING"}));
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
	const result = runGate(cwd, validBody(cwd, {stage: "MSO-5", chatGptVerdict: "PENDING"}));
	assert.equal(result.status, 0);
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const body = validBody(cwd);
	write(cwd, "docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md", "unstaged mutation\n");
	const result = runGate(cwd, body);
	assert.equal(result.status, 0, "tracked overlay identity must ignore an unstaged plan mutation");
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	const planCommit = git(cwd, ["rev-parse", "HEAD"]);
	write(cwd, "docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md", "# Replaced overlay plan\n");
	git(cwd, ["add", "docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md"]);
	git(cwd, ["commit", "-m", "replace overlay plan"]);
	const result = runGate(cwd, replaceLine(validBody(cwd), `- Overlay plan commit: ${git(cwd, ["rev-parse", "HEAD"])}`, `- Overlay plan commit: ${planCommit}`));
	assert.equal(result.status, 1, "a stale approved plan blob must fail");
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(cwd, "");
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Pull request body is empty/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(
		cwd,
		"## Reuse Proof\n\nTODO\n\n## Retired Surface\n\nN/A\n",
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
			"- ChatGPT final review prompt/verdict: PASS",
			"- ChatGPT final review prompt/verdict: not run yet",
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Exactly one Codex or ChatGPT final review prompt\/verdict must be PASS or PASS_WITH_NITS/v);
}

{
	const cwd = createRepo({withGateControlFile: true});
	commitGateControlDeletion(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			"- ChatGPT final review prompt/verdict: PASS",
			"- ChatGPT final review prompt/verdict: not run yet",
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Exactly one Codex or ChatGPT final review prompt\/verdict must be PASS or PASS_WITH_NITS/v);
}

{
	const cwd = createRepo();
	commitPackageManifestChange(cwd);
	const result = runGate(cwd, "");
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
			"- ChatGPT final review prompt/verdict: PASS",
			"- ChatGPT final review prompt/verdict: not run yet",
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Exactly one Codex or ChatGPT final review prompt\/verdict must be PASS or PASS_WITH_NITS/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			"- `npm run lint`: passed",
			"- `npm run lint`: not passed",
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
			"- CodeScene MCP `analyze_change_set`: passed, no decline, quality_gates: passed",
			"- CodeScene MCP `analyze_change_set`: failed, not passed",
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
		"- CodeScene MCP `analyze_change_set`: passed, no decline, quality_gates: passed",
		"- CodeScene MCP `analyze_change_set`: passed, no decline",
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
			"- Reviewer verdict: PASS",
			"- Reviewer verdict: not PASS",
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Reviewer verdict must be exactly PASS or PASS_WITH_NITS/v);
}

assertOverlayEvidenceFails(body => replaceLine(body, "- Reviewer verdict: PASS", "- Reviewer verdict: PASS\n- Reviewer verdict: CHANGES_REQUIRED"));

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(
		cwd,
		replaceLine(
			validBody(cwd),
			"- ChatGPT final review prompt/verdict: PASS",
			"- ChatGPT final review prompt/verdict: CHANGES_REQUIRED; PASS later",
		),
	);
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Exactly one Codex or ChatGPT final review prompt\/verdict must be PASS or PASS_WITH_NITS/v);
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
	commitSourceChange(cwd);
	const result = runGate(cwd, replaceLine(
		validBody(cwd),
		"- ChatGPT final review prompt/verdict: PASS",
		"- Codex final review prompt/verdict: PASS",
	));
	assert.equal(result.status, 0);
	assert.match(result.stdout, /PR debt contract evidence sections are present and specific/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(cwd, replaceLine(
		validBody(cwd),
		"- ChatGPT final review prompt/verdict: PASS",
		"- Codex final review prompt/verdict: PASS\n- ChatGPT final review prompt/verdict: PASS",
	));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Exactly one Codex or ChatGPT final review prompt\/verdict/v);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(cwd, replaceLine(
		validBody(cwd),
		"- ChatGPT final review prompt/verdict: PASS",
		"- Codex final review prompt/verdict: PASS\n- ChatGPT final review prompt/verdict: PASS\n- ChatGPT final review prompt/verdict: CHANGES_REQUIRED",
	));
	assert.equal(result.status, 1);
	assert.match(result.stderr, /Exactly one Codex or ChatGPT final review prompt\/verdict/v);
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
		"src/lib/risky.ts",
		"export function normalizeRiskyValue(value: string) {\n  return value.trim();\n}\n",
	);
	git(cwd, ["add", "src/lib/risky.ts"]);
	const result = runGate(cwd);
	assert.equal(result.status, 0);
	assert.match(result.stdout, /validation is deferred to pull request context/v);

	git(cwd, ["commit", "-m", "risky source change"]);
	const pullRequestResult = runGate(cwd, "");
	assert.equal(pullRequestResult.status, 1);
	assert.match(pullRequestResult.stderr, /Pull request body is empty/v);
}

const capabilityPlanFixtureCwd = createRepo();
const capabilityPrFixtureCwd = createRepo();
commitSourceChange(capabilityPrFixtureCwd);

function assertPlanInputFails(name, buildOptions) {
	const result = runPlanInput(
		capabilityPlanFixtureCwd,
		validPlanInput(capabilityPlanFixtureCwd, buildOptions(capabilityPlanFixtureCwd)),
	);
	assert.equal(result.status, 1, `plan-input validation must reject ${name}`);
}

function assertReuseProofFails(name, buildOptions) {
	const reuseProof = validReuseProof(capabilityPrFixtureCwd, buildOptions(capabilityPrFixtureCwd));
	const body = validBody(capabilityPrFixtureCwd, {reuseProof});
	const result = runGate(capabilityPrFixtureCwd, body);
	assert.equal(result.status, 1, `PR validation must reject ${name}`);
}

function assertBothEvidenceModesFail(name, buildOptions) {
	assertPlanInputFails(name, cwd => buildOptions(cwd, "plan"));
	assertReuseProofFails(name, cwd => buildOptions(cwd, "pr"));
}

function assertBothEvidenceModesPass(name, buildOptions) {
	const planOptions = buildOptions(capabilityPlanFixtureCwd, "plan");
	const planResult = runPlanInput(capabilityPlanFixtureCwd, validPlanInput(capabilityPlanFixtureCwd, planOptions));
	assert.equal(planResult.status, 0, `plan-input validation must accept ${name}`);

	const prOptions = buildOptions(capabilityPrFixtureCwd, "pr");
	const reuseProof = validReuseProof(capabilityPrFixtureCwd, prOptions);
	const prResult = runGate(capabilityPrFixtureCwd, validBody(capabilityPrFixtureCwd, {reuseProof}));
	assert.equal(prResult.status, 0, `PR validation must accept ${name}`);
}

function mapRow(id) {
	return [id, `scripts/${id.toLowerCase()}.mjs#run`, `${id} fixture probe`];
}

function capabilityIdentityLine(body, label) {
	const line = body.split("\n").find(candidate => candidate.startsWith(`Capability plan ${label}:`));
	assert.ok(line, `Missing capability plan ${label} in test body.`);
	return line;
}

function replaceCapabilityIdentityLine(body, label, value) {
	return replaceLine(
		body,
		capabilityIdentityLine(body, label),
		`Capability plan ${label}: ${value}`,
	);
}

assertBothEvidenceModesPass("exact platform inapplicability", (cwd, stage) => ({
	rows: [localNoFitCapability(), localPolicyCapability(cwd, stage)],
}));

assertBothEvidenceModesPass("a repository source in a leading-dot directory", (cwd, stage) => ({
	rows: replaceCapability(validCapabilityRows(cwd, stage), "C01", {
		source: ".agents/skills/metronome-workflow/SKILL.md#Promotion",
	}),
}));

assertBothEvidenceModesPass("a package API name containing a hyphen", (cwd, stage) => ({
	rows: replaceCapability(validCapabilityRows(cwd, stage), "C01", {
		sourceKind: "oss",
		source: "@opengsd/gsd-core@1.7.0#package-legitimacy",
	}),
}));

{
	const duplicatePlanSection = `${validPlanInput(capabilityPlanFixtureCwd)}\n## Existing Primitive Search\n\n${capabilityEvidence(capabilityPlanFixtureCwd, {stage: "plan"})}`;
	const result = runPlanInput(capabilityPlanFixtureCwd, duplicatePlanSection);
	assert.equal(result.status, 1, "plan-input validation must reject duplicate capability evidence sections");
}

{
	const duplicatePrSection = replaceLine(
		validBody(capabilityPrFixtureCwd),
		"## Retired Surface",
		`## Reuse Proof\n\n${validReuseProof(capabilityPrFixtureCwd)}\n\n## Retired Surface`,
	);
	const result = runGate(capabilityPrFixtureCwd, duplicatePrSection);
	assert.equal(result.status, 1, "PR validation must reject duplicate capability evidence sections");
}

const dualModeCases = [
	{
		name: "the legacy four-column reuse table",
		build: () => ({
			headers: legacyReuseHeaders,
			tableRows: [["legacy capability", "existing primitive", "scripts/existing.mjs", "Reuse"]],
			mapRows: [],
		}),
	},
	{
		name: "a malformed capability header",
		build: () => ({headers: ["Capability", ...capabilityHeaders.slice(1)]}),
	},
	{
		name: "a missing capability-table column",
		build: () => ({headers: capabilityHeaders.slice(0, -1)}),
	},
	{
		name: "a malformed delivery-map header",
		build: (cwd, stage) => ({
			mapHeaders: ["Capability ID", stage === "plan" ? "Planned files" : "Changed files", "Tests / probes"],
		}),
	},
	{
		name: "a malformed capability row",
		build(cwd, stage) {
			const rows = validCapabilityRows(cwd, stage);
			return {rows, tableRows: rows.map(capability => capabilityCells(capability)).map((row, index) => index === 0 ? row.slice(0, -1) : row)};
		},
	},
	{
		name: "a hidden row whose first cell repeats the capability header",
		build(cwd, stage) {
			const rows = validCapabilityRows(cwd, stage);
			return {
				rows,
				tableRows: [
					...rows.map(capability => capabilityCells(capability)),
					["Capability ID", "hidden row", "generic", "repo", "scripts/hidden.mjs#run", "API: run(); Probe: passed", "scripts/hidden.mjs", "direct-use", "N/A - selected source fits"],
				],
			};
		},
	},
	{
		name: "a missing capability cell",
		build: (cwd, stage) => ({
			rows: replaceCapability(validCapabilityRows(cwd, stage), "C01", {filesRead: ""}),
		}),
	},
	{
		name: "a missing capability ID",
		build: (cwd, stage) => ({
			rows: replaceCapability(validCapabilityRows(cwd, stage), "C01", {id: ""}),
		}),
	},
	{
		name: "a duplicate capability ID",
		build: (cwd, stage) => ({
			rows: replaceCapability(validCapabilityRows(cwd, stage), "C02", {id: "C01"}),
		}),
	},
	{
		name: "an implementation-map unknown capability ID",
		build: () => ({mapRows: [mapRow("C01"), mapRow("C99")]}),
	},
	{
		name: "a duplicate delivery-map capability ID",
		build: () => ({mapRows: [mapRow("C01"), mapRow("C02"), mapRow("C01")]}),
	},
	{
		name: "an invalid capability enum",
		build: (cwd, stage) => ({
			rows: replaceCapability(validCapabilityRows(cwd, stage), "C01", {sourceKind: "vendor"}),
		}),
	},
	{
		name: "an invalid decision relation",
		build: (cwd, stage) => ({
			rows: replaceCapability(validCapabilityRows(cwd, stage), "C01", {decision: "thin-policy"}),
		}),
	},
	{
		name: "a ranged installed semver source",
		build: (cwd, stage) => ({
			rows: replaceCapability(validCapabilityRows(cwd, stage), "C01", {
				sourceKind: "installed",
				source: "primitive-package@^1.2.3#readCapability",
			}),
		}),
	},
	{
		name: "an API marker omission",
		build: (cwd, stage) => ({
			rows: replaceCapability(validCapabilityRows(cwd, stage), "C01", {apiProbe: "Probe: fixture probe passed"}),
		}),
	},
	{
		name: "a Probe marker omission",
		build: (cwd, stage) => ({
			rows: replaceCapability(validCapabilityRows(cwd, stage), "C01", {apiProbe: "API: readCapability(value)"}),
		}),
	},
];

for (const testCase of dualModeCases) {
	assertBothEvidenceModesFail(testCase.name, testCase.build);
}

for (const missingMarker of ["repo:", "installed:", "oss:", "platform:"]) {
	assertBothEvidenceModesFail(`a local-no-fit row without ${missingMarker}`, (cwd, stage) => ({
		rows: [
			localNoFitCapability({
				evidence: "repo: no fit; installed: no fit; oss: no fit; platform: inapplicable - no official platform API applies"
					.split("; ")
					.filter(item => !item.startsWith(missingMarker))
					.join("; "),
			}),
			localPolicyCapability(cwd, stage),
		],
	}));
}

assertBothEvidenceModesFail("a thin-policy row without composition", () => ({
	rows: [genericCapability(), thinPolicyCapability({evidence: "policy-boundary: product constraints"})],
}));
assertBothEvidenceModesFail("a thin-policy row composed with an unknown capability", () => ({
	rows: [genericCapability(), thinPolicyCapability({evidence: "policy-boundary: product constraints; composes: C99"})],
}));
assertBothEvidenceModesFail("a thin-policy row composed with a non-generic capability", (cwd, stage) => ({
	rows: [
		genericCapability(),
		localPolicyCapability(cwd, stage),
		thinPolicyCapability({id: "C03", evidence: "policy-boundary: product constraints; composes: C02"}),
	],
}));

for (const [name, missingMarker] of [
	["a local-policy row without a policy boundary", "policy-boundary:"],
	["a local-policy row without composition", "composes:"],
	["a local-policy row without generic-operation: none", "generic-operation:"],
]) {
	assertBothEvidenceModesFail(name, (cwd, stage) => {
		const policy = localPolicyCapability(cwd, stage);
		const evidence = policy.evidence
			.split("; ")
			.filter(item => !item.startsWith(missingMarker))
			.join("; ");
		return {rows: replaceCapability(validCapabilityRows(cwd, stage), "C02", {evidence})};
	});
}

assertPlanInputFails("a local-policy row without pending plan approval", cwd => ({
	rows: replaceCapability(validCapabilityRows(cwd, "plan"), "C02", {
		evidence: "policy-boundary: product constraints; composes: C01; generic-operation: none",
	}),
}));
assertPlanInputFails("a local-policy row with malformed pending plan approval", cwd => ({
	rows: replaceCapability(validCapabilityRows(cwd, "plan"), "C02", {
		evidence: "policy-boundary: product constraints; composes: C01; generic-operation: none; approval: PLAN_REVIEW_PASS",
	}),
}));

for (const [name, approval] of [
	["a local-policy row without PR approval", null],
	["a local-policy row with malformed PR approval", "C02@malformed"],
]) {
	assertReuseProofFails(name, cwd => ({
		rows: replaceCapability(validCapabilityRows(cwd, "pr"), "C02", {
			evidence: `policy-boundary: product constraints; composes: C01; generic-operation: none${approval ? `; approval: ${approval}` : ""}`,
		}),
	}));
}

assertReuseProofFails("a local-policy row with a mismatched PR approval ID", cwd => {
	const identity = capabilityPlanIdentity(cwd);
	return {
		rows: replaceCapability(validCapabilityRows(cwd, "pr"), "C02", {
			evidence: `policy-boundary: product constraints; composes: C01; generic-operation: none; approval: C01@${identity.commit}/${identity.blob}/${identity.sha256}`,
		}),
	};
});

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(cwd, replaceCapabilityIdentityLine(validBody(cwd), "path", ""));
	assert.equal(result.status, 1, "PR validation must reject missing capability plan identity");
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(cwd, replaceCapabilityIdentityLine(validBody(cwd), "commit", "malformed"));
	assert.equal(result.status, 1, "PR validation must reject malformed capability plan identity");
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const nonAncestorCommit = createNonAncestorCommit(cwd);
	const result = runGate(cwd, replaceCapabilityIdentityLine(validBody(cwd), "commit", nonAncestorCommit));
	assert.equal(result.status, 1, "PR validation must reject a non-ancestor capability plan identity");
}

{
	const cwd = createRepo();
	const staleIdentity = capabilityPlanIdentity(cwd);
	write(cwd, capabilityPlanPath, "# Revised capability admission plan\n");
	git(cwd, ["add", capabilityPlanPath]);
	git(cwd, ["commit", "-m", "revise capability plan"]);
	commitSourceChange(cwd);
	let body = validBody(cwd);
	body = replaceCapabilityIdentityLine(body, "commit", staleIdentity.commit);
	body = replaceCapabilityIdentityLine(body, "blob", staleIdentity.blob);
	body = replaceCapabilityIdentityLine(body, "SHA-256", staleIdentity.sha256);
	const result = runGate(cwd, body);
	assert.equal(result.status, 1, "PR validation must reject a stale capability plan identity");
}

{
	const cwd = createRepo();
	const oldIdentity = capabilityPlanIdentity(cwd);
	write(cwd, capabilityPlanPath, "# Revised capability admission plan\n");
	git(cwd, ["add", capabilityPlanPath]);
	git(cwd, ["commit", "-m", "revise capability plan"]);
	commitSourceChange(cwd);
	const reuseProof = validReuseProof(cwd, {
		rows: [
			genericCapability(),
			localPolicyCapability(cwd, "pr", {
				approval: `C02@${oldIdentity.commit}/${oldIdentity.blob}/${oldIdentity.sha256}`,
			}),
		],
	});
	const result = runGate(cwd, validBody(cwd, {reuseProof}));
	assert.equal(result.status, 1, "PR validation must reject an approval token that differs from the declared capability plan identity");
}

function assertConformanceFails(cwd, body, message) {
	const result = runGate(cwd, body);
	assert.equal(result.status, 1, message);
}

function replaceLines(body, replacements) {
	let current = body;
	for (const [from, to] of replacements) {
		current = replaceLine(current, from, to);
	}

	return current;
}

function conformanceFieldLine(body, label) {
	const line = body.split("\n").find(candidate => candidate.startsWith(`- ${label}:`));
	assert.ok(line, `missing structural fixture line for ${label}`);
	return line;
}

function validTriggeredConformanceBody({
	stage = "MSO-6",
	chatGptVerdict = stage === "MSO-5" ? "PENDING" : "PASS",
	conformanceStatus,
} = {}) {
	const cwd = createRepo();
	commitPathChange(cwd, "skills/metronome_planner.md");
	return {
		cwd,
		body: validBody(cwd, {stage, chatGptVerdict, conformanceStatus}),
	};
}

const nonTriggerPaths = [
	"docs/v1/implementation-slices/plans/G-02-reuse-first-capability-admission-gate.md",
	"scripts/validate-pr-debt-contract.selftest.mjs",
	"scripts/foo.mjs",
	"package.json",
	"package-lock.json",
	"docs/v1/implementation-slices/refactor/R-01-sheet-practice-controls.md",
	"src/lib/ordinary-product.ts",
	"tests/unit/ordinary-product.test.ts",
	"skills/unrelated-role.md",
	".github/workflows/unrelated.yml",
	".semgrep/unrelated.yml",
	".codescene/unrelated.json",
];

for (const [paths, expectedApplicability, expectedStatus, wrongApplicability, wrongStatus] of [
	[reuseAdmissionControlFiles, "REQUIRED", "PASS", "NOT_APPLICABLE", "NOT_APPLICABLE"],
	[nonTriggerPaths, "NOT_APPLICABLE", "NOT_APPLICABLE", "REQUIRED", "PENDING"],
]) {
	for (const changedPath of paths) {
		const cwd = createRepo();
		commitPathChange(cwd, changedPath);
		const body = validBody(cwd);
		assert.equal(runGate(cwd, body).status, 0, `${changedPath} must accept exact ${expectedApplicability} conformance evidence`);
		const invalidBody = replaceLines(body, [
			[`- ${conformanceLabels.applicability}: ${expectedApplicability}`, `- ${conformanceLabels.applicability}: ${wrongApplicability}`],
			[`- ${conformanceLabels.status}: ${expectedStatus}`, `- ${conformanceLabels.status}: ${wrongStatus}`],
		]);
		assertConformanceFails(cwd, invalidBody, `${changedPath} must reject ${wrongApplicability} conformance evidence`);
	}
}

const mso5PendingFixture = validTriggeredConformanceBody({stage: "MSO-5"});
const mso5PassFixture = validTriggeredConformanceBody({stage: "MSO-5", conformanceStatus: "PASS"});
const completeConformanceFixture = validTriggeredConformanceBody();
for (const [{cwd, body}, message] of [
	[mso5PendingFixture, "triggered MSO-5 must accept PENDING conformance before external review"],
	[mso5PassFixture, "triggered MSO-5 must accept complete PASS conformance before external review"],
	[completeConformanceFixture, "triggered MSO-6 must accept complete PASS conformance"],
]) {
	assert.equal(runGate(cwd, body).status, 0, message);
}

{
	const {cwd, body} = validTriggeredConformanceBody();
	const featureHead = git(cwd, ["rev-parse", "HEAD"]);
	git(cwd, ["switch", "-c", "synthetic-merge", "main"]);
	git(cwd, ["merge", "--no-ff", "feature", "-m", "synthetic pull request merge"]);
	const mergeHead = git(cwd, ["rev-parse", "HEAD"]);
	assert.notEqual(mergeHead, featureHead, "synthetic merge HEAD must differ from the feature head");
	const result = runGate(cwd, body, {headSha: featureHead});
	assert.equal(result.status, 0, "required conformance must bind candidate HEAD to pull_request.head.sha under a synthetic merge checkout");
	const mergeBoundBody = replaceLine(
		body,
		`- ${conformanceLabels.candidateHead}: ${featureHead}`,
		`- ${conformanceLabels.candidateHead}: ${mergeHead}`,
	);
	assert.equal(runGate(cwd, mergeBoundBody, {includeHead: false}).status, 1, "required conformance must reject a missing pull_request.head.sha without falling back to the synthetic merge HEAD");
	assert.equal(runGate(cwd, mergeBoundBody, {headSha: null}).status, 1, "required conformance must reject a malformed pull_request.head.sha without falling back to the synthetic merge HEAD");
	assert.equal(runGate(cwd, mergeBoundBody, {headSha: "malformed"}).status, 1, "required conformance must reject a non-hex pull_request.head.sha without falling back to the synthetic merge HEAD");
}

assertConformanceFails(
	mso5PendingFixture.cwd,
	replaceLines(mso5PendingFixture.body, [
		[`- ${conformanceLabels.applicability}: REQUIRED`, `- ${conformanceLabels.applicability}: NOT_APPLICABLE`],
		[`- ${conformanceLabels.status}: PENDING`, `- ${conformanceLabels.status}: NOT_APPLICABLE`],
	]),
	"triggered MSO-5 must reject NOT_APPLICABLE conformance",
);
assertConformanceFails(
	completeConformanceFixture.cwd,
	replaceLine(completeConformanceFixture.body, `- ${conformanceLabels.status}: PASS`, `- ${conformanceLabels.status}: PENDING`),
	"triggered MSO-6 must reject PENDING conformance",
);

for (const [stage, chatGptVerdict] of [["MSO-5", "PENDING"], ["MSO-6", "PASS"]]) {
	const cwd = createRepo();
	commitSourceChange(cwd);
	const result = runGate(cwd, validBody(cwd, {stage, chatGptVerdict}));
	assert.equal(result.status, 0, `non-triggered ${stage} must accept NOT_APPLICABLE conformance`);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const invalidBody = replaceLines(validBody(cwd), [
		[`- ${conformanceLabels.applicability}: NOT_APPLICABLE`, `- ${conformanceLabels.applicability}: REQUIRED`],
		[`- ${conformanceLabels.status}: NOT_APPLICABLE`, `- ${conformanceLabels.status}: PASS`],
	]);
	assertConformanceFails(cwd, invalidBody, "non-triggered MSO-6 must require NOT_APPLICABLE conformance");
}

for (const label of [
	conformanceLabels.applicability,
	conformanceLabels.status,
	conformanceLabels.capabilityPlanReference,
	conformanceLabels.candidateHead,
]) {
	const {cwd, body} = completeConformanceFixture;
	const line = conformanceFieldLine(body, label);
	assertConformanceFails(cwd, replaceLine(body, line, `- ${label}:`), `required conformance must reject missing ${label}`);
}

const {cwd: completeCwd, body: completeBody} = completeConformanceFixture;
const completeHead = git(completeCwd, ["rev-parse", "HEAD"]);
const coreMutationCases = [
	[
		"required conformance must reference the existing Reuse Proof Capability plan identity",
		[[`- ${conformanceLabels.capabilityPlanReference}: Reuse Proof`, `- ${conformanceLabels.capabilityPlanReference}: Overlay plan`]],
	],
	[
		"required conformance must reject duplicate Capability plan identity references",
		[[`- ${conformanceLabels.capabilityPlanReference}: Reuse Proof`, `- ${conformanceLabels.capabilityPlanReference}: Reuse Proof\n- ${conformanceLabels.capabilityPlanReference}: Reuse Proof`]],
	],
	[
		"required conformance must reject malformed candidate HEAD",
		[[`- ${conformanceLabels.candidateHead}: ${completeHead}`, `- ${conformanceLabels.candidateHead}: malformed`]],
	],
	[
		"required conformance must reject uppercase candidate HEAD",
		[[`- ${conformanceLabels.candidateHead}: ${completeHead}`, `- ${conformanceLabels.candidateHead}: ${completeHead.toUpperCase()}`]],
	],
];
for (const [message, replacements] of coreMutationCases) {
	assertConformanceFails(completeCwd, replaceLines(completeBody, replacements), message);
}

{
	const {cwd, body} = validTriggeredConformanceBody();
	commitPathChange(cwd, "src/lib/post-conformance-drift.ts");
	assertConformanceFails(cwd, body, "required conformance must reject a stale candidate HEAD");
}

for (const label of [
	conformanceLabels.redBaseline,
	conformanceLabels.redFamilies,
	conformanceLabels.greenFamilies,
	conformanceLabels.greenNegatives,
	conformanceLabels.greenPositives,
	conformanceLabels.greenMetamorphicPairs,
]) {
	const {cwd, body} = completeConformanceFixture;
	const line = conformanceFieldLine(body, label);
	assertConformanceFails(cwd, replaceLine(body, line, `- ${label}:`), `PASS conformance must reject missing ${label}`);
}

{
	const {cwd, body} = completeConformanceFixture;
	const baseline = git(cwd, ["merge-base", "main", "HEAD"]);
	assertConformanceFails(
		cwd,
		replaceLine(body, `- ${conformanceLabels.redBaseline}: ${baseline}`, `- ${conformanceLabels.redBaseline}: malformed`),
		"PASS conformance must reject a malformed RED baseline commit",
	);
	assertConformanceFails(
		cwd,
		replaceLine(body, `- ${conformanceLabels.redBaseline}: ${baseline}`, `- ${conformanceLabels.redBaseline}: ${baseline.toUpperCase()}`),
		"PASS conformance must reject an uppercase RED baseline commit",
	);
	assertConformanceFails(
		cwd,
		replaceLine(body, `- ${conformanceLabels.redBaseline}: ${baseline}`, `- ${conformanceLabels.redBaseline}: ${git(cwd, ["rev-parse", "HEAD"])}`),
		"PASS conformance must bind RED baseline to the current merge base",
	);
}

{
	const {cwd, body} = completeConformanceFixture;
	const baseline = git(cwd, ["merge-base", "main", "HEAD"]);
	const nonAncestorCommit = createNonAncestorCommit(cwd);
	assertConformanceFails(
		cwd,
		replaceLine(body, `- ${conformanceLabels.redBaseline}: ${baseline}`, `- ${conformanceLabels.redBaseline}: ${nonAncestorCommit}`),
		"PASS conformance must reject a non-ancestor RED baseline commit",
	);
}

for (const [label, wrongCount] of [
	[conformanceLabels.redFamilies, "3/4"],
	[conformanceLabels.greenFamilies, "3/4"],
	[conformanceLabels.greenNegatives, "7/8"],
	[conformanceLabels.greenPositives, "3/4"],
	[conformanceLabels.greenMetamorphicPairs, "3/4"],
]) {
	const {cwd, body} = completeConformanceFixture;
	const line = conformanceFieldLine(body, label);
	assertConformanceFails(cwd, replaceLine(body, line, `- ${label}: ${wrongCount}`), `PASS conformance must reject wrong ${label}`);
}

const malformedCompactOutputCases = [
	["RED | q7m-01 | PLAN_READY | NONE", "RED | q7m-01 | PLAN_READY | opaque-code", "successful verdicts require NONE"],
	["RED | q7m-02 | PLAN_BLOCKED | NONE", "RED | q7m-02 | PLAN_BLOCKED | UPPER-CODE", "blocked verdict codes must be lowercase kebab case"],
	["RED | q7m-03 | PLAN_BLOCKED | opaque-code", "RED | q7m-03 | UNKNOWN | NONE", "compact output verdicts must use the answer-neutral enum"],
	["GREEN | v2k-04 | PASS | NONE", "GREEN | v2k-04 | PASS | unexpected-code", "PASS requires NONE"],
];

for (const [from, to, description] of malformedCompactOutputCases) {
	const {cwd, body} = completeConformanceFixture;
	assertConformanceFails(cwd, replaceLine(body, from, to), `PASS conformance must reject compact output where ${description}`);
}

const compactStructureCases = [
	[replaceLine(completeBody, "RED | q7m-02 | PLAN_BLOCKED | NONE", ""), "PASS conformance must require exactly twelve RED compact lines"],
	[replaceLine(completeBody, "RED | q7m-02 | PLAN_BLOCKED | NONE", "RED | q7m-01 | PLAN_BLOCKED | NONE"), "PASS conformance must reject duplicate opaque IDs within a phase"],
	[replaceLine(completeBody, "GREEN | b4n-12 | PASS_WITH_NITS | NONE", "GREEN | new-13 | PASS_WITH_NITS | NONE"), "PASS conformance must require identical RED and GREEN opaque ID sets"],
	[`${completeBody}RED | extra-13 | CHANGES_REQUIRED | NONE\n`, "PASS conformance must reject extra compact lines"],
	[
		replaceLine(completeBody, `- ${conformanceLabels.status}: PASS`, `- ${conformanceLabels.status}: PASS\n- Reuse-admission conformance hidden oracle: persisted`),
		"conformance evidence must reject extra persisted conformance fields",
	],
];
for (const [body, message] of compactStructureCases) {
	assertConformanceFails(completeCwd, body, message);
}

{
	const {cwd, body} = validTriggeredConformanceBody({stage: "MSO-5"});
	assertConformanceFails(
		cwd,
		`${body}RED | extra-before-pass | PLAN_BLOCKED | NONE\n`,
		"PENDING conformance must not persist compact result lines",
	);
}

{
	const cwd = createRepo();
	commitSourceChange(cwd);
	const body = validBody(cwd);
	assertConformanceFails(
		cwd,
		`${body}GREEN | extra-not-applicable | PASS | NONE\n`,
		"NOT_APPLICABLE conformance must not persist compact result lines",
	);
}

function recordReviewRepairExpectation(cwd, body, expectedStatus, message) {
	assert.equal(runGate(cwd, body).status, expectedStatus, message);
}

{
	const cwd = createRepo();
	commitPathChange(cwd, "tests/unit/reuse-proof-contract.test.ts");
	const body = validBody(cwd);
	for (const [candidateBody, expectedStatus, message] of [
		[body, 0, "test-only PR must accept complete Reuse Proof and NOT_APPLICABLE conformance"],
		[
			replaceLine(body, `| ${capabilityHeaders.join(" | ")} |`, "| Capability ID | malformed capability table |"),
			1,
			"test-only PR must reject a malformed Reuse Proof capability table",
		],
		[
			replaceLine(body, `| ${prMapHeaders.join(" | ")} |`, "| Capability ID | malformed implementation map |"),
			1,
			"test-only PR must reject a malformed Capability Implementation Map",
		],
	]) {
		recordReviewRepairExpectation(cwd, candidateBody, expectedStatus, message);
	}
}

for (const [from, to, expectedStatus, message] of [
	[
		`- ${conformanceLabels.applicability}: REQUIRED`,
		`- ${conformanceLabels.applicability.toLowerCase()}: REQUIRED`,
		1,
		"conformance evidence must reject a lowercase canonical field",
	],
	[`- ${conformanceLabels.status}: PASS`, `- ${conformanceLabels.status}: PASS\n    hidden oracle: PLAN_BLOCKED/reuse-existing`, 1, "conformance evidence must reject an indented hidden-oracle continuation"],
	[`- ${conformanceLabels.status}: PASS`, `- ${conformanceLabels.status}: PASS\n    full response: projected role output`, 1, "conformance evidence must reject an indented full-response continuation"],
	[`- ${conformanceLabels.status}: PASS`, `- ${conformanceLabels.status}: PASS\n    Prompt: projected role input`, 1, "conformance evidence must reject an indented Prompt continuation"],
	[`- ${conformanceLabels.status}: PASS`, `- ${conformanceLabels.status}: PASS\n    Rationalization: renamed expected reasoning`, 1, "conformance evidence must reject an indented Rationalization continuation"],
	[`- ${conformanceLabels.status}: PASS`, `- ${conformanceLabels.status}: PASS\n    arbitrary continuation data`, 1, "conformance evidence must reject an arbitrary indented continuation"],
	["- ChatGPT final review prompt/verdict: PASS", "- Codex final review prompt/verdict: PASS", 0, "exact Codex final review prompt/verdict evidence must remain allowed"],
]) {
	recordReviewRepairExpectation(completeCwd, replaceLine(completeBody, from, to), expectedStatus, message);
}

{
	const {commit, blob, sha256} = capabilityPlanIdentity(completeCwd);
	const approval = `LOCAL_POLICY_APPROVED C02 ${commit} ${blob} ${sha256}`;
	for (const [line, expectedStatus, message] of [
		[`LOCAL_POLICY_APPROVED C02 ${commit} ${blob}`, 1, "local-policy reviewer output must reject a missing identity token"],
		[`${approval} extra`, 1, "local-policy reviewer output must reject an extra token"],
		[`LOCAL_POLICY_APPROVED C02 ${commit} ${blob} ${sha256.toUpperCase()}`, 1, "local-policy reviewer output must reject uppercase hash evidence"],
		[approval, 0, "local-policy reviewer output must allow exact lowercase identity evidence"],
	]) {
		const body = replaceLine(completeBody, `- ${conformanceLabels.status}: PASS`, `- ${conformanceLabels.status}: PASS\n${line}`);
		recordReviewRepairExpectation(completeCwd, body, expectedStatus, message);
	}
}

function withoutOverlayEvidence(body) {
	return replaceLines(body, [
		["- Overlay plan path: docs/superpowers/plans/2026-07-16-metronome-superpowers-overlay.md", "- Overlay plan path:"],
		[conformanceFieldLine(body, "Overlay plan commit"), "- Overlay plan commit:"],
		[conformanceFieldLine(body, "Overlay plan blob"), "- Overlay plan blob:"],
		[conformanceFieldLine(body, "Overlay plan SHA-256"), "- Overlay plan SHA-256:"],
		["- Independent plan review policy: GPT-5.6 Luna standard", "- Independent plan review policy:"],
		["- Independent plan review verdict: PLAN_REVIEW_PASS", "- Independent plan review verdict:"],
	]);
}

{
	const cwd = createRepo();
	commitPathChange(cwd, "skills/metronome_reviewer.md");
	recordReviewRepairExpectation(
		cwd,
		withoutOverlayEvidence(validBody(cwd)),
		0,
		"reuse-only reviewer control must not require historical overlay promotion evidence",
	);
}

{
	const cwd = createRepo();
	commitAgentsRouterChange(cwd);
	recordReviewRepairExpectation(
		cwd,
		withoutOverlayEvidence(validBody(cwd)),
		1,
		"AGENTS.md overlay control must still require historical overlay promotion evidence",
	);
}

console.log("validate-pr-debt-contract selftest passed.");
