# A52 Change Record — S2 Pure Runtime Artifact Compiler

Change ID: A52-S2  
Stage / Requirement: A52 / REQ-002..REQ-005  
Risk: HIGH  
Exact verified code SHA: `8278cbb40bc64978e8a72c8716fe2957878f2133`

## Requirement

Compile the canonical authored Narrative Project into a deterministic, versioned runtime artifact without copying current playtest/editor state, maintaining a second Passage graph, or duplicating runtime semantics.

## Evidence and contract

Stable base `3d0f59219fca29d3338034777d8343b03c74cc45` passed post-merge workflow #454.

S1 contract heads:
- `3258eb731b6b7732032d37eb69add382d69743eb` — initial A52 boundary, #455 GREEN;
- `4caec2c3db192c64bbd174a3fa342cf4df9e4337` — explicit compiler-level invalid-initial-state blockers, #456 GREEN.

## Implementation

S2 adds only:
- `src/application/narrative/export-compiler.ts`;
- `src/application/narrative/__tests__/export-compiler.test.ts`.

Implemented:
- `narrative-runtime-artifact` v1;
- reuse of existing `NarrativeProjectAuthoredProjection`;
- fresh initial runtime with authored Initial Knowledge materialization;
- exclusion of current editor/live runtime;
- Story Brain blocker/advisory export projection;
- typed compiler blockers for missing first period / invalid initial runtime;
- canonical recursive object-key serialization while preserving arrays;
- defensive artifact copies.

Not implemented in S2:
- UI;
- Story/Passage generation;
- story-format publishing;
- download/launch;
- runnable shell;
- runtime evaluator changes.

## Failure / E0

Initial S2 code head `27fe7b50528a6235a066ab1119efcc6b9549f3f8` failed workflow #457 at web build.

Exact E0:

```text
src/application/narrative/export-compiler.ts(183,34):
TS2339: Property 'runtime' does not exist on type
{ status: "ready"; runtime: NarrativeProjectRuntimeProjection; } |
{ status: "blocked"; diagnostic: NarrativeCompilerExportDiagnostic; }.
```

Root cause: **CONFIRMED**. The blocked initializer branch appended a diagnostic but did not return, so TypeScript could not narrow the discriminated union before accessing `runtime`.

Minimal patch: one immediate `return {status: 'blocked', diagnostics}` in the blocked branch. No runtime/compiler contract changed.

## Verification

Workflow #458 on exact head `8278cbb40bc64978e8a72c8716fe2957878f2133`:

- install PASS;
- production audit PASS;
- lint PASS;
- web build PASS;
- Electron build PASS;
- Jest/coverage PASS;
- **334/334 suites**;
- **2044 passed**, 23 skipped, 42 todo, 2109 total;
- diagnostics upload PASS;
- Vite smoke PASS;
- Electron smoke PASS.

Regressions verify:
- fresh start ignores editor/live state;
- authored changes affect artifact;
- Initial Knowledge materializes;
- Actual Presence is not synthesized;
- current memory/occurrence/Story overrides are excluded;
- blockers are atomic and emit no artifact;
- advisory findings remain visible but compile;
- invalid initial state is a typed blocker;
- canonical JSON is deterministic and array order is preserved;
- artifact data is defensively copied.

## Boundary review

Must change:
- compiler data projection only.

Must not change:
- authored Narrative Project;
- authoring Undo/Redo;
- live runtime;
- Preview state;
- persistence;
- canonical Move/effect/simulation semantics;
- Twine publisher;
- authored outer Story passages.

Self-review: PASS.  
No review-driven semantic changes required.

## Recovery

Revert S2 compiler commits. No persisted schema or author data was migrated; export remains derived/read-only.

## Protocol gates

E0 Evidence: PASS  
E1 Scope: PASS  
E2 Contract: PASS  
E3 Verification design: PASS  
E4 Minimal patch: PASS  
E5 Verification ladder: PASS (#458)  
E6 Self-review: PASS  
E7 PR/CI: PASS for S2 slice  
E8 Merge: PENDING A52 completion  
E9 Post-merge: PENDING A52 completion  
E10 Learning/recovery: PASS

**A52-S2: DONE / VERIFIED.**
