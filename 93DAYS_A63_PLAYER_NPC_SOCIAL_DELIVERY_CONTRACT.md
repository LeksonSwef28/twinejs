# A63 Contract — Player-Time NPC Social Delivery

Status: **IMPLEMENTATION IN PROGRESS — exact-head verification pending**
Risk: **HIGH**
Stacked source: `feature/a62-firsthand-social-repair` @ `fbff032730199e46fd5ff69737ac71ea321190be`
Stable integration target after A62: `93-days-editor`
Feature branch: `feature/a63-player-npc-social-delivery`
Date: **2026-09-22**

## 1. Evidence / confirmed gap

A61/A62 content and integration tests prove the authored social chain, but they explicitly orchestrate the NPC report and assessment in tests. Normal Player time progression does not.

Repository evidence:

- `stepNarrativeSimulation` advances the canonical Simulation Playhead and returns due work, but explicitly never executes Story or NPC behavior and never copies schedules into Actual Presence.
- `advanceNarrativeProjectSimulation` applies body/injury/active-story time effects and returns the same declarative due work.
- `executeNarrativePlayerWait` replaces the Player session with the advanced project and merely returns `dueWorkIds`.
- `executeNarrativeTravel` advances the same simulation clock before moving the travelling character to the destination.
- `executeNarrativePlayerSleep` advances the same simulation clock to the next morning.
- `consumeNarrativeStoryWork`, `resolveAndApplyNarrativeProjectMove` and `executeNarrativeNpcDecision` already own explicit Story/Move/NPC execution. A63 must compose these; it must not create replacements.

Therefore the missing boundary is **Player-session time orchestration of explicitly authored NPC work**.

## 2. Goal

Prove one production path:

`Player time action -> exact due moment -> explicit NPC-only Story delivery -> canonical Move -> optional canonical NPC reaction -> Player-visible A61/A62 consequence`

The first proof is the existing Day Three A61 contact→dorm-duty report and assessment. A63 is successful only when the same result can arise from ordinary Player time progression rather than test-only direct calls.

## 3. Core time invariant

A63 MUST NOT execute all crossed due work at the final time after a long wait/travel/sleep.

If a Player action crosses 08:15 and ends at 10:00, an 08:15 NPC event must resolve against the runtime state at its due moment, and its occurrence/provenance must use that moment (plus any explicit authored action duration), not 10:00.

Therefore Player time advancement that can trigger autonomous explicit work must be segmented by due moments:

1. advance to next due moment;
2. process eligible A63 automatic NPC work deterministically;
3. continue remaining requested minutes;
4. repeat until requested duration is consumed or a blocking condition occurs.

This is orchestration around the existing simulation kernel, not a second clock.

## 4. A63-S1 — generic explicit NPC-only Story delivery

A scheduled Story node is eligible for A63 automatic delivery only when all are true:

- exact authored day + minute exist;
- a valid runtime policy exists;
- the node does **not** include the Player among participants;
- the node is effectively `available`/`active`;
- one-shot work has not already been consumed;
- required authored location/presence predicates are satisfied by **Actual Presence**, never by schedule;
- delivery semantics are unambiguous:
  - either exactly one currently resolvable canonical Move owned by the Story node, or
  - exactly one authored ReactionCandidateSet owned by that Story node.

If zero or multiple execution routes are eligible, A63 does not guess. It emits a trace and leaves work unresolved for explicit handling.

## 5. A63-S2 — exact A61/A62 delivery content

The A63-derived 93 Days builder may add only the scheduling metadata/guards required to make the existing A61 report and assessment explicit automatic NPC work.

Required concrete path:

- Day Three contact report occurs only when contact + dorm-duty are actually co-located at the dormitory;
- report Move selection remains history-driven by existing guards (kept / missed / declined);
- listener Knowledge preserves `told(contact)` provenance;
- assessment occurs only after report Knowledge exists;
- ReactionCandidateSet selection remains the existing trust-sensitive deterministic selection;
- resulting A61 echo Story opens normally;
- A62 Player response remains a manual Player choice.

A63 may not invent trust, teleport contact, or infer contact presence from the authored routine.

## 6. Missed physical encounter

If the report becomes due and the two NPCs are not actually together:

- do not learn the Claim;
- do not execute assessment;
- do not open A61 echo;
- do not teleport either NPC;
- record/retain a truthful non-executed/missed Story history using existing Story-work semantics when the authored miss window expires.

A later authored encounter may be a different Story; A63 does not create a background retry queue.

## 7. Player time-action coverage

The segmentation/orchestration boundary must be shared by all Player actions that consume simulation time:

- wait;
- travel;
- sleep;
- any existing Story execution that advances time through canonical runtime.

Rejected actions remain atomic and return the original session.

Travel ordering must stay:

`validate origin/funds/body -> advance time through exact due moments -> pay -> arrive destination`

The travelling Player is not considered at the destination before route time completes.

Sleep applies its explicit body sleep state across the segmented duration and wakes at the authored next-day minute.

## 8. Determinism / ordering

At the same absolute minute:

- stable order is authored scheduled moment then stable work id;
- each work item is considered once for that occurrence;
- Move/reaction selection uses existing deterministic guards/scores;
- no random draw is invented;
- exact tied NPC decisions remain unresolved unless explicit RNG input already exists at the appropriate boundary.

A63 must prove that splitting a 120-minute wait into 2×60 minutes produces the same social/runtime result as one 120-minute wait when no Player decision occurs between the segments.

## 9. Persistence / replay

No new queue or save field unless evidence proves unavoidable.

Use existing canonical state to prevent replay:

- Story-work occurrences;
- Story-state overrides;
- Move outcome occurrences;
- Knowledge/memory/relationship state.

Save/restore before and after the NPC event must not duplicate it.

Fresh materialization remains free of mutable runtime consequences.

## 10. Failure atomicity

If an automatic NPC work item cannot be resolved unambiguously or violates presence/guard requirements:

- no partial Claim/memory/relationship mutation;
- no hidden fallback;
- no whole-session corruption;
- the Player's requested time action may continue only according to an explicitly tested policy.

A63-S1 default policy: ineligible work is skipped/traced; invalid orchestration definitions are surfaced as a development error and must not silently select a Move.

## 11. Non-goals

- general social graph propagation;
- a rumor queue;
- schedule→Actual Presence copying;
- automatic NPC travel planner;
- hidden RNG;
- rewriting A61/A62 social logic in Player UI;
- schema v4 / artifact v2 / new save format;
- global autonomous behavior for every ReactionCandidateSet in the project.

A63 proves one reusable *explicit scheduled NPC work* boundary. Broader autonomy requires separate production evidence.

## 12. Regression plan

Before implementation:

1. reproduce current gap: ordinary Player wait across Day Three does **not** produce A61 report Knowledge/echo;
2. prove exact due-moment occurrence after implementation;
3. kept / missed / declined history coverage;
4. trusted and cautious assessment coverage;
5. no-contact Actual Presence negative path;
6. long wait versus split waits equivalence;
7. travel crossing trigger preserves travel ordering;
8. sleep crossing trigger;
9. save before trigger → restore → cross once;
10. save after trigger → restore → no duplicate;
11. authored source immutability;
12. full canonical Player browser smoke.

## 13. Gate state

- E0 Evidence: **PASS — repository gap confirmed**
- E1 Scope / ownership: **PASS — application Player-time orchestration over existing canonical executors**
- E2 Contract / invariants: **PASS**
- E3 Regression design: **PASS**
- E4 Implementation: **IN PROGRESS — exact-time wait/travel/sleep delivery implemented; authored contact arrival and full host proof outstanding**
- E5 Verification ladder: **IN PROGRESS — #641 GREEN on test-only SHA 8a88cd29; later travel/sleep commits require new exact-head CI**
- E6 Self-review: **PENDING**
- E7 PR/CI: **PENDING**
- E8 Merge: **NOT AUTHORIZED**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS — stacked branch can be dropped without touching A62**

## 14. Stacked-branch rule

A63 currently depends on unmerged A62 PR #35. It must not be merged directly into stable before A62.

After A62 is explicitly authorized, merged, and post-merge verified, A63 must be rebased/rebased-equivalent onto the resulting exact stable SHA and re-run full CI. No prior A62 merge permission can authorize A63.


## 15. Implementation evidence (2026-09-22)

- `player-time.ts` segments canonical simulation advances at authored due moments; the compatibility adapter preserves the project-level simulation result contract for travel.
- `player-wait.ts`, `player-travel.ts` and `player-sleep.ts` use A63 delivery when explicitly opted into the A63 project identity. Legacy project-level travel and ordinary earlier-project sleep retain their original paths.
- `player-npc-social-delivery.ts` preflights exact time, NPC-only ownership, Story state, source history and real Actual Presence. It composes existing canonical Move, Story-work and NPC-decision executors.
- `a63-player-npc-delivery.integration.test.ts` covers six history × trust paths, source provenance, A61 echo / A62 response, absence, replay, save/restore, long/split wait and new travel/sleep crossings.
- **#641 GREEN** on `8a88cd29b4ed692593914c1c60e35f2fa9bd5e06`, including newly added positive wait tests. This is not CI proof for subsequent travel/sleep commits.
- **Outstanding:** authored arrival for the contact before the Day Three report, exact-head full CI for travel/sleep, a dedicated A63 standalone Player browser smoke and final self-review. No merge authorization.
