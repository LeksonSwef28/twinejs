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

## Verification gate

A66-S1 can move from RED to implementation only after the failing test is confirmed to fail for the missing direct-navigation UI rather than for unrelated infrastructure.
