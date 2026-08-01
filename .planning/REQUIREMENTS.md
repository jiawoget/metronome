# Requirements: Metronome v1.2 Release Assurance & Workflow Closure

**Defined:** 2026-08-01
**Core Value:** Musicians can move from a score and practice target to a repeatable local practice-and-review loop without surrendering their recordings or practice data to a cloud service.

## Milestone v1.2 Requirements

### Secure Recording Identity

- [ ] **ID-01**: When both Web Crypto ID APIs are available, quick-recording creation uses `crypto.randomUUID()` with the existing `recording_` prefix, proven by a deterministic focused test without changing production semantics.
- [ ] **ID-02**: When `crypto.randomUUID()` is unavailable, quick-recording creation converts exactly 16 `crypto.getRandomValues()` bytes into 32 lowercase hexadecimal characters and keeps `artifactRef.artifactId` identical to the recording ID.
- [ ] **ID-03**: When neither secure Web Crypto path is available, quick-recording creation throws the existing secure-random error and produces no recording.

### Pre-commit Runtime Selection

- [ ] **HOOK-01**: The tracked pre-commit hook uses a direct Node/npm pair only when the exact candidates both have stable versions satisfying the engine lower bounds read from the staged root `package.json`.
- [ ] **HOOK-02**: Every missing, malformed, prerelease, unsupported-range, or engine-incompatible direct pair routes to the existing `scripts/npm-local.ps1` when an existing PowerShell host is available and otherwise fails non-zero.
- [ ] **HOOK-03**: Engine-aware selection preserves the existing staged-index snapshot, bootstrap, `.planning/**` exclusion, cleanup, exit propagation, whitespace check, and fast `format:check` boundary.

### Binary Fixture Integrity

- [ ] **PDF-01**: The raw working-tree blob IDs for `real-sheet.pdf` and `two-page-sheet.pdf` equal their respective `HEAD` blob IDs, both files retain their valid committed sizes and offsets, and neither path has a tracked diff.

### Lifecycle Authority

- [ ] **AUTH-01**: Active sections of PROJECT, STATE, ROADMAP, and AGENTS consistently state that v1.1 shipped, v1.2 assurance is active, product/R01 scope remains dormant, Native OpenGSD is the sole lifecycle authority, and the current authorization stops after native verification.
- [ ] **FLOW-01**: Native OpenGSD owns and completes v1.2 research, requirements and roadmap creation, checker-approved planning, bounded execution, and verification for the resulting revision.

### Scope Integrity

- [ ] **SCOPE-01**: The resulting milestone contains no product expansion, dormant-seed activation, secure-ID production redesign, new dependency/runtime wrapper/lifecycle controller, PDF content change, final-review-specific reverify gate, or shipping action.

## Future Requirements

### Separately Authorized Product or Refactor Work

- The 32 dormant product seeds remain unchanged and require a future owner-selected product milestone.
- Any fresh evidence-led R01 requires a separate milestone and must be derived from then-current live evidence.
- Generalized compound SemVer-range support requires separate scope if the root engine declarations later move beyond simple stable lower bounds.

## Out of Scope

| Feature | Reason |
|---------|--------|
| New product behavior or dormant-seed activation | v1.2 assures the merged tree; it is not a product milestone. |
| Secure-ID production redesign or weak-random fallback | The owner chose to retain the current secure Web Crypto contract. |
| New dependency, runtime manager, wrapper, formatter, checksum sidecar, or hook controller | Existing owners can satisfy the requirements without parallel infrastructure. |
| PDF fixture rewrite or permanent fixture-check subsystem | Valid committed blobs already exist; v1.2 restores and proves local byte identity. |
| Custom lifecycle validator/controller or final-review-specific native reverify gate | Native OpenGSD remains the sole lifecycle owner, and the owner rejected another process layer. |
| Push, pull request, final-head CI/review, merge, tag, or local-main synchronization | Current authorization ends after Native OpenGSD verification. |
| Reading or transforming `.planning/deprecated/**` | The directory remains an absolute historical quarantine. |

## Traceability

Roadmap mapping is populated by the Native OpenGSD roadmapper.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ID-01 | Unmapped | Pending |
| ID-02 | Unmapped | Pending |
| ID-03 | Unmapped | Pending |
| HOOK-01 | Unmapped | Pending |
| HOOK-02 | Unmapped | Pending |
| HOOK-03 | Unmapped | Pending |
| PDF-01 | Unmapped | Pending |
| AUTH-01 | Unmapped | Pending |
| FLOW-01 | Unmapped | Pending |
| SCOPE-01 | Unmapped | Pending |

**Coverage:**
- v1.2 requirements: 10 total
- Mapped to phases: 0
- Unmapped: 10

---
*Requirements defined: 2026-08-01*
*Last updated: 2026-08-01 after v1.2 project research*
