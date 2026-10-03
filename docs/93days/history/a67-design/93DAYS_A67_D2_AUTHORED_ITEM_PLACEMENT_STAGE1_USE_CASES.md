# 93 Days — A67-D2 Authored Item Placement · Stage 1 Use Cases

Status: **STAGE 1 COMPLETE — Gate to Domain Model**
Base: `93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36`
Depends on: `93DAYS_A67_D2_AUTHORED_ITEM_PLACEMENT_STAGE0.md`
Date: **2026-10-01**
Production code in this slice: **none**

## 1. Stage 1 purpose

Stage 0 established the gap:

> `ItemInstance.placement` already owns canonical authored initial placement, but the visible authoring flow cannot inspect or edit it after an ItemInstance is created.

Stage 1 defines the user journeys that the next Domain Model and architecture stages must satisfy.

It does not choose final TypeScript command names, reducer functions, JSX structure or styling.

The scenario set deliberately stays inside the existing authored placement variants:

- Unplaced;
- Location;
- Character.

Runtime pockets, containers and inventory manipulation remain outside this slice.

## 2. First-slice UX surface decision

The first Authored Item Placement slice shall use the existing **Story Item inspector** as its editing surface.

Reason:

- StoryWorkspace already resolves a concrete `ItemInstance` from local Item inspection;
- the current inspector already explains physical ItemInstance identity;
- placement belongs to the concrete instance, not the ItemDefinition;
- adding a new top-level workspace or a second Item editor would duplicate ownership;
- the A67 pilot gap was specifically that existing authoring could create/inspect an ItemInstance but not assign its authored world placement.

The first slice does **not** require placement editing from:

- Project Search;
- WORLD/TIME;
- Project Library rows;
- a new Inventory workspace.

This resolves UNKNOWN-IP-001.

## 3. Create-time placement decision

The minimum first slice shall support **editing placement after ItemInstance creation**.

Create-time placement is deferred.

The existing flow remains valid:

1. create ItemDefinition;
2. create ItemInstance;
3. instance defaults to `Unplaced`;
4. inspect the concrete ItemInstance;
5. author its placement.

Reason:

- `item/addInstance` already defaults safely to `Unplaced`;
- editing is the missing capability;
- combining creation + placement would create a second UI path that must duplicate validation before the core edit contract exists.

A later slice may add create-time placement by reusing the same canonical validation/mutation contract.

This resolves UNKNOWN-IP-002.

## 4. UC-IP-001 — Unplaced ItemInstance → existing Location

**Actor:** author.

**Related requirements:** REQ-IP-001, REQ-IP-002, REQ-IP-003, REQ-IP-004, REQ-IP-005, REQ-IP-006.

### Preconditions

- an ItemDefinition exists;
- a concrete ItemInstance exists;
- its authored placement is `{type:'unplaced'}`;
- at least one canonical Location exists;
- the ItemInstance is inspectable through the current Story Item flow;
- Simulation Playhead is at any moment.

### Trigger

Author opens the Item inspector and chooses a Location placement.

### Main flow

1. Item inspector resolves the canonical ItemInstance by id.
2. Inspector shows current authored placement as **Unplaced**.
3. Author chooses placement type **Location**.
4. UI presents canonical project Locations.
5. Author selects one existing Location.
6. A typed authored mutation is requested for that ItemInstance.
7. Validation proves:
   - ItemInstance still exists;
   - selected Location still exists.
8. Canonical `ItemInstance.placement` becomes:
   `{type:'location', locationId}`.
9. Inspector re-renders the human-readable Location name from the current project.
10. No CanvasNodeInstance field is changed.
11. Runtime placement override state and Simulation Playhead remain unchanged.

### Result

The project now has one canonical authored answer for where the concrete item starts: the selected Location.

### Must not happen

- Location id is stored on the canvas node;
- Canvas x/y position changes;
- an item runtime override is created;
- Actual Presence changes;
- Simulation Playhead moves;
- ItemDefinition receives placement.

---

## 5. UC-IP-002 — existing Location placement → existing Character

**Actor:** author.

**Related requirements:** REQ-IP-001, REQ-IP-002, REQ-IP-003, REQ-IP-004, REQ-IP-005, REQ-IP-006.

### Preconditions

- ItemInstance placement is `Location(A)`;
- Character B exists.

### Trigger

Author changes placement type to **Character** and chooses Character B.

### Main flow

1. Inspector continues to represent the same canonical ItemInstance.
2. Current placement is shown as Location A.
3. Author chooses **Character**.
4. UI presents canonical project Characters.
5. Author selects Character B.
6. Target validation succeeds.
7. One authored mutation replaces the entire placement variant with:
   `{type:'character', characterId:B}`.
8. No residual `locationId` remains as active placement state.
9. Inspector now displays Character B as current authored placement.

### Result

Placement changes variant atomically.

### Must not happen

- the ItemInstance is simultaneously treated as at Location A and with Character B;
- Character Actual Presence is inferred from item placement;
- a runtime inventory operation is executed.

---

## 6. UC-IP-003 — existing Character placement → explicit Unplaced

**Actor:** author.

**Related requirements:** REQ-IP-002, REQ-IP-004, REQ-IP-005, REQ-IP-006.

### Preconditions

- ItemInstance is authored as being with a Character.

### Trigger

Author explicitly chooses **Unplaced**.

### Main flow

1. Inspector shows the current Character placement.
2. Author chooses Unplaced.
3. Typed authored mutation writes exactly:
   `{type:'unplaced'}`.
4. No replacement Location or Character is inferred.
5. Inspector displays Unplaced.

### Result

Unplaced remains a valid intentional authored state.

### Must not happen

- ItemInstance is deleted;
- Canvas visual is removed;
- runtime placement is cleared as a side effect;
- a default Location is fabricated.

---

## 7. UC-IP-004 — placement change participates in Undo / Redo

**Actor:** author.

**Related requirements:** REQ-IP-005, REQ-IP-006.

### Preconditions

- ItemInstance placement is Unplaced;
- runtime state contains its own current values;
- Simulation Playhead is recorded before editing.

### Trigger

Author changes authored placement to Location A.

### Main flow

1. placement edit is accepted as an authored command;
2. authored project history records the meaningful change;
3. ItemInstance now has Location A;
4. author invokes Undo;
5. authored placement returns to Unplaced;
6. runtime state is preserved according to existing authored-history/runtime separation;
7. author invokes Redo;
8. authored placement returns to Location A.

### Assertions

Throughout Undo/Redo:

- Simulation Playhead remains unchanged;
- runtime item placement overrides remain unchanged;
- editor canvas selection/geometry is not treated as authored placement history.

### Result

Authored placement behaves like other canonical authoring, not like editor navigation.

---

## 8. UC-IP-005 — persistence round-trip preserves authored placement

**Actor:** author.

**Related requirements:** REQ-IP-001, REQ-IP-009.

### Preconditions

- ItemInstance has valid Location or Character placement;
- normal project persistence is available.

### Trigger

Project is saved and reopened through the existing repository boundary.

### Main flow

1. authored ItemInstance is persisted by the existing project persistence path;
2. project is loaded again;
3. the same ItemInstance id resolves;
4. its `placement` resolves to the same placement variant and target id;
5. Item inspector displays the resolved canonical target name.

### Result

The new UI exposes an already-persisted canonical field; it does not need a parallel editor-persistence channel.

### Stage 4 implication

If Impact Analysis finds that merely editing this existing field requires a schema version or migration, that is a **BLOCKER** requiring explicit explanation before implementation.

---

## 9. UC-IP-006 — multiple Canvas references share one canonical placement

**Actor:** author.

**Related requirements:** REQ-IP-001, REQ-IP-004, REQ-IP-007.

### Preconditions

- one canonical ItemInstance exists;
- Story Canvas contains two visual references to that same ItemInstance;
- placement is Unplaced.

### Trigger

Author inspects visual reference A and sets Location X.

### Main flow

1. visual reference A resolves canonical ItemInstance id;
2. canonical placement changes to Location X;
3. visual reference A inspector shows Location X;
4. author selects visual reference B;
5. visual reference B resolves the same ItemInstance id;
6. inspector also shows Location X.

### Result

There is one placement because there is one canonical ItemInstance.

### Must not happen

- each Canvas node receives an independent placement;
- selection of reference B resets placement;
- duplicate canvas visuals create duplicate ItemInstances.

---

## 10. UC-IP-007 — removing a Canvas reference does not alter placement

**Actor:** author.

**Related requirements:** REQ-IP-007, REQ-IP-008.

### Preconditions

- one ItemInstance has two Canvas references;
- canonical placement is Character A.

### Trigger

Author selects one concrete Canvas reference and presses the existing **Remove from board** action.

### Main flow

1. selected CanvasNodeInstance is removed;
2. canonical ItemInstance remains in `project.itemInstances`;
3. ItemInstance placement remains Character A;
4. the second Canvas reference still resolves the same canonical item and placement.

### Alternative — last Canvas reference removed

If the last visual reference is removed:

- canonical ItemInstance still exists;
- placement still exists;
- no automatic Unplaced mutation occurs.

### Result

Canvas lifecycle remains independent of authored physical placement.

---

## 11. UC-IP-008 — invalid Location target is rejected atomically

**Actor:** author / stale UI race.

**Related requirements:** REQ-IP-003, REQ-IP-005, REQ-IP-010.

### Preconditions

- ItemInstance exists with placement Unplaced;
- UI had previously observed Location X;
- before commit, Location X is no longer present in the canonical project.

### Trigger

A placement mutation attempts to commit Location X.

### Main flow

1. command/reducer validation re-checks current canonical project;
2. Location X does not exist;
3. mutation is rejected;
4. ItemInstance placement remains Unplaced;
5. no authored history entry is added;
6. no partial object containing dangling Location X is written.

### Character variant

The same behavior applies when a missing Character target is requested.

### Result

Validation happens at the canonical mutation boundary, not only in the UI selector.

---

## 12. UC-IP-009 — runtime override exists while authored placement is edited

**Actor:** author.

**Related requirements:** REQ-IP-005, REQ-IP-006.

### Preconditions

- authored ItemInstance placement is Location A;
- runtime projection currently has an item placement override for this instance;
- runtime override may represent another Location, Character, pockets or container;
- Simulation Playhead is recorded.

### Trigger

Author changes authored initial placement to Location B.

### Main flow

1. authored command updates only `ItemInstance.placement`;
2. runtime override record remains byte-for-byte/logically unchanged;
3. Simulation Playhead remains unchanged;
4. no runtime Move/Outcome is executed;
5. authored inspector reports Location B as authored placement.

### Important interpretation

This scenario does **not** require the runtime-effective current placement to become Location B immediately.

The authored value and the runtime overlay are separate projections.

### Result

The invariant is executable:

`Authored Item Placement != Runtime Item Placement`.

---

## 13. UC-IP-010 — imported/stale placement target remains inspectable and repairable

**Actor:** author opening an imperfect imported/legacy project.

**Related requirements:** REQ-IP-003, REQ-IP-004, REQ-IP-009.

### Preconditions

A loaded ItemInstance contains:

`{type:'location', locationId:'missing-location'}`

but no current canonical Location with that id exists.

Stage 1 does not claim that the current repository intentionally creates this state; it defines safe UI behavior if such a state is encountered.

### Main flow

1. ItemInstance remains inspectable;
2. inspector does not crash;
3. inspector does not fabricate a replacement Location;
4. inspector identifies the current authored placement as unresolved/missing;
5. simply rendering the inspector does not mutate project state;
6. author can deliberately repair it by:
   - selecting an existing Location;
   - selecting an existing Character;
   - selecting Unplaced;
7. a successful repair uses the same normal authored placement mutation.

### Result

Read-time recovery is non-destructive; repair is explicit authoring.

### Must not happen

- silently choose the first Location;
- silently set Unplaced on render;
- reinterpret Canvas position as replacement placement.

---

## 14. UC-IP-011 — repeated submission of the same placement is a no-op

**Actor:** author.

**Related requirements:** REQ-IP-005, REQ-IP-010.

### Preconditions

- ItemInstance placement already equals Location A.

### Trigger

The UI submits Location A again.

### Main flow

1. mutation boundary resolves current ItemInstance;
2. requested placement is semantically equal to current placement;
3. project remains unchanged;
4. no new authored Undo entry is created;
5. runtime and editor state remain unchanged.

### Result

Placement editing is idempotent for identical values.

### Stage 2 implication

The next model/contract stages need a pure placement-equality rule or equivalent deterministic comparison.

---

## 15. UC-IP-012 — ItemDefinition identity does not acquire instance placement

**Actor:** author.

**Related requirements:** REQ-IP-001, UX-IP-001.

### Preconditions

- ItemDefinition "Key" has ItemInstance K1 and K2;
- K1 is Location A;
- K2 is with Character B.

### Main flow

1. author inspects K1 and sees Location A;
2. author inspects K2 and sees Character B;
3. changing K1 to Unplaced changes only K1;
4. K2 remains with Character B;
5. ItemDefinition "Key" remains shared descriptive type data only.

### Result

The UI preserves:

`ItemDefinition != ItemInstance`.

---

## 16. UI behavior derived from scenarios

Stage 1 chooses behavior, not final CSS.

The first inspector interaction must provide:

1. a readable **Current authored placement** summary;
2. an explicit placement kind choice:
   - Unplaced;
   - Location;
   - Character;
3. a canonical target selector only when Location or Character is selected;
4. target labels from current project names;
5. safe unresolved display when a stored target id cannot resolve.

### Commit semantics

A Location/Character placement is committed only when a valid target is selected.

Changing the placement-kind control alone must not create an invalid half-placement.

Acceptable Stage 5/6 designs include:

- draft form state + Apply;
- direct commit only after target selection.

The final interaction pattern is deferred, but partial canonical placement is forbidden.

---

## 17. Empty-state scenarios

### No Locations exist

Location placement cannot be successfully committed.

UI may disable the Location target path or explain that no Locations exist.

It must still allow:

- Unplaced;
- Character, if Characters exist.

### No Characters exist

Symmetric behavior applies.

### Neither target type exists

Unplaced remains valid.

The editor does not require creating a fake Location/Character to satisfy placement.

---

## 18. Scenarios intentionally NOT added

These are outside current requirements:

- drag Item card onto a Location card to change world placement;
- WORLD/TIME item markers;
- runtime pickup/drop UI;
- pockets authoring;
- packing into containers;
- item transfer animation;
- multi-select placement;
- bulk placement;
- spawn/despawn dates;
- location hierarchy placement;
- per-canvas placement;
- AI-suggested placement;
- automatic placement inferred from a Story event;
- Project Search back-reference redesign.

They require separate requirements and impact analysis.

## 19. Requirement coverage

| Requirement | Use Cases | Coverage |
|---|---|---|
| REQ-IP-001 canonical owner remains ItemInstance | UC-001,002,006,012 | ✅ |
| REQ-IP-002 three existing authored variants | UC-001,002,003 | ✅ |
| REQ-IP-003 canonical target validation | UC-001,002,008,010 | ✅ |
| REQ-IP-004 readable inspector placement | UC-001,002,003,006,010,012 | ✅ |
| REQ-IP-005 typed authoring history | UC-001,002,003,004,008,009,011 | ✅ |
| REQ-IP-006 runtime separation | UC-001,002,003,004,009 | ✅ |
| REQ-IP-007 duplicate canvas refs share placement | UC-006,007 | ✅ |
| REQ-IP-008 remove canvas != unplace | UC-007 | ✅ |
| REQ-IP-009 persistence round-trip | UC-005,010 | ✅ |
| REQ-IP-010 deterministic no-op | UC-008,011 | ✅ |

No Stage 0 functional requirement is left without scenario coverage.

## 20. New design findings produced by Stage 1

### FINDING-IP-001 — editing belongs to existing concrete Item inspection

The strongest minimum journey does not justify a new workspace or global Item focus.

Story Item inspector is sufficient for the first slice.

### FINDING-IP-002 — placement mutation needs canonical target validation

UI filtering alone is insufficient because a target may disappear between render and commit.

The canonical command/reducer boundary must validate references.

### FINDING-IP-003 — placement edit must replace the whole discriminated variant

Location → Character cannot be modeled as independent nullable location/character fields.

The existing `ItemPlacement` union is the correct domain shape.

### FINDING-IP-004 — stale read and invalid write are different cases

A stale imported placement must be readable without crashing or auto-mutating.

A new write to a missing target must be rejected.

Therefore Stage 2 must model/describe:

- stored authored placement;
- target resolution state;
- validated placement mutation.

### FINDING-IP-005 — runtime-effective placement is not the inspector's authored value

UC-IP-009 proves the first inspector control edits authored initial state even when runtime currently overrides it.

The UI must not silently present runtime placement as if it were authored placement.

### FINDING-IP-006 — same-value placement should not create history noise

UC-IP-011 requires semantic equality and a true no-op.

### FINDING-IP-007 — create-time placement is not needed for minimum completeness

The existing Unplaced default provides a safe creation state.

One edit contract can be designed first and later reused by richer creation UX.

## 21. Stage 1 decisions

### DEC-IP-001 — first editing surface

**Existing Story Item inspector.**

No new workspace.

### DEC-IP-002 — supported placement variants

Exactly the existing authored variants:

- Unplaced;
- Location;
- Character.

### DEC-IP-003 — create-time placement

Deferred.

New instances may continue to default to Unplaced.

### DEC-IP-004 — target validation

Location/Character targets must exist at canonical mutation time.

Invalid writes are rejected atomically.

### DEC-IP-005 — stale stored target behavior

Inspector remains safe and shows unresolved placement.

No automatic repair on render.

### DEC-IP-006 — authoring history

Meaningful placement changes are Undo/Redo authoring operations.

Same-value submissions are no-op and create no history entry.

### DEC-IP-007 — runtime separation

Placement editor writes authored `ItemInstance.placement` only.

It never writes runtime placement overrides.

### DEC-IP-008 — Canvas neutrality

Canvas references only select/project the canonical ItemInstance.

Adding/removing/moving Canvas nodes does not change physical authored placement.

## 22. Traceability update

| ID | Requirement | Use Case | Domain Owner | Architecture | Component | Detailed Design | Code | Test | Status |
|---|---|---|---|---|---|---|---|---|---|
| REQ-IP-001 | ItemInstance canonical owner | UC-001/002/006/012 | ItemInstance | Stage 2 pending | Story inspector | — | — | Stage 9 | ✅ UC covered |
| REQ-IP-002 | existing three variants | UC-001/002/003 | ItemPlacement | Stage 2 pending | Story inspector | — | — | Stage 9 | ✅ UC covered |
| REQ-IP-003 | target validation | UC-001/002/008/010 | Project references | command/reducer | Story inspector | — | — | Stage 9 | ✅ UC covered |
| REQ-IP-004 | readable placement | UC-001/002/003/006/010/012 | ItemInstance + resolver | presentation projection | Story inspector | — | — | Stage 9 | ✅ UC covered |
| REQ-IP-005 | Undo/Redo | UC-001/002/003/004/008/009/011 | authored history | command/reducer | Story inspector | — | — | Stage 9 | ✅ UC covered |
| REQ-IP-006 | runtime separation | UC-001/002/003/004/009 | runtime overlay | authored/runtime boundary | Story inspector | — | — | Stage 9 | ✅ UC covered |
| REQ-IP-007 | duplicate Canvas refs | UC-006/007 | ItemInstance | Canvas projection | StoryWorkspace | — | — | Stage 9 | ✅ UC covered |
| REQ-IP-008 | remove Canvas != unplace | UC-007 | CanvasNodeInstance | editor projection | StoryWorkspace | — | — | Stage 9 | ✅ UC covered |
| REQ-IP-009 | persistence | UC-005/010 | ItemInstance | repository | Story inspector | — | — | Stage 9 | ✅ UC covered |
| REQ-IP-010 | deterministic no-op | UC-008/011 | ItemPlacement equality | reducer/history | Story inspector | — | — | Stage 9 | ✅ UC covered |

## 23. Gate Review — Stage 1 → Stage 2 Domain Model

### Traceability checks

✅ Every Stage 0 functional requirement has scenario coverage.

✅ Every Use Case maps to existing requirements.

✅ Main flow, alternative flow, invalid target, stale read, empty target set and repeated-action cases are covered.

✅ Undo/Redo and persistence are explicit.

✅ Multiple Canvas references are explicitly separated from canonical placement.

✅ Runtime override separation is explicit.

### Scope checks

✅ No new placement variants were introduced.

✅ No runtime inventory feature was introduced.

✅ No new top-level workspace was introduced.

✅ Create-time placement was deliberately deferred.

✅ Project Search and WORLD/TIME redesign are not prerequisites.

### Architecture findings requiring Stage 2 modeling

Stage 2 must define the smallest model vocabulary for:

1. canonical `ItemPlacement` as stored authored state;
2. resolved placement presentation:
   - Unplaced;
   - resolved Location;
   - resolved Character;
   - unresolved Location;
   - unresolved Character;
3. placement semantic equality;
4. validated mutation result/no-op semantics.

It must **not** introduce a second persisted placement model merely to support UI drafts.

### Gate decision

**✅ PASS to Stage 2 Domain Model.**

No Stage 1 BLOCKER exists.

Production implementation remains prohibited until the later design/impact/contracts gates pass.

## 24. Next concrete stage — do not skip

**Stage 2: Domain Model for Authored Item Placement editing.**

At minimum it must answer:

1. What is the exact canonical aggregate boundary for placement mutation?
2. How is current placement resolved for inspector display without changing persisted shape?
3. How are unresolved Location/Character references represented at the application/presentation boundary?
4. What constitutes semantic equality for ItemPlacement?
5. What validation result is returned for:
   - missing ItemInstance;
   - missing Location;
   - missing Character;
   - same-value placement;
   - successful change?
6. Which concepts are domain state versus transient form state?
7. How does the model prove that runtime placement overlay is not an input/output of this authoring mutation?

Only after the Stage 2 Gate may architecture/component ownership be refined.
