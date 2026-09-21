# A58 Contract — Everyday Systems Integration for the Slice

Status: **CONTRACT ACTIVE / IMPLEMENTATION READY**  
Stage: **A58 — Everyday Systems Integration for the Slice**  
Risk: **HIGH**  
Stable source: `93-days-editor` @ `1691b49f4560f07ca1c4b6c35541d92af92dd3c3`  
Feature branch: `feature/a58-everyday-systems`  
Decision date: **2026-09-21**

## 1. Source/evidence boundary

A57 is now merged into stable and post-merge verified by Branch Check **#528 GREEN**:

- 358/358 Jest suites;
- 2149 passed, 23 skipped, 42 todo;
- Chromium canonical Player smoke 5/5;
- Vite smoke PASS;
- Electron smoke PASS;
- production audit found 0 vulnerabilities.

Repository evidence shows that most requested everyday-body mechanics already exist canonically and must be integrated rather than rebuilt:

- `body.ts` already owns fatigue, sleep debt, satiety, digestion, sleep recovery, well-rested benefit and hungry effort cost;
- a heavy meal already blocks `fast-run` for the full authored digestion window; the current helper defaults to 30 minutes;
- canonical simulation already materializes missing body state for known characters and advances it whenever wait/travel/sleep advances world time;
- `carrying.ts` already owns item weight/volume/size, pockets, container capacity, hands occupied and carried-weight effort modifiers;
- `physical.ts` already combines body + injury + carrying into one explainable physical-action evaluation;
- runtime item placement overlays already allow pockets and concrete containers without rewriting authored ItemInstance placement;
- A57 sleep already delegates to canonical body effect + canonical simulation;
- A56 travel already validates physical eligibility, advances canonical simulation and changes Actual Presence atomically;
- Player presentation already exposes body state and carried items, but money is explicitly shown as unavailable.

Repository evidence also confirms the genuine A58 gaps:

1. there is no authored/runtime money balance contract;
2. travel routes have no fare contract;
3. there is no canonical purchase/spend transaction;
4. food body effects exist, but there is no Player item-consumption command;
5. item packing exists, but Player has no pickup/pack/pockets command surface;
6. the A57 content has no purchasable food/material-resource loop.

## 2. Scope and ownership

A58 integrates existing physical systems into the real Day One slice and adds only the missing economic transaction boundary.

Ownership remains:

- **Narrative Project authored data** owns currency metadata, initial cash, purchase offers, food properties and route fares;
- **runtime project state** owns mutable character cash and runtime item placement;
- **body.ts** remains sole owner of fatigue/satiety/digestion/sleep semantics;
- **carrying.ts / physical.ts** remain sole owners of container and physical availability semantics;
- **simulation.ts** remains sole owner of elapsed body/injury time;
- **travel.ts** remains sole owner of travel ordering and atomicity;
- **Player application wrappers** only validate player intent, call canonical application/domain APIs and replace the A53 session after success.

A58 must not add a second inventory, needs, clock or travel engine.

## 3. Minimal economy contract

### 3.1 Authored economy

A58 may add one optional additive schema-v3 authored economy definition containing:

- currency code/label;
- minor-units-per-major-unit;
- initial cash by character;
- authored purchase offers.

A purchase offer contains only what the slice needs:

- stable id and label;
- location id;
- item instance id;
- positive integer price in minor units;
- optional seller character id for provenance/presentation.

Exact prices are authored content, not hard-coded runtime policy.

### 3.2 Runtime cash

Mutable cash is runtime state, separate from authored initial cash.

Rules:

- balances are non-negative integers in minor units;
- old schema-v3 projects/artifacts/saves with no economy state hydrate to an empty/default-safe runtime map;
- fresh compiled runtime initializes cash deterministically from authored initial cash;
- save/restore preserves mutable balances;
- no artifact format/version or project schema-version bump is required if the change remains additive and backward-compatible;
- if compatibility cannot be preserved under the existing formats, implementation stops and the version decision is made explicitly before continuing.

### 3.3 Spend transaction

Canonical spend evaluation/application must:

1. validate character and amount;
2. reject insufficient funds without mutation;
3. reject malformed/negative/non-integer amounts;
4. never allow a negative balance;
5. return an explainable trace/result;
6. be deterministic and contain no hidden RNG.

## 4. Purchases

A canonical purchase transaction must validate before mutation:

1. authored offer exists and is structurally valid;
2. buyer character exists;
3. buyer Actual Presence matches offer location;
4. referenced item instance exists;
5. the item is still available at the authored/runtime location;
6. buyer has enough cash;
7. target carry placement is valid.

Success atomically:

- deducts cash;
- moves the concrete item instance into buyer runtime possession using the existing placement overlay;
- leaves authored ItemInstance placement unchanged;
- returns purchase/placement trace data.

Any failure returns the original project/session unchanged.

A58 does not implement shop stock counts, haggling, dynamic pricing, credit, bank accounts or a global economy simulation.

## 5. Food / heavy meal integration

A58 may add optional food-use properties to ItemDefinition:

- satiety gain;
- digestion duration.

Player consumption must:

1. require the concrete item to be carried by the character;
2. apply the canonical body `eat` effect;
3. consume the concrete item through runtime placement (unplaced/consumed);
4. replace session state only after both operations succeed.

A dense/heavy food item in the Day One slice must prove:

- satiety rises;
- digestion becomes visible in Player state;
- `fast-run` is blocked while digestion remains;
- canonical wait/travel time reduces the same digestion timer;
- after the full window, `fast-run` is available again if no other blocker exists.

A58 does not create metabolism, calories, nutrients, thirst, cooking or food spoilage.

## 6. Inventory / container Player integration

A58 exposes thin Player commands over existing runtime placement rules.

Required commands for the slice:

- acquire a purchased item;
- move a carried item into pockets when valid;
- move a carried item into a carried container when valid;
- take an item back out to top-level character possession.

Rules:

- packing capacity/size/weight is decided only by `carrying.ts`;
- UI never mutates `itemPlacementOverrides` directly;
- authored placement is immutable during play;
- rejected packing is atomic;
- contained items continue to count as possessed by the character through the existing runtime projection.

No grid inventory, stacking, durability or equipment-slot system is added.

## 7. Travel fares

A58 may add an optional fare in minor units to authored travel routes.

Travel ordering becomes:

`validate route/character/origin -> physical eligibility -> fare eligibility -> canonical simulation -> cash deduction -> Actual Presence`

Atomicity rules:

- insufficient funds rejects before time advances;
- project-end/time failure charges nothing;
- physical failure charges nothing;
- successful paid travel charges exactly once;
- free routes behave exactly as A56 routes do today.

Fare formatting belongs to presentation; fare semantics belong to canonical travel/economy data.

## 8. Slice content decisions

A58 may make only the minimum new content decisions needed to prove the systems:

- the protagonist starts Day One with a modest authored cash amount;
- at least one transit route is paid;
- at least one alternative route has a different cost/time tradeoff;
- the food-point location offers at least one concrete food item;
- one purchased food is heavy enough to create the existing digestion restriction;
- the existing travel bag is used as the first real container; no new bag type is required unless a regression proves the slice cannot demonstrate capacity with current content.

Prices are provisional authored game values unless separately researched/validated. They must not be presented as verified historical city prices.

## 9. A58 invariants

- **A58-I01** — body semantics remain canonical in `body.ts`.
- **A58-I02** — carrying semantics remain canonical in `carrying.ts`.
- **A58-I03** — runtime item placement never rewrites authored ItemInstance placement.
- **A58-I04** — money has one authored initial source and one mutable runtime source; no duplicate Player-local balance.
- **A58-I05** — all money amounts are deterministic non-negative integer minor units.
- **A58-I06** — failed purchases and paid travel are atomic: no partial cash/time/item/location mutation.
- **A58-I07** — travel time continues through canonical simulation only.
- **A58-I08** — food uses canonical body effects only.
- **A58-I09** — Player wrappers contain no copied economy/body/carrying rules.
- **A58-I10** — old schema-v3 projects/artifacts/saves remain readable with safe defaults.
- **A58-I11** — no artifact format/version change unless compatibility evidence forces an explicit new decision.
- **A58-I12** — no hidden RNG.
- **A58-I13** — injury receives no new scope unless Day One content actually exercises it.
- **A58-I14** — A57 narrative histories and Day Two branching remain valid after systems integration.

## 10. Verification design

### S1 — economy foundation must prove

1. economy/offer/fare authored structures validate deterministically;
2. compiler creates fresh runtime cash from authored initial cash;
3. old artifacts with absent economy state still materialize;
4. runtime snapshot/player save round-trip mutable cash;
5. spend rejects invalid/insufficient amounts atomically;
6. purchase deducts once and moves one concrete item without rewriting authored placement;
7. invalid location/item/funds/packing leaves project unchanged;
8. artifact format/version and project schema version remain unchanged.

### S2 — food, inventory and fares must prove

1. purchased food can be consumed only while carried;
2. consumption uses canonical `eat` effect and removes runtime possession;
3. heavy food blocks `fast-run` for the authored digestion window;
4. simulation advancement reduces digestion and also advances normal fatigue/satiety;
5. packing into the travel bag uses existing size/weight/volume rules;
6. rejected packing is atomic;
7. paid travel rejects before time on insufficient funds;
8. successful paid travel charges once, advances time once and moves Actual Presence once;
9. free A56 routes retain previous behavior.

### S3 — Player/slice closure must prove

From one compiled A58 artifact, a real Player run can:

- see starting cash;
- reach the food point;
- buy a concrete item;
- carry/pack it through a real container rule;
- consume food and observe body-state change;
- encounter the heavy-meal fast-run restriction;
- spend money on transport;
- continue the A57 narrative to lodging/sleep/Day Two;
- save/restore with cash/body/item placement/history preserved.

Real-browser proof must exercise at least one purchase, one pack/unpack or pockets operation, one food use and one paid route.

## 11. Minimal slices

### A58-S1 — Economy contract + canonical transactions
- additive economy authored/runtime types;
- compatibility-safe persistence/compiler/player materialization;
- canonical cash/spend/purchase transaction;
- optional route fare field + validation only;
- focused unit/contract/save tests.

### A58-S2 — Food, packing and paid travel integration
- optional ItemDefinition food-use properties;
- canonical Player consume boundary;
- Player item-placement boundary;
- fare application in canonical travel;
- A58 Day One authored cash/offers/food/fares;
- focused atomicity and integration tests.

### A58-S3 — Player presentation + end-to-end systems proof
- visible formatted cash;
- purchase/food/container actions in Player;
- paid-route cost presentation and insufficient-funds feedback;
- integrated Day One -> Day Two regression preserving A57 history;
- save/restore regression;
- standalone Chromium closure;
- self-review/change record/roadmap closure;
- exact-head full CI.

## 12. Explicit non-goals

A58 does not implement:

- full city economy or dynamic markets;
- wages/jobs;
- banking/credit/debt;
- price inflation;
- shop schedules/stock simulation;
- thirst/metabolism/nutrition;
- cooking;
- item durability/equipment grids;
- autonomous merchant AI;
- new injury depth;
- final historical prices;
- final backpack/portfolio catalog.

Those remain A59+/content decisions unless the vertical slice proves a narrower blocker.

## 13. Recovery

The stage is additive.

Rollback path:

- revert A58 economy/content/application additions;
- older A53-A57 artifacts/saves continue through absent-safe defaults;
- free travel and existing body/carrying behavior remain unchanged;
- authored ItemInstance placement remains recoverable because play only writes runtime overlays.

If implementation requires a non-additive persistence or artifact change, stop before coding that change and write a separate compatibility/version decision.

## 14. Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PENDING**
- E5 Verification ladder: **PENDING**
- E6 Self-review: **PENDING**
- E7 PR/CI: **PENDING**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**
