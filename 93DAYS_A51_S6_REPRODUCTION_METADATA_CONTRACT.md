# A51-S6 Contract — Reproduction Metadata

Status: **CONTRACT PASS / IMPLEMENTATION NOT YET VERIFIED**  
Requirement: **REQ-014 reproduction metadata**  
Stage: **A51-S6**  
Decision date: **2026-09-17**

## 1. Decision summary

A51-S6 will record **structured reproduction metadata for explicit Preview Laboratory inputs**. It will **not** introduce a random seed, RNG token, hidden dice service or replay engine because the current canonical runtime does not contain a hidden random source in Move resolution.

The current model is deterministic from an exact sandbox state plus explicit inputs:

- automatic resolution needs no resolver input;
- condition resolution reads canonical runtime state only;
- skill checks require caller-supplied `skillValue` and `rollTotal`;
- forced Outcome inspection already names the exact authored `moveId` / `outcomeId`;
- test-only runtime overrides are already a finite typed `PreviewRuntimeInput` union;
- time advance already receives explicit minutes.

S6 therefore preserves those concrete inputs as typed metadata attached to Preview provenance. It does not fabricate an RNG contract that the runtime does not own.

## 2. Repository evidence

### Canonical Move bridge

`src/application/narrative/living-simulation.ts` explicitly documents the resolver as deterministic and says randomness is never hidden. For a skill check, missing `input.skillCheck` returns `input-required`; no roll is generated internally.

### Domain skill-check resolver

`src/domain/narrative/interaction.ts` defines:

```text
NarrativeSkillCheckResolutionInput
  skillValue
  rollTotal
```

`resolveNarrativeSkillCheck()` validates that explicit roll against the authored dice range, then computes:

```text
rollTotal + skillValue + authored modifiers
```

It does not call a random source.

### Repository search

Repository code search found no current uses of `Math.random`, `getRandomValues`, generic `random` source or seed contract in the indexed repository code. This is supporting evidence only; the decisive contract evidence is the exact canonical resolver path above.

### Existing provenance gap

`PreviewLaboratoryAction[]` is currently descriptive provenance. It records ids / summaries but drops some structured inputs after an action completes. Examples:

- `setPreviewRuntimeInput()` stores only a human summary, not the full typed input;
- `executePreviewMove()` stores Move / Outcome ids but not explicit skill-check input;
- `advancePreviewScenario()` stores a summary but not structured requested/applied minutes.

That is sufficient for human provenance but insufficient for trustworthy reproduction metadata.

## 3. S6 boundary

S6 metadata is **not**:

- an event-sourcing log;
- a replay cursor;
- a save game;
- a persisted project field;
- authoring Undo/Redo;
- live-runtime history;
- a substitute for S5 checkpoint snapshots;
- permission to infer a random seed from `rollTotal`.

A checkpoint answers **what exact sandbox state existed**. Reproduction metadata answers **what explicit operation/input was applied or inspected from that state**.

## 4. Typed metadata contract

`PreviewLaboratoryAction` may gain one optional finite reproduction metadata field. The metadata must be a discriminated union, not arbitrary JSON.

Conceptually:

```text
PreviewReproductionMetadata
  test-input
    input: PreviewRuntimeInput

  advance
    requestedMinutes
    appliedMinutes

  resolved-move
    moveId
    input: NarrativeProjectMoveResolutionInput
    outcomeId

  forced-outcome
    moveId
    outcomeId

  checkpoint-restore
    checkpointId
```

Lifecycle actions such as source capture / reset / fork may remain without reproduction metadata unless a concrete reproduction fact is required. S6 must not invent fields merely for schema symmetry.

## 5. Explicit skill-check rule

For a skill-check Move, reproduction metadata must retain the exact caller-supplied:

- `skillValue`;
- `rollTotal`.

For automatic or condition resolution, metadata must not synthesize a fake skill input, roll, RNG token or seed.

The absence of a seed is a deliberate representation of the current runtime contract, not missing implementation.

## 6. Typed test-input rule

For `test-input` actions, metadata must retain the exact finite `PreviewRuntimeInput` variant that passed validation:

- moment;
- Actual Presence;
- Knowledge;
- forget-claim.

The stored metadata must be independent from any caller-owned object so later mutation cannot rewrite prior provenance.

## 7. Advance rule

Time-advance metadata must distinguish:

- requested minutes;
- actual applied minutes reported by canonical simulation.

This matters at template/end-of-time boundaries where canonical simulation may apply fewer minutes than requested.

S6 does not reproduce simulation by implementing its own time rules; it records the canonical input/result metadata only.

## 8. Checkpoint restore rule

Checkpoint restore metadata may retain the stable checkpoint id used for the restore.

It must **not** copy the checkpoint snapshot into every provenance action. The exact sandbox state remains owned by the bounded S5 checkpoint collection.

If a checkpoint is later removed, historical provenance may still say which checkpoint id was restored, but that action is not thereby a self-contained replay command.

## 9. Trace-only / read-only inspection

`Trace only` must remain read-only and must not append a laboratory action merely to preserve metadata.

The UI may derive a read-only reproduction descriptor for the currently displayed trace from:

- active scenario id;
- current action count;
- selected Move id;
- current explicit resolver input;
- observed canonical resolution status / outcome id.

That descriptor is presentation/investigation state only. It does not mutate the sandbox or provenance.

## 10. UI placement

Reproduction metadata belongs in **Deep Debug**, alongside raw trace and provenance, because it is structured diagnostic material rather than the default author workflow.

Default Preview and Analysis should not gain raw reproduction JSON.

Minimum Deep Debug behavior:

- provenance entries with structured metadata expose it clearly;
- a current read-only Move trace can expose the explicit reproduction input used for that trace;
- no seed/random-token field is shown when the runtime has no such source.

## 11. Determinism and stable serialization

Requirements:

- reproduction metadata is JSON-serializable;
- equivalent explicit inputs serialize equivalently;
- metadata capture cannot mutate scenario state;
- metadata must not retain mutable aliases to caller-owned input objects;
- metadata is not persisted into Narrative Project serialization;
- adding metadata does not change canonical resolver/effect/simulation semantics.

## 12. Required regression tests

Application / contract tests:

1. `test-input` provenance stores the exact typed input;
2. caller mutation after the action cannot mutate stored metadata;
3. resolved skill-check provenance stores exact `skillValue` + `rollTotal`;
4. automatic / condition resolution stores no fabricated RNG/seed data;
5. forced Outcome provenance stores exact Move / Outcome ids;
6. advance provenance stores requested and canonical applied minutes;
7. checkpoint restore provenance stores checkpoint id without embedding the project snapshot;
8. metadata serialization is stable;
9. failed operations remain atomic and append no misleading reproduction metadata;
10. canonical resolver results are unchanged by metadata capture.

UI regressions:

11. default Preview does not expose raw reproduction metadata;
12. Analysis does not expose raw reproduction metadata;
13. Deep Debug exposes structured reproduction metadata for completed laboratory actions;
14. Trace-only exposes read-only explicit resolver input without appending an action;
15. skill-check trace shows the exact explicit values used;
16. automatic/condition trace shows no seed/random token;
17. reproduction UI does not call authoring `execute`;
18. reproduction UI does not call live `replaceRuntimeProject`.

Full system gate remains install → production audit → lint → web build → Electron build → Jest/coverage → diagnostics upload → Vite smoke → Electron smoke.

## 13. Non-goals

S6 does not implement:

- RNG generation;
- seeded RNG;
- deterministic pseudo-random stream ownership;
- replay of `PreviewLaboratoryAction[]`;
- replay from prose summaries;
- cross-session save/replay format;
- automatic checkpoint creation;
- persistence of Preview provenance into Narrative Project;
- reverse simulation;
- a second resolver/effect engine.

If a future canonical runtime introduces a real hidden/random source, that change must define its own seed/token ownership and then extend this metadata contract explicitly.

## 14. Gate decision

**A51-S6 reproduction metadata contract: PASS.**

Implementation is permitted only as structured recording/projection of explicit inputs that already exist in the canonical runtime and Preview Laboratory. No RNG/seed contract is permitted under current repository evidence.
