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
- `InteractionTemplate != Concrete NarrativeMove != Runtime Occurrence`
- `ReactionCandidate != PendingReaction != Selected/Executed Action`
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

## 4. Story Brain / Narrative Reasoning

Story Brain is a **read-only authoring intelligence layer**, not an NPC brain and not an automatic story writer.

Primary authoring queries:

- **Focus** — what belongs to the relevant connected/causal context;
- **Why** — why a branch/move is available, blocked or unknown;
- **Impact** — what authored content depends on this node/move/outcome;
- **Coverage** — where a thread/character line becomes weak or accidentally ends;
- **Bridges** — which existing characters, claims, knowledge, relationships, items, time/location intersections, dormant beats or templates might connect two parts of the story.

Story Brain must not mutate authored state by itself. It may explain, diagnose and propose candidates; the author decides whether to change the project.

### A23 / A24 implementation status

`V10-A23 Story Brain Focus + Impact` and `V10-A24 Story Brain Why` are implemented:

- a derived semantic graph index connects Story nodes, Narrative Moves, Claims, Characters and Item instances without becoming a second source of truth;
- Focus traverses a bounded semantic neighborhood and may include reference Story edges because they are useful authoring context;
- Impact follows only explicit dependency/causal directions, so a reference Story edge never makes a branch look causally affected;
- Story nodes, Moves and Claims can be selected as analysis focus in the Story Brain lens;
- WHY reuses the existing runtime guard/condition evaluator rather than inventing a parallel explanation engine;
- move availability is explained as `available | blocked | unknown`, with per-guard traces;
- automatic and condition resolution expose the currently implied outcome, while a skill-check explanation states that runtime skill value and roll are still required;
- all Story Brain queries are read-only and do not mutate authored or preview state.

### A25 / A26 implementation status

`V10-A25 Story Brain Coverage` and `V10-A26 Bridge Finder` are implemented:

- Coverage extends the existing continuity analyzer rather than creating a second graph authority;
- reference edges cannot keep an executable branch alive;
- empty/asymmetric branching Outcomes and early character frontiers are diagnosed;
- Bridge Finder ranks only already-authored material and explains every score contribution;
- bridge signals currently include Characters, Claims/initial Knowledge, Item guards, location/time proximity, reference hints and dormant/unplaced Story material;
- direct executable continuations are excluded from bridge candidates because they are already continuations.

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

Default outputs are `success` and `failure`, while the domain remains extensible to critical/custom outcomes.

Failure is a valid narrative outcome, not automatically a dead end. Story Brain can diagnose a failure branch that currently has no meaningful consequence/continuation without assuming that every short failure branch is invalid.

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

Communication also has speaker intent such as honest, deceptive, mistaken, uncertain or withholding.

Therefore:

- a false Claim spoken sincerely because the speaker believes it is not a deliberate lie;
- a false Claim knowingly presented as true may be deception;
- a true Claim may fail to persuade the listener;
- a successful deception may change listener knowledge/belief but must never rewrite the objective Fact.

Each `CharacterKnowledgeState` belongs to one `characterId` and one `claimId`; the model is generic for every authored character. Absence of a knowledge state means the character has no represented awareness of that Claim.

### Authored initial knowledge versus runtime knowledge

Initial character cognition is authored through `InitialKnowledgeSeed` and only becomes live `CharacterKnowledgeState` through explicit preview/simulation initialization. Creating or editing a seed must not silently mutate a simulation that is already running.

The same Claim may have independent seeds/states for any number of characters. Adding a new Character never requires a schema change.

## 7. Outcomes and effects

An outcome chooses the narrative result of a resolved move. Outcomes may continue into different executable Story branches.

Effects may change runtime/world state such as Claim/Knowledge/Memory, relationships/mood, inventory, goals/behavior override, desired route/location, Story state, or world facts when an actual world event makes a new fact true.

An Outcome is not itself an Effect: one outcome may apply several effects and then continue to another Story node.

### Knowledge effect foundation

The current foundation introduces an authored `character-learns-claim` Outcome effect. It can target a fixed canonical Character or a target slot on the current Narrative Move, and may refer to a fixed Claim or the Claim communicated by the current Move.

Applying the effect at runtime creates or reinforces the per-character `CharacterKnowledgeState`, including provenance, confidence, `timesHeard`, `learnedAt` and `lastReinforcedAt` where applicable. Authoring an Outcome effect does **not** apply it to preview state.

## 8. Reusable interactions and scale

The project targets many characters and events. It must not require a unique implementation type for every concrete pair of characters.

Reusable Event/Interaction Templates use semantic role/claim slots and explicit bindings:

```text
Template: Share a rumor
  speaker role
  listener role
  claim slot
          ↓ bind
Concrete use
  speaker = Character A
  listener = Character B
  claim = Claim 42
          ↓ materialize
ordinary NarrativeMove records
```

### A27 implementation status

`V10-A27 Reusable Interaction Template Foundation` is implemented with these boundaries:

- `InteractionTemplateDefinition` contains reusable role slots, Claim slots and reusable Move shells;
- `InteractionTemplateBinding` explicitly binds those slots to canonical project entities;
- instantiation fails closed when required bindings are missing;
- a template never executes directly and does not introduce a second Guard/Resolution/Outcome language;
- instantiation materializes ordinary `NarrativeMoveDefinition` records which then use the existing interaction pipeline;
- a built-in “Поделиться утверждением” starter template proves the generic binding flow in the Story UI;
- schema-v2 persistence can safely hydrate authored project template definitions and rejects malformed definitions.

This slice intentionally does **not** yet claim a full arbitrary template designer. The current UI binds/instantiates templates; richer custom-template editing is an authoring-polish follow-up.

## 9. Character reaction candidates

A reaction is not a fixed positive/neutral/negative state machine. The author may define any number of candidate Moves. Valence is descriptive metadata; eligibility and score remain separate.

Conceptually:

```text
Authored Reaction Candidate Set
  candidate A -> Move A
  candidate B -> Move B
  candidate C -> Move C
  ... any count
        ↓
Guards -> available / blocked / unknown
        ↓
Considerations -> explainable score adjustments
        ↓
Ranked candidates
        ↓
selection/execution is a later explicit runtime/author decision
```

### A28 implementation status

`V10-A28 Character Reaction Candidate Foundation` is implemented:

- candidate sets belong to a Story context and a generic `reactingCharacterId`;
- candidates point to ordinary Narrative Moves rather than duplicating action content;
- existing Guards determine `available | blocked | unknown`;
- considerations currently support mood, relationship values, CharacterKnowledge/Claims, Memory tags and Story state;
- every matched consideration contributes an explicit signed weight and explanation trace;
- ranking is deterministic and read-only; available candidates rank before unknown/blocked candidates, then by score;
- Story Brain query can derive reaction evaluations for the focused Story context;
- a Story-side inspection panel exposes authored reaction sets without executing them;
- schema-v2 persistence hydrates candidate sets safely and rejects malformed definitions.

Traits, goals, fatigue/needs and story-priority scoring are **not fabricated** before canonical domain state exists for them. They remain planned extensions to the same consideration contract.

Authored `ReactionCandidateDefinition` is distinct from existing `PendingReaction`: the former is reusable authoring input; the latter remains runtime-ish pending state. Neither is the same as a selected/executed action.

The current slice provides the model, evaluator, persistence and read-side inspection. Full in-app editing of arbitrary Reaction Candidate Sets remains a follow-up authoring slice; the system does not pretend that persistence alone is an editor.

## 10. Story continuity direction

Continuity analysis uses executable causal edges for statements such as “this branch ends here”. Reference edges may be traversed for Focus/context and used as Bridge hints, but must never make an otherwise dead executable branch look alive.

Current diagnostics include:

- isolated authored material from the earlier continuity analyzer;
- executable terminal and early-terminal Story material;
- branching Outcomes with no Story continuation or runtime effect;
- asymmetric multi-outcome Moves where only some outcomes have consequences;
- placed character frontiers whose latest authored nodes have no executable continuation;
- deterministic bridge candidates through existing Claims/Knowledge, Characters, Item guards, time/location proximity, reference hints and dormant/unplaced Story material;
- gates explaining why a branch/move is unavailable.

The runtime guard evaluator returns `met | unmet | unknown` plus an explanation trace. Story Brain `Why` and reaction eligibility reuse that evaluator instead of inventing parallel condition engines.

## 11. Behavior and simulation direction

Living Simulation remains after the Authoring MVP.

Target cycle:

```text
TIME
→ SCHEDULE
→ PRESENCE
→ AVAILABLE EVENTS / MOVES
→ CHARACTER GOALS
→ AVAILABLE ACTIONS / REACTION CANDIDATES
→ ELIGIBILITY / HARD CONDITIONS
→ RESOLUTION / UTILITY / DECISION
→ ACTION / EVENT
→ OUTCOME / EFFECTS
→ WORLD STATE
→ MEMORY / KNOWLEDGE / RELATIONSHIPS / INVENTORY
→ next cycle
```

Night increases sleep pressure; it does not force sleep. Authored events, work, danger, goals, traits or explicit commands may override routine behavior.

Whenever a route/behavior/action selection changes, runtime should retain structured reasons for explainability.

## 12. Project Library

The shared Project Library remains available from both workspaces and is not a third workspace.

Canonical authored families now include:

- Characters;
- Locations;
- Item Definitions and Item Instances;
- Objective Facts;
- Claims / reusable statement definitions;
- authored initial per-character Claim knowledge;
- Interaction Template definitions;
- Reaction Candidate Set definitions;
- reusable skill definitions/check authoring inputs later.

Adding an entity to Story creates a visual reference; it does not duplicate the canonical entity.

## 13. Near-term implementation order

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
- first knowledge Outcome effect and reinforcement semantics;
- Story Brain Focus + Impact + Why;
- Story Brain Coverage + deterministic Bridge Finder;
- reusable Interaction Template model/binding/materialization foundation;
- explainable Character Reaction Candidate model/evaluator/read-side inspection.

### v10 next vertical slices

1. **V10-A29 Typed Outcome Effects** — expand Effects beyond knowledge into relationship, mood, inventory and Story-state changes through typed, pure, explainable contracts;
2. **V10-A30 Template / Reaction Authoring Polish** — add explicit project commands and focused editors for custom template definitions and Reaction Candidate Sets, including atomic undo-friendly authoring operations;
3. continue Story ↔ World/Time semantic navigation and Split View ergonomics;
4. persistence projection cleanup and scale/performance gates before autonomous Living Simulation.

A29/A30 must preserve the existing distinction between authored definitions and runtime state. Do not make candidate ranking automatically execute an action.

## 14. Persistence

Schema v2 remains the active persisted format during Authoring MVP evolution. Hydration supplies/normalizes newly introduced collections so earlier v2 projects do not disappear merely because a new authoring concept was added.

Current compatibility rules include:

- missing `initialKnowledge` hydrates to `[]`;
- older Narrative Move Outcomes without `effects` hydrate with `effects: []`;
- missing `interactionTemplates` hydrates to `[]`;
- missing `reactionCandidateSets` hydrates to `[]`;
- malformed template/reaction definitions are filtered rather than silently promoted into executable behavior.

`NarrativeProjectRepository` remains the persistence boundary. A later storage split may physically separate authored project definition, editor state and preview simulation state, but UI/domain code should not depend directly on localStorage.
