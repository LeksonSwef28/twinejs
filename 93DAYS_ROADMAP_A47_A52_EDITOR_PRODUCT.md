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

**Status:** DONE (2026-09-18). **A51-S1 through A51-S6 are merged and post-merge verified.** PR #24 merged into `93-days-editor` as `3d0f59219fca29d3338034777d8343b03c74cc45`; stable workflow **#454** passed 333/333 suites, 2037 tests, diagnostics upload, Vite smoke and Electron smoke.

A51 turns Preview/Debug into an isolated authoring laboratory rather than final player UI. Sandbox work stays outside authored source, authoring Undo/Redo, live runtime replacement and project persistence while continuing to delegate narrative semantics to the canonical runtime.

S1 stabilized architecture/contracts and CI boundaries. S2 established Preview → Analysis → Deep Debug progressive disclosure with human-readable diagnostics sourced from canonical traces. S3 added finite typed Watches. S4 added Preview from here while preserving View Cursor != Simulation Playhead and refusing to fabricate Actual Presence, Knowledge or Story runtime state. S5 added snapshot-first, bounded manual Checkpoints with same-scenario lineage, baseline-preserving restore and typed Watch re-evaluation.

S6 closes the stage with **finite typed reproduction metadata for explicit inputs that really exist in the canonical runtime**. Repository/runtime evidence found no hidden random source in Move resolution: skill checks already receive explicit `skillValue` + `rollTotal`. S6 therefore records exact typed test inputs, requested/applied advance minutes, resolved Move input/outcome, forced Outcome ids and checkpoint restore id; `Trace only` derives a read-only descriptor instead of appending provenance. Raw reproduction metadata is Deep Debug-only. No seed, RNG token, replay engine or event-sourcing contract was invented.

The final S6 code head `2aa3e6f63b29ae2f80515ad8e4c09b780b101aeb` passed workflow **#452**: **333/333 suites**, **2037 passed tests** (23 skipped, 42 todo; 2102 total), diagnostics upload PASS, Vite smoke PASS and Electron smoke PASS. Workflows #450 and #451 exposed only legacy UI selectors that became ambiguous after the second valid Deep Debug representation was added; fixes were scoped test-only corrections with no production semantic change.

S6 closure evidence is recorded in:

- `93DAYS_A51_S6_REPRODUCTION_METADATA_CONTRACT.md`;
- `93DAYS_A51_CHANGE_RECORD_S6.md`;
- `93DAYS_A51_ARCHITECTURE_VERIFICATION.md`.

PR #24 is merged. A51 is closed; the exact merge head has its own successful post-merge verification.

**Goal:** let an author test assumptions and consequences without pretending the editor is the final game UI.

Delivered:

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
- keep preview/checkpoint/reproduction state isolated from project persistence;
- expose finite typed reproduction metadata for actual explicit runtime inputs without fabricating RNG ownership.

## A52 — Export / Compiler Boundary

**Status:** IN PROGRESS (2026-09-18). **A52-S1 contract and A52-S2 pure artifact compiler are DONE.** The stage runs on `feature/a52-export-compiler-boundary` from post-merge verified A51 stable head `3d0f59219fca29d3338034777d8343b03c74cc45`.

**Goal:** prove that an authored Narrative Project can produce a runnable story artifact without maintaining a second hand-authored Passage graph.

Deliverables:

- define compiler/export contract from Narrative Project;
- deterministic mapping of authored Story/runtime definitions into runtime artifact data;
- validation gate before export;
- export diagnostics that point back to authoring entities;
- minimal runnable proof used only as compiler validation, not as a new game-development roadmap;
- no duplicate source-of-truth story graph.

S1 established the single-source, versioned artifact and validation contract. S2 now compiles a deterministic `narrative-runtime-artifact` v1 from the existing authored persistence projection plus a fresh authored initial runtime; current editor/live/Preview state is excluded. Story Brain findings are projected into explicit blocker/advisory export diagnostics, and canonical JSON sorting preserves authored array order.

S2 exact code head `8278cbb40bc64978e8a72c8716fe2957878f2133` passed workflow **#458** with **334/334 suites**, **2044 passed tests** (23 skipped, 42 todo; 2109 total), diagnostics upload PASS and both smoke checks PASS. S2 bookkeeping head `2fe6a165734c8ed427dc81f1cad28895fcc3a4ee` then passed exact-head workflow **#459** with the same counts and smoke results. **A52-S3 contract is now active:** transient generated Story/Passage output may use only host packaging identity, must discard legacy host narrative content, reuse existing Twine publishing, remain unpersisted, and expose source-linked diagnostics inside the existing Narrative Workspace.

## Execution rule

Work in order unless a blocking editor defect requires a small prerequisite fix:

`A47 → green CI → A48 → green CI → A49 → green CI → A50 → green CI → A51 → green CI → A52`

When a stage is complete, mark its status here in the same development cycle. Do not silently turn editor stages into game-content stages.
