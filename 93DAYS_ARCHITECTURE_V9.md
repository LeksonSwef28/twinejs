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
- `Fact != Knowledge != Memory`
- `Scene != Event`
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

## 7. Project Library

Canonical entities should have a shared Project Library accessible from both primary workspaces.
It is the home for:

- Characters
- Locations
- Items (`ItemDefinition` + individual `ItemInstance`)
- Facts / knowledge definitions
- reusable Event Templates later

Dragging or adding an entity to Story creates a visual reference, not a duplicate canonical entity.

## 8. Near-term implementation order

### Authoring MVP

1. Schema v2 + migration
2. Real `CanvasNodeInstance` Story rendering
3. Story drag / pan / zoom
4. Persisted authored Story nodes and typed connections
5. Continuous World / Time pan / zoom timeline
6. Schedule projection on the visible timeline only
7. Project Library expansion (items, facts, events)
8. Story placement into World / Time
9. Split View / quick peek where useful
10. Continuity diagnostics

### Living Simulation

Only after the authoring workflow feels good:

- schedule resolver;
- presence transitions;
- goals/actions/utility;
- event templates and role binding;
- memory/knowledge propagation;
- relationship and inventory effects;
- sleep/fatigue and dynamic behavior changes.

## 9. Persistence

Schema v2 is now the active persisted format.
Schema v1 localStorage payloads must migrate rather than disappear.
`NarrativeProjectRepository` remains the persistence boundary so localStorage can later be replaced by IndexedDB/project files without changing domain code.
