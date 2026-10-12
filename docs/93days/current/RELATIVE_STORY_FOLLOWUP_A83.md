# A83 — Relative Story continuation planning: bounded authoring slice

Date: 2026-10-12
Status: **feature branch; exact-head CI and author GUI trial pending**.

## Problem

The A82 authoring trial could create an outcome-dependent follow-up scene but could **not** express the author's intention "a response two days after the original event" through a guided authoring workflow. An immediate `story-node-set-state` Outcome Effect is not a delayed application of any other effect.

## Existing architecture checked before implementing

- Canonical `StoryNodeDefinition.placement` has an exact authored day/minute and optional location.
- `scheduledStoryWork` projects exact placements as declarative work. The kernel reports due work when time advances; it does **not** choose to execute NPC actions or apply arbitrary effects.
- `consumeNarrativeStoryWork` is a separate explicit execution boundary; current production delivery handlers are intentionally opt-in for specific authored story work.
- Outcome effects are applied when a Move outcome actually resolves, **not** automatically at a future time.
- `story/setPlacement` is an existing undoable authoring command; no new scheduler, runtime type or persistence schema is necessary for relative **placement**.

## A83 implementation

In existing Story Metadata, an author can choose another Story as the anchor, enter a positive whole-number **N days**, preview an exact proposed day/time and click **Назначить время продолжения**. The helper refuses missing anchor time, self-reference, fractional/nonpositive days, a day outside 93 days and a follow-up with an existing day/time (no accidental overwrite or clamping). It preserves an existing location assignment.

The UI separately reports whether a Move owned by the anchor has an explicit authored Outcome that marks this follow-up Story `available`. **This is a diagnostic**, not an automatic new connection, and it makes clear such Outcome unlocking still happens immediately on resolution. It says prominently that the planner **does not schedule future knowledge/relationship effects or autonomously execute the Story**.

Automated checks cover exact offset, boundary refusal, current state unchanged, undoability, existing `scheduledStoryWork` projection, named author UI preview and no-overwrite.

## Safety and remaining requirements

- Do not confuse placement on day 11 with delayed delivery of knowledge on day 11.
- Do not change Simulation Playhead, Scheduled Presence, Actual Presence, runtime occurrence history or existing effects from planning.
- The effect might still have no causal relationship to the anchor. Planning time never silently creates causality.
- For a real "Миша узнает слух через 2 дня" feature, an independent future decision must establish a **canonical delayed Outcome Effect contract**: relative anchor (actual moment of outcome resolution), target recipient/Claim, cancellation/expiry, exactly-once execution, save/reload/replay semantics, timeline diagnostics and explicit NPC/world executor. This needs separate architecture/UX evaluation; do not repurpose only a Story title or promise an automatic scheduler.
- Human writer tests should ask the author to distinguish **time placement**, **immediate Outcome unlock**, and **future actual effect execution**, and identify confusing terminology. No claims of usability success from automated tests.

## Evidence gate

Feature implementation and tests are not equivalent to an author-completed task. Merge only after exact-head CI passes; verify post-merge independently.
