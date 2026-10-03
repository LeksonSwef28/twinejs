# 93 Days — A67-D1 Workspace Context · Stage 2 Domain Model

Status: **STAGE 2 COMPLETE — Gate to Existing Architecture Verification**
Base: `93-days-editor@ba0285295b3727c0518349344560d1577c971172`
Depends on:
- `93DAYS_A67_D1_WORKSPACE_CONTEXT_STAGE0.md`
- `93DAYS_A67_D1_WORKSPACE_CONTEXT_STAGE1_USE_CASES.md`
Date: **2026-09-30**
Production code in this slice: **none**

## 1. Stage 2 purpose

Stage 1 proved that the feature is not a new narrative/game domain concept.

The required concept is:

> a lightweight authoring-session focus that references one canonical authored entity and can be projected into existing editor surfaces.

This document defines that concept independently from React components, TypeScript classes and file layout.

## 2. Domain boundary

Workspace Context belongs to the **authoring editor/session domain**.

It does **not** belong to:

- authored Story/world definitions;
- simulation/runtime state;
- Character cognition;
- Story execution state;
- Project Search index content;
- Canvas entity identity.

The canonical authored entities remain owned by Narrative Project.

Workspace Context only references them.

## 3. Model classification

### VO-WC-001 — Author Focus Reference

**Classification:** Value Object.

**Responsibility:** identify the one canonical entity the author is currently focusing on.

**State:**

- supported canonical entity kind;
- canonical entity id.

**First-slice supported kinds:**

- Story node;
- Character.

**Rules:**

- identity is canonical entity identity;
- no separate focus id is required;
- Canvas node id is not canonical identity;
- a reference may become stale when the entity is deleted;
- unsupported entity kinds cannot be coerced into this value.

**Equality:**

Two focus references are equal when both canonical kind and id are equal.

### STATE-WC-001 — Author Focus State

**Classification:** editor session State.

Conceptual states:

- **None** — no current canonical focus;
- **Focused(reference)** — a supported canonical entity is current focus.

A stale reference is not a durable third state. Validation turns a stale focused state into **None**.

Reason:

The UI must never keep presenting an entity as canonical after it has been deleted.

### SERVICE-WC-001 — Focus Resolver / Validator

**Classification:** pure authoring/editor service.

**Responsibility:**

Given:

- current Author Focus State;
- current canonical Narrative Project;

determine whether the reference still resolves.

**Result:**

- valid focused canonical entity; or
- no valid focus.

**Must not:**

- mutate Narrative Project;
- choose a replacement entity;
- create Canvas instances;
- move View Cursor;
- change Simulation Playhead.

### SERVICE-WC-002 — Focus Projection Resolver

**Classification:** pure read-side authoring/editor service.

**Responsibility:**

Describe how the current canonical focus can be represented by a requested existing surface.

Conceptual inputs:

- focus reference;
- canonical project;
- target surface;
- existing editor projection state.

Conceptual output:

- representable projection;
- representable only as canonical context/no visual instance;
- unavailable projection.

This service answers **what can be shown**, not **what the focus is**.

### VO-WC-002 — Projection Hint

**Classification:** optional Value Object, **DEFERRED unless Stage 3 proves required**.

Potential purpose:

remember an originating visual representation when one canonical entity has multiple Canvas instances.

Stage 1 proved such a hint may be useful but did not prove it is necessary.

The first architecture should prefer deterministic lookup from existing Canvas state. Add a hint only if an actual ambiguity blocks a required Use Case.

## 4. Explicit non-entities

The following must **not** become new domain entities for this slice:

- FocusSession entity;
- WorkspaceContext entity with its own persistent id;
- FocusHistory entity;
- NavigationStack entity;
- FocusedCanvasNode canonical entity.

They have no independent domain lifecycle justified by Stage 0/1 requirements.

## 5. Ownership decision

### DEC-WC-006 — first-slice focus is session-owned, not project-persisted

The first-slice Author Focus State belongs to the active authoring session.

It is **not required to be persisted** in `NarrativeProject.editor`.

### Why

Stage 1 requires:

- survive STORY ↔ WORLD/TIME component/workspace switching;
- survive Split View projection changes;
- remain independent from authored Undo/Redo.

Stage 1 does **not** require:

- restore focus after closing/reopening the app;
- serialize focus into project save;
- migrate old projects to include focus.

A session-owned state satisfies every current requirement with a smaller blast radius.

### Benefits

- no schema migration requirement;
- no persistence hydration contract;
- no stale persisted reference on reopen;
- no change to project serialization;
- no interaction with `updatedAt`;
- no need to modify `restoreSnapshotKeepingEditorView()` merely to preserve focus through Undo;
- Undo can restore authored content without implicitly resurrecting an old focus, matching UC-WC-006.

### Cost

Focus resets when a fresh authoring session is opened.

This is acceptable under Stage 1.

If future evidence requires restart persistence, that becomes a separate requirement and Impact Analysis.

## 6. Relationship to existing concepts

### Author Focus vs Canvas selection

`Author Focus != Canvas Instance`.

Canvas selection is a projection interaction.

When a supported Canvas entity is selected:

`Canvas interaction → canonical entity reference → Author Focus`.

A Canvas instance may disappear while the canonical Character remains.

Focus remains possible if the canonical entity still exists.

### Author Focus vs View Cursor

`Author Focus != View Cursor`.

Focus answers:

> What entity am I working on?

View Cursor answers:

> What authored moment am I viewing?

Changing one does not inherently change the other.

Navigation actions may intentionally coordinate them.

### Author Focus vs workspace

`Author Focus != Active Workspace`.

A Story node may remain focused while the author views WORLD/TIME.

A Character may remain focused while a pane cannot visually represent it.

### Author Focus vs Search active result

`Author Focus != Search Result Selection`.

Search is a discovery/projection surface.

Opening a supported result may change Author Focus.

Merely typing/querying/filtering search must not.

### Author Focus vs runtime attention

`Author Focus != Runtime Agent Attention`.

Simulation, Reaction Candidates, Preview and future AI dialogue do not own or automatically mutate author focus.

## 7. Lifecycle

### L1 — empty session

Initial authoring session:

`None`

No canonical focus is implied from the first Story node, first Character or current viewport.

### L2 — explicit focus

An author action focuses a supported canonical entity:

`None → Focused(reference)`

or:

`Focused(A) → Focused(B)`

Examples:

- select Story canvas node;
- open Story/Character from Project Search;
- open an existing focused Story marker from WORLD/TIME.

### L3 — workspace/view change

`Focused(A) → Focused(A)`

Workspace changes do not clear focus by themselves.

### L4 — canonical entity deleted

`Focused(A) → None`

after validation sees that A no longer exists.

No fallback entity is selected.

### L5 — visual projection deleted

If a Canvas node representing A is deleted but canonical A still exists:

`Focused(A) → Focused(A)`

The Story Canvas may report that it has no visual representation.

### L6 — runtime state changes

`Focused(A) → Focused(A)`

Runtime changes never change author focus implicitly.

### L7 — authoring session ends

Session state is discarded.

New session starts at `None` in the first slice.

## 8. Invariants

### WC-I01 — canonical identity

A focus reference always names a canonical supported authored entity.

### WC-I02 — one focus

At most one canonical entity is current focus.

### WC-I03 — no visual identity ownership

A Canvas node id can never substitute for canonical focus identity.

### WC-I04 — projection independence

Failure of the current surface to project the focus does not imply a different canonical focus.

### WC-I05 — stale invalidation

A focus whose canonical entity no longer exists resolves to no focus.

### WC-I06 — no implicit replacement

Invalidating a focus never picks the first/nearest/search-active entity automatically.

### WC-I07 — no runtime mutation

Focus changes never mutate Simulation Playhead, presence, knowledge, relationship state, Story runtime state or occurrences.

### WC-I08 — no authored mutation

Focus changes never mutate canonical authored entity definitions or authored `updatedAt`.

### WC-I09 — no authoring history entry

Focus transitions are not authored Undo/Redo operations.

### WC-I10 — explicit author intent

Runtime systems and future AI may read focus as editor context, but may not change it unless an explicit author navigation/focus action requests that change.

## 9. Surface projection semantics

Stage 2 defines only semantics, not UI implementation.

### STORY + Story node focus

Possible projection:

- matching Canvas visual instance;
- Story inspector/highlight.

If multiple visual instances exist, deterministic projection lookup may choose one for navigation, without changing canonical focus.

### STORY + Character focus

Possible projection:

- matching Character Canvas instance if present;
- canonical Character context if the UI supports it.

No Canvas instance may be fabricated merely to represent focus.

### WORLD/TIME + Story node focus

If exact authored placement exists:

- Story marker / moment projection is available.

If exact authored placement is missing:

- focus remains valid;
- exact temporal projection is unavailable.

### WORLD/TIME + Character focus

The first slice does not require a Character temporal projection.

WORLD/TIME stays neutral rather than inventing one.

## 10. Validation rules

### VAL-WC-001 — Story node

A Story-node reference is valid only if the id exists in canonical authored Story nodes.

### VAL-WC-002 — Character

A Character reference is valid only if the id exists in canonical authored Characters.

### VAL-WC-003 — unsupported kind

An unsupported kind cannot create first-slice Author Focus.

### VAL-WC-004 — no display-name identity

Names/titles are never sufficient identity.

Renaming an entity does not invalidate focus because stable id remains unchanged.

## 11. Domain events

No persisted domain event is required.

A conceptual notification such as:

`AuthorFocusChanged(previous, next)`

may exist later as application/UI coordination, but Stage 2 does **not** promote it to a canonical Narrative Project event.

Reason:

no current requirement consumes an event history of focus changes.

## 12. Aggregate decision

No new Aggregate is justified.

Author Focus does not own canonical Story/Character lifecycle and does not enforce invariants over a transactional group of authored entities.

Narrative Project remains the canonical source from which focus validity is checked.

## 13. Why this is not a universal entity-reference framework

It would be tempting to define:

`Focus { type: string; id: string }`

and allow any project object immediately.

Stage 1 explicitly rejects this.

The first contract is finite:

`Story node | Character`.

Additional kinds must enter through:

Requirement → Use Case → Domain Model extension.

This protects against turning Workspace Context into an untyped global state bag.

## 14. Reconciliation with current architecture

### Current code that already supports the model

- stable canonical ids exist for Story nodes and Characters;
- Canvas nodes already use entity references instead of owning entity data;
- editor navigation is already separate from authoring Undo history;
- Story/WORLD-TIME projection helpers are already read-side functions;
- Project Search already resolves stable navigation targets.

### Current code that does not yet match TO-BE

- `StoryWorkspace.selectedStoryEntity` owns focus locally;
- `ProjectSearchPanel.activeKey` is local search UI state rather than shared focus;
- `CrossWorkspaceNavigator.storyNodeId` is a separate local selection;
- WORLD/TIME Story-marker navigation moves viewport/workspace but cannot establish Story inspector selection.

These are **architecture/component concerns for Stage 3+**, not defects to patch during Domain Model design.

## 15. Traceability update

| ID | Requirement | Use Case | Domain Model | Architecture | Component | Detailed Design | Code | Test | Status |
|---|---|---|---|---|---|---|---|---|---|
| REQ-WC-001 | single editor author focus | UC-001/002/003/004/007/008 | VO-WC-001 + STATE-WC-001 | Stage 3 | — | — | — | Stage 9 | ✅ |
| REQ-WC-002 | Story selection updates focus | UC-001/004 | VO-WC-001 | Stage 3 | — | — | — | Stage 9 | ✅ |
| REQ-WC-003 | cross-surface handoff | UC-001/002/003/007/008 | STATE-WC-001 + SERVICE-WC-002 | Stage 3 | — | — | — | Stage 9 | ✅ |
| REQ-WC-004 | editor-only / no runtime mutation | UC-001/002/003/005/006/007/010 | STATE-WC-001 + WC-I07/I08/I09 | Stage 3 | — | — | — | Stage 9 | ✅ |
| REQ-WC-005 | stale focus safe handling | UC-003B/005/006/009 | SERVICE-WC-001 + WC-I05/I06 | Stage 3 | — | — | — | Stage 9 | ✅ |
| REQ-WC-006 | reuse navigation owners | UC-001/002/003/005/008/009 | SERVICE-WC-002 boundary | Stage 3 | — | — | — | Stage 9 | ✅ |
| REQ-WC-007 | no new workspace | UC-001/007 | Focus independent of workspace | Stage 3 | — | — | — | Stage 9 | ✅ |

## 16. Problems checked against the previous stage

### Check 1 — did every required scenario get a domain concept?

Yes.

- canonical focus identity → VO-WC-001;
- empty/focused lifetime → STATE-WC-001;
- deletion/stale behavior → SERVICE-WC-001;
- representability in surfaces → SERVICE-WC-002.

### Check 2 — did we invent concepts without requirements?

No.

Projection Hint remains deferred because Stage 1 did not prove it necessary.

No history, pins, breadcrumbs or arbitrary entity types were added.

### Check 3 — did we accidentally move UI detail into domain?

No.

Buttons, panels and React state are absent from the model.

The model speaks only about focus, canonical identity, validity and projection capability.

### Check 4 — does Domain Model contradict existing architecture?

No.

It extends the existing separation:

`Canvas Instance != Canonical Entity`

and preserves:

`Authored Projection != Editor Projection != Runtime Projection`.

## 17. Gate Review — Stage 2 → Stage 3 Existing Architecture Verification

### Coverage

✅ Every Stage 1 Use Case is representable by the proposed model.

✅ Every model element traces to a Stage 0 requirement / Stage 1 scenario.

✅ No new canonical game entity was introduced.

✅ No universal Node/Edge or universal entity reference system was introduced.

### Ownership / coupling

✅ Session ownership satisfies all first-slice lifetime requirements.

✅ Persistence/schema changes are unnecessary for the first slice.

✅ Focus can remain independent from Undo/Redo.

✅ Canvas remains a projection, not identity owner.

✅ Search remains discovery/navigation, not focus owner.

### Open points for Stage 3

⚠ Determine the smallest existing architectural owner for session focus.

Candidates to evaluate, not assume:

- `NarrativeWorkspace` session coordination;
- a narrowly scoped authoring-session context/provider;
- another existing editor coordination boundary if one already fits.

⚠ Verify dependency direction so Story/Search/WORLD-TIME do not import one another.

⚠ Verify whether projection logic belongs in existing `workspace-navigation.ts` or needs a small application adapter.

### Gate decision

**✅ PASS to Stage 3 — verification of the existing architecture against this Domain Model.**

No BLOCKER exists.

Do not implement yet.

Stage 3 must map the model to the current CORE / APPLICATION / STORE / UI boundaries and identify architectural violations/minimal changes before Component Design.
