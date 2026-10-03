# 93 Days — A66-S4 Direct WORLD/TIME Moment Navigation Contract

Change ID: **A66-S4**
Stage: **writer UX / direct WORLD-TIME View Cursor navigation**
Base: `93-days-editor@45c00cc6e5d860994aec1c7dab5ea02ef61a9468`
Date: **2026-09-30**

## Goal

Let an author jump directly to an arbitrary valid project moment while working in WORLD/TIME:

`Day + HH:MM -> editor/setWorldTimeViewport`

without advancing or rewriting the simulation.

## Proven writer friction

A66-S1 added direct `Day + HH:MM` navigation in STORY.

Current stable WORLD/TIME still offers only indirect navigation:

- wheel / drag;
- zoom controls;
- `Все 93 дня`;
- `К playhead симуляции`;
- Story/Search-derived jumps.

Therefore an author who knows the exact moment they want cannot enter it directly while staying in WORLD/TIME.

This is an asymmetric writer-facing gap, not a missing clock or runtime capability.

## Existing owner / reuse decision

The existing editor command `editor/setWorldTimeViewport` already owns WORLD/TIME navigation.

It:

- sets `worldTimeViewport.centerAbsoluteMinute`;
- synchronizes `editor.selectedDay`;
- synchronizes `editor.selectedMinuteOfDay`;
- synchronizes the coarse selected period;
- preserves the separation from `project.simulation`;
- is editor navigation and does not enter authored Undo history.

A66-S4 must reuse this owner. It must not add a second time-navigation state or route the action through simulation.

## Architectural boundary

Invariant:

`View Cursor != Simulation Playhead`

Direct WORLD/TIME navigation changes only the editor view.

It must not mutate:

- `project.simulation.day`;
- `project.simulation.minuteOfDay`;
- runtime occurrences;
- actual presence;
- authored Story placement;
- authored schedule;
- save/runtime schema.

## UI contract

When WORLD/TIME is the active workspace, expose a direct moment form:

- group label: `Точный навигатор времени`;
- day input: `День просмотра`;
- time input: `Время просмотра`;
- action: `Перейти`;
- visible validation error for an invalid author-entered day/time.

Valid navigation must:

1. convert Day + HH:MM to the matching absolute project minute;
2. call the existing WORLD/TIME viewport owner;
3. center the timeline on that moment;
4. synchronize the shared View Cursor to that moment;
5. preserve the current WORLD/TIME zoom;
6. leave Simulation Playhead unchanged.

Invalid navigation must leave the View Cursor, WORLD/TIME viewport and Simulation Playhead unchanged.

Time precision remains the existing five-minute authoring precision.

## Use case

**Actor:** author.

**Precondition:** Narrative Editor is open in `Время и мир`.

**Main path:**

1. author enters Day 37 / 18:40;
2. author presses `Перейти`;
3. WORLD/TIME centers around Day 37 / 18:40 at the current zoom;
4. shared View Cursor reports Day 37 / 18:40;
5. Simulation Playhead remains at its previous runtime moment.

**Invalid alternative:** Day 94 or invalid HH:MM is rejected visibly and no cursor/viewport/runtime state moves.

## Test-first acceptance

The first production-independent commit must be intentionally RED on stable because the WORLD/TIME direct form does not exist.

Route-level tests prove:

1. WORLD/TIME direct Day 37 / 18:40 navigation exists;
2. WORLD/TIME viewport actually moves to the target region, rather than only changing Story/View metadata;
3. current WORLD/TIME zoom is preserved;
4. shared View Cursor becomes Day 37 / 18:40;
5. Simulation Playhead remains unchanged;
6. Day 94 is rejected visibly;
7. invalid navigation changes neither View Cursor, viewport nor Simulation Playhead.

Expected RED reason: missing `Точный навигатор времени` UI contract.

## Out of scope

- runtime fast-forward;
- changing Simulation Playhead;
- new calendar/clock semantics;
- new WORLD/TIME persistence owner;
- Story placement changes;
- schedule mutation;
- search redesign;
- content expansion;
- Godot;
- save/artifact/schema changes.

## Definition of Done

A66-S4 is complete only after:

- EXPECTED RED is captured on a test-only head;
- the smallest production change reuses `editor/setWorldTimeViewport`;
- exact-head Branch Check is GREEN;
- browser evidence proves the normal UI path;
- stable remains unchanged until a separately authorized merge.
