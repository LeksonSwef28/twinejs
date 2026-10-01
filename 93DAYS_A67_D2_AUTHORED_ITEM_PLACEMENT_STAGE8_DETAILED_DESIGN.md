# 93 Days — A67-D2 Authored Item Placement · Stage 8 Detailed Design

Status: **STAGE 8 COMPLETE — PASS to Implementation**
Base: `93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36`
Design branch before this document: `design/a67-d2-authored-item-placement-stage0@752e819ac3b0728d89bb838ee2b9d1d67b0bf9fa`
Stage 7 exact-head Branch Check: **GREEN**
Depends on Stage 0–7 Authored Item Placement documents.
Date: **2026-10-01**
Change type: **detailed design only**
Production code in this stage: **none**

---

## 0. Goal / Definition of Done

Stage 8 converts the approved A67-D2 architecture, contracts and dynamic flows into an implementation-ready design.

Definition of Done:

1. exact production module/file placement is fixed;
2. exact imports and exported helper contracts are fixed;
3. reducer insertion point and immutable update algorithm are fixed;
4. StoryWorkspace local draft representation and synchronization are fixed;
5. unresolved placement wording and repair UX are fixed;
6. exact first-slice JSX structure and accessible labels are fixed;
7. stale ItemInstance cleanup behavior is fixed;
8. exact test files and fixture responsibilities are fixed;
9. implementation commit sequence is fixed;
10. no schema/migration/runtime/compiler/Player production change is required;
11. rollback remains narrow;
12. no production implementation is included in Stage 8.

---

# 1. Verified baseline facts

Verified against design head `752e819ac3b0728d89bb838ee2b9d1d67b0bf9fa`, whose production tree still matches stable for this feature.

### FACT-D8-IP-001 — command union already imports ItemPlacement

`src/application/narrative/commands.ts` already imports:

```ts
import {ItemPlacement} from '../../domain/narrative/items';
```

No new domain import path is needed to add `item/setPlacement`.

### FACT-D8-IP-002 — reducer already imports application commands

`src/store/narrative-project/reducer.ts` already imports `NarrativeProjectCommand` from the application layer.

Adding a narrow import from `application/narrative/authored-item-placement` is consistent with the existing dependency direction used by this store module.

### FACT-D8-IP-003 — StoryWorkspace already owns local Item inspection

Current state already contains:

```ts
const [selectedCanvasNodeId, setSelectedCanvasNodeId] =
  React.useState<string>();
const [selectedLocalItemId, setSelectedLocalItemId] =
  React.useState<string>();
```

and resolves:

```ts
const inspectedItem = selectedLocalItemId
  ? itemInstancesById.get(selectedLocalItemId)
  : undefined;
```

No new Item selection owner is required.

### FACT-D8-IP-004 — existing Item inspector is the exact insertion surface

Current Item branch already renders:

- `ITEM INSTANCE`;
- ItemDefinition name;
- explanatory identity text;
- `Убрать с доски`.

The placement summary/form belongs in this branch before the Remove-from-board action.

### FACT-D8-IP-005 — existing compact-form CSS can be reused

`narrative-workspace__compact-form` and existing form/select/button styling already exist.

No CSS modification is required by design.

### FACT-D8-IP-006 — workspace integration fixture pattern already exists

`workspace-context.integration.test.tsx` already demonstrates:

- localStorage repository seeding;
- NarrativeProjectProvider;
- AuthoringSessionFocusProvider;
- StoryWorkspace rendering;
- Canvas button interaction;
- canonical project integration.

A67-D2 can create a focused sibling integration test using the same stable fixture pattern rather than extending D1 responsibilities.

---

# 2. ADR-D8-IP-001 — exact production file impact

## New production file

```text
src/application/narrative/authored-item-placement.ts
```

## Modified production files

```text
src/application/narrative/commands.ts
src/store/narrative-project/reducer.ts
src/components/narrative/workspace/story-workspace.tsx
```

## Not modified

```text
src/domain/narrative/items.ts
src/domain/narrative/entities.ts
src/domain/narrative/project.ts
src/domain/narrative/project-factory.ts

src/store/narrative-project/editor-authoring.ts
src/store/narrative-project/narrative-project-context.tsx
src/store/narrative-project/runtime-history.ts
src/store/narrative-project/runtime-snapshot.ts
src/store/narrative-project/persistence-projection.ts
src/store/narrative-project/repository.ts

src/domain/narrative/carrying.ts

src/application/narrative/player-item-placement.ts
src/application/narrative/player-runtime.ts
src/application/narrative/export-compiler.ts

src/components/narrative/workspace/narrative-workspace.css
A67-D1 Author Focus/navigation modules
Project Search
WORLD/TIME
Player host
schema/migration modules
AI modules
```

If implementation proves a production file in the "Not modified" set must change, stop and reopen Stage 4 Impact Analysis before expanding scope.

---

# 3. New module: authored-item-placement.ts

## Path

```text
src/application/narrative/authored-item-placement.ts
```

## Exact imports

```ts
import {
  NarrativeCharacter,
  NarrativeLocation
} from '../../domain/narrative/entities';
import {ItemPlacement} from '../../domain/narrative/items';
import {NarrativeProject} from '../../domain/narrative/project';
```

## Exact exports

```ts
export type ResolvedAuthoredItemPlacement =
  | {type: 'unplaced'}
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

export type AuthoredItemPlacementTargetValidation =
  | {status: 'valid'}
  | {status: 'missing-location'; locationId: string}
  | {status: 'missing-character'; characterId: string};

export function authoredItemPlacementEquals(
  left: ItemPlacement,
  right: ItemPlacement
): boolean;

export function resolveAuthoredItemPlacement(
  project: NarrativeProject,
  placement: ItemPlacement
): ResolvedAuthoredItemPlacement;

export function validateAuthoredItemPlacementTarget(
  project: NarrativeProject,
  placement: ItemPlacement
): AuthoredItemPlacementTargetValidation;
```

No default export.

No React import.

No runtime import.

---

# 4. authoredItemPlacementEquals exact algorithm

Implementation shape:

```ts
export function authoredItemPlacementEquals(
  left: ItemPlacement,
  right: ItemPlacement
): boolean {
  if (left.type !== right.type) {
    return false;
  }

  switch (left.type) {
    case 'unplaced':
      return true;
    case 'location':
      return (
        right.type === 'location' &&
        left.locationId === right.locationId
      );
    case 'character':
      return (
        right.type === 'character' &&
        left.characterId === right.characterId
      );
  }
}
```

The explicit same-variant guards are acceptable even after discriminant comparison because they keep TypeScript narrowing simple and auditable.

No JSON stringify equality.

No entity-name comparison.

---

# 5. resolveAuthoredItemPlacement exact algorithm

### Unplaced

Return:

```ts
{type: 'unplaced'}
```

### Location

Lookup:

```ts
const location = project.locations.find(
  candidate => candidate.id === placement.locationId
);
```

If found:

```ts
{
  type: 'location',
  status: 'resolved',
  locationId: placement.locationId,
  location
}
```

If missing:

```ts
{
  type: 'location',
  status: 'unresolved',
  locationId: placement.locationId
}
```

### Character

Symmetric lookup through `project.characters`.

No fallback.

No write.

No runtime effective placement.

---

# 6. validateAuthoredItemPlacementTarget exact algorithm

Implementation uses the same canonical collections but returns write-validation status only.

```ts
switch (placement.type) {
  case 'unplaced':
    return {status: 'valid'};

  case 'location':
    return project.locations.some(
      location => location.id === placement.locationId
    )
      ? {status: 'valid'}
      : {
          status: 'missing-location',
          locationId: placement.locationId
        };

  case 'character':
    return project.characters.some(
      character => character.id === placement.characterId
    )
      ? {status: 'valid'}
      : {
          status: 'missing-character',
          characterId: placement.characterId
        };
}
```

Do not implement this by calling the resolver and then converting every output. Keeping write validation explicit makes the read/write semantic distinction obvious in review.

---

# 7. commands.ts exact change

Insert directly after `item/addInstance` in `NarrativeProjectCommand`:

```ts
| {
    type: 'item/setPlacement';
    id: string;
    placement: ItemPlacement;
  }
```

No optional placement.

No Canvas id.

No runtime fields.

Do not change `item/addInstance`.

---

# 8. reducer.ts imports

Add:

```ts
import {
  authoredItemPlacementEquals,
  validateAuthoredItemPlacementTarget
} from '../../application/narrative/authored-item-placement';
```

Keep existing command import.

No ItemPlacement domain import is required solely for the new case because the command already carries the typed value.

---

# 9. reducer.ts exact insertion point

Insert new case directly after existing `case 'item/addInstance'`.

This keeps Item authoring operations adjacent.

Existing `item/addInstance` behavior remains byte-for-byte/semantically unchanged.

---

# 10. reducer case exact algorithm

Preferred code shape:

```ts
case 'item/setPlacement': {
  const item = project.itemInstances.find(
    candidate => candidate.id === command.id
  );

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
      candidate.id === command.id
        ? {...candidate, placement: command.placement}
        : candidate
    )
  });
}
```

## Required ordering

1. Item existence;
2. target validation;
3. semantic equality;
4. immutable update;
5. touched only for real change.

## Why target validation precedes equality

A stale stored missing target must not become a successful same-value reaffirmation.

## Identity requirement

All no-op paths return the exact original `project`.

---

# 11. StoryWorkspace new imports

Add application imports:

```ts
import {
  authoredItemPlacementEquals,
  ResolvedAuthoredItemPlacement,
  resolveAuthoredItemPlacement,
  validateAuthoredItemPlacementTarget
} from '../../../application/narrative/authored-item-placement';
```

Add domain import:

```ts
import {ItemPlacement} from '../../../domain/narrative/items';
```

No runtime/carrying import.

---

# 12. StoryWorkspace local draft types

Add beside existing local interfaces:

```ts
type ItemPlacementDraft =
  | {kind: 'unplaced'}
  | {kind: 'location'; locationId?: string}
  | {kind: 'character'; characterId?: string};

interface ItemPlacementDraftState {
  sourceKey: string;
  value: ItemPlacementDraft;
}
```

The state wrapper is deliberate: it stamps the user draft with the canonical source it was based on.

---

# 13. StoryWorkspace local pure helpers

Add above `StoryWorkspace`.

## authoredItemPlacementKey

```ts
function authoredItemPlacementKey(placement: ItemPlacement) {
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

## itemPlacementDraftFromResolved

```ts
function itemPlacementDraftFromResolved(
  placement: ResolvedAuthoredItemPlacement
): ItemPlacementDraft {
  switch (placement.type) {
    case 'unplaced':
      return {kind: 'unplaced'};
    case 'location':
      return placement.status === 'resolved'
        ? {kind: 'location', locationId: placement.locationId}
        : {kind: 'location'};
    case 'character':
      return placement.status === 'resolved'
        ? {kind: 'character', characterId: placement.characterId}
        : {kind: 'character'};
  }
}
```

## itemPlacementFromDraft

```ts
function itemPlacementFromDraft(
  draft: ItemPlacementDraft
): ItemPlacement | undefined {
  switch (draft.kind) {
    case 'unplaced':
      return {type: 'unplaced'};
    case 'location':
      return draft.locationId
        ? {type: 'location', locationId: draft.locationId}
        : undefined;
    case 'character':
      return draft.characterId
        ? {type: 'character', characterId: draft.characterId}
        : undefined;
  }
}
```

These remain file-local.

---

# 14. Draft synchronization ADR

## Decision

Do **not** synchronize the placement draft with a React effect.

Use source-stamped local state and render-time arbitration.

## Why

An effect that depends on:

- whole project;
- resolved object;
- locations/characters arrays;

can reset a dirty draft on unrelated updates.

An effect that intentionally omits those dependencies is harder to audit and can conflict with hooks linting.

Instead:

- canonical source key identifies the inspected Item + authored placement;
- user draft is stored with the source key it was based on;
- if canonical source key changes, stale stored draft is ignored immediately;
- no batching/effect timing is required for correctness.

This directly implements Stage 7 invariants.

---

# 15. StoryWorkspace placement derived values

After `inspectedItem` resolution add:

```ts
const resolvedInspectedItemPlacement = inspectedItem
  ? resolveAuthoredItemPlacement(project, inspectedItem.placement)
  : undefined;

const itemPlacementDraftSourceKey = inspectedItem
  ? `${inspectedItem.id}:${authoredItemPlacementKey(inspectedItem.placement)}`
  : undefined;

const canonicalItemPlacementDraft = resolvedInspectedItemPlacement
  ? itemPlacementDraftFromResolved(resolvedInspectedItemPlacement)
  : {kind: 'unplaced'} satisfies ItemPlacementDraft;
```

Add local state near other `useState` declarations:

```ts
const [itemPlacementDraftState, setItemPlacementDraftState] =
  React.useState<ItemPlacementDraftState>();
```

Effective draft:

```ts
const itemPlacementDraft =
  itemPlacementDraftState?.sourceKey === itemPlacementDraftSourceKey
    ? itemPlacementDraftState.value
    : canonicalItemPlacementDraft;
```

## Local draft writer

File-local closure inside component:

```ts
function setItemPlacementDraft(value: ItemPlacementDraft) {
  if (!itemPlacementDraftSourceKey) {
    return;
  }

  setItemPlacementDraftState({
    sourceKey: itemPlacementDraftSourceKey,
    value
  });
}
```

## Consequences

- unrelated rerenders preserve a dirty draft;
- runtime updates preserve a dirty draft;
- selecting another Canvas copy of same Item preserves dirty draft;
- successful Apply changes canonical source key and stale draft is ignored;
- Undo/Redo changes canonical source key and stale draft is ignored;
- external authored placement change changes source key and stale draft is ignored.

No synchronization effect is required.

---

# 16. Stale ItemInstance cleanup decision

## Decision

Add one narrow effect:

```ts
React.useEffect(() => {
  if (
    selectedLocalItemId &&
    !itemInstancesById.has(selectedLocalItemId)
  ) {
    setSelectedLocalItemId(undefined);
  }
}, [itemInstancesById, selectedLocalItemId]);
```

## Purpose

Clean local selection after canonical ItemInstance deletion/replacement.

## Safety before effect

Even before the effect executes:

- `inspectedItem` is derived from current `itemInstancesById`;
- stale Item object is never cached;
- no stale placement can be committed because Apply requires `inspectedItem`.

Therefore correctness does not depend on effect timing.

## selectedCanvasNodeId

Do not add a second cleanup rule specifically for Item deletion.

Existing Canvas/selection reconciliation already handles invalid/mismatched selected Canvas nodes.

If implementation tests reveal a concrete gap, fix only that verified gap without adding placement ownership to Canvas.

---

# 17. Current authored placement summary wording

Inside Item inspector render exactly one current-state paragraph before the form.

Preferred text function may remain inline/local.

### Unplaced

`Текущее размещение: без размещения.`

### Resolved Location

`Текущее размещение: локация «<name>».`

### Unresolved Location

`Текущее размещение: отсутствующая локация (<locationId>).`

### Resolved Character

`Текущее размещение: у персонажа «<name>».`

### Unresolved Character

`Текущее размещение: отсутствующий персонаж (<characterId>).`

The missing id is intentionally visible for repair/debugging.

Do not call it runtime/current physical placement.

The wording must say **authored/current placement in the authored inspector context**, not simulate current runtime truth.

---

# 18. Exact form JSX shape

Within the existing `inspectedItem` branch, after current summary and before Remove-from-board:

```tsx
<form
  className="narrative-workspace__compact-form"
  onSubmit={event => {
    event.preventDefault();
    applyInspectedItemPlacement();
  }}
>
  <select
    aria-label="Тип размещения предмета"
    value={itemPlacementDraft.kind}
    onChange={...}
  >
    <option value="unplaced">Без размещения</option>
    <option value="location">В локации</option>
    <option value="character">У персонажа</option>
  </select>

  {itemPlacementDraft.kind === 'location' && (
    <select
      aria-label="Локация предмета"
      value={validLocationDraftValue}
      onChange={...}
    >
      <option value="">Выбери локацию</option>
      {project.locations.map(location => (
        <option key={location.id} value={location.id}>
          {location.name}
        </option>
      ))}
    </select>
  )}

  {itemPlacementDraft.kind === 'character' && (
    <select
      aria-label="Персонаж с предметом"
      value={validCharacterDraftValue}
      onChange={...}
    >
      <option value="">Выбери персонажа</option>
      {project.characters.map(character => (
        <option key={character.id} value={character.id}>
          {character.name}
        </option>
      ))}
    </select>
  )}

  <button type="submit" disabled={!canApplyItemPlacement}>
    Применить размещение
  </button>
</form>
```

Existing `Убрать с доски` button remains outside this form and retains existing behavior.

---

# 19. Kind change behavior

Exact `onChange` semantics:

### unplaced

```ts
setItemPlacementDraft({kind: 'unplaced'});
```

### location

```ts
setItemPlacementDraft({kind: 'location'});
```

### character

```ts
setItemPlacementDraft({kind: 'character'});
```

Do not carry target id across kind changes.

No command is executed here.

---

# 20. Target select safe value

A draft target may become stale after the target collection changes.

Do not feed an id that is absent from current options as a valid controlled-select value.

Compute:

```ts
const validLocationDraftValue =
  itemPlacementDraft.kind === 'location' &&
  itemPlacementDraft.locationId &&
  project.locations.some(
    location => location.id === itemPlacementDraft.locationId
  )
    ? itemPlacementDraft.locationId
    : '';

const validCharacterDraftValue =
  itemPlacementDraft.kind === 'character' &&
  itemPlacementDraft.characterId &&
  project.characters.some(
    character => character.id === itemPlacementDraft.characterId
  )
    ? itemPlacementDraft.characterId
    : '';
```

This does not mutate the underlying local draft.

It only prevents stale ids from appearing as valid selector choices.

---

# 21. Apply derived values

Compute:

```ts
const nextItemPlacement = inspectedItem
  ? itemPlacementFromDraft(itemPlacementDraft)
  : undefined;

const itemPlacementTargetValidation = nextItemPlacement
  ? validateAuthoredItemPlacementTarget(project, nextItemPlacement)
  : undefined;

const canApplyItemPlacement = Boolean(
  inspectedItem &&
    nextItemPlacement &&
    itemPlacementTargetValidation?.status === 'valid' &&
    !authoredItemPlacementEquals(
      inspectedItem.placement,
      nextItemPlacement
    )
);
```

No state is required for `canApply`.

---

# 22. Apply handler exact shape

Add inside StoryWorkspace:

```ts
function applyInspectedItemPlacement() {
  if (!inspectedItem) {
    return;
  }

  const placement = itemPlacementFromDraft(itemPlacementDraft);

  if (!placement) {
    return;
  }

  if (
    validateAuthoredItemPlacementTarget(project, placement).status !==
    'valid'
  ) {
    return;
  }

  if (authoredItemPlacementEquals(inspectedItem.placement, placement)) {
    return;
  }

  execute({
    type: 'item/setPlacement',
    id: inspectedItem.id,
    placement
  });
}
```

Do not mutate `itemPlacementDraftState` after execute.

The next render arbitrates against canonical source key.

---

# 23. Unresolved repair behavior in exact UI

Example stored state:

```ts
{type:'location', locationId:'missing-home'}
```

Render:

- summary: `Текущее размещение: отсутствующая локация (missing-home).`;
- kind select: `location`;
- Location target select: placeholder `Выбери локацию`;
- Apply disabled until a valid target is chosen.

If author changes kind to Unplaced:

- Apply becomes enabled because Unplaced differs from stale canonical Location;
- Apply commits Unplaced.

If author chooses a valid Location:

- Apply commits that Location.

No missing id is inserted into the options list.

---

# 24. Empty collection behavior

### No Locations

Location selector contains only:

`Выбери локацию`.

Apply disabled for Location draft.

### No Characters

Character selector contains only:

`Выбери персонажа`.

Apply disabled for Character draft.

### Unplaced

Always complete and valid.

No extra empty-state component or toast is required.

---

# 25. Duplicate Canvas behavior in implementation

No code special-case is needed in placement helper/reducer.

Reason:

Both Canvas copies set:

`selectedLocalItemId = same ItemInstance id`.

Draft source key excludes `selectedCanvasNodeId`.

Therefore switching visual copies:

- changes concrete Canvas selection;
- leaves placement draft source unchanged;
- preserves dirty draft.

This behavior must be proven in integration tests.

---

# 26. Remove-from-board ordering

Existing handler remains:

1. verify selected concrete Item Canvas reference;
2. dispatch `editor/removeCanvasNode`;
3. clear selectedCanvasNodeId;
4. clear selectedLocalItemId.

Do not call:

- placement helper;
- item/setPlacement;
- ItemInstance delete.

No modification required except surrounding Item inspector JSX insertion.

---

# 27. Runtime boundary exact non-changes

Implementation must not import or call:

```text
effectiveItemPlacement
applyItemRuntimePlacement
itemPlacementOverrides mutation helpers
replaceRuntimeProjectInHistory
keepCurrentRuntime
Player placement APIs
simulation mutation APIs
```

from the new helper, reducer case or Story Item form.

The feature is tested against runtime behavior but does not modify runtime production modules.

---

# 28. Persistence boundary exact non-changes

No change to:

- schemaVersion;
- persistence projection key lists;
- repository hydrate/save functions;
- runtime snapshot shape.

The new command mutates an already-persisted authored field.

Persistence work is regression testing only.

---

# 29. Exact test file plan

## New — pure application policy

```text
src/application/narrative/__tests__/authored-item-placement.test.ts
```

### Fixture

Small project with:

- Location `home`;
- Character `katya`;
- missing ids intentionally absent.

### Tests

1. equality:
   - unplaced/unplaced true;
   - same Location true;
   - different Location false;
   - same Character true;
   - different Character false;
   - cross-kind false.
2. resolver:
   - Unplaced;
   - resolved Location;
   - unresolved Location;
   - resolved Character;
   - unresolved Character.
3. validator:
   - Unplaced valid;
   - Location valid/missing;
   - Character valid/missing.

---

## New — focused store mutation/history

```text
src/store/narrative-project/__tests__/authored-item-placement.test.ts
```

Do not overload generic `authoring.test.ts`.

### Fixture

Project with:

- ItemDefinition `key-def`;
- ItemInstance `key-1`;
- Location `home`;
- Location `cafe`;
- Character `katya`.

### Direct reducer tests

Use `applyNarrativeProjectCommand` where identity matters.

Required:

- missing item `.toBe(project)`;
- missing Location `.toBe(project)`;
- missing Character `.toBe(project)`;
- same Unplaced `.toBe(project)`;
- same Location `.toBe(project)`;
- Unplaced → Location;
- Location → Character;
- Character → Unplaced;
- unrelated ItemInstance object/value preserved.

### History tests

Use `narrativeProjectHistoryReducer`.

Required:

- same-value command keeps exact history state or at minimum unchanged past/future references;
- invalid target preserves redo history;
- real change adds exactly one past entry;
- Undo restores previous authored placement;
- Redo reapplies placement.

---

## New — Story inspector integration

```text
src/components/narrative/workspace/__tests__/authored-item-placement.integration.test.tsx
```

Use the same repository-seeding pattern as `workspace-context.integration.test.tsx`.

### Fixture

Canonical project:

- Locations: Home, Cafe;
- Character: Katya;
- ItemDefinition: Key;
- ItemInstance: key-1;
- two CanvasNodeInstances referencing key-1;
- optional second item for non-target preservation;
- runtime override fixture for dedicated state output where useful.

### Harness

Wrap:

- NarrativeProjectProvider;
- AuthoringSessionFocusProvider;
- a small session component using `useNarrativeProject()`;
- StoryWorkspace with existing authoring navigation hook or equivalent real workspace wiring.

Expose test outputs only where state cannot be asserted via visible UI:

- canonical placement;
- runtime override;
- Simulation day/minute;
- optional Undo/Redo buttons.

### UI tests

1. Unplaced current summary + exact labels.
2. Kind change alone does not mutate canonical project.
3. Location without target → Apply disabled.
4. valid Location target → Apply enabled → canonical placement changes.
5. Location → Character.
6. Character → Unplaced.
7. same canonical draft → Apply disabled.
8. unresolved stored Location renders missing id and can repair.
9. target removed after draft selection → Apply becomes disabled / canonical state unchanged.
10. dirty draft survives unrelated runtime/project update.
11. external canonical placement change / Undo resets effective draft.
12. two Canvas copies share dirty draft and final canonical placement.
13. Remove from board leaves ItemInstance placement unchanged.

Do not rely on implementation-specific React state inspection.

Use accessible controls from Stage 6.

---

## Modified — runtime history boundary

```text
src/store/narrative-project/__tests__/runtime-history.test.ts
```

Add one focused test:

- authored Item placement A;
- runtime override for same Item;
- real authored placement change to B;
- Undo + `keepCurrentRuntime`;
- authored placement returns A;
- runtime override remains unchanged;
- Simulation Playhead remains the current runtime value.

No runtime production change.

---

## Modified — sparse fallback regression

```text
src/domain/narrative/__tests__/carrying.test.ts
```

Import `effectiveItemPlacement` if not already imported.

Add one focused test:

1. Item authored at Home, no override → effective = Home;
2. same Item object copy authored at Cafe, no override → effective = Cafe;
3. override Character/Container present → override wins regardless of authored baseline.

This documents Stage 4 Option 1.

No carrying production change.

---

## Modified — physical persistence regression

```text
src/store/narrative-project/__tests__/physical-runtime-persistence.test.ts
```

Extend existing repository persistence test to assert:

- `raw.authored.itemInstances` contains the authored Item placement;
- `raw.runtime.itemPlacementOverrides` independently contains runtime placement;
- loaded project restores both independently.

No new persistence test framework.

---

# 30. Existing tests not repurposed

Do not turn:

- D1 workspace-context tests;
- Player item placement tests;
- generic authoring test;

into the primary A67-D2 feature suite.

They remain regression coverage.

A67-D2 gets focused tests so failures identify the new feature boundary directly.

---

# 31. Test fixture stale target construction

For unresolved UI tests, directly seed a structurally valid authored placement such as:

```ts
placement: {
  type: 'location',
  locationId: 'missing-location'
}
```

while omitting that Location from `project.locations`.

This is intentional fixture construction.

Do not use a production command to create the stale state because the new command correctly rejects it.

---

# 32. Test fixture target-disappears race

For reducer tests:

- simply validate command against project where target is absent.

For UI integration:

1. select a valid target in local draft;
2. invoke a harness authoring action that removes/replaces the canonical target or replace fixture project through an existing valid test mechanism;
3. assert target select no longer treats id as valid and Apply is disabled;
4. canonical Item placement remains unchanged.

If no existing supported Location-delete command exists, do **not** invent production deletion only for the test.

It is acceptable to cover the authoritative stale-target race at reducer level and cover UI stale selector behavior through a pre-seeded stale/unresolved fixture.

Detailed implementation should not widen scope for test convenience.

---

# 33. No CSS implementation commit

Stage 8 confirms:

**Do not modify `narrative-workspace.css` in the planned implementation.**

Use existing:

- inspection;
- compact-form;
- select/input/button styling.

If implementation reveals an actual accessibility/layout defect, a CSS change is allowed only after documenting the concrete need in the implementation commit/PR body; no new design system class family.

---

# 34. Implementation commit sequence

Stage 9 should be split into reviewable commits.

## Commit A — pure policy + command + reducer

Files:

```text
src/application/narrative/authored-item-placement.ts
src/application/narrative/commands.ts
src/store/narrative-project/reducer.ts
src/application/narrative/__tests__/authored-item-placement.test.ts
src/store/narrative-project/__tests__/authored-item-placement.test.ts
```

Commit intent:

`feat: add authored item placement mutation core`

Gate before next commit:

- focused policy tests PASS;
- focused reducer/history tests PASS;
- lint/type/build should not regress.

## Commit B — Story Item inspector UX

Files:

```text
src/components/narrative/workspace/story-workspace.tsx
src/components/narrative/workspace/__tests__/authored-item-placement.integration.test.tsx
```

Commit intent:

`feat: edit authored item placement in Story inspector`

Gate:

- integration tests PASS;
- existing D1 workspace-context integration PASS;
- no CSS change unless proven necessary.

## Commit C — runtime/persistence boundary regression evidence

Files:

```text
src/store/narrative-project/__tests__/runtime-history.test.ts
src/domain/narrative/__tests__/carrying.test.ts
src/store/narrative-project/__tests__/physical-runtime-persistence.test.ts
```

Commit intent:

`test: verify authored item placement boundaries`

No production runtime/persistence files.

## Commit D — only if CI reveals a scoped defect

Repair only the verified defect.

Do not use repair as permission to expand schema/runtime/Player scope.

---

# 35. Stage 9 verification order

After implementation commits:

1. inspect diff against Stage 4 impact list;
2. focused helper tests;
3. focused store tests;
4. Story integration;
5. D1 workspace-context integration;
6. runtime-history regression;
7. carrying fallback regression;
8. physical persistence regression;
9. full test suite;
10. lint;
11. web build;
12. Player host build;
13. Electron build;
14. canonical player smoke;
15. Vite smoke;
16. Electron smoke;
17. Windows Electron launch contract;
18. exact-head Branch Check GREEN.

The CI workflow already performs the global checks; local/focused evidence should distinguish PASS from NOT RUN.

---

# 36. No-change assertions to verify after implementation

The final implementation diff must prove no production modifications to:

### Canonical schema/domain shape

- `domain/narrative/items.ts`;
- `domain/narrative/project.ts`;
- schema version;
- migrations.

### Runtime

- `runtime-history.ts`;
- `runtime-snapshot.ts`;
- `carrying.ts` production implementation;
- Player runtime placement;
- simulation.

### Persistence

- persistence projection;
- repository production implementation.

### Editor architecture

- AuthorFocus type;
- AuthoringSessionFocusProvider;
- authoring navigation;
- WORLD/TIME;
- Search;
- NarrativeWorkspace composition.

### Compiler/export/Player

No production changes.

If the implementation diff violates this list, stop and reopen Impact Analysis before considering the work complete.

---

# 37. Rollback design

Because no schema/runtime/persistence shape changes occur, rollback removes:

- new application helper;
- new command variant;
- reducer case;
- Story inspector placement UI;
- focused tests.

Existing persisted projects remain readable.

Projects saved after using the feature contain only pre-existing legal `ItemPlacement` values, so reverting the UI does not create unknown persisted data.

---

# 38. Detailed traceability

| Requirement | Contract | Detailed implementation point | Test |
|---|---|---|---|
| REQ-IP-001 | item/setPlacement | reducer case updates ItemInstance only | store + UI |
| REQ-IP-002 | ItemPlacement union | form kind → complete union | pure + UI |
| REQ-IP-003 | target validator | reducer validation before equality | pure + store |
| REQ-IP-004 | resolved projection | Item inspector current summary | pure + UI |
| REQ-IP-005 | identity/history | touched only on change | store + runtime-history |
| REQ-IP-006 | runtime non-contract | no runtime imports/writes | runtime-history + carrying |
| REQ-IP-007 | canonical Item id | draft source excludes Canvas id | UI duplicate Canvas |
| REQ-IP-008 | remove non-contract | existing editor/removeCanvasNode unchanged | UI integration |
| REQ-IP-009 | existing persistence | no persistence prod change | physical persistence |
| REQ-IP-010 | equality + same-object | reducer exact project no-op | pure + store identity |

---

# 39. Stage 8 decisions

### DEC-IP-044 — exact new module

`src/application/narrative/authored-item-placement.ts`.

### DEC-IP-045 — draft synchronization implementation

Use source-stamped local state + render-time arbitration.

No draft-sync effect.

### DEC-IP-046 — stale Item cleanup

Use one narrow effect to clear missing `selectedLocalItemId`.

Correctness remains safe before the effect because `inspectedItem` is derived from current project.

### DEC-IP-047 — no CSS

Reuse existing compact-form/inspection styles.

### DEC-IP-048 — exact UI wording

Current placement summary wording is fixed by section 17.

### DEC-IP-049 — exact test ownership

Use focused new application/store/UI test files plus narrow runtime/persistence regression additions.

### DEC-IP-050 — implementation commits

Core → UI → boundary tests → scoped repair only if needed.

---

# 40. Gate Review — Stage 8 → Stage 9 Implementation

### Detailed design checks

✅ exact production files fixed.

✅ exact new helper exports fixed.

✅ exact command shape fixed.

✅ reducer case location and ordering fixed.

✅ no-op reference identity fixed.

✅ Story imports fixed.

✅ local draft types fixed.

✅ draft synchronization mechanism fixed without effect timing dependency.

✅ stale Item cleanup fixed.

✅ stale selector values handled safely.

✅ current summary wording fixed.

✅ exact form labels/options/button fixed.

✅ Apply predicate and handler fixed.

✅ duplicate Canvas behavior requires no extra canonical state.

✅ runtime/persistence production non-changes fixed.

✅ exact test files and fixture strategy fixed.

✅ commit sequence fixed.

✅ rollback bounded.

### Blocking questions

None.

### Gate decision

**✅ PASS to Stage 9 Implementation.**

The design chain is now complete:

`Requirements → Use Cases → Domain Model → Architecture Verification → Impact Analysis → Component Design → Contracts → Dynamic Flow → Detailed Design`.

Production implementation may begin in the next stage, but not in this Stage 8 document commit.

---

# 41. Next concrete stage

**Stage 9: Implementation + focused tests + full verification.**

Implementation must follow the commit sequence in section 34 and may not silently expand the Stage 4 blast radius.
