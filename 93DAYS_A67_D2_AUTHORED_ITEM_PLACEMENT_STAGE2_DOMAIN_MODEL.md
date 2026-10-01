# 93 Days — A67-D2 Authored Item Placement · Stage 2 Domain Model

Status: **STAGE 2 COMPLETE — Gate to Existing Architecture Verification**
Base: `93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36`
Depends on:
- `93DAYS_A67_D2_AUTHORED_ITEM_PLACEMENT_STAGE0.md`
- `93DAYS_A67_D2_AUTHORED_ITEM_PLACEMENT_STAGE1_USE_CASES.md`
Date: **2026-10-01**
Production code in this slice: **none**

## 1. Stage 2 purpose

Stage 1 proved that Authored Item Placement is not a new gameplay subsystem.

The canonical authored concept already exists:

```ts
ItemInstance.placement: ItemPlacement
```

The missing capability is an authoring mutation and read-side presentation model around that existing state.

This document defines the smallest domain/application vocabulary needed to support the Stage 1 journeys without:

- introducing a second persisted placement model;
- mixing authored placement with runtime placement;
- turning Canvas state into world state;
- inventing a new workspace or inventory domain.

## 2. Domain boundary

### Canonical aggregate root

The canonical aggregate root remains:

> **NarrativeProject**

Reason:

A valid authored placement mutation may need to inspect three collections in one consistency boundary:

- `itemInstances`;
- `locations`;
- `characters`.

The ItemInstance is the mutation target, but Location / Character target existence is validated against the same current NarrativeProject.

Therefore the mutation boundary is conceptually:

`NarrativeProject -> ItemInstance placement transition`

not:

- a standalone ItemPlacement repository;
- a Canvas node mutation;
- an editor-session mutation;
- a runtime inventory mutation.

### Aggregate member

`ItemInstance` remains an authored entity inside NarrativeProject.

Its identity:

`ItemInstance.id`

is independent from:

- ItemDefinition identity;
- CanvasNodeInstance identity;
- placement target identity.

### Value object

`ItemPlacement` remains the canonical authored placement Value Object.

No new persisted placement entity is justified.

## 3. Existing canonical model remains unchanged

Current stable domain:

```ts
export type ItemPlacement =
  | {type: 'unplaced'}
  | {type: 'location'; locationId: EntityId}
  | {type: 'character'; characterId: EntityId};

export interface ItemInstance {
  id: EntityId;
  definitionId: EntityId;
  nameOverride?: string;
  placement: ItemPlacement;
}
```

Stage 2 decision:

> **Do not change this persisted shape for A67-D2 first slice.**

The existing union already expresses every required authored state from Stage 1.

## 4. Model classification

### ENTITY-IP-001 — ItemInstance

**Classification:** existing authored Entity.

**Identity:** `id`.

**Relevant state for this slice:** `placement`.

**Rules:**

- placement belongs to the concrete instance, never the ItemDefinition;
- one ItemInstance has exactly one authored ItemPlacement value;
- multiple Canvas references do not duplicate this state;
- changing placement does not change ItemInstance identity.

### VO-IP-001 — ItemPlacement

**Classification:** existing Value Object.

Conceptual variants:

- **Unplaced**
- **AtLocation(locationId)**
- **WithCharacter(characterId)**

**Rules:**

- exactly one variant is active;
- Location and Character ids are canonical entity references;
- no Canvas id is allowed;
- no runtime container/pockets variant is allowed;
- no separate placement id is needed.

### VO-IP-002 — Resolved Authored Item Placement

**Classification:** read-side/application Value Object.

**Persistence:** never persisted.

**Purpose:** present the stored ItemPlacement safely against the current canonical project.

Conceptual variants:

```ts
type ResolvedAuthoredItemPlacement =
  | {type: 'unplaced'}
  | {
      type: 'location';
      status: 'resolved';
      locationId: EntityId;
      location: NarrativeLocation;
    }
  | {
      type: 'location';
      status: 'unresolved';
      locationId: EntityId;
    }
  | {
      type: 'character';
      status: 'resolved';
      characterId: EntityId;
      character: NarrativeCharacter;
    }
  | {
      type: 'character';
      status: 'unresolved';
      characterId: EntityId;
    };
```

The exact TypeScript file/type name is deferred to Stage 5/6.

The conceptual distinction is required now.

### Why unresolved is read-side only

A stored historical/imported project may contain a structurally valid placement id that no longer resolves.

That does not create a fourth/fifth persisted ItemPlacement variant.

Instead:

`stored ItemPlacement + current project -> ResolvedAuthoredItemPlacement`

Unresolved status is a current lookup result, not authored truth.

### VO-IP-003 — Placement Mutation Result

**Classification:** application/domain-operation result Value Object.

Conceptual results:

```ts
type ItemPlacementMutationResult =
  | {status: 'changed'; itemInstanceId: EntityId; previous: ItemPlacement; next: ItemPlacement}
  | {status: 'unchanged'; itemInstanceId: EntityId; placement: ItemPlacement}
  | {status: 'missing-item'; itemInstanceId: EntityId}
  | {status: 'missing-location'; itemInstanceId: EntityId; locationId: EntityId}
  | {status: 'missing-character'; itemInstanceId: EntityId; characterId: EntityId};
```

This is conceptual Stage 2 vocabulary.

Stage 3–6 decide whether the existing reducer architecture exposes this result directly, indirectly, or only in pure helpers/tests.

No result status is persisted in NarrativeProject.

## 5. Semantic equality

### RULE-IP-001 — ItemPlacement equality

Two ItemPlacement values are semantically equal when:

- both are `unplaced`; or
- both are `location` and have the same `locationId`; or
- both are `character` and have the same `characterId`.

Conceptually:

```ts
itemPlacementEquals(a, b)
```

must not depend on:

- object reference identity;
- Location/Character display name;
- Canvas reference;
- runtime override;
- current workspace;
- Simulation Playhead.

### Consequence

A request to set the same semantic placement is:

> **unchanged / no-op**

It must not create authoring-history noise.

## 6. Reference integrity vs structural validity

Stage 2 distinguishes two concepts.

### Structural validity

A placement has a recognized discriminant and required id field shape.

Examples:

- `{type:'unplaced'}`
- `{type:'location', locationId:'loc-a'}`
- `{type:'character', characterId:'char-a'}`

### Reference integrity

A Location/Character id resolves in the current NarrativeProject.

A placement can therefore be:

- structurally valid + referentially valid;
- structurally valid + unresolved.

This distinction is necessary for UC-IP-010.

### Write rule

New authored writes require reference integrity.

### Read rule

Existing unresolved values are presented safely and are not automatically rewritten.

## 7. SERVICE-IP-001 — Authored Placement Resolver

**Classification:** pure read-side service.

Conceptual input:

- current canonical NarrativeProject;
- current ItemInstance or ItemPlacement.

Conceptual output:

- ResolvedAuthoredItemPlacement.

Responsibilities:

- return Unplaced directly;
- resolve Location id against `project.locations`;
- resolve Character id against `project.characters`;
- return unresolved status when lookup fails.

Must not:

- mutate project;
- repair placement;
- select a replacement target;
- inspect Canvas geometry;
- read runtime placement override as authored truth;
- move Simulation Playhead.

## 8. SERVICE-IP-002 — Placement Mutation Validator

**Classification:** pure authored-project validation service.

Conceptual input:

- current authored project context;
- `itemInstanceId`;
- requested `ItemPlacement`.

Minimum required authored context:

- ItemInstances;
- Locations;
- Characters.

It does **not** require runtime state.

### Validation order

The contract must be deterministic.

Recommended conceptual order:

1. resolve ItemInstance by id;
2. if missing -> `missing-item`;
3. validate requested placement target:
   - Unplaced -> no target lookup;
   - Location -> Location must exist;
   - Character -> Character must exist;
4. compare requested placement with current placement;
5. if equal -> `unchanged`;
6. otherwise -> valid change.

### Why target validation precedes equality

For a stale stored placement, a request containing the same missing target must not be treated as a successful harmless reaffirmation.

The first-slice write contract says:

> new/explicit authored writes to missing canonical targets are rejected.

Therefore a requested Location/Character must resolve even if the stored stale value happens to contain the same id.

## 9. SERVICE-IP-003 — Placement Transition

**Classification:** authored aggregate operation.

Conceptual operation:

`setAuthoredItemPlacement(project, itemInstanceId, nextPlacement)`

It has only two mutating outcomes:

- changed;
- no mutation.

### Changed

If validation passes and semantic equality is false:

- replace the complete `ItemInstance.placement` value;
- leave every other ItemInstance field unchanged;
- leave every other project collection unchanged except normal project metadata/history effects owned by existing infrastructure.

### No mutation

For:

- missing item;
- missing target;
- semantic no-op.

No partial placement object is written.

## 10. Placement state machine

Canonical authored placement states:

```text
          +------------------+
          |     Unplaced     |
          +------------------+
             ^      |      ^
            /       |       \
           /        |        \
          v         v         v
+----------------+       +-------------------+
| Location(id)   | <-->  | Character(id)     |
+----------------+       +-------------------+
```

Every state may transition to either of the other valid states.

A transition to the same semantic state is a no-op.

A transition referencing a missing canonical target is rejected and leaves the state unchanged.

## 11. Runtime placement is outside this model

Current project runtime state contains:

```ts
itemPlacementOverrides: Record<string, ItemRuntimePlacement>
```

and `ItemRuntimePlacement` is wider than authored ItemPlacement:

- Unplaced;
- Location;
- Character;
- Pockets;
- Container.

A67-D2 authored placement mutation does not consume or modify that runtime overlay.

### Strict data-flow boundary

Allowed authored mutation inputs:

- ItemInstance id;
- requested authored ItemPlacement;
- authored ItemInstances;
- canonical Locations;
- canonical Characters.

Forbidden decision inputs:

- `itemPlacementOverrides`;
- runtime inventory;
- runtime container membership;
- current Simulation Playhead;
- current Character Actual Presence.

Forbidden outputs:

- runtime placement override mutation;
- runtime Move/Outcome;
- Simulation Playhead mutation.

### Consequence

Even if runtime-effective placement differs from authored placement:

> authored editing still edits the canonical initial ItemInstance placement only.

## 12. Canvas is outside canonical placement state

CanvasNodeInstance may reference an ItemInstance.

Conceptual projection:

`CanvasNodeInstance.entityRef(item id) -> ItemInstance -> ItemPlacement`

not:

`CanvasNodeInstance -> own ItemPlacement`.

Therefore:

- duplicate Canvas references resolve the same canonical placement;
- Canvas drag does not transition placement;
- Canvas remove does not transition placement;
- placement editing does not require selected canvas coordinates.

## 13. ItemDefinition is outside placement ownership

ItemDefinition describes a kind of object.

ItemInstance represents one concrete object.

Therefore:

`ItemDefinition != ItemInstance`

and:

`ItemDefinition has no authored instance placement`.

Two ItemInstances with one ItemDefinition can have different placements.

No Stage 2 model adds placement to ItemDefinition.

## 14. Presentation/form state classification

The UI may need temporary input state while the author chooses placement type/target.

Example conceptual draft:

```ts
type ItemPlacementDraft =
  | {kind: 'unplaced'}
  | {kind: 'location'; locationId?: EntityId}
  | {kind: 'character'; characterId?: EntityId};
```

**Classification:** transient presentation state only.

It is not:

- canonical authored domain state;
- editor persistence state;
- author focus;
- runtime state.

An incomplete draft such as `{kind:'location'}` is allowed in UI memory but must never be committed as ItemPlacement.

Stage 5 decides whether such a draft type is needed at all.

## 15. Missing-target behavior

### Stored unresolved target

Read behavior:

- preserve stored authored value;
- resolve as unresolved;
- show safely;
- do not mutate on render.

### Requested missing target

Write behavior:

- reject;
- preserve current authored placement;
- create no meaningful authored history entry.

### No automatic substitution

Never:

- choose first Location;
- choose first Character;
- infer from Canvas coordinates;
- infer from Character presence;
- set Unplaced automatically merely because resolution fails.

## 16. Aggregate/history semantics

A meaningful placement transition is canonical authoring.

Therefore it belongs to the same authoring history boundary as other NarrativeProject authored mutations.

Conceptually:

`Project(before) -> valid placement transition -> Project(after)`

Undo must restore the prior authored placement.

Redo must restore the new authored placement.

### No-op rule

`unchanged`, `missing-item`, `missing-location`, and `missing-character` must not represent a meaningful authored state transition.

Stage 3 must verify how the current reducer/history wrapper identifies no-op project results.

## 17. Persistence semantics

Because `ItemInstance.placement` already exists in the canonical persisted project model:

- no new persisted field is required;
- no new placement table/index is required;
- no editor/session persistence is required;
- no runtime snapshot field is required.

Stage 4 must verify current repository hydration/persistence behavior.

### Important limitation

Stage 2 does not assert that the repository currently enforces referential integrity for ItemInstance placement.

That is not required for read safety.

The new mutation path must enforce reference integrity on writes.

## 18. Deletion interaction

Stage 1 requires safe behavior if a target is absent.

It does not establish A67-D2 as the owner of general Location/Character deletion cascade policy.

Therefore:

- A67-D2 does not introduce automatic cascade cleanup;
- if another feature deletes a placement target without cleanup, resolver returns unresolved;
- future deletion-integrity work may define stronger project-wide policy separately.

This keeps A67-D2 bounded.

## 19. Explicit non-entities / non-models

Do not introduce for this slice:

- ItemPlacementEntity with its own id;
- ItemLocationLink entity;
- ItemOwnershipLink entity;
- CanvasPlacement entity;
- ItemPlacementHistory entity;
- RuntimeInventory entity;
- PlacementWorkspace;
- persisted ItemPlacementDraft;
- Item AuthorFocus extension merely to support editing;
- generic EntityReference union across the whole project.

None are justified by current requirements.

## 20. Domain invariants

### INV-IP-001

`ItemInstance.placement` is the single canonical authored placement owner.

### INV-IP-002

`Authored Item Placement != Runtime Item Placement`.

### INV-IP-003

`Canvas Instance != Canonical Entity`.

### INV-IP-004

`ItemDefinition != ItemInstance`.

### INV-IP-005

One ItemInstance has exactly one authored placement variant.

### INV-IP-006

A new Location/Character placement write must resolve to a canonical project target.

### INV-IP-007

An unresolved stored target is a read-resolution state, not a new persisted placement variant.

### INV-IP-008

Same semantic placement is a no-op.

### INV-IP-009

A placement mutation must not read or write Simulation Playhead/runtime override as part of authored transition logic.

### INV-IP-010

Incomplete UI placement draft must never enter NarrativeProject.

## 21. Conceptual API vocabulary for later stages

Stage 2 does not approve file layout, but later stages may use vocabulary equivalent to:

```ts
itemPlacementEquals(a, b)

resolveAuthoredItemPlacement(project, placement)

validateAuthoredItemPlacementChange(
  project,
  itemInstanceId,
  nextPlacement
)

applyAuthoredItemPlacementChange(
  project,
  itemInstanceId,
  nextPlacement
)
```

Architecture must prefer the smallest set actually needed.

Do not create helpers merely because they are listed conceptually here.

## 22. Stage 1 questions resolved

### Q1 — exact canonical aggregate boundary

**NarrativeProject aggregate root; ItemInstance is the targeted authored entity.**

Target validation uses the same project boundary.

### Q2 — display resolution without persisted-shape change

Use a pure read-side resolved-placement projection.

No persisted shape change.

### Q3 — unresolved references

Represent them only in ResolvedAuthoredItemPlacement/application projection:

- unresolved Location id;
- unresolved Character id.

### Q4 — semantic equality

Variant + canonical target id.

Unplaced equals Unplaced.

### Q5 — validation outcomes

Required conceptual outcomes:

- changed;
- unchanged;
- missing-item;
- missing-location;
- missing-character.

### Q6 — domain vs form state

Canonical:

- ItemInstance;
- ItemPlacement.

Read-side/application:

- resolved/unresolved placement projection;
- mutation result.

Transient presentation:

- optional incomplete placement draft.

### Q7 — proof of runtime separation

The authored mutation's required context excludes `itemPlacementOverrides` and simulation time entirely.

Runtime placement is neither input nor output.

## 23. Requirement / Use Case / Model traceability

| Requirement | Use Cases | Model owner | Rule / service | Status |
|---|---|---|---|---|
| REQ-IP-001 canonical ItemInstance owner | UC-001/002/006/012 | ENTITY-IP-001 + VO-IP-001 | INV-IP-001 | ✅ modeled |
| REQ-IP-002 three variants | UC-001/002/003 | VO-IP-001 | placement state machine | ✅ modeled |
| REQ-IP-003 target validation | UC-001/002/008/010 | NarrativeProject boundary | SERVICE-IP-002 | ✅ modeled |
| REQ-IP-004 readable placement | UC-001/002/003/006/010/012 | VO-IP-002 | SERVICE-IP-001 | ✅ modeled |
| REQ-IP-005 Undo/Redo | UC-004/008/011 | authored aggregate transition | section 16 | ✅ modeled |
| REQ-IP-006 runtime separation | UC-001/004/009 | separate runtime overlay | section 11 / INV-IP-002/009 | ✅ modeled |
| REQ-IP-007 duplicate Canvas refs | UC-006/007 | ItemInstance canonical id | section 12 | ✅ modeled |
| REQ-IP-008 remove Canvas != unplace | UC-007 | Canvas outside placement | section 12 | ✅ modeled |
| REQ-IP-009 persistence | UC-005/010 | existing ItemInstance field | section 17 | ✅ modeled |
| REQ-IP-010 no-op | UC-008/011 | VO-IP-001 equality | RULE-IP-001 | ✅ modeled |

## 24. Stage 2 findings for architecture verification

### FINDING-IP-008 — no domain schema addition is justified

Every required canonical state already fits ItemPlacement.

### FINDING-IP-009 — write validation needs project context

A mutation cannot validate Location/Character references using ItemInstance alone.

The architecture must place validation where current NarrativeProject is available.

### FINDING-IP-010 — read resolver and write validator have different jobs

Resolver may return unresolved stored state.

Validator must reject requested missing targets.

Combining them into one "isValid" boolean would lose required semantics.

### FINDING-IP-011 — runtime overlay must not be consulted by authored mutation

Even though authored and runtime state coexist inside current NarrativeProject shape, the service boundary should logically narrow itself to authored collections only.

### FINDING-IP-012 — no-op/history behavior depends on existing reducer mechanics

Stage 3 must verify that returning the same project object is sufficient to avoid authored history entry, or identify the actual existing mechanism.

### FINDING-IP-013 — stale target repair is explicit authoring

Read resolver is non-destructive.

Repair uses the same validated mutation as normal editing.

## 25. Gate Review — Stage 2 → Stage 3 Existing Architecture Verification

### Domain checks

✅ Canonical aggregate and entity owner are identified.

✅ Existing ItemPlacement union is sufficient.

✅ No second persisted placement state was introduced.

✅ Resolved/unresolved presentation is separated from authored storage.

✅ Semantic equality is defined.

✅ Mutation result vocabulary is defined.

✅ Invalid target writes are atomic no-mutation outcomes.

✅ Transient form state is excluded from canonical project.

### Runtime/editor checks

✅ Runtime overlay is not an authored mutation input/output.

✅ Canvas remains projection only.

✅ ItemDefinition remains separate from ItemInstance.

✅ Simulation Playhead is outside the model.

### Open architecture verification questions

Stage 3 must verify in current stable code:

1. where typed item authoring commands are routed;
2. how reducer no-op identity interacts with Undo/Redo history;
3. whether current command validation helpers already provide reusable Location/Character existence checks;
4. whether Story Item inspector has enough canonical project context to drive the resolver;
5. whether current persistence projection already round-trips ItemInstance.placement unchanged;
6. whether any runtime code incorrectly assumes authored placement is immutable after project creation;
7. what tests already cover ItemInstance persistence/runtime placement separation.

### Gate decision

**✅ PASS to Stage 3 Existing Architecture Verification.**

No Stage 2 BLOCKER exists.

Production implementation remains prohibited until architecture verification, impact analysis, component design, contracts and detailed design gates are complete.
