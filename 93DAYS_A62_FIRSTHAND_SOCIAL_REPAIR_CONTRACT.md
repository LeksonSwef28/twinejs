# A62 Contract — Firsthand Social Repair

Status: **IN PROGRESS — S1 content and regression implementation**
Risk: **MEDIUM** (canonical authored content + Player integration only)
Stable source: `93-days-editor` @ `44ade5dcbcb53e814cac131db383daeddb18b01f`
Feature branch: `feature/a62-firsthand-social-repair`
Date: **2026-09-22**

## E0 — Evidence / reason

A61 is merged (#34), and exact post-merge Jest, Playwright, ESLint and Prettify checks succeeded. A61 turns a Day Two met/missed/declined meeting into a Day Three NPC-to-NPC Claim, the listener's source-trust assessment and a Player-visible echo. The Player currently can acknowledge the greeting but cannot answer the hearsay directly. The listener's own later experience is therefore absent from this authored social arc.

A62 adds one deliberately small *firsthand* interaction after the A61 echo. It does not attempt to establish the objective truth of a character's statement or erase third-party knowledge.

## E1 — Ownership and scope

- Extend `create93DaysRumorSocialEchoProject()` via a new additive content builder.
- Reuse canonical Narrative Claims, Moves, Knowledge `told(sourceCharacterId)`, relationships, memories and Story state.
- An A61 Player echo opens the A62 conversation. The Player chooses to describe the *actual* Day Two history in person or walk away.
- The listener records a separate firsthand Claim only after the direct conversation; the original third-party Claim remains intact.
- A directly addressed interaction adjusts listener-to-player goodwill and opens a different Day Four follow-up from walking away.
- The Day Four follow-up is location/day-scoped and uses the existing Player action presentation.
- Test source immutability, mutually exclusive choices, actual co-location, three Day Two histories, cautious A61 assessment, no false Claim and runtime-only save/restore.

**Out of scope:** generalized rumor correction, adjudicating objective truth, automatic NPC contact, a global reputation meter, new Player presentation component, a second social state store, auto-generated dialogue, travel/Actual Presence shortcuts, schema or artifact changes.

## E2 — Observable contract

1. Before the player acknowledges the A61 greeting, A62's response Story is dormant; after the greeting it becomes available.
2. With the player and listener at the dormitory, one factual response consistent with the recorded A60 meeting history is available, alongside an option to leave. A response for an inconsistent history is blocked.
3. Direct response is a Player `inform` Move whose canonical communicated Claim the listener learns from `move-actor`; Knowledge provenance is `told(player)`.
4. Direct response adds a firsthand listener memory and a small listener→player goodwill effect, without deleting/replacing the earlier teller Claim or source trust.
5. Leaving adds no firsthand Claim or goodwill benefit. The two choices close the same response Story; a second choice is unavailable.
6. Day Four at the dormitory reveals distinct, mutually exclusive direct-answer / no-answer follow-up Story and Player Move.
7. Saving before Day Four, then restoring against the same authored artifact, retains the choice, source provenance, goodwill and correct follow-up. Older A61 content and saves remain untouched by a new separate builder.
8. Never infer knowledge merely from physical proximity or from a schedule; all learning is caused by the explicit Move.
9. Authored story/move/claim definitions remain immutable during execution. No hidden RNG.

## E3 — Verification design

- Artifact compilation + fresh materialization.
- Three scenario paths: meeting kept, accepted but missed, declined in advance.
- At least one low-source-trust scenario where A61 opens its cautious echo.
- Availability of direct action vs leave; invalid histories and non-co-located NPC block.
- Knowledge records both distinct third-party `told(contact)` and direct `told(player)` Claims.
- Assert exactly one Day Four follow-up and a stable save/restore round-trip.
- Exact-head GitHub Branch Check before PR review, then separate fresh explicit user `мердж` authorization.

## Invariants

- **A62-I01** — one canonical Narrative Project authored truth.
- **A62-I02** — firsthand and hearsay are separate Claims with separate `KnowledgeSource` provenance.
- **A62-I03** — Day Two history gates which firsthand statement the Player can make.
- **A62-I04** — the Player explicitly chooses; no automated moral judgment or arbitrary NPC forgiveness.
- **A62-I05** — no deletion or silent rewriting of earlier A61 trust, hearsay, relationship state or memory.
- **A62-I06** — Actual Presence must be real runtime state for a physical conversation.
- **A62-I07** — mutually exclusive Story state drives follow-up instead of a new save field.
- **A62-I08** — schema v3, artifact v1 and runtime-only Player save remain unchanged.
- **A62-I09** — any new money/job system or second cognition engine is a separate, higher-risk contract.
- **A62-I10** — merge is separately authorized and exact-SHA verified.

## Recovery

Content is additive in a new module and tests. Revert the A62 content/test/doc commits to return to unchanged A61 stable gameplay; no saved-data migration.

## Gate status

- E0 Evidence: **PASS**
- E1 Ownership: **PASS**
- E2 Contract: **PASS**
- E3 Test design: **PASS**
- E4 Implementation: **IN PROGRESS**
- E5 Exact-head CI: **PENDING**
- E6 Self-review: **PENDING**
- E7 PR/review: **PENDING**
- E8 Merge: **NOT AUTHORIZED**
- E9 Post-merge: **PENDING**
