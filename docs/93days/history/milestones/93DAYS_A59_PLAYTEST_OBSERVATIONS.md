# 93 Days — A59 First Engineering Playthrough Observations

Status: **TRIAGED / A59-S3**  
Source stable: `22ff1e408f48455e7125b3dec65ad5393700992a`  
A59 implementation evidence through: `4ce6d143ab1bb20740503051893f1a8ff3f691da`  
Relevant CI: #568, #570, #576 GREEN

## Observation format

Each observation records:

- exact build/SHA;
- route/history;
- expected player experience;
- observed experience;
- evidence/reproduction;
- classification;
- severity;
- canonical owner;
- next action.

Severity here is production triage, not a political/product preference score:

- BLOCKER — prevents the vertical-slice Definition of Done;
- HIGH — major player/content loop break;
- MEDIUM — meaningful friction or missing evidence;
- LOW — polish/content opportunity.

## A59-OBS-01 — Player save codec existed but standalone Player had no Save/Continue controls

**Build observed:** stable `22ff1e408f48455e7125b3dec65ad5393700992a`  
**Route/history:** real A58 standalone Player path.

**Expected:** the player-facing slice can save, reload the page/host and explicitly continue with previous runtime history preserved.

**Observed:** A53 already had the runtime-only Player save codec and restore compatibility checks, but `PlayerApp` exposed no Save/Continue action and had no browser-storage adapter.

**Evidence/reproduction:**

- repository ownership review found `createNarrativePlayerSave` / `restoreNarrativePlayerSave*` in the application layer;
- Player UI had no invocation of those APIs;
- A59 added a browser-storage adapter rather than a second save format;
- component test proves save -> fresh Player -> Continue;
- real Chromium test proves save -> browser reload -> Continue;
- exact implementation head `4ce6d143ab1bb20740503051893f1a8ff3f691da` passed #576 GREEN.

**Classification:** `presentation`  
**Severity:** BLOCKER for vertical-slice closure, not a runtime-mechanics defect.  
**Canonical owner:** standalone Player host/presentation; save semantics remain `src/application/narrative/player-save.ts`.

**Resolution:** RESOLVED in A59. No artifact/save version change; no automatic restore; incompatible authored build is rejected by the existing codec.

## A59-OBS-02 — Real Day Two consequence is explainable without new diagnostic architecture

**Build observed:** A59 S2 `ed401708b69980429db2d5cac69090835a88d7b9`.

**Route/history:** Day One clerk route knowledge -> Day Two known-route reflection.

**Expected:** an author can answer why the Day Two action is unavailable before learning the transfer route and available afterwards.

**Observed:** existing Story Brain WHY reports the guard unmet before the Claim is learned and met afterwards; Claim Impact reaches the dependent Day Two Move.

**Evidence/reproduction:** `a59-story-brain-preview-production-evidence.test.ts`, #570 GREEN.

**Classification:** `tooling`  
**Severity:** LOW — positive validation, no defect.

**Canonical owner:** existing Story Brain query/index and canonical authored Move/Claim.

**Next action:** reuse the current Story Brain workflow for A60+ content. Do not create a duplicate consequence graph.

## A59-OBS-03 — Choice comparison works at authored-content level

**Build observed:** A59 S2 `ed401708b69980429db2d5cac69090835a88d7b9`.

**Route/history:** polite clerk question vs abrupt clerk question.

**Expected:** authors can inspect whether two existing authored choices create materially different runtime histories before doing a full playthrough.

**Observed:** Preview forks execute the two canonical Moves and comparison exposes different relationship, memory and runtime-occurrence state; source project remains unchanged.

**Evidence/reproduction:** `a59-story-brain-preview-production-evidence.test.ts`, #570 GREEN.

**Classification:** `tooling`  
**Severity:** LOW — positive validation, no defect.

**Canonical owner:** Preview Laboratory + canonical Move/Outcome definitions.

**Next action:** use Preview fork/compare for branch authoring; reserve Player/browser runs for player-facing closure.

## A59-OBS-04 — NPC-only dorm occurrence is runtime-real but currently has no direct player-facing echo

**Build observed:** A59 S1 `3f3350ff67908107f5ecb937bd6c174979b1d3e7`.

**Route/history:** player is at the water-tower transfer at 18:00 while dorm duty and resident are at the dorm; NPC-only Story work executes.

**Expected:** the world can advance independent NPC history without teleporting the protagonist or requiring a dialogue screen.

**Observed:** canonical runtime records the occurrence while the protagonist remains elsewhere. The current A57/A58 content does not directly surface that specific occurrence to the player later.

**Evidence/reproduction:** A59 Definition-of-Done regression, #568 GREEN.

**Classification:** `content`  
**Severity:** LOW — not a mechanics failure; the independent-world requirement is already satisfied.

**Canonical owner:** authored Story consequences/rumors/memories if a later player-visible echo is desired.

**Next action:** A60+ content may add a delayed authored echo only if it improves the intended story. Do not add a generic NPC-event notification system merely to expose it.

## A59-OBS-05 — No canonical runtime-mechanics gap was reproduced by the full vertical slice

**Build observed:** A59 S1/S2/S3 through `4ce6d143ab1bb20740503051893f1a8ff3f691da`.

**Route/history:** arrival -> conversation -> optional event -> purchase/pack/eat -> paid travel -> NPC-only event -> lodging/sleep -> Day Two -> save/reload/continue.

**Expected:** runtime mechanics required by the slice work through canonical APIs.

**Observed:** the full regression and browser proofs complete without requiring new Move/effect/simulation/economy/body/carrying/save semantics.

**Evidence/reproduction:** #568, #570, #576 GREEN.

**Classification:** `runtime-mechanics`  
**Severity:** LOW — positive evidence; no defect.

**Canonical owner:** existing A53-A58 runtime.

**Next action:** runtime changes in A60+ require a newly reproduced mechanics gap rather than speculative architecture work.

## Triage conclusion

The first A59 engineering playthrough produced one genuine vertical-slice blocker: missing Player-facing access to the already-existing save/restore capability. It was fixed at the presentation/host boundary.

The remaining observations validate the intended production loop or identify optional content opportunities. No evidence supports an A59 rewrite of canonical runtime, Story Brain or Preview architecture.
