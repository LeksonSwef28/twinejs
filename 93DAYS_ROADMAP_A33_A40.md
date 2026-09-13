# 93 Days — Roadmap A33 → A40

Status baseline: A28–A32 are implemented. This document locks the next numbered vertical slices so the project no longer loses the active stage between sessions.

## Non-negotiable architecture constraints

- Exactly two top-level workspaces remain: STORY and WORLD/TIME.
- View Cursor != Simulation Playhead.
- Scheduled != Actual Presence.
- Canvas Instance != Canonical Entity.
- Reference Edge != Executable Edge.
- Fact != Claim != Character Knowledge != Memory.
- InitialKnowledgeSeed != CharacterKnowledgeState.
- Eligibility != Resolution != Outcome != Effect.
- ReactionCandidate != PendingReaction != Executed Action.
- Story Brain remains read-only authoring intelligence; it is not an NPC brain or auto-writer.
- Memory decay changes derived recall/salience only. It never deletes objective history or rewrites Facts/Claims.

## A33 — Memory-aware Reactions

**Goal:** finish the A31/A32 → A28 cognition loop by making authored Reaction considerations able to depend on current memory salience.

Deliverables:

- `memory-tag` remains backward compatible: without a threshold it means “matching memory exists”.
- Optional normalized `minimumSalience` (0..1) gates a memory consideration.
- Salience is derived from A32 using an explicit Simulation Playhead moment; no wall-clock or invented `now` is allowed.
- Missing moment + requested threshold produces an explainable `unknown` trace.
- The strongest matching memory is selected deterministically (salience desc, stable id tie-break).
- Reaction traces expose memory id, current salience and authored threshold.
- Reaction authoring UI can leave the threshold blank or set 0..1.
- Failed/unknown considerations remain visible in the read-side explanation.
- Candidate evaluation still does not execute an action automatically.

**Status: DONE.** Verified by `93 Days Branch Check` run #193: lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A34 — Story ↔ World/Time Integration

**Goal:** make authored story meaningfully navigable in space and time without collapsing Story and World/Time into one model.

Deliverables:

- stronger semantic navigation from Story Nodes/Moves to relevant locations, participants and time context;
- reverse navigation from World/Time entities to Story context;
- Split View ergonomics for comparing the two workspaces;
- explicit handling of authored schedule context vs actual runtime presence;
- no third top-level workspace.

**Status: DONE.** Verified by `93 Days Branch Check` run #202: lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A35 — Persistence Projection Split

**Goal:** stop treating authored definitions, editor UI state and live simulation state as one physical persistence blob before autonomous simulation grows.

Deliverables:

- explicit authored/editor/runtime persistence projections;
- stable boundaries for cognition/runtime collections (`memories`, `relationships`, `mindStates`, `pendingReactions`, simulation knowledge);
- stronger schema-v2 hydration/validation while compatibility is retained;
- tests proving authored data is not mutated by runtime projection updates.

**Status: DONE.** Verified by `93 Days Branch Check` run #206: projection envelope persistence, flat schema-v2 migration, runtime/cognition hydration validation, lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A36 — Runtime Save / Load & Migration

**Goal:** make a running world safely resumable.

Deliverables:

- runtime snapshot contract;
- deterministic save/load round trip;
- migration/version strategy for runtime data;
- invalid/partial runtime data fails safely without destroying authored project data;
- tests for resume after time, cognition and world-state changes.

**Status: DONE.** Verified by `93 Days Branch Check` run #209: versioned runtime snapshots, deterministic round-trip, v0 → v1 migration, invalid/foreign snapshot rejection, lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A37 — Simulation Kernel

**Goal:** introduce the real Simulation Playhead and deterministic world stepping that later gameplay systems can depend on.

Deliverables:

- explicit simulation step/tick API;
- canonical day/minute progression;
- scheduled events and actual-presence projection remain separate concepts;
- deterministic ordering of simultaneous work;
- explanation/debug trace for world-state transitions;
- no autonomous character choice is hidden inside the clock.

**Status: DONE.** Verified by `93 Days Branch Check` run #214: canonical stepping across days and project end, deterministic due-work ordering, Story scheduled-work projection without execution, project-level orchestration, lint, web build, Electron build, tests, Vite smoke and Electron smoke all passed.

## A38 — Body / Needs Foundation

**Goal:** implement the first body-state systems on top of the simulation kernel instead of as disconnected UI flags.

Initial mechanics from the game concept:

- sleep and fatigue;
- sleep debt: pushing without enough sleep increases later recovery requirement;
- well-rested state provides a meaningful benefit;
- hunger/satiety;
- heavy meals temporarily restrict fast running while digestion proceeds (target concept: roughly 30 in-game minutes);
- typed body-state effects and explainable constraints on actions.

## A39 — Injuries / Inventory / Carrying

**Goal:** make physical condition and carried equipment materially constrain play.

Deliverables:

- injuries, pain/recovery and movement/action restrictions;
- item carrying and placement integrated with existing item instances;
- bags/portfolios as capacity-bearing containers rather than cosmetic labels;
- different bags permit different item sizes/capacity (e.g. portfolio can carry thermos + other items; small bag only small essentials);
- weight/capacity rules are data-driven and explainable.

## A40 — Living Simulation Vertical Slice

**Goal:** prove the architecture with one complete playable simulated day before scaling toward all 93 days.

The slice must demonstrate, end-to-end:

- Simulation Playhead advances a day;
- characters have scheduled context and actual presence;
- authored Story/Narrative Moves can resolve into typed effects;
- knowledge, relationships, mood and memories change from outcomes;
- memory salience can affect later reaction ranking;
- body needs evolve with time and constrain actions;
- injuries/inventory/carrying can affect available actions;
- state can be saved and restored without corrupting authored content;
- traces explain why important state transitions and reaction scores occurred.

A40 is not “full autonomous NPC AI”. It is the first integrated Living Simulation proof that the editor/runtime architecture can support the intended 93-day game.

## Execution rule

Work strictly in order unless a blocking defect forces a small prerequisite fix:

`A33 → green CI → A34 → green CI → A35 → green CI → A36 → green CI → A37 → green CI → A38 → green CI → A39 → green CI → A40`.

When an A-stage is complete, update its status in this file in the same development cycle. Do not renumber unfinished work silently.
