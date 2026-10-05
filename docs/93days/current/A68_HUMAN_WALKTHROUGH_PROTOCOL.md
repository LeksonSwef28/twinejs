# A68-C1 — HUMAN CANONICAL PLAYER WALKTHROUGH PROTOCOL

Status: **READY / HUMAN EXECUTION PENDING**
Updated: **2026-10-05**
Required stable baseline: `93-days-editor@15ef305ceb926824de21e90237adf536102ef468`
Production project: `93-days-computer-club-cycle-v1`

## Purpose

Close the remaining A68-C1 human UX/pacing gate without using debug state as evidence.

This is a **human observation protocol**. Automated tests already cover runtime correctness,
provenance, save/continue, repeated relationship state, Player presentation structure and authoring.
The remaining question is whether a person can understand the sequence while actually playing it.

## Preconditions

1. Run the editor from the required stable baseline.
2. Open a Story and the Narrative workspace.
3. Open **EXPORT / COMPILER**.
4. If the current Narrative Project is replacement-safe and not already A68-C1, click:
   **`Загрузить A68-C1 production project`**.
5. Confirm the panel shows:
   - **Production target:** `A68-C1 · 93-days-computer-club-cycle-v1`;
   - **Готовность:** `Готово к сборке`;
   - no blocking diagnostics.
6. Click **`Открыть Player`**.
7. From this point, do not inspect project JSON, runtime state, test fixtures or source code while answering the UX questions.

If authored data already exists and the starter button is intentionally disabled, do not overwrite it automatically.
Use a clean/replacement-safe Story for this walkthrough.

## Walkthrough A — direct source

### Day 1 → Day 8 setup

Play through the canonical arrival path into the dorm and advance through the existing first-week content using ordinary Player controls.

The exact choices before Day 8 may vary. Do not optimize around implementation state.

By Day 8:

1. travel from the dorm/student area to the Computer Club;
2. enter the Day 8 club Story opportunity;
3. choose the direct conversation with the club worker about the late game/session;
4. continue normally and return toward the dorm.

### Day 9 consequence

At the dorm around the authored Day 9 evening opportunity:

1. note what the Player UI tells you before entering the Story;
2. enter the Story;
3. choose the action:
   **`Рассказать дежурной, что узнал о завтрашней игре в клубе`**;
4. continue until the consequence resolves.

Without opening debug state, answer:

- Why was this Story opportunity available?
- Where did you think the information originally came from?
- Did the action wording feel natural and specific enough?
- Did it feel like **you chose to carry the information** into the dorm, or like the dorm somehow knew it automatically?

### Day 10 repeated contact

Return to the Computer Club for the Day 10 follow-up.

Answer:

- Did the club worker feel like the same person from the earlier encounter rather than a reset NPC?
- Was the continuation understandable from prior contact?
- Did the Day 8 → Day 9 → Day 10 spacing feel like ordinary play, or like waiting for scripted test timestamps?

## Walkthrough B — mediated/forum source

Repeat the C1 source split in a fresh run or clean save branch.

On Day 8, use the forum/mediated source instead of asking the worker directly.

At the Day 9 dorm consequence, answer:

- Does **`что узнал`** still feel truthful when the information was read rather than heard?
- Do you remember the Computer Club as the origin context?
- Can you distinguish “I learned this through the club/forum” from “the dorm already knew it”?
- Does the game need any additional Player-facing source cue, or is the current wording enough?

Do not require the Player to recite the internal provenance enum. The test is comprehension, not implementation vocabulary.

## Required observer questions

After the walkthrough, the human tester should be able to explain in their own words:

1. **Source:** where/how did the Player learn about the plan?
2. **Knowledge:** what did the Player actually learn?
3. **Agency:** what did the Player choose to do with that information?
4. **Consequence:** why did the dorm conversation/reaction happen?
5. **Continuity:** what made the Day 10 club interaction feel connected to the earlier encounter?

The core causality sentence should be explainable without debug state:

**source → learned plan → chose to tell dorm duty → dorm reaction**

## Finding classification

Record every issue using exactly one primary class:

- **CONTENT** — authored event, pacing, choice, text, NPC or route content is weak/wrong;
- **PRESENTATION** — correct state exists but the Player cannot understand or see it clearly;
- **TOOLING** — the author cannot make the required ordinary edit through canonical authoring tools;
- **RUNTIME** — canonical mechanics execute or persist the authored intent incorrectly.

Priority:

- **P0** — blocks completion or produces false/unsafe state;
- **P1** — major comprehension/pacing defect that should block C2 selection;
- **P2** — noticeable but non-blocking issue;
- **P3** — polish.

## Result template

Record the result in `A68_PLAYTEST_FINDINGS.md` under a dated **Human walkthrough** section:

- tester/date/build SHA;
- source path used: direct / forum / both;
- completed Day 9 consequence: yes/no;
- completed Day 10 repeated contact: yes/no;
- causality explanation in the tester's own words;
- pacing notes;
- findings with class + priority;
- final verdict:
  - **PASS — no P0/P1**;
  - **PASS WITH P2/P3**;
  - **BLOCKED — P0/P1 present**.

## Closure / next-step rule

- If the human walkthrough has **no P0/P1**, close the A68-C1 human gate and choose C2 from observed playtest pressure.
- If there is a **P0/P1**, open one focused defect slice and keep C2 unselected.
- Do not create a new social/runtime subsystem unless the reproduced issue cannot be expressed or fixed with the existing contracts.
