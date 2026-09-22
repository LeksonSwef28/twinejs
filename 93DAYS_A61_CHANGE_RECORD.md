# 93 Days — A61 Change Record

Change ID: **A61**  
Stage: **Rumor & Social Echo**  
Risk: **MEDIUM**  
Stable source SHA: `9531bc4a9c1d919fe30e034060232b18cba2cb30`  
Feature branch: `feature/a61-rumor-social-echo`  
PR: **#34**  
Implementation evidence head: `930be316fca8622d22b790393fba4de0db059171`

## Problem / requirement

A60 proved a direct phone/SMS relationship, but the 93-day production loop still needed one small, explainable social-echo chain:

`A60 meeting result -> NPC tells NPC -> listener stores provenance -> listener evaluates source trust -> later Player-visible reaction`

The proof had to distinguish kept meeting, accepted-but-missed meeting and declined-in-advance without adding an automatic rumor graph or second cognition system.

## Expected

The runtime should be able to:

- communicate one canonical Claim from one concrete NPC to another;
- preserve the teller as `KnowledgeSource.told(sourceCharacterId)`;
- keep Claim confidence distinct from source trust;
- rank authored NPC reactions using the existing ReactionCandidateSet/NPC decision boundary;
- expose the resulting social echo as canonical Player Story/Moves;
- save/restore the complete runtime consequence;
- explain alternatives through Story Brain and Preview;
- keep authored definitions immutable and fresh compiled runtime state empty.

## Root cause / repository evidence

**CONFIRMED.**

Existing canonical systems already supplied the required semantics:

- Claim / Knowledge provenance;
- communicated-Claim Move effects;
- memories and relationships;
- ReactionCandidateSet scoring;
- explicit deterministic NPC decision selection/execution;
- Story state overrides and runtime occurrences;
- Player presentation;
- runtime-only Player save/restore;
- Story Brain and Preview Laboratory.

No generic rumor engine was required.

## A61-S1 — rumor provenance

Added canonical content in:

`src/domain/narrative/content/93-days-rumor-social-echo.ts`

The content adds:

- three Claims for kept / missed / declined histories;
- a Day Three NPC-to-NPC report Story;
- concrete report Moves from the existing local contact to the existing dorm-duty NPC;
- authored confidence per communication;
- `character-learns-claim` using the communicated Claim;
- source resolution through `move-actor`, yielding runtime `told(contact)`;
- a listener memory tied to the communicated Claim;
- append-only runtime occurrence evidence.

Focused integration proof:

`src/application/narrative/__tests__/a61-rumor-provenance.integration.test.ts`

The first exact-head attempt, **#619**, failed because four dormant echo nodes used partial `{day, locationId}` placement. Story Brain correctly classified that as blocking `partial-story-placement`. The fix kept the nodes location-scoped and let the Day Three assessment open them.

**#620 GREEN** on `16feef426ec0f8bcecc306dc5323580dbd83aafe` verified the corrected S1 path.

## A61-S2 — source trust and NPC reaction

Added one authored ReactionCandidateSet for the listener.

For each concrete rumor Claim it contains:

- a “believe” candidate;
- a “reserve judgment” candidate;
- branch guards that require the corresponding listener Knowledge;
- a declarative `relationship-at-least` trust criterion for the believe candidate;
- deterministic scores with no hidden random draw.

The selected canonical NPC Move can:

- adjust listener -> player goodwill;
- add a listener memory;
- open a later Player-visible Story node;
- complete the assessment Story.

### Ownership correction discovered by CI

An early content draft attempted to place `trust: 0.65` directly into `project.relationships`.

**#621 failed**, and the failure exposed the correct architecture: `relationships` are runtime state, and fresh compiled artifacts intentionally materialize without that mutable relationship baseline. The compiler was correct to discard the attempted builder-side runtime state.

The initializer was removed.

A61 now authors only the trust criterion/weight. Integration evidence supplies explicit runtime RelationshipState premises:

- `0.65` -> trust criterion met -> believe candidate wins;
- `0.30` -> trust criterion unmet -> reserve candidate wins.

This keeps source trust and Claim confidence separate and preserves the authored/runtime boundary.

**#624 GREEN** verified deterministic selection and effects.

## A61-S3 — Player-visible social echo

Added four dormant dialogue Story nodes:

- warm recognition;
- guarded recognition;
- neutral recognition;
- cautious recognition.

The trusted met / missed / declined branches open distinct warm / guarded / neutral echoes. Reserve-judgment candidates open the cautious echo.

Each echo is a normal Player Narrative Move:

- visible only after its Story state is opened;
- location-scoped to the existing dormitory;
- gated by real Actual Presence through `characters-share-location`;
- presented by the existing Player projection;
- completed through the canonical Story-state effect;
- records a Player memory rather than exposing a debug “rumor score”.

No new Player social UI or rumor-specific runtime projection was added.

**#624 GREEN** verified the Player presentation/action paths.

## Persistence proof

A61 uses the existing Player save codec unchanged.

The integration regression saves after the NPC report/assessment, materializes a fresh session from the same artifact, restores the save and verifies preservation of:

- listener Knowledge + teller provenance;
- runtime trust;
- assessment outcome occurrence;
- opened Player echo Story;
- Player-visible continuation.

**#625 GREEN** on `0e474a7eb0d3b3a3614a9d1342205cdb212e58b1` verified this path.

No save version, runtime snapshot format, artifact version or project schema changed.

## Story Brain / Preview production evidence

On the final implementation head:

- Story Brain exposes the assessment ReactionCandidateSet;
- trusted-source believe candidates are available at score 4;
- reserve candidates remain available at score 2;
- the source-trust consideration is visible as a met weight-3 trace;
- Preview executes believe and reserve alternatives from the same branch state;
- scenario comparison exposes relationship, memory, Story-state and runtime-occurrence differences.

**93 Days Branch Check #626 — GREEN** on `930be316fca8622d22b790393fba4de0db059171`:

- production audit: **0 vulnerabilities**;
- lint/builds: PASS;
- Jest: **374/374 suites**;
- tests: **2207 passed, 23 skipped, 42 todo, 2272 total**;
- Chromium canonical Player smoke: **10/10**;
- Vite smoke: PASS;
- Electron smoke: PASS.

## Architecture review

Stable-to-implementation:

- **12 commits ahead / 0 behind** stable;
- production change is one A61 content module;
- no second rumor propagation engine;
- no graph-wide fan-out;
- no rumor queue/social-belief store;
- no new mutable runtime field;
- no save/artifact/schema bump;
- no schedule -> Actual Presence copy;
- no hidden RNG;
- no duplicate Move/reaction resolver.

The A61 test suite and docs are the remaining changed boundaries.

## Recovery

Rollback is additive:

- revert A61 content/tests/docs;
- A60 stable phone/social loop remains intact;
- no stored-data migration is required;
- no runtime format needs recovery.

A future need for authored initial interpersonal relationships is a separate contract. It must not be implemented by seeding mutable runtime fields inside authored content builders.

## Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 S1 rumor provenance: **PASS — #620 / #626 GREEN**
- E5 S2 source trust: **PASS — #624 / #626 GREEN**
- E6 S3 Player echo + persistence: **PASS — #624 / #625 / #626 GREEN**
- E7 Self-review / implementation CI: **PASS — #626 GREEN**
- E8 Merge: **PENDING — requires a new explicit user message “мердж” immediately before merge**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**

## Current conclusion

A61 proves a concrete, provenance-preserving social echo with explainable source-trust scoring and a later Player-visible consequence while keeping runtime ownership singular.

Implementation is verified. The remaining pre-review step is docs-only closure exact-head CI. Merge is not authorized by prior messages and remains separately gated by a new explicit user “мердж”.
