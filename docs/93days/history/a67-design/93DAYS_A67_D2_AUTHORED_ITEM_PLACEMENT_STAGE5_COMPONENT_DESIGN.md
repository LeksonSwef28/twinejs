# 93 Days — A67-D2 Authored Item Placement · Stage 5 Component Design

Status: **STAGE 5 COMPLETE — PASS to Contracts / Interfaces**
Base: `93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36`
Depends on Stage 0–4 Authored Item Placement documents.
Date: **2026-10-01**
Production code in this slice: **none**

## 1. Purpose

Break the approved A67-D2 impact surface into the smallest components with one clear reason to exist.

This stage defines:

- responsibilities;
- inputs and outputs;
- state ownership;
- dependency direction;
- draft/commit behavior;
- stale/unresolved behavior;
- test seams.

It does **not** finalize TypeScript signatures. Exact contracts belong to Stage 6.

---

## 2. Component map

```text
NarrativeProjectContext
        │
        ├── project
        │
        └── execute(command)
                │
                ▼
       NarrativeProject reducer
                │
                └── COMP-IP-001 AuthoredItemPlacementPolicy
                        ├── semantic equality
                        ├── target validation
                        └── authored read resolution

StoryWorkspace
        │
        ├── selectedLocalItemId
        ├── inspected ItemInstance
        ├── COMP-IP-001 authored read resolution
        └── COMP-IP-003 local ItemPlacementDraft
                │
                └── Apply complete ItemPlacement command
```

No new:

- provider;
- global store;
- event bus;
- persisted editor state;
- runtime service;
- AuthorFocus kind;
- top-level workspace.

---

# COMP-IP-001 — AuthoredItemPlacementPolicy

**Name:** Authored Item Placement Policy / Read Resolver

**Layer:** application/narrative, pure.

**Preferred provisional file:**

`src/application/narrative/authored-item-placement.ts`

## Responsibility

Own the small reusable semantic rules that both reducer tests and UI projection need:

1. semantic equality of two authored ItemPlacement values;
2. resolution of a stored ItemPlacement against current canonical Locations/Characters;
3. target validity of a requested complete ItemPlacement.

It does **not** apply a project mutation.

## Inputs

Depending on operation:

- ItemPlacement;
- current NarrativeProject or the minimum authored lookup data;
- canonical Locations;
- canonical Characters.

## Outputs

Conceptually:

- equal / not equal;
- resolved authored placement projection;
- valid target / missing Location / missing Character.

Exact types belong to Stage 6.

## Resolved authored placement projection

Required semantic variants:

```text
Unplaced

Location
  ├── resolved(location)
  └── unresolved(locationId)

Character
  ├── resolved(character)
  └── unresolved(characterId)
```

The projection is read-side only and never persisted.

## Equality rule

Two placements are equal when:

- Unplaced == Unplaced;
- Location A == Location A;
- Character A == Character A.

Different variants are never equal.

Display names are irrelevant to equality.

## Target validation rule

- Unplaced is target-valid.
- Location placement is valid only if that Location exists.
- Character placement is valid only if that Character exists.

A stale **stored** placement may resolve as unresolved.

A newly requested missing target is invalid.

## Dependencies

Allowed:

- ItemPlacement;
- NarrativeProject read model or narrow authored entity arrays;
- NarrativeLocation;
- NarrativeCharacter.

Forbidden:

- itemPlacementOverrides;
- effectiveItemPlacement();
- Simulation Playhead;
- CanvasNodeInstance;
- AuthorFocus;
- React.

## State

None.

## Error behavior

No throws for normal semantic outcomes.

Missing target is data, not infrastructure failure.

## Related requirements

REQ-IP-002, 003, 004, 006, 010.

## Related use cases

UC-IP-001, 002, 003, 008, 009, 010, 011, 012.

## Single reason to exist

Define reusable authored-placement semantics without owning mutation or presentation state.

---

# COMP-IP-002 — NarrativeProject placement mutation owner

**Name:** Existing NarrativeProject reducer placement branch.

**Layer:** store / authored aggregate mutation.

**Primary existing file:**

`src/store/narrative-project/reducer.ts`

## Responsibility

Apply one complete requested authored placement to one existing ItemInstance while preserving history/no-op semantics.

## Input

One new typed NarrativeProjectCommand equivalent to:

```text
item/setPlacement(
  itemInstanceId,
  complete ItemPlacement
)
```

Exact field names belong to Stage 6.

## Processing responsibility

Required order:

1. resolve ItemInstance by id;
2. if missing → return exact original project;
3. ask COMP-IP-001 whether requested target is valid;
4. if target invalid → return exact original project;
5. ask COMP-IP-001 whether requested placement equals current placement;
6. if equal → return exact original project;
7. otherwise replace only that ItemInstance's complete placement value;
8. call existing touched(...) only for the real change.

## Output

Existing reducer output only:

- original NarrativeProject object for invalid/no-op;
- new touched NarrativeProject for meaningful change.

## Why reducer does not expose a rich result object

Stage 2 defined conceptual mutation-result vocabulary.

Stage 3 verified the existing command architecture:

`execute(command)` does not return a domain mutation result.

Changing that architecture merely for A67-D2 is unnecessary.

Therefore first-slice implementation uses:

- pure COMP-IP-001 validation/resolution for inspectable semantics;
- existing reducer identity to encode no-op versus change.

No new command-result bus is introduced.

## State modified on success

Only:

`project.itemInstances[target].placement`

plus existing metadata touched by normal `touched(...)`.

## State explicitly not modified

- itemPlacementOverrides;
- simulation;
- editor;
- storyCanvas;
- ItemDefinition;
- Locations;
- Characters;
- AuthorFocus.

## History behavior

Because invalid/no-op returns exact original project:

- no authoring history entry;
- redo stack preserved.

Because real change returns a new project:

- existing history adds exactly one authored entry.

## Dependencies

- NarrativeProject;
- ItemPlacement;
- COMP-IP-001;
- existing touched(...).

## Related requirements

REQ-IP-001, 002, 003, 005, 006, 010.

## Single reason to exist

Own the canonical authored ItemInstance placement transition.

---

# COMP-IP-003 — StoryWorkspace Item Placement Editor

**Name:** Existing Story Item inspector placement editing section.

**Layer:** React presentation.

**Existing file:**

`src/components/narrative/workspace/story-workspace.tsx`

No new React component file is required for the first slice.

## Responsibility

Let the author:

- read current canonical authored placement;
- prepare a valid replacement placement;
- explicitly commit it;
- repair unresolved stored placement;
- continue using existing Canvas-reference actions independently.

## Canonical input

From existing StoryWorkspace:

- current NarrativeProject;
- inspected ItemInstance resolved from `selectedLocalItemId`;
- ItemDefinition for label;
- project.locations;
- project.characters;
- execute(command).

## Read projection

StoryWorkspace asks COMP-IP-001 to resolve the inspected ItemInstance's **authored** placement.

It must not call `effectiveItemPlacement()` to populate the authored editor.

### Human-readable current state

Required presentation semantics:

- Unplaced → "Без размещения" / equivalent;
- resolved Location → Location name;
- unresolved Location → explicit missing/unresolved Location + stored id;
- resolved Character → Character name;
- unresolved Character → explicit missing/unresolved Character + stored id.

Exact Russian wording belongs to Detailed Design.

## Local state

The editor may own exactly one transient draft for the currently inspected ItemInstance.

Conceptual shape:

```ts
type ItemPlacementDraft =
  | {kind: 'unplaced'}
  | {kind: 'location'; targetId?: string}
  | {kind: 'character'; targetId?: string};
```

This is presentation state only.

It is never written to:

- NarrativeProject.editor;
- ItemInstance until commit;
- AuthorFocus;
- runtime;
- Canvas.

## Draft initialization

When inspection changes to a different ItemInstance:

### Stored Unplaced

Draft initializes:

`{kind:'unplaced'}`

### Stored resolved Location

Draft initializes:

`{kind:'location', targetId: current location id}`

### Stored resolved Character

Draft initializes:

`{kind:'character', targetId: current character id}`

### Stored unresolved Location

Draft initializes:

`{kind:'location', targetId: undefined}`

while current authored summary still shows the missing stored Location id.

### Stored unresolved Character

Draft initializes:

`{kind:'character', targetId: undefined}`

while current authored summary still shows the missing stored Character id.

This keeps rendering non-destructive while making repair explicit.

## Draft synchronization

The draft must reset when:

- inspected ItemInstance id changes; or
- that ItemInstance's canonical authored placement changes due to:
  - successful Apply;
  - Undo;
  - Redo;
  - another canonical authored update.

The draft must **not** reset merely because unrelated project state changed.

Detailed Design must choose a stable placement dependency/key for this synchronization.

## Interaction pattern decision

**Use explicit draft + Apply.**

Do not direct-commit placement kind changes.

Reason:

- switching to Location without a target is an incomplete UI state;
- switching to Character without a target is also incomplete;
- Stage 2 forbids incomplete placement in NarrativeProject;
- explicit Apply gives one deterministic commit boundary;
- stale unresolved values can be repaired without silent mutation.

## Kind control behavior

Author chooses exactly one:

- Unplaced;
- Location;
- Character.

When kind changes:

- to Unplaced → target is cleared;
- to Location → target is cleared unless a valid Location target is deliberately retained by Detailed Design;
- to Character → target is cleared.

First-slice preferred behavior is **clear target on kind change** to avoid accidental cross-kind reuse.

## Target control behavior

### Location draft

Show canonical Locations only.

If there are none:

- target control indicates no Locations available;
- Apply disabled.

### Character draft

Show canonical Characters only.

If there are none:

- target control indicates no Characters available;
- Apply disabled.

### Unplaced draft

No target control required.

## Apply enabled rule

Enabled when:

- Unplaced; or
- Location + selected current canonical Location; or
- Character + selected current canonical Character.

Apply may also be disabled when the complete draft is semantically equal to current authored placement.

This avoids pointless UI actions before the reducer's authoritative no-op protection.

The reducer still remains authoritative because targets may disappear between render and click.

## Apply action

Convert draft to one complete ItemPlacement and execute the typed authored command.

Never execute:

- partial Location;
- partial Character;
- unresolved missing target.

## Stale target repair

Stored unresolved placement remains visible in "current authored placement".

Repair options:

- select an existing Location and Apply;
- select an existing Character and Apply;
- choose Unplaced and Apply.

No automatic repair on mount/render.

## Error/status behavior

No infrastructure error state is needed for normal invalid targets.

If a target disappears between render and Apply:

- reducer rejects with exact no-op;
- next project render can show current canonical state;
- no partial mutation occurs.

A future UX slice may add explicit rejection feedback if needed.

First slice does not require a toast/error bus.

## Related requirements

REQ-IP-001 through REQ-IP-010 except persistence mechanics.

## Single reason to exist

Remain the Story Item inspection/editing surface while delegating canonical semantics and mutation ownership.

---

# COMP-IP-004 — Existing local Item selection / Canvas arbitration

**Name:** StoryWorkspace local Item selection behavior.

This is not a new component; Stage 5 documents the required interaction boundary.

## Existing state reused

`selectedLocalItemId?: string`

`selectedCanvasNodeId?: string`

## Responsibility for A67-D2

Connect a clicked Item Canvas reference to the canonical ItemInstance placement editor without making Canvas the placement owner.

## Duplicate Canvas references

If Canvas reference A and B point to the same ItemInstance:

- both set the same `selectedLocalItemId`;
- both resolve the same ItemInstance;
- both therefore read the same canonical placement;
- no draft/canonical placement is stored by Canvas node id.

Selecting another visual copy of the **same ItemInstance** must not create a second canonical placement editor state.

## Remove from board

Existing behavior remains presentation-only.

When "Убрать с доски" removes the selected Canvas node:

- ItemInstance remains;
- ItemInstance placement remains;
- runtime remains;
- another duplicate reference, if present, can later be selected and resolves the same placement.

The existing UI may clear local item inspection after removing the selected visual.

A67-D2 does not require automatically selecting a duplicate visual.

## Related requirements

REQ-IP-007, REQ-IP-008.

## Single reason to exist

Keep concrete Canvas-instance selection separate from canonical ItemInstance placement.

---

# COMP-IP-005 — Existing authoring history/runtime boundary

**Name:** Existing NarrativeProject history + runtime preservation.

No production component is added or modified for this feature.

## Responsibility reused

- meaningful authored placement change enters history;
- invalid/same-value command does not;
- Undo/Redo restores authored placement;
- current runtime projection remains preserved by existing `keepCurrentRuntime`.

## Runtime semantics from Stage 4

A67-D2 guarantees runtime **record isolation**:

- itemPlacementOverrides not changed;
- Simulation Playhead not changed.

Derived runtime-effective placement still follows:

`override ?? authored placement`.

This component is a test seam, not a production change point.

## Related requirements

REQ-IP-005, REQ-IP-006.

---

# COMP-IP-006 — Existing persistence boundary

**Name:** Existing authored/runtime persistence projection.

No production component is added or modified.

## Responsibility reused

Persist:

- `ItemInstance.placement` under authored projection;
- `itemPlacementOverrides` under runtime projection.

A67-D2 requires regression verification only.

## Related requirement

REQ-IP-009.

---

## 3. Reducer vs pure-helper ownership split

### COMP-IP-001 owns

- placement semantic equality;
- placement target resolution;
- resolved/unresolved authored projection;
- pure target-validity status.

### COMP-IP-002 owns

- ItemInstance existence check;
- decision to mutate or no-op;
- project copy/update;
- touched(...);
- history-visible identity semantics through existing reducer chain.

### StoryWorkspace owns

- transient draft;
- form control;
- current authored summary wording;
- Apply enablement;
- converting a complete draft into a typed command.

### Runtime owns nothing new

Runtime is deliberately absent from the authoring mutation path.

---

## 4. Why no dedicated React ItemPlacementEditor component yet

A separate component file is rejected for the first slice.

Reason:

- only one editing surface exists;
- current Item inspector is small;
- all project data and execute capability already exist in StoryWorkspace;
- extraction would add indirection before behavior stabilizes.

Extraction becomes justified later if:

- Project Library gains the same editor;
- another surface needs identical form behavior;
- StoryWorkspace complexity materially worsens.

For now, a small local render section/helper inside StoryWorkspace is the narrowest design.

---

## 5. Why no new provider/hook

Rejected:

- ItemPlacementProvider;
- ItemPlacementContext;
- item placement store;
- placement session hook.

The canonical state already exists in NarrativeProject.

The only new local state is incomplete form draft.

Creating a provider would duplicate ownership.

---

## 6. Why no command result adapter

Stage 2 conceptualized typed mutation outcomes.

Stage 3 verified that current `execute` is command-only.

A67-D2 does not need to change execute to return mutation status.

Normal invalid cases are protected by:

- UI prevalidation;
- reducer canonical revalidation;
- reducer identity no-op.

If explicit user-facing rejection feedback becomes a requirement, it needs a separate contract/UX decision.

---

## 7. CSS decision

### Decision

**No new CSS is required by Component Design.**

Use existing:

- `narrative-workspace__inspection`;
- `narrative-workspace__compact-form`;
- generic select/input/button rules;
- existing inspector paragraph/small text patterns.

The Item placement form can be rendered as an existing compact form inside the Item inspection card.

### Reopen condition

Only add CSS during Detailed Design/implementation if actual accessible layout cannot be expressed cleanly with existing classes.

Any CSS change must remain presentation-only and cannot alter component ownership.

---

## 8. Accessibility behavior

The first slice must provide explicit accessible labels for:

- placement kind;
- Location target;
- Character target;
- Apply action/current authored placement where needed for testability.

Do not rely only on visual ordering.

Unresolved state must be textual, not color-only.

Disabled Apply must follow native button disabled semantics.

---

## 9. Test seams

### TEST-SEAM-IP-001 — pure policy

Test COMP-IP-001 without React/store.

Cover:

- equality;
- target validation;
- resolved/unresolved projection.

### TEST-SEAM-IP-002 — reducer/history

Call existing authoring reducer with new command.

Cover:

- transitions;
- missing item/targets;
- exact identity no-op;
- one history entry;
- Undo/Redo.

### TEST-SEAM-IP-003 — Story Item inspector

Render StoryWorkspace under existing providers/fixture.

Drive through accessible form controls.

Assert canonical project state after Apply.

### TEST-SEAM-IP-004 — duplicate Canvas

Fixture with two CanvasNodeInstances for one ItemInstance.

Edit from one, select other, assert one placement.

Remove one visual, assert ItemInstance placement unchanged.

### TEST-SEAM-IP-005 — stale stored placement

Fixture intentionally contains missing Location/Character id.

Assert:

- inspector renders;
- current state says unresolved;
- no automatic project mutation;
- repair to valid target/Unplaced works.

### TEST-SEAM-IP-006 — runtime isolation

Use existing runtime-history/carrying seams.

Assert:

- override object unchanged after authored edit/Undo/Redo;
- Playhead unchanged;
- override wins when present;
- authored baseline is effective when override absent.

### TEST-SEAM-IP-007 — persistence

Save/reload changed authored placement and existing runtime override.

Assert both retain independent values.

---

## 10. Component interaction flows

### Flow A — valid Location edit

```text
Author clicks Item visual
  -> StoryWorkspace selectedLocalItemId
  -> ItemInstance
  -> COMP-IP-001 resolves current authored placement
  -> local draft initialized
  -> author chooses Location + target
  -> Apply
  -> execute(item/setPlacement complete value)
  -> reducer:
       item exists?
       target valid?
       same value?
       replace placement + touched
  -> project rerenders
  -> draft syncs to new canonical placement
```

### Flow B — same-value Apply

```text
draft == canonical placement
  -> UI normally disables Apply
  -> even if command reaches reducer:
       COMP-IP-001 equality true
       reducer returns exact project
       no history entry
```

### Flow C — target deleted between render and Apply

```text
draft references Location A
  -> Location A removed canonically
  -> Apply reaches reducer
  -> target invalid
  -> exact project no-op
  -> no partial placement
```

### Flow D — stale imported target

```text
stored Location X
  -> X not in project
  -> COMP-IP-001 returns unresolved Location X
  -> inspector displays missing target
  -> draft has Location kind but no valid selected target
  -> no mutation on render
  -> author explicitly repairs and Applies
```

### Flow E — runtime override exists

```text
authored Location A
runtime override Container C
  -> author sets authored Location B
  -> reducer changes ItemInstance only
  -> runtime override still Container C
  -> effective runtime placement still Container C
```

### Flow F — no runtime override

```text
authored Location A
no runtime override
  -> author sets authored Location B
  -> reducer changes ItemInstance only
  -> no runtime record written
  -> existing effective placement fallback now yields Location B
```

---

## 11. Components explicitly NOT created

No:

- ItemPlacementProvider;
- ItemPlacementContext;
- global ItemPlacement store;
- placement-specific command bus;
- ItemPlacementEntity;
- placement repository;
- runtime synchronization service;
- active-playtest freeze service;
- Item AuthorFocus kind;
- Item workspace;
- shared generic entity picker framework;
- generic form framework.

None are required by current use cases.

---

## 12. State ownership table

| State | Owner | Persisted? | Runtime? |
|---|---|---:|---:|
| ItemInstance.placement | NarrativeProject | yes, authored | no |
| itemPlacementOverrides | runtime projection | yes, runtime | yes |
| placement resolved/unresolved projection | pure computed value | no | no |
| placement edit draft | StoryWorkspace local React state | no | no |
| selectedLocalItemId | StoryWorkspace local React state | no | no |
| selectedCanvasNodeId | StoryWorkspace local React state | no | no |
| ItemDefinition | NarrativeProject | yes, authored | no |
| Simulation Playhead | simulation runtime | yes, runtime | yes |

---

## 13. Requirement → component traceability

| Requirement | Component owner(s) |
|---|---|
| REQ-IP-001 canonical owner | COMP-IP-002, COMP-IP-003 |
| REQ-IP-002 three variants | COMP-IP-001, COMP-IP-003 |
| REQ-IP-003 target validation | COMP-IP-001, COMP-IP-002 |
| REQ-IP-004 readable placement | COMP-IP-001, COMP-IP-003 |
| REQ-IP-005 Undo/Redo | COMP-IP-002, COMP-IP-005 |
| REQ-IP-006 runtime separation | COMP-IP-002, COMP-IP-005 |
| REQ-IP-007 duplicate Canvas refs | COMP-IP-003, COMP-IP-004 |
| REQ-IP-008 remove Canvas != unplace | COMP-IP-004 |
| REQ-IP-009 persistence | COMP-IP-006 |
| REQ-IP-010 no-op | COMP-IP-001, COMP-IP-002 |

---

## 14. Stage 5 decisions

### DEC-IP-018 — pure semantic owner

Use one narrow pure application helper.

### DEC-IP-019 — mutation owner

Use existing NarrativeProject reducer.

### DEC-IP-020 — UI owner

Use existing Story Item inspector.

### DEC-IP-021 — form interaction

Use local draft + explicit Apply.

No partial direct commits.

### DEC-IP-022 — unresolved repair

Display canonical unresolved state, initialize repair draft without a fake target, mutate only after explicit valid Apply.

### DEC-IP-023 — reducer result

Keep existing command-only execute architecture; no result adapter.

### DEC-IP-024 — duplicate Canvas refs

They share one canonical ItemInstance placement; Canvas ids remain local interaction only.

### DEC-IP-025 — CSS

No new CSS expected; reuse existing inspection/compact-form styles.

### DEC-IP-026 — runtime

No runtime component changes.

---

## 15. Gate Review — Stage 5 → Stage 6 Contracts / Interfaces

### Component responsibility checks

✅ one canonical authored placement owner remains ItemInstance.

✅ pure semantic policy has no state or runtime dependency.

✅ reducer owns only canonical authored transition.

✅ UI owns only transient draft/presentation.

✅ unresolved read and invalid write remain distinct.

✅ incomplete UI state cannot enter NarrativeProject.

✅ duplicate Canvas references cannot own placement.

✅ no provider/global store introduced.

✅ runtime sparse-overlay decision from Stage 4 is preserved.

✅ no new CSS dependency is required.

### Open contract questions for Stage 6

Stage 6 must finalize:

1. exact new command discriminant and fields;
2. exact pure helper function/type names;
3. exact resolved-placement union;
4. exact target-validation result type;
5. exact ItemPlacementDraft representation, if typed explicitly;
6. exact draft synchronization key/dependencies;
7. exact accessible control labels;
8. exact Apply disable predicate;
9. whether reducer imports target validation helper directly or a narrower boolean/status function;
10. exact tests for same-object identity.

### Gate decision

**✅ PASS to Stage 6 Contracts / Interfaces.**

No Stage 5 blocker exists.

Production implementation remains prohibited until Contracts, Dynamic Flow and Detailed Design are complete.

---

## 16. Next concrete stage — do not skip

**Stage 6: Contracts / Interfaces for Authored Item Placement.**

At minimum it must define:

- command contract;
- pure read/equality/validation contracts;
- resolved/unresolved union;
- UI draft contract;
- mutation/no-op contract;
- runtime non-contract;
- persistence non-contract;
- error/status semantics;
- accessibility/test identifiers where needed.

Only after Stage 6 PASS may Dynamic Flow be designed.
