# A53 Contract — Player Runtime Boundary & Session Bootstrap

Status: **IMPLEMENTATION VERIFIED / MERGE REVIEW READY**  
Stage: **A53 — Player Runtime Boundary & Session Bootstrap**  
Risk: **HIGH**  
Stable source: `93-days-editor` @ `1c8dc69ef25447842533d3ea2852c784f33b3db1`  
Feature branch: `feature/a53-player-runtime-boundary`  
Decision date: **2026-09-19**

## 1. E0 — exact problem / repository evidence

A52 proved export compatibility, not gameplay execution.

At the reviewed stable SHA:

- `compileNarrativeRuntimeArtifact()` emits versioned authored data + a fresh initial runtime;
- `runtime-proof.ts` explicitly parses the artifact as inert JSON and explicitly forbids Guard/Move/Outcome/effect/simulation execution;
- `story-play`, `story-test` and `story-proof` use generic Twine publishing routes and do not create a Narrative player session;
- canonical gameplay orchestration already exists in `src/application/narrative/` for simulation, Move resolution/effects, Story work, Actual Presence, physical state/items and NPC decisions;
- editor `NarrativeProjectProvider` owns authoring history and debounced editor persistence;
- runtime snapshot code already demonstrates a runtime-only projection and restore path, but there is no player-owned bootstrap/save boundary starting from a compiled artifact.

**Root cause classification:** missing player runtime materialization/session ownership boundary. This is not evidence of a missing resolver, effect engine, body engine, Story engine or simulation kernel.

## 2. Goal

A53 makes `narrative-runtime-artifact` v1 executable by the **existing canonical TypeScript runtime** through a player-owned session boundary.

Conceptual flow:

`NarrativeRuntimeArtifactV1 -> compatibility validation -> materialized canonical runtime project -> NarrativePlayerSession -> canonical runtime APIs`

A53 does not build final UI or standalone packaging. Those are subsequent stages once the session boundary is proven.

## 3. Ownership decision

### Immutable source

The compiled artifact is immutable session input. `authored` remains the source definition for that build; `initialRuntime` is the fresh game-start runtime projection.

### Mutable player state

The player session owns exactly one current mutable runtime aggregate. Runtime mutations are produced only by canonical application/domain functions.

### Editor compatibility field

Current canonical runtime APIs accept `NarrativeProject`, whose type still includes `editor` metadata even though reviewed gameplay operations do not own editor semantics.

A53 may materialize an **internal deterministic inert editor compatibility state** solely to satisfy the existing aggregate type. It must:

- be derived deterministically from artifact/template data;
- never be exposed as player gameplay state;
- never be written to player saves;
- never affect action eligibility, time, presence, cognition, Story state, physical state or outcomes;
- never become a second View Cursor/player cursor concept.

If a regression shows player runtime behavior depends on this editor field, implementation must stop and extract a cleaner runtime aggregate boundary before proceeding.

This avoids a large speculative type refactor while keeping editor ownership out of the player contract.

## 4. Public A53 conceptual contract

Names may be refined during implementation, but ownership and behavior may not.

```text
materializeNarrativePlayerSession(artifact)
  -> rejected { code, summary }
  -> ready { session }

NarrativePlayerSession
  artifactFormat
  artifactVersion
  sourceSchemaVersion
  projectId
  hostStoryId
  currentProject   // internal canonical aggregate used by shared runtime APIs
```

Session commands in A53 should be thin delegates or direct calls to existing canonical APIs. A53 must not create alternative semantics for:

- time advancement;
- Actual Presence;
- Guard/Condition evaluation;
- Move/Outcome resolution;
- effect application;
- Story-work execution/interruption;
- body/injury state;
- item placement/carrying;
- NPC decisions.

A53 may expose a small command facade only where ownership/atomic update of `currentProject` needs one clear mutation boundary.

## 5. Artifact compatibility / materialization

A53 materialization must reject atomically when the input cannot become a valid session.

Minimum supported input:

- `format === "narrative-runtime-artifact"`;
- `version === 1`;
- supported Narrative Project source schema for the current build;
- authored projection has required project identity/template data;
- initial runtime projection is structurally acceptable to current runtime code.

Materialization must:

1. validate compatibility before returning a session;
2. deep-clone or otherwise isolate mutable runtime/session state from the artifact object;
3. preserve authored array order and authored identities;
4. use exactly the artifact `initialRuntime`; it must not read current editor/live/Preview runtime;
5. preserve no hidden reference by which runtime mutations can mutate the compiled artifact;
6. create no random id, clock timestamp or new authored entity.

Failure returns no partially usable session.

## 6. Save/load contract

A player save is **not** another Narrative Project and is **not** another artifact.

A53 save payload contains:

- explicit save format/version;
- artifact/project identity needed to reject incompatible saves;
- mutable `NarrativeProjectRuntimeProjection` only.

It must exclude:

- authored definitions;
- editor state;
- Preview scenarios/checkpoints/Watches/reproduction metadata;
- generated Passage/HTML data.

The implementation should reuse/extract the already tested runtime snapshot projection/validation semantics rather than invent a second runtime serialization model.

Load rules:

- materialize the current artifact/build first;
- validate save format/version and identity;
- overlay only the saved runtime projection onto the artifact's authored definitions;
- reject incompatible or malformed saves atomically;
- never let save data rewrite authored definitions.

Storage medium is not canonical. LocalStorage/IndexedDB/file/cloud may be host adapters later; A53 first proves the pure codec/session boundary.

## 7. A53 invariants

- **A53-I01 — One canonical mechanics runtime:** player execution delegates to existing TypeScript narrative runtime functions.
- **A53-I02 — Artifact immutability:** session execution never mutates the compiled artifact input.
- **A53-I03 — One mutable session aggregate:** one current player runtime state owns gameplay mutation at a time.
- **A53-I04 — No editor ownership:** player session has no semantic dependency on editor View Cursor, workspace, canvas or Undo/Redo.
- **A53-I05 — Fresh start fidelity:** new game starts from artifact `initialRuntime`, not live editor/Preview state.
- **A53-I06 — Runtime-only saves:** saves contain mutable runtime projection, not authored definitions.
- **A53-I07 — Save identity safety:** a save cannot silently load into a different artifact/project identity.
- **A53-I08 — Atomic rejection:** incompatible artifact/save input changes no session state.
- **A53-I09 — Scheduled != Actual Presence:** bootstrap does not synthesize Actual Presence from schedule intent.
- **A53-I10 — Deterministic bootstrap:** same compatible artifact produces equal initial player session state.
- **A53-I11 — No hidden RNG ownership:** bootstrap/session layer introduces no random resolution source.
- **A53-I12 — Runtime provenance retained:** canonical occurrences/traces remain the evidence for player-visible consequences.
- **A53-I13 — A52 proof remains proof:** `runtime-proof.ts` is not expanded into the engine.
- **A53-I14 — No Passage source fork:** player session does not author or persist generated Passage graphs.

## 8. What A53 explicitly does not solve

A53 does not implement:

- final scene/dialogue/HUD UI;
- bus-station production content;
- money/economy semantics;
- phone/SMS UI;
- transport pricing/routing;
- autonomous scheduler that invents NPC decisions;
- final standalone HTML packaging;
- new body/inventory mechanics that already exist canonically.

Those concerns may consume A53 later, but they cannot be hidden inside bootstrap code.

## 9. Verification design

Before A53 implementation can be called verified, tests must prove at minimum:

1. exact compiled v1 artifact can bootstrap a session;
2. wrong format/version/source compatibility rejects atomically;
3. artifact object is unchanged after bootstrap and gameplay mutation;
4. authored definitions in the session are unchanged by runtime actions unless an existing canonical contract explicitly uses runtime overlays;
5. fresh runtime equals artifact `initialRuntime`;
6. no Actual Presence is fabricated during bootstrap;
7. canonical `advanceNarrativeProjectSimulation()` advances the bootstrapped session and body state through the shared code path;
8. canonical Move resolution/effect application works from the bootstrapped session and appends canonical provenance;
9. canonical item/runtime placement or another physical runtime operation works without a second inventory model;
10. runtime save round-trip restores mutable runtime state;
11. save does not contain editor/authored/Preview data;
12. malformed or identity-mismatched save leaves current session unchanged;
13. load followed by another canonical action continues correctly;
14. the compatibility editor stub is deterministic and has no observed gameplay effect;
15. focused tests, lint, web build, Electron build, full coverage CI and smoke checks are green on the exact reviewed head.

## 10. Minimal implementation slices

### A53-S1 — Artifact materializer + session owner

Implement compatibility validation, deterministic materialization and one player-session mutation boundary. Prove canonical simulation/Move/physical calls can operate on the bootstrapped project. No UI.

**Status: IMPLEMENTATION VERIFIED.** `src/application/narrative/player-runtime.ts` materializes a defensive player session from artifact v1 and only owns compatibility/session replacement. Canonical simulation, Move/effect and physical item APIs are exercised directly by regression tests; the artifact remains unchanged and Actual Presence is not fabricated at bootstrap.

Exact S1 head `88de25859f21fc1287e3554c44709f3e38452f94` passed workflow **#474 GREEN**: **339/339 suites**, **2076 passed tests** (23 skipped, 42 todo; 2141 total), 0 snapshots, diagnostics upload PASS, Vite smoke PASS and Electron smoke PASS.

### A53-S2 — Player save codec

Reuse or extract runtime snapshot projection semantics into a player-usable pure codec; prove identity-safe runtime-only round trip. No storage-provider UI.

**Status: IMPLEMENTATION VERIFIED.** `src/application/narrative/player-save.ts` wraps the already reviewed runtime snapshot projection/validation semantics in a player-specific versioned envelope. Saves contain only runtime projection plus artifact/project/build identity; authored definitions, editor state, Preview state and generated export data are absent. Restore materializes the current artifact first, rejects identity/build mismatches, overlays runtime only, and returns the original session on rejection.

The S2 verification fixture proves runtime-only serialization, same-artifact restore, continued canonical simulation after restore, artifact immutability, authored/editor preservation, identity/build mismatch rejection, malformed-runtime atomicity, unsupported envelope rejection and invalid-JSON rejection.

Workflow **#476** exposed only a TypeScript test-union narrowing error; workflow **#477** then exposed a fixture bug where a malformed-runtime test accidentally compiled a different project and correctly triggered `artifact-mismatch`. Both fixes were test-only and did not change production save semantics. Final exact S2 head `d59e72bd909f12ab1b430c20ad619caed7cfa80f` passed workflow **#478 GREEN**: **340/340 suites**, **2081 passed tests** (23 skipped, 42 todo; 2146 total), 0 snapshots, diagnostics upload PASS, Vite smoke PASS and Electron smoke PASS.

### A53-S3 — Session integration closure

Prove new game -> canonical mutations -> save -> restore -> continue as one contract integration. Record exact-head verification and only then hand off to A54 player host/packaging.

**Status: IMPLEMENTATION VERIFIED.** `src/application/narrative/__tests__/player-runtime-integration.test.ts` proves the full lifecycle against the real compiler, S1 materializer/session owner, canonical simulation/Actual Presence/Move/effect/item APIs, S2 save codec and a fresh materialization of the same artifact.

The integration starts from empty Actual Presence/relationships/occurrences/item overlays, applies canonical presence + 30 minutes of simulation + a guarded Move/relationship effect + container placement, serializes a player save, materializes the same artifact fresh, restores runtime state, then continues another 45 minutes and applies the same canonical Move again. The restored session preserves the item overlay and previous provenance; relationship trust advances from 1 to 2 and runtime occurrences from 1 to 2. Authored item definitions/instances and the compiled artifact remain unchanged.

No production code was needed for S3. Exact S3 head `3b9e98c6f0d16728154fd4bd3b71ded489aea864` passed workflow **#480 GREEN**: **341/341 suites**, **2082 passed tests** (23 skipped, 42 todo; 2147 total), 0 snapshots, production audit PASS, lint PASS, web build PASS, Electron build PASS, diagnostics upload PASS, Vite smoke PASS and Electron smoke PASS.

## 11. Blast radius

Expected touch areas:

- `src/application/narrative/` for player bootstrap/session orchestration;
- possibly a shared runtime-save codec extracted from `src/store/narrative-project/runtime-snapshot.ts` with compatibility wrappers retained;
- tests under application/store boundaries;
- post-A52 roadmap/contract/change records.

Must not change without a new explicit decision:

- authored Narrative Project schema;
- A52 artifact v1 shape;
- canonical Move/effect/simulation semantics;
- authoring Undo/Redo;
- generic Twine publisher;
- A52 compiler proof behavior.

## 12. Recovery / roll-forward

A53 has no authored data migration in the planned slices.

Rollback is code-only: remove/revert player bootstrap/session/save additions and retain the A52 artifact/compiler as the stable boundary. If a save format is introduced before merge, it must be versioned so a roll-forward fix can reject or migrate it explicitly rather than reinterpret bytes silently.

## 13. Stop conditions

Stop and return to architecture review if implementation requires any of the following:

- copying Guard/Move/Outcome/effect/simulation logic into player-specific code;
- making `runtime-proof.ts` execute gameplay;
- persisting editor state in player saves;
- allowing saves to replace authored definitions;
- player behavior depends on the compatibility editor stub;
- runtime materialization needs nondeterministic ids/timestamps;
- standalone packaging pressure appears before the session boundary is proven and starts duplicating runtime semantics.

## 14. Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS — S1/S2 implementation + S3 integration proof**
- E5 Exact-head verification: **PASS — S1 #474, S2 #478/#479, S3 #480**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS for implementation — draft PR #26 open and mergeable**
- E8 Merge: **PENDING — explicit merge authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**

**Decision:** A53 implementation is VERIFIED and ready for merge review. Do not merge until explicitly authorized. After merge, verify the exact stable SHA before starting A54.
