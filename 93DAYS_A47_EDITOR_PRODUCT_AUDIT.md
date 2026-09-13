# 93 Days Narrative Editor — A47 Product / Authoring Audit

Date: 2026-09-13
Scope: `93-days-editor` after A46 stabilization.

## Audit question

This audit evaluates the product as a **story creation editor**. A capability is not considered authoring-complete merely because its domain type, runtime behavior or persistence representation exists. The author must be able to create/inspect/edit the relevant authored definition through the product UI, or the product must explicitly classify it as read-only analysis/runtime state.

## Authoring flow under review

1. create/open project;
2. create project entities (characters, locations, items, facts, claims, initial knowledge);
3. draft Story nodes and connections;
4. author placement in WORLD/TIME;
5. author schedules/routines;
6. author Narrative Moves, guards, resolution, Outcomes and Effects;
7. author reusable Interaction Templates and Reaction Candidate Sets;
8. inspect Story Brain/continuity diagnostics;
9. preview/test authored content without rewriting authored state;
10. save/reopen and continue editing.

## Findings

### P0 — WORLD/TIME routine schedules are displayed but not authorable

**Current state:** `WorldTimeWorkspace` renders `project.routineRules` as schedule blocks using the full recurrence/time-window domain model, but the UI only creates locations. `NarrativeProjectCommand` has no routine add/update/remove commands.

**Why this is an editor blocker:** an author can see schedule data loaded from fixtures/persistence but cannot create the same data in the editor. This makes WORLD/TIME partially read-only and prevents end-to-end authoring of Scheduled Presence.

**A47 action:** add validated routine authoring commands and a WORLD/TIME routine editor. Preserve Scheduled Presence != Actual Presence.

### P1 — Existing Story node title edit command has no visible editor control

**Current state:** command `story/updateNodeTitle` is implemented, but the Story inspector only displays the title and offers placement/connection/removal controls.

**A47 action:** expose title editing in the Story inspector using the existing command; do not mutate runtime Story state.

### P1 — Existing connection mode edit command is not surfaced for existing edges

**Current state:** authors choose reference/executable mode while creating a connection, and `story/setConnectionMode` exists, but existing edges are not selectable/editable from the canvas inspector.

**A47 action:** classify for closure after schedule/title authoring; likely requires explicit connection selection rather than implicit mutation.

### P1 — Story runtime execution policy is domain/runtime-complete but not authorable

**Current state:** `StoryNode.runtimePolicy` supports one-shot/repeatable, duration, miss window and interruption policy. A42 runtime semantics and persistence use it, but Story Workspace does not expose these authored fields.

**A47 action:** add authoring surface or explicitly defer with a visible limitation. Runtime policy is authored metadata, so long-term omission is not acceptable for editor completeness.

### P1 — Narrative Move resolver coverage is incomplete in the authoring form

**Current state:** the domain/runtime supports automatic, condition and skill-check resolvers. The current creation UI offers automatic and skill-check only. Some guard authoring is specialized to “actor knows Claim” rather than the full guard condition family.

**A47 action:** record as authoring closure work. Do not remove the richer domain model simply to match the current UI.

### P1 — Project entities are mostly create-only

**Current state:** locations, characters, item definitions/instances, facts and claims can be created, but general rename/edit/remove workflows are sparse or absent. Initial Knowledge is the exception: it supports set/update-by-pair and removal.

**A47 action:** define safe edit/remove semantics and reference diagnostics before exposing destructive operations broadly. Avoid deleting referenced canonical entities silently.

### P2 — Project rename exists in command layer but has no obvious Narrative Workspace control

**Current state:** `project/rename` is supported by the reducer; the header only displays `project.name`.

**A47 action:** expose a small rename interaction once higher-impact authoring blockers are closed.

### P2 — Stale Story library copy contradicts implemented cognition UI

**Current state:** the Story left rail says `Факты / знания — раздельные модели — следующий слой`, while the global Project Library already authors Objective Facts, Claims and Initial Knowledge.

**A47 action:** replace stale copy with a direct affordance/status that reflects the implemented Project Library.

### P2 — Outcome effect authoring is split across two surfaces

**Current state:** `OutcomeEffectsPanel` authors relationship, mood, item placement, Story state and memory effects. `character-learns-claim` is mainly authored through the Narrative Move creation shortcut.

**A47 action:** evaluate whether advanced authors need all typed effects available from one Outcome editor. This is not a runtime gap.

## What is deliberately NOT an A47 defect

- Actual Presence is runtime state and should not be edited as if it were a schedule.
- Simulation Playhead is runtime state and should not become the authoring cursor.
- Story Brain is read-only by design.
- ReactionCandidate ranking is not the same as executing an NPC action.
- Body/injury/carrying runtime state does not require a general authoring CRUD panel merely because it exists in preview.
- A47 does not require creating game content, economy, jobs, city AI or a three-day playable game.

## First closure slice

A47 starts with the highest-leverage broken authoring loop:

`Character + Location → authored RoutineRule → WORLD/TIME schedule block → save/reopen → same authored schedule`

Acceptance requires:

- new routines are authored through commands, not direct component mutation;
- invalid character/profile/location/time/recurrence references are rejected safely;
- routine removal is explicit and undoable;
- period and exact-time windows are representable;
- recurrence remains authored intent only and never changes Actual Presence;
- persistence uses the existing authored projection;
- tests and full CI pass.

## Status

**A47: IN PROGRESS.** This document is a living audit until the authoring closure checklist is complete.
