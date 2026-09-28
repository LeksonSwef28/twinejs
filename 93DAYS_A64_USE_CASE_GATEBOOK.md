# 93 Days — A64 Use Case Gatebook

Status: **Gate 1 implementation verified; final exact-head CI pending**
Base: `93-days-editor@8967fdf8ea327b5355a29175171cc7b233065645`
Date: **2026-09-28**

This gatebook separates authoring/tooling acceptance from gameplay acceptance. A use case is not PASS merely because a lower-level unit/integration test exists.

## TW-UC-001 — Author launches the adapted TwineJS locally

**Actor:** author

**Preconditions:** repository checkout on the intended branch; Node >=22.12; npm >=10.

**Main path:** install dependencies -> start Vite -> open a Story -> Narrative Workspace is available.

**Windows alternative:** use `npm.cmd` when PowerShell execution policy blocks `npm.ps1`; do not weaken execution policy for this workflow.

**Expected result:** working local web authoring session with exact branch/SHA recorded.

**A64 status:** NEEDS LOCAL USER-MACHINE EVIDENCE. CI/Vite smoke is not a substitute for the author's Windows machine.

## TW-UC-002 — Author creates one meaningful branching scene

**Actor:** author

**Main path:** Character/Location -> Story node -> two mutually exclusive Moves -> Guards/Outcomes -> Story Brain WHY -> Preview both paths -> correct the source entity.

**Expected result:** one testable branching scene in the canonical Narrative Project; no secondary Passage-authored gameplay graph.

**A64 status:** DEFERRED TO A65 PILOT unless A64 discovers a blocking authoring command gap.

## TW-UC-003 — Author exports exactly the A63 production chain

**Actor:** author

**Preconditions:** current Narrative Project contains the A60-A63 authored chain and has an explicit identity.

**Main path:** validate -> compiler diagnostics -> A52 artifact -> artifact identity check -> development handoff or standalone package -> Player.

**Alternatives:** invalid project blocks atomically; older artifact keeps its older semantics.

**Expected result:** Player runs exactly the selected canonical artifact.

**Evidence:**
- compiler/export/handoff ownership: PASS;
- fresh editor project selection of A63 content: GAP CONFIRMED on stable base.

**A64 status:** PASS in implementation. S3 proved the existing A63 artifact is cold-playable; S4 adds an explicit safe production starter in the real Editor/Export path. Existing authored projects are never auto-replaced.

## TW-UC-004 — Player reaches Day Two from a cold Day One start

**Actor:** player

**Precondition:** artifact is compiled directly from `create93DaysPlayerNpcSocialDeliveryProject()`; no Day Three runtime fixture substitution.

**Main path:** arrival -> route decisions -> dorm -> sleep -> Day Two -> SMS -> accept or decline.

**Alternative histories:** accepted-and-met; accepted-and-missed; declined.

**Expected result:** canonical, distinguishable Story/runtime histories with no direct test-only executor calls after browser boot.

**A64 status:** PASS — #651 cold Chromium path starts at Day One and reaches Day Two through only rendered Player controls.

## TW-UC-005 — NPC executes the A63 08:00/08:15 social work

**Actor:** simulation orchestration / NPC

**Preconditions:** A63 project identity; Day Three; real Actual Presence requirements.

**Main path:** 08:00 departure -> 15-minute authored transit -> 08:15 arrival/report -> canonical told(contact) provenance -> deterministic trust-sensitive assessment -> Player-visible echo.

**Negative paths:** absent at departure; externally relocated in transit; co-located without reportable history; long wait/travel/sleep crossing exact moment.

**Expected result:** one explainable occurrence; no fabricated Knowledge; no duplicate on repeated wait or save/restore.

**A64 status:** PASS — narrow A63 regressions remain covered and #651 crossed the real 08:00/08:15 delivery inside the cold continuous browser path.

## TW-UC-006 — Player answers personally or leaves the rumor unanswered

**Actor:** player

**Preconditions:** Day Three report/echo exists and Player is physically able to interact with the dorm-duty NPC.

**Main path:** inspect echo -> direct truthful answer -> told(player) provenance remains separate from told(contact) -> corresponding Day Four follow-up.

**Alternative:** walk away / silence -> no firsthand Knowledge -> different Day Four follow-up.

**Expected result:** observable Day Four difference caused by the actual Day Three Player choice.

**A64 status:** PASS for the direct-answer branch — #651 reaches and consumes the answered Day Four follow-up. The silence alternative remains covered by the existing narrower A62 integration regression.

## TW-UC-007 — Save / close / continue inside the four-day path

**Actor:** player

**Main path:** save at a meaningful point before or after an irreversible social occurrence -> reload -> Continue -> proceed.

**Expected result:** same authored artifact identity, restored runtime only, no duplicated report/Move/Story-work effect.

**A64 status:** PASS — #651 saves the progressed Day Three session, reloads the immutable cold artifact, continues from runtime save state, then reaches Day Four without replaying the social work.

## Gate 1 decision table

| Requirement | Current decision |
|---|---|
| One canonical authored Narrative Project | PASS |
| Compiler compiles the selected project, not a hidden builder | PASS |
| Player consumes the compiled artifact | PASS |
| Fresh Editor can explicitly select A63 production content without overwriting authored work | **PASS — S4 production starter** |
| Cold Day One -> Day Four canonical Player branch | **PASS — #651 Chromium** |
| A63 exact-time NPC delivery | **PASS — narrow regressions + #651 cold path** |
| Day Four direct-answer vs silence consequence | **PASS — direct branch cold; silence narrow integration** |
| Save/Continue through the continuous branch | **PASS — #651** |
| New runtime semantics justified | **NO — S3 proved none are needed** |

## Gate rule

S3 starts from the A63 builder directly to answer one question first: **can the existing canonical Player/runtime already play the full cold authored chain?**

- If YES, the S4 change is tooling/bootstrap/content selection only.
- If NO, the failing step is reduced to the smallest reproduction and assigned to its actual owner before implementation.

## Gate 1 verification trail

- #651 GREEN on `005a4fbb6c221d8797e23fa2e554efa96fbdd620`: untouched cold A63 artifact, 378/378 Jest suites, 2234 passed, Chromium 12/12, Vite/Electron smoke PASS.
- #656 FAIL on `70896cc7397baa04ae965af51b4ccef0f9892d08`: exactly one component-test mock omitted the new starter context method; real route bootstrap regression passed and production build/lint were green.
- Mock corrected without production changes. Final exact-head Branch Check is required before Ready for Review.
