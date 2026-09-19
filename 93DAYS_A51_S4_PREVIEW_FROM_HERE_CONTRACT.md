# A51-S4 Contract — Preview From Here

Status: **VERIFIED / DONE**  
Requirement: **REQ-011 Preview from here**  
Stage: **A51-S4**

## 1. Why a contract gate is required

`Preview from here` crosses an editor-navigation boundary into a runtime sandbox. The repository deliberately keeps several concepts separate:

- `editor.selectedDay` / `selectedMinuteOfDay` are a **View Cursor**, not the Simulation Playhead;
- `WorldTimeViewportState` is editor camera metadata and moving it never advances game time;
- Story node `placement` is optional authored metadata and may be partial;
- Story Canvas selection is currently local authoring UI state, not runtime state;
- Scheduled/authored location is not Actual Presence;
- character Knowledge is runtime cognition and cannot be reconstructed from authoring focus;
- `storyWorldNavigationContext()` compares Actual Presence to Story placement only when the Story moment exactly equals the current Simulation Playhead.

Therefore a naive implementation that copies editor focus into runtime fields would create false conclusions.

## 2. Decision

**Preview from here transfers authoring focus/context. It does not silently change runtime truth.**

Every S4 handoff starts a fresh Preview Scenario from the **current live Narrative Project/runtime snapshot**. A separate non-persisted focus descriptor tells the laboratory what the author was looking at.

The first approved focus union is:

```text
PreviewFromHereFocus =
  | story-node(storyNodeId)
  | view-moment(day, minuteOfDay)
```

This focus is investigation metadata only. It is not written into `NarrativeProject`, authoring Undo/Redo, live runtime, or preview provenance as a runtime event.

## 3. Runtime state that MUST remain unchanged on handoff

Creating a Preview-from-here scenario must preserve the current live values of:

- `simulation.day` and `simulation.minuteOfDay`;
- `simulation.actualLocationByCharacter`;
- `simulation.characterKnowledge`;
- relationships, memories, mind state and pending reactions;
- body/injury state;
- item runtime placement;
- Story runtime state/occurrences/executions;
- all authored definitions.

In other words, the initial Preview Scenario is the same live snapshot that normal `Set from live runtime` would capture.

## 4. Story-node focus semantics

For `story-node(storyNodeId)` the focus context may expose, read-only:

- Story node title/id;
- authored exact moment when both `placement.day` and `placement.minuteOfDay` exist;
- authored `locationId` when present;
- participant IDs;
- authored Move IDs belonging to the Story node;
- current Simulation Playhead moment;
- whether authored Story moment equals the current Simulation Playhead;
- Actual Presence comparison only through canonical `storyWorldNavigationContext()` semantics.

The UI may preselect the first authored Move belonging to the focused Story node. Move selection is presentation state only and does not resolve/apply the Move.

The handoff MUST NOT:

- move the sandbox playhead to the Story placement;
- set Actual Presence to the Story location;
- move Story participants to the authored location;
- seed/erase Knowledge;
- activate/complete the Story node;
- infer missing authored time/location values.

If authored placement is partial or absent, the context explicitly reports that the prerequisite is missing.

## 5. View-moment focus semantics

For `view-moment(day, minuteOfDay)` the focus context records the editor View Cursor moment and compares it to the live Simulation Playhead.

The handoff MUST NOT move the sandbox playhead to the View Cursor automatically.

If the View Cursor differs from the live playhead, Preview must display the mismatch. The author can then use the existing explicit **test-only moment** control in Analysis if they intentionally want to construct that sandbox state.

This preserves `View Cursor != Simulation Playhead` and avoids treating runtime presence/knowledge from one moment as trustworthy at another moment.

## 6. Fresh-sandbox rule

A new Preview-from-here request creates/replaces the active laboratory scenario from the current live project instead of reusing arbitrary prior sandbox mutations.

Reason: `from here` must have a clear source snapshot. Carrying previous test overrides into a new authoring focus would make the result ambiguous.

Forked scenarios created after the handoff continue to use the existing A51 fork/reset contract.

## 7. Focus ownership / UI handoff

Focus request state belongs to the `NarrativeWorkspace` UI session, not the Narrative Project.

Approved handoff path:

```text
Story selection / Story↔World navigator / View Cursor action
        ↓ explicit author click
NarrativeWorkspace local PreviewFromHereRequest
        ↓
SimulationDebugPanel
        ↓
PreviewLaboratoryPanel
        ↓
fresh live-sourced Preview Scenario + read-only focus context
```

This avoids persisting ephemeral selection merely to let sibling components communicate.

Verified S4 entry points are:

- Story ↔ WORLD/TIME navigator selected Story node → `Preview from here`;
- top-level View Cursor → `Preview this view`.

The component-local Story Canvas inspector selection remains local and was deliberately not persisted merely to create a third entry point.

Opening from these controls opens the Playtest/Debug panel but does not start simulation playback.

## 8. Context states authors must be able to distinguish

Story focus:

```text
aligned
  authored exact moment == Simulation Playhead

different-moment
  authored exact moment exists but differs from Simulation Playhead

unscheduled
  exact authored day/minute is incomplete
```

View-moment focus:

```text
aligned
  View Cursor == Simulation Playhead

different-moment
  View Cursor != Simulation Playhead
```

Location/presence remains separately described; time alignment never implies same location.

## 9. Required regression tests before S4 implementation can close

Application/contract tests:

1. Story focus creates a scenario deep-equal to a normal live snapshot for runtime fields.
2. Story placement at a different moment is reported as `different-moment`; sandbox playhead remains unchanged.
3. Story placement aligned with playhead reports `aligned` and canonical Actual Presence comparability.
4. Unscheduled/partially scheduled Story focus reports `unscheduled` and does not invent a moment.
5. Authored Story location never overwrites Actual Presence.
6. Story focus never modifies Knowledge or authored definitions.
7. View-moment focus at another time reports `different-moment`; sandbox playhead remains unchanged.
8. Invalid Story reference / invalid view moment fails atomically.
9. Focus descriptor/context creation is read-only with respect to the source project.

UI/integration tests:

10. Selected Story context explicit action emits the requested typed Story focus.
11. View Cursor explicit action opens Preview with requested view focus.
12. Focus mismatch is visible to the author before any explicit test override.
13. Focused Story may expose/prefer an authored Move but does not apply it.
14. Handoff does not call live `replaceRuntimeProject` and creates no authoring Undo/Redo entry for runtime state.
15. Repeated Preview-from-here requests establish a new UI request/remount boundary so prior preview overrides are not treated as the new source.

## 10. Explicit non-goals

S4 does **not** implement:

- simulation time travel;
- checkpoint/replay restore;
- schedule-to-Actual-Presence materialization;
- knowledge reconstruction for another time;
- automatic Story execution;
- automatic participant relocation;
- persistence of preview focus;
- generic editor-selection persistence.

Time travel/checkpoint semantics remain A51-S5 and require their own ADR/contract.

## 11. Gate decision

The semantic blocker is resolved by the focus-not-state rule above.

**S4 semantic contract: PASS and implementation VERIFIED.**

Any future change that sets sandbox moment/presence/knowledge merely because the author is viewing or selecting a different context violates this gate.

## 12. Verification evidence

Semantic contract commit `469816a963415214f1e3442ba6cc068fb1b33b0f` passed the full `93 Days Branch Check` in workflow #435 before implementation.

Verified code head: `cdbd446c8674efe072f4c58a636cbd23700c12cb`.

Workflow #438 completed SUCCESS with:

- install, production audit and lint PASS;
- web and Electron builds PASS;
- Jest/coverage PASS;
- Vite and Electron smoke PASS;
- Test Suites: **329/329 passed**;
- Tests: **2019 passed, 23 skipped, 42 todo / 2084 total**.

The only red implementation run (#437) was an incomplete test fixture missing required `effects: []`; the exact TS2741 evidence was fixed test-only without changing product semantics.

Detailed closure evidence: `93DAYS_A51_CHANGE_RECORD_S4.md`.
