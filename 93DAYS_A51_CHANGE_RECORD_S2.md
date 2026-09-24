# A51 Change Record — S2 Progressive Disclosure & Human-Readable Diagnostics

Change ID: **A51-S2-CLOSURE**  
Stage / Requirement: **A51-S2 / REQ-010 progressive disclosure + human-readable diagnostics**  
Risk: **MEDIUM** (presentation-layer change over HIGH-risk preview/runtime boundaries)  
Verified code SHA: `5c496cb00dcac0e64370340ef1b33497504656a4`  
Verified workflow run: `93 Days Branch Check #430` / run id `35114699023`

## Problem / requirement

The S1 laboratory exposed technically useful controls, but raw traces, explicit overrides, comparison tools and Force Outcome lived at the same visual level. A51-S2 must make the laboratory useful to an author without pretending raw debug output is the normal preview experience.

## Contract

S2 is presentation-only. It must not introduce a second resolver or alter canonical runtime semantics.

The approved disclosure model is:

```text
Preview
  compact current context + human-readable Move result
    ↓
Analysis
  guard reasons + explicit test-only overrides + changes/comparison
    ↓
Deep Debug
  raw JSON traces + Force Outcome + provenance
```

Human-readable diagnostics are projections of the existing canonical `NarrativeProjectMoveResolutionTrace`: `status`, `resolutionSummary`, `guardTraces` and authored `outcomeId`.

## Implementation

Primary slice: `6ca006a4317b47ac9d019e0cdf5a193df45ae595` (`feat: add A51 progressive preview diagnostics`).

It changes only:
- `src/components/narrative/workspace/preview-laboratory-panel.tsx`;
- `src/components/narrative/workspace/preview-laboratory-panel.css`;
- `src/components/narrative/workspace/__tests__/preview-laboratory-panel.test.tsx`.

It adds explicit Preview / Analysis / Deep Debug layers, keeps raw trace/Force Outcome out of the default surface, and renders author-facing explanations from canonical trace data.

Self-review follow-up: `5c496cb00dcac0e64370340ef1b33497504656a4` (`fix: invalidate stale A51 preview diagnostics`).

The follow-up fixes a presentation correctness edge case discovered during self-review: a previously computed trace could remain visible after the sandbox state, selected Move or explicit skill-check input changed. S2 now invalidates derived diagnostics on those changes. Force Outcome also invalidates the prior Move trace while retaining the new Outcome trace/provenance.

## Regression evidence

The Preview Laboratory UI regression suite now proves:
- Preview is the default layer;
- raw JSON is not displayed in Preview;
- blocked/resolved Move status is presented in human-readable form;
- Analysis exposes canonical guard summaries and explicit test-only controls;
- Deep Debug exposes raw trace, Force Outcome and provenance only by explicit author choice;
- changing Move selection invalidates a prior diagnostic;
- mutating sandbox state invalidates a prior diagnostic;
- changing explicit skill-check input invalidates a prior diagnostic;
- Preview actions still do not call authoring `execute` or live `replaceRuntimeProject`.

## Exact-head verification

Workflow run #430 on `5c496cb00dcac0e64370340ef1b33497504656a4` completed **SUCCESS**.

Full gate:
- install: PASS;
- production dependency audit: PASS;
- lint: PASS;
- web build: PASS;
- Electron main build: PASS;
- Jest/coverage: PASS;
- diagnostics upload: PASS;
- Vite smoke: PASS;
- Electron smoke: PASS.

Jest evidence from preserved `93-days-test-diagnostics` artifact:
- Test Suites: **324 passed / 324 total**;
- Tests: **2002 passed, 23 skipped, 42 todo / 2067 total**;
- Snapshots: 0;
- coverage thresholds were not reduced and no coverage exclusion was added.

## Self-review

Reviewed against A51 invariants and the engineering protocol:
- no new runtime evaluator or duplicated guard logic;
- no persistence path added;
- no authoring Undo/Redo dispatch added;
- no implicit live-runtime write added;
- Force Outcome remains Deep Debug-only and explicitly inspection-oriented;
- derived diagnostics cannot survive a state/input change that makes them stale;
- rollback remains a focused pair of S2 commits.

No known BLOCKER/HIGH S2 issue remains after run #430.

## Gate status

| Gate | Status | Evidence |
|---|---|---|
| E0 Evidence | **PASS** | S2 requirement and self-review stale-trace defect are explicit |
| E1 Scope | **PASS** | presentation/UI boundary only |
| E2 Contract | **PASS** | canonical trace remains source of diagnostic truth |
| E3 Verification design | **PASS** | progressive-disclosure and stale-trace UI regressions |
| E4 Minimal patch | **PASS** | first UI slice + focused self-review fix |
| E5 Verification ladder | **PASS** | full run #430 green on exact code SHA |
| E6 Self-review | **PASS** | stale diagnostic found and corrected before closure |
| E7 PR/CI | **PASS for S2 slice** | PR #24 exact-head code gate green |
| E8 Merge | **N/A for S2** | A51 stage continues; do not merge yet |
| E9 Post-merge | **N/A** | not merged |
| E10 Learning/recovery | **PASS** | derived UI explanations must be invalidated with their source inputs |

## Closure / next permitted action

**A51-S2 is DONE.** The overall A51 stage remains **IN PROGRESS**.

Next permitted slice: **A51-S3 — Typed Watches**.

S3 must use a finite typed watch union over approved runtime projections. Generic arbitrary object-path Watches remain explicitly deferred because they weaken traceability and can bypass reviewed runtime boundaries.
