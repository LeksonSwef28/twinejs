# 93 Days — CURRENT ROADMAP

Status: **CURRENT**
Updated: **2026-10-03**

This file reconciles the post-A52 production roadmap, the 2026-09-28 v14 proposed A64+ roadmap,
the actual A64-A67 implementation history, and the current stable repository.

## 1. Milestone status

| Milestone | Original intent | Current status | What remains |
|---|---|---|---|
| A53-A55 | Player runtime/host/presentation | DONE | historical |
| A56-A59 | vertical slice + everyday systems + production loop | DONE | historical |
| A60-A63 | phone/social provenance/rumor/firsthand/NPC delivery | DONE | historical |
| A64 | editor→Player continuity Day 1→4 | DONE | historical |
| A65 | real authoring pilot | DONE | historical |
| A66 | local authoring workflow/navigation friction | DONE | historical |
| A67-D1 | shared author focus/context | DONE | enabling work |
| A67-D2 | authored item placement | DONE | enabling work |
| A67-D3 | Schedule Exception authoring | DONE | enabling work |
| **A67** | **first coherent playable week** | **ENGINEERING PASS / HUMAN UX PLAYTEST PENDING** | one manual Player UX/pacing walkthrough |
| **A68** | second social/city content cycle + playtest | **PREPARED / BLOCKED ON A67 HUMAN UX WALKTHROUGH** | C1 Computer Club bridge batch prepared |
| **A69** | production-scale authoring/performance gate | **PROPOSED / FOUNDATION READY** | validate on real A68-scale graph |
| Post-A69 | 93-day production + endings | **UNPLANNED AS EXECUTION PLAN** | weekly/season plan + ending matrix |

## 2. A67 — First coherent playable week

### Goal

Turn the proven Day 1-4 vertical/social chain into a coherent first week.

A67 is primarily **content production**. New editor/runtime mechanics are allowed only when a concrete
content batch proves a missing contract.

### Existing proof

Day 1-4 already exercise:

- arrival and uncertain navigation;
- actual/scheduled presence;
- travel and time;
- conversation with multiple Moves;
- knowledge/provenance;
- relationships/social consequences;
- phone/SMS;
- rumor and source trust;
- NPC-to-NPC occurrence;
- firsthand correction;
- delayed consequence;
- food/money/body/inventory integration;
- save/continue;
- canonical Player continuity.

### Enabling gaps already closed inside A67

- D1: author focus / contextual navigation.
- D2: authored initial item placement.
- D3: Schedule Exception CRUD in WORLD/TIME.

### Remaining A67 work

The Day 5-7 implementation/runtime proof is now present. Canonical authoring and cold Player control proofs also pass. Remaining closure work is intentionally narrow:

- conduct one manual week-level Player UX/pacing walkthrough;
- classify any human-observed findings into CONTENT / PRESENTATION / TOOLING / RUNTIME;
- fix only P0/P1 blocking findings before closing A67.

Implemented first-week proof includes:

- at least one additional social hub/location cluster;
- NPC routines that matter to content;
- at least two intersecting social lines, not one linear continuation;
- events that can be attended, missed, changed, or learned about later;
- delayed consequences crossing multiple days;
- one autonomous NPC chain whose player-visible result depends on prior provenance;
- continued material/time/body choices where they matter;
- explicit week-level playtest evidence.

### A67 gate

A67 is done when:

1. a cold Player run can reach the end of Day 7 through canonical controls;
2. at least two legitimate histories produce different week-end knowledge/relationship/event state;
3. Day 1-4 regressions remain green;
4. the editor can author the week without direct TypeScript content surgery for ordinary content changes;
5. any new tooling/runtime change is backed by a reproduced authoring/gameplay gap;
6. save/continue across the week remains safe;
7. a real playtest identifies content/presentation/tooling/runtime findings separately.

## 3. A68 — Second content and social cycle

Status: **PREPARED; production implementation remains blocked until the A67 human UX/pacing walkthrough has no P0/P1 blocker.**

### Goal

Expand from one week to a broader social/city network using the established provenance/runtime model,
not a second relationship or rumor engine.

### Prepared first batch

See `docs/93days/current/A68_CONTENT_CYCLE_PLAN.md`.

A68-C1 is grounded in MASTER v31 around the Computer Club / central-student transition. It should add two new NPC roles, reconnect at least one A67 character, and prove cross-place provenance consequences without a new internet/rumor engine.

### Expected scope

- new city points and at least one new district/social-hub cluster;
- a wider NPC network with overlapping group membership;
- social lines that connect existing and new NPCs;
- work/leisure/institutional/neighborhood contact, not only dialogue scenes;
- multiple local city-change disputes as content seeds;
- real playtest focused on whether consequences are understandable.

### Social design rules

- relationship dimensions and generalized social beliefs remain distinct;
- rumor/source trust remains explicit;
- group/culture research describes likely intersections, not deterministic friendship/enmity;
- a single NPC may bridge socially distant groups;
- research-country/culture atlases are source material, not direct game-state values.

### Historical/cultural use

Use concrete decisions from the current MASTER v31 selectively.
Do not dump 1871-2026 research into year-2000 dialogue or NPC metadata.

### A68 gate

- the broader network creates consequences across NPCs/places without hidden auto-spread;
- at least one cross-group relationship evolves over repeated events;
- playtesters can explain why a major social consequence happened;
- content remains authorable through canonical tools;
- findings are converted into focused defects, not architecture rewrites by default.

## 4. A69 — Production scale gate

Status: **PROPOSED / FOUNDATION READY.**

### Existing baseline

Synthetic scale/performance evidence already exists from A45/A50:

- 93-day simulation fixture;
- 744 Story nodes / 743 connections;
- 96 scheduled characters;
- 96 daily RoutineRules;
- 24 locations;
- dense 3,000-memory runtime;
- snapshot size/restore gate;
- reaction ranking gate;
- Story Canvas culling;
- WORLD/TIME virtualization.

This is valuable regression evidence but not a substitute for production-scale content.

### A69 goal

Measure the editor/runtime using the real graph produced by A67+A68.

Measure at minimum:

- real Story graph size and render behavior;
- Project Search latency;
- validation/diagnostic latency;
- save size after meaningful runtime history;
- save restore time;
- long Simulation Playhead advancement;
- WORLD/TIME interaction at real NPC/routine density;
- Story Canvas performance at real authored graph density;
- Player load/interaction responsiveness.

Optimize only measured bottlenecks.

### A69 gate

- a documented production-scale fixture is derived from real game content;
- budgets are measured, not guessed;
- regressions are automated where stable enough;
- no semantic shortcut is introduced to hit performance targets;
- bottlenecks have owners and before/after measurements.

## 5. Post-A69 — 93-day production

Do not create one enormous “A70 = finish game” milestone.

After A69, create a separate production plan that divides the remaining summer into meaningful
weeks/seasons/arcs based on actual playtest throughput.

The plan must cover:

- additional districts/routes/social hubs;
- jobs/economy and transport only where authored arcs need depth;
- phone/forum/early-internet use where narratively justified;
- missed-event and rumor consequences over weeks;
- progressive health/injury depth only where gameplay uses it;
- long-term city reconstruction progression;
- people/places arriving, leaving, opening, closing or changing;
- late-summer convergence without forcing all content to be seen.

## 6. Ending matrix (required after production throughput is known)

The ending model should reflect the lived summer, not completion percentage.

Potential inputs:

- key relationships and trust/affection/grievance;
- social circles and bridges;
- knowledge and unresolved/contested claims;
- memories/high-salience events;
- money/work/material stability;
- habitual places;
- missed vs attended events;
- city-change positions/actions;
- people helped/alienated;
- whether the player chooses/affords departure and where;
- optional unresolved mysteries.

Do not freeze exact endings before real multi-week playtests show which state dimensions actually matter.

## 7. Tooling backlog policy

Potential future gaps include Character Inner World authoring, initial relationship authoring,
location hierarchy, richer travel topology, larger search/library UX and AI-assisted authoring.

These are **not automatic next milestones**.

Open one only when A67/A68 content proves a concrete author workflow or gameplay need.
