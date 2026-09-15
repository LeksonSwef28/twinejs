# 93 Days Narrative Editor — A51 Architecture & Verification Baseline

Status: **ACTIVE / PRE-CI DESIGN GATE**  
Stage: **A51 — Preview / Debug as an Authoring Laboratory**  
Stable base: `93-days-editor` @ `060633b779f4fda9f72761ba735c2c34342b9991`  
Feature branch: `feature/a51-preview-debug-laboratory`

This document is the implementation-facing architecture baseline for A51. It complements the design pack and is deliberately written against the current repository, not against an idealized greenfield design.

## 1. Goal

A51 provides an author/developer laboratory that can answer four questions without mutating authored source of truth:

1. What happens in this preview state?
2. Why is a Move available, blocked, or resolved to a particular Outcome?
3. What runtime consequences followed?
4. Can the author compare, reset, fork, and later reproduce an investigation safely?

A51 is editor tooling. It is not final player UI and it must not introduce a second narrative runtime.

## 2. Architecture context

```text
Author
  ↓
PreviewLaboratoryPanel (UI / local investigation state)
  ↓
preview-laboratory.ts (application orchestration)
  ↓
existing canonical runtime APIs
  ├─ resolveNarrativeProjectMove
  ├─ resolveAndApplyNarrativeProjectMove
  ├─ applyNarrativeProjectOutcome
  └─ advanceNarrativeProjectSimulation
  ↓
NarrativeProject sandbox clone

Authoring store/history ───────────────┐
  execute / Undo / Redo               │ MUST NOT receive preview actions
Live runtime replacement              │ MUST NOT receive sandbox actions
Persistence repository                │ MUST NOT persist preview scenarios
                                      └───────────────────────────────────
```

The important direction is one-way: Preview reads the current Narrative Project as a source, then works on isolated sandbox values. Sandbox actions never flow back into authoring history or live runtime implicitly.

## 3. State ownership map

| State | Owner | Lifetime | Persisted? | Undo/Redo? | A51 may mutate? |
|---|---|---|---|---|---|
| Authored Story/World definitions | Narrative Project authoring store | project | yes | yes | **no** |
| Live runtime projection | narrative runtime/store boundary | playtest session | repository runtime projection | no authoring entry | only through existing live runtime path, not A51 sandbox |
| Preview scenario baseline | A51 application/UI | investigation | no | no | immutable after scenario creation |
| Preview scenario current project | A51 application/UI | investigation | no | no | yes, only through preview helpers |
| Preview action provenance | A51 application/UI | investigation | no | no | append-only investigation log |
| View Cursor/editor navigation | editor | editor session | editor rules | not narrative state | A51 must not conflate with Simulation Playhead |

## 4. Non-negotiable invariants

- **A51-I01 — Source isolation:** any A51 action leaves the source authored project unchanged.
- **A51-I02 — No authoring history pollution:** A51 sandbox actions never call authoring `execute` and never create Undo/Redo entries.
- **A51-I03 — No implicit live-runtime write:** A51 sandbox actions never call `replaceRuntimeProject`.
- **A51-I04 — Canonical semantics:** Move guards/resolution, Outcome effects and simulation advancement come from existing runtime functions; A51 does not duplicate them.
- **A51-I05 — Trace is read-only:** inspecting a Move cannot mutate scenario state.
- **A51-I06 — Failed operation is atomic:** invalid override, missing entity, blocked/input-required execution or invalid forced Outcome leaves the prior scenario usable and unchanged.
- **A51-I07 — Baseline stability:** reset restores the exact scenario baseline; fork reset restores the fork point, not the parent's original baseline.
- **A51-I08 — Authored definitions are immutable inside sandbox execution:** runtime consequences may change runtime projection only; authored Move/Outcome definitions remain equal.
- **A51-I09 — Explicit test state:** preview-only overrides are structurally and visually distinguishable from authored state.
- **A51-I10 — Deterministic explicit inputs:** with the same scenario and explicit resolver inputs, A51 returns the same resolver result unless the canonical runtime itself defines randomness.
- **A51-I11 — Runtime diff completeness:** A51 change inspection must track the same runtime families that the editor recognizes as runtime state; additions to canonical runtime projection require review of A51 projection.
- **A51-I12 — Stable serialization semantics:** a logically equivalent preview state must not change merely because an extra clone/serialization roundtrip occurred.

## 5. Current components

### COMP-A51-01 Preview Scenario Service

Current file: `src/application/narrative/preview-laboratory.ts`

Responsibilities:
- create/fork/reset isolated scenarios;
- validate and apply typed test-only inputs;
- advance sandbox time;
- keep preview action provenance.

Must not:
- dispatch authoring commands;
- persist scenarios;
- silently manufacture authored/world facts.

### COMP-A51-02 Canonical Runtime Bridge

Current boundary inside `preview-laboratory.ts`.

Responsibilities:
- read-only Move trace;
- canonical Move resolution/application;
- canonical forced existing Outcome application.

Must not:
- duplicate guard logic;
- synthesize Outcomes not present in authored Move;
- edit Move definitions.

### COMP-A51-03 Diff & Provenance Reader

Responsibilities:
- compare baseline/current runtime state;
- compare scenarios;
- expose occurrence IDs related to sandbox execution.

Known risk: runtime projection is manually enumerated and can drift when runtime state grows.

### COMP-A51-04 Preview Presentation

Current file: `src/components/narrative/workspace/preview-laboratory-panel.tsx`.

Current state: functional but mixes Preview, Analysis and Deep Debug concerns.

TO-BE after S1 is green:
- Preview = compact result/current context;
- Analysis = blocked reasons, comparisons and explicit overrides;
- Deep Debug = raw traces/provenance/Force Outcome.

## 6. AS-IS / TO-BE / KEEP / DEFER

### AS-IS and accepted for S1

- local isolated scenarios;
- Set from live / Fork / Reset;
- typed moment/presence/knowledge overrides;
- read-only Move tracing;
- canonical Move execution;
- forced existing authored Outcome through canonical effect engine;
- runtime diff and occurrence-linked preview provenance;
- panel tests asserting no authoring/live-runtime dispatch.

### TO-BE after baseline stabilization

- human-readable Move diagnostics;
- progressive Preview → Analysis → Deep Debug disclosure;
- typed Watches;
- safe Preview from here;
- preview checkpoints/time travel;
- reproduction metadata where actual randomness requires it.

### KEEP

- exactly two top-level workspaces;
- View Cursor != Simulation Playhead;
- Scheduled Presence != Actual Presence;
- Authored Story Definition != Runtime Story State;
- authoring Undo/Redo separated from runtime/playtest changes;
- existing canonical resolver/effect/simulation semantics.

### DEFER / requires separate contract decision

- Preview from here when selected context does not determine time/presence/knowledge;
- checkpoint representation: snapshot vs replay vs hybrid;
- generic arbitrary object-path Watches;
- deterministic random replay token until a real random-source contract exists.

## 7. Requirement traceability

| Requirement | Use cases | Components / files | Verification evidence | Gate |
|---|---|---|---|---|
| REQ-001 isolated preview | UC-001,009 | preview-laboratory.ts, panel local state | deep-equality/source-isolation tests + UI no-dispatch | PASS after CI |
| REQ-002 capture/fork/reset | UC-001,007,008 | Preview Scenario Service | unit tests incl. fork-point reset | PASS after CI |
| REQ-003 typed test inputs | UC-002 | Preview Scenario Service | valid + invalid + atomic-failure tests | PASS after CI |
| REQ-004 read-only Move inspection | UC-003,004 | Canonical Runtime Bridge | trace no-mutation tests | PASS after CI |
| REQ-005 execute authored Move | UC-005 | Canonical Runtime Bridge | canonical outcome/effect + blocked/input-required atomicity | PASS after CI |
| REQ-006 force existing Outcome | UC-006 | Canonical Runtime Bridge | valid forced provenance + invalid outcome atomicity | PASS after CI |
| REQ-007 compare alternatives | UC-008 | Diff reader | symmetric changed-path tests + independent scenarios | PASS after CI |
| REQ-008 downstream/provenance | UC-005,006,008 | Diff reader + actions | occurrence linkage tests | PARTIAL: concept-level presentation still future |
| REQ-009 no authoring Undo/Redo | UC-009 | panel + runtime-history boundary | UI no-dispatch plus existing runtime-history tests | PASS after CI |
| REQ-010 progressive disclosure | UC-010 | Preview presentation | not implemented | TO-BE S2 |
| REQ-011 Preview from here | UC-011 | future navigation adapter | contract unresolved | BLOCKED from implementation |
| REQ-012 Watches | UC-012 | future watch projection | typed union not defined | TO-BE S3 |
| REQ-013 checkpoints | UC-013 | future preview history | storage semantics unresolved | BLOCKED from implementation |
| REQ-014 reproduction metadata | UC-014 | future replay descriptor | explicit skill inputs exist; randomness contract absent | CONDITIONAL |

## 8. Contract tests required before expanding A51

The S1 baseline must explicitly test these contracts in addition to existing happy paths:

1. invalid preview override throws and does not change the prior scenario;
2. blocked Move execution returns no applied Outcome and does not append a runtime occurrence/action;
3. skill-check with missing required resolver input remains non-mutating;
4. invalid forced Outcome leaves scenario unchanged;
5. unset Actual Presence is serialization-stable (no `characterId: undefined` ghost key);
6. fork/reset baseline is deep-independent from parent and source;
7. comparison changed paths are symmetric for the same pair of states;
8. a chain of override → execute/force → advance never mutates authored Move/Outcome definitions;
9. preview panel still never calls authoring `execute` or live `replaceRuntimeProject`;
10. runtime-history tests remain green so A51 does not regress the existing live-runtime/authoring boundary.

## 9. Failure-mode review (FMEA-lite)

| Failure mode | Impact | Likelihood | Detection | Mitigation / gate |
|---|---|---:|---|---|
| sandbox writes authored project | critical data corruption | low | isolation + no-dispatch tests | BLOCKER |
| preview reimplements runtime logic | divergent behavior | medium | code review / dependency trace | BLOCKER |
| invalid operation partially mutates sandbox | misleading investigation | medium | atomic-failure tests | BLOCKER |
| runtime projection drift misses new runtime fields | false comparison/debug conclusions | medium | projection contract review/test | HIGH |
| `undefined` ghost keys change after clone | unstable diffs/checkpoints | medium | serialization-stability test | HIGH |
| raw traces dominate default UI | unusable authoring tool | high | UI progressive-disclosure tests | S2 gate |
| Preview from here fabricates missing world state | false conclusions | medium | unresolved-prerequisite contract | BLOCKER for S4 |
| checkpoints reuse authoring Undo/Redo | history corruption/confusion | low | architecture review + integration tests | BLOCKER for S5 |
| force Outcome becomes normal execution shortcut | author confusion / invalid testing | medium | Deep Debug-only UI + provenance `forced=true` | HIGH |
| test coverage lowered to get green | hidden regressions | medium | CI policy | BLOCKER |

## 10. Specific defect found during architecture review

Current `actual-location` override assigns `undefined` to the character key when the author selects `unset`. Because A51 clones via JSON serialization, the next clone removes that key. This violates **A51-I12 stable serialization semantics** and can make diff/checkpoint behavior depend on whether another action happened afterwards.

Required correction for S1:

```text
if locationId is defined → assign character location
else → delete character key
```

Add a regression test proving that unset presence is identical before and after a subsequent clone-producing action.

## 11. Verification pyramid

### Static / architecture review
- imports point from A51 application code to canonical runtime, never to duplicate evaluator;
- no A51 sandbox path imports persistence/repository write APIs;
- panel sandbox actions do not call authoring store mutators.

### Unit
- scenario lifecycle;
- typed validation;
- atomic failures;
- diff/provenance;
- serialization stability.

### Contract
- canonical resolver status/outcome contract;
- canonical effect application/provenance;
- runtime projection families remain aligned with editor runtime boundary.

### Integration
- authoring Undo/Redo remains independent while preview exists;
- source/live runtime remain unchanged by sandbox actions.

### UI
- explicit test-only labels;
- no authoring/live dispatch;
- validation surfaces errors;
- later S2: Preview/Analysis/Deep Debug disclosure.

### System / CI
Required full branch gate:
- dependency install;
- production dependency audit;
- lint;
- web build;
- Electron build;
- Jest with coverage;
- Vite smoke;
- Electron smoke.

No threshold weakening or coverage exclusions are accepted as a fix.

## 12. Pre-CI S1 checklist

S1 is ready for CI only when all are true:

- architecture invariants I01–I12 reviewed against actual files;
- traceability table has no unowned REQ-001..009 behavior;
- hidden unset-presence serialization defect fixed;
- missing negative/atomicity contract tests added;
- existing runtime-history boundary tests retained;
- no new REQ-010..014 feature code mixed into stabilization;
- current code/tests compile by inspection;
- then run full `93 Days Branch Check` and diagnose exact failures from evidence only.

## 13. Slice order after S1

```text
A51-S1 Stabilize architecture + contracts + CI
  ↓
A51-S2 Progressive disclosure + human-readable diagnostics
  ↓
A51-S3 Typed Watches
  ↓
A51-S4 Preview from here (only after semantic contract PASS)
  ↓
A51-S5 Checkpoints/time travel (only after storage/replay ADR)
  ↓
A51-S6 Reproduction metadata (only where real randomness exists)
  ↓
Final full gate → roadmap DONE → merge → verify stable head
```

The purpose of this order is to keep every change small enough to diagnose in one or two passes instead of combining architecture, UI, state semantics and CI failures in a single batch.
