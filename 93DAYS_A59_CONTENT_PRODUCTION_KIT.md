# 93 Days — A59 Content Production Kit

Status: **ACTIVE / A59-S3**  
Stage: **A59 — Vertical Slice Closure & Content Production Loop**  
Canonical source: Narrative Project  
Reference implementation: A56-A58 vertical slice

## 1. Purpose

This is a production checklist, not a second content format.

Use it when adding or revising 93 Days content so that each batch follows the same loop:

`author -> validate -> explain -> preview alternatives -> compile -> play -> observe -> classify -> fix at owner`

All authored truth stays in the existing Narrative Project structures under `src/domain/narrative/*` and the project/editor authoring surfaces.

## 2. Smallest safe content batch

Prefer one coherent player-facing change at a time:

- one location/route cluster;
- one NPC routine or presence change;
- one Story beat/dialogue;
- one meaningful choice and its authored Outcomes;
- one optional/missed event;
- one delayed consequence;
- one item/economy interaction.

Do not mix a new mechanic into a content batch unless the authored need first proves the mechanic is missing.

## 3. Authoring checklist

### Characters

Author/verify:

- unique character id and player-facing name;
- cognition tier appropriate to the character;
- valid default BehaviorProfile reference when required;
- participant/target references from Story/Moves point to existing characters.

Check:

- Story Brain reference diagnostics;
- WORLD/TIME when routine/presence matters;
- actual runtime presence separately from authored schedule.

### Locations and scenes

Author/verify:

- canonical location id/name;
- scene only when presentation needs it;
- route endpoints reference existing locations;
- Story placement location is deliberate.

Check:

- Player travel can actually reach the intended location;
- location-specific Story/offer/action availability is derived from runtime state, not UI assumptions.

### Routines and schedules

Author/verify:

- BehaviorProfile ownership;
- active range;
- recurrence;
- exact/period time window;
- target location;
- exceptions only when required.

Check:

- schedule diagnostics in Story Brain;
- WORLD/TIME source navigation for conflicts;
- Scheduled Presence is never treated as Actual Presence automatically.

### Story nodes

Author/verify:

- id, kind, title and participants;
- activation state;
- placement only where day/time/location is genuinely authored;
- runtimePolicy for scheduled/optional work;
- `missAfterMinutes` only when the opportunity really expires.

Check:

- one-shot/repeatable semantics;
- expected state after execute/miss;
- no player failure banner is substituted for authored missed-history semantics.

### Moves

Author/verify:

- Story node owner;
- player/NPC actor;
- targets;
- Guards/Conditions;
- resolution;
- authored Outcomes.

Check:

- Story Brain WHY before implementation changes;
- target/action is visible only when runtime conditions justify it;
- no UI-only duplicate guard logic.

### Outcomes and effects

Author/verify:

- Outcome label reflects what the player experiences;
- effects use canonical effect types;
- Story-state changes are explicit;
- Knowledge, relationship, memory and placement effects target canonical entities.

Check:

- Preview execute/force uses existing authored Outcomes only;
- scenario comparison shows expected downstream runtime changes;
- failed/blocked execution does not partially mutate runtime.

### Claims and Knowledge

Author/verify:

- Claim id/text/stance;
- objective fact link only when it exists;
- initial Knowledge only for facts known at start;
- learned Knowledge comes from canonical Outcome effects.

Check:

- Story Brain Claim Focus/Impact reaches dependent Moves;
- Day Two or delayed content reads current runtime Knowledge, not a copied flag.

### Relationships

Author/verify:

- direction matters: `fromCharacterId -> toCharacterId`;
- axis is existing/canonical;
- effect delta is intentional and proportionate.

Check:

- compare two Preview branches;
- test the relationship state used by any later Guard/Outcome.

### Items and containers

Author/verify:

- ItemDefinition properties;
- concrete ItemInstance;
- authored initial placement;
- carry weight/volume/size when relevant;
- food properties only for food;
- container/pockets use existing carrying rules.

Check:

- runtime placement remains an overlay;
- packing uses canonical capacity/cycle/ownership rules;
- consumed items become runtime-unplaced without rewriting authored placement.

### Economy and fares

Author only when the slice needs it:

- currency stays project-level;
- integer minor units;
- purchase offer references one concrete item instance and location;
- route fare is authored on the route.

Check:

- insufficient funds rejects atomically;
- successful purchase/fare charges once;
- price values marked provisional unless separately researched/verified.

### Optional/missed events

Author/verify:

- explicit Story placement;
- runtime policy;
- miss window;
- consequence of execute vs miss.

Check:

- both histories are legitimate;
- later content can distinguish them through canonical Story/runtime history.

### Delayed consequences

Author/verify:

- later Move/Story Guard reads the earlier canonical state;
- consequence is meaningful to the player;
- no duplicate shadow flag is introduced.

Check:

- Story Brain WHY explains why the later action is available/blocked;
- Preview can compare the earlier alternatives;
- integration test reaches the later consequence through runtime history.

## 4. Validation budget

### Per authored edit

Use the cheapest evidence first:

1. reference/structural validation for the touched entities;
2. focused Story Brain diagnostics;
3. Story Brain WHY for changed Guards/availability;
4. focused Preview trace/fork when branch consequences change;
5. affected content/unit test.

Do not start with full CI to diagnose a local content error.

### Per coherent content batch

Run/prove:

- deterministic compile;
- affected canonical application integration;
- Player regression for player-visible flow;
- save/restore regression when runtime history/state changes;
- lint/type/build.

### Before merge

Required:

- exact-head full 93 Days Branch Check GREEN;
- self-review against the stage contract;
- Story Brain/source-navigation traceability check;
- change record and roadmap reflect reality;
- no unresolved BLOCKER/HIGH defect;
- explicit merge authorization.

## 5. Story Brain workflow

For a player-visible consequence:

1. Focus the Story node, Move or Claim.
2. Read **WHY** for current availability and guard traces.
3. Read **Impact** for dependent authored entities.
4. Read **Coverage/diagnostics** for broken references or schedule consistency.
5. Use **К источнику** rather than copying the finding into a second tracking structure.
6. Fix the canonical authored owner.
7. Repeat the focused query before broad CI.

A59 evidence: the Day Two known-route Move changes from blocked to available after the player learns the transfer-route Claim, and Claim Impact reaches that Move.

## 6. Preview workflow

Use Preview only as an isolated authoring sandbox.

For a branch:

1. create a scenario from current project/runtime state;
2. add explicit test-only runtime inputs only when necessary;
3. fork before the meaningful choice;
4. execute canonical Move resolution when possible;
5. force only an already-authored Outcome when inspecting an otherwise hard-to-reach branch;
6. compare downstream runtime paths;
7. confirm source project is unchanged.

A59 evidence: polite vs abrupt clerk choices produce different relationship/memory/runtime occurrence state without mutating source content.

## 7. Player verification workflow

A content batch is not player-ready because Preview looks correct.

For player-facing proof:

- compile the same canonical project;
- bootstrap the Player session;
- use canonical Player/application APIs;
- verify Actual Presence and time;
- exercise the affected content through the Player path;
- save/reload/continue if the change affects persistent history;
- preserve authored definitions across runtime mutation.

The standalone Player now exposes explicit **Сохранить** and **Продолжить** controls backed by the existing canonical Player save codec.

## 8. Source navigation

When a finding appears:

- Story semantics -> STORY workspace;
- schedule/routine timing -> WORLD/TIME workspace;
- Move findings -> owning Story node canvas;
- Character/item findings -> existing canonical entity focus;
- do not invent documentation-only coordinates as a substitute for editor navigation.

A diagnostic should answer: **what canonical entity owns the correction?**

## 9. Observation-to-fix rule

Before changing code/content, classify the observation:

- **content** — authored text/data/branching/schedule/entity choice;
- **presentation** — Player/editor surface does not expose existing canonical capability clearly;
- **tooling** — authoring/diagnostic workflow is missing or misleading;
- **runtime-mechanics** — canonical semantics are actually insufficient or wrong.

Only the last category justifies runtime-mechanics scope, and it requires explicit reclassification when ownership/semantics become HIGH risk.

## 10. Batch handoff template

For each new content batch record:

- batch id/title;
- canonical authored files/entities;
- player route/history used;
- expected consequence;
- Story Brain Focus/WHY evidence;
- Preview branch evidence if applicable;
- focused tests;
- exact implementation SHA;
- full CI run;
- observations and classification;
- unresolved decisions.

This record is traceability metadata only. It is not content and must never become another runtime input.
