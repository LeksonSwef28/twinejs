# 93 Days — A58 Change Record

Change ID: **A58**  
Stage: **Everyday Systems Integration for the Slice**  
Risk: **HIGH**  
Stable source: `1691b49f4560f07ca1c4b6c35541d92af92dd3c3`  
Feature branch: `feature/a58-everyday-systems`  
PR: **#31**  
Exact implementation head: `4cfca9c75c1b0bef25192719b2f9ccd85a7bb435`  
Closure docs head: `9089cddb9d0c48f2a84ef2d1bde777e4275a4ec5`

## Requirement

Integrate the already-existing body/carrying systems into the real Day One -> Day Two slice and add only the proven missing money/purchase/fare contract.

Required chain:

`authored economy/food/fares -> A52 artifact -> A53 materialization -> canonical cash/item/body/travel boundaries -> Player projection/actions -> save/restore -> Day Two`

A58 was not allowed to create a second inventory, second body model, UI-local money balance, direct clock mutation, hidden RNG or a new artifact format.

## Baseline

A57 stable source:

`1691b49f4560f07ca1c4b6c35541d92af92dd3c3`

Post-merge baseline Branch Check **#528 GREEN**:

- 358/358 Jest suites;
- 2149 passed;
- Chromium 5/5;
- Vite PASS;
- Electron PASS;
- production audit: 0 vulnerabilities.

Repository evidence before implementation showed that fatigue, sleep debt, satiety, digestion, well-rested state, carrying/container capacity and physical eligibility already existed canonically. The real missing surfaces were runtime cash, purchase/spend, route fares and Player commands for food/item placement.

## Delivered

### S1 — economy contract + compatibility

Added additive authored economy data:

- currency code/label;
- integer minor-unit scale;
- initial cash by character;
- concrete authored purchase offers.

Added mutable runtime cash:

- `cashByCharacter` remains runtime state, separate from authored initial cash;
- fresh artifact runtime initializes deterministically from authored cash;
- pre-A58 runtime payloads without cash hydrate safely to `{}`;
- runtime snapshot / Player save round-trip mutable balances;
- project schema version remains 3;
- runtime artifact format/version remain unchanged.

Added canonical money primitives:

- non-negative integer minor-unit validation;
- deterministic spend evaluation;
- insufficient-funds rejection;
- no negative balances;
- explainable spend trace.

Added atomic concrete-item purchase:

- validates economy, offer, character, location, item availability and funds;
- uses existing runtime item-placement overlay;
- deducts cash only after placement succeeds;
- failed purchase returns the original project unchanged;
- authored ItemInstance placement is never rewritten.

A58-S1 exact verification:

- **#530 GREEN** after correcting one incomplete test fixture reference.

### S2 — food, packing and paid travel

Added optional ItemDefinition food-use data:

- `satietyGain`;
- `digestionMinutes`.

Food consumption:

- requires the concrete item to be carried, including through a carried container;
- delegates satiety/digestion to canonical body `eat` effect;
- consumes the concrete item via runtime placement `unplaced`;
- does not mutate authored ItemInstance placement.

Packing Player boundary:

- supports pockets;
- supports a carried concrete container;
- supports taking an item back to top-level possession;
- all size/volume/weight/cycle rules stay in existing carrying/physical code;
- remote source/target items reject atomically.

Paid travel:

- adds optional positive integer `fareMinorUnits` to authored routes;
- checks funds before simulation time advances;
- charges only after the full canonical simulation step succeeds;
- changes Actual Presence only after successful time/fare processing;
- project-end, physical and insufficient-funds failures charge nothing;
- free A56 routes keep their old behavior.

A58 authored content layer:

- separate `create93DaysEverydaySystemsProject()` layered over A57;
- provisional starting cash: 12000 minor units;
- one concrete dense food item at the existing food point;
- dense food price: 1800 minor units;
- route-taxi fare: 1200;
- city-bus-to-tower fare: 600;
- direct city-bus-to-dorm fare: 800;
- all values explicitly treated as provisional gameplay values, not verified historical prices.

A58-S2 exact verification:

- **#543 GREEN**
- 366/366 Jest suites;
- 2172 passed;
- Chromium 5/5;
- Vite/Electron PASS;
- production audit: 0 vulnerabilities.

### S3 — Player integration + full slice closure

Player presentation now derives from canonical runtime:

- formatted cash balance;
- local purchase offers;
- paid-route costs;
- insufficient-funds blocking;
- food actions;
- pockets/container packing actions;
- unpack/take-out actions.

Thin Player boundaries were added for:

- purchase;
- food use;
- item placement.

No Player-local balance or duplicate inventory state was added.

Player feedback reports:

- purchase cost;
- paid-travel fare;
- food digestion window;
- item placement results.

Full A58 integration proof from one compiled artifact now performs:

1. unanswered first contact;
2. constructive clerk path;
3. optional station Story event;
4. real travel to food point;
5. purchase of one concrete food item;
6. packing into the existing travel bag;
7. consuming the packed item;
8. canonical 30-minute digestion restriction;
9. explicit proof that `fast-run` is blocked during digestion;
10. canonical travel time reducing digestion to zero;
11. proof that `fast-run` becomes available after digestion;
12. paid city-bus travel with one exact fare deduction;
13. route to dormitory;
14. canonical sleep;
15. Day Two state-dependent narrative actions;
16. Player save/restore preserving cash/body/item-placement/runtime-occurrence history.

Standalone Chromium now performs the same real systems loop through visible Player controls:

- starting cash visible;
- purchase visible;
- pack into `Дорожная сумка`;
- consume food;
- digestion visible;
- paid bus fare visible and deducted;
- Day Two reached with A57 history intact.

## CI history

Important verification runs during implementation:

- **#528 GREEN** — stable A57 post-merge baseline;
- **#529 FAILED** — S1 compatibility fixture omitted its referenced BehaviorProfile; production runtime was not the cause;
- **#530 GREEN** — corrected S1;
- **#543 GREEN** — S2 economy/food/packing/fares;
- **#544 FAILED** — two TypeScript narrowing errors in the new S3 presentation contract;
- **#554 FAILED** — two test-only assertions: global food text selector and non-canonical JSON key-order comparison;
- **#555 FAILED** — food selector fixed; only canonical JSON key-order test remained;
- **#556 GREEN** — first full S3 implementation candidate;
- **#559 GREEN** — final implementation head `4cfca9c75c1b0bef25192719b2f9ccd85a7bb435` after replacing the last key-order-sensitive assertion with semantic structural comparison.

## Exact implementation verification

**93 Days Branch Check #559 — GREEN**

- production audit: **0 vulnerabilities**;
- lint: PASS;
- web build: PASS;
- standalone Player build: PASS;
- Electron main build: PASS;
- Jest: **367/367 suites**;
- Jest tests: **2175 passed, 23 skipped, 42 todo, 2240 total**;
- snapshots: **0**;
- Chromium canonical Player smoke: **6/6**;
- Vite smoke: PASS;
- Electron smoke: PASS.

## Self-review

Stable-to-implementation review confirms the branch is 41 commits ahead / 0 behind stable and:

- no new hidden gameplay RNG;
- no direct Player/UI simulation-clock mutation;
- no direct Player/UI body-field mutation;
- no second body or carrying engine;
- no UI-local cash state;
- no authored ItemInstance mutation during play;
- no schedule-to-Actual-Presence shortcut;
- no artifact format/version change;
- no project schema-version change;
- all money values are integer minor units;
- paid travel checks fare before time and charges only after successful canonical time advancement;
- food delegates to canonical body effect;
- packing delegates to existing carrying/physical evaluation;
- A57 Story definitions remain authored truth and are unchanged by A58 runtime play;
- injury scope was not expanded because the slice did not require it.

The only random/UUID code seen by broad static scans remains pre-existing project-id generation in `project-factory.ts`; A58 gameplay code adds no RNG.

## Recovery

A58 remains additive.

Rollback can remove:

- authored economy/food/fare fields;
- runtime cash projection;
- economy/consumable/Player bridges;
- A58 content builder;
- Player economy/item controls.

Compatibility defaults keep older schema-v3 data readable, and authored ItemInstance placement remains recoverable because play writes only runtime placement overlays.

## Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS**
- E5 Exact-head verification: **PASS — implementation head `4cfca9c75c1b0bef25192719b2f9ccd85a7bb435`, Branch Check #559 GREEN**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS — closure docs head `9089cddb9d0c48f2a84ef2d1bde777e4275a4ec5`, Branch Check #562 GREEN; PR #31 is open and Ready for review**
- E8 Merge: **PENDING — explicit user authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**

## Closure requirement

This change record, contract update and roadmap update are documentation-only closure work after the verified implementation head.

The docs-only closure gate is satisfied by head `9089cddb9d0c48f2a84ef2d1bde777e4275a4ec5`, Branch Check #562 GREEN. PR #31 is Ready for review; merge still requires a separate explicit user command.


## Closure verification

**93 Days Branch Check #562 — GREEN** on docs-only closure head `9089cddb9d0c48f2a84ef2d1bde777e4275a4ec5`.

- production audit: **0 vulnerabilities**;
- lint: PASS;
- web build: PASS;
- standalone Player build: PASS;
- Electron main build: PASS;
- Jest: **367/367 suites**;
- Jest tests: **2175 passed, 23 skipped, 42 todo, 2240 total**;
- snapshots: **0**;
- Chromium canonical Player smoke: **6/6**;
- Vite smoke: PASS;
- Electron smoke: PASS.

A58 is complete through E7. E8 remains intentionally pending until the user explicitly authorizes merge.
