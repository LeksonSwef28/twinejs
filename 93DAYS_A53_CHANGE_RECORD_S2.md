# A53-S2 Change Record — Player Save/Load Codec

Change ID: **A53-S2**  
Stage / Requirement: **A53 — Player Runtime Boundary & Session Bootstrap / runtime-only save-load ownership**  
Risk: **HIGH**  
Stable base: `93-days-editor` @ `1c8dc69ef25447842533d3ea2852c784f33b3db1`  
S1 verified head: `88de25859f21fc1287e3554c44709f3e38452f94` / workflow **#474 GREEN**  
S2 final code/test head: `d59e72bd909f12ab1b430c20ad619caed7cfa80f` / workflow **#478 GREEN**

## Problem / requirement

A52 can compile a fresh runtime artifact and A53-S1 can materialize it into a player-owned session, but the player still needs a save/load boundary that does not serialize authored definitions, editor state or a second project.

Expected:

- versioned player save envelope;
- artifact/project/build identity check before restore;
- mutable `NarrativeProjectRuntimeProjection` only;
- reuse existing runtime snapshot validation/clone semantics;
- restore over the current artifact materialization;
- malformed/incompatible saves rejected atomically;
- restored session can continue through canonical runtime APIs.

Actual before S2:

- editor-side runtime snapshot primitives existed;
- no player-specific save identity/envelope existed;
- no player-session round-trip regression existed.

Root cause: **CONFIRMED — missing player save ownership/codec boundary, not missing runtime mechanics.**

## Affected boundaries

Must change:

- application-level player save codec;
- application regressions for runtime-only save/restore.

Must not change:

- Narrative Project authored schema;
- A52 artifact v1 shape;
- canonical Move/effect/simulation/physical semantics;
- editor Undo/Redo or editor persistence;
- generic publisher or A52 compiler proof;
- storage-provider/UI ownership.

Relevant invariants: **A53-I01, I02, I04, I06, I07, I08, I12, I13, I14**.

## Implementation

Added `src/application/narrative/player-save.ts`.

The codec defines `narrative-player-save` v1:

- save format/version;
- artifact format/version;
- source schema version;
- project id / host story id;
- authored `updatedAt` as the current build marker;
- existing cloned `NarrativeProjectRuntimeProjection`.

`createNarrativePlayerSave()` delegates runtime projection cloning to the existing `createNarrativeRuntimeSnapshot()` path. `restoreNarrativePlayerSave()` validates the player envelope/identity, delegates runtime validation/overlay to `restoreNarrativeRuntimeSnapshot()`, then passes the restored project through the A53 session replacement boundary.

No storage medium is selected by S2.

## Regression / verification

Added `src/application/narrative/__tests__/player-save.test.ts`.

Coverage proves:

1. save envelope contains runtime + identity only;
2. editor/authored project collections are absent from serialized save;
3. Actual Presence, body state and item runtime placement survive round trip;
4. restore overlays runtime onto a fresh materialization of the same artifact;
5. artifact bytes/object remain unchanged;
6. authored ItemInstances and compatibility editor state remain artifact-owned;
7. simulation can continue after restore;
8. different project/build identity rejects without changing the session;
9. malformed runtime rejects atomically;
10. unsupported save format/version and invalid JSON reject atomically.

## CI evidence and learning

Workflow **#476** failed at web TypeScript build because the test read `reason` from a discriminated union after a Jest assertion that TypeScript cannot use for narrowing. Fix: explicit rejected-branch narrowing. Production code unchanged.

Workflow **#477** passed lint and both builds, then one regression expected `invalid-runtime` but received `artifact-mismatch`. Evidence showed the test generated a second project, producing new project identity/timestamps. The codec correctly rejected the mismatched artifact before inspecting runtime. Fix: materialize a fresh session from the exact same artifact, so each rejection test isolates one cause. Production code unchanged.

Workflow **#478 GREEN** on exact S2 head:

- **340/340 suites**;
- **2081 passed**;
- 23 skipped;
- 42 todo;
- 2146 total;
- 0 snapshots;
- production dependency audit PASS;
- lint PASS;
- web build PASS;
- Electron build PASS;
- diagnostics upload PASS;
- Vite smoke PASS;
- Electron smoke PASS.

## Self-review

- No Guard/Move/Outcome/effect/simulation logic copied.
- No new runtime projection schema invented; existing snapshot projection is reused.
- Save payload cannot rewrite authored definitions.
- Editor state is excluded from save data.
- Rejection returns the original session object.
- Artifact/build identity is checked before runtime overlay.
- No clock/random id is added to save creation.
- No storage/UI dependency is introduced.

## Rollback / roll-forward

Rollback is code-only: revert `player-save.ts`, its tests and this record. No authored data or persisted production migration exists yet.

The save envelope is explicitly versioned. Future incompatible save changes must reject or migrate explicitly; bytes must never be silently reinterpreted.

## Gate state

- E0 Evidence: **PASS**
- E1 Scope: **PASS**
- E2 Contract: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal patch: **PASS**
- E5 Verification ladder: **PASS — #478**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS for S2 / PR #26 remains draft**
- E8 Merge: **PENDING (A53 stage not complete)**
- E9 Post-merge: **PENDING**
- E10 Learning/recovery: **PASS**

**Decision: A53-S2 player save/load codec is IMPLEMENTATION VERIFIED. A53-S3 may proceed.**
