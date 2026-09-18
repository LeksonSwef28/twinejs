# 93 Days Narrative Editor — A52 Architecture & Verification Baseline

Status: **ACTIVE / S1 CONTRACT**  
Stage: **A52 — Export / Compiler Boundary**  
Stable base: `93-days-editor` @ `3d0f59219fca29d3338034777d8343b03c74cc45`  
Post-merge base gate: workflow **#454 GREEN** — **333/333 suites**, **2037 passed tests** (23 skipped, 42 todo; 2102 total), diagnostics upload PASS, Vite smoke PASS, Electron smoke PASS.  
Feature branch: `feature/a52-export-compiler-boundary`

This document is the implementation-facing architecture baseline for A52. A52 is HIGH risk under `93DAYS_ENGINEERING_CHANGE_PROTOCOL.md` because it defines the compiler/export boundary between the canonical Narrative Project and a runnable/exportable artifact.

## 1. Goal

A52 must prove that the authored Narrative Project can be compiled into a deterministic, versioned runtime artifact and exported without creating or maintaining a second hand-authored Passage graph.

The compiler is a projection of the canonical authored model. It is not a new authoring model, a new Story Brain, a second narrative runtime, or permission to serialize the current playtest session as the game's authored starting state.

## 2. Repository evidence

### Existing Twine publishing boundary

`src/util/publish.ts` already owns generic Twine serialization/binding:

- `publishStory()` serializes a transient `Story` / `Passage[]` into `<tw-storydata>`;
- `publishStoryWithFormat()` binds that story data into an installed story format;
- `src/store/use-publishing.ts` and `src/store/use-story-launch.ts` own existing launch/publish orchestration.

A52 must reuse this boundary if/when it needs Twine format binding. It must not reimplement generic story-format publishing.

### Canonical Narrative Project ownership

`src/routes/story-edit/story-edit-route.tsx` mounts `NarrativeProjectProvider` using the outer Twine Story id as `hostStoryId`. The Narrative Workspace replaced the stock Passage-map authoring surface; the outer Story is a host/integration container, not a second canonical narrative graph.

### Existing authored/runtime split

`src/store/narrative-project/persistence-projection.ts` already defines:

- `NarrativeProjectAuthoredProjection`;
- `NarrativeProjectRuntimeProjection`;
- `projectNarrativePersistence()`.

A52 must reuse this reviewed ownership split rather than hand-enumerating another authored model.

### Authored initial state is not live runtime state

`InitialKnowledgeSeed[]` is authored baseline cognition. `initializeCharacterKnowledge()` materializes it only during an explicit initialization step. Existing regressions confirm authoring initial knowledge does not mutate `simulation.characterKnowledge`.

Likewise, authored item placement and Story activation live in definitions; runtime overlays/history remain separate. Therefore export must construct a fresh initial runtime projection and must not capture arbitrary current Preview/playtest mutations.

### Existing validation and source navigation

`queryStoryBrainProjectDiagnostics()` composes the existing A48 project-wide diagnostics. `storyBrainNavigationForFinding()` maps findings back to Story or WORLD/TIME authoring sources.

A52 must project these diagnostics into an export gate instead of introducing a parallel validator.

## 3. State ownership

| State | Owner | Export role |
|---|---|---|
| Narrative authored definitions | `NarrativeProjectAuthoredProjection` | **canonical compiler input** |
| Narrative editor state | editor | excluded |
| Current live/playtest runtime | runtime projection | excluded from authored start |
| Preview scenarios/Watches/checkpoints/reproduction metadata | A51 local investigation | excluded |
| Fresh initial runtime projection | A52 pure compiler initializer | derived output |
| Versioned runtime artifact | A52 compiler | derived, non-authoring output |
| Generated transient Twine Story/Passage data | A52 export adapter | derived only; never persisted as canonical authoring |
| Story format binding / HTML serialization | existing Twine publisher | reused output boundary |

## 4. Non-negotiable invariants

- **A52-I01 — Single authored source:** Narrative Project authored definitions are the only canonical narrative source. Generated Passage data is never independently authored or persisted as narrative truth.
- **A52-I02 — Derived-only output:** compiling/exporting cannot mutate Narrative Project, outer Story authoring state, authoring Undo/Redo, live runtime, or persistence repositories.
- **A52-I03 — Fresh authored start:** compiled initial runtime is derived from authored baseline rules; current playtest/Preview runtime state is not copied into the artifact.
- **A52-I04 — Deterministic compilation:** the same exact compiler input and compiler version produce byte-identical canonical artifact serialization. No clock, random id, current app session state, or iteration-order accident may enter output.
- **A52-I05 — Versioned artifact:** the runtime artifact has an explicit format id and artifact version independent from Narrative Project schema version.
- **A52-I06 — Existing ownership split:** compiler input reuses `NarrativeProjectAuthoredProjection`; A52 does not maintain a second manually enumerated authored schema.
- **A52-I07 — Validation before artifact:** blocking export diagnostics prevent artifact success atomically. Advisory Story Brain findings remain visible but do not become blockers merely because their current severity is `warning`.
- **A52-I08 — Source-linked diagnostics:** Story Brain-derived export diagnostics preserve the underlying finding identity and can resolve through existing authoring navigation where possible. Compiler-level project blockers remain explicitly typed even when no narrower authoring entity exists.
- **A52-I09 — No second runtime:** compiler/export code contains no duplicate guard, Move resolution, Outcome effect, simulation, schedule, cognition, body, injury or Story-state evaluator.
- **A52-I10 — Existing publisher reuse:** Twine story-format binding remains owned by `publishStoryWithFormat()`; any A52 adapter supplies transient generated data and does not fork publishing logic.
- **A52-I11 — Array semantics preserved:** canonical serialization may sort object keys, but it must preserve authored array order unless a specific collection contract explicitly declares order irrelevant.
- **A52-I12 — Compatibility is explicit:** future artifact changes require an artifact version/migration or a deliberate incompatibility decision; old artifact meaning must not silently drift.

## 5. Planned components

### COMP-A52-01 Export validation projection

Input: `NarrativeProject`.  
Reuses `queryStoryBrainProjectDiagnostics()`.  
Produces explicit blocker/advisory export diagnostics while preserving source finding ids/kinds. It may additionally emit finite compiler-level blockers when artifact initialization itself cannot be constructed safely (for example missing template periods or invalid initial-runtime seeds).

### COMP-A52-02 Initial runtime initializer

Pure function from authored project baseline to `NarrativeProjectRuntimeProjection`.

V1 baseline:
- simulation moment = Day 1 / first authored period start minute;
- `characterKnowledge = initializeCharacterKnowledge(initialKnowledge)`;
- `activeBehaviorProfileByCharacter = {}`;
- `actualLocationByCharacter = {}` because Scheduled Presence != Actual Presence;
- `bodyByCharacter = {}` so canonical simulation retains its existing lazy default-body behavior;
- memories/relationships/pending reactions/mind states/injuries/runtime placement overrides/Story overrides/runtime occurrences/active Story executions start empty.

No field is copied from current live runtime merely because it currently contains data.

### COMP-A52-03 Runtime artifact compiler

Produces a versioned data artifact from:
- current project schema version;
- existing authored projection;
- fresh initial runtime projection.

It has no UI, persistence writes, story-format binding, or current-time metadata.

### COMP-A52-04 Canonical serializer

Produces stable JSON by recursively sorting object keys while preserving array order.

### COMP-A52-05 Transient export adapter

Later slice. It may project the compiled artifact into a temporary host Story / generated Passage shell and then call the existing Twine publisher. Generated Passage data is disposable compiler output, not authoring source.

### COMP-A52-06 Export UI / diagnostics

Later slice. It exposes validate/export actions and source-linked diagnostics inside the existing two-workspace product. It must not add a third top-level workspace.

## 6. Export gate policy

Existing Story Brain severity is author-facing (`info | warning`) and is not an export disposition.

S1 defines the initial **blocking kinds** as findings that make the runtime artifact structurally unsafe or unable to honor an explicit runtime contract:

- `broken-authored-reference`;
- `partial-story-placement`;
- `invalid-story-placement`;
- `runtime-policy-without-exact-placement`.

All other existing A48 findings are advisory in artifact v1 unless later repository evidence proves a concrete runtime ambiguity must block compilation.

In particular, content-quality findings such as terminal branches, isolated/unreachable nodes, asymmetric/empty outcomes, missing Story participant metadata and line-frontier warnings do not automatically block export. Schedule overlap/consistency findings also remain advisory under the current repository because authored schedules are diagnostic/planning input and do not themselves write Actual Presence.

Compiler-level blockers are also permitted for artifact prerequisites that Story Brain does not own:

- `missing-template-period`;
- `invalid-initial-runtime`.

These are project-level diagnostics and need not fabricate a Story Brain entity reference.

Any later blocker expansion requires a contract update plus regression proving why the artifact cannot safely execute without it.

## 7. Requirement traceability

| Requirement | Evidence / owner | S1 gate |
|---|---|---|
| REQ-001 single source of truth | Narrative Workspace + hostStoryId + A46 replacement of Passage authoring | CONTRACT PASS |
| REQ-002 deterministic artifact | pure authored projection + canonical serializer contract | CONTRACT PASS |
| REQ-003 versioned schema | A52 runtime artifact v1 contract | CONTRACT PASS |
| REQ-004 authored initial runtime | persistence split + InitialKnowledge materializer | CONTRACT PASS |
| REQ-005 validation gate | Story Brain project diagnostics + explicit export disposition | CONTRACT PASS |
| REQ-006 source-linked diagnostics | existing Story Brain diagnostic navigation | CONTRACT PASS |
| REQ-007 Twine publishing reuse | `publishStoryWithFormat()` | CONTRACT PASS |
| REQ-008 runnable proof | later implementation slice; must not create second runtime | NOT YET VERIFIED |

## 8. Required regression design

Before S2 implementation is considered complete:

1. repeated compile of the same project is byte-identical;
2. editor navigation changes do not change artifact bytes;
3. live simulation/Preview mutations do not change artifact bytes;
4. authored changes do change the appropriate artifact data;
5. initial Knowledge is materialized from `initialKnowledge`;
6. current runtime Knowledge/memories/relationships/injuries/occurrences/overrides are excluded;
7. Actual Presence is not synthesized from schedule;
8. compiler does not mutate input;
9. Story Brain blocking finding returns no successful artifact;
10. missing template period or invalid initial-runtime materialization returns a typed compiler blocker rather than throwing a partial artifact;
11. advisory-only findings still permit compilation and remain reported;
12. Story Brain export diagnostics retain source finding identity;
13. canonical serialization sorts object keys and preserves array order;
14. no compiler path calls authoring `execute`, live `replaceRuntimeProject`, or project persistence;
15. no compiler path calls canonical runtime evaluators to pre-execute authored content.

Later adapter/UI slices add publisher reuse, no-persisted-generated-Passage and runnable-proof integration tests.

## 9. Slice order

```text
A52-S1 Architecture + artifact + validation contract
  ↓
A52-S2 Pure artifact compiler + initial runtime + canonical serializer
  ↓
A52-S3 Transient export adapter + source-linked export diagnostics/UI
  ↓
A52-S4 Minimal runnable compiler proof + final export verification
  ↓
Final full gate → roadmap DONE → merge → exact-SHA post-merge verification
```

Each slice receives its own exact-head full gate before the next high-risk boundary is expanded.

## 10. Recovery

S1 is documentation-only and can be reverted directly. Later compiler work remains isolated behind pure functions/adapters; no migration of author data is permitted as a side effect of export. If an artifact contract changes before release, prefer an explicit artifact version bump or a focused roll-forward rather than rewriting saved Narrative Projects.

## 11. S1 decision

**A52-S1 architecture/ownership decision: CONTRACT PASS / IMPLEMENTATION NOT YET VERIFIED.**

Implementation may begin only after this docs head passes the exact-head branch gate.
