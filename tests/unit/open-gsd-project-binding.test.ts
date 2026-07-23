import { readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import { describe, expect, it } from "vitest";

const policySkill = "skills/metronome-policy";

function readContract(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

function contractLine(source: string, marker: string) {
  return source
    .split("\n")
    .find((line) => line.includes(marker)) ?? "";
}

const config = JSON.parse(readContract(".planning/config.json")) as {
  agent_skills?: Record<string, string[]>;
};
const agents = readContract("AGENTS.md");
const policy = readContract("skills/metronome-policy/SKILL.md");

describe("OpenGSD project binding", () => {
  it("binds project policy to the fixer and debugger through native agent_skills", () => {
    expect({
      debugger: config.agent_skills?.["gsd-debugger"],
      fixer: config.agent_skills?.["gsd-code-fixer"]
    }).toEqual({
      debugger: [policySkill],
      fixer: [policySkill]
    });
  });

  it("keeps read-only review available while prohibiting every fixer and auto-fix route", () => {
    expect(contractLine(agents, "Read-only `gsd-code-reviewer`")).toContain(
      "remains available"
    );

    const controllerBoundary = contractLine(
      agents,
      "Project controllers must not invoke"
    );
    expect(controllerBoundary).toContain("`$gsd-code-review --fix`");
    expect(controllerBoundary).toContain("`$gsd-audit-fix`");
    expect(controllerBoundary).toContain("directly dispatch `gsd-code-fixer`");
    expect(agents).toContain(
      "Review findings return through the normal native executor boundary."
    );
  });

  it("keeps the installed fixer isolated until both upstream incompatibilities are corrected", () => {
    const fixerBoundary = contractLine(agents, "The fixer remains isolated");
    expect(fixerBoundary).toContain(
      'the installed OpenGSD `gsd-code-fixer` resolves `sandbox_mode = "read-only"` while its prompt requires edits and commits and unconditionally creates a worktree.'
    );
    expect(fixerBoundary).toContain(
      "Do not copy or patch the generated agent."
    );
    expect(fixerBoundary).toContain(
      'Keep this route prohibited until a later official OpenGSD version supplies `sandbox_mode = "workspace-write"` and respects `workflow.use_worktrees=false`.'
    );
  });

  it("conditions debugger dispatch on its writable sandbox, exact checkout, and policy resolution", () => {
    const debuggerBoundary = contractLine(
      agents,
      "`gsd-debugger` may be dispatched only"
    );
    expect(debuggerBoundary).toContain('sandbox_mode = "workspace-write"');
    expect(debuggerBoundary).toContain("current working directory");
    expect(debuggerBoundary).toContain("Git top-level");
    expect(debuggerBoundary).toContain("primary worktree");
    expect(debuggerBoundary).toContain("`C:\\Users\\wsuto\\metronome`");
    expect(debuggerBoundary).toContain(policySkill);
  });

  it("requires every typed dispatch to carry all four native-resolved fields explicitly", () => {
    const typedDispatch = contractLine(agents, "Every typed GSD dispatch");
    expect(typedDispatch).toContain("explicitly");
    expect(typedDispatch).toContain("`agent_type`");
    expect(typedDispatch).toContain("`model`");
    expect(typedDispatch).toContain("`reasoning_effort`");
    expect(typedDispatch).toContain('`fork_turns: "none"`');
    expect(typedDispatch).toContain("fail-closed incompatibility");
  });

  it("defines matching fixer and debugger boundaries in the injected policy", () => {
    const fixerRole = contractLine(policy, "| Code fixer |");
    expect(fixerRole).toContain("policy context");
    expect(fixerRole).toContain("normal native executor boundary");
    expect(fixerRole).toContain("Project-controller dispatch");
    expect(fixerRole).toContain("auto-fix");
    expect(fixerRole).toContain("worktree");
    expect(fixerRole).toContain("read-only");

    const debuggerRole = contractLine(policy, "| Debugger |");
    expect(debuggerRole).toContain("workspace-write");
    expect(debuggerRole).toContain("exact primary checkout");
    expect(debuggerRole).toContain("policy resolution");
    expect(debuggerRole).toContain("missing precondition");
    expect(debuggerRole).toContain("implicit typed binding");
  });
});
