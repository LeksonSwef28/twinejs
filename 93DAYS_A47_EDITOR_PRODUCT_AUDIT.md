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

## Remaining A47 cleanup / explicitly deferred work

### P2 — Story left-rail cognition copy is stale

The Story left rail still says `Факты / знания — раздельные модели — следующий слой`, although Objective Facts, Claims and Initial Knowledge already exist in the global Project Library. This is stale product copy, not a missing domain or authoring capability.

**Disposition:** small UI-copy cleanup. It does not block A48.

### P2 — typed Outcome effect authoring is not yet consolidated into one surface

`OutcomeEffectsPanel` directly authors relationship, mood, item placement, Story-state and memory effects. `character-learns-claim` is still primarily reached through the Narrative Move authoring shortcut rather than the same general Outcome effect picker.

**Disposition:** UX consolidation candidate. The effect exists in the authored/runtime model, so this is not a simulation gap and does not block A48.

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

## Transition to A48

The next milestone is **A48 — Validation & Story Brain 2.0**. Existing Story Brain already provides Focus, Impact, Why, Coverage and Bridge Finder analysis. Existing Coverage detects terminal/early-terminal branches, empty Outcome consequences, asymmetric outcomes and character frontiers.

The first A48 addition should therefore not duplicate those diagnostics. The highest-leverage next slice is **broken authored-reference validation**: deterministic read-only findings for references to canonical/story entities that no longer exist or cannot resolve, surfaced through Story Brain before destructive entity deletion is expanded.

## Status

**A47: CORE NON-DESTRUCTIVE AUTHORING CLOSED.** The editor can complete the main authored loops through UI without JSON/code. Remaining A47 items are explicitly classified as P2 copy/UX/destructive-editing cleanup and do not block the start of A48 validation work.
