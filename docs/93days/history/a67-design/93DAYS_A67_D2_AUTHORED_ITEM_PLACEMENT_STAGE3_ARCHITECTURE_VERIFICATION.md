# 93 Days — A67-D2 Authored Item Placement · Stage 3 Existing Architecture Verification

Status: **STAGE 3 COMPLETE — Gate to Impact Analysis**
Base: 93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36
Depends on:
- 93DAYS_A67_D2_AUTHORED_ITEM_PLACEMENT_STAGE0.md
- 93DAYS_A67_D2_AUTHORED_ITEM_PLACEMENT_STAGE1_USE_CASES.md
- 93DAYS_A67_D2_AUTHORED_ITEM_PLACEMENT_STAGE2_DOMAIN_MODEL.md
Date: **2026-10-01**
Production code in this slice: **none**

## 1. Stage 3 purpose

Stage 2 defined the desired model:

- NarrativeProject remains aggregate root;
- ItemInstance remains the authored entity;
- ItemPlacement remains the canonical persisted Value Object;
- resolved/unresolved placement is read-side only;
- meaningful authored placement changes use authoring history;
- runtime placement overlay is not itself mutated by authored placement editing.

Stage 3 verifies those assumptions against the actual stable architecture before Impact Analysis.

This document does not approve production implementation.

## 2. Verification baseline

Verified branch base:

93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36

Verified design head before this document:

b9455ff2e9583b618ee8fb75b7e98772e54b4ff0

Relevant existing owners inspected:

- src/application/narrative/commands.ts
- src/store/narrative-project/reducer.ts
- src/store/narrative-project/routine-authoring.ts
- src/store/narrative-project/editor-authoring.ts
- src/store/narrative-project/narrative-project-context.tsx
- src/store/narrative-project/runtime-history.ts
- src/store/narrative-project/repository.ts
- src/store/narrative-project/persistence-projection.ts
- src/store/narrative-project/runtime-snapshot.ts
- src/components/narrative/workspace/story-workspace.tsx
- src/domain/narrative/items.ts
- src/domain/narrative/carrying.ts
- src/application/narrative/player-item-placement.ts
- current authored/runtime persistence and item-placement tests.

## 3. Existing command routing

### FACT-ARCH-IP-001 — Item creation already belongs to NarrativeProjectCommand

NarrativeProjectCommand currently owns item/addDefinition and item/addInstance, and item/addInstance already accepts optional ItemPlacement.

Therefore item instance authored state is already routed through the base canonical Narrative Project authoring path.

### FACT-ARCH-IP-002 — UI execute boundary is already broad enough

NarrativeProjectContextValue.execute accepts EditorAuthoringCommand.

EditorAuthoringCommand includes:
- NarrativeAuthoringCommand;
- CanonicalEntityAuthoringCommand;
- BulkStoryAuthoringCommand.

NarrativeAuthoringCommand includes NarrativeProjectCommand.

Existing flow for an ordinary NarrativeProjectCommand is:

StoryWorkspace
-> useNarrativeProject().execute(command)
-> editorAuthoringReducer
-> narrativeProjectAuthoringReducer
-> narrativeProjectHistoryReducer
-> applyNarrativeProjectCommand

### Architecture implication

A67-D2 does not need:
- a new command bus;
- a new React provider;
- a new global store;
- a runtime service for authored placement.

Stage 4 should treat the existing authored command path as the default owner.

## 4. Undo/Redo and no-op semantics are already suitable

### FACT-ARCH-IP-003 — base history reducer uses reference identity for no-op

After applying a NarrativeProjectCommand the reducer checks whether nextProject === state.present.

If equal, it returns the same history state.

Therefore returning the exact same NarrativeProject object means:
- no new past entry;
- no future reset;
- no authored history noise.

### FACT-ARCH-IP-004 — editorAuthoringReducer preserves no-op identity

For commands that are not Bulk or CanonicalEntityAuthoringCommand, editorAuthoringReducer delegates through narrativeProjectAuthoringReducer to narrativeProjectHistoryReducer.

Same-object no-op behavior therefore survives the entire execute path.

### FACT-ARCH-IP-005 — meaningful authored mutations enter history

A changed project appends the previous present to past, replaces present and clears future.

This matches Stage 1 Undo/Redo requirements.

### Impact consequence

Placement mutation implementation must check:
1. missing item;
2. missing target;
3. semantic same-value;

before calling touched(...).

Calling touched for a same-value placement would create a new object and unwanted authoring history.

## 5. Runtime preservation across Undo/Redo is explicit

### FACT-ARCH-IP-006 — runtime has a separate projection-preservation boundary

runtime-history.ts defines:
- projectNarrativeRuntimeOntoAuthoring;
- replaceRuntimeProjectInHistory;
- keepCurrentRuntime.

Runtime fields copied from the current runtime source include:
- memories;
- relationships;
- pending reactions;
- mind states;
- injuries;
- itemPlacementOverrides;
- Story runtime states/occurrences;
- active Story executions;
- simulation.

### FACT-ARCH-IP-007 — authored Undo/Redo keeps current runtime

NarrativeProjectContext wraps Undo/Redo and applies keepCurrentRuntime(restored.present, current.present).

Therefore authored placement Undo/Redo can restore an older ItemInstance.placement while preserving current itemPlacementOverrides and Simulation Playhead.

This supports the Stage 1 boundary, subject to the sparse-runtime caveat in section 12.

## 6. Current validation helpers

### FACT-ARCH-IP-008 — reducer already has canonical reference checks

The base reducer has a private hasCharacter(project, id) helper and many validators use direct canonical collection lookup.

No verified exported universal Location/Character reference validator is required for A67-D2.

### Architecture implication

A67-D2 does not need a generic universal EntityReference framework.

Likely later choices:
- narrow pure placement-validation helper near the placement command owner; or
- reuse existing private lookup style and add a Location lookup.

Stage 5/6 should prefer the narrowest contract.

## 7. Existing item/addInstance validation is insufficient for the new edit contract

### FACT-ARCH-IP-009

Current item/addInstance validates that the ItemDefinition exists.

If valid, it writes placement: command.placement ?? unplaced.

It does not currently validate that an optional Location id or Character id exists.

### Consequence

The new authored placement-edit path must not assume current addInstance validation is sufficient.

Stage 1 explicitly requires canonical target validation at mutation time.

### Scope decision for Impact Analysis

A67-D2 must decide whether to:
A. add strict validation only to the new existing-instance placement command; or
B. also harden create-time item/addInstance when optional placement is supplied.

Because create-time placement UI is deferred, changing existing addInstance semantics is not automatically required for the first slice.

It enters Stage 4 as an explicit compatibility decision.

## 8. Story Item inspector has sufficient canonical context

### FACT-ARCH-IP-010

StoryWorkspace already receives current project and execute through useNarrativeProject.

It already derives:
- charactersById;
- itemDefinitionsById;
- itemInstancesById;
- inspectedItem;
- inspectedItemDefinition.

The component also already accesses project.locations for Story placement UI.

### Architecture implication

The Item inspector can:
- resolve current ItemInstance;
- resolve Location/Character labels;
- show unresolved target state;
- execute authored placement command;

without adding a second data owner.

### FACT-ARCH-IP-011 — Item selection remains local

D1 intentionally kept Item inspection local instead of adding Item to shared AuthorFocus.

A67-D2 does not require changing that decision.

Placement editing can operate from selectedLocalItemId -> ItemInstance.

## 9. Persistence projection already classifies ItemInstance placement as authored

### FACT-ARCH-IP-012

NarrativeProjectAuthoredProjection omits schemaVersion, runtime projection keys and editor projection keys.

itemInstances is not a runtime or editor key.

Therefore ItemInstances, including placement, remain in authored persistence.

### FACT-ARCH-IP-013

itemPlacementOverrides is explicitly a RuntimeProjectionKey.

Physical persistence already separates:

authored.itemInstances[].placement

from:

runtime.itemPlacementOverrides

### FACT-ARCH-IP-014 — repository hydration preserves ItemInstances

Current repository hydration preserves saved.itemInstances when it is an array.

No new persistence field is needed.

### Important limitation

Hydration does not prove referential integrity of every stored ItemPlacement target.

This is compatible with Stage 1 unresolved-read behavior.

## 10. No schema migration is indicated

### FACT-ARCH-IP-015

Current schema already persists ItemInstance placement.

Changing an existing placement value introduces no new schema member.

### Stage 4 expectation

Default impact conclusion should be:
- schema version unchanged;
- no migration;
- no new persistence envelope field.

If later implementation appears to require a schema change, Impact Analysis must reopen.

## 11. Existing runtime code treats authored placement as baseline

### FACT-ARCH-IP-016

effectiveItemPlacement currently behaves as:

override for this item, if present;
otherwise ItemInstance.placement.

### FACT-ARCH-IP-017

Carrying/container evaluation calls effectiveItemPlacement.

Player placement actions write itemPlacementOverrides, not ItemInstance.placement.

### FACT-ARCH-IP-018

Player item-placement tests establish authored placements and then mutate runtime overrides.

No hard immutability assumption was found for authored ItemInstance placement.

## 12. Architecture tension discovered: sparse runtime overlay

This is the most important Stage 3 finding.

Stage 0/1 require authored placement editing not to mutate runtime placement state.

Existing runtime effective placement is:

runtime override if present;
otherwise current authored ItemInstance.placement.

### Case A — runtime override exists

Changing authored ItemInstance.placement:
- does not mutate the override;
- does not change effective runtime placement;
- does not move Simulation Playhead.

This matches UC-IP-009 exactly.

### Case B — no runtime override exists

Runtime-effective placement falls back to authored placement.

Therefore changing authored ItemInstance.placement can change what runtime code sees as effective placement without writing an override.

### Why this matters

Both statements are true:
1. authored placement mutation does not mutate itemPlacementOverrides;
2. runtime-effective placement may still change when no override exists.

They must not be conflated.

### ARCH-OPEN-IP-001 — Stage 4 mandatory decision

Impact Analysis must define which guarantee A67-D2 requires.

#### Option 1 — overlay-record isolation only

Guarantee:
- authored edit never writes runtime override records;
- Simulation Playhead remains unchanged;
- if runtime has no override, effective placement follows newly authored baseline.

This preserves the current sparse-overlay architecture with minimal impact.

#### Option 2 — active runtime-effective placement isolation

Guarantee:
- an already-active runtime/playtest keeps exactly the same effective placement even when authored baseline changes.

Current sparse fallback cannot guarantee this unless runtime placement is materialized/pinned independently for affected items or sessions.

That widens impact into runtime architecture and requires explicit justification.

### Stage 3 decision

Do not choose between Option 1 and Option 2 here.

Stage 4 Impact Analysis owns the blast-radius decision.

Production implementation remains blocked until this is resolved.

## 13. Existing tests that provide evidence

### TEST-EVIDENCE-IP-001 — authored instance creation

src/store/narrative-project/__tests__/authoring.test.ts already verifies:
- new ItemInstance defaults to Unplaced;
- create command can persist a Location placement value.

It does not test existing-instance placement editing.

### TEST-EVIDENCE-IP-002 — runtime vs authoring history

src/store/narrative-project/__tests__/runtime-history.test.ts already verifies:
- runtime replacement does not create authored Undo;
- redo history survives runtime replacement;
- authored Undo can preserve current runtime projection.

A67-D2 should extend this boundary specifically for Item placement.

### TEST-EVIDENCE-IP-003 — physical runtime persistence

src/store/narrative-project/__tests__/physical-runtime-persistence.test.ts includes authored Location and Character ItemInstance placements plus runtime itemPlacementOverrides.

It explicitly verifies runtime override persistence separation.

A67-D2 still needs a focused assertion that authored ItemInstance placement round-trips unchanged.

### TEST-EVIDENCE-IP-004 — player runtime item placement

src/application/narrative/__tests__/player-item-placement.test.ts verifies:
- authored ItemInstance placement acts as initial/baseline state;
- runtime packing/unpacking writes itemPlacementOverrides;
- invalid runtime placement operations reject atomically.

This is regression evidence, not a substitute for authored command tests.

### TEST-EVIDENCE-IP-005 — persistence projection

src/store/narrative-project/__tests__/persistence-projection.test.ts verifies authored/editor/runtime physical separation.

It does not currently assert ItemInstance placement specifically.

## 14. Missing test coverage identified

Stage 9 must cover:
1. Unplaced -> Location;
2. Location -> Character;
3. Character -> Unplaced;
4. missing ItemInstance no-op;
5. missing Location no-op;
6. missing Character no-op;
7. same-value no-op returns same history state and adds no Undo;
8. meaningful change creates one Undo entry;
9. Undo/Redo changes authored placement while preserving runtime override and Simulation Playhead;
10. authored ItemInstance placement persistence round-trip;
11. stale stored target resolves safely for UI;
12. duplicate Canvas references display one canonical placement;
13. removing Canvas reference does not change placement;
14. active runtime effective-placement behavior selected by Stage 4.

## 15. Existing architecture reuse matrix

| Need | Existing owner | Reuse |
|---|---|---|
| canonical ItemInstance state | NarrativeProject.itemInstances | yes |
| ItemPlacement union | domain/narrative/items.ts | yes |
| typed authored command entry | EditorAuthoringCommand / NarrativeProjectCommand | yes |
| mutation application | applyNarrativeProjectCommand | likely |
| history no-op | project reference identity | yes |
| Undo/Redo | narrative project history + context | yes |
| runtime preservation across Undo | keepCurrentRuntime | yes |
| Story inspector project access | useNarrativeProject | yes |
| Item local inspection | selectedLocalItemId | yes |
| persistence authored projection | persistence-projection.ts | yes |
| runtime overlay | itemPlacementOverrides | preserve / do not write |
| effective runtime placement | effectiveItemPlacement | Stage 4 decision |
| placement read resolver | none verified | small helper likely |
| existing-instance placement command | none | new typed command required |
| target validation | private/direct collection lookups | narrow reuse/style |

## 16. Files currently NOT justified for modification

The first slice does not inherently require changes to:
- src/domain/narrative/items.ts persisted shape;
- src/domain/narrative/project.ts schema;
- schema version;
- migrations;
- Project Search;
- WORLD/TIME;
- A67-D1 AuthorFocus;
- Canvas domain model;
- compiler/export;
- Player;
- AI.

Conditional exception:

Runtime files may enter the impact set only if Stage 4 chooses active runtime-effective placement isolation Option 2.

## 17. Likely first-slice impact candidates

Pending Stage 4 confirmation:

### Application/command
- src/application/narrative/commands.ts
  - typed command for existing ItemInstance placement.

### Store/reducer
- src/store/narrative-project/reducer.ts
  - validate ItemInstance + target;
  - semantic equality no-op;
  - replace complete ItemPlacement;
  - touch only on change.

### Read-side helper
Possible narrow owner under application/narrative for:
- placement equality;
- resolved/unresolved authored placement projection.

Stage 4/5 chooses exact location.

### UI
- src/components/narrative/workspace/story-workspace.tsx
  - show current authored placement;
  - transient choice;
  - execute command.

### Tests
- reducer/history;
- read resolver;
- Story workspace integration;
- persistence/runtime separation.

## 18. Architecture anti-patterns ruled out

Do not:
- edit ItemInstance directly in React local state as canonical source;
- write placement into CanvasNodeInstance;
- add Item to AuthorFocus solely for this feature;
- mutate itemPlacementOverrides from authored inspector;
- route through player item placement;
- use runtime applyItemRuntimePlacement for authoring;
- add a second persisted placement field;
- create a new Item workspace;
- silently repair stale placement during hydration;
- create history entries for same-value/invalid writes.

## 19. Stage 2 open questions answered

### Q1 — where are typed item commands routed?
Ordinary item commands are NarrativeProjectCommand values routed through existing authoring/history reducers.

### Q2 — does same-object reducer no-op avoid history?
Yes.

### Q3 — reusable target existence checks?
Existing private/direct canonical lookup patterns are sufficient; no global framework needed.

### Q4 — does Story inspector have enough context?
Yes.

### Q5 — does persistence already round-trip placement shape?
Architecture says yes: ItemInstances are authored projection data and hydration preserves them. A focused regression test is still required.

### Q6 — does runtime assume authored placement never changes?
No hard immutability assumption was found. Runtime uses current ItemInstance placement as fallback when no override exists, creating the sparse-overlay impact question.

### Q7 — what existing tests cover the boundary?
Authoring, runtime-history, physical-runtime-persistence, persistence-projection and player-item-placement provide partial evidence.

## 20. Traceability update

| Requirement | Use Cases | Domain Model | Verified architecture owner | Status |
|---|---|---|---|---|
| REQ-IP-001 canonical ItemInstance owner | UC-001/002/006/012 | ENTITY-IP-001 | NarrativeProject.itemInstances | verified |
| REQ-IP-002 three variants | UC-001/002/003 | VO-IP-001 | items.ts | verified |
| REQ-IP-003 target validation | UC-001/002/008/010 | SERVICE-IP-002 | reducer has project context | feasible |
| REQ-IP-004 readable placement | UC-001/002/003/006/010/012 | VO-IP-002/SERVICE-IP-001 | StoryWorkspace project context | feasible |
| REQ-IP-005 Undo/Redo | UC-004/008/011 | aggregate transition | history reducers/context | verified |
| REQ-IP-006 runtime separation | UC-001/004/009 | separate overlay | runtime-history + carrying | impact decision required |
| REQ-IP-007 duplicate Canvas refs | UC-006/007 | canonical ItemInstance id | Story Canvas entityRef | verified |
| REQ-IP-008 remove Canvas != unplace | UC-007 | Canvas outside placement | editor/removeCanvasNode | verified |
| REQ-IP-009 persistence | UC-005/010 | existing field | authored persistence projection | verified |
| REQ-IP-010 no-op | UC-008/011 | equality rule | same-project identity history behavior | verified |

## 21. Stage 3 findings

### FINDING-IP-014 — existing authoring command/history path is sufficient
No new state-management architecture is needed.

### FINDING-IP-015 — same-object return is the key no-op contract
Invalid or unchanged placement requests must preserve project identity.

### FINDING-IP-016 — persistence already has the correct physical split
Authored ItemInstance placement and runtime itemPlacementOverrides already live in separate persisted projections.

### FINDING-IP-017 — current addInstance path does not enforce target integrity
The new edit path needs stronger validation than the existing optional create placement currently provides.

### FINDING-IP-018 — Story Item inspector is the correct composition point
No new Item focus or workspace is required.

### FINDING-IP-019 — sparse runtime fallback is the only material architecture tension
effectiveItemPlacement = override ?? authored placement.

Stage 4 must resolve the required runtime isolation semantics.

## 22. Gate Review — Stage 3 -> Stage 4 Impact Analysis

### Verified

- Existing typed command path can host the feature.
- Existing reducer has canonical project context for validation.
- Existing same-object no-op prevents Undo history noise.
- Existing Undo/Redo can preserve runtime projection.
- Existing Story inspector has necessary canonical access.
- ItemInstance placement is already authored persistence data.
- itemPlacementOverrides is already separate runtime persistence data.
- No schema or migration is inherently required.
- Canvas remains a projection.

### Mandatory Stage 4 issue

ARCH-OPEN-IP-001: sparse runtime overlay semantics.

Impact Analysis must decide whether the feature promises:
- overlay-record isolation only; or
- full active runtime-effective placement isolation.

This controls whether runtime files remain untouched or enter impact scope.

### Gate decision

**PASS to Stage 4 Impact Analysis, with one mandatory impact decision.**

There is no reason to stop design progress, but production implementation remains prohibited until ARCH-OPEN-IP-001 is resolved and the exact blast radius is approved.

## 23. Next concrete stage — do not skip

Stage 4: Impact Analysis for Authored Item Placement.

It must produce:
1. exact files/modules expected to change;
2. exact files/modules expected not to change;
3. resolution of ARCH-OPEN-IP-001;
4. schema/migration impact yes/no with evidence;
5. persistence impact;
6. Undo/Redo impact;
7. runtime/playtest impact;
8. compiler/export/Player impact;
9. UI and test impact;
10. rollback surface;
11. compatibility decision for existing item/addInstance optional placement validation;
12. final implementation go/no-go gate.

No component design or production code should begin before Stage 4 passes.
