# 93 Days — CONTENT STATUS

Status: **CURRENT**
Updated: **2026-10-05**

This file tracks what the canonical production content actually covers.
It intentionally distinguishes implemented content from research/concept material.

## 1. Current canonical content builders

| Builder | Coverage / role | Current interpretation |
|---|---|---|
| `93-days-arrival-corridor.ts` | Day 1 arrival world | bus station, transport square, food point, dorm route, NPC presence/routines |
| `93-days-day-one-day-two.ts` | Day 1-2 narrative | first contact uncertainty, conversations, optional/missed events, next morning reflection |
| `93-days-everyday-systems.ts` | vertical-slice everyday systems | food/body/money/item integration over existing narrative |
| `93-days-phone-social-loop.ts` | Day 2-3 | SMS/reply/meeting and Day Three consequence |
| `93-days-rumor-social-echo.ts` | Day 3 | NPC-to-NPC report, source trust, social echo |
| `93-days-firsthand-social-repair.ts` | Day 3-4 | direct answer/silence and Day Four follow-up |
| `93-days-player-npc-social-delivery.ts` | Day 3 delivery orchestration | exact-time NPC movement/report delivery in Player time |
| `93-days-first-week.ts` | Day 5-7 first-week continuation | Old City/dorm routes, missable events, later evidence, divergent week-end histories |
| `93-days-computer-club-cycle.ts` | Day 8-10 A68-C1 | Computer Club routes/NPCs, source split, cross-place dorm echo, repeated bridge relationship |

## 2. Day coverage

### Day 1

Strongest current vertical-slice foundation:

- arrival by bus;
- navigation uncertainty;
- travel/time;
- food/material decisions;
- initial NPC contact and routines;
- route to lodging.

### Day 2

- continued authored narrative;
- phone/SMS social contact;
- optional meeting path;
- consequences diverge from prior actions.

### Day 3

- social echo / rumor provenance;
- NPC-to-NPC occurrence;
- source-trust-sensitive assessment;
- Player-time NPC delivery;
- opportunity for firsthand correction.

### Day 4

- follow-up reflecting whether the player answered personally or left the report unresolved.

### Day 5-7

Implemented A67 first-week continuation:

- Old City market/cinema social line;
- dorm alternative;
- missable/offscreen events with later evidence;
- delayed consequences across days;
- multiple legitimate week-end histories;
- canonical save/continue and authoring coverage.

Engineering proof is complete; one manual week-level Player UX/pacing walkthrough remains pending.

### Day 8-10

Implemented A68-C1 Computer Club bridge batch:

- Day 8 Computer Club entry through explicit travel;
- two new NPC roles with authored presence/routines;
- same semantic Claim available through direct administrator provenance or mediated forum provenance;
- one prior A67 history changes a club interaction;
- Day 9 Player-carried dorm echo without hidden auto-spread;
- Day 10 repeated contact with the club worker using prior relationship/knowledge state;
- save/continue, Player-presentation causality and canonical-authoring acceptance coverage.

Engineering acceptance passes. Human C1 UX/pacing walkthrough remains pending.

## 3. Recovered narrative/world principles that should guide new content

### The city is alive

Not post-apocalypse, not a simple “dying city”.
Industry, students, transport, port, shops, culture and ordinary life continue alongside mystery.

### Modernization vs memory

A recurring summer frame may use local reconstruction disputes:
market, tower, cinema, waterfront, unfinished metro, workshops, courtyards, transport.

Each should have multiple plausible interests.
Avoid a single authorial “correct faction”.

### Investigation is optional

The player may prioritize:

- music;
- relationships;
- work;
- parties;
- activism;
- exploration;
- internet/community;
- making money;
- finding a personal place in the city.

### Social consequences

Specific interpersonal events should affect specific relationships first.
Generalized social beliefs should require repeated/high-salience evidence.
Rumor credibility depends on provenance/source trust.
Memory decay/reinforcement and reconciliation remain valid.

### Social groups are not morality classes

Every social group should contain sympathetic, unpleasant, idealistic, hypocritical,
tired, accidental and contradictory people.

One NPC may belong to multiple distant circles.

## 4. Research vs game canon

MASTER v31 and its social/city research are source material.

The following must not be copied directly into game state without a content decision:

- research-country labels;
- social-atlas edge colors;
- broad culture-to-culture likelihoods;
- historical research details irrelevant to summer 2000;
- unapproved seed/candidate city events.

The social atlas describes likely intersections, not deterministic relationships.

## 5. Next content gate

A67 and A68-C1 engineering content targets are now implemented.

The next content decision is intentionally gated by human observation:

- run the A68-C1 Canonical Player walkthrough;
- classify any findings as CONTENT / PRESENTATION / TOOLING / RUNTIME;
- fix only P0/P1 blockers;
- choose A68-C2 from actual playtest pressure between the current MASTER-backed candidates;
- do not open a generic subsystem or prebuild multiple hubs without evidence.

Any missing editor/runtime capability discovered by that walkthrough should become a small,
evidence-backed sub-slice rather than replacing the content milestone.
