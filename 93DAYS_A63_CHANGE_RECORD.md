# 93 Days — A63 Change Record

Change ID: **A63**  
Stage: **Exact-time Player delivery of authored NPC social work**  
Risk: **HIGH**  
Stacked base: `feature/a62-firsthand-social-repair` (PR #35), head at A62 baseline `fbff032730199e46fd5ff69737ac71ea321190be`  
PR: **#36** — `feature/a63-player-npc-social-delivery`  
Integration target after A62 is separately merged and post-merge verified: `93-days-editor`  
Date: **2026-09-23**

## Requirement

A60–A62 already model the Day Two phone invitation and meeting, a Day Three NPC report with source provenance, trust-sensitive assessment, Player-visible A61 social echo and optional A62 firsthand response. Formerly the NPC report and assessment required direct test-only invocation. A63 must deliver this explicit social work through ordinary canonical Player time actions without a second simulation clock, an unbounded rumor scheduler or schedule-derived Actual Presence.

## Implementation

- `src/application/narrative/player-time.ts` partitions canonical simulation advancement at exact authored due moments and delegates eligible due work to an explicit handler. Its typed simulation-result adapter preserves the existing project-level travel contract.
- `src/application/narrative/player-wait.ts`, `player-travel.ts`, `travel.ts` and `player-sleep.ts` share the segmented delivery path for the opt-in A63 project. Ordinary earlier projects keep declarative due-work semantics; project-level travel without a handler remains unchanged. Rejected time actions return the original Player session.
- `src/domain/narrative/content/93-days-player-npc-social-delivery.ts` derives A63 content from A62, marks the existing Day Three report one-shot at 08:15, and authors a separate contact walk from the dorm courtyard at 08:00 to the dorm at 08:15. It introduces one explicit in-transit location and an explicit initial contact courtyard placement for this A63-only project; this is not a projection of NPC schedule into Actual Presence.
- `src/application/narrative/player-npc-social-delivery.ts` starts that 15-minute canonical Story-work execution only when the contact is actually at the authored origin, puts the NPC in the real transit location, and recognizes completed travel at the exact arrival moment. External relocation during transit is respected. The report is delivered only with both NPCs actually at the authored destination and a single history-consistent canonical report Move. It then composes existing Story-work consumption and deterministic trust-sensitive NPC assessment.
- Missing physical presence produces a recorded missed encounter without invented Knowledge. Co-located NPCs with insufficient meeting-history evidence leave the report **unresolved**, not falsely marked missed. A61 `told(contact)` and A62 `told(player)` remain independently sourced.
- One-shot Story occurrences and runtime-only save/restore prevent duplicate report execution without a new save field, schema bump or hidden RNG.

## Verification

- `a63-player-npc-delivery-gap.test.ts` preserves the old A62 behavior: observing A61 due work does not automatically execute NPC report in a non-opted-in artifact.
- `a63-player-time.integration.test.ts` covers exact due segmentation, long/split wait equivalence and project-end clamp.
- `a63-player-npc-delivery.integration.test.ts` covers kept / missed / declined histories at both trusted and cautious assessment levels, source provenance, echo and firsthand response, real contact arrival and absence, timed Player travel and overnight sleep, save/restore and repeated waits. The negative test for co-located NPCs with no reportable history passed in exact-head #645.
- `e2e/player-host.spec.ts` now tests the actual standalone A63 Player from a canonical Day Three runtime fixture: the player waits across 08:00 and 08:15, sees the correct A61 echo and performs the subsequent A62 direct reply through actual UI buttons.
- **Branch Check #642 GREEN** on `9477236cac734081414277387b0f86e6bb74edbe` before authored NPC travel.
- **Branch Check #643 FAILED** on `aa985099f5ec202d2d8b68d4e04df4e6eedc8e4e` due to one unused import in the new content builder; corrected in `673df7763ffffd008c0611d9f7cc2e9dd8476819`.
- **Branch Check #644 GREEN** on exact `673df7763ffffd008c0611d9f7cc2e9dd8476819`: production audit zero vulnerabilities, lint PASS, web/standalone Player/Electron builds PASS, **378/378 Jest suites; 2233 passed, 23 skipped, 42 todo; Chromium 11/11**, Vite/Electron smoke PASS. Run: https://github.com/LeksonSwef28/twinejs/actions/runs/35807154379
- **Branch Check #645 GREEN** on exact documentation-and-regression head `4e4b35055daa2c41b414945f6dbd6ddd07665da4`: production audit, lint, web/Player/Electron builds, the full Jest suite, canonical standalone Player Chromium smoke, Vite and Electron startup smoke all PASS. This run includes the post-#644 missing-history correction and its negative regression. Run: https://github.com/LeksonSwef28/twinejs/actions/runs/35807592037
- This record-sync commit is docs-only; verify its own exact-head CI before changing PR #36 from Draft.

## Self-review / remaining boundaries

- No global autonomous NPC travel planner or fan-out was added; A63 schedules exactly one authored 15-minute contact walk and one pre-existing report. Broader movement requires its own explicit design.
- Player presence at a travel destination is applied only after route time finishes. Body/sleep effects still belong to existing canonical systems.
- A63 does not retroactively enable automatic delivery in A61/A62 projects or change their compiler/runtime semantics.
- The A62 raw Move API's independent day/time admission limitation is unchanged; the normal Player presentation handles day/location gating.
- Exact implementation-head #645 passed and stacked-base review is clean. Sync PR #36 description and mark ready for review only after the subsequent docs-only exact-head check. **Merge is not authorized** without a separate immediate user instruction for each PR. Post-merge stable verification remains pending.

## Recovery

Drop/revert additive A63 content, time adapter, Player integrations, tests and docs; A62 artifact v1/schema v3 and older save formats remain unchanged. Do not merge A63 directly into stable before A62's separately authorized merge and post-merge verification.
