# A51 Change Record — S4 Preview From Here

Change ID: **A51-S4-CLOSURE**  
Stage / Requirement: **A51-S4 / REQ-011 Preview from here**  
Risk: **HIGH** (editor-navigation focus crossing into isolated runtime preview)  
Semantic contract SHA: `469816a963415214f1e3442ba6cc068fb1b33b0f`  
Semantic contract workflow: `93 Days Branch Check #435` / run id `35133751646`  
Verified code SHA: `cdbd446c8674efe072f4c58a636cbd23700c12cb`  
Verified code workflow: `93 Days Branch Check #438` / run id `35136915205`

## Problem / requirement

`Preview from here` must let an author carry useful Story/View context into the A51 laboratory without silently treating editor navigation as runtime truth. The repository intentionally separates View Cursor from Simulation Playhead, authored/scheduled placement from Actual Presence and author focus from character Knowledge.

## Semantic contract

The S4 contract is recorded in `93DAYS_A51_S4_PREVIEW_FROM_HERE_CONTRACT.md`.

Approved rule:

> Preview from here transfers authoring focus/context. It does not silently change runtime truth.

The first typed focus union is:

```text
story-node(storyNodeId)
view-moment(day, minuteOfDay)
```

Every request starts from the current live Narrative Project/runtime snapshot. Story placement and View Cursor are read-only context. They never implicitly move the sandbox playhead, relocate characters, seed/erase Knowledge or change Story runtime state.

Semantic contract head `469816a963415214f1e3442ba6cc068fb1b33b0f` passed the full branch gate in workflow #435 before implementation began.

## Implementation

Implementation commits:

- `ee65ec73bec94210501f3e21054af83259a87734` — `feat: add A51 preview-from-here handoff`;
- `b6de24bbeec6209ca750aaf66840db0fa6755c06` — `refactor: narrow A51 preview handoff patch`;
- `cdbd446c8674efe072f4c58a636cbd23700c12cb` — `test: complete A51 preview outcome fixture`.

Primary files:

- `src/application/narrative/preview-from-here.ts`;
- `src/application/narrative/__tests__/preview-from-here.test.ts`;
- `src/components/narrative/workspace/preview-from-here-controls.tsx`;
- `src/components/narrative/workspace/__tests__/preview-from-here-controls.test.tsx`;
- `src/components/narrative/workspace/__tests__/preview-from-here-workspace.test.tsx`;
- focused integration changes in `cross-workspace-navigator.tsx` and `narrative-workspace.tsx`.

`inspectPreviewFromHereFocus()` validates typed focus and derives Story context through canonical `storyWorldNavigationContext()` semantics. `createPreviewFromHereScenario()` uses the existing `createPreviewScenario()` live-snapshot path and keeps focus metadata outside Narrative Project/runtime state.

Implemented UI entry points are:

- top-level View Cursor → **Preview this view**;
- selected Story context in `CrossWorkspaceNavigator` → **Preview from here**.

The component-local Story Canvas inspector selection was deliberately not persisted merely to satisfy S4. That keeps editor selection ownership unchanged.

Each explicit request gets a monotonic request id and remounts `SimulationDebugPanel`; the nested Preview Laboratory therefore starts from a fresh current live snapshot instead of carrying arbitrary prior sandbox overrides. Manual Playtest opening clears stale Preview-from-here focus.

## Regression evidence

Application/contract coverage proves:

- Story focus creates the same live-sourced preview snapshot as ordinary `createPreviewScenario()`;
- different authored Story moment is reported without moving sandbox time;
- authored Story location does not overwrite Actual Presence;
- aligned Story focus delegates presence comparison to canonical navigation semantics;
- partial Story placement remains `unscheduled` rather than inventing a minute;
- View Cursor mismatch is reported without moving Simulation Playhead;
- invalid Story/view focus fails without source mutation;
- focus inspection is read-only.

UI/integration coverage proves:

- View Cursor action emits typed `view-moment` focus;
- selected Story context emits typed `story-node` focus without authoring `execute`;
- mismatch is visible before any explicit sandbox override;
- View Cursor handoff opens Playtest/Debug without dispatching an authoring command.

## Exact E0 / recovery

Workflow #437 on `b6de24bbeec6209ca750aaf66840db0fa6755c06` failed only at the web build after install, audit and lint passed.

Exact TypeScript evidence:

```text
src/application/narrative/__tests__/preview-from-here.test.ts(63,4):
TS2741: Property 'effects' is missing ... but required in type 'NarrativeOutcomeDefinition'.
```

Root cause: the new test fixture used an incomplete `NarrativeOutcomeDefinition` literal. Product code was not implicated.

Minimal correction: add `effects: []` to that test Outcome fixture. No runtime/application/UI code changed for the recovery.

## Exact-head verification

Workflow run #438 on `cdbd446c8674efe072f4c58a636cbd23700c12cb` completed **SUCCESS**.

Full gate:

- install: PASS;
- production dependency audit: PASS;
- lint: PASS;
- web build: PASS;
- Electron main build: PASS;
- Jest/coverage: PASS;
- diagnostics upload: PASS;
- Vite smoke: PASS;
- Electron smoke: PASS.

Jest evidence from preserved `93-days-test-diagnostics` artifact:

- Test Suites: **329 passed / 329 total**;
- Tests: **2019 passed, 23 skipped, 42 todo / 2084 total**;
- Snapshots: **0**;
- coverage thresholds were not reduced and no coverage exclusion was added.

## Self-review

Self-review found one structural issue before final verification: the first UI-session approach wrapped the whole `NarrativeWorkspace` in a Provider and produced an unnecessarily broad whitespace diff. It was replaced with narrow typed callback props before relying on CI. Final S4 integration diff is focused: `NarrativeWorkspace` is +44/-2 and `CrossWorkspaceNavigator` is +19/-1, with the rest isolated new S4 code/tests.

Reviewed against A51 invariants:

- no focus value is persisted into Narrative Project;
- no Preview-from-here path calls live `replaceRuntimeProject`;
- no implicit Simulation Playhead write;
- no Actual Presence or Knowledge synthesis;
- no Story runtime-state synthesis;
- source project remains unchanged by focus inspection/scenario creation;
- canonical Story/presence comparison is reused rather than duplicated;
- new requests establish a fresh live-sourced sandbox boundary;
- no generic selection-persistence mechanism was introduced;
- no open PR review threads remain.

No known BLOCKER/HIGH S4 issue remains after run #438.

## Gate status

| Gate | Status | Evidence |
|---|---|---|
| E0 Evidence | **PASS** | semantic ambiguity resolved first; #437 TS2741 captured exactly |
| E1 Scope | **PASS** | typed focus adapter + narrow UI handoff only |
| E2 Contract | **PASS** | focus-not-runtime-state contract; #435 green before implementation |
| E3 Verification design | **PASS** | application, UI and integration regressions cover no-hidden-state rules |
| E4 Minimal patch | **PASS** | broad Provider diff removed during self-review; final integration narrow |
| E5 Verification ladder | **PASS** | full run #438 green on exact code SHA |
| E6 Self-review | **PASS** | patch-width issue identified and corrected; architecture rechecked |
| E7 PR/CI | **PASS for S4 slice** | PR #24 code head green; no open review threads |
| E8 Merge | **N/A for S4** | overall A51 continues; do not merge yet |
| E9 Post-merge | **N/A** | not merged |
| E10 Learning/recovery | **PASS** | fixture defect fixed test-only; author focus kept distinct from runtime truth |

## Closure / next permitted action

**A51-S4 is DONE.** The overall A51 stage remains **IN PROGRESS**.

Next permitted slice: **A51-S5 — Checkpoints / time travel contract + storage/replay ADR**.

S5 implementation remains blocked until the ADR explicitly chooses snapshot vs replay vs hybrid semantics and proves that preview checkpoints stay outside authoring Undo/Redo and persistence boundaries unless separately approved.
