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
- Runtime/playtest/checkpoint changes remain outside authoring Undo/Redo history.

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

**Status:** DONE (2026-09-14). A48 covers project-wide authored-reference validation, Reaction Candidate Set references, isolated/unreachable Story structure, outcome/failure consequence coverage, RoutineRule overlap detection, contradictory and preview-unknown Guards, missing Story participants, partial/invalid exact placements, Story ↔ WORLD/TIME presence/location consistency with ScheduleException priority, suspicious authored schedule gaps, and actionable jump-to-source navigation across both canonical workspaces. The final closure passed the full branch gate; Story Brain remains read-only and navigation never advances the Simulation Playhead.

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

**Status:** DONE (2026-09-14). Interaction Templates support explicit typed Character roles and Claim slots, reusable guards and outcome effects bound through those slots, multi-step EventTemplate-style authoring patterns that materialize into ordinary canonical Narrative Moves, and a read-only pre-commit preview of the exact instantiated structure. The authoring UI can create, bind, inspect, preview, instantiate and remove reusable patterns without editing internal JSON/code; runtime never executes templates directly and no autonomous content generation was introduced. The implementation passed the full 93 Days branch gate before this status update.

**Goal:** let authors reuse structural narrative patterns without copying graph fragments manually.

Deliverables:

- richer Interaction Template authoring;
- reusable EventTemplate-style definitions where justified by editor workflows;
- typed role slots and role binding;
- reusable conditions/effects where duplication is currently required;
- preview of instantiated structures before committing them;
- no autonomous content generation.

## A50 — Editor Scale, Search & Navigation

**Status:** DONE (2026-09-14). A50 adds project-wide authored search and type filters across Story/WORLD-TIME entities, authored back-reference discovery with jump and local navigation history, safe multi-select Story location edits as one Undo step, browser-level off-screen render culling plus reusable Story/timeline virtualization projections, and preserves the existing indexed WORLD/TIME location hot paths and horizontal visible-range culling. Canonical entities remain independent from viewport visibility, editor navigation stays outside authoring Undo/Redo, and the implementation passed the full 93 Days branch gate before this status update.

**Goal:** make large projects practical to author, not merely possible to simulate.

Deliverables:

- index the known WORLD/TIME location hot paths;
- viewport culling/virtualization for large Story and timeline surfaces where needed;
- project-wide search and filters;
- jump-to-reference/back-reference navigation;
- bulk selection/editing for safe authoring operations;
- keep canonical entities independent from viewport visibility.

## A51 — Preview / Debug as an Authoring Laboratory

**Status:** IN PROGRESS (2026-09-17). **A51-S1 baseline stabilization, A51-S2 progressive disclosure + human-readable diagnostics, A51-S3 Typed Watches, A51-S4 Preview from here and A51-S5 Checkpoints / Time Travel are DONE.**

S4 preserves the core navigation/runtime boundary: Preview-from-here transfers typed authoring focus from the View Cursor or selected Story context into a fresh live-sourced sandbox, while never silently changing Simulation Playhead, Actual Presence, Knowledge or Story runtime state. The final S4 code head `cdbd446c8674efe072f4c58a636cbd23700c12cb` passed workflow #438 with 329/329 suites and 2019 passed tests.

S5 uses **snapshot-first, bounded, manual checkpoints** because `PreviewLaboratoryAction[]` is provenance rather than a complete deterministic replay log. Checkpoints are local to the Preview investigation, keyed by scenario id, capped by `PREVIEW_CHECKPOINT_LIMIT = 8`, isolated from authoring Undo/Redo/live runtime/persistence, and exposed only in Analysis. Restore preserves the scenario baseline, appends `checkpoint-restore` provenance, reuses existing stale-trace invalidation and causes Typed Watches to re-read restored sandbox state. Set from live clears the old source lineage, Reset keeps checkpoints, and Fork starts empty.

The final S5 code head `5fdecf08f4204c5d6e714575e02e4e4b609706fe` passed workflow **#445**: **331/331 suites**, **2030 passed tests** (23 skipped, 42 todo; 2095 total), diagnostics upload PASS, Vite smoke PASS and Electron smoke PASS. S5 closure is recorded in `93DAYS_A51_CHANGE_RECORD_S5.md` and `93DAYS_A51_S5_CHECKPOINT_TIME_TRAVEL_ADR.md`.

The next permitted slice is **A51-S6 — Reproduction metadata**, but it is evidence-first: inspect the repository/runtime for an actual hidden/random source before adding any random seed/token contract. Current skill checks already take explicit `skillValue` + `rollTotal`; if no hidden randomness exists, S6 must reflect that actual model rather than invent RNG infrastructure.

The overall A51 stage is **not DONE** and PR #24 remains open/unmerged.

**Goal:** let an author test assumptions and consequences without pretending the editor is the final game UI.

Deliverables:

- set/fork/reset preview state;
- inspect and modify test-only runtime inputs explicitly;
- evaluate Move eligibility/resolution traces without mutating authored definitions;
- force/select Outcomes for authoring inspection where safe;
- compare alternative preview scenarios;
- inspect downstream state changes and occurrence provenance;
- use finite typed Watches for focused runtime facts without coupling authoring UI to arbitrary object paths;
- transfer explicit Story/View authoring focus into a fresh sandbox without fabricating runtime time/presence/knowledge;
- create/restore/remove bounded snapshot checkpoints inside the isolated sandbox without using authoring Undo/Redo or live-runtime history;
- preserve checkpoint lineage semantics across Set from live / Reset / Fork / scenario switching / Preview-from-here remount;
- keep preview/checkpoint state isolated from project persistence;
- add reproduction metadata only where actual runtime evidence requires it.

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
