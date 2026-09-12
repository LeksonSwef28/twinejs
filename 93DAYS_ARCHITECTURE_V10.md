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

## 4. Story Brain / Narrative Reasoning

Story Brain is a **read-only authoring intelligence layer**, not an NPC brain and not an automatic story writer.

Primary authoring queries:

- **Focus** — what belongs to the relevant connected/causal context;
- **Why** — why a branch/move is available, blocked or unknown;
- **Impact** — what authored content depends on this node/move/outcome;
- **Coverage** — where a thread/character line becomes weak or accidentally ends;
- **Bridges** — which existing characters, claims, knowledge, relationships, items, time/location intersections, dormant beats or templates might connect two parts of the story.

Story Brain may use authored definitions and optional preview state, but it must not mutate either.

Suggestions require explicit author acceptance.

## 5. Narrative Interaction / Resolution

The stable model is:

```text
Narrative Move
    ↓
Eligibility / Guards
    ↓
Resolution
    ↓
Named Outcome
    ↓
Typed Effects / executable Story continuation
```

A Narrative Move is a generic authored attempt/choice. It may represent dialogue, action, investigation, accusation, persuasion, giving an item, leaving, or another custom interaction.

### Eligibility

Eligibility answers: **may this move be attempted/shown?**

Examples:

- actor knows Claim X;
- item is owned/present;
- relationship threshold is met;
- target is present;
- previous Story/Event state allows it.

A blocked move was never attempted. It is not equivalent to a failed check.

### Resolution

Initial resolution strategies:

```text
automatic / no check
condition
skill check
```

The architecture does not force a dice check onto ordinary dialogue/actions.

## 6. Skill Checks

A Skill Check is one resolution strategy, not a parallel story engine.

Conceptual definition:

```text
skillId
difficulty
roll policy
contextual modifiers
named outcome keys
```

Default authoring outcomes:

```text
success
failure
```

The persisted model must permit future additional outputs such as critical success/failure or custom named outcomes.

The exact dice formula, skill-value source, critical thresholds and retry policy are runtime/gameplay policy decisions and are intentionally not hard-coded into the Story Canvas architecture.

Runtime resolution should produce a structured explainability trace (`CheckResolved`) with actor, skill, roll/modifiers, total, difficulty, selected outcome and provenance.

## 7. Failure is narrative content

Failure is not synonymous with “nothing happened”.

A failure outcome may:

- continue to a different Story branch;
- change a relationship or mood;
- create suspicion/knowledge/memory;
- transfer/lose an item;
- change a goal/route/presence intention;
- close one opportunity and open another.

Story Brain should diagnose an accidental dead/empty failure path, but it must not require success and failure branches to have equal length.

## 8. Truth, deception and knowledge

The cognition chain remains:

```text
ObjectiveFact
    ↓ may be described/contradicted
Claim / Statement
    ↓ held differently by each character
CharacterKnowledge
    ↓ may become salient/remembered
MemoryTrace
```

A Narrative Move that communicates a Claim adds **speaker intent**, not a second truth system.

Examples:

- false Claim + deliberate `deceive` intent → lie attempt;
- false Claim + speaker sincerely believes it → mistaken information, not deliberate lying;
- true Claim + failed persuasion → truth was told but listener may reject it;
- false Claim + successful deception → listener may believe it, but ObjectiveFact is unchanged.

`CharacterKnowledgeState` remains generic for every Character. No record means that character is unaware of the Claim.

## 9. Outcomes and effects

A resolved move selects a named Outcome.

Outcome can both route executable Story flow and reference typed effects affecting:

- Story state;
- Fact/Claim/Knowledge/Memory;
- relationships/mood;
- goals;
- inventory/items;
- desired route/presence;
- runtime/history events.

The resolver decides **which Outcome** occurred. The Outcome/Effect execution boundary decides **what state changes**. These responsibilities stay separate.

## 10. Reusable events and large variation

Large event counts must come from composition instead of pair-specific hard-coded event types.

Reuse path:

```text
EventTemplate
  ├─ RoleSlots
  ├─ guards
  ├─ Narrative Move / nested flow
  └─ Outcomes
        ↓
RoleBinding
        ↓
Concrete occurrence
```

The same authored interaction template may bind different Characters, Claims, Items or Locations without duplicating canonical definitions.

Unique authored scenes remain first-class. Templates are a scalability mechanism, not a requirement that every scene be systemic.

## 11. Story Brain becomes resolution-aware

For Conditions and Skill Checks, Story Brain analyzes **all authored executable outcomes** without rolling dice.

It may report:

- a missing prerequisite;
- an impossible knowledge gate;
- dependencies of success/failure/custom outcomes;
- an accidental immediate dead outcome;
- a Claim/Knowledge effect that unlocks later content;
- a branch with no meaningful state change or continuation.

It must never choose the player's result during authoring analysis.

## 12. Persistence and implementation boundary

Schema v2 remains the active persisted project format for the current implementation. Existing v2 payloads must hydrate newly introduced collections safely.

Long-term logical projections remain distinct:

```text
Authored Project
Editor Workspace State
Preview / Simulation State
```

They may temporarily share one storage envelope, but history/serialization operations must explicitly select the intended projection.

## 13. Current implementation delta

Current code already has strong foundations for:

- two workspaces;
- Story pan/zoom/free nodes and basic connections;
- unscheduled Story placement;
- World-Time pan/zoom/visible-time projection;
- ObjectiveFact / Claim / CharacterKnowledge foundation;
- Project Library;
- basic structural continuity analysis;
- schema v2 hydration/migration.

Not yet implemented as persisted/runtime features:

- explicit `edgeMode: reference | executable` migration;
- first-class NarrativeMove / SkillCheck definitions;
- named resolution outcome ports;
- resolution-aware Story Brain;
- full Focus/Why/Impact/Coverage/Bridge query service;
- runtime dice/skill resolution;
- runtime gossip/memory/behavior simulation.

## 14. Recommended implementation order

Do not jump directly into Living Simulation.

1. Safe Story edge mode + migration.
2. Narrative Interaction authoring foundation: moves, guards, automatic resolution, intent, named outcomes.
3. Skill Check authoring: skill/difficulty/roll-policy references + success/failure/custom executable ports.
4. Reconcile Knowledge seams for truth/intent/belief.
5. Story Brain graph index + Focus/Impact.
6. Why / availability explanation.
7. Coverage / continuity + outcome-aware diagnostics.
8. Bridge Candidate Finder.
9. Persistence projection split/validation.
10. Only then implement runtime Narrative Move/Skill Check resolution and broader Living Simulation slices.

## 15. Gate

The v10 design is accepted with local runtime-policy spikes still open for:

- exact dice formula;
- skill-value source;
- critical/retry policy;
- Story Brain ranking thresholds;
- scale/performance worker/index choices;
- graph UI adapter compatibility;
- physical persistence split choice.

These do not require rebuilding the accepted architecture.
