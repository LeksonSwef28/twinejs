# 93 Days — A67-D2 Authored Item Placement · Stage 6 Contracts / Interfaces

Status: **STAGE 6 COMPLETE — PASS to Dynamic Flow / Data Flow**
Base: `93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36`
Depends on Stage 0–5 Authored Item Placement documents.
Date: **2026-10-01**
Production code in this slice: **none**

## 1. Purpose

Define exact contracts between the Stage 5 components.

For each connection this document fixes:

- exact command/value shapes;
- input and output semantics;
- required fields;
- valid/invalid outcomes;
- sync/async behavior;
- idempotency;
- retry/repeat behavior;
- ownership of failures;
- UI draft/commit boundary;
- runtime/persistence non-contracts.

No production implementation is approved by this document.

---

# CONTRACT-IP-001 — Canonical authored placement value

The canonical authored value remains the existing domain type:

```ts
export type ItemPlacement =
  | {type: 'unplaced'}
  | {type: 'location'; locationId: EntityId}
  | {type: 'character'; characterId: EntityId};
```

## Required semantics

- finite discriminated union;
- exactly one variant is active;
- Location target uses canonical Location id;
- Character target uses canonical Character id;
- no Canvas id;
- no runtime container id;
- no pockets variant;
- no display name snapshot.

## Persistence

Existing authored persistence only.

No new field or wrapper is introduced.

---

# CONTRACT-IP-002 — NarrativeProjectCommand

Add exactly one authored command variant to `NarrativeProjectCommand`:

```ts
{
  type: 'item/setPlacement';
  id: string;
  placement: ItemPlacement;
}
```

## Field semantics

### type

Exactly:

`'item/setPlacement'`

### id

Canonical existing `ItemInstance.id`.

Not:

- ItemDefinition id;
- CanvasNodeInstance id;
- runtime container id.

### placement

A complete canonical `ItemPlacement`.

Partial draft state is forbidden.

## Caller

First slice caller:

- StoryWorkspace Item inspector.

Future callers may reuse the same command only if they already have a complete authored ItemPlacement.

## Sync/async

Synchronous through existing `execute(command)` reducer path.

No Promise.

## Idempotency

Repeated application of the same valid semantic placement is idempotent.

The reducer must return the exact original NarrativeProject object for a same-value request.

## Retry/repeat

Safe to repeat.

Target existence is revalidated on every reducer invocation.

## Result

No new public command-result value.

Existing `execute(command): void` architecture remains unchanged.

Observable result is the next NarrativeProject state.

---

# CONTRACT-IP-003 — Authored placement semantic equality

Exact pure helper:

```ts
export function authoredItemPlacementEquals(
  left: ItemPlacement,
  right: ItemPlacement
): boolean;
```

## Equality rules

Returns true only when:

- both are `unplaced`; or
- both are `location` and `locationId` matches; or
- both are `character` and `characterId` matches.

Returns false for all cross-variant comparisons.

## Forbidden equality inputs

Do not compare:

- display names;
- target object identity;
- Canvas state;
- runtime effective placement;
- runtime override;
- workspace/focus.

## Sync/async

Synchronous and pure.

## Idempotency / algebra

Required:

- reflexive: `equals(x, x) === true`;
- symmetric;
- deterministic.

---

# CONTRACT-IP-004 — Resolved authored placement projection

Exact application read type:

```ts
export type ResolvedAuthoredItemPlacement =
  | {
      type: 'unplaced';
    }
  | {
      type: 'location';
      status: 'resolved';
      locationId: string;
      location: NarrativeLocation;
    }
  | {
      type: 'location';
      status: 'unresolved';
      locationId: string;
    }
  | {
      type: 'character';
      status: 'resolved';
      characterId: string;
      character: NarrativeCharacter;
    }
  | {
      type: 'character';
      status: 'unresolved';
      characterId: string;
    };
```

## Persistence

Never persisted.

## Purpose

Safely render the current authored ItemPlacement against the current canonical project without rewriting stale data.

## Important rule

`unresolved` is a read-time resolution status.

It is **not** a fourth/fifth canonical ItemPlacement variant.

---

# CONTRACT-IP-005 — Authored placement resolver

Exact pure helper:

```ts
export function resolveAuthoredItemPlacement(
  project: NarrativeProject,
  placement: ItemPlacement
): ResolvedAuthoredItemPlacement;
```

## Behavior

### Unplaced

Returns:

```ts
{type: 'unplaced'}
```

### Location

If target exists:

```ts
{
  type: 'location',
  status: 'resolved',
  locationId,
  location
}
```

If missing:

```ts
{
  type: 'location',
  status: 'unresolved',
  locationId
}
```

### Character

Symmetric resolved/unresolved behavior.

## Error semantics

Missing target is normal data.

No throw.

No mutation.

No fallback target.

## Sync/async

Synchronous in-memory lookup.

## Idempotency

Repeated calls against the same project/placement are deterministic.

## Forbidden dependencies

Must not read:

- `itemPlacementOverrides`;
- `effectiveItemPlacement()`;
- simulation;
- Canvas;
- AuthorFocus.

---

# CONTRACT-IP-006 — Authored target validation

Exact status type:

```ts
export type AuthoredItemPlacementTargetValidation =
  | {status: 'valid'}
  | {
      status: 'missing-location';
      locationId: string;
    }
  | {
      status: 'missing-character';
      characterId: string;
    };
```

Exact pure helper:

```ts
export function validateAuthoredItemPlacementTarget(
  project: NarrativeProject,
  placement: ItemPlacement
): AuthoredItemPlacementTargetValidation;
```

## Rules

### Unplaced

Always:

```ts
{status: 'valid'}
```

### Location

Valid only when `project.locations` contains `locationId`.

### Character

Valid only when `project.characters` contains `characterId`.

## Scope

This helper validates placement **target existence only**.

It does not validate ItemInstance existence because the target ItemInstance is a reducer command concern.

## Why separate resolver and validator

Resolver may safely describe stale stored state as unresolved.

Validator rejects a requested missing target.

Read semantics and write semantics remain distinct.

## Sync/async

Synchronous and pure.

---

# CONTRACT-IP-007 — Reducer mutation/no-op contract

Connection:

`NarrativeProjectCommand('item/setPlacement') → applyNarrativeProjectCommand`

## Required reducer algorithm

Conceptually:

```ts
case 'item/setPlacement': {
  const item = project.itemInstances.find(item => item.id === command.id);

  if (!item) {
    return project;
  }

  if (
    validateAuthoredItemPlacementTarget(project, command.placement).status !==
    'valid'
  ) {
    return project;
  }

  if (authoredItemPlacementEquals(item.placement, command.placement)) {
    return project;
  }

  return touched({
    ...project,
    itemInstances: project.itemInstances.map(candidate =>
      candidate.id === item.id
        ? {...candidate, placement: command.placement}
        : candidate
    )
  });
}
```

Exact code formatting belongs to implementation.

## No-op outcomes

Return the **same `project` object** for:

- missing ItemInstance;
- missing Location;
- missing Character;
- same semantic placement.

## Changed outcome

Return a new touched NarrativeProject only for one valid semantic change.

## History contract

Because history uses project reference identity:

- same object → no authored history entry;
- new object → exactly one authored history transition through existing history reducer.

## Atomicity

No partial state.

No "kind changed but target missing" canonical state.

---

# CONTRACT-IP-008 — UI draft value

Local StoryWorkspace-only type:

```ts
type ItemPlacementDraft =
  | {kind: 'unplaced'}
  | {
      kind: 'location';
      locationId?: string;
    }
  | {
      kind: 'character';
      characterId?: string;
    };
```

## Scope

This type is presentation state only.

Do not export from domain.

Do not persist.

Do not put in NarrativeProject.editor.

Do not pass directly to reducer.

## Why optional target ids are allowed here

A draft may be incomplete while the author has selected a kind but not a target.

Canonical ItemPlacement may not be incomplete.

---

# CONTRACT-IP-009 — Canonical placement → draft initialization

StoryWorkspace local helper/logic must behave equivalent to:

```ts
function itemPlacementDraftFromResolved(
  placement: ResolvedAuthoredItemPlacement
): ItemPlacementDraft;
```

## Rules

### Unplaced

```ts
{kind: 'unplaced'}
```

### Resolved Location

```ts
{kind: 'location', locationId}
```

### Unresolved Location

```ts
{kind: 'location'}
```

The missing stored id remains visible in the separate current-authored summary.

It is not copied into an editable valid target selection.

### Resolved Character

```ts
{kind: 'character', characterId}
```

### Unresolved Character

```ts
{kind: 'character'}
```

## Visibility

This helper may remain local to StoryWorkspace unless Detailed Design finds a clear testability reason to export it.

---

# CONTRACT-IP-010 — Draft → complete ItemPlacement

StoryWorkspace local conversion:

```ts
function itemPlacementFromDraft(
  draft: ItemPlacementDraft
): ItemPlacement | undefined;
```

## Rules

### Unplaced

Returns:

```ts
{type: 'unplaced'}
```

### Location

Returns complete canonical placement only when `locationId` is a non-empty current selection.

Otherwise `undefined`.

### Character

Symmetric.

## Required consequence

Only a non-undefined complete placement may be sent through `item/setPlacement`.

---

# CONTRACT-IP-011 — Draft synchronization key

Draft reset must occur only when the inspected canonical ItemInstance or its canonical authored placement changes.

Use a stable local semantic key equivalent to:

```ts
function authoredItemPlacementKey(placement: ItemPlacement): string {
  switch (placement.type) {
    case 'unplaced':
      return 'unplaced';
    case 'location':
      return `location:${placement.locationId}`;
    case 'character':
      return `character:${placement.characterId}`;
  }
}
```

StoryWorkspace synchronization identity:

```ts
const itemPlacementDraftSourceKey = inspectedItem
  ? `${inspectedItem.id}:${authoredItemPlacementKey(inspectedItem.placement)}`
  : undefined;
```

The key helper may remain local to StoryWorkspace.

## Reset on

- selecting another ItemInstance;
- successful canonical placement change;
- Undo;
- Redo;
- any other canonical change to this ItemInstance placement.

## Do not reset on

- viewport changes;
- unrelated Story edits;
- runtime override changes;
- Simulation Playhead changes;
- selecting another Canvas copy of the same ItemInstance when canonical placement is unchanged.

This preserves in-progress draft editing during unrelated project changes.

---

# CONTRACT-IP-012 — Placement-kind control

Accessible label exactly:

**`Тип размещения предмета`**

Allowed option values:

- `unplaced`;
- `location`;
- `character`.

Presentation labels may be Russian human-readable strings such as:

- Без размещения;
- В локации;
- У персонажа.

## Change behavior

Changing kind:

- updates local draft only;
- clears any target from the previous kind;
- dispatches no authored command.

No direct canonical commit.

---

# CONTRACT-IP-013 — Location target control

Render only when draft kind is `location`.

Accessible label exactly:

**`Локация предмета`**

## Options

- empty placeholder option;
- canonical `project.locations` only.

## Value

Local draft `locationId ?? ''`.

## Change

Local draft only.

No command dispatched.

## Empty canonical collection

Show an empty/no-available option state and keep Apply disabled.

---

# CONTRACT-IP-014 — Character target control

Render only when draft kind is `character`.

Accessible label exactly:

**`Персонаж с предметом`**

## Options

- empty placeholder option;
- canonical `project.characters` only.

## Value

Local draft `characterId ?? ''`.

## Change

Local draft only.

No command dispatched.

---

# CONTRACT-IP-015 — Current authored placement summary

The Item inspector must separately render current canonical authored placement.

This summary is derived from CONTRACT-IP-005, not from the local draft.

Minimum semantics:

- Unplaced → explicit unplaced text;
- resolved Location → Location name;
- resolved Character → Character name;
- unresolved Location → explicit unresolved/missing Location plus stored id;
- unresolved Character → explicit unresolved/missing Character plus stored id.

## Accessibility

Unresolved status must be textual.

Do not rely on color alone.

## Important separation

"Current authored placement" describes canonical project state.

The form controls describe the pending local draft.

---

# CONTRACT-IP-016 — Apply predicate

Button text exactly:

**`Применить размещение`**

Native `disabled` is required.

Conceptual predicate:

```ts
const nextPlacement = itemPlacementFromDraft(draft);

const canApply =
  inspectedItem !== undefined &&
  nextPlacement !== undefined &&
  validateAuthoredItemPlacementTarget(project, nextPlacement).status === 'valid' &&
  !authoredItemPlacementEquals(inspectedItem.placement, nextPlacement);
```

## Important

UI validation is advisory/preventive.

Reducer performs authoritative validation again.

## Same value

Apply disabled.

Even if a command somehow reaches reducer, reducer returns exact no-op.

## Stale draft race

If target disappears after render:

- reducer rejects atomically;
- no partial state.

---

# CONTRACT-IP-017 — Apply action

On Apply:

1. derive complete ItemPlacement from draft;
2. if none → do nothing;
3. if local validation is not valid → do nothing;
4. if equal to current canonical placement → do nothing;
5. execute:

```ts
{
  type: 'item/setPlacement',
  id: inspectedItem.id,
  placement: nextPlacement
}
```

## Post-apply

Do not manually mutate draft to "pretend success".

Canonical project update causes CONTRACT-IP-011 synchronization.

This ensures UI follows actual reducer state.

---

# CONTRACT-IP-018 — Duplicate Canvas reference contract

A Canvas click may change:

- `selectedCanvasNodeId`;
- `selectedLocalItemId`.

Placement command always targets:

`selectedLocalItemId / inspectedItem.id`

never `selectedCanvasNodeId`.

If two Canvas nodes reference the same ItemInstance:

- both open the same canonical placement;
- changing concrete selected Canvas copy does not reset draft source key;
- no per-Canvas placement exists.

---

# CONTRACT-IP-019 — Remove-from-board non-contract

Existing `editor/removeCanvasNode` remains unchanged.

Removing a visual reference must not dispatch:

- `item/setPlacement`;
- runtime placement command;
- ItemInstance delete.

The existing UI may clear local selection after removal.

Canonical ItemInstance placement remains untouched.

---

# CONTRACT-IP-020 — Runtime non-contract

A67-D2 authored placement helper/reducer/UI must not call or mutate:

- `effectiveItemPlacement()` for authored form state;
- `itemPlacementOverrides`;
- runtime player item placement;
- Simulation Playhead.

## Approved runtime semantics from Stage 4

- override present → runtime override remains effective;
- no override → existing runtime effective placement follows current authored baseline.

No active-session freeze contract is introduced.

---

# CONTRACT-IP-021 — Persistence non-contract

No new persistence API.

No schema version.

No migration.

No repository method.

Existing authored projection persists:

`ItemInstance.placement`

Existing runtime projection independently persists:

`itemPlacementOverrides`.

A67-D2 only requires regression tests around this existing boundary.

---

# CONTRACT-IP-022 — Error/status ownership

## Pure resolver

Missing target → unresolved value.

No throw.

## Pure target validator

Missing target → typed missing-location / missing-character status.

No throw.

## Reducer

Missing ItemInstance / invalid target / same value → exact original project.

No throw.

## Story UI

Incomplete draft → disabled Apply.

No toast required.

## Infrastructure failure

Normal A67-D2 contracts do not define recovery from broken React/store infrastructure.

Such failure is a defect, not a semantic placement status.

---

# CONTRACT-IP-023 — Test identity assertions

The reducer/history tests must explicitly assert reference identity.

Required examples:

```ts
expect(
  applyNarrativeProjectCommand(project, missingItemCommand)
).toBe(project);
```

```ts
expect(
  applyNarrativeProjectCommand(project, missingTargetCommand)
).toBe(project);
```

```ts
expect(
  applyNarrativeProjectCommand(project, samePlacementCommand)
).toBe(project);
```

History-level test must additionally prove:

- `past.length` unchanged for no-op;
- `future` unchanged for no-op;
- meaningful change adds exactly one prior snapshot.

Deep equality alone is insufficient for the no-op requirement.

---

## 2. Contract dependency direction

Allowed direction:

```text
domain ItemPlacement
      ↓
application authored-item-placement policy
      ↓
store reducer
      ↓
NarrativeProject history

domain + application policy
      ↓
StoryWorkspace local draft/presentation
      ↓
existing execute(command)
```

Forbidden reverse dependencies:

- application helper importing React;
- domain importing StoryWorkspace;
- reducer importing UI draft;
- runtime importing UI form state;
- Canvas becoming placement owner.

---

## 3. Sync / async table

| Contract | Mode |
|---|---|
| placement equality | synchronous |
| placement resolver | synchronous |
| target validator | synchronous |
| draft conversion | synchronous |
| Apply predicate | synchronous |
| execute item/setPlacement | synchronous local reducer dispatch |
| persistence | existing repository behavior, outside immediate command contract |
| runtime overlay | outside authored command contract |

No network/AI/worker dependency exists.

---

## 4. Idempotency / repeat table

| Operation | Repeat behavior |
|---|---|
| equality | deterministic |
| resolve placement | deterministic for same project |
| validate target | deterministic for same project |
| set same placement | exact project no-op |
| set valid different placement | first changes, immediate repeat becomes no-op |
| Apply same draft after canonical sync | disabled |
| render unresolved state | never mutates |
| remove Canvas reference | never changes placement |

---

## 5. Contract decisions

### DEC-IP-027 — command name

`item/setPlacement`

Fields:

- `id`;
- `placement`.

### DEC-IP-028 — pure helper module API

Exports exactly:

- `authoredItemPlacementEquals`;
- `resolveAuthoredItemPlacement`;
- `validateAuthoredItemPlacementTarget`;
- `ResolvedAuthoredItemPlacement`;
- `AuthoredItemPlacementTargetValidation`.

Do not export UI draft types from this module.

### DEC-IP-029 — mutation result

No new public result object.

Reducer identity is the mutation/no-op signal used by existing history.

### DEC-IP-030 — UI draft type

Local `ItemPlacementDraft` with optional target only for incomplete Location/Character drafts.

### DEC-IP-031 — commit boundary

Explicit `Применить размещение`.

Kind/target changes never dispatch canonical mutation directly.

### DEC-IP-032 — draft synchronization

Stable source key = ItemInstance id + semantic canonical placement signature.

Unrelated project changes do not reset the draft.

### DEC-IP-033 — accessibility labels

Exact first-slice labels:

- `Тип размещения предмета`;
- `Локация предмета`;
- `Персонаж с предметом`;
- Apply text `Применить размещение`.

### DEC-IP-034 — reducer validation ownership

Reducer imports/reuses the narrow target validator and equality helper.

Reducer itself owns ItemInstance existence and project mutation.

### DEC-IP-035 — current summary vs draft

Canonical current placement summary and pending draft are separate presentation concepts.

### DEC-IP-036 — no runtime/persistence API changes

Confirmed.

---

## 6. Requirement → contract traceability

| Requirement | Contracts |
|---|---|
| REQ-IP-001 canonical ItemInstance owner | 002, 007, 017 |
| REQ-IP-002 three variants | 001, 008–010, 012–014 |
| REQ-IP-003 target validation | 006, 007, 016, 017 |
| REQ-IP-004 readable placement | 004, 005, 015 |
| REQ-IP-005 Undo/Redo | 007, 023 |
| REQ-IP-006 runtime separation | 007, 020 |
| REQ-IP-007 duplicate Canvas refs | 011, 018 |
| REQ-IP-008 remove Canvas != unplace | 019 |
| REQ-IP-009 persistence | 021 |
| REQ-IP-010 deterministic no-op | 003, 007, 016, 023 |

All Stage 0 requirements have an explicit interface/behavior contract.

---

## 7. Stage 6 test contract matrix

Minimum tests required later:

### Pure policy

- equality across every variant pair;
- resolved Location;
- unresolved Location;
- resolved Character;
- unresolved Character;
- Unplaced;
- target validation statuses.

### Reducer

- missing item is `.toBe(project)`;
- missing Location is `.toBe(project)`;
- missing Character is `.toBe(project)`;
- same placement is `.toBe(project)`;
- Unplaced → Location;
- Location → Character;
- Character → Unplaced;
- only target ItemInstance changes.

### History

- no-op does not change past/future;
- meaningful change adds exactly one past snapshot;
- Undo/Redo authored placement;
- runtime override and Playhead preserved through existing runtime history behavior.

### Story UI

- exact accessible labels exist;
- draft kind change does not mutate project;
- incomplete Location/Character keeps Apply disabled;
- same canonical placement keeps Apply disabled;
- valid changed draft enables Apply;
- Apply dispatches complete command;
- canonical project rerender resets draft;
- unresolved stored target displays textually and can be repaired;
- unrelated project changes do not reset in-progress draft;
- switching between duplicate Canvas copies of same ItemInstance does not create separate placement state;
- Remove from board does not mutate placement.

### Runtime/persistence regression

- runtime override remains unchanged;
- override wins when present;
- authored baseline wins when override absent;
- save/reopen preserves authored placement independently of runtime override.

---

## 8. Gate Review — Stage 6 → Stage 7 Dynamic Flow / Data Flow

### Contract completeness

✅ exact command discriminant fixed.

✅ exact command fields fixed.

✅ pure helper names fixed.

✅ resolved/unresolved union fixed.

✅ target validation status fixed.

✅ reducer identity no-op contract fixed.

✅ local draft type fixed.

✅ canonical-to-draft behavior fixed.

✅ draft-to-placement behavior fixed.

✅ stable draft synchronization rule fixed.

✅ exact accessible labels fixed.

✅ Apply enable/disable predicate fixed.

✅ runtime non-contract fixed.

✅ persistence non-contract fixed.

✅ identity-level test requirements fixed.

### Blocking questions

None.

### Gate decision

**✅ PASS to Stage 7 Dynamic Flow / Data Flow.**

Production implementation remains prohibited until Stage 7 Dynamic Flow and Stage 8 Detailed Design are complete.

---

## 9. Next concrete stage — do not skip

**Stage 7: Dynamic Flow / Data Flow for Authored Item Placement.**

It must model at least:

1. Item Canvas selection → canonical ItemInstance → read projection → draft;
2. valid Apply;
3. same-value no-op;
4. missing target race;
5. stale stored target repair;
6. Undo;
7. Redo;
8. duplicate Canvas references;
9. Remove from board;
10. runtime override present;
11. runtime override absent;
12. save/reopen persistence;
13. ordering and stale-snapshot behavior.

Only after Stage 7 PASS may Detailed Design begin.
