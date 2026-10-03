# 93 Days — A67-D1 Workspace Context · Stage 0 / Architecture Entry Gate

Status: **STAGE 0 COMPLETE — Gate to Use Case Design**
Base: `93-days-editor@ba0285295b3727c0518349344560d1577c971172`
Date: **2026-09-30**
Change type: **writer UX / editor-navigation architecture**
Risk class: **MEDIUM**
Production code in this slice: **none**

## 0. Why this document exists

A67 World Authoring Pilot proved that a small coherent world can already be authored through normal UI, but the authoring flow crosses several separate surfaces:

`Story Project Library → WORLD/TIME → Routine panel → Story Inspector → Project Library → Project Search → WORLD/TIME`.

The problem to solve next is **not missing world semantics**. The first problem is that the editor has several local notions of "what the author is working on", but no single editor-level focus context shared by those surfaces.

This document performs only **Stage 0** from the traceable design protocol. It does not define implementation classes, add commands, change schema, or alter production behavior.

## 1. Current project stage — what is already genuinely complete

The project is already beyond raw architecture discovery.

### Proven architectural foundations

- one canonical authored Narrative Project;
- authored/editor/runtime persistence projections;
- View Cursor separated from Simulation Playhead;
- Story and WORLD/TIME remain the only top-level workspaces;
- typed authoring commands;
- editor-navigation commands are excluded from authoring Undo/Redo history;
- versioned schema and migration/hydration paths;
- recoverable project persistence;
- Story ↔ WORLD/TIME semantic navigation;
- Project Search with back-references and navigation targets;
- isolated Preview / Story Brain / canonical Player boundaries;
- A65 complete UI authoring pilot;
- A66 direct Story and WORLD/TIME moment navigation.

### What is not complete for the next modification

For **contextual authoring navigation**, the project has not yet completed:

- a formal Stage 0 requirement set;
- a single definition of author focus;
- use cases for focus handoff across surfaces;
- domain/editor ownership decision for focus lifetime;
- impact analysis for existing local selection state.

Therefore the next modification is **not ready for implementation yet**.

## 2. Architecture artifacts already available

### Architecture / engineering documents

- `93DAYS_ARCHITECTURE_V11.md`
- `93DAYS_ENGINEERING_CHANGE_PROTOCOL.md`
- `93DAYS_A64_USE_CASE_GATEBOOK.md`
- `93DAYS_A65_AUTHORING_PILOT_CONTRACT.md`
- `93DAYS_A66_S1_FAST_MOMENT_NAVIGATION_CONTRACT.md`
- `93DAYS_A66_S4_DIRECT_WORLD_TIME_MOMENT_NAVIGATION_CONTRACT.md`

### Existing code owners relevant to this change

- `src/domain/narrative/editor.ts`
  - owns editor-only View Cursor, workspace mode and viewports.
- `src/application/narrative/commands.ts`
  - contains typed editor navigation commands.
- `src/store/narrative-project/reducer.ts`
  - applies editor navigation and explicitly keeps `editor/*` commands out of authoring Undo history.
- `src/components/narrative/workspace/story-workspace.tsx`
  - currently owns a **local** `selectedStoryEntity`.
- `src/components/narrative/workspace/project-search-panel.tsx`
  - currently owns **local** `activeKey` and navigation history.
- `src/components/narrative/workspace/cross-workspace-navigator.tsx`
  - currently owns **local** selected Story node/filter context.
- `src/components/narrative/workspace/world-time-workspace.tsx`
  - can open a Story node by switching workspace and moving Story viewport.
- `src/domain/narrative/workspace-navigation.ts`
  - contains pure Story ↔ WORLD/TIME navigation projections.

## 3. AS-IS

### AS-IS-01 — editor state has navigation context, but not entity focus

`NarrativeEditorState` currently stores:

- selected day;
- selected minute / period;
- workspace mode;
- Story canvas viewport;
- WORLD/TIME viewport.

It does **not** store the entity the author currently considers the focus of work.

### AS-IS-02 — Story selection is local component state

`StoryWorkspace` has:

`selectedStoryEntity: character | storyNode | item | undefined`

This selection powers Story inspection/highlighting, but is lost when the component is unmounted/recreated.

### AS-IS-03 — Project Search has another local focus

`ProjectSearchPanel` has:

- `activeKey`;
- local navigation history.

Opening a result moves the appropriate viewport/workspace, but the result focus is not a shared editor concept.

### AS-IS-04 — Cross-workspace navigator has another local focus

`CrossWorkspaceNavigator` keeps its own selected Story node and filters.

It can move Story/WORLD-TIME viewports but does not establish a shared entity focus.

### AS-IS-05 — WORLD/TIME can navigate to Story, but does not restore Story selection

Clicking a Story marker in WORLD/TIME switches to Story and moves the Story viewport. The Story canvas may show the node, but the Story inspector selection remains owned by `StoryWorkspace` local state.

### AS-IS-06 — navigation is already architecturally safe

`editor/*` commands:

- update editor projection;
- do not advance Simulation Playhead;
- do not mutate Actual Presence;
- do not become authoring Undo/Redo entries.

This boundary must be reused.

## 4. TO-BE problem statement

The editor needs one lightweight, editor-owned notion of:

> **Which canonical authored entity is the author's current focus?**

This focus must allow Story, Search and WORLD/TIME to hand context to one another without becoming a new source of narrative truth.

The focus is **navigation metadata**, not Story state, simulation state, knowledge, presence, relationship state, or a new workspace.

## 5. Main goal

**GOAL-WC-001**

Reduce context loss while authoring across existing surfaces by introducing a single editor-level author focus that existing views can project and navigate around.

Observable success:

1. the author opens/focuses an entity in one supported surface;
2. moves to another existing surface through a contextual navigation action;
3. the target surface knows which canonical entity is the focus when it can represent it;
4. authored data and runtime state remain unchanged.

## 6. Constraints / non-negotiable invariants

- `View Cursor != Simulation Playhead`
- `Canvas Instance != Canonical Entity`
- `Scheduled Presence != Actual Presence`
- `Authored Projection != Editor Projection != Runtime Projection`
- exactly two top-level workspaces remain: STORY and WORLD/TIME;
- focus must reference canonical entity identity, never duplicate the entity;
- focus/navigation must not enter authoring Undo/Redo history;
- focus must not become a second Project Search index or graph;
- focus must not imply presence, knowledge, Story activation or runtime state;
- no AI integration in this slice.

## 7. Scope

### In scope

- define the meaning of editor author focus;
- identify the first supported focus entity kinds;
- hand focus between existing Story / Project Search / WORLD-TIME navigation paths;
- define safe behavior when a focus target is missing or not representable;
- preserve existing View Cursor / viewport semantics;
- define whether focus is session-only or editor-projection persisted before implementation;
- tests proving no authored/runtime mutation.

### Out of scope

- authored item placement;
- Schedule Exception authoring UI;
- Character Inner World;
- Relationship model;
- AI Context Compiler / Dialogue Lab;
- new search engine;
- semantic search;
- new top-level workspace;
- unified global navigation history;
- recent/pinned entity lists;
- custom fields;
- large-project library redesign.

These may consume author focus later but are not prerequisites for the first focus slice.

## 8. Functional requirements

### REQ-WC-001 — single editor author focus

The editor shall expose at most one current canonical entity focus for the current authoring context.

The focus shall use stable canonical identity and a finite supported entity kind.

### REQ-WC-002 — Story selection participates in shared focus

Selecting a supported canonical entity on the Story canvas shall establish that entity as current author focus.

A canvas node remains only a visual instance; focus points to the canonical entity, not to the canvas instance as truth.

### REQ-WC-003 — contextual navigation establishes target focus

When Project Search, Story ↔ WORLD/TIME navigation, or a WORLD/TIME Story marker opens a supported entity, the destination shall receive the same canonical focus when that destination can represent it.

### REQ-WC-004 — focus is editor-only

Changing focus shall not modify:

- authored entity definitions;
- `updatedAt` as an authored edit;
- Simulation Playhead;
- Actual Presence;
- Character Knowledge;
- runtime occurrence history;
- authored Undo/Redo history.

### REQ-WC-005 — invalid/stale focus fails safely

If a focused entity no longer exists or cannot be represented by the target surface:

- no authored/runtime state may be fabricated;
- no unrelated entity may be selected as an implicit replacement;
- the UI must degrade to a clear no-focus/unavailable state or retain the canonical focus without pretending it is rendered.

The exact UX belongs to Stage 1 Use Cases.

### REQ-WC-006 — existing navigation semantics remain canonical

Existing owners remain authoritative:

- Story viewport navigation stays with existing Story viewport commands/helpers;
- WORLD/TIME navigation stays with `editor/setWorldTimeViewport`;
- workspace selection stays with `editor/selectWorkspace`.

Author focus coordinates those existing actions; it does not replace them.

### REQ-WC-007 — no new workspace

Contextual authoring shall improve handoff between existing STORY and WORLD/TIME surfaces. It shall not create a third top-level workspace.

## 9. Non-functional requirements

### NFR-WC-001 — backward compatibility

Older persisted projects without author-focus metadata must still load safely.

### NFR-WC-002 — deterministic navigation

Given the same project, focus and editor state, contextual navigation must choose the same target projection.

### NFR-WC-003 — bounded coupling

Story, Search and WORLD/TIME must not import one another's React-local state. Shared coordination must pass through an explicit editor/application contract.

### NFR-WC-004 — testability

Focus transitions must be testable below browser level, with browser evidence reserved for the real cross-surface author journey.

### NFR-WC-005 — no runtime/schema semantic expansion

This slice may extend editor metadata if required, but must not alter runtime/save semantics or gameplay behavior.

## 10. Recovered requirements from existing evidence

| Evidence | Recovered requirement |
|---|---|
| A67 pilot crosses multiple surfaces to author one coherent world | authoring needs contextual continuity across existing surfaces |
| Story selection is local React state | shared focus needs an owner above Story component-local state |
| Project Search active result is local React state | search navigation must hand canonical focus to destination |
| WORLD/TIME Story marker only moves workspace/viewport | target Story surface needs a way to know which entity was opened |
| `editor/*` commands are excluded from authoring history | focus belongs to editor navigation semantics, not authored domain mutations |
| A66 preserves View Cursor != Simulation Playhead | contextual focus must preserve the same invariant |

## 11. Unknown / disputed points to resolve in Stage 1–2

### UNKNOWN-WC-001 — persistence lifetime

Should author focus:

A. exist only for the current UI session; or
B. live in the persisted editor projection and reopen with the project?

No implementation decision is made in Stage 0.

### UNKNOWN-WC-002 — first supported entity kinds

Likely candidates:

- Story node;
- Character;
- Location;
- Item instance.

The first vertical slice should support only kinds required by proved use cases.

### UNKNOWN-WC-003 — Split View behavior

When both workspaces are visible, one canonical focus may be shown in two projections. Stage 1 must define what happens when only one side can represent that focus.

### UNKNOWN-WC-004 — local navigation history

Project Search already has a local Back history. This Stage 0 does not assume that history becomes global. Stage 1 should prove whether shared focus alone solves the observed friction before expanding scope.

## 12. What is intentionally left unchanged

- canonical Narrative Project entity ownership;
- runtime projection;
- Simulation Playhead;
- Story node placement semantics;
- Project Search indexing and back-reference logic;
- Story ↔ WORLD/TIME pure navigation helpers;
- existing direct moment navigation;
- Preview / Player / compiler;
- schema migration strategy;
- authoring Undo/Redo semantics.

## 13. Risk review

### RISK-WC-01 — focus becomes a second source of truth

Mitigation: focus stores only typed canonical identity plus editor metadata; all entity data is always re-read from Narrative Project.

### RISK-WC-02 — duplicated navigation logic

Mitigation: focus coordination must reuse existing viewport/workspace owners.

### RISK-WC-03 — editor state leaks into authored history

Mitigation: preserve the existing `editor/*` no-Undo navigation boundary.

### RISK-WC-04 — over-scoping into a full workspace/session framework

Mitigation: first slice is one current focus only. Recent/pinned/history/AI context are explicitly deferred.

### RISK-WC-05 — stale references after entity deletion

Mitigation: Stage 1 requires an explicit stale/deleted-target use case before choosing storage shape.

## 14. Initial traceability seed

| ID | Requirement | Use Case | Architecture | Component | Detailed Design | Code | Test | Status |
|---|---|---|---|---|---|---|---|---|
| REQ-WC-001 | single editor author focus | pending Stage 1 | Editor navigation | pending | — | — | — | ⚠ |
| REQ-WC-002 | Story selection updates focus | pending Stage 1 | Story/editor boundary | pending | — | — | — | ⚠ |
| REQ-WC-003 | cross-surface handoff | pending Stage 1 | Workspace navigation | pending | — | — | — | ⚠ |
| REQ-WC-004 | editor-only / no runtime mutation | pending Stage 1 | Editor projection | pending | — | — | — | ⚠ |
| REQ-WC-005 | stale focus safe handling | pending Stage 1 | Editor/navigation validation | pending | — | — | — | ⚠ |
| REQ-WC-006 | reuse existing navigation owners | pending Stage 1 | Existing command boundary | pending | — | — | — | ⚠ |
| REQ-WC-007 | no new workspace | pending Stage 1 | Presentation architecture | pending | — | — | — | ⚠ |

## 15. Gate review — Stage 0 → Stage 1 Use Cases

### Checks

✅ Main authoring problem is backed by A67 pilot evidence.

✅ AS-IS is grounded in current stable code.

✅ TO-BE does not require a new domain/gameplay semantic.

✅ Existing architecture already provides a safe editor-navigation owner.

✅ No new source of canonical narrative truth is proposed.

✅ Runtime/Simulation Playhead invariants are preserved.

✅ Scope explicitly excludes item placement, relationships, AI and Schedule Exception implementation.

⚠ Persistence lifetime of focus is intentionally unresolved.

⚠ Initial focus entity kinds are intentionally unresolved until real Use Cases select them.

⚠ Split View behavior needs an explicit Use Case.

### Gate decision

**✅ PASS to Stage 1 Use Case design.**

There is no architectural BLOCKER at Stage 0.

Per the project design protocol, implementation must not start yet.

## 16. Next concrete stage — do not skip

**Stage 1: Use Cases / scenario design for Workspace Context.**

At minimum the next stage must test these candidate journeys before any Domain Model or code design:

1. Story node selected → open in WORLD/TIME → return to Story with the same canonical focus.
2. Project Search Story result → open in Story → inspector/highlighting reflects the same focus.
3. Project Search Character result → open its Story representation when available.
4. Focused entity deleted or unavailable → safe stale-focus behavior.
5. Split View → one focus projected across both panes without changing Simulation Playhead.

Only after the Stage 1 Gate may we decide whether focus belongs in persisted `NarrativeEditorState`, session state, or a small application-level adapter.
