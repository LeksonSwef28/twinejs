# 93 Days Editor — Architecture v9

This file is the **current implementation-facing source of truth** for the `93-days-editor` branch.
Older design packs remain useful as history, but old workspace models such as separate Days Overview / Day Matrix / Scene Graph screens are superseded.

## 1. Two primary workspaces

### STORY
An Obsidian-like living canvas for authoring what happens and why.

- story beats, events, dialogue, conditions and effects;
- character/item references;
- typed story connections;
- nested canvases later;
- story material may exist without a day, time or location;
- location is context, not the organizing axis of Story.

### WORLD / TIME
One continuous temporal/spatial map for all 93 days.

- mouse wheel zooms time;
- drag pans through time;
- semantic zoom: 93 days → days → periods → hours → minutes;
- locations are the main rows/context;
- authored schedule and actual presence are distinct;
- moving the viewport never advances simulation time.

These are two projections over one `NarrativeProject`, not two independent projects.

## 2. Time rules

Day periods for the 93 Days template:

- Morning: 06:00–10:00
- Day: 10:00–18:00
- Evening: 18:00–22:00
- Night: 22:00–06:00

A new day begins at 00:00.
Cross-midnight exact schedule windows are explicit through `endDayOffset`.
The 5-minute presence-transition window is a different concept from editor navigation precision.

## 3. Core separations

These distinctions must not collapse:

- `View Cursor != Simulation Playhead`
- `Scheduled Presence != Actual Presence`
- `Canvas Node Instance != Canonical Entity`
- `Objective Fact != Claim / Statement != Character Knowledge != Memory`
- `Scene != Event`
- `Routine / Schedule Intent != Behavior Override != Actual Presence`
- `NarrativeProjectDefinition != SimulationState != EditorState`

Undo/Redo restores authored state, while keeping the current camera/view where possible.

## 4. Story authoring model

The current persisted Story foundation is:

```text
StoryNodeDefinition
  kind: beat | event | dialogue | condition | effect
  title
  optional placement
  activation state

StoryConnectionDefinition
  source node + source port
  target node + target port
  kind: flow | semantic | condition-true | condition-false | effect | ...
```

`placement` is optional by design. An author can first create:

```text
Katya learns the truth
        ↓
argues with the hero
        ↓
decides to leave
```

and only later place those beats into World / Time.

Visual layout is stored separately through `CanvasNodeInstance`, so the same canonical character or story entity may appear several times without duplication.

## 5. Story continuity direction

The editor should eventually diagnose narrative holes instead of writing the story automatically.

Desired diagnostics include:

- isolated beats;
- branches with no continuation;
- character arcs that run out long before Day 93;
- dormant alternatives that can bridge into another character's line;
- story gates that explain why a branch is unavailable.

Visual states planned for graph branches:

`draft / dormant / available / active / blocked / completed`

When one node is selected, its connected causal chain should become visually prominent while unrelated material becomes quieter.

## 6. Behavior and simulation direction

Living simulation comes after the Authoring MVP.

Target cycle:

```text
TIME
→ SCHEDULE
→ PRESENCE
→ AVAILABLE EVENTS
→ CHARACTER GOALS
→ AVAILABLE ACTIONS
→ HARD CONDITIONS
→ UTILITY / DECISION
→ ACTION / EVENT
→ EFFECTS
→ WORLD STATE
→ MEMORY / KNOWLEDGE / RELATIONSHIPS / INVENTORY
→ next cycle
```

Night should increase the desire to sleep, not force every character to sleep. Work, traits, danger, story events or explicit commands may override it.

### Reaction selection

An event should not normally hard-code one mandatory emotional response.
It may expose several authored reaction candidates — often three useful alternatives — and let the character choose among the candidates that pass hard conditions.

Selection can consider:

- current mood;
- traits and values;
- relationship state;
- current goal / urgency;
- knowledge and active memories;
- fatigue or other runtime needs;
- authored story priority.

The editor should explain both sides of the decision: why a reaction was available/blocked and why the winning reaction scored above the alternatives.
A chosen reaction may change relationships, goals, active behavior, knowledge/memory, inventory, or the desired route/location.

### Behavior and route overrides

A routine is the default intention, not an unbreakable command.
Behavior or route may change because of:

- an authored story event or explicit command;
- an urgent character goal;
- danger or another high-priority world event;
- newly received knowledge or a rumor;
- a relationship threshold/change;
- fatigue, sleep pressure, hunger or another runtime need;
- an item requirement/opportunity;
- a schedule exception;
- travel with / reaction to the player.

Whenever behavior or route changes, the runtime should keep a structured reason so the editor can answer: **why is this character here instead of following the normal schedule?**

## 7. Knowledge, rumors and memory

The cognition model must preserve the difference between world truth and what characters believe.

Conceptual layers:

```text
ObjectiveFact
    ↓ may be observed / described
Claim / Statement
    ↓ heard, seen, inferred or told
CharacterKnowledge
    ↓ may become salient / remembered
MemoryTrace
```

Rules:

- a lie or mistaken statement never rewrites the objective fact;
- a character may know, believe, doubt or misremember a claim independently of whether it is true;
- rumors are transmitted claims with provenance, not new objective facts;
- knowledge should retain enough source/confidence context for explainability and later re-transmission;
- hearing the same claim from several sources may strengthen confidence without automatically making it true;
- a remembered claim may later be repeated to another character, creating a new knowledge/memory path rather than duplicating the canonical fact.

Memory strength is dynamic rather than a permanent boolean.
A memory can weaken with time and become more accessible again when it is recalled, repeated, emotionally reinforced or connected to a new important event.
Authored critical memories may later support explicit persistence/pinning rules, but ordinary memory should be allowed to fade.

## 8. Project Library

Canonical entities should have a shared Project Library accessible from both primary workspaces.
It is the home for:

- Characters
- Locations
- Items (`ItemDefinition` + individual `ItemInstance`)
- objective Facts and reusable claims/knowledge definitions
- reusable Event Templates later

Dragging or adding an entity to Story creates a visual reference, not a duplicate canonical entity.

## 9. Near-term implementation order

### Authoring MVP

1. Schema v2 + migration
2. Real `CanvasNodeInstance` Story rendering
3. Story drag / pan / zoom
4. Persisted authored Story nodes and typed connections
5. Continuous World / Time pan / zoom timeline
6. Schedule projection on the visible timeline only
7. Project Library expansion (items, facts, claims, events)
8. Story placement into World / Time
9. Split View / quick peek where useful
10. Continuity diagnostics

### Living Simulation

Only after the authoring workflow feels good:

- schedule resolver;
- presence transitions;
- goals/actions/utility;
- reaction candidate selection with explainability;
- behavior/route overrides with structured reasons;
- event templates and role binding;
- fact/claim/knowledge/rumor propagation;
- memory decay and reinforcement;
- relationship and inventory effects;
- sleep/fatigue and dynamic behavior changes.

## 10. Persistence

Schema v2 is now the active persisted format.
Schema v1 localStorage payloads must migrate rather than disappear.
`NarrativeProjectRepository` remains the persistence boundary so localStorage can later be replaced by IndexedDB/project files without changing domain code.
