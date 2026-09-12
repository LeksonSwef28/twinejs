# 93 Days Editor — Architecture v10

This file is the **current implementation-facing architecture source of truth** for the `93-days-editor` branch.
`93DAYS_ARCHITECTURE_V9.md` and older design packs remain useful as history, but v10 supersedes them where this document is more specific.

v10 keeps the accepted two-workspace architecture and adds two things:

1. **Story Brain / Narrative Reasoning** — a derived, non-mutating authoring intelligence layer inside Story;
2. **Narrative Interaction / Resolution** — one generic structure for ordinary dialogue/actions, gated choices, skill checks, outcomes, truth/deception and reusable interaction templates.

## 1. Two primary workspaces remain unchanged

### STORY

An Obsidian-like living canvas for authoring what happens, why it happens and how it can continue.

- freeform beats, events, dialogue, conditions and effects;
- character/item/fact/claim references;
- reference and executable connections;
- nested lenses for Scene / Dialogue / Interaction / Story Brain;
- content may remain unscheduled/unplaced;
- location is context, not the organizing axis.

### WORLD / TIME

One continuous temporal/spatial map for all 93 days.

- pan/zoom from project overview to exact minutes;
- locations as principal rows/context;
- schedule intent distinct from actual presence;
- Story markers projected onto time/location;
- browsing never advances simulation.

There are still exactly two top-level workspaces. Project Library, Split View, Inspector, Dialogue/Interaction lenses and Story Brain are not additional workspaces.

## 2. Core separations

These distinctions must not collapse:

- `View Cursor != Simulation Playhead`
- `Scheduled Presence != Actual Presence`
- `Canvas Node Instance != Canonical Entity`
- `Reference Edge != Executable Edge`
- `Objective Fact != Claim / Statement != Character Knowledge != Memory`
- `InitialKnowledgeSeed != CharacterKnowledgeState`
- `Claim Truth != Speaker Intent != Listener Belief`
- `Eligibility != Resolution != Outcome != Effect`
- `Move unavailable != Skill Check failed`
- `Scene != Event`
- `Routine / Schedule Intent != Behavior Override != Actual Presence`
- `NarrativeProjectDefinition != SimulationState != EditorState`

## 3. Safe Story graph

A persisted Story connection explicitly has a mode:

```text
reference
    visual / semantic relation only
    never executes

executable
    typed source/target ports
    participates in causal/runtime Story logic
```

Ambiguous legacy connections must migrate conservatively. A connection must never become executable merely because its label/color/shape looks logical.

This separation is a prerequisite for reliable Story Brain analysis and Skill Check outcome branches.

### Current implementation status

`V10-A07 Safe Story Edge Mode` is implemented in the branch:

- new connections default to `reference` unless the author explicitly chooses `executable`;
- executable edges require an executable-safe connection kind and both typed ports;
- Story UI exposes the choice when creating a connection;
- reference edges still participate in visual Focus/highlighting;
- only executable edges participate in causal Continuity analysis;
- legacy schema-v2 `flow`, `semantic`, `knowledge`, `relationship` and `effect` edges without an explicit mode migrate to `reference`;
- legacy `condition-true` / `condition-false` edges migrate to `executable` only when both ports are present;
- malformed persisted executable edges are downgraded to `reference` during hydration.

This closes the ambiguity that previously existed between decorative Story links and executable narrative logic.

## 4. Story Brain / Narrative Reasoning

Story Brain is a **read-only authoring intelligence layer**, not an NPC brain and not an automatic story writer.

Primary authoring queries:

- **Focus** — what belongs to the relevant connected/causal context;
- **Why** — why a branch/move is available, blocked or unknown;
- **Impact** — what authored content depends on this node/move/outcome;
- **Coverage** — where a thread/character line becomes weak or accidentally ends;
- **Bridges** — which existing characters, claims, knowledge, relationships, items, time/location intersections, dormant beats or templates might connect two parts of the story.

Story Brain must not mutate authored state by itself. It may explain, diagnose and propose candidates; the author decides whether to change the project.

## 5. Narrative Interaction / Resolution

Story interactions use one generic pipeline:

```text
Narrative Move
      ↓
Eligibility / Guards
      ↓
Resolution
      ↓
Outcome
      ↓
Effects / Story continuation
```

A Narrative Move is an authored attempt or choice: speak, ask, tell, lie, persuade, threaten, inspect, give an item, leave, and so on. The system must not require a dice roll for every move.

### Eligibility / Guards

Eligibility answers whether the move may be attempted at all. Examples:

- character knows a required Claim;
- relationship threshold is met;
- required Item is present;
- actor/target are in a compatible place/time;
- previous Story state exists;
- move has not been consumed when one-shot semantics apply.

An unavailable move is not the same thing as a failed skill check.

For `character-knows-claim`, the current foundation treats “knows” as **awareness that the Claim exists**, not agreement with it. A character who `doubts` or `disbelieves` a Claim can still discuss it. Future guard variants may explicitly require an attitude/confidence threshold.

### Resolution

Resolution decides how an available move is resolved.

Initial resolver families:

```text
automatic
condition
skill-check
```

The model remains extensible to passive checks, opposed checks, random/world checks or authored custom resolvers later.

### Skill Check

A skill check is one resolver, not a separate Story system.

A check contains at minimum:

- skill/stat reference;
- difficulty;
- modifiers/considerations;
- roll rule;
- authored outcomes;
- retry policy when relevant.

Default outputs:

```text
success
failure
```

The domain allows later outputs such as `critical-success`, `critical-failure` or custom authored outcome identifiers without redesigning the Story graph.

Failure is a valid narrative outcome, not automatically a dead end. Story Brain should later be able to diagnose a failure branch that has no meaningful consequence/continuation.

### A20 / A21 implementation status

`V10-A20 Narrative Move Foundation` and `V10-A21 Skill Check Foundation` are implemented:

- Story owns generic `NarrativeMoveDefinition` records rather than special per-dialogue mechanics;
- guards are authored independently from resolution;
- automatic/no-roll and condition resolution share the same Outcome contract as skill checks;
- skill checks use an authored roll rule instead of hardcoding a specific die system;
- runtime supplies the actual roll and current skill value;
- the domain resolver is deterministic and returns an explainable trace;
- success and failure are separate authored Outcomes and can therefore continue into different Story branches.

## 6. Truth, lies and belief

Truth and deception are independent from success/failure.

Conceptual cognition chain:

```text
ObjectiveFact
    ↓ may be described by
Claim / Statement
    ↓ communicated / observed / inferred
CharacterKnowledge
    ↓ may become salient
MemoryTrace
```

Communication also has speaker intent. Example intent families include:

```text
honest
deceptive
mistaken
uncertain
withholding
```

Therefore:

- a false Claim spoken sincerely because the speaker believes it is not a deliberate lie;
- a false Claim knowingly presented as true may be deception;
- a true Claim may fail to persuade the listener;
- a successful deception may change listener knowledge/belief but must never rewrite the objective Fact.

Each `CharacterKnowledgeState` belongs to one `characterId` and one `claimId`; the model is generic for every authored character. Absence of a knowledge state means the character has no represented awareness of that Claim.

### Authored initial knowledge versus runtime knowledge

Initial character cognition is authored through `InitialKnowledgeSeed`:

```text
InitialKnowledgeSeed
    characterId
    claimId
    attitude
    confidence
    source
        ↓ explicit preview/simulation initialization
CharacterKnowledgeState
```

The seed is part of authoring data. `CharacterKnowledgeState` is live runtime/preview state. Creating or editing a seed must not silently mutate a simulation that is already running.

The same Claim may have independent seeds/states for any number of characters. Adding a new Character never requires a schema change. No seed/state for `(characterId, claimId)` means no represented knowledge of that Claim.

## 7. Outcomes and effects

An outcome chooses the narrative result of a resolved move. Outcomes may continue into different executable Story branches.

Effects may change runtime/world state such as:

- Claim/Knowledge/Memory;
- relationship or mood;
- inventory;
- goals/behavior override;
- desired route/location;
- Story state;
- world facts when an actual world event makes a new fact true.

An Outcome is not itself an Effect: one outcome may apply several effects and then continue to another Story node.

### Knowledge effect foundation

The current foundation introduces an authored `character-learns-claim` Outcome effect. It can target:

- a fixed canonical Character; or
- a target slot on the current Narrative Move.

It can refer to:

- a fixed Claim; or
- the Claim communicated by the current Narrative Move.

Its provenance can currently be authored, observed, inferred, or derived from the current move actor (`told`). Applying the effect at runtime creates or reinforces the per-character `CharacterKnowledgeState`, including source, confidence, `timesHeard`, `learnedAt` and `lastReinforcedAt` where applicable.

Authoring an Outcome effect does **not** apply that effect to the preview. Effects are applied only when a runtime/preview resolver actually selects the Outcome.

## 8. Reusable interactions and scale

The project targets many characters and many events. It must not require a unique implementation type for every concrete pair of characters.

Reusable Event/Interaction Templates should support role slots and bindings:

```text
Template: Share a rumor
  speaker role
  listener role
  claim role/input
  authored moves/resolution/effects

Concrete binding:
  speaker = Character A
  listener = Character B
  claim = Claim 42
```

Unique authored scenes remain possible. Templates exist to reduce combinatorial authoring cost, not to force all scenes to become generic.

## 9. Story continuity direction

Continuity analysis must use executable causal edges for statements such as "this branch ends here". Reference edges may be traversed for Focus/context but must never make an otherwise dead executable branch look alive.

Desired diagnostics include:

- isolated authored material;
- executable branches with no continuation;
- character/story threads that run out too early;
- success/failure outcomes with asymmetric or missing authored consequences;
- dormant alternatives and cross-character handoffs;
- bridges through Claims/Knowledge, relationships, items, time/location intersections and reusable templates;
- gates explaining why a branch/move is unavailable.

The runtime guard evaluator now returns `met | unmet | unknown` plus an explanation trace. This is intentionally reusable by the future Story Brain `Why` view instead of inventing a second condition explanation engine.

## 10. Behavior and simulation direction

Living Simulation remains after the Authoring MVP.

Target cycle:

```text
TIME
→ SCHEDULE
→ PRESENCE
→ AVAILABLE EVENTS / MOVES
→ CHARACTER GOALS
→ AVAILABLE ACTIONS
→ ELIGIBILITY / HARD CONDITIONS
→ RESOLUTION / UTILITY / DECISION
→ ACTION / EVENT
→ OUTCOME / EFFECTS
→ WORLD STATE
→ MEMORY / KNOWLEDGE / RELATIONSHIPS / INVENTORY
→ next cycle
```

Night increases sleep pressure; it does not force sleep. Authored events, work, danger, goals, traits or explicit commands may override routine behavior.

Whenever a route/behavior changes, runtime should retain structured reasons for explainability.

## 11. Project Library

The shared Project Library remains available from both workspaces and is not a third workspace.

Canonical entity families include:

- Characters;
- Locations;
- Item Definitions and Item Instances;
- Objective Facts;
- Claims / reusable statement definitions;
- authored initial per-character Claim knowledge;
- Event / Interaction Templates later;
- reusable skill definitions/check authoring inputs later.

The current Library can seed the same Claim independently for any Character with attitude, confidence and provenance. These are authored baseline records, visibly separate from live preview knowledge.

Adding an entity to Story creates a visual reference; it does not duplicate the canonical entity.

## 12. Near-term implementation order

### Authoring foundation implemented / underway

- schema v2 and safe hydration;
- CanvasNodeInstance Story rendering;
- Story pan/zoom/drag;
- persisted Story nodes;
- safe reference/executable Story edges;
- continuous World/Time timeline;
- Project Library items/facts/claims;
- Story placement into World/Time;
- early continuity diagnostics;
- Narrative Moves and guards;
- automatic/condition/skill-check resolution;
- authored initial CharacterKnowledge baseline;
- runtime guard evaluation with explanation traces;
- first knowledge Outcome effect and reinforcement semantics.

### v10 next vertical slices

1. **Story Brain Focus + Impact** — derive the relevant authored/causal neighborhood and downstream dependencies without mutating the project;
2. **Story Brain Why** — consume the existing guard/resolution traces to explain availability, blocking and unknown state;
3. **Story Brain Coverage** — analyze success/failure and character/thread continuations for accidental early endings;
4. **Story Brain Bridge Finder** — propose existing Claims/Knowledge, relationships, items, time/location intersections, dormant beats and templates as possible continuations;
5. reusable Event/Interaction Templates and role binding after the direct authoring model proves usable;
6. expand Outcome effects (memory, relationship, inventory, story/world state) only through typed, explainable contracts.

Do not jump directly to autonomous Living Simulation before these authoring semantics are understandable and testable.

## 13. Persistence

Schema v2 remains the active persisted format during Authoring MVP evolution.
Hydration supplies/normalizes newly introduced collections and fields so earlier v2 projects do not disappear. In particular:

- missing `initialKnowledge` hydrates to `[]`;
- older Narrative Move Outcomes without `effects` hydrate with `effects: []`;
- malformed newly introduced authored records are rejected rather than being silently promoted into runtime behavior.

`NarrativeProjectRepository` remains the persistence boundary. A later storage split may physically separate authored project definition, editor state and preview simulation state, but UI/domain code should not depend directly on localStorage.
