# 93 Days — A59 Change Record

Change ID: **A59**  
Stage / Requirement: **Vertical Slice Closure & Content Production Loop**  
Risk: **MEDIUM**  
Stable source SHA: `22ff1e408f48455e7125b3dec65ad5393700992a`  
Feature branch: `feature/a59-vertical-slice-production-loop`  
PR: **#32**  
Implementation evidence head: `4ce6d143ab1bb20740503051893f1a8ff3f691da`

## Problem / requirement

A53-A58 established the canonical runtime, standalone Player, Day One -> Day Two narrative and everyday systems, but the production milestone still needed one closed content-production loop:

- one full vertical-slice Definition-of-Done regression;
- real Story Brain/Preview evidence against 93 Days content;
- source-navigation evidence;
- production authoring/validation workflow;
- first playtest/engineering-playthrough triage;
- a genuinely player-facing save/reload/continue flow.

## Expected

Authors should be able to add canonical content, explain player-visible outcomes, inspect branch alternatives, compile/play the same project, classify observations at the correct owner, and reserve runtime changes for confirmed mechanics gaps.

The standalone Player should expose save/reload/continue without creating a second save format or runtime engine.

## Actual before A59

Repository evidence showed:

- the canonical Player save codec already existed;
- Story Brain already exposed Focus / Impact / WHY / Coverage / Bridges;
- Preview Laboratory already supported isolated scenarios/forks/comparison;
- A58 already provided a real arrival -> Day Two runtime path;
- standalone Player did **not** expose Save/Continue controls or browser storage.

## Root cause

**CONFIRMED.**

The slice-closure gap was mostly missing proof/workflow. The only reproduced player-facing blocker was presentation/host wiring: existing canonical save semantics had no Player UI/browser-storage adapter.

No canonical Move/effect/simulation/body/carrying/economy/save semantic gap was reproduced.

## Affected boundaries

### Changed

- integration/contract tests;
- Story Brain/Preview evidence tests;
- standalone Player presentation;
- browser save-storage adapter;
- browser/component regression;
- A59 production/triage documentation.

### Intentionally unchanged

- Narrative Project authored ownership;
- Move/effect semantics;
- simulation kernel;
- body/carrying/economy mechanics;
- Player save codec and save version;
- runtime artifact format/version;
- project schema version;
- Story Brain dependency graph semantics;
- Preview sandbox semantics.

## Relevant invariants

A59-I01 through A59-I12 from `93DAYS_A59_VERTICAL_SLICE_PRODUCTION_LOOP_CONTRACT.md`.

Key invariants verified:

- one authored source of truth;
- Story Brain read-only;
- Preview source immutability;
- no second gameplay engine;
- no second save format;
- source navigation goes to canonical editor entities/workspaces;
- runtime-mechanics changes require separate evidence/re-scope.

## Implementation

### A59-S1 — Definition-of-Done regression

Added:

`src/application/narrative/__tests__/a59-vertical-slice-definition-of-done.integration.test.ts`

The test proves in one canonical A58 project/session:

- fresh compile/bootstrap;
- arrival Actual Presence;
- world time;
- present clerk;
- choice-driven conversation;
- Knowledge and relationship consequence;
- optional Story occurrence;
- movement/economy/purchase;
- real container packing;
- food/digestion/body gate;
- paid transport;
- NPC-only occurrence while protagonist is elsewhere;
- fatigue;
- lodging/sleep;
- Day Two reflected actions;
- save/restore;
- continued canonical action after restore;
- authored Story definitions unchanged.

Exact evidence:

- head `3f3350ff67908107f5ecb937bd6c174979b1d3e7`
- **Branch Check #568 GREEN**
- 368/368 Jest suites;
- 2176 passed, 23 skipped, 42 todo;
- Chromium 6/6;
- audit 0 vulnerabilities;
- Vite/Electron PASS.

### A59-S2 — Real Story Brain + Preview evidence

Added:

`src/application/narrative/__tests__/a59-story-brain-preview-production-evidence.test.ts`

Proof:

- Day Two known-route Move WHY is blocked before the transfer-route Claim is learned;
- the same WHY becomes available after canonical Day One actions teach the Claim;
- Claim Impact reaches the dependent Day Two Move;
- polite vs abrupt clerk choices are compared through real Preview forks;
- relationship/memory/runtime occurrence differences are visible;
- source Narrative Project remains unchanged;
- a deliberately malformed clone produces a diagnostic that navigates to the owning Day Two Story source.

One intermediate Branch Check (#569) failed only because the new test referenced an undefined local `sourceBefore` variable. No production code had failed. The test fixture was corrected.

Exact final evidence:

- head `ed401708b69980429db2d5cac69090835a88d7b9`
- **Branch Check #570 GREEN**
- 369/369 Jest suites;
- 2179 passed, 23 skipped, 42 todo;
- Chromium 6/6;
- audit 0 vulnerabilities;
- Vite/Electron PASS.

### A59-S3 — Player save/continue presentation gap

Confirmed observation:

The application-layer Player save codec existed, but `PlayerApp` had no user-facing Save/Continue controls.

Added:

- `src/player/player-save-storage.ts`
- `src/player/__tests__/player-save-storage.test.ts`
- explicit **Сохранить** / **Продолжить** controls in `PlayerApp`;
- component regression;
- real browser `save -> reload -> continue` regression.

Adapter rules:

- storage key scopes by project + host story;
- payload is produced only by the existing `serializeNarrativePlayerSave`;
- restore delegates only to existing `restoreNarrativePlayerSaveJson`;
- authored-build mismatch remains rejected by existing save identity semantics;
- no automatic restore;
- no save/artifact/schema version change.

Exact evidence:

- head `4ce6d143ab1bb20740503051893f1a8ff3f691da`
- **Branch Check #576 GREEN**
- 370/370 Jest suites;
- 2183 passed, 23 skipped, 42 todo;
- Chromium **7/7**;
- audit 0 vulnerabilities;
- Vite/Electron PASS.

### A59-S3 — production workflow

Added:

- `93DAYS_A59_CONTENT_PRODUCTION_KIT.md`
- `93DAYS_A59_PLAYTEST_OBSERVATIONS.md`

The kit defines:

- canonical authoring checklist;
- per-edit/per-batch/pre-merge validation budget;
- Story Brain workflow;
- Preview workflow;
- Player verification;
- source navigation;
- observation classification.

The playthrough log classifies the confirmed Save/Continue gap as `presentation`, not `runtime-mechanics`, and records positive evidence for Story Brain/Preview/canonical runtime reuse.

## Self-review

Stable-to-current review confirms the branch is **13 commits ahead / 0 behind** stable at the first S3 documentation head.

Observed changed boundaries are limited to:

- A59 contracts/docs;
- A59 tests;
- Player save-storage adapter/presentation;
- Player component/browser tests.

No duplicate resolver, simulation, body, carrying, economy, save codec, Story Brain graph or Preview engine was added.

## Rollback / roll-forward

Rollback is straightforward:

- revert A59 tests/docs;
- remove Player Save/Continue presentation + storage adapter;
- A58 stable gameplay remains intact;
- canonical Player save codec remains unchanged;
- no data migration is required.

Roll-forward for any future mechanics gap requires a new reproduced requirement and risk reclassification.

## Gate state

- E0 Evidence: **PASS**
- E1 Scope: **PASS**
- E2 Contract: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS**
- E5 Verification ladder: **PASS for implementation; closure docs exact-head CI pending**
- E6 Self-review: **PASS**
- E7 PR/CI: **PENDING closure exact-head GREEN**
- E8 Merge: **PENDING — explicit user authorization required**
- E9 Post-merge: **PENDING**
- E10 Learning/recovery: **PASS**

## Current conclusion

A59 implementation has proved the production loop without requiring a new runtime architecture.

The remaining gate is documentation closure on an exact head, followed by full Branch Check and PR readiness. Merge remains separately authorized.
