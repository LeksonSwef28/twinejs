# 93 Days — A56 Change Record

Change ID: **A56**  
Stage: **Vertical Slice World: Arrival Corridor**  
Risk: **HIGH**  
Stable source: `db9d309080200b4851ed4cfcf5986a23a481b003`  
Feature branch: `feature/a56-arrival-corridor`  
PR: **#29**  
Exact implementation head: `3206f69aa95fc1efe04d83244eb9915e6550bef5`

## Requirement

Turn the A55 Player shell into the first traversable piece of the actual game world without introducing a second engine or weakening A52/A53 ownership.

Required chain:

`authored Arrival Corridor -> A52 artifact -> A53 session -> explicit world start -> Player route/wait choice -> canonical simulation/travel -> A53 replacement -> updated Player`

## Delivered

### World/content

- 6 opening locations:
  - Междугородний автовокзал;
  - Транспортная площадь;
  - Остановка у автовокзала;
  - Киоски у транспортной площади;
  - Пересадка у водонапорной башни;
  - provisional Студенческое общежитие;
- explicit `player` protagonist;
- five low-story-commitment NPC roles;
- behavior profiles + non-overlapping routines;
- opening observation Story nodes/Moves;
- travel bag, button phone and passport;
- no invented city name, transit line numbers, prices or final lodging story.

### Authored travel

- additive optional schema-v3 `travelRoutes`;
- directed origin/destination;
- mode/label;
- positive whole-minute duration;
- optional existing physical-action gate;
- persistence hydration compatibility default `[]`;
- reference/structural/compiler validation;
- old schema-v3 artifacts remain source-schema compatible.

### Runtime travel

- validates route, character, authored locations and current Actual Presence;
- reuses existing physical availability;
- advances canonical simulation time;
- preserves body/injury/due Story work;
- changes only traveller Actual Presence after full time succeeds;
- rejects project-end partial travel atomically;
- preserves other NPC Actual Presence;
- enters Player session through A53 replacement only.

### Explicit arrival bootstrap

- additive optional `playerStart`;
- applied only after A53 materialization;
- A52 fresh artifact Actual Presence remains empty;
- missing start is a no-op;
- already-located runtime state wins;
- invalid authored references reject visibly.

### Player integration

- route choices derive from current Actual Presence;
- route mode/destination/duration shown from authored data;
- blocked physical routes disabled;
- travel feedback reflects canonical result;
- generic 5/15 minute waiting delegates to canonical simulation and leaves location unchanged.

## Compatibility decision

A schema-v4 bump was investigated and rejected for A56.

A53 deliberately requires exact artifact `sourceSchemaVersion`. Raising the schema version for optional route/start data would make already exported schema-v3 artifacts incompatible with the current Player build even though their authored/runtime meaning remained valid.

A56 therefore uses additive optional schema-v3 fields with defensive hydration/materialization defaults:

- missing `travelRoutes` -> `[]`;
- missing `playerStart` -> no world-start bootstrap.

No artifact format/version or runtime snapshot version changed.

## Verification history

### S1

- **#502 FAIL** — test-only over-broad unresolved-fiction regex matched `междугородний`;
- exact corrected head `8c3f760b5f601005b5b09849cc98a32eeeb2985a` — **#503 GREEN**:
  - 349/349 suites;
  - 2109 passed;
  - Chromium 3/3;
  - Vite/Electron smoke PASS.

### S2a

- **#504 FAIL** — TypeScript narrowing in a compiler diagnostic branch; no runtime semantic failure;
- exact corrected head `dc0648c884765dca3f0a8d84472d3a70ed6c88ac` — **#505 GREEN**:
  - 351/351 suites;
  - 2117 passed;
  - Chromium 3/3;
  - Vite/Electron smoke PASS.

### S2b

Exact head `58dc07d074603566e1f537799b5e9d52f5db364a` — **#506 GREEN**:

- 352/352 suites;
- 2121 passed;
- Chromium 3/3;
- Vite/Electron smoke PASS.

### S3

- **#507 FAIL** — lint correctly exposed imports for a host regression whose insertion pattern had not matched; fixed by adding the intended regression;
- self-review then hardened persisted/artifact `physicalAction` validation;
- exact head `75355b4f4b1f223e08399425250adaa8774314f2` — **#509 GREEN**:
  - 353/353 suites;
  - 2125 passed;
  - Chromium **4/4**, including real Arrival Corridor traversal;
  - Vite/Electron smoke PASS.
- final implementation head `3206f69aa95fc1efe04d83244eb9915e6550bef5` — **#510 GREEN**:
  - production audit: 0 vulnerabilities;
  - lint/web/player/Electron builds PASS;
  - **354/354 Jest suites**;
  - **2128 passed**, 23 skipped, 42 todo; 2193 total;
  - snapshots 0;
  - Chromium **4/4**;
  - Vite/Electron smoke PASS.

## Browser proof

390x844 standalone Player, using the real Arrival Corridor compiled artifact with **no manually injected Actual Presence**:

1. artifact fresh runtime has empty Actual Presence;
2. authored `playerStart` starts the player at Междугородний автовокзал, 06:00;
3. wait 5 min -> 06:05, same location;
4. walk to transport square, 3 min -> 06:08;
5. walk to station stop, 4 min -> 06:12;
6. both 18-minute route taxi and 26-minute city bus to the same transfer are offered;
7. route taxi -> water-tower transfer, 06:30;
8. next walking route toward the dormitory is available.

## Important invariants preserved

- Narrative Project remains authored source of truth;
- A52 artifact stays derived input;
- A52 fresh runtime remains empty Actual Presence;
- Actual Presence remains runtime truth;
- schedules remain intent only;
- travel duration lives in typed authored data;
- travel/wait use canonical simulation;
- no second travel/clock engine;
- no hidden RNG/time;
- no fake money/economy;
- no A57 narrative overreach;
- old schema-v3 projects/artifacts remain compatible.

## Recovery

No destructive migration exists.

Rollback is code-only:

1. revert Player wait/travel presentation;
2. revert Player travel/world-start application bridges;
3. leave old schema-v3 projects readable because new authored fields are optional;
4. if necessary, remove A56 Arrival Corridor preset/routes/start without touching A52-A55 runtime/save/host contracts.

## Gate state

- E0 Evidence: **PASS**
- E1 Scope: **PASS**
- E2 Contract: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS**
- E5 Verification ladder: **PASS — #503 / #505 / #506 / #509 / #510**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS for implementation — PR #29 open, draft and mergeable**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery/learning: **PASS**

**Decision:** A56 implementation is verified. This closure documentation commit requires its own full exact-head CI before PR #29 becomes merge-ready.
