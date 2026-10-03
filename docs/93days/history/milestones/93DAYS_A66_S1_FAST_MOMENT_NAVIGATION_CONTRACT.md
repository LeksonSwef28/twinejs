# 93 Days — A66-S1 Fast Moment Navigation Contract

Change ID: **A66-S1**
Stage: **writer UX / direct View Cursor navigation**
Base: `93-days-editor@7c0e0dd1554d22b56c087b5faac8e204946f42b2`
Date: **2026-09-29**

## Goal

Let an author jump directly to an arbitrary valid project moment by entering:

`Day + HH:MM -> editor/selectMoment`

without advancing or rewriting the simulation.

## Proven UX friction

The stable Story timebar currently offers only:

- `−5 min`;
- `+5 min`;
- jumps to authored day periods.

That is precise but inefficient across a 93-day project. Reaching a distant moment requires many incremental actions or indirect navigation.

## Architectural boundary

A66-S1 is navigation only.

Invariant:

`View Cursor != Simulation Playhead`

The implementation must call the existing `editor/selectMoment` command. That command already owns clamping and updates only editor selection state:

- `editor.selectedDay`;
- `editor.selectedMinuteOfDay`;
- matching `editor.selectedPeriodId`.

It must not mutate `project.simulation.day`, `project.simulation.minuteOfDay`, runtime occurrences, authored Story nodes, or save/runtime schema.

## UI contract

Extend the existing `Точный навигатор истории` with:

- day input, labelled `День просмотра`;
- time input, labelled `Время просмотра`;
- `Перейти` action;
- a visible validation error for an invalid author-entered day/time.

Valid navigation updates the View Cursor immediately.

Invalid navigation keeps the existing View Cursor and Simulation Playhead unchanged.

The existing `−5 мин` / `+5 мин` controls remain available.

## Test-first acceptance

Before production implementation, add route-level tests proving the desired public UI contract:

1. direct jump to Day 37 / 18:40 updates the displayed View Cursor;
2. the same action leaves the displayed Simulation Playhead at its original moment;
3. an out-of-range day is rejected with a visible alert and does not change either cursor.

The first test commit is intentionally expected to be RED because these controls do not exist on stable.

## Out of scope

- changing Simulation Playhead;
- arbitrary runtime fast-forward;
- changing WORLD/TIME timeline semantics;
- new clock/calendar model;
- search redesign;
- Windows Electron launch repair;
- save/artifact/schema changes.

## Verification trail

- **#675 EXPECTED RED** on test-only head `34e8307749272e23de9e1c5261da07e4956ddd3a`:
  - install / audit / lint / web / Player / Electron builds: PASS;
  - Jest: 378 suites PASS, 1 suite FAIL;
  - 2239 tests PASS, 2 new A66-S1 tests FAIL;
  - exact failure: direct-navigation labels did not exist. This proved the RED belonged to the missing UI contract.
- **#676 FAIL** on first production implementation:
  - all pre-Jest gates PASS;
  - both A66-S1 tests still failed;
  - RCA split into fixture reality (View Cursor starts at 06:00, not 00:00) and native browser constraint validation preventing the product `role="alert"`.
- **#678 FAIL** after fixing fixture assumptions and validation ownership:
  - invalid-path test became GREEN;
  - one valid-path test remained RED;
  - exact product cause: the time parser regex incorrectly matched a literal backslash instead of digits.
- **#679 GREEN** on exact production head `01f04c3b6b27b3e752751f7a31f60c334ef17ae4`:
  - audit: 0 vulnerabilities;
  - lint / web / Player / Electron builds: PASS;
  - Jest: 379/379 suites, 2241 passed, 23 skipped, 42 todo;
  - Chromium: 13/13;
  - Vite smoke: PASS;
  - Electron smoke: PASS.
- **#680 GREEN** on browser-proof head `d06ca9b0a24ed4229f704c5d15ffcf50d7302595`:
  - production code unchanged from #679;
  - Jest remains 379/379 suites, 2241 passed;
  - Chromium increases to **14/14**;
  - browser proof `A66-S1 direct moment navigation moves only the View Cursor in Story UI`: PASS;
  - Vite smoke: PASS;
  - Electron smoke: PASS.

## Result

**PASS pending documentation-only exact-head recheck.**

A66-S1 now provides direct writer navigation to a valid project moment through the existing Story timebar:

`Day + HH:MM -> editor/selectMoment`

The route-level and browser-level proofs both preserve the architectural invariant:

`View Cursor != Simulation Playhead`

No runtime fast-forward, simulation mutation, clock replacement, save/schema change, or second time system was introduced.

A final exact-head Branch Check is required after this documentation synchronization. Merge remains separately gated.
