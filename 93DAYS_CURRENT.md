# 93 Days — CURRENT PROJECT CONTEXT

Status: **CURRENT SOURCE OF TRUTH**
Updated: **2026-10-03**
Stable baseline before this docs rebase: `93-days-editor@2860c316e99f831b0bb6ee4cc3118d626028e608`

> Start here for current 93 Days work.
>
> Files under `docs/93days/history/` are historical evidence, not current truth.
> Use them only to trace a past decision. If a historical document conflicts with this file
> or `docs/93days/current/`, the current layer wins.

## 1. Product

**93 дня до конца нашего лета** is a story RPG / interactive city adventure set in summer 2000.

The player arrives by intercity bus in a large unfamiliar city, has no return ticket or map,
and gradually builds a lived summer through time, relationships, knowledge, money, places,
missed events, routines, physical state and social consequences.

The 93 days are a frame, not an aggressive completion timer.

The intended ending is not a quest-completion percentage. It should reflect the **shape of the lived summer**:
who the player spent time with, which groups and places became important, who trusts them,
what they learned, what they missed, what they changed, and what changed without them.

## 2. Current technical product boundary

There are three separate products/layers:

1. **Authoring tool** — STORY, WORLD/TIME, Project Search, Story Brain, Preview, diagnostics.
2. **Canonical authored data** — one Narrative Project.
3. **Player** — a separate runtime UI executing the canonical TypeScript mechanics from a compiled artifact.

Non-negotiable boundaries:

- Narrative Project is the single authored source of truth.
- View Cursor != Simulation Playhead.
- Scheduled Presence != Actual Presence.
- Authored project != runtime save.
- Canvas instance != canonical entity.
- Preview/debug state never becomes Player truth.
- No second handwritten gameplay engine or duplicated Passage-authored gameplay graph.
- Runtime and save changes require evidence; content/tooling gaps do not justify runtime rewrites by themselves.

## 3. Where we actually are

A53-A66 established the canonical Player, vertical slice, social provenance loop,
editor-to-Player continuity and a real authoring workflow.

A67 was originally proposed as **the first coherent playable week**.
During A67, three concrete authoring gaps were discovered and closed first:

- **A67-D1** — shared author focus / contextual navigation — DONE.
- **A67-D2** — authored ItemInstance placement — DONE.
- **A67-D3** — Schedule Exception authoring — DONE, merged in PR #48.

These D1-D3 changes are enabling work for A67. They do **not** by themselves complete
the original A67 milestone.

Current authored production content is clearly continuous through approximately Day 1-4.
A coherent Day 5-7 content batch is not yet present as a canonical production milestone.

Therefore:

**A67 FIRST WEEK = PARTIAL / ACTIVE.**

Do not open an arbitrary D4 merely because another editor feature can be imagined.
The next tooling slice must be justified by a concrete Day 5-7 authoring/content need.

## 4. Current roadmap

See: `docs/93days/current/ROADMAP.md`

Short version:

- **A67 — First coherent week:** ACTIVE / PARTIAL. Finish Day 5-7 content while keeping Day 1-4 regression green.
- **A68 — Second content/social cycle:** PROPOSED, blocked on A67 proof.
- **A69 — Production scale gate:** PROPOSED; synthetic scale foundation exists, production-scale proof does not.
- **Post-A69:** build a separate 93-day production plan by week/season and an ending matrix.

## 5. Current content status

See: `docs/93days/current/CONTENT_STATUS.md`

Known current content chain:

- Day 1: Arrival Corridor.
- Day 1-2: first complete narrative period.
- Day 2-3: phone/SMS social loop.
- Day 3: rumor/social echo and NPC-to-NPC delivery.
- Day 3-4: firsthand repair and Day Four follow-up.
- Day 5-7: not yet a coherent canonical production batch.

## 6. Product principles recovered from recent source packs

These are current planning principles and must not remain hidden only in archives.

### Lived-summer principle

The city and relationships should be observably different near Day 90 than on Day 1:
friendships form, rivalries harden or soften, rumors move, reconstruction progresses,
places open/close, people arrive/leave, NPCs accumulate shared history.

### Relationship vs social-belief separation

Interpersonal state may change relatively quickly:
familiarity, trust, affection, attraction, obligation, grievance, fear, respect.

Generalized social beliefs should move more slowly and require repeated/high-salience evidence.
A single encounter must not automatically rewrite a group attitude.

### Provenance and interpretation

- Specific-person events update interpersonal state first.
- Rumors need source identity / trust / credibility.
- Biography and social network affect interpretation.
- Memory decay, reinforcement and reconciliation are valid.
- Positive contact does not guarantee positive group-attitude change.
- Negative contact does not guarantee the opposite.

### Social-atlas rule

Research edges describe the typicality of intersections between social/cultural environments,
not friendship/enmity and not deterministic NPC behavior.

No research-group edge directly increments an interpersonal meter.

### City theme

The city is alive, not post-apocalyptic or simply dying.

A long-running thematic frame is:
**the city modernizes but cannot completely remove its past**.

Reconstruction can appear across the summer as multiple local disputes:
markets, tower, cinema, waterfront, unfinished metro, workshops, courtyards, transport.

Each dispute should have several plausible sides (safety, convenience, jobs vs rent, memory,
informal economies, heritage). The game does not need one authorially “correct” faction.

### Player freedom

Investigation is optional. The player may spend the summer around music, relationships,
work, parties, activism, exploration, internet communities, money, or simply finding a place in the city.

## 7. Source precedence

See: `docs/93days/current/CONTEXT_SOURCES.md`

In brief:

1. Current stable code + current docs layer for what works now.
2. Current architecture/protocol for technical invariants.
3. MASTER v31 for world/story canon topics explicitly changed there.
4. Older MASTER revisions only where v31 did not override them.
5. Research atlases are evidence/idea banks, not automatic game canon.
6. Historical engineering docs are provenance, not current status.
7. Godot/visual research is a separate branch and does not block TwineJS-first work.

## 8. Current active references

- `93DAYS_ARCHITECTURE_V11.md` — current architecture invariants.
- `93DAYS_ENGINEERING_CHANGE_PROTOCOL.md` — change/gate protocol.
- `93DAYS_A59_CONTENT_PRODUCTION_KIT.md` — content production loop/checklist.
- `docs/93days/current/ROADMAP.md` — active milestone map.
- `docs/93days/current/CONTENT_STATUS.md` — canonical content coverage/status.
- `docs/93days/current/CONTEXT_SOURCES.md` — source precedence and recovered source decisions.

## 9. Historical documentation policy

Completed contracts, change records, obsolete roadmaps, old architecture versions and detailed
A67 Stage 0-8 design documents belong under `docs/93days/history/`.

Historical docs remain available for traceability, but should not be used to answer
“what are we doing now?” unless the current layer explicitly links to them.

For future large design sequences, keep live current docs compact and move the completed
decision trail into history after merge. Git/PR history remains the authoritative low-level audit trail.
