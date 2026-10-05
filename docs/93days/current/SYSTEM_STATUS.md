# 93 Days — CURRENT SYSTEM STATUS

Status: **CURRENT AUDIT**
Updated: **2026-10-03**
Baseline: `93-days-editor@af1dbb7fad2849babb21aeff734aca43f7003d2b`

This matrix answers one question: **which planned game/editor systems are actually present now, which are partial, and which remain future work?**

It is implementation-facing. A system is not marked DONE because it appeared in an old roadmap; it is marked from current code/tests.

## Status vocabulary

- **DONE** — canonical implementation exists and is exercised by tests/current content.
- **PARTIAL** — useful implementation exists, but an explicitly planned layer remains missing.
- **DEFERRED** — deliberately not required for the current A67 milestone.
- **MISSING** — no current canonical implementation for the planned capability.

## Core runtime / player

| System | Status | Current evidence / boundary |
|---|---|---|
| Canonical Narrative Project | DONE | schema-v3 aggregate remains authored source of truth |
| Separate authored/editor/runtime persistence | DONE | projection boundary + runtime snapshots |
| Canonical Player host/runtime | DONE | Player package, save/continue, browser/e2e regressions |
| Simulation Playhead | DONE | deterministic explicit stepping and due-work |
| Runtime Story State | DONE | `storyNodeStateOverrides` |
| Runtime occurrence history | DONE | `runtimeOccurrences` for Move outcomes + Story work |
| Active timed Story execution | DONE | `activeStoryExecutions` |
| Save/restore | DONE | identity-bound runtime saves and compatibility tests |
| Long 93-day semantic stepping | DONE as synthetic proof | A45 scale fixture; real-content proof remains A69 |

Important correction to Architecture v11: Runtime Story State and occurrence history are **no longer gaps**. They were implemented after that architecture snapshot.

## World / time / physical systems

| System | Status | Current evidence / boundary |
|---|---|---|
| Locations / scenes | DONE | canonical entities |
| Routine Rules | DONE | authored routines + authoring panel |
| Schedule Exceptions | DONE | A67-D3 CRUD/persistence/UI |
| Scheduled vs Actual Presence | DONE | explicit separation and runtime projection |
| Travel routes | DONE | travel domain + Player travel + fare tests |
| Sleep | DONE | authored sleep options + Player sleep |
| Economy / cash | DONE | A58 economy + purchase/fare integration |
| Body needs | DONE | fatigue, sleep debt, satiety, digestion |
| Heavy-meal movement restriction | DONE | physical-action constraints |
| Injury / pain / recovery | DONE | runtime injury model + simulation tests |
| Carrying / containers | DONE | weight/volume/size/hands/container nesting |
| Authored initial item placement | DONE | A67-D2 |
| Rich location hierarchy | DEFERRED | flat canonical locations are sufficient for A67 |
| Rich travel topology/pathfinding | DEFERRED | explicit authored routes are sufficient for A67 |

## Narrative / cognition / social systems

| System | Status | Current evidence / boundary |
|---|---|---|
| Facts / Claims / Character Knowledge separation | DONE | domain + authoring/runtime tests |
| Initial Knowledge | DONE core / PARTIAL UI | authored seed exists; dedicated full inner-world workflow remains future |
| Memory provenance | DONE | MemoryTrace, reinforcement, salience/decay |
| Mood / mind state | DONE runtime | runtime state exists |
| Relationship state | DONE runtime/effects | typed relationship-adjust effects and reaction considerations |
| Initial relationship authoring | PARTIAL | runtime representation exists; dedicated author-facing initial relationship workflow is not established |
| Narrative Moves | DONE | guards/resolution/outcomes/effects |
| Interaction templates | DONE | reusable authoring structures |
| Reaction candidate ranking | DONE | explainable guard/score evaluation |
| NPC decision selection/execution | PARTIAL | A43 explicitly evaluates/selects/executes supplied NPC opportunities with time cost, schedule conflicts, PendingReaction and explicit rolls; no general scheduler creates opportunities automatically |
| NPC-to-NPC deterministic authored occurrence | DONE | A63 exact-time delivery proves authored autonomous world event without generic NPC AI |
| Rumor/source provenance | DONE for current loop | A61-A63 chain |
| Phone/SMS social loop | DONE for current loop | A60 Player presentation/integration |
| General social-belief model | PARTIAL / DEFERRED | current interpersonal/knowledge primitives exist; generalized slow-moving group beliefs are not a dedicated runtime model |
| Character Inner World authoring | PARTIAL / DEFERRED | knowledge/memory/mind primitives exist; no unified authoring surface |

## Authoring product

| System | Status | Current evidence / boundary |
|---|---|---|
| STORY workspace | DONE |
| WORLD/TIME workspace | DONE |
| Story Brain / diagnostics | DONE |
| Preview / Player continuity | DONE |
| Project Search | DONE |
| Author focus / contextual navigation | DONE — A67-D1 |
| Item placement authoring | DONE — A67-D2 |
| Routine authoring | DONE |
| Schedule Exception authoring | DONE — A67-D3 |
| Narrative Move authoring | DONE |
| Reaction candidate authoring | DONE |
| Large-production UX proof | PARTIAL | synthetic scale gates exist; real A67+A68 graph proof is A69 |

## Production/content state

| Layer | Status |
|---|---|
| Day 1 arrival | DONE |
| Day 1→2 narrative | DONE |
| Day 2→3 phone/social loop | DONE |
| Day 3 rumor/NPC delivery | DONE |
| Day 3→4 firsthand repair | DONE |
| Day 5→7 coherent first-week batch | **MISSING — ACTIVE A67 WORK** |
| Second city/social cycle | DEFERRED — A68 |
| Real-content scale gate | DEFERRED — A69 |
| Remaining 93-day production plan | DEFERRED — post-A69 |
| Ending matrix | DEFERRED — after multi-week playtest evidence |

## A67 decision

No missing platform subsystem currently justifies replacing A67 content work with another architecture programme.

A67 should now test the existing system by producing Day 5-7 content.

If Day 5-7 authoring proves a concrete blocker, open the smallest evidence-backed subsystem slice. Likely candidates are:

- initial relationship authoring;
- Character Inner World inspection/authoring;
- a narrow NPC execution capability;
- location/travel authoring friction.

Do not implement any of these pre-emptively.

## Known true future system gap

The clearest intentionally incomplete layer is **generic NPC opportunity scheduling/orchestration**.

A43 already provides a canonical decision bridge once an explicit opportunity exists: it can rank candidates, choose an action, enforce budget/schedule/active-execution blockers, consume PendingReaction after execution, spend simulation time and apply the selected Move. What it does not do is autonomously decide *when* arbitrary NPCs receive decision opportunities or continuously schedule them across the city.

A67 does not require a generic city-wide scheduler if its autonomous world consequences can be expressed as deterministic authored Story work or explicit A43 opportunities, as already proven by A63.

A68 is the earliest milestone where broader opportunity scheduling may become justified by real content pressure.
