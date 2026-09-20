# A57 Contract — Vertical Slice Narrative: Day One -> Day Two

Status: **ACTIVE / S1 AUTHORING**  
Stage: **A57 — Vertical Slice Narrative: Day One -> Day Two**  
Risk: **HIGH**  
Stable source: `93-days-editor` @ `5058d1bb699fa5eba3a02aeaa2ebe45acdd9624a`  
Feature branch: `feature/a57-day-one-day-two`  
Decision date: **2026-09-21**

## 1. Source/evidence boundary

Project source supports the following opening facts and design rules:

- the protagonist arrives by intercity bus with a button phone, some cash, luggage/documents and only approximate destination information;
- there is no city map, no return ticket and no guaranteed person meeting the protagonist;
- a strong opening candidate is that the person called after arrival simply does not answer;
- first minutes may include looking around, asking directions, calling, waiting, taking transit, walking, finding food/announcements, meeting someone or choosing a wrong route;
- time should form history rather than punish the player for not optimizing every minute;
- missed events should normally become another history, not a generic “quest failed” state;
- sleep and sleep debt are canonical physical systems; good sleep should matter;
- the first prototype may cover bus -> arrival -> finding a way through the city -> first evening -> first night.

A56 already provides the traversable Arrival Corridor, typed travel, waiting, explicit player world start and real standalone traversal.

Repository evidence confirms A57 can reuse canonical runtime mechanics:

- Narrative Moves already support Knowledge, relationship, mood, item, Story-state and Memory effects;
- Story runtime already supports exact scheduled opportunities, explicit execute/miss decisions, miss windows and append-only occurrence history;
- NPC decisions can produce canonical Move occurrences without the protagonist as actor;
- body runtime already supports typed `sleep` effects and sleep recovery during canonical simulation advancement;
- Player actions already execute canonical Moves through A53 session replacement;
- A56 wait/travel already advance the same canonical simulation clock.

## 2. Root gaps

A57 is primarily an authored-content stage. Only three integration gaps are allowed to expand runtime surface:

1. **initial local NPC presence**: A56 world start places only the player, while a real opening conversation needs an actually present NPC;
2. **overnight sleep choice**: body mechanics exist but the Player has no authored lodging/sleep command;
3. **player-facing scheduled opportunity**: Story runtime can execute/miss scheduled work, but the Player has no thin wrapper/surface for explicit opportunity decisions.

A57 must not invent a second narrative engine, automatic schedule-to-presence projection, phone subsystem, economy or food system.

## 3. Current content decisions

A57 fixes only the minimum fiction required for the slice.

### First failed contact

The protagonist has an **unnamed/provisional local contact** reachable by a saved/written number.

The first call after arrival receives no answer.

This does **not** decide:
- final identity of that contact;
- why they do not answer;
- whether they are trustworthy;
- whether they later become central.

### First full conversation

The first complete branching conversation is with the **bus-station clerk** already present in A56.

This keeps the scene low-commitment and allows route information to be learned through canonical Claims without prematurely introducing a central cast member.

### Optional event

A short scheduled station opportunity exists during the opening morning. It can be explicitly seen or missed and records a canonical Story occurrence.

Its story function is to prove alternate history, not to introduce a major plot reveal.

### Lodging

The A56 student dormitory remains a **working first-night destination**, not a permanent/final home decision.

## 4. A57-S1 — authored Day One/Day Two narrative

S1 extends the A56 content builder with:

- provisional off-screen contact character;
- authored Claims/Facts for route/contact knowledge;
- first unanswered phone Move;
- multi-turn clerk conversation with multiple canonical Moves;
- at least one choice that changes Knowledge;
- at least one choice that changes a relationship axis;
- at least one Memory consequence;
- one scheduled optional player opportunity with a miss window;
- one scheduled NPC-to-NPC Story occurrence with no protagonist participant;
- Day Two morning Story nodes whose available actions/labels depend on Day One runtime state.

### Conversation rule

A “full conversation” means at least two sequential Story nodes/turns, with the first turn activating the next via canonical Story-state effects. It is not one menu with several mutually exclusive lines followed by immediate closure.

## 5. A57-S2 — minimal narrative integration

### 5.1 Initial NPC Actual Presence

A57 may extend the existing optional `playerStart` authored definition with additional explicit initial Actual Presence placements.

Rules:

- A52 fresh artifact still compiles with an empty Actual Presence runtime map;
- placements apply only after A53 materialization through the existing world-start boundary;
- existing runtime Actual Presence always wins;
- only explicitly authored character/location pairs are placed;
- schedules remain declarative intent and are never copied into Actual Presence;
- invalid references reject bootstrap atomically.

### 5.2 Player scheduled opportunities

A thin Player wrapper may expose currently due Story work involving the resolved protagonist.

Rules:

- due/miss semantics remain owned by `consumeNarrativeStoryWork`;
- Player supplies only work id + explicit `execute` or `miss` decision;
- zero-duration opportunities may complete immediately;
- expired work is recorded through canonical miss handling, never by UI-only flags;
- NPC-only Story work is never shown as a protagonist choice.

### 5.3 Authored overnight sleep

A57 may add optional authored sleep options with:

- stable id;
- location id;
- label;
- earliest local minute when the option is valid;
- target wake minute on the next day.

Execution must:

1. validate the option/location/player;
2. reject before the authored earliest time;
3. compute an exact next-day duration;
4. apply the canonical body `sleep` effect;
5. advance canonical simulation by the full duration;
6. reject atomically at project end if the next-day wake cannot be reached;
7. replace A53 session state only after successful canonical application.

The Player may offer an authored “wait until sleep time” convenience, but that waiting must delegate to A56 canonical wait.

Sleep quality, beds, hotels, heavy meals and food belong to A58 unless a narrower blocker appears.

## 6. Day/time presentation rule

A57 may tighten Player action projection so a Story node with `placement.day` appears only on that runtime day.

This is a presentation scoping rule only.

A57 does **not** reinterpret `placement.minuteOfDay` as a general action availability window; exact-minute/miss semantics remain Story runtime ownership.

## 7. A57 invariants

- **A57-I01** — Narrative Project remains authored truth.
- **A57-I02** — Actual Presence remains runtime truth.
- **A57-I03** — schedules never become Actual Presence automatically.
- **A57-I04** — A52 artifact format/version and fresh empty Actual Presence remain unchanged.
- **A57-I05** — phone call is authored narrative content, not a fake phone subsystem.
- **A57-I06** — Knowledge/relationship/memory consequences use canonical Outcome effects only.
- **A57-I07** — scheduled event execute/miss uses canonical Story execution only.
- **A57-I08** — NPC-only occurrence can happen without protagonist participation.
- **A57-I09** — sleep uses body effect + simulation, never direct clock/body mutation.
- **A57-I10** — no hidden RNG.
- **A57-I11** — no money/economy/food implementation in A57.
- **A57-I12** — unresolved contact identity/reason remain unresolved.
- **A57-I13** — Day Two reflects runtime history, not a duplicated branching script state.
- **A57-I14** — two legitimate runs may diverge in Knowledge/relationships/occurrences and both remain valid.

## 8. Verification design

### S1 must prove

1. authored references validate;
2. schedules have no conflicting authored windows;
3. first call requires the button phone and records canonical Knowledge/Memory consequence;
4. clerk conversation has at least two sequential turns;
5. different choices produce different relationship and/or Knowledge state;
6. optional event has an authored miss window;
7. NPC-only scheduled Story node has no protagonist participant;
8. Day Two nodes reference Day One state through canonical guards/conditions;
9. A52 compiles the project deterministically.

### S2 must prove

1. fresh artifact still has empty Actual Presence;
2. world start explicitly places player + authored opening NPCs;
3. existing runtime presence is never reset by bootstrap;
4. due player Story opportunity can execute and append an occurrence;
5. expired/missed opportunity records canonical `missed` occurrence and blocked Story state;
6. NPC-only Story work is not projected as a Player choice;
7. overnight sleep crosses Day One -> Day Two using canonical simulation;
8. fatigue recovers according to existing body policy;
9. sleep rejects atomically before authored time or project end;
10. Day Two-only player actions are hidden on Day One.

### S3 must prove

Two complete integration runs from the same compiled authored project:

**Run A**
- unanswered call;
- constructive clerk conversation;
- optional event executed;
- reaches dorm;
- sleeps;
- wakes on Day Two with learned route knowledge, changed relationship and executed occurrence.

**Run B**
- different clerk choice/follow-up;
- optional event missed/expired;
- reaches dorm;
- sleeps;
- wakes on Day Two with a different valid Knowledge/relationship/occurrence history.

Both runs must:
- remain valid player sessions;
- preserve authored project definitions;
- reach Day Two through canonical time/body runtime;
- expose different Day Two actions/feedback based on prior runtime state.

Real-browser closure must prove at least one complete run from Day One arrival into Day Two.

## 9. Minimal slices

### A57-S1 — Day One/Day Two authored narrative
- content builder layered on A56;
- Claims/Facts/contact;
- unanswered call;
- multi-turn clerk dialogue;
- optional event;
- NPC-only Story work;
- Day Two reflection nodes;
- focused authoring/runtime-effect tests.

### A57-S2 — presence/opportunity/sleep integration
- additive world-start NPC placements;
- Player Story-work decision boundary + presentation;
- additive authored sleep options;
- canonical Player sleep boundary;
- day-scoped action projection;
- focused compatibility/atomicity tests.

### A57-S3 — divergent histories + browser closure
- two-run integration regression;
- NPC-only occurrence proof;
- standalone real-browser Day One -> Day Two path;
- self-review/change record/roadmap closure;
- final exact-head full CI.

## 10. Explicit non-goals

A57 does not finalize or implement:

- contact identity/motive;
- final lodging status;
- money, fares or purchases;
- food/satiety actions;
- SMS UI/phone app;
- full autonomous world scheduler;
- sleep quality by furniture/location;
- central political/city conflict;
- romance or major companion arcs;
- Day Two beyond the first reflected morning beat.

Those belong to A58+ or later content work.

## 11. Recovery

All authored additions are additive.

New schema-v3 optional fields must hydrate with compatibility defaults and remain absent-safe for older v3 projects/artifacts.

Runtime rollback must leave A52-A56 artifact/session/host/presentation/travel/wait behavior intact.

## 12. Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PENDING**
- E5 Exact-head verification: **PENDING**
- E6 Self-review: **PENDING**
- E7 PR/CI: **PENDING**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**
