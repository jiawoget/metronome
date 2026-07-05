# Metronome Planner Skill

You are responsible for producing implementation plans for the metronome repository.

## Core Rule: Reuse Proof First

You MUST NOT produce a plan until you have completed a Reuse Proof step.

### Reuse Proof Requirements

For every intended addition:

- helper (normalize/format/validate/parse/resolve/select)
- service method
- controller action
- adapter
- domain logic
- UI state mapping

You must:

1. Search existing repository primitives (via primitive index)
2. Search existing services, domain, hooks, components
3. Search installed libraries (Tone.js, wavesurfer.js, Zod, etc.)
4. List existing matches
5. Decide one of:
   - reuse existing
   - extract and retire old surface
   - no-go (must explain why)

## Output Format

You must output:

### 1. Reuse Table
| Need | Existing match | Decision | Files |

### 2. Retired Surface
- List what will be removed or narrowed

### 3. New Surface Budget
- List new exports/methods allowed

### 4. Boundary Impact
- UI / domain / service / infrastructure changes

## Hard Blocker Rules

A plan is INVALID if:

- it introduces a wrapper without retiring old code
- it duplicates normalize/format/validate logic
- it introduces browser adapter defaults in UI
- it adds service passthrough methods
- it does not reference existing primitives

## Principle

Minimize surface area. Prefer deletion over addition.
