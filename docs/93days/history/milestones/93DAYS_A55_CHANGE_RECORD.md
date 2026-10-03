# 93 Days — A55 Change Record

Change ID: **A55**  
Stage: **Player Presentation Shell**  
Risk: **HIGH**  
Stable source: `0b115b52b42ef05d16bc213865cc07b3a2eb6e76`  
Feature branch: `feature/a55-player-presentation-shell`  
PR: **#28**  
Exact implementation head: `0764c93f235699c29cb6d7e2a877d7fe6f4681a1`

## Requirement

Expose a real player-facing shell over the canonical A52/A53/A54 chain without creating a second gameplay engine.

The Player must be able to show meaningful current state and execute authored canonical actions while preserving runtime ownership:

`artifact -> A53 session -> A55 presentation -> input -> canonical runtime -> A53 replacement -> feedback`

## Delivered

- player-facing responsive shell replacing A54 technical host diagnostics;
- deterministic conservative player-perspective projection;
- day/time HUD;
- current location and unambiguous scene label;
- local characters from Actual Presence only;
- body/fatigue/satiety/sleep-debt read surface;
- physical carried-item/container summary;
- explicit economy gap surface rather than invented money state;
- canonical Narrative Move action list scoped by actor/Story runtime/location;
- canonical action execution and outcome feedback;
- Story-state effects immediately reflected in available actions;
- explicit input-required state for skill checks;
- safe unresolved/empty/error states;
- accessibility regression and narrow-viewport browser proof.

## Important invariants preserved

- no authored schema migration;
- no A52 artifact version change;
- no A53 save/session version change;
- no duplicate Guard/Move/effect/simulation implementation;
- no hidden random roll;
- no schedule-as-presence shortcut;
- no arbitrary protagonist selection;
- no arbitrary active-scene selection;
- no editor ownership in Player;
- no fake economy state;
- no render-time persistence side effects.

## Verification history

### S1

Initial **#493 FAIL** was a browser-test selector ambiguity only: both heading and explanatory paragraph matched the same text.

Exact S1 head `a923035470da6316f9aca4b7d0479b25333ee561` — **#494 GREEN**:

- 346/346 suites;
- 2098 passed;
- Chromium 2/2;
- Vite/Electron smoke PASS.

### S2

**#495 FAIL** — compile-time TypeScript narrowing defect in the new action result union; fixed without runtime semantic change.

**#496 FAIL** — regression fixtures incorrectly expected pre-compile Actual Presence to survive A52 fresh-runtime compilation. Repository evidence confirmed A52 intentionally initializes `actualLocationByCharacter: {}`. Tests were corrected to establish live presence after materialization through canonical runtime APIs.

Exact S2 head `c8d26b15a585dc0c053eb8653bf1e7c391195ce7` — **#497 GREEN**:

- 348/348 suites;
- 2103 passed;
- Chromium 2/2;
- Vite/Electron smoke PASS.

### S3

Exact implementation head `0764c93f235699c29cb6d7e2a877d7fe6f4681a1` — **#498 GREEN**:

- 0 production dependency vulnerabilities;
- lint/web/player/Electron builds PASS;
- **348/348 Jest suites**;
- **2104 passed**, 23 skipped, 42 todo; 2169 total;
- 0 snapshots;
- Chromium canonical Player smoke **3/3 passed**;
- Vite smoke PASS;
- Electron smoke PASS.

The third browser scenario uses a compiled artifact with explicit runtime Actual Presence fixture solely to exercise presentation. It does not alter or disguise A52 fresh-game compiler behavior.

## Browser proof

At a 390x844 viewport:

1. standalone Player boots;
2. player Actual Presence resolves to `Автовокзал`;
3. exactly present NPC `Катя` is visible;
4. authored action `Поздороваться` is enabled;
5. click delegates to canonical Move resolution/application;
6. canonical outcome `Катя отвечает` is displayed;
7. authored Story-state effect completes the owning node;
8. the action disappears on the next presentation projection.

## Recovery

A55 has no data migration.

Rollback is code-only: revert player presentation/action UI to A54 technical host while keeping A52 artifact, A53 session/save and A54 host/package boundaries intact.

## Gate state

- E0 Evidence: **PASS**
- E1 Scope: **PASS**
- E2 Contract: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS**
- E5 Verification ladder: **PASS — #494 / #497 / #498**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS for implementation — PR #28 open, draft and mergeable**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery/learning: **PASS**

**Decision:** A55 implementation is verified. This documentation closure commit requires its own full exact-head CI before PR #28 can be considered merge-ready.
