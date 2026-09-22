# 93 Days — A62 Change Record

Change ID: **A62**  
Stage: **Firsthand Social Repair & Day Four Follow-up**  
Risk: **MEDIUM**  
Stable base: `93-days-editor` @ `44ade5dcbcb53e814cac131db383daeddb18b01f` (A61 merged PR #34)  
Feature: `feature/a62-firsthand-social-repair`  
PR: **#35 — Draft until exact documentation-head CI completes**  
Implementation evidence: `4702b211692a52575fc5a0e69a6ab84ca64d7520` — Branch Check **#634 GREEN**

## Requirement and evidence

A61 proves Day Two direct contact → third-party NPC report → listener provenance → trust-sensitive reaction → Day Three Player echo. A62 gives the Player an explicit chance to speak for themselves after that echo. The direct account must coexist with, not overwrite, the third-party story; walking away must remain a consequential alternative.

## Expected behavior

- At the dormitory, after one A61 greeting, the Player may offer one direct account of the actual kept/missed/declined meeting or choose not to talk.
- Exactly one history-consistent response is presented for either high-trust A61 assessment or cautious assessment.
- Physical dialogue requires real Player + listener Actual Presence.
- Only direct explanation creates a distinct firsthand Claim in the listener's canonical Knowledge, with `told(player)` provenance; A61's `told(contact)` Claim is preserved.
- Explaining and leaving are exclusive and consume the same Story; revisiting completed echoes/follow-ups cannot re-open or replay the choice through raw Player action calls.
- The next day's Player presentation exposes exactly one authored location-scoped follow-up; the same runtime choice survives save/restore without schema changes.

## Ownership / implementation

Changes are additive and limited to:

1. `src/domain/narrative/content/93-days-firsthand-social-repair.ts`: derives from the A61 authored builder, adds three firsthand Claims, a response dialogue, six history × assessment-specific direct Moves, one leave Move and two exclusive Day Four follow-up Moves. Each A61 echo is decorated in the *A62 derived project only* to open the response Story and require that the echo is still available.
2. `src/application/narrative/__tests__/a62-firsthand-social-repair.integration.test.ts`: compiles the new builder and covers all six choices, negative presence, provenance, goodwill, authored immutability, exclusive one-shot decisions, Day Four projection and runtime-only save/restore.
3. A62 contract and roadmap, plus historical A61 contract/change-record post-merge reconciliation.

A62 reuses the canonical Narrative Move, Knowledge, relationship, memory and Story state APIs. It adds no new mutable field, no second cognition/rumor engine, no automatic fan-out, no hidden RNG, no schema/artifact/save bump and no schedule-to-Actual Presence copy.

## Confirmed defects and regressions

**#629 FAILED:** three lint `prefer-const` issues in the new integration fixture. Fixed by separating immutable branch expectations from the deliberately mutable Player session variable.

**#630 FAILED:** one bootstrap test assumed an empty NPC Actual Presence baseline, but A57 explicitly authors the first world-start NPC placements. The test now validates the real player and dorm-duty placements instead of weakening the world-start contract.

The remaining #630 failures exposed an action boundary: `executeNarrativePlayerAction` resolves the requested canonical Move's guards; it does not automatically reject all Moves simply because the owning Story is completed. A62's initial `walkAway` Move therefore allowed a second, conflicting choice after a direct explanation. Added explicit `story-node-state: available` guards to all response Moves, leaving no second response. **#632 GREEN** confirmed all prior failures fixed.

Self-review extended the same guard to the four A61 echo Moves in the A62-derived content and both A62 Day Four follow-up Moves. This prevents raw-API replay from reopening a consumed answer or repeatedly recording a Day Four outcome. Updated regression verifies rejected second choice and replay are atomic (same session), as well as Day Four suppression on Day Three. Set Day Four placement to midnight of Day Four because the current Player presentation gates actions at day granularity; a fictional 09:00 requirement cannot be enforced by content-only Moves without a separate time-guard design.

## Exact implementation proof

**93 Days Branch Check #634 GREEN** on `4702b211692a52575fc5a0e69a6ab84ca64d7520`:

- audit: **0 production vulnerabilities**;
- ESLint: PASS;
- TypeScript + Vite web: PASS;
- standalone canonical Player build: PASS;
- Electron main build: PASS;
- Jest: **375/375 suites; 2217 passed, 23 skipped, 42 todo (2282 total)**;
- canonical Chromium Player smoke: **10/10**;
- Vite and Electron smoke: PASS.

The preceding **#632 GREEN** proved the original response/placement corrections on exact earlier head `d9ae9be3a6fde8ac0db5fc5173fbfe6e5730111b`.

## Self-review and remaining limitation

This stage's visible Day Four availability is enforced by the Player presentation day/location filter and canonical Story state, with physical dialogue co-location in the Move guards. The existing raw Move API does not itself enforce authored day or clock-time placement for arbitrary externally supplied Move ids. A62 does not silently change shared runtime admission semantics. A later, separately contracted stage may deliver an integrated NPC social opportunity scheduler or stronger application-level action admission if required by production evidence.

Likewise, the test explicitly runs the A61 NPC report/assessment after setting concrete NPC Actual Presence. A62 does not pretend these decisions now happen automatically in the shipped host.

## Gate status

- E0 Requirement / repository evidence: **PASS**
- E1 Scope and source ownership: **PASS**
- E2 Contract and invariants: **PASS**
- E3 Regression design: **PASS**
- E4 Minimal authored implementation: **PASS**
- E5 Full implementation CI: **PASS — #632 / #634 GREEN; exact docs-closure head pending**
- E6 Self-review: **PASS — replay weakness closed and regression added**
- E7 PR gate: **DRAFT, pending exact documentation-head full CI**
- E8 Merge: **NOT AUTHORIZED — fresh separate explicit user “мердж” required immediately before any A62 merge**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**

## Recovery

Revert A62 content/tests/docs, retaining unchanged A61 authored builder and existing runtime. Since no persistence or schema format changed, no migration or runtime repair is required.
