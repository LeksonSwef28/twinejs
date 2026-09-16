# A51-S5 ADR — Preview Checkpoints / Time Travel

Status: **ADR PASS / IMPLEMENTATION NOT YET VERIFIED**  
Requirement: **REQ-013 checkpoints / time travel**  
Stage: **A51-S5**  
Decision date: **2026-09-16**

## 1. Decision summary

A51-S5 will use **manual, immutable snapshot checkpoints** inside an isolated Preview Scenario.

S5 will **not** implement replay-only time travel and will not treat the existing `PreviewLaboratoryAction[]` as an event-sourcing log.

A checkpoint captures the exact current `NarrativeProject` sandbox value by deep clone. Restoring a checkpoint replaces only the current sandbox project for the same Preview Scenario. The scenario baseline remains unchanged, authoring Undo/Redo remains untouched, live runtime remains untouched and no checkpoint is persisted into the Narrative Project.

Replay/hybrid reconstruction is deferred until A51 has a structured reproduction contract that records every required input, including resolver inputs and any future real randomness metadata.

## 2. Repository evidence

### Existing Preview Scenario semantics

`PreviewScenario` already owns:

- an immutable `baselineProject` reset point;
- a mutable isolated `project` sandbox;
- append-only investigation `actions`;
- JSON-clone-based deep copies for create/fork/reset and other preview helpers.

This gives S5 a known exact-state representation without adding a second runtime model.

### Existing action log is provenance, not replay

`PreviewLaboratoryAction` currently records:

- action id/kind;
- human-readable summary;
- optional Move/Outcome/occurrence ids;
- optional forced flag.

It does **not** structurally retain every input required to reconstruct the state transition. In particular, typed test inputs and skill-check resolver inputs are not represented as a complete replay command stream.

Therefore replaying `actions` cannot be claimed to reproduce arbitrary sandbox state exactly.

### Canonical runtime itself is explicit about hidden randomness

Current Move resolution does not hide randomness: skill checks require caller-supplied skill/roll input. That is good for determinism, but the Preview provenance log still does not preserve all those values as replayable commands.

### Runtime history is a separate boundary

`runtime-history.ts` deliberately keeps live runtime replacement outside authoring Undo/Redo. Preview checkpoints must preserve that separation and must not reuse the authoring `past/present/future` stack.

## 3. Alternatives considered

### A. Replay-only — REJECTED for S5

Idea: rebuild checkpoint state from scenario baseline + `PreviewLaboratoryAction[]`.

Rejected because the action list is intentionally descriptive provenance, not a complete typed event log. Converting summaries back into commands would be brittle and semantically false. Expanding all A51 actions into a versioned replay protocol would be a larger architecture change and overlaps A51-S6 reproduction metadata.

### B. Hybrid snapshot + replay — DEFERRED

Idea: occasional snapshots with replay commands between them.

This can reduce memory for very long histories, but it still requires a trustworthy replay command schema. S5 does not have that prerequisite. Hybrid storage may be reconsidered after S6 if real reproduction metadata justifies it.

### C. Full sandbox snapshot — ACCEPTED

Idea: capture the exact current `NarrativeProject` sandbox clone.

Advantages:

- exact state restore by construction;
- no duplicate runtime evaluator;
- no dependence on incomplete action summaries;
- automatically includes every current runtime family without maintaining a second runtime projection list;
- reuses the clone semantics already verified by S1–S4;
- simple atomic restore contract.

Cost: full project snapshots duplicate authored definitions as well as runtime state. S5 therefore requires a finite per-scenario checkpoint limit and manual capture only; no automatic checkpoint on every action.

## 4. Checkpoint model

The implementation should use a shape equivalent to:

```text
PreviewCheckpoint
  id
  scenarioId
  name / label
  projectSnapshot: NarrativeProject
  sourceActionCount
```

Rules:

- `projectSnapshot` is an immutable deep clone of `scenario.project` at capture time;
- checkpoint metadata is local A51 investigation state;
- `sourceActionCount` is descriptive provenance only, not a replay cursor;
- checkpoint identity is stable within the UI session;
- no wall-clock timestamp is required for correctness or ordering;
- implementation must enforce a finite per-scenario checkpoint count and surface the limit to the author.

## 5. Capture semantics

Creating a checkpoint:

- does not mutate `scenario.project`;
- does not mutate `scenario.baselineProject`;
- does not write live runtime;
- does not dispatch authoring `execute`;
- does not persist anything;
- does not change selected Move, typed Watches, compare target or Preview-from-here focus;
- produces an immutable deep clone that cannot be changed by later sandbox mutations.

Checkpoint creation itself is metadata capture, not a runtime event. It does not need to append a runtime occurrence.

## 6. Restore semantics

Restoring a checkpoint:

1. verifies that the checkpoint belongs to the active Preview Scenario;
2. deep-clones the checkpoint snapshot into `scenario.project`;
3. leaves `scenario.baselineProject` unchanged;
4. leaves existing investigation actions intact and appends a `checkpoint-restore` laboratory action;
5. invalidates derived Move/Outcome traces in the UI exactly like other sandbox state changes;
6. does not call live `replaceRuntimeProject`;
7. does not create an authoring Undo/Redo entry;
8. does not alter the checkpoint snapshot itself.

This is **sandbox state restore**, not reverse simulation and not authoring Undo.

`Reset` after a checkpoint restore still returns to the scenario's original baseline/fork point. This distinction is intentional and must be visible in tests.

## 7. Scenario lineage / invalidation rules

### Set from live runtime

Replacing a scenario source with **Set from live runtime** establishes a new baseline/source lineage. Existing checkpoints for that scenario must be discarded because their snapshots belong to the old source lineage.

### Fork current

A newly forked scenario starts with an empty checkpoint collection. Its baseline is already the fork point. Checkpoints are not inherited implicitly from the parent.

### Reset

Reset does not invalidate checkpoints because the scenario lineage/baseline did not change.

### Preview from here

A new Preview-from-here request remounts the Preview Laboratory and therefore starts with no checkpoints. This matches S4's fresh-sandbox rule.

### Scenario switching

Checkpoint collections are keyed by scenario id. Switching active scenario shows only that scenario's checkpoints.

## 8. UI placement

Checkpoint controls belong in **Analysis**, not default Preview and not raw Deep Debug.

Reason: checkpoints are an explicit investigation tool. They change sandbox state but do not expose raw runtime internals.

Minimum author workflow:

```text
Analysis
  Checkpoints · sandbox only
  [Create checkpoint]
  checkpoint list
    [Restore]
    [Remove]
```

The UI must explicitly state that restore affects only the isolated sandbox and is not authoring Undo/Redo or live Playtest rewind.

No third workspace or separate global history surface is introduced.

## 9. What a checkpoint does NOT capture

A checkpoint captures sandbox project state, not the entire editor UI session.

It does not restore:

- current Preview/Analysis/Deep Debug tab;
- selected Move/Outcome;
- typed Watch definitions;
- compare-scenario selection;
- View Cursor/editor workspace/camera focus as a new runtime truth;
- Preview-from-here request context;
- uncommitted skill-check input fields;
- error/trace presentation state.

Those are UI/investigation controls and should remain independent. Derived traces must be invalidated after restore and can be recomputed against the restored sandbox.

## 10. Memory / lifecycle boundary

S5 must not create unbounded full-project history.

Requirements:

- manual checkpoints only;
- explicit finite per-scenario limit;
- create control disabled or rejected clearly at the limit;
- removing a checkpoint releases it from local state;
- closing/remounting the laboratory drops all checkpoints;
- checkpoints are not serialized into project persistence.

Automatic every-action snapshots are out of scope.

## 11. Required regression tests before S5 can close

Application/contract tests:

1. capture is read-only with respect to the source scenario;
2. checkpoint snapshot is deep-independent from later scenario mutations;
3. restore reproduces the checkpoint project exactly;
4. restore deep-clones so later mutations cannot modify the stored checkpoint;
5. restore preserves the scenario baseline;
6. Reset after restore still returns to the original scenario baseline;
7. restore appends investigation provenance without truncating earlier actions;
8. restoring a checkpoint from another scenario fails atomically;
9. authored Move/Outcome definitions remain identical through capture/restore;
10. serialization-stable states remain stable after capture/restore.

UI/integration tests:

11. Analysis exposes checkpoint controls; default Preview does not;
12. create → mutate sandbox → restore returns visible/runtime state to the captured snapshot;
13. restore invalidates stale Move/Outcome diagnostics;
14. Set from live runtime clears checkpoints for that scenario;
15. Fork current starts with no inherited checkpoints;
16. Reset keeps checkpoints for the same lineage;
17. scenario switching isolates checkpoint lists by scenario id;
18. finite checkpoint limit is enforced and visible;
19. capture/remove do not call authoring `execute` or live `replaceRuntimeProject`;
20. restore does not call authoring `execute` or live `replaceRuntimeProject`;
21. typed Watches re-evaluate from restored sandbox state rather than storing checkpoint values themselves.

System gate remains full install/audit/lint/web-build/Electron-build/Jest+coverage/Vite-smoke/Electron-smoke.

## 12. FMEA-lite

| Failure mode | Impact | Mitigation |
|---|---|---|
| checkpoint mutates after capture | false time-travel state | deep clone on capture + immutability regression |
| restore aliases stored snapshot | later actions corrupt history | deep clone on every restore |
| checkpoint from wrong scenario restored | lineage corruption | scenario-id validation + atomic failure |
| restore changes baseline | Reset semantics become ambiguous | baseline preservation regression |
| Set-from-live keeps old checkpoints | old lineage presented as current | explicit checkpoint invalidation |
| replay inferred from prose summaries | divergent state | replay-only rejected |
| checkpoints enter authoring Undo/Redo | history corruption | local A51 state + no-dispatch tests |
| checkpoints persist in Narrative Project | project/schema pollution | no persistence path + lifecycle tests |
| unbounded snapshots consume memory | editor degradation | finite per-scenario limit; manual capture only |
| stale trace survives restore | misleading diagnosis | restore follows existing derived-trace invalidation path |

## 13. Non-goals

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

Random/reproduction metadata remains A51-S6.

## 14. Gate decision

**S5 storage/replay ADR: PASS.**

Implementation is permitted only under the snapshot-first contract above.

The key constraint is that a checkpoint is an isolated, bounded, immutable sandbox snapshot. It is not authoring Undo, live-runtime history or a disguised replay log.
