# 93 Days — CONTEXT SOURCES AND PRECEDENCE

Status: **CURRENT**
Updated: **2026-10-03**

This file prevents old roadmaps, research packs and engineering history from competing as equal truth.

## 1. What works now

First source:

- current `93-days-editor` stable code;
- `93DAYS_CURRENT.md`;
- files under `docs/93days/current/`.

Historical contracts may explain why code exists but do not override current verified behavior.

## 2. Technical invariants

Current primary sources:

- `93DAYS_ARCHITECTURE_V11.md`;
- `93DAYS_ENGINEERING_CHANGE_PROTOCOL.md`.

Older Architecture V9/V10 are historical.

## 3. World/story canon

Current source family:

- MASTER CURRENT v31;
- its `CURRENT_STATE.md`;
- v31 thematic revision files.

v30 and older remain valid only where v31 did not explicitly override them.

Important current concept anchors recovered from v31/v14:

- summer 2000;
- bus arrival through the single external road corridor;
- dormitory as home/social hub (working decision);
- no return ticket/map;
- living city rather than post-apocalypse;
- modernization vs accumulated past;
- investigation optional;
- lived-summer ending principle;
- interpersonal state distinct from generalized social beliefs;
- source trust/provenance for rumors;
- memory/reconciliation over time.

## 4. Research atlases

Relations, identity, culture, appearance, city-history and architecture research are evidence/idea banks.

They are not automatically:

- game canon;
- NPC biographies;
- interpersonal values;
- group attitudes;
- dialogue lines;
- relationship deltas.

Social graph colors mean typicality of intersection, not friendship/enmity.

Research-country labels are provenance coordinates, not biological “races” or mandatory one-to-one fictional nations.

## 5. Engineering history

Files under `docs/93days/history/` record completed designs, contracts, CI/change records and old roadmaps.

Use them when:

- tracing an architectural decision;
- investigating regression ownership;
- checking compatibility intent;
- reconstructing why a current invariant exists.

Do not use them as the first answer to:

- what milestone is active?
- what remains?
- what is the current stable status?
- what should we do next?

## 6. v14 design pack

`93days_twine_design_pack_v14_post_A63_2026-09-28.zip` is the most important recent planning archive used in this rebase.

Its A64-A69 numbering was explicitly **proposed**, not automatically official.

This rebase preserves the useful intent while correcting it against actual implementation history:

- A64-A66 are now completed history.
- A67 remains the original first-week milestone, with D1-D3 treated as enabling gap closures.
- A68/A69 remain proposed future milestones until their gates are opened.

## 7. Visual/Godot branch

Game Visual Development / Godot research is separate from the current TwineJS-first production path.

It may inform future presentation decisions but does not currently block Narrative Project,
authoring, Player or content production work.

## 8. Current entry rule

When starting a new chat, audit or implementation phase:

1. read `93DAYS_CURRENT.md`;
2. read only the specific current file it points to;
3. inspect current code/live GitHub evidence;
4. enter `docs/93days/history/` only if a concrete historical decision must be traced.

This is the intended context-minimization policy.
