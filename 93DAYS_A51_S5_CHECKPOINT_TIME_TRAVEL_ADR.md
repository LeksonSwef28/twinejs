# A51-S5 ADR — Preview Checkpoints / Time Travel

Status: **ADR PASS / IMPLEMENTATION VERIFIED / S5 DONE**  
Requirement: **REQ-013 checkpoints / time travel**  
Stage: **A51-S5**  
Decision date: **2026-09-16**  
Verification date: **2026-09-17**

## 1. Decision summary

A51-S5 uses **manual, immutable snapshot checkpoints** inside an isolated Preview Scenario.

S5 does **not** implement replay-only time travel and does not treat the existing `PreviewLaboratoryAction[]` as an event-sourcing log.

A checkpoint captures the exact current `NarrativeProject` sandbox value by deep clone. Restoring a checkpoint replaces only the current sandbox project for the same Preview Scenario. The scenario baseline remains unchanged, authoring Undo/Redo remains untouched, live runtime remains untouched and no checkpoint is persisted into the Narrative Project.

Replay/hybrid reconstruction remains deferred until A51 has a structured reproduction contract that records every required input, including resolver inputs and any future real randomness metadata.

## 2. Repository evidence

### Existing Preview Scenario semantics

`PreviewScenario` already owns:

- an immutable `baselineProject` reset point;
- a mutable isolated `project` sandbox;
- append-only investigation `actions`;
- JSON-clone-based deep copies for create/fork/reset and other preview helpers.

This gives S5 a known exact-state representation without adding a second runtime model.

### Existing action log is provenance, not replay

`PreviewLaboratoryAction` records action id/kind, a human-readable summary, optional Move/Outcome/occurrence ids and an optional forced flag. It does **not** structurally retain every input required to reconstruct the transition. Typed test inputs and skill-check resolver inputs are not represented as a complete replay command stream.

Therefore replaying `actions` cannot be claimed to reproduce arbitrary sandbox state exactly.

### Canonical runtime itself is explicit about hidden randomness

Current Move resolution does not hide randomness: skill checks require caller-supplied skill/roll input. That is good for determinism, but the Preview provenance log still does not preserve all those values as replayable commands.

### Runtime history is a separate boundary

`runtime-history.ts` deliberately keeps live runtime replacement outside authoring Undo/Redo. Preview checkpoints preserve that separation and do not reuse the authoring `past/present/future` stack.

## 3. Alternatives considered

### A. Replay-only — REJECTED for S5

Rebuilding checkpoint state from scenario baseline + `PreviewLaboratoryAction[]` was rejected because the action list is descriptive provenance, not a complete typed event log. Converting summaries back into commands would be brittle and semantically false. Expanding every A51 action into a versioned replay protocol would be a larger architecture change and overlaps A51-S6 reproduction metadata.

### B. Hybrid snapshot + replay — DEFERRED

Hybrid storage still requires a trustworthy replay command schema. S5 does not have that prerequisite. It may be reconsidered later only if an actual reproduction requirement justifies it.

### C. Full sandbox snapshot — ACCEPTED

Advantages:

- exact state restore by construction;
- no duplicate runtime evaluator;
- no dependence on incomplete action summaries;
- automatically includes every current runtime family without maintaining a second runtime projection list;
- reuses clone semantics already verified by S1–S4;
- simple atomic restore contract.

Cost: full snapshots duplicate authored definitions as well as runtime state. S5 therefore uses manual capture only and a finite per-scenario limit.

## 4. Implemented checkpoint model

`src/application/narrative/preview-checkpoints.ts` defines:

```text
PreviewCheckpoint
  id
  scenarioId
  label
  projectSnapshot: NarrativeProject
  sourceActionCount
```

Rules:

- `projectSnapshot` is a deep clone of `scenario.project` at capture time;
- checkpoint metadata is local investigation state;
- `sourceActionCount` is descriptive provenance only, not a replay cursor;
- checkpoint identity is stable within the UI session;
- no wall-clock timestamp is required for correctness or ordering;
- `PREVIEW_CHECKPOINT_LIMIT = 8` bounds each scenario collection.

## 5. Capture semantics

Creating a checkpoint:

- does not mutate `scenario.project`;
- does not mutate `scenario.baselineProject`;
- does not write live runtime;
- does not dispatch authoring `execute`;
- does not persist anything;
- does not change selected Move, typed Watches, compare target or Preview-from-here focus;
- produces a deep-independent snapshot that cannot be changed by later sandbox mutations.

Checkpoint creation is metadata capture, not a runtime event. It does not append a runtime occurrence.

## 6. Restore semantics

Restoring a checkpoint:

1. verifies that the checkpoint belongs to the active Preview Scenario;
2. deep-clones the checkpoint snapshot into `scenario.project`;
3. leaves `scenario.baselineProject` unchanged;
4. leaves existing investigation actions intact and appends a `checkpoint-restore` laboratory action;
5. invalidates derived Move/Outcome traces through the existing `replaceActive()` UI path;
6. does not call live `replaceRuntimeProject`;
7. does not create an authoring Undo/Redo entry;
8. does not alter the checkpoint snapshot itself.

This is **sandbox state restore**, not reverse simulation and not authoring Undo.

`Reset` after a checkpoint restore still returns to the scenario's original baseline/fork point. This distinction is verified by the application regressions.

## 7. Scenario lineage / invalidation rules

### Set from live runtime

Replacing a scenario source with **Set from live runtime** establishes a new baseline/source lineage. Existing checkpoints for that scenario are discarded.

### Fork current

A newly forked scenario starts with an empty checkpoint collection. Its baseline is the fork point. Parent checkpoints are not inherited.

### Reset

Reset does not invalidate checkpoints because the scenario lineage/baseline did not change.

### Preview from here

A new Preview-from-here request remounts the Preview Laboratory and therefore starts with no checkpoints. This matches S4's fresh-sandbox rule.

### Scenario switching

Checkpoint collections are keyed by scenario id. Switching active scenario shows only that scenario's checkpoints.

## 8. UI placement

Checkpoint controls live only in **Analysis**, not default Preview and not raw Deep Debug.

The implemented workflow is:

```text
Analysis
  Checkpoints · sandbox only
  [Create checkpoint]
  checkpoint list
    [Restore]
    [Remove]
```

The UI explicitly states that restore affects only the isolated sandbox and is not authoring Undo/Redo or live Playtest rewind.

## 9. What a checkpoint does NOT capture

A checkpoint captures sandbox project state, not the entire editor UI session. It does not restore:

- current Preview/Analysis/Deep Debug tab;
- selected Move/Outcome;
- typed Watch definitions;
- compare-scenario selection;
- View Cursor/editor workspace/camera focus as a new runtime truth;
- Preview-from-here request context;
- uncommitted skill-check input fields;
- error/trace presentation state.

Those remain UI/investigation controls. Derived traces are invalidated after restore and Typed Watches re-evaluate against the restored sandbox.

## 10. Memory / lifecycle boundary

S5 does not create unbounded full-project history.

Verified requirements:

- manual checkpoints only;
- explicit finite per-scenario limit of 8;
- Create is disabled at the limit and the count is visible;
- removing a checkpoint releases a slot from local state;
- closing/remounting the laboratory drops all checkpoints;
- checkpoints are not serialized into project persistence.

Automatic every-action snapshots remain out of scope.

## 11. Regression verification

Application/contract tests verify:

1. capture is read-only with respect to the source scenario;
2. checkpoint snapshot is deep-independent from later scenario mutations;
3. restore reproduces the checkpoint project exactly;
4. restore deep-clones so later mutations cannot modify the stored checkpoint;
5. restore preserves the scenario baseline;
6. Reset after restore still returns to the original scenario baseline;
7. restore appends investigation provenance without truncating earlier actions;
8. restoring a checkpoint from another scenario fails atomically;
9. authored Move/Outcome definitions remain identical through capture/restore;
10. serialization-stable states remain stable after capture/restore;
11. the finite checkpoint limit and immutable removal contract are enforced;
12. mixed-scenario checkpoint collections are rejected.

UI/integration tests verify:

- Analysis exposes checkpoint controls while default Preview does not;
- create → mutate sandbox → restore returns Watch/runtime state to the captured snapshot;
- restore invalidates stale Move diagnostics;
- Set from live runtime clears checkpoints for that lineage;
- Fork current starts without inherited checkpoints;
- Reset keeps checkpoints for the same lineage;
- scenario switching isolates checkpoint lists;
- the finite limit is visible and enforced;
- Remove frees a slot;
- checkpoint operations do not call authoring `execute` or live `replaceRuntimeProject`;
- Typed Watches re-evaluate from restored sandbox state rather than storing checkpoint values.

## 12. CI evidence

ADR head `84e2de4ce46285b21e8a234f035fca33815ef80c` passed workflow #440.

Application checkpoint contract reached GREEN on `0b50579498bb6b3c7937d8547312c0bb26f41956` in workflow #443 after a test-fixture-only correction (`wait` → valid `inform`).

UI wiring head `a109a70544a7ec748544bd87ea4e02481f4eeaa4` failed workflow #444 at web build because `preview-laboratory-panel.tsx` referenced a missing `./preview-checkpoint-controls` module; TypeScript also reported the callback parameter as implicit `any`. The component and focused UI regressions were then added without changing canonical runtime semantics.

Final S5 code head `5fdecf08f4204c5d6e714575e02e4e4b609706fe` passed workflow **#445**. Install, production audit, lint, web build, Electron build, Jest/coverage, diagnostics upload, Vite smoke and Electron smoke all passed.

Exact Jest evidence from the downloaded `93-days-test-diagnostics` artifact:

```text
Test Suites: 331 passed, 331 total
Tests:       23 skipped, 42 todo, 2030 passed, 2095 total
Snapshots:   0 total
Time:        103.879 s
Ran all test suites.
```

## 13. FMEA-lite

| Failure mode | Impact | Mitigation / verified gate |
|---|---|---|
| checkpoint mutates after capture | false time-travel state | deep clone on capture + regression PASS |
| restore aliases stored snapshot | later actions corrupt history | deep clone on every restore + regression PASS |
| checkpoint from wrong scenario restored | lineage corruption | scenario-id validation + atomic failure PASS |
| restore changes baseline | Reset semantics become ambiguous | baseline-preservation + Reset-after-Restore PASS |
| Set-from-live keeps old checkpoints | old lineage presented as current | lineage invalidation UI regression PASS |
| replay inferred from prose summaries | divergent state | replay-only remains rejected |
| checkpoints enter authoring Undo/Redo | history corruption | UI-local state + no-dispatch regression PASS |
| checkpoints persist in Narrative Project | project/schema pollution | no persistence/store path introduced |
| unbounded snapshots consume memory | editor degradation | manual capture + limit 8 PASS |
| stale trace survives restore | misleading diagnosis | existing `replaceActive()` invalidation path + UI regression PASS |

## 14. Non-goals

S5 does not implement:

- reverse execution of the canonical simulation kernel;
- persisted save-game slots;
- authoring history integration;
- deterministic replay/export format;
- cross-session checkpoint persistence;
- checkpoint merging;
- automatic checkpoint per action;
- replay from `PreviewLaboratoryAction.summary` strings;
- random seed/token management.

Random/reproduction metadata remains A51-S6 and must be justified by actual repository evidence.

## 15. Gate decision

**A51-S5 = DONE / VERIFIED.**

The checkpoint remains an isolated, bounded, immutable sandbox snapshot. It is not authoring Undo, live-runtime history or a disguised replay log.

PR #24 remains open. A51 itself remains IN PROGRESS until later permitted slices and the final full gate are complete.
