# 93 Days Narrative Editor — A51 Architecture & Verification Baseline

Status: **A51 VERIFIED / S6 DONE**  
Stage: **A51 — Preview / Debug as an Authoring Laboratory**  
Stable base: `93-days-editor` @ `060633b779f4fda9f72761ba735c2c34342b9991`  
Feature branch: `feature/a51-preview-debug-laboratory`

This document is the implementation-facing architecture baseline for A51. It complements the design pack and is deliberately written against the current repository, not against an idealized greenfield design.

## 1. Goal

A51 provides an author/developer laboratory that can answer four questions without mutating authored source of truth:

1. What happens in this preview state?
2. Why is a Move available, blocked, or resolved to a particular Outcome?
3. What runtime consequences followed?
4. Can the author compare, reset, fork, watch, carry authoring focus into Preview, checkpoint an investigation and later reproduce its explicit inputs safely?

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
  ├─ PreviewCheckpointControls (local bounded checkpoint collections)
  ├─ PreviewReproductionDebug (Deep Debug explicit-input projection)
  └─ Preview-from-here read-only focus context
  ↓
preview-laboratory.ts / preview-watches.ts / preview-checkpoints.ts /
preview-from-here.ts / preview-reproduction.ts
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
Persistence repository                │ MUST NOT persist preview scenarios/Watches/checkpoints/focus/reproduction metadata
                                      └──────────────────────────────────────────────
```

The direction remains one-way: Preview reads the current Narrative Project as a source and then works on isolated sandbox values. Sandbox actions never flow back into authoring history or live runtime implicitly. Watches only read the current sandbox. Checkpoints snapshot/restore only that sandbox. Preview-from-here focus remains UI investigation metadata and never becomes runtime truth merely because an author is viewing another Story/time context. Reproduction metadata records or projects only explicit inputs/results already owned by the Preview/canonical runtime boundary; it is not a replay engine or persisted project state.

## 3. State ownership map

| State | Owner | Lifetime | Persisted? | Undo/Redo? | A51 may mutate? |
|---|---|---|---|---|---|
| Authored Story/World definitions | Narrative Project authoring store | project | yes | yes | **no** |
| Live runtime projection | narrative runtime/store boundary | playtest session | repository runtime projection | no authoring entry | only through existing live runtime path, not A51 sandbox |
| Preview scenario baseline | A51 application/UI | investigation | no | no | immutable after scenario creation |
| Preview scenario current project | A51 application/UI | investigation | no | no | yes, only through preview helpers |
| Preview action provenance | A51 application/UI | investigation | no | no | append-only investigation log |
| Preview reproduction metadata on actions | A51 application | investigation | no | no | append only with the owning preview action |
| Current trace reproduction descriptor | A51 application/UI read projection | render/read | no | no | **no** |
| Preview checkpoint snapshots | A51 UI/application helper | investigation | no | no | create/remove/restore inside sandbox only |
| Typed Watch definitions | A51 UI local state | investigation | no | no | yes, UI-only add/remove |
| Typed Watch values | derived read projection | render/read | no | no | **no** |
| Preview-from-here focus/context | NarrativeWorkspace UI session + read projection | request/investigation | no | no | replace only by explicit request |
| View Cursor/editor navigation | editor | editor session | editor rules | not narrative state | A51 must not conflate with Simulation Playhead |

## 4. Non-negotiable invariants

- **A51-I01 — Source isolation:** any A51 action leaves the source authored project unchanged.
- **A51-I02 — No authoring history pollution:** A51 sandbox actions never call authoring `execute` and never create Undo/Redo entries.
- **A51-I03 — No implicit live-runtime write:** A51 sandbox actions never call `replaceRuntimeProject`.
- **A51-I04 — Canonical semantics:** Move guards/resolution, Outcome effects, effective Story state and simulation advancement come from existing runtime functions; A51 does not duplicate them.
- **A51-I05 — Trace is read-only:** inspecting a Move cannot mutate scenario state or append provenance merely to describe the trace.
- **A51-I06 — Failed operation is atomic:** invalid override, missing entity, blocked/input-required execution, invalid forced Outcome or invalid checkpoint lineage leaves the prior scenario usable and unchanged.
- **A51-I07 — Baseline stability:** reset restores the exact scenario baseline; fork reset restores the fork point, not the parent's original baseline; checkpoint restore never rewrites the baseline.
- **A51-I08 — Authored definitions are immutable inside sandbox execution:** runtime consequences and checkpoint restore may change runtime projection only; authored Move/Outcome definitions remain equal.
- **A51-I09 — Explicit test state:** preview-only overrides are structurally and visually distinguishable from authored state.
- **A51-I10 — Deterministic explicit inputs:** with the same scenario and explicit resolver inputs, A51 returns the same resolver result unless the canonical runtime itself defines randomness.
- **A51-I11 — Runtime diff completeness:** A51 change inspection must track the same runtime families that the editor recognizes as runtime state; additions to canonical runtime projection require review of A51 projection.
- **A51-I12 — Stable serialization semantics:** a logically equivalent preview state must not change merely because an extra clone/serialization roundtrip occurred.
- **A51-I13 — Typed Watch boundary:** Watches name reviewed runtime concepts with typed entity references; A51 does not expose arbitrary object/JSON paths as a Watch API.
- **A51-I14 — Watch purity:** evaluating a Watch cannot mutate the sandbox, append preview provenance, persist state or dispatch authoring/live-runtime writes.
- **A51-I15 — Focus is not runtime truth:** Preview-from-here focus must not implicitly move Simulation Playhead, set Actual Presence, synthesize Knowledge or alter Story runtime state.
- **A51-I16 — Fresh Preview-from-here source:** each explicit Preview-from-here request establishes a fresh current-live snapshot boundary; prior arbitrary sandbox overrides/checkpoints are not silently carried into the new focus.
- **A51-I17 — Checkpoint boundary:** checkpoints are bounded local sandbox snapshots, never authoring Undo/Redo, live-runtime history, persisted project state or replay cursors.
- **A51-I18 — Typed reproduction fidelity:** reproduction metadata is a finite discriminated union containing defensive copies of concrete explicit inputs/results, not prose replay instructions or mutable caller aliases.
- **A51-I19 — No fabricated randomness:** A51 must not invent a seed/RNG token when the canonical runtime exposes no hidden random source; current skill checks reproduce through explicit `skillValue` + `rollTotal`.

## 5. Current components

### COMP-A51-01 Preview Scenario Service

Current file: `src/application/narrative/preview-laboratory.ts`

Responsibilities:
- create/fork/reset isolated scenarios;
- validate and apply typed test-only inputs;
- advance sandbox time;
- keep preview action provenance;
- attach finite reproduction metadata to completed actions where a concrete explicit input/result exists.

Must not dispatch authoring commands, persist scenarios or silently manufacture authored/world facts.

### COMP-A51-02 Canonical Runtime Bridge

Current boundary inside `preview-laboratory.ts`.

Responsibilities:
- read-only Move trace;
- canonical Move resolution/application;
- canonical forced existing Outcome application.

Must not duplicate guard logic, synthesize Outcomes not present in authored Move or edit Move definitions.

### COMP-A51-03 Diff & Provenance Reader

Responsibilities:
- compare baseline/current runtime state;
- compare scenarios;
- expose occurrence IDs related to sandbox execution.

Known risk: runtime projection is manually enumerated and can drift when runtime state grows.

### COMP-A51-04 Preview Presentation

Current file: `src/components/narrative/workspace/preview-laboratory-panel.tsx`.

Current state:
- Preview = default compact Move result/current context, without raw JSON;
- Analysis = canonical guard reasons, comparisons, runtime changes, explicit test-only overrides, Typed Watches and Checkpoints;
- Deep Debug = raw traces, provenance, reproduction metadata and Force Outcome;
- human-readable diagnostics are projections of canonical runtime trace data, not a second evaluator;
- derived Move diagnostics are invalidated whenever sandbox state, selected Move, explicit resolver inputs or checkpoint restore changes the source state.

### COMP-A51-05 Typed Watch Projection

Current files:
- `src/application/narrative/preview-watches.ts`;
- `src/components/narrative/workspace/preview-typed-watches.tsx`.

Responsibilities:
- expose a finite typed union for approved Watch concepts;
- read moment, Actual Presence, character knowledge, relationship axis and effective Story state from the current sandbox;
- derive stable Watch identity from typed fields rather than object paths;
- keep selected Watches local to the Preview UI;
- recompute values when the sandbox changes or is restored.

Must not accept arbitrary JSON/object paths, persist Watches, write to authoring/live runtime or reconstruct canonical effective Story state.

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

Must not persist focus, move Simulation Playhead from View Cursor/authored placement, materialize authored/scheduled location as Actual Presence, reconstruct Knowledge for another moment or persist generic Story Canvas selection merely for cross-component communication.

### COMP-A51-07 Preview Checkpoint Service + UI

Current files:
- `src/application/narrative/preview-checkpoints.ts`;
- `src/components/narrative/workspace/preview-checkpoint-controls.tsx`;
- `src/components/narrative/workspace/__tests__/preview-checkpoints-panel.test.tsx`.

Responsibilities:
- capture immutable deep snapshots of the active sandbox;
- enforce `PREVIEW_CHECKPOINT_LIMIT = 8` per scenario;
- validate checkpoint/scenario lineage;
- restore through a fresh clone while preserving the scenario baseline and prior provenance;
- append finite `checkpoint-restore` provenance and its stable reproduction id;
- keep collections local and keyed by `scenario.id`;
- clear checkpoints only when a scenario receives a new source lineage;
- keep Reset checkpoints and start Fork checkpoints empty;
- expose Create / Restore / Remove only in Analysis.

Must not:
- enter authoring store/reducer/history;
- call `execute` or `replaceRuntimeProject`;
- persist checkpoint state;
- treat `sourceActionCount` or prose summaries as a replay cursor/log;
- carry checkpoints into a fresh Preview-from-here remount.

### COMP-A51-08 Reproduction Metadata Projection

Current files:
- `src/application/narrative/preview-reproduction.ts`;
- `src/components/narrative/workspace/preview-reproduction-debug.tsx`;
- `src/application/narrative/__tests__/preview-reproduction.test.ts`;
- `src/components/narrative/workspace/__tests__/preview-reproduction-panel.test.tsx`.

Responsibilities:
- define a finite typed union for explicit reproduction metadata;
- defensively copy `PreviewRuntimeInput` and Move resolution input before storing/projecting them;
- retain requested/applied time advance values;
- retain exact Move/Outcome/checkpoint ids needed to describe completed laboratory operations;
- derive a read-only descriptor for the currently displayed Move trace without appending an action;
- expose raw structured metadata only in Deep Debug.

Must not:
- generate rolls, seeds or RNG tokens;
- infer a seed from `rollTotal`;
- duplicate checkpoint snapshots into provenance;
- turn `PreviewLaboratoryAction[]` into an event-sourcing/replay log;
- persist metadata into Narrative Project;
- alter canonical resolver/effect/simulation semantics.

## 6. AS-IS / TO-BE / KEEP / DEFER

### AS-IS through S6

- local isolated scenarios;
- Set from live / Fork / Reset;
- typed moment/presence/knowledge overrides;
- read-only Move tracing;
- canonical Move execution;
- forced existing authored Outcome through canonical effect engine;
- runtime diff and occurrence-linked preview provenance;
- human-readable diagnostics sourced from canonical trace summaries;
- progressive Preview → Analysis → Deep Debug disclosure;
- stale diagnostics invalidated when source state/input changes;
- finite typed Watches for moment, Actual Presence, knowledge, relationship axes and effective Story state;
- local Watch collections that re-evaluate against the current sandbox without persistence or Undo/Redo;
- typed Preview-from-here focus for View Cursor and selected Story context;
- visible focus/playhead mismatch without implicit runtime state fabrication;
- fresh live-sourced sandbox boundary on each explicit Preview-from-here request;
- manual snapshot-first Preview checkpoints with same-scenario restore, bounded local lifetime, lineage isolation and existing trace invalidation;
- finite typed reproduction metadata for exact explicit laboratory inputs/results;
- read-only current-trace reproduction descriptors;
- Deep Debug-only raw reproduction presentation;
- explicit absence of a fabricated RNG/seed contract under the current deterministic resolver boundary.

### TO-BE after S6

A51 has no further planned implementation slice. The next roadmap stage is A52 — Export / Compiler Boundary, after A51 closure gate and explicit branch/PR handling.

### KEEP

- exactly two top-level workspaces;
- View Cursor != Simulation Playhead;
- Scheduled Presence != Actual Presence;
- Authored Story Definition != Runtime Story State;
- authoring Undo/Redo separated from runtime/playtest/checkpoint changes;
- existing canonical resolver/effect/simulation semantics;
- Watch definitions finite and typed;
- Preview-from-here focus finite, typed and non-persisted;
- checkpoint snapshots bounded, local and non-persisted;
- reproduction metadata finite, typed, non-persisted and derived only from concrete explicit inputs/results.

### DEFER / requires separate evidence or contract decision

- generic arbitrary object-path Watches;
- deterministic random seed/token unless a future canonical runtime introduces an actual hidden/random source with explicit ownership;
- replay/hybrid checkpoint reconstruction until a complete structured replay command contract exists.

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
| REQ-013 checkpoints | UC-013 | preview-checkpoints.ts + PreviewCheckpointControls | snapshot/restore/lineage/boundary regressions; exact code gate #445 | PASS |
| REQ-014 reproduction metadata | UC-014 | preview-reproduction.ts + PreviewReproductionDebug | exact typed metadata/read-only trace/no-RNG/no-dispatch regressions; exact code gate #452 | PASS |

## 8. Contract tests required before expanding A51

S1 baseline contracts remain retained:

1. invalid preview override is atomic;
2. blocked Move execution does not apply an Outcome or append runtime occurrence/action;
3. skill-check missing required resolver input is non-mutating;
4. invalid forced Outcome leaves scenario unchanged;
5. unset Actual Presence is serialization-stable;
6. fork/reset baseline is deep-independent from parent/source;
7. comparison changed paths are symmetric;
8. override → execute/force → advance never mutates authored Move/Outcome definitions;
9. Preview panel never calls authoring `execute` or live `replaceRuntimeProject`;
10. runtime-history boundary tests stay green.

S2 additionally tests progressive disclosure and derived-diagnostic invalidation.

S3 additionally tests Watch purity, finite typed references, invalid-reference atomicity, sandbox recomputation, canonical effective Story-state projection and absence of generic path input.

S4 additionally tests typed Story/View focus, no fabricated Playhead/Actual Presence/Knowledge/Story runtime state, canonical alignment, unscheduled partial placement, mismatch visibility, atomic invalid focus and no authoring dispatch.

S5 additionally tests:

- capture is read-only and snapshot-independent;
- restore returns an exact fresh clone and preserves baseline;
- stored snapshots remain immutable after later sandbox mutations;
- Reset after Restore returns to the original scenario baseline;
- cross-scenario restore fails atomically;
- authored Move definitions and serialization remain stable;
- finite per-scenario limit and immutable removal;
- mixed checkpoint lineages are rejected;
- default Preview hides Checkpoints and Analysis exposes them;
- create → mutate → restore updates visible/runtime state;
- restore invalidates stale Move diagnostics;
- Typed Watches re-evaluate from restored sandbox;
- Reset keeps checkpoints, Fork starts empty, scenario switching isolates lists and Set from live clears old-lineage checkpoints;
- Create is disabled at `8 / 8`, Remove frees a slot;
- capture/restore/remove never dispatch authoring `execute` or live `replaceRuntimeProject`.

S6 additionally tests:

- exact typed test-input metadata and defensive copy semantics;
- resolved skill-check metadata retains exact `skillValue` + `rollTotal`;
- automatic resolution records no fabricated seed/random/RNG field;
- metadata capture leaves canonical resolver results unchanged;
- forced Outcome metadata retains exact Move / Outcome ids;
- advance metadata retains requested and canonical applied minutes;
- checkpoint restore metadata keeps the stable id without embedding snapshots;
- metadata remains JSON-serialization-stable;
- invalid inputs remain atomic;
- Preview and Analysis hide raw reproduction metadata;
- Deep Debug exposes completed-action metadata and read-only current-trace descriptors;
- Trace only appends no provenance action;
- reproduction UI never dispatches authoring `execute` or live `replaceRuntimeProject`.

## 9. Failure-mode review (FMEA-lite)

| Failure mode | Impact | Detection | Mitigation / gate |
|---|---|---|---|
| sandbox writes authored project | critical data corruption | isolation + no-dispatch tests | BLOCKER |
| preview reimplements runtime logic | divergent behavior | code review / dependency trace | BLOCKER |
| invalid operation partially mutates sandbox | misleading investigation | atomic-failure tests | BLOCKER |
| runtime projection drift misses new runtime fields | false comparison/debug conclusions | projection contract review/test | HIGH |
| `undefined` ghost keys change after clone | unstable diffs/checkpoints | serialization-stability test | HIGH |
| raw traces dominate default UI | unusable authoring tool | UI progressive-disclosure tests | S2 PASS |
| stale trace survives changed sandbox/input | misleading author diagnosis | stale-diagnostic UI regressions | S2 PASS |
| Watch accepts arbitrary object path | serialization coupling | API/type review + no-path regression | S3 PASS |
| Watch evaluation mutates sandbox | investigation changes what it observes | whole-scenario immutability tests | S3 PASS |
| Preview from here fabricates missing world state | false conclusions | focus-not-state regressions | S4 PASS |
| stale prior sandbox overrides survive a new from-here request | ambiguous source state | fresh-request/remount boundary | S4 PASS |
| checkpoint aliases/mutates stored snapshot | false time travel | deep-clone regressions | S5 PASS |
| checkpoint from wrong scenario restores | lineage corruption | scenario-id validation + atomic failure | S5 PASS |
| checkpoint restore rewrites baseline | Reset ambiguity | Reset-after-Restore contract | S5 PASS |
| Set-from-live retains old lineage checkpoints | stale state shown as current | UI lineage invalidation | S5 PASS |
| checkpoints reuse authoring Undo/Redo/live history | history corruption/confusion | UI no-dispatch + ownership review | S5 PASS |
| unbounded checkpoints consume memory | editor degradation | visible finite limit | S5 PASS |
| reproduction metadata aliases caller input | historical metadata silently changes | mutation regression + clone helpers | S6 PASS |
| reproduction UI appends action on Trace only | inspection mutates provenance | read-only trace regression | S6 PASS |
| fabricated seed/RNG token implies nonexistent runtime contract | false reproducibility guarantee | resolver evidence review + no-RNG regression | S6 PASS |
| replay inferred from prose summaries | divergent state | ADR/contract review | REJECTED / DEFERRED |
| force Outcome becomes normal execution shortcut | author confusion | Deep Debug-only UI + forced provenance | HIGH |
| test coverage lowered to get green | hidden regressions | CI policy | BLOCKER |

## 10. Defect corrected during S1 architecture review

The original `actual-location` unset path assigned `undefined` to a character key. Because A51 clones via JSON serialization, the next clone removed that key, violating **A51-I12 stable serialization semantics** and making diff/checkpoint behavior depend on whether another action happened afterwards.

S1 corrected the contract to:

```text
if locationId is defined → assign character location
else → delete character key
```

The regression remains part of the green suite.

## 11. Verification pyramid

### Static / architecture review
- A51 application code delegates runtime semantics to canonical runtime APIs;
- no A51 sandbox/checkpoint/reproduction path imports persistence/repository write APIs;
- panel sandbox/checkpoint/reproduction actions do not call authoring store mutators;
- Watch API is finite typed, not string/object-path evaluation;
- Preview-from-here focus is finite typed and carries no runtime-write authority;
- checkpoint collections are local UI investigation state and bounded;
- reproduction metadata is finite typed and records only explicit inputs/results owned by the current runtime contract;
- no seed/RNG token is introduced without canonical random-source ownership.

### Unit / contract
- scenario lifecycle, typed validation, atomic failures, diff/provenance and serialization stability;
- Watch identity and typed read projection;
- typed Preview-from-here focus validation/alignment;
- canonical resolver/effect application contracts;
- checkpoint capture/restore/lineage/baseline/immutability contracts;
- reproduction metadata cloning, exact skill inputs, advance values, checkpoint ids and no-fabricated-RNG contracts.

### Integration / UI
- authoring Undo/Redo and live runtime stay independent while Preview exists;
- Watch collection remains local investigation state;
- Preview-from-here establishes a fresh live source boundary;
- Checkpoints appear only in Analysis;
- restore uses the existing scenario replacement path and invalidates stale traces;
- Watch values follow restored sandbox state;
- Set from live / Fork / Reset / scenario switching obey checkpoint lineage rules;
- checkpoint operations never dispatch authoring/live-runtime writes;
- reproduction data appears only in Deep Debug;
- Trace only can show a reproduction descriptor without adding an action;
- skill-check descriptors expose exact explicit input values and automatic resolution exposes no seed/random token.

### System / CI
Required full branch gate:
- dependency install;
- production dependency audit;
- lint;
- web build;
- Electron build;
- Jest with coverage;
- diagnostics artifact upload;
- Vite smoke;
- Electron smoke.

No threshold weakening or coverage exclusions are accepted as a fix.

## 12. Completed verification checklist through S6

S1–S6 have established the following verified baseline:

- architecture invariants I01–I19 reviewed against actual files;
- REQ-001..014 have concrete ownership/evidence, with REQ-014 now PASS;
- unset-presence serialization defect remains fixed;
- negative/atomicity and runtime-history boundary tests remain retained;
- progressive disclosure does not alter runtime semantics;
- human-readable diagnostics are canonical-trace projections and raw debug data is opt-in;
- stale trace presentation is explicitly invalidated;
- Typed Watches are finite, read-only and local; generic arbitrary object-path Watches remain deferred;
- Preview-from-here focus is finite, typed and non-persisted; authored/View focus cannot silently become Playhead, Actual Presence, Knowledge or Story runtime truth;
- each explicit Preview-from-here request establishes a fresh live-sourced boundary;
- Checkpoints are snapshot-first, bounded to 8 per scenario, local/non-persisted and separated from authoring Undo/Redo/live history;
- Reset after Restore returns to the original scenario baseline; Fork and Set-from-live lineage rules are explicit;
- reproduction metadata is finite, typed, defensive-copy based and non-persisted;
- current-trace reproduction metadata is read-only presentation state and does not append an action;
- skill checks reproduce through explicit `skillValue` + `rollTotal`; no hidden seed/RNG ownership was found or fabricated;
- run #432 was an ambiguous S3 test selector and was corrected without product-code semantics changes;
- S3 code head `8851d8978e6b90b999f75d6ccd84d85455de84b7` passed #433: 326/326 suites, 2008 passed tests;
- S4 semantic contract head `469816a963415214f1e3442ba6cc068fb1b33b0f` passed #435 before implementation;
- S4 run #437 was an incomplete test fixture and was corrected test-only;
- S4 exact code head `cdbd446c8674efe072f4c58a636cbd23700c12cb` passed #438: 329/329 suites, 2019 passed tests;
- S5 ADR head `84e2de4ce46285b21e8a234f035fca33815ef80c` passed #440;
- S5 application run #442 exposed only an invalid test fixture Move kind (`wait`), corrected test-only to `inform`; application head `0b50579498bb6b3c7937d8547312c0bb26f41956` passed #443;
- S5 UI wiring head `a109a70544a7ec748544bd87ea4e02481f4eeaa4` failed #444 at web build with exact missing `./preview-checkpoint-controls` module / resulting implicit-any callback error;
- final S5 code head `5fdecf08f4204c5d6e714575e02e4e4b609706fe` passed #445: **331/331 suites**, **2030 passed tests** (23 skipped, 42 todo; 2095 total), diagnostics artifact uploaded, Vite smoke PASS and Electron smoke PASS;
- S6 contract head `b344618c168e8da590a3e3d7686f1ea3b7a4ed83` established evidence-first no-fabricated-RNG semantics;
- S6 implementation heads `1d93361e50461a9130a92c4e4fcbfc6a4c55fc42` and `40ce2fa972839c9e602417f7f8ecd6e43be4d35d` added typed metadata and Deep Debug projection;
- runs #450 and #451 exposed only ambiguous legacy Testing Library selectors after the second legitimate Deep Debug representation appeared; corrections were test-only scoped assertions;
- final S6 code head `2aa3e6f63b29ae2f80515ad8e4c09b780b101aeb` passed #452: **333/333 suites**, **2037 passed tests** (23 skipped, 42 todo; 2102 total), diagnostics artifact uploaded, Vite smoke PASS and Electron smoke PASS.

## 13. Slice order and closure

```text
A51-S1 Stabilize architecture + contracts + CI — DONE
  ↓
A51-S2 Progressive disclosure + human-readable diagnostics — DONE
  ↓
A51-S3 Typed Watches — DONE
  ↓
A51-S4 Preview from here — DONE
  ↓
A51-S5 Checkpoints/time travel — DONE (snapshot-first, code gate #445)
  ↓
A51-S6 Reproduction metadata — DONE (explicit-input model, code gate #452)
  ↓
A51 bookkeeping/final exact-head full gate
  ↓
Explicit PR closure/merge decision → A52 Export / Compiler Boundary
```

The purpose of the slice order was to keep each architectural change independently diagnosable. S6 completed the planned A51 implementation surface without inventing a random-seed or replay design unsupported by the current canonical runtime. The bookkeeping head must pass the same full exact-head gate before final A51 closure evidence is recorded.
