# 93 Days — POST-A52 GAME PRODUCTION ROADMAP

Status: **ACTIVE / GAME PRODUCTION**  
Stable source reviewed: `93-days-editor` @ `5058d1bb699fa5eba3a02aeaa2ebe45acdd9624a`  
Decision date: **2026-09-19**

## 1. Product target

A47-A52 completed the editor, authoring/debug laboratory and deterministic compiler/export boundary. The next product is not another editor stage. It is a real player-facing game built from the same canonical Narrative Project and canonical TypeScript runtime.

Target flow:

`Narrative Project -> narrative-runtime-artifact -> canonical player runtime session -> player presentation -> vertical slice -> content production -> 93-day game`

The first production milestone is a genuine slice of **«93 дня до конца нашего лета»**: arrival at the intercity bus station, meaningful world time, movement, Actual Presence, contact/conversation, consequential choices, material resources, fatigue/food, a missable event, independent NPC activity, night/sleep, next day and save/continue.

## 2. Repository evidence after A52

The reviewed stable head already contains the mechanics that must remain canonical:

- `src/domain/narrative/*` owns Guards/Conditions, Moves, Outcomes/effects, schedules, cognition/Knowledge, memories, relationships, body, injuries, carrying/items, Story runtime and simulation kernel;
- `src/application/narrative/*` already orchestrates Move resolution/application, Actual Presence, simulation advancement, Story-work execution/interruption, physical actions/items and NPC decisions;
- A52 compiles a deterministic `narrative-runtime-artifact` v1 containing authored projection + fresh initial runtime;
- A52 runtime proof intentionally parses the artifact as inert data and explicitly executes no gameplay semantics;
- current `story-play`, `story-test` and `story-proof` routes launch generic Twine Story Format output, not a Narrative player runtime;
- current Narrative provider/persistence is editor-owned; runtime snapshots already prove runtime-only save/restore projection, but there is no player-owned session/bootstrap boundary.

Therefore the immediate gap is **runtime bootstrap/session/host ownership**, not a missing second mechanics engine.

## 3. Gap classification

| Area | Current state | Production classification |
|---|---|---|
| Canonical mechanics | Broad runtime foundation exists | **Reuse; do not rebuild** |
| Artifact | Deterministic v1 exists | **Ready input boundary** |
| Artifact -> live player session | A53 materializer/session boundary verified | **Ready runtime boundary** |
| Player save/load ownership | A53 runtime-only player save codec verified | **Ready player save boundary** |
| Dedicated player host / standalone packaging | A54 dedicated entry, package boundary and real-browser boot verified | **Ready host boundary** |
| Scene/dialogue/HUD/inventory UI | A55 player shell + canonical Move feedback verified | **Ready presentation boundary** |
| Bus-station/day-one world | A56 Arrival Corridor authored world + standalone traversal verified | **World foundation ready; A57 narrative next** |
| Money/economy | Required by slice; no reviewed canonical gameplay contract yet | **Gameplay/content contract gap** |
| Travel/navigation time costs | A56 typed authored routes, canonical travel and Player waiting verified | **Ready for A57 narrative use; fares remain A58** |
| Fatigue/sleep/food/heavy meal | Canonical body mechanics exist | **Integration/presentation/content gap** |
| Physical inventory/containers | Canonical item/carrying mechanics exist | **Integration/presentation/content gap** |
| Independent NPC decisions | Canonical explicit decision APIs exist | **Opportunity/orchestration/content gap** |

## 4. Non-negotiable production rules

- Narrative Project remains the only authored narrative source of truth.
- The compiled artifact is derived input, never an authoring surface.
- Player runtime imports/reuses canonical TypeScript mechanics; exported HTML must not contain a handwritten replacement resolver/effect/simulation engine.
- A52 compiler proof stays validation-only and is not promoted into the game engine.
- View/editor state never becomes player gameplay state.
- Scheduled Presence remains distinct from Actual Presence.
- Runtime save data stores mutable runtime/session state, not a second authored project.
- Gameplay mechanics are added only when a vertical-slice need proves them.
- Missed content should usually create another history, not merely a failure banner.

## 5. Roadmap

### A53 — Player Runtime Boundary & Session Bootstrap

**Status:** **DONE / STABLE** — S1 #474, S2 #478/#479, S3 #480; merged and exact stable SHA `ea8ba7f03781ead91f63dd3fccd281dfb2a9ad2a` post-merge verified by **#482 GREEN**.

**Goal:** make a compiled artifact materialize into a player-owned session that can invoke the existing canonical runtime and can be saved/restored without the editor shell.

Deliverables:

- artifact compatibility/materialization boundary;
- deterministic fresh player session from `NarrativeRuntimeArtifactV1`;
- explicit player-session ownership of mutable runtime state;
- runtime-only save/load contract reusing existing projection semantics;
- regression proof that canonical simulation/Move/Story/physical APIs work after artifact bootstrap;
- no player UI and no new narrative semantics in the bootstrap layer.

Exit proof: a test can compile authored data, bootstrap a fresh player session, advance meaningful time, apply a canonical Move/effect, save runtime state, restore it and continue with authored definitions unchanged.

### A54 — Canonical Player Host & Standalone Packaging

**Status:** **DONE / STABLE** — S1 #483, S2 #484, S3 #489; final closure #490; merged as `0b115b52b42ef05d16bc213865cc07b3a2eb6e76` and post-merge verified by **#491 GREEN** plus Jest/Playwright/ESLint checks.

**Goal:** run A53 through a dedicated player entry/host instead of Twine editor play/test routes.

Deliverables:

- player-specific application entry or host route separated from editor providers;
- artifact loader with visible compatibility failures;
- canonical runtime bundle produced from the same TypeScript modules used by tests/editor Preview;
- self-contained player HTML/package that carries artifact data + canonical runtime bundle;
- development launch path from Narrative Export without persisting generated Passages;
- smoke test proving the standalone host boots a session.

Exit proof: exported/standalone player host loads the exact A52 artifact and runs canonical runtime code without the editor app and without runtime logic copied into Story Format JavaScript.

### A55 — Player Presentation Shell

**Status:** **DONE / STABLE** — S1 #494, S2 #497, S3 #498, closure #499; merged as `db9d309080200b4851ed4cfcf5986a23a481b003` and post-merge verified by **#500 GREEN** plus Jest/Playwright/ESLint/Prettify.

**Goal:** expose the smallest real game UI over A53/A54.

Deliverables:

- scene/location description;
- visible local characters derived from Actual Presence;
- player actions and consequential feedback;
- dialogue/response presentation backed by canonical Narrative Moves;
- world-time HUD with human-readable day/time;
- minimal body state, inventory/container and money surfaces required by the slice;
- transition/loading/error states appropriate to player runtime, not editor diagnostics.

Exit proof: a player can perform canonical actions without opening editor/debug UI.

### A56 — Vertical Slice World: Arrival Corridor

**Status:** **DONE / STABLE** — S1 #503, S2a #505, S2b #506, S3 #509/#510, closure #511; merged as `5058d1bb699fa5eba3a02aeaa2ebe45acdd9624a` and post-merge verified by **#512 GREEN** plus Jest/Playwright/ESLint/Prettify.

**Goal:** author the first traversable piece of the real city.

Content scope:

- intercity bus station and transport square;
- immediate street/stop area;
- at least one food point;
- one intermediate destination/route decision;
- student-dormitory/home hub or the current canonical lodging decision;
- several NPCs with authored routines/presence inputs;
- meaningful travel durations and at least two ways to reach the destination.

Required proof:

- player arrival has Actual Presence;
- movement changes location and costs authored/meaningful time;
- NPCs can be elsewhere because of runtime state rather than because a dialogue screen is closed;
- the city already permits getting delayed, choosing a worse route, buying food or waiting.

### A57 — Vertical Slice Narrative: Day One -> Day Two

**Status:** **DONE / STABLE** — implementation #526 GREEN, closure #527 GREEN; merged as `1691b49f4560f07ca1c4b6c35541d92af92dd3c3` and post-merge verified by **#528 GREEN** (358/358 Jest suites, 2149 passed, Chromium 5/5, Vite/Electron PASS).

**Goal:** create the first complete playable story period rather than a systems sandbox.

Content scope:

- arrival and initial uncertainty;
- first failed/changed contact (call/SMS/meeting as current content decision requires);
- at least one full conversation with multiple canonical Moves;
- at least one relationship/Knowledge/runtime-state consequence;
- at least one optional event that can be seen, missed or changed;
- at least one delayed consequence;
- at least one NPC-to-NPC occurrence without the protagonist present;
- route to lodging, sleep, next-day wakeup;
- next day reflects prior state.

Exit proof: two runs can legitimately produce different knowledge/relationships/occurrences without either being treated as an invalid run.

### A58 — Everyday Systems Integration for the Slice

**Status:** **DONE / STABLE** — merged as `22ff1e408f48455e7125b3dec65ad5393700992a` and post-merge verified by **#566 GREEN** (367/367 Jest suites, 2175 passed, Chromium 6/6, Vite/Electron PASS); separate Jest / Playwright / ESLint / Prettify workflows also GREEN.

**Goal:** use existing physical systems only where the actual slice creates decisions, and close only proven missing contracts.

Priority integration:

- fatigue and sleep debt;
- sleep and well-rested state;
- food/satiety and heavy-meal fast-run restriction;
- inventory with pockets/bag/portfolio/backpack capacity where the slice needs it;
- item pickup/placement;
- money purchase/spend contract;
- travel/transport costs;
- injury interaction only if Day One content actually exercises it.

Explicit non-goal: implementing every previously discussed survival feature before it appears in play.

### A59 — Vertical Slice Closure & Content Production Loop

**Status:** **DONE / STABLE** — merged as `787db91868c7ce4f7c52795ac03ce7bf44f105cc`; post-merge **#584 GREEN** (370/370 Jest suites, 2183 passed, Chromium 7/7, Vite/Electron PASS) with separate Prettify / ESLint / Jest / Playwright workflows GREEN.

**Goal:** prove that the editor now accelerates production of the game, not merely architecture work.

Deliverables:

- full player-facing slice regression from arrival through next morning;
- Story Brain/Preview evidence for explaining player-visible outcomes;
- authored-content checklist/templates for NPCs, Story nodes, Moves, Outcomes, schedules, locations, items, Knowledge, relationships, missed events and delayed consequences;
- content validation budget and source-navigation workflow;
- first playtest observations converted into focused content/runtime/presentation defects rather than architectural rewrites.

Exit proof: new slice content can be added mainly through canonical authoring surfaces and data, with runtime code changes reserved for genuine mechanics gaps.

### A60+ — 93-Day Production

Scale the proven loop outward:

- additional districts/routes and social hubs;
- larger NPC relationship graph and autonomous event chains;
- jobs/economy, transport, phone/SMS/forum where needed by authored arcs;
- summer-long missed-event/rumor/Knowledge consequences;
- progressive body/injury/health depth only where gameplay uses it;
- content performance/scale gates;
- ending logic based on the shape of the lived summer rather than completion percentage.

## 6. Vertical-slice definition of done

The slice is not DONE until a standalone player-facing runtime can: arrive at the bus station; show meaningful time; inspect and move; meet an actually present NPC; hold a choice-driven conversation; mutate canonical Knowledge/relationship/runtime state; spend time; become tired; eat; acquire/spend a material resource; carry an item through a real container rule; miss or alter an event; observe later consequences; reach lodging; sleep; wake on the next day; save; reload; and continue with the previous day preserved.

Story Brain/Preview/diagnostic tooling must remain able to explain the authored/runtime evidence behind those outcomes.

## 7. Decision backlog

Do not block A53-A55 on unresolved fiction that does not affect runtime ownership. Resolve items only when a slice needs them. Current concept evidence already supports summer **2000**, bus arrival through the single external road corridor, a button phone, cash, luggage/documents, no return ticket/map, an unanswered first contact candidate and a student-dormitory lodging candidate. Exact names, route numbers, prices, roommates, central plot and final city naming remain content decisions until their production stage.

## 8. Delivery rule

Every HIGH-risk runtime/save/export stage follows `93DAYS_ENGINEERING_CHANGE_PROTOCOL.md`: repository evidence -> E0 -> ownership/contract -> regression design -> minimal slice -> exact-head full CI -> self-review -> PR gate -> merge gate -> post-merge exact-SHA verification.

No stage may claim gameplay completion from compiler-proof HTML or editor Preview alone.


### A60 — Phone / SMS & Flexible Social Contact Loop

**Status:** **DONE / STABLE** — merged as `9531bc4a9c1d919fe30e034060232b18cba2cb30`; post-merge **#615 GREEN** (373/373 Jest suites, 2192 passed, Chromium 10/10, Vite/Electron PASS) with separate Jest / Playwright / ESLint / Prettify workflows GREEN.

**Goal:** prove the first scalable early-2000s social loop through canonical Story/Moves/Knowledge/relationships before adding any new mutable communication subsystem.

**Slices:**

- S1 — content-only Day Two SMS -> reply -> flexible physical meeting -> attend/miss -> later consequence;
- S2 — optional authored `sms | phone-call` Story metadata and authoring validation;
- S3 — derived Player phone/phonebook/history presentation over canonical Story/runtime history;
- S4 — first social destination loop and browser/save closure.

**Exit proof:** communication feels like a real player-facing social system while Story/runtime/save ownership remains singular and existing.


### A61 — Rumor & Social Echo

**Status:** **DONE / STABLE** — PR #34 merged as `44ade5dcbcb53e814cac131db383daeddb18b01f` on 2026-09-22; A61 closure Branch Check **#627 GREEN** on exact PR head `e59f40ecde52bcada54e2b75fc6429d195a0dee6`; post-merge Jest / Playwright / ESLint / Prettify workflows all **GREEN**.

**Goal:** scale A60 from one direct phone relationship into an explainable NPC-to-NPC social echo using canonical Claims, Knowledge provenance, relationships, memories, ReactionCandidateSets and explicit NPC decisions.

**Slices:**

- S1 — A60 history -> NPC tells NPC -> listener stores Claim with teller provenance;
- S2 — listener evaluates the report using source trust and existing reaction scoring;
- S3 — player later sees a different authored social reaction for met / missed / declined histories.

**Exit proof:** one player action can affect a later NPC who was not present, while the runtime still has no automatic rumor graph, hidden spread RNG or second cognition engine. Source trust remains runtime-owned; A61 authors and tests the trust criterion rather than embedding initial runtime relationships in authored content.


### A62 — Firsthand Social Repair & Day Four Follow-up

**Status:** **IMPLEMENTATION VERIFIED / PR #35 DRAFT** — exact implementation `4702b211692a52575fc5a0e69a6ab84ca64d7520` passed **Branch Check #634 GREEN** (375/375 Jest suites; 2217 passed; Chromium 10/10; audit 0; builds and Vite/Electron smoke PASS). Feature `feature/a62-firsthand-social-repair`, based on A61 stable `44ade5dcbcb53e814cac131db383daeddb18b01f`. Contract: `93DAYS_A62_FIRSTHAND_SOCIAL_REPAIR_CONTRACT.md`. Change record: `93DAYS_A62_CHANGE_RECORD.md`. Docs-closure exact-head CI still required before review; no merge authorization is implied.

**Goal:** extend A61 so the player's social story is not settled solely by another person's report. Let the player meet the listener in person, make one version-consistent direct statement or decline to discuss the report, then experience a different follow-up on Day Four.

**Slices:**

- S1 — A61 echo opens an authored direct-answer Story; exactly the truthful kept/missed/declined answer is available alongside leaving. Learning uses the canonical Player Move and a distinct Claim with `told(player)` provenance.
- S2 — listener's firsthand memory and modest goodwill change coexist with the intact A61 third-party rumor; no automatic rumor erasure, no duplicate Knowledge store or hidden RNG.
- S3 — separate location/day-scoped Day Four follow-ups for having spoken or walked away, with Player save/restore and exact-head integration/CI proof.

**Exit proof:** at least three Day Two histories plus a cautious A61 source-trust variant yield a deterministic direct-answer choice; the original source stays identifiable; one Day Four consequence survives runtime-only save/restore. New A62 content extends the A61 builder without modifying older A61 artifacts or requiring any schema or save-format changes.
