# 93 Days Engineering Change Protocol

Status: **ACTIVE**  
Applies from: **A51 onward**  
Scope: 93 Days Narrative Editor changes, patches, refactors, CI fixes and roadmap slices.

This protocol is the default delivery path for the 93 Days editor. It exists to prevent symptom-driven patching, architecture drift and "fix one thing, discover three more" loops.

The protocol is intentionally proportional: small low-risk changes move quickly; state/history/runtime/compiler changes require the full gates.

## 1. Core rule

No non-trivial patch starts from a guess.

Every change must be traceable through both chains:

```text
Requirement → Contract → Implementation → Verification

Symptom → Reproduction → Evidence → Root cause → Regression test → Minimal patch → Verification
```

If a link is unknown, mark it unknown and stop before the next irreversible step. Do not silently replace evidence with an assumption.

## 2. Risk classification

Classify before implementation.

### LOW
Examples: copy, styling with no behavior change, isolated typo, documentation.

Required minimum:
- clear expected result;
- focused diff;
- relevant lint/build/test;
- self-review.

### MEDIUM
Examples: UI behavior, application orchestration, validation, new editor command, local state behavior.

Required minimum:
- evidence or requirement trace;
- affected-boundary review;
- explicit contract;
- targeted tests;
- broader neighboring tests;
- full CI before merge;
- self-review and post-merge verification.

### HIGH
Examples: authored/runtime state boundaries, Undo/Redo, persistence, serialization, canonical resolver/effect semantics, compiler/export, migrations, cross-layer changes.

Required minimum:
- architecture/invariant review;
- blast-radius analysis;
- negative/atomicity tests;
- contract/integration tests;
- full branch CI;
- explicit rollback/roll-forward plan;
- exact-SHA post-merge verification.

A51 state-isolation work and A52 compiler/export boundary are HIGH by default.

## 3. Standard lifecycle

### STEP 0 — Evidence / problem proof

For a bug or red CI:
- exact commit SHA;
- exact run/job/test when available;
- input/precondition;
- action;
- actual result;
- expected result;
- reproducibility status;
- raw error/trace/annotation if available.

For feature work:
- requirement ID;
- use case;
- expected observable behavior;
- explicit non-goals.

**Gate E0:** no root-cause patch based only on a guessed failure.

### STEP 1 — Scope and blast radius

Identify touched boundaries:
- UI/presentation;
- application orchestration;
- canonical runtime;
- authored definitions;
- live runtime;
- history/Undo-Redo;
- persistence;
- serialization;
- compiler/export;
- CI/tooling.

Record what may change and what must not change.

**Gate E1:** ownership is known and no hidden second source of truth is introduced.

### STEP 2 — Contract and invariants

Write the observable contract before the implementation when behavior is non-trivial.

At minimum:
- success behavior;
- invalid-input behavior;
- failure atomicity;
- state that must remain unchanged;
- determinism expectations;
- compatibility expectations.

Reuse stage-specific invariant IDs where available (for example A51-I01..I12).

**Gate E2:** a reviewer can tell whether an implementation is correct without reading the implementation first.

### STEP 3 — Verification design / regression-first

Choose the cheapest test that proves the defect or requirement at the correct layer.

Preferred order:
1. regression/unit test for the exact behavior;
2. contract test for layer boundaries;
3. integration test for state/history/persistence interaction;
4. UI test for user-visible behavior;
5. system/CI gate.

For a confirmed bug, add a regression test that fails for the confirmed defect whenever practical.

Never reduce coverage thresholds or weaken assertions merely to make CI green.

**Gate E3:** tests demonstrate the intended contract, not implementation trivia.

### STEP 4 — Minimal implementation / patch

Implement the smallest coherent change that satisfies E2/E3.

Do not mix an unrelated refactor, renaming campaign or new feature into a bug fix. If a refactor is required for safety, isolate it as a prerequisite or separate commit/slice.

**Gate E4:** the diff has one explainable purpose.

### STEP 5 — Verification ladder

Run checks narrow → broad:

```text
exact regression test
→ neighboring module tests
→ contract/integration tests
→ lint/type/static checks
→ builds
→ full test + coverage gate
→ smoke/system checks
```

Do not repeatedly use the most expensive CI run as a diagnostic substitute when a narrower test can reproduce the issue.

**Gate E5:** all risk-appropriate checks are green on the exact SHA.

### STEP 6 — Self-review

Review the diff as if it were written by someone else.

Check:
- correctness against the contract;
- complexity and unnecessary abstraction;
- duplicated canonical logic;
- edge cases and partial mutation;
- serialization/state identity;
- naming and readability;
- dead code;
- security/privacy implications where relevant;
- test quality;
- documentation/traceability drift;
- rollback difficulty.

**Gate E6:** no known issue is hidden behind a green test suite.

### STEP 7 — PR / independent review / CI

PR description should include:
- Why / requirement or confirmed defect;
- evidence/reproduction;
- risk class;
- affected boundaries;
- contract/invariants;
- tests executed;
- rollback/roll-forward note;
- unresolved questions.

Prefer small, focused PRs or reviewable slices. Large roadmap stages may use sequential slices or stacked PRs when that reduces review risk.

**Gate E7:** required checks/review conditions are satisfied before merge.

### STEP 8 — Merge gate

Before merge verify:
- PR head SHA did not move unexpectedly;
- branch is mergeable;
- required CI belongs to the exact head SHA;
- roadmap/document status is truthful;
- no BLOCKER/HIGH unresolved item remains.

**Gate E8:** merge only the verified SHA.

### STEP 9 — Post-merge verification

Merge is not Definition of Done by itself.

Verify on the target/integration branch:
- exact resulting SHA;
- required build/test/smoke checks;
- expected behavior still holds after integration;
- no unexpected base-branch interaction;
- roadmap/status updated only after verification.

For production-delivered software, also inspect health/usage/error signals when available.

**Gate E9:** integration state is independently verified.

### STEP 10 — Recovery and learning

Before a HIGH-risk merge, know the recovery path:
- revert/rollback commit;
- roll-forward patch;
- feature disablement when applicable;
- data/state compatibility considerations.

If a defect escapes or a deployment/merge repeatedly fails, record a short root-cause note:
- why the defect was possible;
- why existing tests/review missed it;
- what guard now prevents recurrence.

Avoid blame; improve the system.

## 4. Change Record template

Create or update a compact record for non-trivial patches/slices:

```text
Change ID:
Stage / Requirement:
Risk: LOW | MEDIUM | HIGH
Exact source SHA:

Problem / requirement:
Expected:
Actual:
Reproduction / evidence:
Root cause: CONFIRMED | UNKNOWN

Affected boundaries:
Must change:
Must not change:
Relevant invariants:

Regression/verification plan:
Minimal patch plan:
Rollback/roll-forward:

E0 Evidence: PASS | PARTIAL | FAIL
E1 Scope: PASS | PARTIAL | FAIL
E2 Contract: PASS | PARTIAL | FAIL
E3 Verification design: PASS | PARTIAL | FAIL
E4 Minimal patch: PASS | PARTIAL | FAIL
E5 Verification ladder: PASS | PARTIAL | FAIL
E6 Self-review: PASS | PARTIAL | FAIL
E7 PR/CI: PASS | PARTIAL | FAIL
E8 Merge: PASS | PARTIAL | FAIL
E9 Post-merge: PASS | PARTIAL | FAIL
E10 Learning/recovery: PASS | N/A
```

## 5. Stop conditions

Stop implementation and return to the preceding gate when:
- the failure cannot be reproduced or identified precisely enough to distinguish causes;
- architecture ownership is ambiguous;
- a patch requires changing a canonical invariant without an explicit design decision;
- a regression test reveals the expected behavior itself is unclear;
- CI is green only after weakening tests/coverage;
- the change unexpectedly expands into another subsystem;
- merge verification is running on a different SHA than the reviewed one.

## 6. A51-specific application

A51 follows `93DAYS_A51_ARCHITECTURE_VERIFICATION.md` in addition to this protocol.

Before new A51 feature slices begin, A51-S1 must have:
- confirmed state ownership and invariants;
- contract/regression tests for sandbox isolation and atomic failure;
- green full branch CI on exact SHA;
- self-review of the A51 diff;
- truthful PR status.

Do not implement `Preview from here`, checkpoints/time travel or deterministic replay until their unresolved contracts pass their design gates.

## 7. A52-specific application

A52 is HIGH risk because it defines the compiler/export boundary.

Before implementation it must establish:
- single authored source of truth;
- deterministic source → artifact mapping;
- artifact schema/version contract;
- validation and source-linked diagnostics;
- no second hand-authored Passage graph;
- compatibility/recovery strategy;
- golden/contract tests for deterministic compilation.

A52 implementation begins only after the A51 completion gate is verified.

## 8. Definition of Done

A change is DONE only when:
- requirement/defect is traceable to evidence;
- contract is satisfied;
- risk-appropriate tests are green;
- full required CI is green on the exact reviewed SHA;
- self-review is complete;
- merge is verified on the integration branch;
- documentation/roadmap status matches reality;
- recovery path is known for HIGH-risk changes.

Passing CI is necessary, but it is not sufficient by itself.
