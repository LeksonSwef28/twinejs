# 93 Days Editor — Architecture v11

This file is the implementation-facing architecture source of truth for the `93-days-editor` branch after completion of roadmap A33–A40.

Architecture v11 supersedes `93DAYS_ARCHITECTURE_V10.md` where the two documents differ. v10 and older packs remain historical context.

## 1. Current phase

The project has moved beyond Authoring Foundation and now has a tested **Living Simulation vertical slice**.

Implemented foundations include:

- two canonical authoring workspaces: STORY and WORLD/TIME;
- safe Story graph with reference vs executable edges;
- Narrative Moves, guards, automatic/condition/skill-check resolution and Outcomes;
- Objective Facts, Claims, Character Knowledge and speaker intent as separate concepts;
- typed Outcome effects for knowledge, relationships, mood, item placement, Story state and memory definitions;
- Story Brain read-side analysis;
- Reaction Candidate authoring/evaluation;
- Memory provenance, reinforcement, salience and decay;
- salience-aware reaction considerations;
- Story ↔ World/Time semantic navigation;
- authored/editor/runtime persistence projections;
- versioned runtime snapshots;
- deterministic Simulation Playhead and due-work kernel;
- body needs, fatigue, sleep debt, food/digestion and physical action constraints;
- injuries, pain, treatment and recovery;
- inventory carrying, pockets, bags/portfolios, weight/volume/size/hand constraints;
- a project-level Living Simulation bridge that resolves authored Moves against runtime state and applies safe runtime effects;
- one deterministic full-day end-to-end vertical slice verified by CI.

This is still **not autonomous NPC AI** and not yet a complete 93-day game runtime.

## 2. Non-negotiable separations

The following concepts must remain distinct:

- `View Cursor != Simulation Playhead`
- `Scheduled Presence != Actual Presence`
- `Canvas Instance != Canonical Entity`
- `Reference Edge != Executable Edge`
- `Objective Fact != Claim != Character Knowledge != Memory`
- `InitialKnowledgeSeed != CharacterKnowledgeState`
- `Claim Truth != Speaker Intent != Listener Belief`
- `Eligibility != Resolution != Outcome != Effect`
- `Move unavailable != Skill Check failed`
- `InteractionTemplate != Concrete NarrativeMove != Runtime Occurrence`
- `ReactionCandidate != PendingReaction != Executed Action`
- `Authored Effect Definition != Applied Runtime Effect`
- `Authored Item Placement != Runtime Item Placement Overlay`
- `Authored Story Definition != Runtime Story State`
- `Routine/Schedule Intent != Behavior Override != Actual Presence`
- `Authored Projection != Editor Projection != Runtime Projection`

There remain exactly two top-level workspaces: STORY and WORLD/TIME.

## 3. STORY and WORLD/TIME

### STORY

STORY owns authored narrative meaning:

- Story Nodes;
- reference/executable connections;
- Narrative Moves;
- guards and resolvers;
- Outcomes and effect definitions;
- Interaction Templates;
- Reaction Candidate Sets;
- Story Brain authoring analysis.

Story content may exist before it has an exact time or location.

### WORLD/TIME

WORLD/TIME owns the authoring view of the 93-day calendar and spatial context:

- authored schedules and routines;
- locations;
- exact Story placements when authored;
- semantic projections from Story;
- current Simulation Playhead visualization where appropriate;
- actual runtime presence as a concept distinct from schedule intent.

Browsing the timeline never advances simulation.

## 4. Narrative execution pipeline

The canonical narrative pipeline is:

```text
Narrative Move
      ↓
Eligibility / Guards
      ↓
Resolution
      ↓
Outcome
      ↓
Runtime Effects
      ↓
Later cognition / reactions / Story consequences
```

### Guards

Guards answer whether an action can be attempted. Current runtime conditions include knowledge, item ownership, relationships, Story state and shared actual location.

A guard can be `met`, `unmet` or `unknown`. Unknown must stay explainable and must not silently become false or true.

### Resolution

Current resolver families:

- automatic;
- condition;
- skill-check.

Skill checks are deterministic domain functions. Runtime must supply the concrete skill value and roll. The A40 bridge explicitly returns `input-required` rather than inventing randomness.

### Outcome

An Outcome is authored. Its effects become runtime changes only after the Move has actually resolved.

A40 proves project-level application for:

- Character Knowledge;
- relationships;
- mood;
- memories;
- item placement through the A39 runtime placement overlay.

`story-node-set-state` remains an authored effect definition, but the A40 project runtime bridge **intentionally rejects it** until a dedicated Runtime Story State projection exists. It must never mutate authored Story Nodes as a shortcut.

## 5. Cognition

### Fact / Claim / Knowledge / Memory

The cognition chain remains:

```text
Objective Fact
    ↓ described or disputed by
Claim
    ↓ heard / observed / inferred
Character Knowledge
    ↓ may form or reinforce
MemoryTrace
    ↓ current salience
Reaction consideration
```

Memory decay changes derived salience only. It never deletes objective history or changes truth.

### Memory salience

A31/A32/A33 are now one tested loop:

- memories have structured provenance;
- repeated effects reinforce an existing stable Memory rather than duplicating it;
- salience derives from strength, importance, recency and reinforcement;
- reactions may use a `memory-tag` with optional `minimumSalience`;
- salience evaluation requires an explicit Simulation Playhead moment;
- reaction traces expose the strongest matching memory, current salience and threshold.

### Reactions

Reaction Candidate evaluation remains read-side ranking. It does not execute an NPC action.

Candidate availability comes from guards; score comes from authored considerations such as mood, relationship, knowledge, Story state and memory salience.

Automatic NPC action selection remains a future layer.

## 6. Time and simulation kernel

The Simulation Playhead is canonical runtime time:

```text
day + minuteOfDay
```

A37 provides deterministic stepping:

- time advances only by explicit step/tick calls;
- stepping clamps at the end of the project;
- due work is returned in stable time/id order;
- due work is declarative and is not automatically executed;
- a scheduled Story event does not imply actual presence;
- the clock does not choose character actions.

A40 demonstrates an authored Story event becoming due while the player is physically elsewhere. Presence changes only through an explicit runtime update.

## 7. Body and physical state

### Body needs

Runtime body state includes:

- fatigue;
- sleep debt;
- satiety;
- digestion time;
- planned sleep time.

Rules currently proved by tests:

- ordinary waking time raises fatigue;
- continuing beyond exhaustion creates sleep debt;
- sleep removes ordinary fatigue before paying back sleep debt;
- being well-rested reduces physical effort cost;
- hunger increases effort cost;
- a heavy meal blocks fast running during the digestion window (default concept: 30 in-game minutes);
- body state advances by the exact minutes actually applied by the Simulation Playhead.

### Injuries

Injuries are concrete runtime states, not an abstract HP bar.

They contain:

- injury kind/body region;
- pain level;
- remaining recovery time;
- treatment state;
- optional scar metadata.

Pain and injury type can block or modify physical actions. Serious untreated injuries can require medical care before recovery proceeds. Sleep can accelerate recovery through the same Simulation Playhead step used by body needs.

### Carrying and containers

Canonical authored `ItemInstance` identity is preserved.

Runtime movement uses `itemPlacementOverrides` rather than rewriting authored placement.

Current carrying rules support:

- loose carried items;
- pockets;
- containers;
- volume capacity;
- contents weight capacity;
- maximum item size;
- hands occupied;
- carry-style penalties such as climbing with a hand-carried portfolio;
- recursive carried weight through container contents;
- cycle prevention.

A medium thermos can fit an authored portfolio with sufficient capacity while a small bag can reject it by size. These constraints are data-driven rather than hardcoded to item names.

## 8. Persistence boundaries

A35 physically separates persisted project data into:

```text
authored
editor
runtime
```

### Authored projection

Contains definitions such as:

- locations/characters/items;
- Facts/Claims/initial Knowledge;
- schedules/routines;
- Story Nodes/connections;
- Moves/Templates/Reaction Candidate Sets.

### Editor projection

Contains authoring navigation and workspace UI state.

### Runtime projection

Contains live simulation state including:

- memories;
- relationships;
- mind states;
- pending reactions;
- simulation time/actual presence/knowledge/body;
- injuries;
- item placement overlays.

Runtime changes must not update authored `updatedAt` as though simulation were an authoring edit.

### Runtime snapshots

A36 runtime snapshots are versioned and identity-bound to project/story. They restore runtime without replacing authored/editor content.

Compatibility rules remain conservative:

- old schema-v2 project blobs can hydrate into the projection envelope;
- pre-A38 snapshots without body state remain readable;
- pre-A39 snapshots without injury/item placement state remain readable;
- malformed runtime collections fail safely or hydrate to safe empty values depending on boundary semantics;
- authored project data must survive malformed runtime data.

## 9. A40 Living Simulation vertical slice

The CI-backed A40 scenario proves a complete deterministic in-game day with the following chain:

1. a Story event becomes due at an authored time/location;
2. actual player presence remains elsewhere until explicitly changed;
3. a thermos packed inside a carried portfolio is recognized as being with the player by runtime guards;
4. actor and target reach the same actual location;
5. an authored Narrative Move resolves;
6. the Outcome changes Character Knowledge, relationship, mood and Memory;
7. the same Outcome transfers the thermos through the runtime item-placement overlay;
8. a heavy meal and an ankle injury independently explain why fast running is unavailable;
9. digestion expires through Simulation Playhead progression while injury remains a blocker;
10. the complete runtime is serialized and restored without changing authored Story/items/editor state;
11. the Simulation Playhead reaches the same clock time on day 2, proving a complete elapsed day;
12. body fatigue/sleep debt and injury recovery reflect elapsed time;
13. the memory created earlier remains salient enough to increase a later Reaction Candidate score;
14. all important decisions expose traces rather than hidden state transitions.

This is the current proof that the architecture can support a living game loop.

## 10. Explicit post-A40 gaps

The following are **not** silently considered solved by A40.

### Runtime Story State projection

The highest-priority semantic gap is a dedicated runtime projection for Story activation/consumption state.

Until it exists:

- authored `StoryNode.activationState` remains authoring data;
- `story-node-set-state` must not be projected by mutating authored nodes;
- the A40 bridge rejects that effect explicitly.

### Runtime occurrence history

A future runtime layer needs stable occurrence records for questions such as:

- did this Move execute already?;
- which Outcome happened?;
- when did it happen?;
- was a one-shot event consumed?;
- which event produced a state change?

This should be a runtime history/provenance system, not mutation of authored definitions.

### Autonomous NPC action selection

Reaction Candidate ranking exists, but autonomous selection/execution does not.

Before adding it, the architecture needs explicit rules for:

- when an NPC is allowed to choose;
- action cost/time consumption;
- conflicts between scheduled intent and emergent action;
- interruption/preemption;
- deterministic tie-breaking and randomness injection;
- explainable selection traces.

### Scale and performance

A40 proves one day, not 93 days at production content density. Scale gates should cover:

- large Story graphs;
- many scheduled characters;
- memory/reaction evaluation cost;
- runtime snapshot size;
- editor rendering cost;
- long simulation stepping and due-work batching.

### Upstream integration

The feature branch has diverged from upstream `develop`. Synchronization should remain a dedicated integration task rather than being mixed into gameplay/domain commits.

## 11. Next planning rule

Do not invent A41+ numbers implicitly.

The next numbered roadmap should be created explicitly from this v11 baseline. A reasonable planning discussion should consider, in order:

1. Runtime Story State + occurrence history;
2. runtime action/occurrence execution semantics;
3. NPC choice scheduling and action economy;
4. player-facing playtest/debug surface for Living Simulation;
5. scale/performance gates for 93-day content;
6. dedicated upstream integration.

Until that roadmap is accepted, post-A40 work should be described by its concrete subsystem name rather than silently continuing the old A-number sequence.
