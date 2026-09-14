# 93 Days Narrative Editor — A47 Product / Authoring Audit

Date: 2026-09-14
Scope: `93-days-editor` after A47 authoring closure, persistence hardening and the first post-A46 reliability/performance fixes.

## Audit question

This audit evaluates the product as a **story creation editor**. A capability is not considered authoring-complete merely because its domain type, runtime behavior or persistence representation exists. The author must be able to create/inspect/edit the relevant authored definition through the product UI, or the product must explicitly classify it as read-only analysis/runtime state.

## Authoring flow under review

1. create/open project;
2. create project entities (characters, locations, items, facts, claims, initial knowledge);
3. draft Story nodes and connections;
4. author placement in WORLD/TIME;
5. author schedules/routines;
6. author Narrative Moves, guards, resolution, Outcomes and Effects;
7. author reusable Interaction Templates and Reaction Candidate Sets;
8. inspect Story Brain/continuity diagnostics;
9. preview/test authored content without rewriting authored state;
10. save/reopen and continue editing.

## Closed A47 findings

### CLOSED — WORLD/TIME routine schedules are authorable

`RoutineAuthoringPanel` now creates, edits and removes `RoutineRule` definitions through commands. The author can choose character, target location or absence, exact-time or period windows, day bounds and recurrence (`everyDay`, `weekly`, `everyNDays`, `explicitDays`). Invalid authoring input is rejected before the form is cleared, while the command/reducer layer remains the final validity boundary.

This preserves the architectural invariant **Scheduled Presence != Actual Presence**: routine editing changes authored schedule intent only.

### CLOSED — Story node metadata is authorable

`StoryMetadataPanel` exposes authored Story metadata rather than only displaying it. The author can edit title, description, kind, primary character and participants without mutating live runtime occurrence state.

### CLOSED — existing Story connection mode is authorable

`StoryConnectionsPanel` exposes existing connections and allows Reference / Executable mode editing where the connection kind and typed ports permit executable semantics. Invalid executable edges still degrade safely to Reference semantics through the domain rule.

This preserves **Reference Edge != Executable Edge**.

### CLOSED — Story runtime execution policy is authorable

`StoryMetadataPanel` exposes the authored execution policy: one-shot/repeatable occurrence mode, duration, optional miss window and interruption policy. The policy can also be reset to runtime defaults without changing current live execution state.

### CLOSED — Narrative Move condition/guard authoring matches the richer domain model

`MoveConditionsPanel` provides full UI authoring for the current condition family:

- `character-knows-claim`;
- `character-has-item`;
- `relationship-at-least`;
- `story-node-state`;
- `characters-share-location`.

Guards can be added, removed and negated. Condition resolution can select true/false Outcomes, and the author can return a Move to automatic resolution. Skill-check authoring remains available through the Move authoring surface.

This preserves **Eligibility != Resolution != Outcome != Effect**.

### CLOSED — canonical entity metadata is editable

`CanonicalEntityPanel` edits existing Character, Location, Objective Fact, Claim and Item Definition metadata while preserving canonical IDs. Canvas instances therefore remain references to canonical entities rather than becoming independent copies.

This preserves **Canvas Instance != Canonical Entity**.

### CLOSED — project rename is exposed

`ProjectIdentityPanel` exposes `project/rename` in the Narrative Workspace and keeps the change inside normal authoring Undo / Redo history.

### CLOSED — first routine authoring loop

The original A47 closure slice now exists end-to-end:

`Character + Location → authored RoutineRule → WORLD/TIME schedule block → save/reopen → same authored schedule`

It includes validated recurrence/time authoring, explicit removal, persistence and tests.

## Reliability closure completed alongside A47

The editor also received safeguards that were not part of the original authoring checklist but became necessary once the UI could create more authored data:

- corrupted/incompatible persistence payloads are copied to recovery storage before fallback;
- autosave is blocked while recovery is active, preventing a damaged project from being silently overwritten by a fresh empty project;
- persistence now has an explicit schema-v3 boundary with v2 and v1 migration sources;
- a valid v2 payload remains available as a migration fallback instead of disappearing when the current schema changes;
- the audited Jest coverage floor is enforced in CI;
- production dependencies are checked with `npm audit --omit=dev --audit-level=moderate`;
- the production dependency tree currently passes that gate with zero vulnerabilities;
- Node metadata and CI agree on Node 22.12+.

## A47 cleanup closed after the audit

The non-destructive UX tails found during the audit are now closed:

- the Story left rail points authors to the existing Objective Facts / Claims / Initial Knowledge models in Project Library instead of calling cognition a future layer;
- `OutcomeEffectsPanel` exposes `character-learns-claim` alongside the other typed Outcome effects, including fixed-character or Move-target recipients, fixed or communicated Claims, attitude, confidence and source;
- relationship endpoints, mood targets, character item placement and memory targets now share one Move-aware character-reference control that can author a fixed Character, `move-actor` or any valid `move-target`.

The original Narrative Move shortcut remains useful for the common "target learns the communicated Claim" case, while the general Outcome picker now exposes every current effect type and every current `NarrativeCharacterReferenceDefinition` variant without requiring JSON/code.

## Explicitly deferred work

### P2 — destructive canonical-entity deletion remains intentionally conservative

Canonical metadata can now be edited, but broad delete workflows are not exposed as a generic destructive CRUD surface. Before adding them, the editor should show inbound-reference diagnostics and either block unsafe deletion or offer an explicit repair workflow.

**Disposition:** carry into A48 validation/reference diagnostics and later authoring UX. Do not add silent destructive deletion.

## What is deliberately NOT an A47 defect

- Actual Presence is runtime state and should not be edited as if it were a schedule.
- Simulation Playhead is runtime state and should not become the authoring cursor.
- Story Brain is read-only by design.
- ReactionCandidate ranking is not the same as executing an NPC action.
- Body/injury/carrying runtime state does not require a general authoring CRUD panel merely because it exists in preview.
- A47 does not require creating game content, economy, jobs, city AI or a three-day playable game.
- A52 export/compiler portability is a separate milestone and is not reclassified as an A47 authoring failure.
- richer Interaction Template role-slot authoring belongs to A49 by roadmap rather than being pulled backward into A47.

## Transition to A48

The next milestone is **A48 — Validation & Story Brain 2.0**. Existing Story Brain already provides Focus, Impact, Why, Coverage and Bridge Finder analysis. Existing Coverage detects terminal/early-terminal branches, empty Outcome consequences, asymmetric outcomes and character frontiers.

A48 is now underway. Broken authored-reference validation is implemented as deterministic read-only diagnostics for canonical/story references, including nested Narrative Move references and Reaction Candidate Set dependencies. These findings are surfaced through Story Brain before destructive entity deletion is expanded.

The next A48 visibility gap found by this audit is that `projectFindingCount` is global while the detailed Coverage list is Focus-scoped. Some broken references can therefore be counted without any focused entity capable of surfacing their explanation. A project-wide diagnostic view should be added before destructive repair/delete UX depends on these findings.

## Status

**A47: DONE pending this branch's green CI/merge.** The non-destructive authoring loops and current authored effect/reference variants are available through UI without JSON/code. Broad destructive canonical-entity deletion remains deliberately deferred behind A48 reference diagnostics/repair UX rather than being misclassified as ordinary A47 CRUD.
