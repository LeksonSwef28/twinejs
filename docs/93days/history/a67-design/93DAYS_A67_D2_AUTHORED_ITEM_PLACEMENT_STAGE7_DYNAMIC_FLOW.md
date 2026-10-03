# 93 Days — A67-D2 Authored Item Placement · Stage 7 Dynamic Flow / Data Flow

Status: **STAGE 7 COMPLETE — PASS to Detailed Design**
Base: `93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36`
Design branch before this document: `design/a67-d2-authored-item-placement-stage0@a50cd42628fb72ad210330e2439c04b7b545c403`
Depends on Stage 0–6 Authored Item Placement documents.
Date: **2026-10-01**
Production code in this slice: **none**

---

## 0. Goal / Definition of Done

Stage 7 answers one question:

> Can the Stage 6 contracts execute end-to-end through the current Story authoring, reducer/history, runtime-overlay and persistence architecture without transiently creating invalid authored placement, mutating runtime records, losing a user's draft on unrelated updates, or splitting one ItemInstance across multiple Canvas references?

Definition of Done:

1. all required Stage 6 journeys are walked step-by-step;
2. every step names owner, input, validation, mutation and postcondition;
3. stale-target and stale-render races are explicit;
4. Undo/Redo + runtime preservation are explicit;
5. save/reopen is explicit;
6. ordering does not depend on React batching;
7. no production implementation is started;
8. if no BLOCKER remains, next gate is Stage 8 Detailed Design.

---

## 1. Live architecture facts used by this stage

### FACT-IP-D7-001 — Story Item selection is local

Current StoryWorkspace resolves:

`selectedLocalItemId -> itemInstancesById -> inspectedItem`

A Canvas click on an Item sets:

- `selectedLocalItemId = item id`;
- `selectedCanvasNodeId = clicked visual id`.

No shared AuthorFocus transition is required for Item.

### FACT-IP-D7-002 — execute uses current reducer state

NarrativeProjectContext exposes:

`execute(command)`

which uses a functional state update and routes through the current editor authoring reducer.

Therefore reducer validation executes against the latest reducer state available at dispatch time, not against a cached project copy captured by the caller.

### FACT-IP-D7-003 — authoring no-op is project identity

If `applyNarrativeProjectCommand` returns the exact input project object, the history reducer keeps the exact history state and creates no authoring Undo entry.

### FACT-IP-D7-004 — authored Undo/Redo preserves current runtime

NarrativeProjectContext wraps restored authored snapshots with `keepCurrentRuntime(restored.present, current.present)`.

Therefore current runtime fields, including:

- `itemPlacementOverrides`;
- Simulation Playhead;

survive authored Undo/Redo.

### FACT-IP-D7-005 — persistence follows current project state

NarrativeProjectProvider saves `state.present` using the existing repository after the current debounce window.

No placement-specific save path exists or is required.

### FACT-IP-D7-006 — remove-from-board is editor-only

Current Item inspector dispatches only:

`editor/removeCanvasNode`

then clears local selected canvas/item state.

It does not delete ItemInstance and does not touch ItemInstance placement.

---

## 2. Stage 7 execution rule: canonical project wins over local draft

There are two different state classes:

### Canonical

`ItemInstance.placement`

owned by NarrativeProject.

### Transient

`ItemPlacementDraft`

owned by StoryWorkspace.

The draft is never proof that a canonical mutation succeeded.

Correct ordering is:

```text
render canonical project
→ derive/read current authored placement
→ initialize/synchronize local draft
→ author edits local draft
→ Apply builds complete ItemPlacement
→ reducer revalidates against current project
→ reducer changes canonical project or exact-no-ops
→ next render reads canonical result
→ draft synchronizes from canonical source key
```

### Safety rule

No UI intermediate state may be written to NarrativeProject.

Therefore these temporary states are valid:

- draft kind = Location, no target;
- draft target references an entity that was just deleted elsewhere;
- draft differs from canonical placement.

They remain local only.

---

## 3. Render-time source rule

Every render of the Item inspector computes current canonical state from:

`inspectedItem.placement`

then resolves it using:

`resolveAuthoredItemPlacement(project, inspectedItem.placement)`.

The authored summary never reads from:

- the pending draft;
- `itemPlacementOverrides`;
- `effectiveItemPlacement()`;
- Canvas coordinates.

The edit draft never overwrites the canonical summary until the reducer actually commits a new project.

---

# 4. Flow 1 — Canvas Item selection → canonical ItemInstance → projection → draft

## Initial state

- ItemInstance I exists;
- Item I placement = Unplaced / Location / Character;
- one or more Canvas references may point to I.

## Step 1 — click Item Canvas reference

Owner:

`StoryWorkspace.selectCanvasNode`

Input:

- CanvasNodeInstance with `entityRef.type === 'item'`;
- canonical item id I;
- concrete Canvas node id V.

Mutation:

- `selectedLocalItemId = I`;
- `selectedCanvasNodeId = V`.

No authored command.

## Step 2 — resolve inspected item

Owner:

StoryWorkspace render.

Data flow:

`selectedLocalItemId(I)`
→ `itemInstancesById.get(I)`
→ `inspectedItem`.

If I no longer exists:

- `inspectedItem = undefined`;
- Item placement editor does not fabricate an entity.

## Step 3 — current authored projection

Owner:

`resolveAuthoredItemPlacement`.

Input:

- current project;
- `inspectedItem.placement`.

Output:

- Unplaced;
- resolved/unresolved Location;
- resolved/unresolved Character.

No mutation.

## Step 4 — draft synchronization

Owner:

StoryWorkspace effect/local synchronization.

Source identity:

`item id + canonical placement semantic key`.

Result:

- local draft is initialized from canonical placement;
- unresolved stored targets initialize same kind with no valid selected target.

Postconditions:

- current summary describes canonical placement;
- controls describe pending draft;
- runtime unchanged.

---

# 5. Flow 2 — valid Apply: Unplaced → Location

## Initial state

- Item I exists;
- canonical placement = Unplaced;
- Location L exists;
- draft source matches I + Unplaced.

## Step 1 — choose Location kind

Owner:

StoryWorkspace local form.

Mutation:

`draft = {kind:'location'}`

No command.

Canonical project unchanged.

## Step 2 — choose Location L

Mutation:

`draft = {kind:'location', locationId:L}`

No command.

## Step 3 — compute Apply predicate

StoryWorkspace derives complete placement:

`{type:'location', locationId:L}`.

Checks:

- inspectedItem exists;
- target validator returns valid;
- canonical placement is not semantically equal.

Apply becomes enabled.

## Step 4 — click Apply

Owner:

StoryWorkspace.

Dispatch:

```ts
execute({
  type: 'item/setPlacement',
  id: I,
  placement: {type:'location', locationId:L}
});
```

## Step 5 — reducer validates latest project

Owner:

NarrativeProject reducer.

Order:

1. Item I exists?
2. Location L exists?
3. current placement equals requested?

All pass for a meaningful change.

## Step 6 — canonical mutation

Reducer creates new NarrativeProject where:

- only I's placement changes;
- `touched(...)` updates normal project metadata;
- runtime fields are not written.

History adds exactly one authored snapshot.

## Step 7 — render after commit

StoryWorkspace sees:

- canonical placement = Location L;
- new draft source key = `I:location:L`.

Draft synchronizes to Location L.

Apply becomes disabled because draft now equals canonical.

---

# 6. Flow 3 — Location → Character

Same transaction shape as Flow 2.

Critical rule:

The reducer replaces the **whole discriminated ItemPlacement value**.

It does not retain a stale Location field alongside Character.

Postcondition:

`placement = {type:'character', characterId:C}`

only.

No runtime inventory action is executed.

---

# 7. Flow 4 — Character → explicit Unplaced

## Draft

Author chooses kind Unplaced.

Draft becomes:

`{kind:'unplaced'}`.

No target is needed.

## Apply

Command carries exactly:

`{type:'unplaced'}`.

Reducer validates Item existence, equality, then replaces whole placement value.

No ItemInstance deletion.

No Canvas removal.

No runtime override mutation.

---

# 8. Flow 5 — same-value no-op

## Initial state

Canonical:

`Location L`.

Draft:

`Location L`.

## UI layer

`canApply = false`.

Normally no command is emitted.

## Defensive reducer path

If an equivalent command reaches reducer anyway:

1. Item exists;
2. target exists;
3. equality returns true;
4. reducer returns exact original project.

History:

- `past` unchanged;
- `future` unchanged;
- no new Undo step.

Runtime unchanged.

---

# 9. Flow 6 — target disappears between render and Apply

This is the primary stale-snapshot race.

## Initial render

- Item I exists;
- Location L exists;
- draft = Location L;
- UI validation says valid;
- Apply enabled.

## Concurrent canonical change

Before Apply reducer executes:

- another authoring action removes/changes availability of L in canonical project.

The clicked UI was based on an older render.

## Apply

StoryWorkspace still dispatches the complete command with L.

This is allowed.

## Reducer

Because `execute` applies against current reducer state, reducer revalidates target existence.

Location L is now missing.

Result:

- exact original current project returned;
- no partial ItemPlacement;
- no history entry;
- no runtime write.

## Next render

Canonical Item placement remains whatever it was before.

Draft synchronization rule:

- if canonical item + placement source key did not change, draft may still contain L;
- Apply predicate re-evaluates target validation against current project and becomes disabled.

### Stage 8 detail required

Detailed Design must make sure a stale target option is not presented as a valid canonical select option after the collection changed.

No automatic replacement target is allowed.

---

# 10. Flow 7 — stale stored target repair

## Initial canonical state

Stored:

`{type:'location', locationId:'missing-L'}`

but Location missing-L is absent.

## Render

Resolver returns:

`location + unresolved + missing-L`.

Current authored summary displays unresolved Location and stored id.

## Draft initialization

Draft becomes:

`{kind:'location'}`

with no selected valid target.

No command.

No repair.

Apply disabled.

## Repair A — choose valid Location L2

Draft:

`{kind:'location', locationId:L2}`.

Apply enabled.

Reducer validates L2 and commits Location L2.

## Repair B — choose Character C

Kind change clears old Location draft target.

Then select C and Apply.

Reducer writes Character C.

## Repair C — choose Unplaced

Apply writes Unplaced.

## Forbidden

- select first available Location automatically;
- mutate project during render/effect;
- copy missing-L into a valid select value;
- infer placement from Canvas coordinates.

---

# 11. Flow 8 — Undo after placement edit

## Before edit

Canonical authored placement = Location A.

Runtime:

- override may exist or not;
- Simulation Playhead = P.

## Apply change

Author sets Location B.

History now has prior authored snapshot A.

## Undo

NarrativeProjectContext:

1. restores previous authored history snapshot;
2. applies `keepCurrentRuntime(restored, current)`.

Postconditions:

- authored Item placement = Location A;
- current `itemPlacementOverrides` preserved;
- Simulation Playhead remains P;
- editor current view remains under existing reducer rules.

## StoryWorkspace render

Canonical source key changes from:

`I:location:B`

to:

`I:location:A`.

Draft synchronizes back to A.

No manual draft rollback is needed.

---

# 12. Flow 9 — Redo after Undo

Redo mirrors Flow 8.

Postconditions:

- authored placement returns to B;
- runtime override unchanged;
- Playhead unchanged;
- draft source key changes back and synchronizes to B.

---

# 13. Flow 10 — unrelated project update while draft is dirty

This flow protects author input.

## Initial

Canonical Item I placement = Location A.

Draft initialized from A.

Author changes draft to Character C but has not Applied.

## Unrelated mutation

Examples:

- viewport move;
- Story node edit;
- unrelated Item edit;
- runtime update;
- Simulation Playhead change;
- selection of another Canvas copy of same Item I.

## Source key

Item id and canonical placement of I are unchanged.

Therefore draft synchronization must **not** reset.

Draft remains Character C.

### Critical implication

The synchronization effect must not depend on the whole project object.

It must depend on the stable source identity/value defined in Stage 6.

---

# 14. Flow 11 — same ItemInstance through duplicate Canvas references

## Initial

Canvas A → Item I.

Canvas B → Item I.

Canonical placement = Location L.

Draft is initialized for I.

## Click Canvas A

- selectedCanvasNodeId = A;
- selectedLocalItemId = I.

## Edit draft but do not Apply

Draft becomes Character C.

## Click Canvas B

- selectedCanvasNodeId changes to B;
- selectedLocalItemId remains I;
- canonical placement remains Location L;
- source key remains identical.

Therefore:

- draft remains Character C;
- no reset;
- no second canonical placement state.

## Apply from B-selected state

Command still targets Item I.

After commit both Canvas references resolve the same Character C authored placement.

---

# 15. Flow 12 — Remove from board

## Initial

Canvas A → Item I.

Item I canonical placement = Character C.

A is selected.

## Action

Existing Item inspector dispatches:

`editor/removeCanvasNode(A)`.

Then current UI clears:

- selectedCanvasNodeId;
- selectedLocalItemId.

## Reducer impact

Only editor Canvas state changes.

No `item/setPlacement`.

No ItemInstance delete.

## Canonical postcondition

Item I still exists.

Item I placement still Character C.

If Canvas B also references I, selecting B later opens the same canonical Character C placement.

If A was last visual reference, the item remains canonical but simply has no Story visual.

---

# 16. Flow 13 — runtime override present

## Initial

Authored Item I placement = Location A.

Runtime override:

`itemPlacementOverrides[I] = Container C` or any runtime placement variant.

Effective runtime placement = override.

## Author applies authored Location B

Reducer changes only:

`ItemInstance[I].placement: A -> B`.

It does not touch runtime override.

Postconditions:

- authored placement = B;
- runtime override still Container C;
- effective runtime placement still Container C;
- Simulation Playhead unchanged.

Undo/Redo preserves override through `keepCurrentRuntime`.

---

# 17. Flow 14 — no runtime override

## Initial

Authored placement = Location A.

No `itemPlacementOverrides[I]`.

Effective runtime placement derives from authored baseline A.

## Author applies Location B

Reducer changes only authored placement.

No runtime record is written.

Postconditions:

- authored placement = B;
- override still absent;
- existing `effectiveItemPlacement` fallback now returns B;
- Simulation Playhead unchanged.

This is the explicit Stage 4 approved behavior.

It is not considered a runtime-record mutation.

---

# 18. Flow 15 — save/reopen persistence

## Initial

Author changes Item I authored placement to Character C.

Runtime override for I may independently exist.

## Save

Existing NarrativeProjectProvider debounce observes new `state.present`.

Repository saves the full existing persistence envelope/projection.

No placement-specific save call.

## Stored separation

Authored projection contains:

`itemInstances[].placement = Character C`.

Runtime projection independently contains:

`itemPlacementOverrides`.

## Reopen

Repository hydrates:

- itemInstances from saved authored data;
- runtime placement overrides from saved runtime data.

Story Item inspector selects I and resolver sees Character C.

No migration.

No new schema version.

---

## 19. Ordering guarantees

### Apply ordering

Required logical order:

```text
local complete draft
→ local advisory validation
→ execute command
→ reducer resolves current ItemInstance
→ reducer validates current target
→ reducer checks semantic equality
→ canonical mutation OR exact no-op
→ history update only on canonical mutation
→ React rerender
→ draft sync from canonical source key
```

### Why this order matters

Target validation before equality means a stale stored/missing target cannot be reaffirmed as a valid same-value write.

Canonical mutation before draft resync means UI never pretends a reducer change succeeded.

### No dependency on React batching

Correctness must hold even if:

- local draft update renders separately;
- command state update renders separately;
- draft synchronization effect happens later.

Every intermediate state remains semantically valid because incomplete drafts are local only.

---

## 20. Stale ItemInstance race

A second race exists:

- UI renders inspected Item I;
- Item I is deleted before Apply;
- old UI handler dispatches `item/setPlacement(I,...)`.

Reducer first resolves Item I against current project.

Missing Item → exact no-op.

No history entry.

No replacement item inferred.

On next render, `itemInstancesById.get(I)` fails and inspector no longer treats I as canonical.

Stage 8 should decide whether local selectedLocalItemId needs an explicit cleanup effect or whether derived inspectedItem = undefined is sufficient for first render safety.

Regardless, no stale cached Item object may be used as source of truth.

---

## 21. Stale draft after canonical external placement change

Scenario:

- draft = Character C, not yet applied;
- another canonical action changes Item I from Location A to Unplaced.

Source key changes.

Required behavior:

- canonical summary immediately renders Unplaced;
- synchronization resets draft to Unplaced.

Reason:

A dirty draft based on an obsolete canonical source must not silently overwrite a newer canonical change on a later Apply.

This is intentional conflict avoidance for the first slice.

No merge/rebase UI is required.

---

## 22. Runtime update while placement draft is dirty

Scenario:

- authored canonical placement unchanged;
- draft dirty;
- runtime stepping updates `itemPlacementOverrides` or Playhead.

Because source key uses only:

- Item id;
- authored placement semantic key;

runtime update does not reset draft.

The authored summary also remains authored-only.

This proves runtime projection cannot steal the form.

---

## 23. Save timing and draft timing

Unsaved local draft is not canonical and is not persisted.

If the app closes before Apply:

- draft is lost;
- canonical project remains unchanged.

After Apply:

- canonical state changes synchronously in memory;
- existing repository save behavior persists it on its normal schedule.

A67-D2 does not add autosave of incomplete placement form state.

---

## 24. Dynamic failure ownership

### Missing Item

Reducer owns rejection.

### Missing Location/Character at write time

Reducer owns rejection.

### Unresolved stored target

Read resolver owns description; UI owns repair presentation.

### Incomplete draft

UI owns disabled Apply.

### Runtime mismatch

No failure: sparse-overlay semantics are intentional.

### Persistence failure

Existing repository/saveStatus behavior owns it.

A67-D2 adds no new error channel.

---

## 25. Invariants proven across flows

### INV-D7-IP-001

No partial ItemPlacement enters NarrativeProject.

### INV-D7-IP-002

Reducer validation always uses current canonical project.

### INV-D7-IP-003

A stale UI render cannot force a missing target into canonical placement.

### INV-D7-IP-004

Same-value/invalid requests produce no authoring history.

### INV-D7-IP-005

Runtime override records are never written by authored placement editing.

### INV-D7-IP-006

Dirty local draft survives unrelated project/runtime changes.

### INV-D7-IP-007

Dirty local draft is reset by a canonical change to the same ItemInstance placement.

### INV-D7-IP-008

Duplicate Canvas references cannot create duplicate placement ownership.

### INV-D7-IP-009

Removing a Canvas reference cannot unplace the canonical item.

### INV-D7-IP-010

Save/reopen uses existing authored/runtime persistence boundaries.

---

## 26. Test mapping by flow

| Flow | Required later verification |
|---|---|
| Selection → projection → draft | StoryWorkspace integration |
| Valid Apply | UI + reducer |
| Location → Character | reducer + UI |
| Character → Unplaced | reducer + UI |
| Same-value | identity/history test |
| Target disappears before Apply | reducer race-style test / UI integration |
| Stale stored target repair | resolver + UI |
| Undo | runtime-history integration |
| Redo | runtime-history integration |
| Unrelated update with dirty draft | StoryWorkspace integration |
| Duplicate Canvas refs | StoryWorkspace integration |
| Remove from board | StoryWorkspace integration |
| Runtime override present | runtime-history/carrying regression |
| Runtime override absent | effective-placement regression |
| Save/reopen | repository/persistence regression |
| Missing Item before Apply | reducer + UI derived safety |
| External canonical placement change with dirty draft | StoryWorkspace integration |

---

## 27. Stage 7 decisions

### DEC-IP-037 — command execution uses current reducer state

UI snapshot is advisory only.

Reducer revalidates every write.

### DEC-IP-038 — draft conflict policy

If the same ItemInstance canonical placement changes externally, discard/reset the old dirty draft to new canonical placement.

No merge UI.

### DEC-IP-039 — unrelated updates do not reset draft

Draft synchronization is keyed only by inspected Item id + authored placement signature.

### DEC-IP-040 — stale target after render

Reducer rejects atomically; UI re-evaluates Apply disabled after rerender.

### DEC-IP-041 — stale Item after render

Reducer rejects missing item; derived inspector must not use stale cached entity snapshots.

### DEC-IP-042 — runtime updates do not participate in draft synchronization

Runtime state cannot reset or populate authored placement form.

### DEC-IP-043 — persistence begins only after canonical Apply

Incomplete draft is intentionally not saved.

---

## 28. Gate Review — Stage 7 → Stage 8 Detailed Design

### Dynamic-flow checks

✅ Canvas Item selection resolves one canonical ItemInstance.

✅ current authored summary and draft remain separated.

✅ valid Apply ordering is deterministic.

✅ same-value path is identity no-op.

✅ stale target race is safe.

✅ stale Item race is safe.

✅ unresolved stored placement is repairable without render mutation.

✅ Undo/Redo synchronize draft from canonical state.

✅ dirty draft survives unrelated project/runtime updates.

✅ external canonical placement update resets obsolete draft.

✅ duplicate Canvas references share one canonical placement.

✅ Remove from board is editor-only.

✅ runtime override-present semantics are explicit.

✅ runtime override-absent semantics are explicit.

✅ save/reopen uses existing persistence flow.

✅ correctness does not depend on React batching.

### Blocking questions

None.

### Gate decision

**✅ PASS to Stage 8 Detailed Design.**

Production implementation remains prohibited until Stage 8 completes.

---

## 29. Next concrete stage — do not skip

**Stage 8: Detailed Design for Authored Item Placement.**

It must finalize:

1. exact helper module implementation layout;
2. exact imports;
3. reducer insertion point and immutable update shape;
4. exact StoryWorkspace local state/effect code shape;
5. exact current-summary wording;
6. exact form JSX;
7. source-key implementation;
8. stale-item cleanup decision;
9. exact test files/fixtures;
10. implementation commit sequence;
11. no-change assertions for runtime/schema/persistence modules.

Only after Stage 8 PASS may Stage 9 implementation begin.
