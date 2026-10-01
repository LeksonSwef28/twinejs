# 93 Days — A67-D2 Authored Item Placement · Stage 4 Impact Analysis

Status: **STAGE 4 COMPLETE — PASS to Component Design**
Base: `93-days-editor@f130156c156b6b691cff0f33a6075967619bfb36`
Depends on Stage 0–3 Authored Item Placement documents.
Date: **2026-10-01**
Production code in this slice: **none**

## 1. Purpose

Map the approved Authored Item Placement requirements through the verified existing architecture to the exact expected blast radius before Component Design.

Protocol chain:

`REQ → Use Case → Domain Model → Verified Architecture → Impact → Component → Contract → Detailed Design → Implementation → Tests`

This stage resolves the only material architecture question discovered by Stage 3:

`effectiveItemPlacement = runtime override ?? authored ItemInstance.placement`

It also decides whether the existing create-time `item/addInstance(placement?)` path changes in this slice.

---

## 2. Change boundary

### Must change

- add one typed authored command for changing an existing `ItemInstance.placement`;
- validate ItemInstance existence;
- validate Location / Character target existence on placement edits;
- preserve same-project identity for invalid or same-value requests;
- expose a pure authored-placement read projection for resolved/unresolved display;
- render and edit placement in the existing Story Item inspector;
- add feature-specific reducer/history/UI/persistence boundary tests.

### Must not change

- persisted `ItemPlacement` shape;
- `NarrativeProject` schema;
- schema version;
- migrations;
- runtime placement override model;
- runtime history projection;
- runtime snapshot format;
- Simulation Playhead;
- Player item placement;
- compiler/export;
- Canvas ownership;
- A67-D1 AuthorFocus kinds;
- WORLD/TIME;
- Project Search;
- AI.

### Deferred

- create-time placement UI;
- stricter validation of existing `item/addInstance(placement?)`;
- pockets/container authoring;
- full active-playtest effective-placement freezing;
- generic entity-reference framework;
- Item global Author Focus;
- dedicated Item workspace.

---

## 3. Resolution of ARCH-OPEN-IP-001 — sparse runtime overlay

### Decision

**Choose Option 1: overlay-record isolation only.**

The A67-D2 guarantee is:

1. authored placement edits write only `ItemInstance.placement`;
2. they do not create, delete or mutate `itemPlacementOverrides`;
3. they do not change Simulation Playhead;
4. they do not execute Player/runtime placement actions;
5. existing runtime overrides continue to win when present;
6. when no runtime override exists, the existing runtime architecture continues to derive effective placement from the current authored baseline.

### Why this is the correct first-slice boundary

Stage 0 explicitly requires:

- `ItemInstance.placement` as the canonical authored owner;
- runtime placement overrides remain unchanged;
- Simulation Playhead remains unchanged;
- changing `itemPlacementOverrides` is out of scope.

The existing runtime model is intentionally sparse:

```ts
effectiveItemPlacement(instance, overrides)
  = overrides[instance.id] ?? instance.placement
```

Materializing runtime placement for every item merely to freeze an active runtime view would:

- introduce a new runtime-session synchronization policy;
- change semantics of sparse overrides;
- expand runtime persistence behavior;
- require new lifecycle rules for when authoring edits are copied into or excluded from active runtime;
- turn this authoring feature into a runtime architecture change.

None of that is required to make authored placement editable.

### Precise semantic statement

`Authored Item Placement != Runtime Item Placement` means:

- authored canonical state and runtime override state are distinct owners;
- authored editing does not mutate runtime override records.

It does **not** mean:

- every derived runtime-effective value must be frozen against all authored edits when no runtime override exists.

### Accepted behavior

If no override exists:

- runtime-effective placement follows the edited authored baseline because that is already the system's fallback rule.

If an override exists:

- runtime-effective placement remains the override.

### Future boundary

If a future Playtest UX requires "active session state must remain fully frozen while authoring changes underneath", that is a separate runtime-session requirement and must receive its own architecture entry gate.

---

## 4. Compatibility decision — existing item/addInstance(placement?)

### Decision

**Do not change existing `item/addInstance` validation semantics in A67-D2 first slice.**

### Reason

Stage 1 deliberately deferred create-time placement.

Current visible Story creation creates ItemInstances without placement, which safely defaults to Unplaced.

Hardening the optional create-time placement field would:

- change an existing command's compatibility behavior;
- affect callers outside the new Item inspector flow;
- widen tests and potentially migration/import assumptions;
- provide no required UI capability for this slice.

### New edit command behavior

The new existing-instance placement command will be strict:

- missing ItemInstance → no-op;
- missing Location → no-op;
- missing Character → no-op;
- same semantic placement → no-op;
- valid changed placement → authored mutation.

### Follow-up

A later hardening slice may reuse the same validation policy for `item/addInstance(placement?)`, but only after explicit impact analysis.

---

## 5. Exact production files expected to change

### P1 — `src/application/narrative/commands.ts`

**Required change**

Add one NarrativeProjectCommand variant equivalent to:

```ts
{
  type: 'item/setPlacement';
  id: string;
  placement: ItemPlacement;
}
```

Exact naming is finalized in Contracts stage.

**Why here**

- existing item creation already lives here;
- ordinary authored project commands already route through history correctly;
- no new command family is needed.

**Risk:** Low.

---

### P2 — `src/store/narrative-project/reducer.ts`

**Required change**

Handle the new placement command.

Required ordering:

1. resolve ItemInstance;
2. validate requested Location/Character target;
3. compare semantic placement equality;
4. if invalid/unchanged, return the exact same `project`;
5. if changed, replace the whole placement union value;
6. call `touched` only for real changes.

**Must not touch**

- `itemPlacementOverrides`;
- `simulation`;
- editor state;
- Canvas nodes.

**Risk:** Medium because reducer identity controls authoring history.

---

### P3 — new narrow read/helper module

Preferred provisional path:

`src/application/narrative/authored-item-placement.ts`

Expected responsibilities:

- semantic `ItemPlacement` equality;
- resolve stored authored placement into:
  - Unplaced;
  - resolved Location;
  - unresolved Location;
  - resolved Character;
  - unresolved Character;
- optional narrow validation helper if Component Design proves reducer reuse is cleaner.

**Must be pure.**

**Must not read**

- runtime override;
- Simulation Playhead;
- Canvas geometry;
- Author Focus.

**Risk:** Low.

Alternative file placement may be selected in Stage 5 if ownership is clearer, but the responsibility itself is required.

---

### P4 — `src/components/narrative/workspace/story-workspace.tsx`

**Required change**

Extend existing ItemInstance inspector to:

- display current authored placement;
- explicitly choose:
  - Unplaced;
  - Location;
  - Character;
- select canonical Location/Character targets;
- show unresolved target state safely;
- execute the new typed authored command;
- keep Canvas "Remove from board" behavior independent.

**Must remain local**

- Item selection;
- transient placement-form draft, if needed;
- concrete Canvas selection.

**Must not**

- add Item to shared AuthorFocus;
- infer world placement from Canvas position;
- read runtime effective placement as the authored form value.

**Risk:** Medium due to inspector state and duplicate Canvas references.

---

## 6. Production files conditionally expected to change

### C1 — `src/components/narrative/workspace/narrative-workspace.css`

Only if the existing generic inspector/select styling is insufficient.

Prefer reusing existing:

- button styles;
- select styles;
- inspection layout.

Do not create a new visual system solely for this form.

**Risk:** Low.

### No other conditional runtime file is approved

Because Stage 4 selected overlay-record isolation, no runtime production file enters the implementation blast radius.

---

## 7. Exact production files expected NOT to change

### Domain/schema

- `src/domain/narrative/items.ts`
- `src/domain/narrative/project.ts`
- `src/domain/narrative/project-factory.ts`
- schema-version owner
- migration modules

Reason:

Existing `ItemPlacement` already models every canonical state.

### Persistence

- `src/store/narrative-project/persistence-projection.ts`
- `src/store/narrative-project/repository.ts`
- recoverable repository logic

Reason:

`itemInstances` already belongs to authored persistence.

### Runtime

- `src/store/narrative-project/runtime-history.ts`
- `src/store/narrative-project/runtime-snapshot.ts`
- `src/domain/narrative/carrying.ts`
- runtime outcome/effect placement owners

Reason:

Authored edit does not modify runtime override records or runtime algorithms.

### Player/compiler

- `src/application/narrative/player-item-placement.ts`
- `src/application/narrative/player-runtime.ts`
- `src/application/narrative/export-compiler.ts`
- Player host

Reason:

No runtime command or artifact shape changes.

### Other editor surfaces

- Project Search;
- WORLD/TIME;
- Cross Workspace Navigator;
- A67-D1 Author Focus provider/navigation;
- NarrativeWorkspace composition.

Reason:

First-slice editing surface is already Story Item inspector.

---

## 8. Persistence impact

### Schema impact

**NO.**

### Migration impact

**NO.**

### Persistence envelope impact

**NO.**

### Stored authored data

Existing:

```text
authored.itemInstances[].placement
```

continues to store the value.

### Stored runtime data

Existing:

```text
runtime.itemPlacementOverrides
```

remains untouched by the authored command.

### Required verification

Add a focused persistence test proving that an authored placement changed by the new command survives save/reopen while a runtime override remains independently persisted.

---

## 9. Undo/Redo impact

### Existing owner reused

`NarrativeProjectHistoryState` and existing reducers.

### Required behavior

Meaningful placement edit:

- adds exactly one authored history entry;
- clears redo like normal authored change.

Invalid or same-value request:

- returns same project/state identity;
- adds no history entry;
- preserves redo history.

Undo/Redo:

- restores authored ItemInstance placement;
- preserves current runtime projection through existing `keepCurrentRuntime`.

### No history infrastructure change

No changes to:

- history shape;
- Undo/Redo API;
- context API.

---

## 10. Runtime/playtest impact

### Stored runtime state

**No mutation.**

### Simulation Playhead

**No mutation.**

### Runtime override records

**No mutation.**

### Derived effective placement

Approved behavior:

- override present → override remains effective;
- override absent → effective placement follows current authored placement.

This is an existing derivation, not a runtime write.

### Test obligation

Tests must explicitly distinguish:

1. stored runtime override isolation;
2. derived effective fallback behavior.

A test that only checks `itemPlacementOverrides` is not sufficient documentation of the chosen semantics.

---

## 11. Compiler/export/Player impact

### Production code

**No change expected.**

### Why

A runtime artifact compiled after authored editing should naturally contain the updated authored ItemInstance placement because authored projection already contains ItemInstances.

Existing compiler/runtime behavior then uses that authored baseline normally.

### Regression tests

Current Player item placement and runtime compilation tests must remain green.

No new artifact version.

---

## 12. Canvas impact

### Canonical rule

`Canvas Instance != Canonical Entity`.

### Expected behavior

Two Canvas nodes referencing the same ItemInstance:

- display one canonical authored placement;
- editing from either reference changes the same ItemInstance;
- no Canvas node gets its own placement.

Removing a Canvas reference:

- removes only the visual reference;
- does not mutate ItemInstance placement.

### Production Canvas model change

**No.**

---

## 13. Author Focus impact

### Decision

**No change.**

Item remains local Story inspection for this slice.

Do not add:

```ts
{type: 'item'; id: string}
```

to shared AuthorFocus merely to support placement editing.

That would reopen D1 session/navigation scope without need.

---

## 14. Test impact — expected files

### T1 — new helper unit test

Provisional:

`src/application/narrative/__tests__/authored-item-placement.test.ts`

Cover:

- semantic equality;
- resolved Location;
- unresolved Location;
- resolved Character;
- unresolved Character;
- Unplaced.

### T2 — store authoring/reducer test

Preferred either:

- extend `src/store/narrative-project/__tests__/authoring.test.ts`; or
- create a focused `authored-item-placement.test.ts` beside store tests.

Cover:

- all three meaningful transitions;
- missing item;
- missing Location;
- missing Character;
- same-value reference-identity no-op;
- one history entry on change;
- Undo/Redo.

Component Design should prefer a focused new test if extending generic authoring.test would make it harder to review.

### T3 — runtime-history boundary test

Extend:

`src/store/narrative-project/__tests__/runtime-history.test.ts`

Cover:

- authored placement Undo/Redo;
- current runtime override remains unchanged;
- Playhead remains unchanged.

### T4 — persistence test

Extend one of:

- `persistence-projection.test.ts`;
- `physical-runtime-persistence.test.ts`.

Cover authored placement and runtime override in separate persisted projections.

### T5 — Story Item inspector integration

Prefer a focused component integration test under:

`src/components/narrative/workspace/__tests__/`

Cover:

- visible authored placement;
- edit to Location/Character/Unplaced;
- unresolved target rendering;
- duplicate Canvas references;
- Remove from board does not alter placement.

### T6 — sparse-overlay semantic test

Existing `carrying.test.ts` may already cover fallback generally.

A67-D2 must add or extend a focused assertion proving:

- without override, effective placement follows changed authored baseline;
- with override, override still wins.

This may be a pure domain test without production carrying changes.

---

## 15. Requirement → impact matrix

| Requirement | Architecture owner | Production impact | Test impact | Risk |
|---|---|---|---|---|
| REQ-IP-001 canonical ItemInstance owner | NarrativeProject.itemInstances | reducer + inspector | store + UI | Medium |
| REQ-IP-002 three variants | existing ItemPlacement | no domain change | helper/store/UI | Low |
| REQ-IP-003 target validation | reducer project context | reducer | store invalid-target tests | Medium |
| REQ-IP-004 readable placement | Story inspector + read resolver | helper + StoryWorkspace | helper/UI | Medium |
| REQ-IP-005 Undo/Redo | existing history | reducer behavior only | history tests | Medium |
| REQ-IP-006 runtime separation | sparse runtime overlay | no runtime prod change | runtime boundary + fallback tests | High conceptual / Low code |
| REQ-IP-007 duplicate Canvas refs | canonical entityRef | StoryWorkspace only | UI integration | Medium |
| REQ-IP-008 remove Canvas != unplace | editor/removeCanvasNode | no Canvas model change | UI integration | Low |
| REQ-IP-009 persistence | existing authored projection | no persistence prod change | persistence test | Low |
| REQ-IP-010 deterministic no-op | identity-based history | reducer | store identity/history | Medium |

---

## 16. Risk analysis

### RISK-IP-001 — accidental history noise

Cause:

Calling `touched` before equality/validation.

Mitigation:

Invalid/unchanged paths return exact original project.

Priority: **P0**.

### RISK-IP-002 — runtime/editor conflation

Cause:

Using `effectiveItemPlacement` or `itemPlacementOverrides` to populate authored form.

Mitigation:

Authored resolver accepts canonical ItemPlacement only.

Priority: **P0**.

### RISK-IP-003 — stale target crashes UI

Cause:

Direct non-null lookup of missing Location/Character.

Mitigation:

Resolved/unresolved read projection.

Priority: **P1**.

### RISK-IP-004 — half-valid form writes

Cause:

Committing Location/Character kind before target chosen.

Mitigation:

Transient form state remains local; command only emits complete ItemPlacement.

Priority: **P1**.

### RISK-IP-005 — duplicate Canvas divergence

Cause:

Storing form state per Canvas node as canonical state.

Mitigation:

Every commit targets ItemInstance id.

Priority: **P1**.

### RISK-IP-006 — scope creep into runtime freeze

Cause:

Interpreting authored/runtime separation as requiring full active-session materialization.

Mitigation:

Stage 4 explicitly selects overlay-record isolation.

Priority: **P1**.

### RISK-IP-007 — accidental breaking change to addInstance

Cause:

Reusing new strict validation by silently tightening old optional creation semantics.

Mitigation:

A67-D2 explicitly leaves `item/addInstance` unchanged.

Priority: **P1**.

---

## 17. Rollback surface

Because no schema/migration/runtime format changes are planned, rollback is narrow.

A failed implementation can be reverted by removing:

- new command variant;
- reducer case;
- new pure helper;
- Item inspector controls;
- associated tests/styles.

Persisted projects remain compatible because:

- no new stored field;
- no changed discriminant;
- no migration;
- no artifact version change.

This is a strong reason to keep runtime materialization out of this slice.

---

## 18. Implementation dependency order

After later design gates approve:

1. pure read/equality helper;
2. typed command;
3. reducer validation + mutation;
4. reducer/history tests;
5. Story inspector projection/form;
6. UI integration tests;
7. persistence/runtime-separation regression tests;
8. full Branch Check.

Do not start with UI before the mutation contract is fixed.

---

## 19. Impact decisions

### DEC-IP-009 — runtime isolation semantics

Choose **overlay-record isolation**.

No runtime production modification.

### DEC-IP-010 — existing addInstance compatibility

Leave existing optional create placement semantics unchanged.

### DEC-IP-011 — schema

No schema change.

### DEC-IP-012 — persistence

No persistence production change.

### DEC-IP-013 — runtime

No runtime production change.

### DEC-IP-014 — compiler/player

No compiler or Player production change.

### DEC-IP-015 — Author Focus

No AuthorFocus expansion.

### DEC-IP-016 — first editing surface

Only existing Story Item inspector.

### DEC-IP-017 — history

Use existing identity-based authoring history path.

---

## 20. Files impact summary

### Expected production modifications

1. `src/application/narrative/commands.ts`
2. `src/store/narrative-project/reducer.ts`
3. new `src/application/narrative/authored-item-placement.ts` or equivalent narrow pure helper
4. `src/components/narrative/workspace/story-workspace.tsx`
5. optionally `src/components/narrative/workspace/narrative-workspace.css` only if existing styles cannot express the form cleanly

### Expected test modifications/additions

- application helper tests;
- focused store authoring placement tests;
- runtime-history placement boundary test;
- persistence projection/physical persistence placement test;
- Story inspector integration;
- sparse runtime fallback regression.

### Explicit no-change production areas

- domain persisted model;
- schema/migrations;
- repository/persistence projection;
- runtime-history/snapshot;
- carrying/runtime placement;
- Player;
- compiler/export;
- Project Search;
- WORLD/TIME;
- AuthorFocus;
- AI.

---

## 21. Gate Review — Stage 4 → Stage 5 Component Design

### Impact completeness

✅ exact primary production files identified.

✅ exact excluded production areas identified.

✅ sparse runtime overlay semantics resolved.

✅ create-time command compatibility resolved.

✅ schema impact resolved: NO.

✅ migration impact resolved: NO.

✅ persistence production impact resolved: NO.

✅ runtime production impact resolved: NO.

✅ compiler/export/Player impact resolved: NO.

✅ Undo/Redo owner reused.

✅ rollback surface is narrow.

✅ test blast radius identified.

### Blocking questions

None.

### Gate decision

**✅ PASS to Stage 5 Component Design.**

Production implementation is still prohibited until Component Design, Contracts, Dynamic Flow and Detailed Design gates are complete.

---

## 22. Next concrete stage — do not skip

**Stage 5: Component Design for Authored Item Placement.**

It must define:

1. exact pure helper/component responsibilities;
2. exact Story inspector form ownership;
3. draft/commit interaction pattern;
4. how unresolved stored placement is displayed and repaired;
5. exact reducer/helper ownership split;
6. exact command/result responsibilities;
7. duplicate Canvas-reference behavior;
8. test seams;
9. whether any CSS change is actually needed.

Only after Stage 5 PASS may Contracts be defined.
