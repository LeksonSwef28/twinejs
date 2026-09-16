# 93 Days Narrative Editor — A51 Architecture & Verification Baseline

Status: **ACTIVE / S4 VERIFIED**  
Stage: **A51 — Preview / Debug as an Authoring Laboratory**  
Stable base: `93-days-editor` @ `060633b779f4fda9f72761ba735c2c34342b9991`  
Feature branch: `feature/a51-preview-debug-laboratory`

This document is the implementation-facing architecture baseline for A51. It complements the design pack and is deliberately written against the current repository, not against an idealized greenfield design.

## 1. Goal

A51 provides an author/developer laboratory that can answer four questions without mutating authored source of truth:

1. What happens in this preview state?
2. Why is a Move available, blocked, or resolved to a particular Outcome?
3. What runtime consequences followed?
4. Can the author compare, reset, fork, watch, carry authoring focus into Preview and later reproduce an investigation safely?

A51 is editor tooling. It is not final player UI and it must not introduce a second narrative runtime.

## 2. Architecture context

```text
Author
  ↓
NarrativeWorkspace authoring focus
  ├─ View Cursor
  └─ selected Story context
        ↓ explicit Preview-from-here request
PreviewLaboratoryPanel (UI / local investigation state)
  ├─ PreviewTypedWatches (local read-only Watch collection)
  └─ Preview-from-here read-only focus context
  ↓
preview-laboratory.ts / preview-watches.ts / preview-from-here.ts
  ↓
existing canonical runtime APIs / projections
  ├─ resolveNarrativeProjectMove
  ├─ resolveAndApplyNarrativeProjectMove
  ├─ applyNarrativeProjectOutcome
  ├─ advanceNarrativeProjectSimulation
  ├─ narrativeRuntimeStoryNodes
  └─ storyWorldNavigationContext
  ↓
NarrativeProject sandbox clone

Authoring store/history ───────────────┐
  execute / Undo / Redo               │ MUST NOT receive preview actions
Live runtime replacement              │ MUST NOT receive sandbox actions
Persistence repository                │ MUST NOT persist preview scenarios/Watches/focus
                                      └──────────────────────────────────────────────
```

The important direction is one-way: Preview reads the current Narrative Project as a source, then works on isolated sandbox values. Sandbox actions never flow back into authoring history or live runtime implicitly. Watches only read the current sandbox. Preview-from-here focus is UI investigation metadata and never becomes runtime truth merely because an author is viewing another Story/time context.

## 3. State ownership map

| State | Owner | Lifetime | Persisted? | Undo/Redo? | A51 may mutate? |
|---|---|---|---|---|---|
| Authored Story/World definitions | Narrative Project authoring store | project | yes | yes | **no** |
| Live runtime projection | narrative runtime/store boundary | playtest session | repository runtime projection | no authoring entry | only through existing live runtime path, not A51 sandbox |
| Preview scenario baseline | A51 application/UI | investigation | no | no | immutable after scenario creation |
| Preview scenario current project | A51 application/UI | investigation | no | no | yes, only through preview helpers |
| Preview action provenance | A51 application/UI | investigation | no | no | append-only investigation log |
| Typed Watch definitions | A51 UI local state | investigation | no | no | yes, UI-only add/remove |
| Typed Watch values | derived read projection | render/read | no | no | **no** |
| Preview-from-here focus/context | NarrativeWorkspace UI session + read projection | request/investigation | no | no | replace only by explicit request |
| View Cursor/editor navigation | editor | editor session | editor rules | not narrative state | A51 must not conflate with Simulation Playhead |

## 4. Non-negotiable invariants

- **A51-I01 — Source isolation:** any A51 action leaves the source authored project unchanged.
- **A51-I02 — No authoring history pollution:** A51 sandbox actions never call authoring `execute` and never create Undo/Redo entries.
- **A51-I03 — No implicit live-runtime write:** A51 sandbox actions never call `replaceRuntimeProject`.
- **A51-I04 — Canonical semantics:** Move guards/resolution, Outcome effects, effective Story state and simulation advancement come from existing runtime functions; A51 does not duplicate them.
- **A51-I05 — Trace is read-only:** inspecting a Move cannot mutate scenario state.
- **A51-I06 — Failed operation is atomic:** invalid override, missing entity, blocked/input-required execution or invalid forced Outcome leaves the prior scenario usable and unchanged.
- **A51-I07 — Baseline stability:** reset restores the exact scenario baseline; fork reset restores the fork point, not the parent's original baseline.
- **A51-I08 — Authored definitions are immutable inside sandbox execution:** runtime consequences may change runtime projection only; authored Move/Outcome definitions remain equal.
- **A51-I09 — Explicit test state:** preview-only overrides are structurally and visually distinguishable from authored state.
- **A51-I10 — Deterministic explicit inputs:** with the same scenario and explicit resolver inputs, A51 returns the same resolver result unless the canonical runtime itself defines randomness.
- **A51-I11 — Runtime diff completeness:** A51 change inspection must track the same runtime families that the editor recognizes as runtime state; additions to canonical runtime projection require review of A51 projection.
- **A51-I12 — Stable serialization semantics:** a logically equivalent preview state must not change merely because an extra clone/serialization roundtrip occurred.
- **A51-I13 — Typed Watch boundary:** Watches name reviewed runtime concepts with typed entity references; A51 does not expose arbitrary object/JSON paths as a Watch API.
- **A51-I14 — Watch purity:** evaluating a Watch cannot mutate the sandbox, append preview provenance, persist state or dispatch authoring/live-runtime writes.
- **A51-I15 — Focus is not runtime truth:** Preview-from-here focus must not implicitly move Simulation Playhead, set Actual Presence, synthesize Knowledge or alter Story runtime state.
- **A51-I16 — Fresh Preview-from-here source:** each explicit Preview-from-here request establishes a fresh current-live snapshot boundary; prior arbitrary sandbox overrides are not silently carried into the new focus.

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

Current state after S2:
- Preview = default compact Move result/current context, without raw JSON;
- Analysis = canonical guard reasons, comparisons, runtime changes and explicit test-only overrides;
- Deep Debug = raw traces, provenance and Force Outcome;
- human-readable diagnostics are projections of canonical runtime trace data, not a second evaluator;
- derived Move diagnostics are invalidated whenever sandbox state, selected Move or explicit resolver inputs change, so stale explanations are not presented as current facts.

### COMP-A51-05 Typed Watch Projection

Current files:
- `src/application/narrative/preview-watches.ts`;
- `src/components/narrative/workspace/preview-typed-watches.tsx`.

Responsibilities:
- expose a finite typed union for approved Watch concepts;
- read moment, Actual Presence, character knowledge, relationship axis and effective Story state from the current sandbox;
- derive stable Watch identity from typed fields rather than object paths;
- keep selected Watches local to the Preview UI;
- recompute values when the sandbox changes.

Must not:
- accept arbitrary JSON/object paths;
- persist Watches into Narrative Project;
- write to authoring/live runtime;
- reconstruct canonical effective Story state.

### COMP-A51-06 Preview-From-Here Focus Adapter

Current files:
- `src/application/narrative/preview-from-here.ts`;
- `src/components/narrative/workspace/preview-from-here-controls.tsx`;
- focused handoff wiring in `narrative-workspace.tsx` and `cross-workspace-navigator.tsx`.

Responsibilities:
- validate the finite `story-node | view-moment` focus union;
- derive read-only context from authoring focus;
- reuse canonical `storyWorldNavigationContext()` for Story/presence comparison;
- open Playtest/Debug from explicit View Cursor or selected Story context actions;
- establish a fresh live-sourced Preview boundary for each request;
- surface `aligned`, `different-moment` or `unscheduled` before explicit test overrides.

Must not:
- persist focus into Narrative Project;
- move Simulation Playhead from View Cursor/authored placement;
- materialize authored/scheduled location as Actual Presence;
- reconstruct Knowledge for another moment;
- persist generic Story Canvas selection merely for cross-component communication.

## 6. AS-IS / TO-BE / KEEP / DEFER

### AS-IS through S4

- local isolated scenarios;
- Set from live / Fork / Reset;
- typed moment/presence/knowledge overrides;
- read-only Move tracing;
- canonical Move execution;
- forced existing authored Outcome through canonical effect engine;
- runtime diff and occurrence-linked preview provenance;
- panel tests asserting no authoring/live-runtime dispatch;
- human-readable Move diagnostics sourced from canonical trace summaries;
- progressive Preview → Analysis → Deep Debug disclosure;
- stale derived diagnostics invalidated when their source state/input changes;
- finite typed Watches for moment, Actual Presence, knowledge, relationship axes and effective Story state;
- local Watch collections that re-evaluate against the current sandbox without persistence or Undo/Redo;
- typed Preview-from-here focus for View Cursor and selected Story context;
- visible focus/playhead mismatch without implicit runtime state fabrication;
- fresh live-sourced sandbox boundary on each explicit Preview-from-here request.

### TO-BE after S4

- preview checkpoints/time travel only after storage/replay ADR;
- reproduction metadata where actual randomness requires it.

### KEEP

- exactly two top-level workspaces;
- View Cursor != Simulation Playhead;
- Scheduled Presence != Actual Presence;
- Authored Story Definition != Runtime Story State;
- authoring Undo/Redo separated from runtime/playtest changes;
- existing canonical resolver/effect/simulation semantics;
- Watch definitions finite and typed;
- Preview-from-here focus finite, typed and non-persisted.

### DEFER / requires separate contract decision

- checkpoint representation: snapshot vs replay vs hybrid;
- checkpoint lifetime, memory limits and invalidation rules;
- generic arbitrary object-path Watches;
- deterministic random replay token until a real random-source contract exists.

## 7. Requirement traceability

| Requirement | Use cases | Components / files | Verification evidence | Gate |
|---|---|---|---|---|
| REQ-001 isolated preview | UC-001,009 | preview-laboratory.ts, panel local state | deep-equality/source-isolation tests + UI no-dispatch | PASS |
| REQ-002 capture/fork/reset | UC-001,007,008 | Preview Scenario Service | unit tests incl. fork-point reset | PASS |
| REQ-003 typed test inputs | UC-002 | Preview Scenario Service | valid + invalid + atomic-failure tests | PASS |
| REQ-004 read-only Move inspection | UC-003,004 | Canonical Runtime Bridge | trace no-mutation tests | PASS |
| REQ-005 execute authored Move | UC-005 | Canonical Runtime Bridge | canonical outcome/effect + blocked/input-required atomicity | PASS |
| REQ-006 force existing Outcome | UC-006 | Canonical Runtime Bridge | valid forced provenance + invalid outcome atomicity | PASS |
| REQ-007 compare alternatives | UC-008 | Diff reader | symmetric changed-path tests + independent scenarios | PASS |
| REQ-008 downstream/provenance | UC-005,006,008 | Diff reader + actions | occurrence linkage tests | PARTIAL: concept-level downstream presentation remains future work |
| REQ-009 no authoring Undo/Redo | UC-009 | panel + runtime-history boundary | UI no-dispatch plus existing runtime-history tests | PASS |
| REQ-010 progressive disclosure | UC-010 | Preview presentation | Preview/Analysis/Deep Debug UI regression + raw-debug isolation + stale-diagnostic invalidation; run #430 | PASS |
| REQ-011 Preview from here | UC-011 | preview-from-here.ts + NarrativeWorkspace/CrossWorkspace handoff | semantic contract #435; no-hidden-state application/UI regressions; run #438 | PASS |
| REQ-012 Watches | UC-012 | preview-watches.ts + PreviewTypedWatches | pure read tests, typed-reference validation, sandbox recomputation, effective Story-state projection, UI typed-selector regressions; run #433 | PASS |
| REQ-013 checkpoints | UC-013 | future preview history | storage/replay semantics unresolved | BLOCKED from implementation; S5 ADR NEXT |
| REQ-014 reproduction metadata | UC-014 | future replay descriptor | explicit skill inputs exist; randomness contract absent | CONDITIONAL |

## 8. Contract tests required before expanding A51

The S1 baseline explicitly tests these contracts in addition to happy paths:

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

S2 additionally tests progressive disclosure and derived-diagnostic invalidation at the UI boundary.

S3 additionally tests:
- Watch evaluation is read-only and leaves the whole scenario unchanged;
- every supported Watch kind uses typed references/fields;
- invalid references fail without mutation;
- Watch values re-evaluate from current sandbox state;
- Story-state Watch uses canonical effective runtime state;
- UI exposes no generic path input and preserves a local Watch collection across laboratory layers.

S4 additionally tests:
- Story focus creates the same live-sourced sandbox as normal Preview capture;
- authored Story moment/location do not overwrite sandbox Playhead or Actual Presence;
- aligned Story focus uses canonical presence comparability;
- partial placement remains unscheduled rather than inventing time;
- View Cursor mismatch remains context only;
- invalid typed focus is atomic/read-only;
- View and selected Story entry points emit typed focus;
- mismatch is visible before explicit sandbox overrides;
- opening from View focus does not dispatch an authoring command.

## 9. Failure-mode review (FMEA-lite)

| Failure mode | Impact | Likelihood | Detection | Mitigation / gate |
|---|---|---:|---|---|
| sandbox writes authored project | critical data corruption | low | isolation + no-dispatch tests | BLOCKER |
| preview reimplements runtime logic | divergent behavior | medium | code review / dependency trace | BLOCKER |
| invalid operation partially mutates sandbox | misleading investigation | medium | atomic-failure tests | BLOCKER |
| runtime projection drift misses new runtime fields | false comparison/debug conclusions | medium | projection contract review/test | HIGH |
| `undefined` ghost keys change after clone | unstable diffs/checkpoints | medium | serialization-stability test | HIGH |
| raw traces dominate default UI | unusable authoring tool | low after S2 | UI progressive-disclosure tests | S2 PASS |
| stale trace survives changed sandbox/input | misleading author diagnosis | low after S2 | stale-diagnostic UI regressions | S2 PASS |
| Watch accepts arbitrary object path | couples author tool to private serialization and bypasses reviewed semantics | low after S3 | API/type review + UI no-path regression | S3 PASS |
| Watch evaluation mutates sandbox | investigation changes what it observes | low after S3 | whole-scenario immutability tests | S3 PASS |
| Preview from here fabricates missing world state | false conclusions | low after S4 | focus-not-state contract + regressions | S4 PASS |
| stale prior sandbox overrides survive a new from-here request | ambiguous source state | low after S4 | fresh-request/remount boundary | S4 PASS |
| checkpoints reuse authoring Undo/Redo | history corruption/confusion | low | architecture review + integration tests | BLOCKER for S5 |
| checkpoint replay diverges from captured state | misleading time travel | unknown | S5 ADR + replay/snapshot contract tests | BLOCKER for S5 |
| force Outcome becomes normal execution shortcut | author confusion / invalid testing | medium | Deep Debug-only UI + provenance `forced=true` | HIGH |
| test coverage lowered to get green | hidden regressions | medium | CI policy | BLOCKER |

## 10. Defect corrected during S1 architecture review

The original `actual-location` unset path assigned `undefined` to a character key. Because A51 clones via JSON serialization, the next clone removed that key, violating **A51-I12 stable serialization semantics** and making diff/checkpoint behavior depend on whether another action happened afterwards.

S1 corrected the contract to:

```text
if locationId is defined → assign character location
else → delete character key
```

A regression test proves that unset presence is identical before and after a subsequent clone-producing action.

## 11. Verification pyramid

### Static / architecture review
- imports point from A51 application code to canonical runtime, never to duplicate evaluator;
- no A51 sandbox path imports persistence/repository write APIs;
- panel sandbox actions do not call authoring store mutators;
- Watch API is a finite discriminated union, not string/object-path evaluation;
- Preview-from-here focus API is a finite discriminated union and carries no runtime-write authority.

### Unit
- scenario lifecycle;
- typed validation;
- atomic failures;
- diff/provenance;
- serialization stability;
- Watch identity and typed read projection;
- typed Preview-from-here focus validation/alignment.

### Contract
- canonical resolver status/outcome contract;
- canonical effect application/provenance;
- runtime projection families remain aligned with editor runtime boundary;
- Watch evaluation is pure and effective Story state delegates to canonical projection;
- Story Preview-from-here presence comparison delegates to canonical navigation semantics;
- focus creation never mutates source/runtime truth.

### Integration
- authoring Undo/Redo remains independent while preview exists;
- source/live runtime remain unchanged by sandbox actions;
- Watch collection remains local investigation state;
- Preview-from-here request stays in UI-session state and establishes a fresh Preview source boundary.

### UI
- explicit test-only labels;
- no authoring/live dispatch;
- validation surfaces errors;
- Preview/Analysis/Deep Debug disclosure;
- canonical guard summaries rendered without duplicating evaluation;
- raw traces and Force Outcome remain Deep Debug-only;
- diagnostics invalidate when sandbox state or resolver inputs change;
- Typed Watches expose typed selectors and no free-form object-path input;
- Watch values follow the current sandbox;
- View Cursor / selected Story Preview-from-here controls expose mismatch before explicit overrides.

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

## 12. Completed verification checklist through S4

S1–S4 have established the following verified baseline:

- architecture invariants I01–I16 reviewed against actual files;
- traceability has ownership for REQ-001..012, with REQ-011 now PASS and REQ-013 intentionally blocked pending S5 ADR;
- unset-presence serialization defect fixed;
- negative/atomicity contract tests retained;
- existing runtime-history boundary tests retained;
- progressive disclosure does not alter runtime semantics;
- current human-readable diagnostics are derived from canonical trace data;
- raw debug data is opt-in;
- stale trace presentation is explicitly invalidated;
- Typed Watches are finite, read-only and local;
- generic arbitrary object-path Watches remain deferred;
- Preview-from-here focus is finite, typed and non-persisted;
- authored/View focus cannot silently become Playhead, Actual Presence, Knowledge or Story runtime truth;
- each explicit Preview-from-here request establishes a fresh live-sourced boundary;
- run #432 failure was diagnosed as an ambiguous test selector and corrected without product-code changes;
- S3 code head `8851d8978e6b90b999f75d6ccd84d85455de84b7` passed run #433: 326/326 suites, 2008 passed tests, Vite/Electron smoke PASS;
- S4 semantic contract head `469816a963415214f1e3442ba6cc068fb1b33b0f` passed run #435 before implementation;
- S4 run #437 failure was an incomplete test fixture and was corrected test-only;
- S4 exact code head `cdbd446c8674efe072f4c58a636cbd23700c12cb` passed run #438: 329/329 suites, 2019 passed tests, Vite/Electron smoke PASS.

## 13. Slice order after S1

```text
A51-S1 Stabilize architecture + contracts + CI — DONE
  ↓
A51-S2 Progressive disclosure + human-readable diagnostics — DONE
  ↓
A51-S3 Typed Watches — DONE
  ↓
A51-S4 Preview from here — DONE
  ↓
A51-S5 Checkpoints/time travel — NEXT: storage/replay ADR before implementation
  ↓
A51-S6 Reproduction metadata (only where real randomness exists)
  ↓
Final full gate → roadmap DONE → merge → verify stable head
```

The purpose of this order is to keep every change small enough to diagnose in one or two passes instead of combining architecture, UI, state semantics and CI failures in a single batch. S5 is explicitly ADR-first: implementation is not allowed until snapshot vs replay vs hybrid semantics, checkpoint ownership/lifetime and invalidation rules are decided and verified against the existing sandbox/history boundaries.
