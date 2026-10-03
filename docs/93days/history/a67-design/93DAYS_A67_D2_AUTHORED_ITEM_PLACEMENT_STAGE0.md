# 93 Days — A67-D2 Authored Item Placement · Stage 0 / Architecture Entry Gate

Status: **STAGE 0 COMPLETE — Gate to Use Case Design**
Base: `93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36`
Date: **2026-10-01**
Change type: **writer UX / authored world initial-state editing**
Risk class: **MEDIUM**
Production code in this slice: **none**

## 0. Why this document exists

A67 World Authoring Pilot proved that a small coherent world can already be authored through visible editor UI. The same pilot also exposed a concrete gap:

- `ItemInstance.placement` already exists in the canonical authored domain;
- it already distinguishes an unplaced item from an item initially placed at a Location or with a Character;
- the Story authoring UI can create item definitions, create concrete item instances and place canvas references;
- but the visible Item inspector cannot author or edit the item's canonical initial placement.

A67-D1 Workspace Context intentionally kept authored item placement out of scope. D1 is now merged and verified on stable, so this document opens the next isolated authoring slice.

This document performs only **Stage 0** from the traceable design protocol.

It does not add commands, UI controls, migrations or runtime behavior.

## 1. Current project stage — what is already genuinely complete

The project already has the domain distinction needed for this change.

### Proven foundations

- one canonical authored Narrative Project;
- `ItemDefinition` separated from concrete `ItemInstance`;
- authored `ItemPlacement` separated from `ItemRuntimePlacement`;
- editor canvas instances separated from canonical entities;
- typed authoring commands and reducer-owned authored mutations;
- authoring Undo/Redo history;
- recoverable project persistence;
- runtime item placement overrides;
- A67-D1 shared Story/Character author focus and contextual workspace navigation;
- full exact-stable Branch Check after A67-D1 merge.

### What is not complete for the next modification

For **authored item placement editing**, the project does not yet have:

- a formal Stage 0 requirement set;
- an authoring command for changing an existing `ItemInstance.placement`;
- a visible editor flow for choosing Location / Character / Unplaced;
- explicit use cases proving authored placement does not mutate runtime placement;
- explicit validation behavior for missing placement targets;
- a test matrix for Undo/Redo, persistence and duplicate canvas references.

Therefore implementation must not start before the design gates.

## 2. Existing code owners relevant to this slice

### Domain owner

`src/domain/narrative/items.ts`

Canonical authored placement:

```ts
export type ItemPlacement =
  | {type: 'unplaced'}
  | {type: 'location'; locationId: EntityId}
  | {type: 'character'; characterId: EntityId};
```

Concrete authored item:

```ts
export interface ItemInstance {
  id: EntityId;
  definitionId: EntityId;
  nameOverride?: string;
  placement: ItemPlacement;
}
```

Runtime placement is explicitly wider:

```ts
export type ItemRuntimePlacement =
  | ItemPlacement
  | {type: 'pockets'; characterId: EntityId}
  | {type: 'container'; containerInstanceId: EntityId};
```

### Application command owner

`src/application/narrative/commands.ts`

The command surface already supports:

```ts
{
  type: 'item/addInstance';
  id: string;
  definitionId: string;
  placement?: ItemPlacement;
}
```

There is currently no dedicated command for editing placement of an existing ItemInstance.

### Reducer owner

`src/store/narrative-project/reducer.ts`

`item/addInstance`:

- validates that the ItemDefinition exists;
- writes a canonical ItemInstance;
- defaults placement to `{type: 'unplaced'}` when no placement is supplied;
- enters authored project history through the normal authoring reducer path.

### Story authoring owner

`src/components/narrative/workspace/story-workspace.tsx`

Current visible flow:

1. create ItemDefinition;
2. create ItemInstance;
3. add one or more canvas references to that ItemInstance;
4. inspect the ItemInstance;
5. optionally remove the selected canvas reference.

The Item inspector currently explains that the object is a concrete physical instance, but exposes no authored placement control.

### Persistence owner

`src/store/narrative-project/repository.ts`

`itemInstances` already belong to the persisted authored project.

This slice therefore starts from the assumption that editing the existing `placement` field should not require a new schema field. Stage 4 Impact Analysis must still verify this before implementation.

## 3. AS-IS

### AS-IS-IP-01 — authored placement already exists canonically

`ItemInstance.placement` is canonical authored data.

It is not editor-only metadata.

It is not a canvas property.

It is not a runtime override.

### AS-IS-IP-02 — three authored initial placement states already exist

The domain supports:

- Unplaced;
- Location;
- Character.

No new placement kind is required for the first authoring slice.

### AS-IS-IP-03 — runtime placement is a separate overlay

Runtime placement can additionally represent:

- pockets;
- container instance.

Runtime state can override authored initial placement without rewriting authored world setup.

This distinction is non-negotiable.

### AS-IS-IP-04 — new instances default to Unplaced in normal UI

StoryWorkspace creates an instance using:

```ts
execute({
  type: 'item/addInstance',
  id: createId('item-instance'),
  definitionId
});
```

Because no placement is supplied, the reducer creates:

```ts
placement: {type: 'unplaced'}
```

### AS-IS-IP-05 — Item inspector cannot show or edit authored placement

The current Item inspector exposes:

- Item kind;
- ItemDefinition name;
- explanatory text about physical identity;
- Remove from board.

It does not expose:

- current authored placement;
- Location selector;
- Character selector;
- Unplaced action;
- authored placement validation feedback.

### AS-IS-IP-06 — canvas reference is not placement

An ItemInstance can have multiple Story Canvas visual references.

Those references are editor presentation only.

Moving a canvas card does not move the physical authored item in the world.

Removing a canvas card does not delete or unplace the canonical ItemInstance.

### AS-IS-IP-07 — addInstance can technically receive placement

The typed command accepts optional `placement`, but the current visible Story flow never supplies it.

This is a useful existing capability, not evidence that placement editing is complete.

### AS-IS-IP-08 — existing narrative effect terminology must not be conflated

The project also contains narrative-move validation for an `item-set-placement` effect.

That path belongs to outcome/runtime semantics.

This authoring slice concerns the canonical **initial authored placement** stored on `ItemInstance`.

Stage 1 must keep those two flows separate in every use case.

## 4. TO-BE problem statement

The editor needs a visible, deterministic way to edit the canonical initial placement of an existing ItemInstance using the ItemPlacement domain owner that already exists.

The author should be able to answer:

> Where is this concrete item at the authored start/state of the project?

with exactly one of:

- nowhere / unplaced;
- at a canonical Location;
- with a canonical Character.

The editor must write that answer to `ItemInstance.placement` and nowhere else.

## 5. Main goal

**GOAL-IP-001**

Allow an author to inspect a concrete ItemInstance and author its canonical initial placement through normal editor UI without touching runtime placement or Simulation Playhead.

Observable success:

1. an ItemInstance exists;
2. the author selects/inspects that canonical item;
3. chooses Unplaced, a Location, or a Character;
4. the canonical `ItemInstance.placement` changes;
5. Undo restores the previous authored placement;
6. Redo reapplies it;
7. save/reopen preserves it;
8. runtime placement overrides and Simulation Playhead remain unchanged.

## 6. Constraints / non-negotiable invariants

- `Authored Item Placement != Runtime Item Placement`
- `Authored Project != Runtime Save`
- `Canvas Instance != Canonical Entity`
- `View Cursor != Simulation Playhead`
- `Scheduled Presence != Actual Presence`
- ItemDefinition != ItemInstance
- the canonical owner remains `ItemInstance.placement`;
- canvas coordinates must never be interpreted as world placement;
- changing authored placement must be an authoring command and therefore participate in authoring Undo/Redo;
- changing authored placement must not create or mutate runtime placement overrides;
- no new placement kinds in this slice;
- no AI integration.

## 7. Scope

### In scope

- edit placement of an existing ItemInstance;
- support existing `unplaced | location | character` variants;
- show current authored placement in normal item inspection UI;
- choose only canonical existing Location / Character targets;
- typed authoring command and reducer validation;
- Undo/Redo behavior;
- save/reopen persistence verification;
- multiple canvas references to one ItemInstance reflecting one canonical placement;
- explicit proof that runtime placement and Simulation Playhead do not change.

### Out of scope

- pockets authoring;
- container packing authoring;
- runtime inventory manipulation;
- changing `itemPlacementOverrides`;
- drag-and-drop from Story Canvas onto world locations;
- WORLD/TIME item markers;
- location hierarchy;
- travel topology;
- bulk item placement;
- item spawning/despawning system;
- item ownership economics;
- item Definition carry/food/container mechanics changes;
- Schedule Exception UI;
- Relationship model;
- Character Inner World;
- AI authoring;
- Project Search redesign;
- global Item focus expansion beyond what D1 already defines.

## 8. Functional requirements

### REQ-IP-001 — canonical owner remains ItemInstance

The editor shall store authored initial placement only in:

`NarrativeProject.itemInstances[].placement`

No duplicated placement field may be introduced in:

- CanvasNodeInstance;
- NarrativeEditorState;
- AuthorFocus;
- runtime override state.

### REQ-IP-002 — support all existing authored placement variants

The editor shall allow an existing ItemInstance to be set to:

1. `{type: 'unplaced'}`
2. `{type: 'location', locationId}`
3. `{type: 'character', characterId}`

No additional authored variant is introduced by this slice.

### REQ-IP-003 — canonical target validation

A Location placement shall only be committed when the referenced Location exists in the current Narrative Project.

A Character placement shall only be committed when the referenced Character exists in the current Narrative Project.

An invalid target shall not partially mutate the project.

### REQ-IP-004 — placement is visible during inspection

When an ItemInstance is inspected, the UI shall expose the current canonical authored placement in human-readable form.

For canonical targets the displayed label shall resolve from the current project.

### REQ-IP-005 — placement editing uses typed authoring history

Changing ItemInstance placement shall use the normal typed authoring command boundary.

The mutation shall participate in authored Undo/Redo.

Undo/Redo shall restore only authored project history and shall not rewind runtime state.

### REQ-IP-006 — runtime separation

Changing authored `ItemInstance.placement` shall not:

- mutate `itemPlacementOverrides`;
- mutate current inventory/container runtime placement;
- move Simulation Playhead;
- infer Actual Presence;
- execute a narrative Move or Outcome.

### REQ-IP-007 — canvas duplication does not duplicate placement

If the same ItemInstance has multiple canvas references, every visual reference shall still resolve to the same single canonical ItemInstance placement.

Editing placement through one inspected visual shall not create per-canvas placement state.

### REQ-IP-008 — removing a canvas reference does not alter placement

Removing the selected Item canvas node shall not:

- delete the ItemInstance;
- set placement to Unplaced;
- modify a Location or Character placement.

Canvas cleanup remains presentation-only.

### REQ-IP-009 — persistence round-trip

A successfully authored ItemInstance placement shall survive the normal project persistence round-trip.

Stage 4 must verify that no schema migration is required because the field already exists in the canonical model.

### REQ-IP-010 — deterministic no-op behavior

Submitting the same placement already stored on the ItemInstance should produce a deterministic result.

Stage 6 must decide whether the reducer returns the same project object or a touched-but-equivalent project, but no duplicate state or runtime side effect is allowed.

## 9. UX requirements

### UX-IP-001 — edit the instance, not the definition

Placement controls must appear in a context that clearly identifies the concrete ItemInstance.

The UI must not imply that every instance of the same ItemDefinition shares one placement.

### UX-IP-002 — make Unplaced explicit

Unplaced is a valid authored state, not an error.

The UI must provide an explicit way to choose it.

### UX-IP-003 — distinguish Location from Character

The author must not need to infer target type from a mixed opaque id list.

Location and Character placement must remain semantically distinct in the control.

### UX-IP-004 — no canvas-position metaphor

The UI must not teach that dragging the Item card around Story Canvas changes physical world placement.

### UX-IP-005 — current placement is readable without editing

The inspector should expose the current authored placement even before the author opens or changes a selector.

## 10. Non-functional requirements

### NFR-IP-001 — local deterministic authoring

No network, AI, worker or background process is needed.

### NFR-IP-002 — no new schema unless impact proves necessity

The existing ItemPlacement field is the intended owner.

Any proposal to add a second persisted field is a Stage 4 blocker requiring explicit justification.

### NFR-IP-003 — existing project compatibility

Existing ItemInstances with `{type:'unplaced'}` remain valid.

Existing persisted projects must open without migration solely because the UI gains editing controls.

### NFR-IP-004 — small reviewable diff

Implementation should reuse:

- existing ItemPlacement type;
- existing NarrativeProject command/reducer architecture;
- existing Story Item inspector;
- existing project Location/Character collections.

## 11. Open questions for Stage 1

### UNKNOWN-IP-001 — exact first UI surface

Likely default:

- Story Item inspector.

Alternative:

- Project Library instance row.

Stage 1 must choose based on concrete author journeys rather than adding controls to both surfaces.

### UNKNOWN-IP-002 — create-time placement

The first slice may edit placement after instance creation only.

Stage 1 must decide whether create-time placement is necessary for the minimum useful workflow.

### UNKNOWN-IP-003 — selector shape

Possible shapes:

- placement type radio/select + target select;
- two explicit actions ("At Location", "With Character") plus target select;
- compact form in Item inspector.

Stage 1 defines behavior, not styling.

### UNKNOWN-IP-004 — stale authored references

Current stable code does not establish this slice as the owner of general entity-deletion cleanup.

Stage 1 must define safe behavior if an imported/legacy project contains a placement target that cannot be resolved.

### UNKNOWN-IP-005 — Project Search indexing

It may be useful later to search "items at Location X" or "items with Character Y".

That is not required to make placement authorable.

Stage 1 must keep search indexing out unless a concrete use case proves it necessary.

## 12. What is intentionally left unchanged

- ItemDefinition ownership;
- Item carry / food / container mechanics;
- runtime item placement overlay;
- `itemPlacementOverrides`;
- Move/Outcome runtime semantics;
- Story Canvas geometry;
- D1 Author Focus contract;
- STORY / WORLD-TIME workspace count;
- Simulation Playhead;
- Character presence;
- persistence schema version;
- Player behavior unless tests reveal an existing reader bug.

## 13. Initial impact hypothesis — not an implementation approval

Likely touched later if Stage 1–4 confirm the design:

- `src/application/narrative/commands.ts`
  - likely add a typed existing-instance placement command.
- `src/store/narrative-project/reducer.ts`
  - likely validate target and update the canonical ItemInstance.
- `src/components/narrative/workspace/story-workspace.tsx`
  - likely expose current placement + editor controls.
- unit/integration tests around reducer and Story Item inspector.

Likely **not** touched:

- `src/domain/narrative/items.ts`
- project schema version;
- migrations;
- runtime simulation;
- Player;
- compiler/export;
- A67-D1 AuthorFocus model;
- WORLD/TIME architecture.

If a later stage proves one of these "not touched" owners must change, Stage 4 Impact Analysis must be reopened before coding.

## 14. Risk review

### RISK-IP-01 — authored placement accidentally mutates runtime placement

Mitigation:

- use a dedicated authored command;
- update only `itemInstances[].placement`;
- regression-test `itemPlacementOverrides` and Simulation Playhead unchanged.

### RISK-IP-02 — canvas node becomes a hidden second placement owner

Mitigation:

- controls resolve ItemInstance by canonical id;
- never write placement to CanvasNodeInstance;
- duplicate canvas references test one shared placement.

### RISK-IP-03 — target id can become dangling

Mitigation:

- command validation against current canonical project;
- stale imported reference behavior specified in Stage 1.

### RISK-IP-04 — UI confuses ItemDefinition and ItemInstance

Mitigation:

- placement lives only in concrete instance inspection;
- labels identify concrete instance context.

### RISK-IP-05 — scope expands into inventory system

Mitigation:

- pockets, containers and runtime manipulation explicitly deferred;
- only the three already-authored ItemPlacement variants are in scope.

### RISK-IP-06 — create and edit flows become two implementations

Mitigation:

- Stage 1 decides whether create-time placement is needed;
- core mutation contract should have one canonical validation owner.

## 15. Initial traceability seed

| ID | Requirement | Use Case | Domain Owner | Architecture | Component | Code | Test | Status |
|---|---|---|---|---|---|---|---|---|
| REQ-IP-001 | ItemInstance is canonical owner | pending Stage 1 | ItemInstance | authored project | pending | — | — | ⚠ |
| REQ-IP-002 | three existing variants | pending Stage 1 | ItemPlacement | authored project | pending | — | — | ⚠ |
| REQ-IP-003 | target validation | pending Stage 1 | Project references | command/reducer | pending | — | — | ⚠ |
| REQ-IP-004 | readable inspector placement | pending Stage 1 | ItemInstance | Story inspection | StoryWorkspace likely | — | — | ⚠ |
| REQ-IP-005 | Undo/Redo | pending Stage 1 | authored history | command/reducer | pending | — | — | ⚠ |
| REQ-IP-006 | runtime separation | pending Stage 1 | runtime overlay | authored/runtime boundary | pending | — | — | ⚠ |
| REQ-IP-007 | duplicate canvas refs share placement | pending Stage 1 | ItemInstance | Canvas projection | StoryWorkspace likely | — | — | ⚠ |
| REQ-IP-008 | remove canvas != unplace | pending Stage 1 | CanvasNodeInstance | editor projection | StoryWorkspace likely | — | — | ⚠ |
| REQ-IP-009 | persistence round-trip | pending Stage 1 | ItemInstance | repository | pending | — | — | ⚠ |
| REQ-IP-010 | deterministic same-value update | pending Stage 1 | ItemInstance | reducer | pending | — | — | ⚠ |

## 16. Gate review — Stage 0 → Stage 1 Use Cases

### Checks

✅ Gap is directly evidenced by A67 authoring pilot.

✅ A67-D1 explicitly deferred authored item placement.

✅ Canonical domain owner already exists.

✅ Existing placement variants are sufficient for the first slice.

✅ AS-IS is grounded in current stable code.

✅ Runtime placement has a separate existing owner.

✅ No new source of truth is proposed.

✅ No schema addition is proposed.

✅ Canvas Instance remains presentation only.

✅ Scope excludes runtime inventory and container mechanics.

⚠ Exact UI surface is intentionally unresolved.

⚠ Create-time placement is intentionally unresolved.

⚠ Stale imported placement references require an explicit use case.

### Gate decision

**✅ PASS to Stage 1 Use Case design.**

There is no Stage 0 architecture blocker.

Implementation must not begin until Stage 1 and the remaining design gates prove:

- the exact user journeys;
- validation semantics;
- impact surface;
- contracts;
- test plan.

## 17. Next concrete stage — do not skip

**Stage 1: Use Cases / scenario design for Authored Item Placement.**

At minimum Stage 1 must specify these journeys:

1. Create an ItemInstance → it is Unplaced → inspect it → place it at an existing Location.
2. Existing Location placement → move authored placement to an existing Character.
3. Existing Character placement → explicitly set Unplaced.
4. Change placement → Undo → Redo.
5. Save/reopen → authored placement is preserved.
6. Same ItemInstance shown by multiple Story Canvas references → one canonical placement remains visible from either reference.
7. Remove one Canvas reference → canonical placement remains unchanged.
8. Attempt to commit a missing Location / Character target → safe rejection with no partial project mutation.
9. Existing runtime placement override is present → editing authored placement does not rewrite the runtime override or Simulation Playhead.
10. Imported/stale placement target cannot resolve → UI remains safe and does not silently fabricate a replacement.

Only after the Stage 1 Gate may the project choose the exact Item inspector interaction and command contract.
