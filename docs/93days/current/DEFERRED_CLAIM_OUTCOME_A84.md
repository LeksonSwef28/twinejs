# A84 — Delayed Claim Outcome v1: canonically executed, scoped

Date: 2026-10-12
Status: **feature branch / exact-head CI and human author trial pending**.

## Scope and primary contract

A writer can add an ordinary `character-learns-claim` Outcome effect in the existing **Outcome Effects** UI and choose:
- **0 days:** unchanged immediate knowledge effect.
- **N whole days (1–92):** queue a Claim learning event relative to the **actual moment the Outcome is resolved**, not to the authored Story placement or creation date.

This intentionally excludes delayed relationship changes, mood, item movement, memory creation, general NPC opportunity scheduling, NPC autonomous decisions and weather. It does not invent a second clock, simulation engine, Story state or data store.

## Existing architecture reused

1. An authored `NarrativeKnowledgeEffectDefinition.delayDays?` field is optional and validated as a positive safe integer when present; default remains immediate for all existing content.
2. The existing `applyNarrativeProjectOutcome` records a real Move Outcome occurrence first, then schedules each delayed Claim in the append-only canonical `runtimeOccurrences` journal linked to that occurrence. Every repeated resolution gets a **different cause occurrence id**, even in the same game minute.
3. The existing canonical `advanceNarrativeProjectSimulation` calls the due-Claim settler. It applies knowledge through the *existing knowledge runtime applicator*, with preserved provenance, using the due moment for `learnedAt`; a fulfilled ledger event prevents repeated effects.
4. The existing Player time segmentation recognises pending exact due moments. A long `Wait` cannot skip the moment merely because it advanced through several days.
5. Existing runtime/project/player snapshot serialization and restoration retain the schedule and fulfilled provenance, with the same artifact/identity protections.
6. If scheduling would exceed the project's last day, record `expired/past-project-end` at the actual Outcome moment; never silently clamp or grant the Claim early. If the effect definition disappears before due, expire safely rather than applying an unrelated effect.

## Data semantics

- Source of truth is the append-only *runtime* ledger, not authored Story nodes or editor dates.
- The scheduled entry stores `moveId`, `outcomeId`, `effectId`, `causeOccurrenceId`, original moment and due moment.
- A terminal `applied` or `expired` entry closes that schedule. The knowledge state is changed **only** for the applied event, with its exact due time recorded.
- No silent mutation at authoring time or while navigating Preview.
- A scheduled Claim is a deterministic Outcome consequence, **not** an assertion that an NPC independently found a source or chose to transmit a rumor.

## Explicit limitations / next gates

- No cancel/reschedule/retract UI. This v1 deliberately does not author such behavior; an author must not assume that new choices can cancel a previously scheduled Claim.
- No general NPC autonomous delivery. Source provenance is the configured Outcome Claim source, tied to the original Story id.
- No player-facing notification system or timeline inspector for the pending ledger in this slice.
- All other effect types remain immediate and do not accept `delayDays`.
- Tests are automated behavior checks, not a non-programmer's measured authoring session. Human review should test whether '0 = immediate; N = elapsed full days after actual choice' is understandable and whether planned events are discoverable.

## Acceptance tests

- The Claim is not learned at authoring or Outcome resolution for positive N.
- Crossing the exact due game minute applies once, even across a large Wait, and logs exact provenance.
- Two real choices at the same minute schedule two independent completions.
- Snapshot before/after due reloads without duplicate delivery.
- A due date beyond day 93 expires explicitly.
- Invalid negative, fractional or zero-delay authored fields fail validation.
- Existing content with no `delayDays` maintains previous behavior.

**Do not mark generalized deferred consequences or human UX complete from this patch.**
