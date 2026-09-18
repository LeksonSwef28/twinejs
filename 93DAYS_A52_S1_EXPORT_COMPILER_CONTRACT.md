# A52-S1 Contract — Export Compiler Artifact & Validation

Status: **CONTRACT PASS / IMPLEMENTATION NOT YET VERIFIED**  
Stage: **A52-S1**  
Risk: **HIGH**  
Stable source: `93-days-editor` @ `3d0f59219fca29d3338034777d8343b03c74cc45`  
Decision date: **2026-09-18**

## 1. Contract summary

A52 compiles the canonical Narrative Project into a **derived, versioned runtime artifact**. The artifact is deterministic data. It is not a save game, not the current playtest state, not a persisted Passage graph, and not a replacement narrative runtime.

The existing Twine publisher remains the story-format/HTML binding layer. A later A52 adapter may generate transient Story/Passage data from the artifact for publishing, but generated Passages never become the authored source of truth.

## 2. Artifact v1

Conceptual TypeScript contract:

```text
NarrativeRuntimeArtifactV1
  format: "narrative-runtime-artifact"
  version: 1
  sourceSchemaVersion: number
  authored: NarrativeProjectAuthoredProjection
  initialRuntime: NarrativeProjectRuntimeProjection
```

Rules:

- `format` and `version` are artifact compatibility identifiers;
- `sourceSchemaVersion` records the Narrative Project schema that was compiled;
- `authored` is obtained from the existing reviewed persistence projection rather than rebuilt manually;
- `initialRuntime` is freshly derived for game start;
- editor state is absent;
- Preview/A51 local state is absent;
- current live runtime state is absent;
- no `compiledAt`, random build id or other nondeterministic metadata exists in v1.

## 3. Fresh initial runtime v1

The compiler must not copy `projectNarrativePersistence(project).runtime`.

Instead it derives:

```text
memories: []
relationships: []
pendingReactions: []
mindStates: []
injuriesByCharacter: {}
itemPlacementOverrides: {}
storyNodeStateOverrides: {}
runtimeOccurrences: []
activeStoryExecutions: []

simulation
  day: 1
  minuteOfDay: first template period startMinute
  activeBehaviorProfileByCharacter: {}
  actualLocationByCharacter: {}
  characterKnowledge: initializeCharacterKnowledge(authored.initialKnowledge)
  bodyByCharacter: {}
```

Rationale:

- authored item placement remains in `itemInstances`;
- authored Story activation remains in `storyNodes`;
- runtime overlays begin empty;
- authored Knowledge seeds are explicitly designed for simulation start;
- Scheduled Presence remains distinct from Actual Presence;
- body state already has canonical lazy initialization in simulation;
- no authored baseline currently exists for runtime memories, relationships, pending reactions, injuries, occurrences or active Story executions.

If the domain later gains authored baseline definitions for any of these runtime families, artifact initialization must be extended explicitly rather than copying the live editor runtime.

## 4. Determinism

For the same exact Narrative Project authored input and artifact compiler version:

- artifact object content is equal;
- serialized artifact bytes are equal;
- compilation does not depend on current time, random values, editor selection, View Cursor, Simulation Playhead mutations, Preview state, installed UI state or object insertion order.

Canonical JSON serialization recursively sorts object keys. Array order is preserved.

The compiler does not reorder Story nodes, Moves, Outcomes, effects, schedules or any other authored arrays merely to achieve stable output.

## 5. Validation result

Compilation returns an explicit result rather than partially emitting an artifact after a blocking failure.

Conceptually:

```text
NarrativeExportDiagnostic
  | story-brain
      disposition: blocker | advisory
      finding: StoryBrainFinding
  | compiler
      disposition: blocker
      code: missing-template-period | invalid-initial-runtime
      summary: string

NarrativeCompileResult
  status: compiled | blocked
  diagnostics: NarrativeExportDiagnostic[]
  artifact?: NarrativeRuntimeArtifactV1
```

A blocked result contains no successful artifact. Expected invalid compiler input is represented as diagnostics, not as a partially built artifact or an uncaught initialization error.

## 6. V1 blocker policy

The following current Story Brain finding kinds are blockers:

- `broken-authored-reference`;
- `partial-story-placement`;
- `invalid-story-placement`;
- `runtime-policy-without-exact-placement`.

They either point to unresolved authored identity or violate an explicit exact-time runtime requirement.

Other existing Story Brain findings remain advisory in v1. Their author-facing `warning` severity is not silently reinterpreted as an export blocker.

This is deliberate:

- an early/terminal/isolated branch may be unfinished but still executable;
- a Move participant omitted from Story participant metadata does not currently prevent the canonical Move runtime from resolving;
- an impossible guard set yields an unavailable Move rather than corrupt artifact structure;
- empty/asymmetric consequences are authoring-quality issues;
- routine overlap and schedule consistency findings do not currently write Actual Presence or constitute a separate executable schedule engine.

Artifact prerequisites not owned by Story Brain are compiler blockers in v1:

- `missing-template-period` when no first period exists to define the authored start moment;
- `invalid-initial-runtime` when authored initial-state materialization (currently Initial Knowledge) cannot produce a valid fresh runtime.

These diagnostics are project-level and do not invent a fake Story Brain source entity.

A future blocker policy change requires repository evidence, a contract update and regression coverage.

## 7. Source-linked diagnostics

Every Story Brain-derived export diagnostic retains the original finding. UI/navigation may call the existing `storyBrainNavigationForFinding(project, finding)`. Compiler-level project blockers have no fabricated entity navigation.

The compiler itself does not mutate editor focus. Navigation remains a user-invoked presentation action.

## 8. Purity / atomicity

Compile and validate are read-only.

They must not:

- call authoring `execute`;
- call `replaceRuntimeProject`;
- save Narrative Project;
- save generated Twine Story/Passage data;
- mutate input arrays/objects;
- append runtime occurrences;
- advance simulation;
- resolve/apply Moves or Outcomes;
- create Preview actions/checkpoints;
- change outer Story passages.

If validation blocks, the caller receives diagnostics and all source state remains unchanged.

## 9. Existing publisher boundary

A52 will not fork `src/util/publish.ts`.

When a later adapter binds output to an installed story format:

1. compile/validate Narrative Project;
2. build transient generated export data;
3. call the existing publisher;
4. return/download/launch the derived result;
5. discard generated Passage projection.

The generated projection is compiler output only.

## 10. Runnable-proof constraint

A52 must include a minimal runnable proof, but that proof is only evidence that the compiler artifact can drive a runtime/export shell.

It must not:

- become a new hand-authored Passage workflow;
- duplicate the canonical resolver/effect/simulation engine;
- expand A52 into player-game UI development;
- claim full game presentation completeness.

Exact mechanics of the runnable shell are deferred until the pure artifact compiler is verified. This prevents the S1 contract from inventing a second runtime before repository integration evidence exists.

## 11. S2 required tests

S2 must prove at minimum:

- authored projection reuse;
- fresh initial runtime materialization;
- initial Knowledge materialization;
- exclusion of live runtime and editor state;
- no synthesized Actual Presence;
- deterministic canonical serialization;
- input immutability;
- explicit blocker/advisory behavior;
- blocked compilation emits no artifact;
- invalid initial Knowledge or missing template period becomes a typed compiler blocker instead of an uncaught partial compile;
- Story Brain source finding identity is retained;
- no runtime/authoring/persistence side effects.

## 12. Decision

**A52-S1 export/compiler artifact + validation contract: PASS.**

S2 may implement only the pure artifact compiler, initializer, validation projection and canonical serializer described here. Publishing/UI/runnable-shell work remains outside S2.
