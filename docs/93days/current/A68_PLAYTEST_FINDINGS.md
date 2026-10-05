# A68-C1 — CAUSALITY PLAYTEST FINDINGS

Status: **ENGINEERING CAUSALITY WALKTHROUGH PASS / HUMAN UX WALKTHROUGH PENDING**
Updated: **2026-10-05**
Branch: `fix/a68-c1-causality-wording`
Base stable: `9ad85cc12a289dfe80073be5a0a5c119189ec746`

## Method

This pass intentionally separates engineering evidence from a real human UX playtest.

1. **Canonical-control causality walkthrough** — inspect and exercise the existing A68-C1 histories through the production Player path and verify that the Day 8 source split can lead to the Day 9 dorm consequence without hidden state mutation.
2. **Player-facing wording audit** — review only the information a Player can see at the cross-place consequence: Story opportunity title, local character and Move label.
3. **Human UX walkthrough** — a person plays the sequence without reading implementation state and explains why the Day 9 conversation is available. This remains pending and cannot be replaced by automated tests.

## Findings

### CONTENT / PRESENTATION — dorm echo assumed an auditory source

**Status: FIXED / ENGINEERING PASS**

The Day 9 Move was labeled:

`Рассказать дежурной, что услышал о завтрашнем вечере в клубе`

That wording is valid for the direct administrator path, but false for the canonical forum path where the Player **reads** the proposition. The same source mismatch also appeared in the cross-place Player memory as “Разговор из компьютерного клуба...”.

Fix:

- Story opportunity title now states the intended action directly: `Девятый день: рассказать в общежитии о планах компьютерного клуба`;
- Move wording is source-neutral: `Рассказать дежурной, что узнал о завтрашней игре в клубе`;
- the resulting Player memory uses `То, что я узнал...` rather than assuming a conversation.

Why: one shared downstream Move must remain truthful for both explicit provenance histories unless source-specific presentation is deliberately authored.

### PROVENANCE — direct and mediated histories remain distinct

**Status: PASS**

The wording fix does not flatten canonical knowledge provenance.

- administrator path remains `told` from `a68-club-worker`;
- forum path remains `mediated` with medium `forum` and attribution `north_bridge`;
- both carry the same semantic Claim into the later dorm interaction;
- the dorm duty character learns only when the Player explicitly tells her.

No automatic rumor propagation or new reputation/provenance system is introduced.

### RUNTIME / TOOLING

**Status: NO GAP FOUND**

The issue is authored wording, not a runtime limitation. Existing source typing, Player presentation, save/restore and authoring contracts remain sufficient for this C1 slice.

## Human walkthrough questions

The remaining manual Player pass should answer these without debug/state inspection:

- after the Day 8 club scene and a day transition, is it obvious why the Day 9 dorm Story opportunity appeared?
- does the Player remember that the information came from the Computer Club even if the exact source was the forum rather than the administrator?
- does “что узнал” feel natural for both source histories?
- is the Day 8 → Day 9 → Day 10 pacing understandable without waiting feeling like test scaffolding?
- can the player explain the chain **source → learned plan → chose to tell dorm duty → dorm reaction**?

## Closure rule

Engineering causality status is **PASS** when:

- both source histories keep distinct canonical provenance;
- the shared Day 9 Player-facing wording is truthful for both;
- regression tests cover the direct and forum paths;
- compile/build/full regression gates remain green.

Formal human UX closure remains **PENDING** until an actual person performs the Player walkthrough and records observations.
