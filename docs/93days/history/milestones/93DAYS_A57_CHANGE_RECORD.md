# 93 Days — A57 Change Record

Change ID: **A57**  
Stage: **Vertical Slice Narrative: Day One -> Day Two**  
Risk: **HIGH**  
Stable source: `5058d1bb699fa5eba3a02aeaa2ebe45acdd9624a`  
Feature branch: `feature/a57-day-one-day-two`  
PR: **#30**  
Exact implementation head: `218a66cf83dd8db6165968f306bb301661563468`

## Requirement

Turn the A56 Arrival Corridor into the first genuine Day One -> Day Two narrative slice while reusing canonical A52-A56 runtime ownership.

Required chain:

`authored Day One/Day Two -> A52 artifact -> A53 materialization -> explicit world start -> canonical Moves / Story work / wait / travel / sleep -> A53 replacement -> Day Two presentation derived from runtime history`

No second story engine, schedule-to-presence shortcut, hidden RNG, economy/food subsystem or phone subsystem was allowed.

## Delivered

### S1 — authored narrative

- provisional unnamed local contact and unanswered first call;
- button-phone requirement expressed by canonical Move guard;
- contact-unavailable Knowledge + Memory consequence;
- full station-clerk conversation with sequential opening -> follow-up Story state;
- constructive and abrupt legitimate paths with different goodwill;
- exact route Claim available only on the constructive clarification path;
- one missable station Story opportunity with canonical miss window;
- one scheduled dormitory NPC-only Story occurrence with no protagonist participant;
- Day Two reflection Moves guarded by canonical Knowledge / Story state.

### S2a — minimal canonical integration

- additive explicit initial NPC placements extend authored `playerStart`;
- placement applies only post-materialization through world-start;
- existing runtime Actual Presence wins and invalid references reject atomically;
- fresh A52 artifact Actual Presence remains `{}`;
- thin `executeNarrativePlayerStoryWork` delegates execute/miss/expired semantics to `consumeNarrativeStoryWork`;
- thin `executeNarrativePlayerSleep` applies canonical body sleep, advances canonical simulation and replaces A53 session only after success;
- persistence/materialization remain compatible with older additive schema-v3 data.

### S2b — Player presentation

- protagonist scheduled opportunities appear only once actually due;
- explicit Participate / Skip / Record missed controls call the canonical Story-work bridge;
- NPC-only work is never projected as a Player choice;
- ordinary Story Moves with authored `placement.day` are visible only on that runtime day; `minuteOfDay` remains Story-runtime ownership rather than a generic Move window;
- authored sleep appears only at its authored Actual Presence location and after its earliest start time;
- before bedtime, Player offers only a convenience “wait until” command delegated to canonical Player wait;
- persistent Knowledge / Story-state guards suppress mutually exclusive narrative branches while ordinary contextual blockers remain visible/disabled;
- no UI-only story flags were introduced.

### S3 — divergent histories and browser closure

Two complete player-session runs materialize independently from the **same compiled artifact**.

**Run A**
- unanswered call;
- polite clerk opening + exact transfer clarification;
- goodwill about +0.20;
- exact tower-transfer Claim learned;
- optional station event executed;
- arrival through square -> stop -> tower -> dorm;
- canonical sleep to Day Two 07:30;
- Day Two exposes the known-route + seen-opportunity reflection branches.

**Run B**
- unanswered call;
- abrupt clerk opening + thank-and-leave follow-up;
- goodwill about -0.05;
- exact transfer Claim not learned;
- optional station event missed;
- same valid route to dorm;
- canonical sleep to Day Two 07:30;
- Day Two exposes the unknown-route + missed-opportunity reflection branches.

The runs have different runtime occurrences, Knowledge, relationship state and Story state while authored Story/Move definitions and the shared compiled artifact remain unchanged.

A separate integration proof executes `Разговор у вахты без героя` at 18:00 with both NPCs in the dormitory while the protagonist remains at the bus station. This proves protagonist-absent Story execution without adding an autonomous scheduler.

## Browser proof

Standalone Chromium uses the real A57 compiled artifact and production world-start/sleep/story-work/travel paths. No test-only Actual Presence injection is used.

Verified path:

1. fresh artifact starts with empty Actual Presence;
2. world start places the player at Междугородний автовокзал at 06:00;
3. unanswered call records feedback `Длинные гудки. Никто не отвечает.`;
4. polite clerk opening -> transfer clarification;
5. canonical wait reaches the station opportunity at 06:10;
6. opportunity is explicitly executed;
7. travel reaches transport square 06:13 -> stop 06:17 -> water tower 06:35 -> dorm 06:49;
8. Player waits canonically to authored bedtime 22:30;
9. sleep advances body + simulation to Day Two 07:30;
10. Day Two shows the known-route and seen-opportunity branches and hides their mutually exclusive alternatives.

## Verification history

### Prior verified base

A57-S1/S2a exact head `dcae69fff4086d61a5475299bf333d46511bd476` — **#517 GREEN**:

- 357/357 Jest suites;
- 2143 passed;
- Chromium 4/4;
- Vite/Electron PASS.

### S2b/S3 hardening

- **#518 FAIL** — focused Player sleep fixture incorrectly expected authored live project time instead of A52 fresh-runtime 06:00; test corrected to reach bedtime through canonical wait.
- **#519/#520 FAIL** — S3 regression exposed that mutually exclusive Day Two Knowledge/Story branches were still rendered disabled instead of producing distinct action sets; projection was corrected. A second unit assertion was made HUD-specific after sleep feedback also contained `День 2`.
- self-review corrected Move time scoping to authored **day only**, preserving the contract that ordinary `placement.minuteOfDay` is not a generic action availability window.
- **#524** reached 358/358 Jest GREEN and then failed only because browser text `06:10` matched both the Player clock and the scheduled-event label; A57 browser time assertions were hardened to the canonical clock container.

### Final implementation gate

Exact implementation head `218a66cf83dd8db6165968f306bb301661563468` — **#526 GREEN**:

- production audit: **0 vulnerabilities**;
- lint PASS;
- web build PASS;
- standalone Player build PASS;
- Electron main build PASS;
- **358/358 Jest suites**;
- **2149 passed**, 23 skipped, 42 todo; **2214 total**;
- snapshots: 0;
- Chromium canonical Player smoke: **5/5**;
- Vite smoke: PASS;
- Electron smoke: PASS.

## Self-review

Stable-to-implementation comparison:

- feature is **14 commits ahead / 0 behind** stable;
- authored/runtime ownership remains separated;
- fresh compiled Actual Presence remains empty;
- only explicit authored world-start placements create initial Actual Presence;
- schedules remain declarative and are never copied into Actual Presence;
- Story execute/miss remains canonical `consumeNarrativeStoryWork`;
- sleep remains body effect -> canonical simulation advance -> A53 replacement;
- Knowledge/relationship/Memory remain canonical Outcome effects;
- Day Two branch visibility reads canonical guards rather than UI-only flags;
- no hidden RNG was added;
- no direct simulation-clock or body-field mutation was added;
- no money, prices, fares, purchases, food/satiety UI, phone app/SMS UI, sleep-quality system or autonomous scheduler was added;
- artifact format/version is unchanged;
- A52 fresh-runtime rule is unchanged.

Automated patch review found no added `Math.random`/hidden RNG, direct clock/body mutation, economy/purchase/fare surface, schedule-to-presence shortcut or artifact-format/version assignment.

## Compatibility / recovery

All A57 authored schema additions are additive and compatibility-defaulted.

Rollback is code/data only:

1. revert Player Story opportunity/sleep presentation;
2. revert thin Player Story-work/sleep boundaries;
3. revert explicit additional world-start placements;
4. remove A57 authored content;
5. leave A52-A56 artifact/session/host/travel/wait contracts intact.

No destructive migration exists.

## Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS**
- E5 Exact-head implementation verification: **PASS — #526 GREEN**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS for implementation — PR #30 open, draft and mergeable**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**

**Decision:** A57 implementation is verified. This docs-only closure commit requires its own full exact-head Branch Check before PR #30 becomes ready-for-review. Merge remains blocked until the user explicitly says **«мердж»** at merge time.
