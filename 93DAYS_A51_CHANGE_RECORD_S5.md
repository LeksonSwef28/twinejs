# A51-S5 Change Record — Checkpoints / Time Travel

Status: **DONE / VERIFIED**  
Stage: **A51-S5**  
Closed: **2026-09-17**

## Scope

A51-S5 adds bounded, manual, snapshot-first checkpoints to the isolated Preview / Debug Laboratory. Checkpoints are investigation state only: they are not authoring Undo/Redo, not live-runtime history, not persisted project state and not a replay cursor.

The accepted storage contract is documented in `93DAYS_A51_S5_CHECKPOINT_TIME_TRAVEL_ADR.md`.

## Architecture decision

The existing `PreviewLaboratoryAction[]` remains provenance rather than a deterministic replay event log. Because it does not retain every structured test/resolver input required to reconstruct arbitrary sandbox state, S5 uses immutable deep snapshots of the current sandbox `NarrativeProject`.

Checkpoint restore:

- is allowed only within the same `scenario.id` lineage;
- deep-clones the stored snapshot into `scenario.project`;
- preserves the original `baselineProject`;
- preserves earlier laboratory actions and appends `checkpoint-restore` provenance;
- never dispatches authoring `execute`;
- never calls live `replaceRuntimeProject`;
- invalidates stale Move/Outcome traces through the existing `replaceActive()` UI path;
- leaves the stored checkpoint immutable.

`Reset` after restore still returns to the original scenario baseline/fork point.

## Implementation

Application layer:

- `src/application/narrative/preview-checkpoints.ts`
  - `PREVIEW_CHECKPOINT_LIMIT = 8`;
  - `PreviewCheckpoint`;
  - `capturePreviewCheckpoint`;
  - `restorePreviewCheckpoint`;
  - `removePreviewCheckpoint`.
- `PreviewLaboratoryActionKind` adds the finite `checkpoint-restore` variant.
- focused contract tests live in `src/application/narrative/__tests__/preview-checkpoints.test.ts`.

UI layer:

- `src/components/narrative/workspace/preview-checkpoint-controls.tsx` owns a local `Record<scenarioId, PreviewCheckpoint[]>` collection;
- controls appear only in **Analysis** as `Checkpoints · sandbox only`;
- Create / Restore / Remove are bounded by `PREVIEW_CHECKPOINT_LIMIT`;
- Set from live runtime clears the old source lineage checkpoints;
- Reset preserves checkpoints;
- Fork starts empty;
- scenario switching exposes only the active scenario collection;
- restore reuses `PreviewLaboratoryPanel.replaceActive()` so stale `trace` and `lastOutcomeTrace` are invalidated by the existing mechanism;
- Typed Watches remain definitions only and re-evaluate from the restored sandbox.

## CI / failure evidence

ADR head `84e2de4ce46285b21e8a234f035fca33815ef80c` passed workflow #440.

Application implementation initially reached workflow #442 with a test-fixture-only TypeScript error: the new fixture used invalid `NarrativeMoveKind` value `wait`. The product checkpoint service was not changed. Commit `0b50579498bb6b3c7937d8547312c0bb26f41956` changed only the fixture to `inform`, and workflow #443 passed the full branch gate.

The first UI wiring head `a109a70544a7ec748544bd87ea4e02481f4eeaa4` failed workflow #444 during **Build web application**. Exact E0 from the job log:

```text
src/components/narrative/workspace/preview-laboratory-panel.tsx(19,41): error TS2307: Cannot find module './preview-checkpoint-controls' or its corresponding type declarations.
src/components/narrative/workspace/preview-laboratory-panel.tsx(285,16): error TS7006: Parameter 'restored' implicitly has an 'any' type.
```

Root cause: the panel wiring commit referenced the checkpoint UI component before that component was present on the branch. The next focused commit added `preview-checkpoint-controls.tsx` plus the checkpoint UI regressions; no runtime semantics were changed to fix the build.

Final S5 code head:

`5fdecf08f4204c5d6e714575e02e4e4b609706fe`

Workflow **#445 — SUCCESS**. All required steps passed:

- install;
- production dependency audit;
- lint;
- web build;
- Electron main build;
- Jest/coverage;
- diagnostics artifact upload;
- Vite smoke;
- Electron smoke.

Downloaded diagnostics artifact: `93-days-test-diagnostics`, artifact id `10465243452`, digest `sha256:d2cbb70c94e3156d760269d4726bdf7350cebfcdbe0e8c9a533d690d1cbc53f6`.

Exact Jest result from `jest-ci.log`:

```text
Test Suites: 331 passed, 331 total
Tests:       23 skipped, 42 todo, 2030 passed, 2095 total
Snapshots:   0 total
Time:        103.879 s
Ran all test suites.
```

## Regression coverage

Application tests prove:

- capture is read-only and snapshot-independent;
- restore reproduces the stored state through a fresh clone;
- the scenario baseline is preserved;
- Reset after Restore returns to the original baseline;
- stored checkpoints cannot be mutated through later sandbox changes;
- cross-scenario restore fails atomically;
- authored Move definitions and serialization semantics remain stable;
- the finite per-scenario limit is enforced;
- removal is immutable;
- mixed-lineage checkpoint collections are rejected.

UI tests prove:

- default Preview does not show checkpoints and Analysis does;
- Create → sandbox mutation → Restore returns the visible Watch/runtime state to the captured snapshot;
- restore invalidates the old Move trace;
- restore appends visible `checkpoint-restore` provenance;
- Reset preserves checkpoint metadata;
- Fork does not inherit parent checkpoints;
- switching back restores the parent checkpoint list;
- Set from live runtime clears checkpoints for that source lineage;
- the `8 / 8` bound is visible and disables Create;
- Remove frees a slot;
- checkpoint UI operations do not call authoring `execute` or live `replaceRuntimeProject`;
- Typed Watches re-read restored sandbox state instead of restoring cached Watch values.

## Self-review

The UI diff from application head `0b50579498bb6b3c7937d8547312c0bb26f41956` to final code head contains only three files:

- `preview-checkpoints-panel.test.tsx` — +186;
- `preview-checkpoint-controls.tsx` — +115;
- `preview-laboratory-panel.tsx` — +6.

No store/reducer/persistence schema was added. No authoring history path was reused. No canonical runtime evaluator was duplicated. No coverage threshold or meaningful assertion was weakened.

PR #24 review-thread check at closure found **0 inline review threads**.

## S5 decision

**A51-S5 = DONE.**

PR #24 remains open and must not be merged yet. The next permitted slice is **A51-S6 — Reproduction metadata**, beginning with repository evidence for whether any real hidden/random runtime source exists. Do not introduce a random seed/token contract unless the runtime actually requires one.
