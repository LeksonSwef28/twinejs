# A67 — FIRST WEEK COMPLETION PLAN

Status: **ACTIVE**
Updated: **2026-10-03**
Branch: `content/a67-first-week-completion`

## Goal

Complete the original A67 milestone: one coherent, canonical, playable Day 1→7 week.

This is a content-production milestone, not an editor-framework milestone.

## Existing continuity entering Day 5

By the end of the current Day 3→4 chain, the Player may have created materially different histories:

- accepted and kept the Day Two meeting;
- accepted and missed it;
- declined in advance;
- allowed a secondhand report to stand;
- personally corrected/explained it;
- created different goodwill/knowledge/memory provenance at the dorm.

Day 5-7 must **use these differences**, not reset them.

## Day 5 — Open the second social space

Introduce one additional social hub beyond the dorm while reusing current travel/time/runtime systems.

Preferred first hub: a public everyday location connected to the city's modernization-vs-memory theme, such as a market/cinema-adjacent square or similar working urban node.

Requirements:

- reachable by existing explicit-route mechanics;
- at least one existing NPC can plausibly connect the Player to it;
- at least one new NPC or role is introduced;
- prior Day 2-4 reputation/provenance changes at least one available line, tone, or later consequence;
- no requirement that the Player investigate the city-theme thread.

## Day 6 — Intersect two social lines

Create at least two simultaneous opportunities:

1. one line continuing an existing relationship/social consequence;
2. one line belonging to the new hub/network.

The Player cannot fully optimize both without a time/location tradeoff.

At least one event must be legitimately missable.

Missing it should not delete the content: Day 7 may expose the result through another person, phone, rumor, changed availability, or environment.

## Day 7 — Week-end consequence

Produce a visible consequence that differs across histories.

Minimum week-end distinctions:

- one branch caused by prior direct/secondhand social provenance;
- one branch caused by attended vs missed Day 6 content;
- at least one relationship/knowledge/memory difference;
- at least one Story state difference.

The Player must be able to reach Day 7 without seeing every scene.

## Autonomous-world requirement

A67 needs one world event that proceeds without the Player standing inside the scene.

Use the existing deterministic Story-work/NPC delivery pattern first.

Do **not** implement generic autonomous NPC AI merely to satisfy this requirement.

The Player should later see evidence of what occurred via:

- a report;
- changed NPC knowledge;
- a changed Story opportunity;
- a location consequence;
- or a phone/social message.

## Material/body/time integration

At least one Day 5-7 choice should make current everyday systems matter naturally:

- travel fare vs walking/time;
- sleep/fatigue;
- meal/digestion;
- carrying an item;
- cash;
- injury if already present.

Do not add a new survival meter.

## Authoring proof

Ordinary content changes for Day 5-7 must be possible through canonical authoring structures.

Direct TypeScript builder work is allowed for the current checked-in production fixture, but the batch must not require a new gameplay schema merely for convenience.

Any authoring friction discovered must be classified:

- CONTENT;
- PRESENTATION;
- TOOLING;
- RUNTIME.

Only TOOLING/RUNTIME blockers can open a new D4-style sub-slice.

## Acceptance histories

At minimum prove two complete Player histories:

### History A — socially engaged

- prior social line resolved directly;
- attends one important Day 5/6 event;
- receives a favorable or clearer Day 7 consequence.

### History B — partial/missed

- prior social information remains secondhand or cautious;
- misses/declines one event;
- learns about the consequence later rather than seeing the same scene.

These histories must differ in canonical runtime state, not only text.

## Definition of Done

A67 is complete when:

1. canonical Player cold-start reaches Day 7;
2. Day 1-4 regressions remain green;
3. Day 5-7 has a new social hub/network edge;
4. two social lines intersect;
5. one event is missable with later consequence;
6. one autonomous authored world occurrence is visible later;
7. at least two week-end histories differ in Story/knowledge/relationship/memory state;
8. save/continue works across the expanded week;
9. week-level playtest findings are recorded;
10. no unproven platform rewrite was introduced.

## Implementation order

1. **A67-W1 content skeleton** — IDs, locations/NPCs, Day 5-7 Story nodes and branch topology.
2. **A67-W2 runtime consequences** — Moves/Outcomes/Claims/knowledge/relationships/memories.
3. **A67-W3 autonomous/missed-event proof** — deterministic due-work and later evidence.
4. **A67-W4 Player regression** — cold Day 1→7, two histories, save/continue.
5. **A67-W5 playtest + closure audit**.

Each slice must stay reviewable and may reuse the same branch until the first-week PR is ready.
