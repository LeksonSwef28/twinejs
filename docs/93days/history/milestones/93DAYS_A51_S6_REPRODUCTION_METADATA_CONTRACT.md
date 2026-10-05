# A51-S6 Contract — Reproduction Metadata

Status: **IMPLEMENTATION VERIFIED / S6 DONE**  
Requirement: **REQ-014 reproduction metadata**  
Stage: **A51-S6**  
Decision date: **2026-09-17**

## 1. Decision summary

A51-S6 records **structured reproduction metadata for explicit Preview Laboratory inputs**. It does **not** introduce a random seed, RNG token, hidden dice service or replay engine because the current canonical runtime does not contain a hidden random source in Move resolution.

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

`PreviewLaboratoryAction[]` was descriptive provenance. It recorded ids / summaries but dropped some structured inputs after an action completed. Examples before S6:

- `setPreviewRuntimeInput()` stored only a human summary, not the full typed input;
- `executePreviewMove()` stored Move / Outcome ids but not explicit skill-check input;
- `advancePreviewScenario()` stored a summary but not structured requested/applied minutes.

That was sufficient for human provenance but insufficient for trustworthy reproduction metadata.

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

`PreviewLaboratoryAction` has one optional finite reproduction metadata field. The metadata is a discriminated union, not arbitrary JSON.

```text
PreviewLaboratoryReproductionMetadata
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

Lifecycle actions such as source capture / reset / fork remain without reproduction metadata because no concrete reproduction fact is required. S6 does not invent fields merely for schema symmetry.

## 5. Explicit skill-check rule

For a skill-check Move, reproduction metadata retains the exact caller-supplied:

- `skillValue`;
- `rollTotal`.

For automatic or condition resolution, metadata does not synthesize a fake skill input, roll, RNG token or seed.

The absence of a seed is a deliberate representation of the current runtime contract, not missing implementation.

## 6. Typed test-input rule

For `test-input` actions, metadata retains the exact finite `PreviewRuntimeInput` variant that passed validation:

- moment;
- Actual Presence;
- Knowledge;
- forget-claim.

The stored metadata is independent from any caller-owned object so later mutation cannot rewrite prior provenance.

## 7. Advance rule

Time-advance metadata distinguishes:

- requested minutes;
- actual applied minutes reported by canonical simulation.

This matters at template/end-of-time boundaries where canonical simulation may apply fewer minutes than requested.

S6 does not reproduce simulation by implementing its own time rules; it records the canonical input/result metadata only.

## 8. Checkpoint restore rule

Checkpoint restore metadata retains the stable checkpoint id used for the restore.

It does **not** copy the checkpoint snapshot into every provenance action. The exact sandbox state remains owned by the bounded S5 checkpoint collection.

If a checkpoint is later removed, historical provenance may still say which checkpoint id was restored, but that action is not thereby a self-contained replay command.

## 9. Trace-only / read-only inspection

`Trace only` remains read-only and does not append a laboratory action merely to preserve metadata.

The UI derives a read-only reproduction descriptor for the currently displayed trace from:

- active scenario id;
- current action count;
- selected Move id;
- current explicit resolver input;
- observed canonical resolution status / outcome id.

That descriptor is presentation/investigation state only. It does not mutate the sandbox or provenance.

## 10. UI placement

Reproduction metadata belongs in **Deep Debug**, alongside raw trace and provenance, because it is structured diagnostic material rather than the default author workflow.

Default Preview and Analysis do not expose raw reproduction JSON.

Verified Deep Debug behavior:

- provenance entries with structured metadata expose it clearly;
- a current read-only Move trace exposes the explicit reproduction input used for that trace;
- no seed/random-token field is shown when the runtime has no such source.

## 11. Determinism and stable serialization

Requirements retained by implementation:

- reproduction metadata is JSON-serializable;
- equivalent explicit inputs serialize equivalently;
- metadata capture cannot mutate scenario state;
- metadata does not retain mutable aliases to caller-owned input objects;
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

Implementation is restricted to structured recording/projection of explicit inputs that already exist in the canonical runtime and Preview Laboratory. No RNG/seed contract is permitted under current repository evidence.

## 15. Implementation verification

Implementation chain:

- contract: `b344618c168e8da590a3e3d7686f1ea3b7a4ed83`;
- application metadata: `1d93361e50461a9130a92c4e4fcbfc6a4c55fc42`;
- Deep Debug projection: `40ce2fa972839c9e602417f7f8ecd6e43be4d35d`;
- final test-only selector correction/code head: `2aa3e6f63b29ae2f80515ad8e4c09b780b101aeb`.

Exact code gate **#452** is GREEN:

- install / production audit / lint PASS;
- web and Electron builds PASS;
- **333/333 Jest suites PASS**;
- **2037 passed tests**, 23 skipped, 42 todo, 2102 total;
- diagnostics upload PASS;
- Vite smoke PASS;
- Electron smoke PASS.

Workflows #450 and #451 exposed only legacy Testing Library selectors that became ambiguous after a second legitimate Deep Debug representation was added. Corrections were test-only and scoped assertions to their intended semantic panels; runtime/product semantics were not weakened.

**S6 implementation verification: PASS.**
