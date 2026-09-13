# 93 Days — Roadmap A41 → A46

This roadmap continues from `93DAYS_ARCHITECTURE_V11.md` after the CI-backed completion of A33–A40.

## Non-negotiable architecture constraints

- Exactly two top-level workspaces remain: STORY and WORLD/TIME.
- View Cursor != Simulation Playhead.
- Scheduled Presence != Actual Presence.
- Authored Story Definition != Runtime Story State.
- Authored Effect Definition != Applied Runtime Effect.
- InteractionTemplate != Concrete NarrativeMove != Runtime Occurrence.
- ReactionCandidate != PendingReaction != Executed Action.
- Due work remains declarative until an explicit execution layer handles it.
- Runtime simulation must never rewrite authored Story or authored item placement as a shortcut.

## A41 — Runtime Story State & Occurrence History

**Goal:** give the running world a canonical record of Story state and what actually happened without mutating authored Story definitions.

Deliverables:

- runtime Story activation-state overrides separate from authored `StoryNode.activationState`;
- stable runtime occurrence records for resolved Move outcomes;
- `story-node-set-state` Outcome effects apply to runtime Story state rather than authored nodes;
- runtime guards/reaction considerations read effective Story state;
- occurrence provenance records move, outcome, applied effect ids and exact Simulation Playhead moment;
- project persistence and runtime snapshots include Story runtime state/history with pre-A41 compatibility;
- authored Story remains byte-for-byte unchanged by runtime Story effects;
- deterministic tests and full CI.

A41 does **not** automatically execute due Story work. The A37 clock continues to return declarative due-work only.

**Status: DONE.** Verified by `93 Days Branch Check` run #272: runtime Story activation overrides, effective Story reads for guards/reactions, safe `story-node-set-state` application, deterministic Move/Outcome occurrence provenance, project persistence and runtime snapshots with pre-A41 compatibility, authored Story isolation, lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A42 — Runtime Action / Occurrence Execution Semantics

**Goal:** define when due work or chosen actions become actual runtime occurrences.

Deliverables:

- explicit consume/execute API for due Story work;
- one-shot/repeatable occurrence rules;
- missed/expired event semantics where authored content requests them;
- action duration/time cost;
- interruption/preemption contract;
- duplicate-execution prevention using occurrence history;
- deterministic execution traces.

**Status: DONE.** Verified by `93 Days Branch Check` run #293: due Story work remains declarative until explicitly consumed; one-shot/repeatable rules, explicit/expired misses, exact action duration, participant conflicts, interruptible/locked preemption, duplicate prevention, day-93 end bounds, in-progress save/resume, runtime-only active execution persistence, lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A43 — NPC Choice Scheduling & Action Economy

**Goal:** allow NPCs to choose among authored/runtime candidates without hiding decisions inside the clock.

Deliverables:

- explicit NPC decision opportunities;
- ReactionCandidate/PendingReaction to executable-action bridge;
- deterministic tie-breaking and injectable randomness;
- schedule intent vs emergent action conflict rules;
- action cost/time budget;
- explainable selection traces;
- no unrestricted autonomous writing.

**Status: DONE.** Verified by `93 Days Branch Check` run #298: explicit decision opportunities, ReactionCandidate and PendingReaction bridging, priority/score/stable-id selection, optional explicit random draw only for exact ties, action-minute budgets, schedule-intent conflict/temporary interruption rules, active Story execution conflicts, explicit skill-check input, PendingReaction consumption only after resolved execution, declarative due-work while NPC action time passes, explainable candidate blockers/traces, lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A44 — Living Simulation Playtest / Debug Surface

**Goal:** make the Living Simulation observable and controllable from the product UI.

Deliverables:

- play/pause/step controls for the Simulation Playhead;
- inspect actual presence, body, injuries, inventory and cognition;
- inspect due work, occurrence history and runtime Story state;
- trace viewer for move resolution, effects and NPC decisions;
- preserve STORY and WORLD/TIME as the only top-level workspaces.

**Status: DONE.** Verified by `93 Days Branch Check` run #308: Play/Pause and explicit +1/+5/+30 Simulation Playhead stepping, View Cursor synchronization, runtime character/body/injury/inventory/cognition inspection, due/upcoming work, active executions, effective Story state and occurrence history, read-only Move/NPC decision trace inspection, persisted runtime updates outside authoring Undo/Redo, runtime-only projection enforcement, STORY/WORLD-TIME remaining the only top-level workspaces, lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A45 — 93-Day Scale & Performance Gates

**Goal:** prove that the architecture can scale from the one-day vertical slice toward production 93-day content density.

Deliverables:

- deterministic long-step/batched simulation tests;
- large Story graph and scheduled-character fixtures;
- memory/reaction evaluation performance gates;
- runtime snapshot size/restore gates;
- editor rendering hot-path audit;
- no semantic shortcuts solely for benchmark success.

**Status: DONE.** Verified by `93 Days Branch Check` run #315: a full 93-day fixture with 744 scheduled Story nodes, 743 Story connections, 96 scheduled characters and 24 locations passed deterministic complete-summer long-step versus daily-batch equivalence; 3,000-memory/80-candidate reaction ranking and dense runtime snapshot size/restore gates passed on the normal production paths; Story/schedule projection gates and the editor hot-path audit were added without benchmark-only semantic shortcuts; lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A46 — Upstream Integration & Stabilization

**Goal:** reconcile the long-lived feature branch with upstream development without mixing integration churn into gameplay/domain stages.

Deliverables:

- dedicated develop-branch synchronization;
- conflict resolution with architecture invariants preserved;
- dependency/workflow compatibility review;
- full regression CI;
- PR readiness audit and documentation refresh.

## Execution rule

Work in order unless a blocking defect requires a small prerequisite fix:

`A41 → green CI → A42 → green CI → A43 → green CI → A44 → green CI → A45 → green CI → A46`

When a stage is complete, mark its status here in the same development cycle. Do not silently renumber or merge stages.
