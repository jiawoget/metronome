#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";

const required = [
  ".codescene/code-health-rules.json",
  ".codescene/quality-gate-policy.md",
  ".semgrep/metronome-architecture.yml",
  ".semgrep/metronome-duplication.yml",
  ".semgrep/metronome-library-primitives.yml",
  ".semgrep/metronome-ui-ownership.yml",
  "skills/code_review.md",
  "docs/refactor/src-debt-inventory.template.md",
  "docs/refactor/primitive-check.template.md",
  "scripts/run-metronome-semgrep-changed.mjs"
];

let failed = false;

for (const path of required) {
  if (!existsSync(path)) {
    console.error(`Missing required debt gate file: ${path}`);
    failed = true;
  }
}

try {
  const config = JSON.parse(readFileSync(".codescene/code-health-rules.json", "utf8"));
  if (!Array.isArray(config.rule_sets)) {
    console.error(".codescene/code-health-rules.json must contain rule_sets array.");
    failed = true;
  }
} catch (error) {
  console.error(`Invalid CodeScene JSON: ${error instanceof Error ? error.message : String(error)}`);
  failed = true;
}

if (failed) {
  process.exit(1);
}

console.log("Metronome debt gate package files are present.");
