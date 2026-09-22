# A62 Contract — Firsthand Social Repair

Status: **IMPLEMENTATION VERIFIED — PR #35 closure CI pending**
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
- E4 Implementation: **PASS — authored A62 branch, six direct-answer paths, one-shot Story guards, Day Four exclusive follow-ups**
- E5 Exact-head CI: **PASS for implementation — #632 / #634 GREEN; final documentation head pending**
- E6 Self-review: **PASS — blocked Move replay against completed echo, completed answer and completed follow-up; aligned Day Four placement with day-level Player presentation**
- E7 PR/review: **DRAFT — exact documentation closure CI pending**
- E8 Merge: **NOT AUTHORIZED**
- E9 Post-merge: **PENDING**


## Implementation and verification evidence (2026-09-22)

- Initial development established six Day Two history/source-trust paths plus save/restore and real Actual Presence checks in `src/application/narrative/__tests__/a62-firsthand-social-repair.integration.test.ts`.
- **#629 FAILED** on first draft for three `prefer-const` lint issues; corrected without suppressing rules.
- **#630 FAILED** because the initial A62 direct-response Move did not guard the owning response Story state. The raw Player action boundary could apply `walkAway` even after a direct explanation. The extra initial-presence assertion also incorrectly assumed world start places only the player, when A57 intentionally seeds several concrete NPCs.
- **#632 GREEN** after adding canonical response Story-state guards and correcting the authored NPC world-start assertion: 375/375 Jest suites, 2217 passed, 23 skipped, 42 todo, 2282 total; Chromium 10/10; production audit 0; all builds and Vite/Electron smoke PASS.
- Self-review confirmed the raw action boundary does not independently enforce owning Story state. To avoid another replay path, A62 decorates its four inherited A61 echo Moves with their authored `available` Story guard, and adds an `available` guard to each Day Four follow-up Move. This changes only the A62-derived content, not the A61 base builder or runtime.
- The new negative regression confirms an echo cannot be replayed to reopen the response Story, the other answer is blocked after the first choice, and the completed Day Four follow-up is not repeatable. Day Four authored placement uses minute 0 to match current day-level Player action presentation; actual conversation still requires co-location.
- **#634 GREEN** on exact implementation head `4702b211692a52575fc5a0e69a6ab84ca64d7520`: 375/375 Jest suites, 2217 passed, 23 skipped, 42 todo, 2282 total; Chromium 10/10; production audit 0; lint, web/Player/Electron builds and Vite/Electron smoke PASS.
- The exact final PR head must still pass CI after the documentation closure. Previous GREEN runs are evidence, not authorization to merge a changed head.

## Remaining boundary

A62 is a content extension activated after the explicit A61 NPC report/assessment and Player echo. It does not introduce background orchestration of those NPC decisions. The existing Player presentation filters authored Day Four Story by day and location; the raw Move API assumes a valid action id from that presentation and has no generic time-of-day guard. A later stage may address automatic NPC opportunity delivery / stronger action-session admission with its own risk review; A62 does not retrofit another runtime resolver.
