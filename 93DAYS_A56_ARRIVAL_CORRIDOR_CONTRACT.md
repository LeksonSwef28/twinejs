# A56 Contract — Vertical Slice World: Arrival Corridor

Status: **ACTIVE / S1 AUTHORING**  
Stage: **A56 — Vertical Slice World: Arrival Corridor**  
Risk: **HIGH**  
Stable source: `93-days-editor` @ `db9d309080200b4851ed4cfcf5986a23a481b003`  
Feature branch: `feature/a56-arrival-corridor`  
Decision date: **2026-09-20**

## 1. Evidence / production need

A55 is merged and post-merge verified. The standalone Player can now show:

- world day/time;
- current Actual Presence location;
- actually present NPCs;
- canonical Narrative Moves and outcomes;
- body/carrying state.

The immediate product gap is no longer presentation. It is authored playable world content and the missing travel orchestration required to move through that content.

Project concept evidence for the opening establishes:

- the protagonist arrives by intercity bus;
- the main bus station sits roughly in the first third of a long, unfamiliar city, neither central nor edge;
- around it are old development, a transport square, kiosks, route taxis/taxis and city transport;
- the protagonist has only an approximate understanding of where to go;
- the intended first minutes include looking around, asking directions, waiting, taking transit, walking, buying food and potentially choosing a wrong route;
- the design goal is to make the city feel large and confusing, not to reward one uniquely correct route;
- exact city name, exact route numbers, exact prices and exact final lodging fiction are not fixed enough to hard-code as immutable canon here.

Repository evidence additionally shows:

- `NarrativeLocation`, `NarrativeScene`, `NarrativeCharacter`, schedules and Story placements are already canonical authored data;
- A52 intentionally compiles a **fresh runtime with empty Actual Presence**;
- Actual Presence is runtime truth and is changed explicitly through `setNarrativeCharacterActualLocation`;
- simulation time advances through `advanceNarrativeProjectSimulation`;
- Narrative Moves currently cannot move a character and consume travel time as one typed authored operation;
- schedules are declarative intent only and must never overwrite Actual Presence automatically.

**Root cause classification:** A56 contains two different problems and must not solve them in one opaque patch:
1. missing authored Arrival Corridor content;
2. missing canonical travel orchestration.

## 2. Product goal

Create the first traversable, player-facing piece of the city while preserving the existing authored/runtime ownership model.

Target play shape:

`arrival bootstrap -> bus station -> local route choice -> meaningful travel time -> another location -> NPC Actual Presence remains independent`

A56 does not yet attempt the full Day One story. That is A57.

## 3. A56-S1 — authored Arrival Corridor

S1 uses only the existing Narrative Project schema.

It will add a deterministic authored content preset that contains the opening corridor:

- intercity bus station;
- transport square immediately outside;
- nearby stop / route-taxi boarding point;
- a small inexpensive food point/kiosk area;
- one intermediate transfer/landmark location;
- a provisional student-dormitory destination as a **working lodging candidate**, not a final story decision;
- protagonist + several low-story-commitment NPC roles;
- authored behavior profiles and non-overlapping routine rules that express where NPCs are expected to be;
- Story nodes describing arrival/observation opportunities without forcing A57 narrative;
- physical starting items already established by project concept where the current schema supports them: button phone and carried luggage/documents can be represented; money remains out because no canonical economy state exists.

### S1 content naming rule

A56 may use neutral functional names such as “Междугородний автовокзал”, “Транспортная площадь” and “Студенческое общежитие”.

It must not invent:

- final city name;
- final street/route numbers;
- branded food businesses;
- final roommate/contact identities;
- final prices or money balance;
- central plot facts.

## 4. A56-S2 — canonical travel contract

Travel is a runtime/application orchestration gap, not a UI shortcut.

A56-S2 may introduce the smallest typed authored travel definition necessary to support the corridor. The preferred ownership is a dedicated travel/route definition rather than encoding duration in UI strings or abusing Story descriptions.

A travel definition must at minimum identify:

- stable route id;
- origin location;
- destination location;
- mode/label;
- duration in whole minutes;
- optional physical action class only when required by an existing physical rule.

Executing travel must:

1. verify the player is actually at the authored origin;
2. verify referenced locations/route are valid;
3. evaluate any existing physical blocker when the route declares one;
4. advance canonical simulation time by authored duration;
5. preserve all due-work/body/injury traces from the simulation orchestrator;
6. change only the travelling character’s Actual Presence to the destination after successful time advancement;
7. leave other characters’ Actual Presence untouched;
8. enter the A53 player session only through the existing project replacement boundary;
9. be atomic on invalid input;
10. never project schedules into Actual Presence.

### Ordering rule

A56 travel uses:

`validate -> physical eligibility -> advance time -> apply traveller Actual Presence -> session replacement`

If time advancement is clamped by project end so that the full authored duration cannot be applied, travel must reject atomically rather than teleport after a partial trip.

## 5. Arrival bootstrap boundary

Because A52 fresh artifacts intentionally contain empty Actual Presence, A56 must not weaken the compiler by smuggling live presence into `initialRuntime`.

A56 may introduce an explicit player-world bootstrap operation that places the resolved protagonist at the authored arrival location when starting the Arrival Corridor preset.

The bootstrap must be:

- explicit;
- deterministic;
- one-purpose;
- validated against authored character/location ids;
- separate from schedule resolution;
- safe to skip for projects that are not the Arrival Corridor.

If S2 finds a cleaner general world-start contract is required, that decision must be documented before implementation.

## 6. A56 invariants

- **A56-I01 — Narrative Project remains authored truth.**
- **A56-I02 — Actual Presence remains runtime truth.**
- **A56-I03 — Schedules never directly overwrite Actual Presence.**
- **A56-I04 — A52 fresh-runtime semantics remain unchanged.**
- **A56-I05 — Travel duration is authored typed data, never UI-only text.**
- **A56-I06 — Travel uses canonical simulation advancement; it does not directly edit clock fields.**
- **A56-I07 — Travel is atomic on invalid route/origin/blocker/project-end conditions.**
- **A56-I08 — Only the travelling character changes location.**
- **A56-I09 — No hidden randomness.**
- **A56-I10 — No fake money/economy state.**
- **A56-I11 — Content does not prematurely canonize unresolved fiction.**
- **A56-I12 — A55 Player remains a projection/action surface, not a second travel engine.**
- **A56-I13 — NPC schedules are authored intent; actual NPC location may differ at runtime.**
- **A56-I14 — Content preset compiles deterministically through A52.**

## 7. Verification design

### S1 must prove

1. corridor preset has unique stable ids;
2. required locations exist and references are valid;
3. protagonist id remains the A55-compatible explicit `player`;
4. at least three NPC roles exist with behavior profiles/routines;
5. routine windows do not overlap ambiguously;
6. Story placements only reference known locations/characters;
7. starting physical items reference known definitions/owners;
8. project reference validation reports no broken authored references;
9. schedule conflict analysis reports no conflicts;
10. A52 compiles the preset deterministically;
11. compiled fresh runtime still has empty Actual Presence.

### S2 must prove

1. explicit arrival bootstrap establishes player Actual Presence at the station;
2. valid travel changes location and advances exactly authored minutes;
3. body state advances with travel time;
4. Story due-work crossing the route interval is preserved in the trace/result;
5. another NPC’s Actual Presence is unchanged;
6. wrong-origin travel rejects without time/location mutation;
7. unknown route/location rejects atomically;
8. physically blocked travel rejects atomically when applicable;
9. project-end partial travel rejects without teleport;
10. Player can choose at least two routes with meaningfully different durations;
11. real-browser Player shows the new location and time after travel.

## 8. Minimal slices

### A56-S1 — Corridor authored data
- content preset/builder;
- locations/scenes/characters;
- schedules;
- opening Story metadata;
- starting physical items supported by current schema;
- focused content validation tests.

### A56-S2 — Travel domain/application boundary
- typed route definitions;
- validation/reference checks;
- deterministic execution orchestration;
- player-session action boundary;
- Player presentation for route choices;
- focused runtime tests.

### A56-S3 — Arrival bootstrap + standalone browser proof
- explicit Arrival Corridor world start;
- standalone artifact fixture;
- at least two travel choices;
- real-browser station -> route -> destination proof;
- exact-head closure CI and self-review.

## 9. Explicit non-goals

A56 does not finalize:

- city name;
- exact transit line numbering;
- economy/prices/ticket purchase;
- full conversation content;
- unanswered phone-contact narrative;
- relationship/Knowledge consequences;
- sleep/night/Day Two;
- autonomous NPC decision execution;
- route-finding AI.

Those belong to A57/A58 unless a narrower mechanics prerequisite is proven.

## 10. Recovery

S1 is additive authored preset code only.

For S2/S3, rollback must preserve A52-A55 artifact/session/host/presentation behavior. Any new route data must either be additive to schema with explicit compatibility defaults or live in a dedicated compatible authored extension that old projects can omit.

## 11. Gate state

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
