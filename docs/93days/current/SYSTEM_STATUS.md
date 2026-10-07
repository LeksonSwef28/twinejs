# 93 Days — CURRENT SYSTEM STATUS

Status: **CURRENT AUDIT**
Updated: **2026-10-07**
Baseline: `93-days-editor@292ed41100220a8e7c4e8eeb5436f2dd95c52a6e`

This matrix answers one question: **which planned game/editor systems are actually present now, which are partial, and which remain future work?**

It is implementation-facing. A system is not marked DONE because it appeared in an old roadmap; it is marked from current code/tests.

## Status vocabulary

- **DONE** — canonical implementation exists and is exercised by tests/current content.
- **PARTIAL** — useful implementation exists, but an explicitly planned layer remains missing.
- **DEFERRED** — deliberately not required for the current active product gate.
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
| Rich location hierarchy | DEFERRED | flat canonical locations are sufficient for current A67/A68 content |
| Rich travel topology/pathfinding | DEFERRED | explicit authored routes are sufficient for current A67/A68 content |

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

## QA / distribution

| System | Status | Current evidence / boundary |
|---|---|---|
| Cross-platform cloud build contracts | DONE | stable CI has Ubuntu full verification plus Windows/macOS clean build and Electron launcher contracts |
| Packaged QA product/profile identity | PARTIAL | dedicated `93 Days QA` builder identity and packaged runtime profile isolation exist; final packaged-artifact proof is still pending |
| Packaged-app smoke | MISSING | CI does not yet launch and verify the final tester-facing distributable |
| Legacy release workflow | PARTIAL / STALE | `create-release.yml` predates the current Node 22.12.0 / `npm ci` / 93 Days Branch Check path |

## Production/content state

| Layer | Status |
|---|---|
| Day 1 arrival | DONE |
| Day 1→2 narrative | DONE |
| Day 2→3 phone/social loop | DONE |
| Day 3 rumor/NPC delivery | DONE |
| Day 3→4 firsthand repair | DONE |
| Day 5→7 coherent first-week batch | **ENGINEERING DONE / HUMAN UX WALKTHROUGH PENDING — A67** |
| Second city/social cycle | **A68-C1 ENGINEERING DONE / HUMAN UX WALKTHROUGH PENDING; C2 NOT SELECTED** |
| Real-content scale gate | **PROPOSED / FOUNDATION READY — A69** |
| Remaining 93-day production plan | DEFERRED — post-A69 |
| Ending matrix | DEFERRED — after multi-week playtest evidence |

## Current decision boundary

A67 and A68-C1 have engineering evidence on the canonical Player/runtime path. Their remaining closure item is a real human UX walkthrough; A68-C2 stays unselected until those observations exist.

No missing gameplay subsystem currently justifies replacing this content/playtest path with another architecture programme. QA distribution now has a dedicated identity/profile foundation, but the tester-facing packaged artifact and packaged-app smoke still need proof.

Potential future subsystem work such as initial relationship authoring, Character Inner World authoring, broader NPC orchestration or richer location/travel tooling remains evidence-gated. Do not implement it pre-emptively.

## Known true future system gap

The clearest intentionally incomplete layer is **generic NPC opportunity scheduling/orchestration**.

A43 already provides a canonical decision bridge once an explicit opportunity exists: it can rank candidates, choose an action, enforce budget/schedule/active-execution blockers, consume PendingReaction after execution, spend simulation time and apply the selected Move. What it does not do is autonomously decide *when* arbitrary NPCs receive decision opportunities or continuously schedule them across the city.

A67 and A68-C1 do not require a generic city-wide scheduler: their autonomous world consequences are expressed through deterministic authored Story work or explicit canonical opportunities.

A68-C1 did not prove a need for broader opportunity scheduling. Revisit this gap only if A68-C2 or later production content demonstrates a concrete blocker.
