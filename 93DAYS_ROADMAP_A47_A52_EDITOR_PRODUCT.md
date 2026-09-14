# 93 Days Narrative Editor — Roadmap A47 → A52

This roadmap starts after A46 stabilization. Its product is the **story creation editor**, not a specific 93-day game.

## Product rule

Every new stage must answer an editor question first:

> Can an author create, inspect, validate, reuse, preview, navigate or export this story concept through the product UI without editing internal JSON/code?

Runtime work is allowed only when it exists to preview, validate or execute authored content. Do not add game-specific economy, city behavior, autonomous writing or bespoke story content as a substitute for editor capabilities.

## Non-negotiable architecture constraints

- Exactly two top-level workspaces remain: STORY and WORLD/TIME.
- Split View remains a lens, not a third workspace.
- View Cursor != Simulation Playhead.
- Scheduled Presence != Actual Presence.
- Authored Story Definition != Runtime Story State.
- Authored Effect Definition != Applied Runtime Effect.
- InteractionTemplate != Concrete NarrativeMove != Runtime Occurrence.
- ReactionCandidate != PendingReaction != Executed Action.
- Story Brain remains read-only authoring intelligence; it must not become an auto-writer.
- Runtime/playtest changes remain outside authoring Undo/Redo history.

## A47 — Editor Product Audit & Authoring Closure

**Status:** DONE (2026-09-14). The final Move-relative effect-reference authoring closure passed the full branch gate and merged in PR #14.

**Goal:** make the existing A1–A46 capabilities genuinely authorable through the UI instead of merely present in the domain/runtime.

Deliverables:

- map domain/command capabilities to visible authoring surfaces;
- identify read-only or add-only editor dead ends;
- close high-priority WORLD/TIME schedule authoring gaps;
- expose editing for existing Story metadata that already has command support;
- remove stale UI text that claims implemented systems are “future layers”;
- establish an authoring-flow regression checklist from project creation through preview;
- full CI before marking DONE.

## A48 — Validation & Story Brain 2.0

**Status:** IN PROGRESS. Broken authored-reference diagnostics, Reaction Candidate Set validation, project-wide visibility and the first actionable Story-side jump-to-source path are merged. This branch adds conservative isolated/unreachable Story diagnostics: strict reachability is reported only when the executable graph has one unambiguous entry root.

**Goal:** turn architectural correctness checks into useful author-facing diagnostics.

Deliverables:

- unreachable/dead-end Story diagnostics;
- broken/dangling references;
- impossible or unknown guards;
- missing participants/placements where required by authored semantics;
- schedule/time conflicts and suspicious gaps;
- outcome/failure-path coverage diagnostics;
- Story ↔ WORLD/TIME consistency checks;
- actionable jump-to-source diagnostics;
- Story Brain remains advisory/read-only.

## A49 — Reusable Authoring Templates

**Goal:** let authors reuse structural narrative patterns without copying graph fragments manually.

Deliverables:

- richer Interaction Template authoring;
- reusable EventTemplate-style definitions where justified by editor workflows;
- typed role slots and role binding;
- reusable conditions/effects where duplication is currently required;
- preview of instantiated structures before committing them;
- no autonomous content generation.

## A50 — Editor Scale, Search & Navigation

**Goal:** make large projects practical to author, not merely possible to simulate.

Deliverables:

- index the known WORLD/TIME location hot paths;
- viewport culling/virtualization for large Story and timeline surfaces where needed;
- project-wide search and filters;
- jump-to-reference/back-reference navigation;
- bulk selection/editing for safe authoring operations;
- keep canonical entities independent from viewport visibility.

## A51 — Preview / Debug as an Authoring Laboratory

**Goal:** let an author test assumptions and consequences without pretending the editor is the final game UI.

Deliverables:

- set/fork/reset preview state;
- inspect and modify test-only runtime inputs explicitly;
- evaluate Move eligibility/resolution traces without mutating authored definitions;
- force/select Outcomes for authoring inspection where safe;
- compare alternative preview scenarios;
- inspect downstream state changes and occurrence provenance;
- keep preview state isolated from authoring Undo/Redo.

## A52 — Export / Compiler Boundary

**Goal:** prove that an authored Narrative Project can produce a runnable story artifact without maintaining a second hand-authored Passage graph.

Deliverables:

- define compiler/export contract from Narrative Project;
- deterministic mapping of authored Story/runtime definitions into runtime artifact data;
- validation gate before export;
- export diagnostics that point back to authoring entities;
- minimal runnable proof used only as compiler validation, not as a new game-development roadmap;
- no duplicate source-of-truth story graph.

## Execution rule

Work in order unless a blocking editor defect requires a small prerequisite fix:

`A47 → green CI → A48 → green CI → A49 → green CI → A50 → green CI → A51 → green CI → A52`

When a stage is complete, mark its status here in the same development cycle. Do not silently turn editor stages into game-content stages.
