# 93 Days — A67-D3 Schedule Exception Authoring · Stage 4 Impact Analysis

Status: **STAGE 4 COMPLETE — PASS to Component Design**
Base: `93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`
Depends on A67-D3 Stage 0–3 documents.
Date: **2026-10-03**
Production code in this slice: **none**

## 1. Purpose

Freeze the implementation blast radius for A67-D3 before Component Design.

Protocol:

`REQ → Use Cases → Domain Model → Verified Architecture → Impact → Component → Contract → Dynamic Flow → Detailed Design → Implementation → Tests`

Stage 3 proved that the feature can stay inside the existing authored schedule path.

Stage 4 therefore decides:

- exact production files allowed to change;
- what must remain unchanged;
- which existing behavior is reused;
- what is deliberately deferred;
- test-only impact;
- rollback boundary.

No production implementation begins here.

## 2. Executive impact decision

A67-D3 first slice is an **authored editor feature only**.

Approved production impact is limited to:

1. one narrow Schedule Exception authoring core module;
2. the existing authored command router;
3. one focused Schedule Exception UI subcomponent;
4. the existing WORLD/TIME schedule authoring container that composes it;
5. optionally existing shared editor CSS only if Stage 5 proves current generic classes insufficient.

Everything else defaults to **no production change**.

In particular:

- no schema;
- no migration;
- no persisted domain field;
- no runtime state;
- no Playhead logic;
- no Actual Presence logic;
- no schedule-analysis algorithm;
- no Project Search production change;
- no Story Brain navigation change;
- no WORLD/TIME timeline/index change;
- no Player/compiler/export change;
- no AuthorFocus expansion.

## 3. Change boundary

### Must change

- add typed Schedule Exception authored CRUD commands;
- resolve/normalize raw Schedule Exception data for safe authoring display;
- validate strict new-write/update Candidates;
- implement semantic equality including legacy/modern window equivalence;
- preserve exact project identity for rejected/same-value requests;
- add/update/remove canonical `project.scheduleExceptions`;
- expose a separate Schedule Exceptions section in the existing WORLD/TIME schedule authoring surface;
- keep create/edit form state local until Apply;
- support safe stale/conflicting imported record display and explicit repair/remove;
- add focused regression evidence.

### Must not change

- `ScheduleException` persisted field set;
- `NarrativeProject` schema;
- schema version;
- migrations;
- RoutineRule recurrence semantics;
- BehaviorProfile requirements for RoutineRule;
- Simulation Playhead;
- `simulation.actualLocationByCharacter`;
- runtime history/projection behavior;
- schedule ambiguity semantics;
- Player behavior;
- compiler/export artifact shape;
- timeline exception visualization;
- Project Search navigation semantics;
- Story Brain navigation semantics;
- A67-D1 AuthorFocus.

## 4. Decision — shared schedule primitive extraction

### Decision

**Do not refactor existing RoutineRule validation into a shared production abstraction in A67-D3.**

D3 may reuse the same primitive concepts, but its authoring core will own the narrow checks it needs.

### Why

Stage 3 proved that RoutineRule validation and Schedule Exception Candidate validation are not behaviorally identical:

RoutineRule validation includes:

- BehaviorProfile;
- recurrence;
- weaker exact-window structural checks.

Schedule Exception Candidate validation requires:

- no BehaviorProfile;
- no recurrence;
- strict positive effective exact interval;
- semantic equality;
- legacy-modern normalization;
- Location/Absent repair semantics.

Extracting current private helpers and changing RoutineRule to consume them would mix:

- a new feature;
- a refactor of an already-working path;
- potential Routine behavior changes.

That violates the small-reviewable-change objective.

### Allowed reuse

The D3 module may implement narrow pure helpers equivalent to:

- day in project bounds;
- minute in 0..1439;
- period exists;
- effective exact `endDayOffset`;
- normalized optional reason.

### Deferred cleanup

A later dedicated schedule-core refactor may consolidate repeated readers/validators after both Routine and Exception authoring are stable.

## 5. Exact production file P1 — new Schedule Exception authoring core

Approved new file:

`src/store/narrative-project/schedule-exception-authoring.ts`

### Responsibilities

This module owns the D3 authored boundary:

- `ScheduleExceptionAuthoringCommand` type;
- command type guard if needed;
- raw read-side resolver;
- legacy-modern time-window normalization;
- Character reference resolution;
- Location/Absent/conflicting intent resolution;
- Candidate validation;
- reason normalization;
- semantic equality;
- add/update/remove authored application.

### Required behavior

#### Add

- duplicate id → exact project no-op;
- invalid Candidate → exact project no-op;
- valid Candidate → append one modern canonical ScheduleException.

#### Update

- missing id → exact project no-op;
- invalid Candidate → exact project no-op;
- semantically equal → exact project no-op;
- meaningful valid update → replace exactly one exception.

#### Remove

- missing id → exact project no-op;
- existing id → remove exactly one exception;
- removal does not require the stored record to be otherwise valid.

### Write semantics

New/meaningfully edited canonical writes:

- use `timeWindow`;
- do not write new top-level legacy `periodId`;
- choose either Location or Absent;
- normalize reason;
- keep same exception id on update.

### Must not read/write

- Runtime Playhead;
- Actual Presence;
- runtime occurrence/history;
- RoutineRule collection as a mutation target;
- editor viewport;
- AuthorFocus.

### Risk

**Medium.**

Why: semantic equality and exact project identity determine Undo history correctness.

## 6. Exact production file P2 — existing authored command router

Approved modification:

`src/store/narrative-project/routine-authoring.ts`

### Responsibilities

Only integration/routing changes are approved:

- import Schedule Exception command/core;
- include `ScheduleExceptionAuthoringCommand` in `NarrativeAuthoringCommand`;
- recognize Schedule Exception commands;
- route them through the existing authored history boundary.

### Required invariant

If Schedule Exception core returns exact current project:

- return exact current history state;
- do not add Undo;
- do not clear Redo.

### Not approved here

- changing RoutineRule validation behavior;
- changing RoutineRule update no-op semantics;
- refactoring all schedule validation primitives;
- changing unrelated Story/Move authoring.

### Risk

**Medium-low** if routing remains narrow.

## 7. Exact production file P3 — new focused UI subcomponent

Approved new file:

`src/components/narrative/workspace/schedule-exception-authoring-panel.tsx`

### Why a new component

Stage 3 verified that `RoutineAuthoringPanel` is already substantial.

Putting full exception CRUD directly into that component would increase coupling between two different authored concepts.

The new subcomponent preserves:

- same WORLD/TIME schedule authoring surface;
- independent draft semantics;
- reviewable implementation.

### Responsibilities

- list existing Schedule Exceptions;
- render resolved/unresolved Character;
- render period/exact/legacy window summary;
- render Location/Absent/conflicting/unspecified intent;
- render priority/reason;
- local create draft;
- local edit draft;
- Apply;
- Cancel;
- Remove;
- explicit repair of stale/conflicting records;
- accessible labels/messages.

### Required UX semantics

- no canonical mutation before Apply;
- Remove may operate on stale/conflicting stored records;
- equal-priority ambiguity is not blocked here;
- no local implementation of Story Brain conflict resolution;
- no hidden priority default;
- new writes use modern time-window shape.

### Risk

**Medium** because imported-data handling and draft/canonical synchronization must be correct.

## 8. Exact production file P4 — existing schedule authoring container

Approved modification:

`src/components/narrative/workspace/routine-authoring-panel.tsx`

### Allowed change

Compose the new Schedule Exception authoring section into the existing WORLD/TIME schedule authoring surface.

Prefer a small composition change such as rendering the focused subcomponent after/beside the recurring rules section.

### Optional tiny reuse

Presentation-only helpers may be moved or duplicated only if Stage 5 proves it keeps the component clearer.

### Not approved

- merging RoutineRule and ScheduleException into one draft;
- changing RoutineRule domain semantics;
- turning the component into a global schedule state owner.

### Risk

**Low** if kept to composition.

## 9. Conditional production file C1 — existing workspace CSS

Conditionally approved only if needed:

`src/components/narrative/workspace/narrative-workspace.css`

or the already-used adjacent workspace stylesheet that owns the reused classes.

### Rule

Prefer existing:

- compact form;
- move list/card;
- inspection actions;
- alert/small text;
- field grouping.

A CSS change is allowed only for a small layout/accessibility gap that cannot be expressed cleanly with current classes.

### Not approved

- a new visual system;
- timeline styling;
- schedule conflict visualization.

## 10. Production files explicitly frozen out

### Domain/schema

No production changes to:

- `src/domain/narrative/schedule.ts`;
- `src/domain/narrative/project.ts`;
- `src/domain/narrative/project-factory.ts`;
- template schema;
- schema-version owner;
- migrations.

Reason:

Existing ScheduleException shape is sufficient.

### Runtime/history/provider

No production changes to:

- `src/store/narrative-project/runtime-history.ts`;
- `src/store/narrative-project/runtime-snapshot.ts`;
- `src/store/narrative-project/narrative-project-context.tsx`.

Reason:

Existing runtime-preserving Undo/Redo architecture already satisfies D3.

### Persistence

No production changes to:

- `src/store/narrative-project/persistence-projection.ts`;
- `src/store/narrative-project/repository.ts`;
- recoverable repository.

Reason:

Schedule Exceptions are already authored projection data and legacy load is already supported.

### Analysis/search/navigation

No production changes to:

- `src/domain/narrative/schedule-analysis.ts`;
- `src/application/narrative/project-search.ts`;
- `src/application/narrative/story-brain-diagnostic-navigation.ts`;
- `src/application/narrative/authoring-navigation.ts`.

Reason:

They already derive from canonical Schedule Exceptions.

Project Search exact-window centering remains explicitly deferred.

### WORLD/TIME timeline

No production changes to:

- `src/components/narrative/workspace/world-time-indexes.ts`;
- `src/components/narrative/workspace/world-time-workspace.tsx`.

Reason:

First slice is list/form authoring, not exception timeline visualization.

### Other systems

No production changes to:

- Player;
- compiler/export;
- Story runtime;
- relationships;
- memory;
- body;
- item placement;
- Project Search UI architecture;
- A67-D1 AuthorFocus;
- AI.

## 11. Persistence impact

### Schema change

**NO.**

### Migration

**NO.**

### Persistence envelope change

**NO.**

### Existing authored path

`authored.scheduleExceptions`

continues to hold canonical authored exception records.

### Existing runtime path

Simulation remains independently persisted in runtime projection.

### Required evidence

A focused test must prove:

1. authored Schedule Exception survives save/reopen;
2. runtime Simulation Playhead/Actual Presence survive independently;
3. a legacy `periodId` exception can still load;
4. a meaningful edit writes modern `timeWindow`.

No persistence production change is pre-approved.

## 12. Undo/Redo impact

### Reused owner

Existing `NarrativeProjectHistoryState` and NarrativeProjectContext behavior.

### Meaningful operations

- add;
- changed update;
- remove.

Each should create exactly one authored history entry.

### No-op operations

- duplicate add id;
- missing update id;
- missing remove id;
- invalid Character;
- invalid Location;
- invalid range;
- missing period;
- invalid exact window;
- invalid/non-finite priority;
- semantically equal update.

These must preserve exact history identity.

### Undo/Redo runtime rule

Undo/Redo restores authored `scheduleExceptions` while current runtime projection remains current through existing `keepCurrentRuntime`.

No runtime-history production change.

## 13. Project Search impact

### Production

**No change.**

### Expected derived behavior

Because Search index is rebuilt from canonical project:

- add → searchable;
- update → changed title/detail/aliases reflected;
- remove → no document.

### Explicit non-goal

Current Search navigation to Schedule Exception uses `fromDay` midnight rather than exact exception window.

Stage 4 decision:

> **Defer exact-window Project Search centering.**

Why:

- not required for CRUD authorability;
- current diagnostic navigation already supplies precise conflict navigation;
- changing Search navigation would widen D3 into navigation polish.

A future focused navigation patch may address it.

## 14. Diagnostics impact

### Production

**No change.**

### Expected derived behavior

After authored CRUD:

- different priority overlaps remain valid;
- equal maximum-priority overlaps produce existing warning;
- removed records disappear from analysis;
- no mutation is blocked by warning severity.

### Test-only impact

Focused tests may call existing analysis after authored commands to prove integration.

## 15. RoutineRule impact

### Production behavior

RoutineRule semantics remain unchanged.

### Required regression

D3 CRUD must not mutate:

`project.routineRules`.

### Explicit decision

Do not change RoutineRule validator or current Routine update behavior in this slice.

This avoids combining feature delivery with unrelated schedule-authoring cleanup.

## 16. UI placement impact

### Existing parent surface

WORLD/TIME remains the top-level workspace.

### Existing composition

`NarrativeWorkspace` already renders `RoutineAuthoringPanel` whenever WORLD/TIME is visible.

### Stage 4 decision

**Do not modify `narrative-workspace.tsx` for D3.**

The new exception editor is composed inside the existing schedule authoring panel.

Why:

- preserves current workspace mounting;
- avoids another top-level panel owner;
- keeps Stage 1 "same schedule authoring surface" decision literal.

## 17. Test impact — frozen allowed files

### T1 — new core/store test

Approved new file:

`src/store/narrative-project/__tests__/schedule-exception-authoring.test.ts`

Cover:

- add Location;
- add Absent;
- modern period write;
- exact/cross-midnight;
- one-day/bounded/open-ended ranges;
- duplicate id no-op;
- missing Character;
- missing Location;
- invalid range;
- missing period;
- invalid priority;
- invalid effective exact interval;
- changed update;
- same-value modern no-op;
- legacy-period vs modern-period semantic no-op;
- inferred vs explicit exact offset semantic no-op;
- meaningful legacy edit modernizes;
- stale/conflicting remove;
- RoutineRule isolation;
- Undo/Redo.

### T2 — runtime history regression

Approved modification:

`src/store/narrative-project/__tests__/runtime-history.test.ts`

Cover:

- authored exception change;
- runtime then advances/changes Actual Presence;
- Undo/Redo authored exception;
- current Playhead and Actual Presence remain preserved.

### T3 — focused persistence regression

Approved new file:

`src/store/narrative-project/__tests__/schedule-exception-authoring-persistence.test.ts`

Cover:

- authored exception save/reopen;
- runtime projection independent;
- modern write preserved;
- legacy load remains readable.

### T4 — UI integration

Approved new file:

`src/components/narrative/workspace/__tests__/schedule-exception-authoring.integration.test.tsx`

Cover:

- section appears in WORLD/TIME;
- create;
- edit;
- Cancel;
- remove;
- Location/Absent modes;
- explicit priority;
- reason;
- stale Character;
- stale Location;
- conflicting imported intent;
- legacy period display/edit;
- no render-time mutation.

### T5 — Project Search regression

Approved test-only modification:

`src/application/narrative/__tests__/project-search.test.ts`

Cover only derived CRUD reflection if needed.

Do **not** change current exact-time navigation expectation in D3.

### T6 — schedule diagnostic regression

Approved test-only modification:

`src/domain/narrative/__tests__/schedule-exception-analysis.test.ts`

Cover authored-command-produced records if useful:

- different priorities → no ambiguity;
- equal max → warning.

No production analysis change.

## 18. Requirement → impact matrix

| Requirement | Production owner | Production change | Test owner | Risk |
|---|---|---|---|---|
| REQ-SE-001 canonical owner | Schedule Exception core | mutate existing collection only | T1 | Medium |
| REQ-SE-002 typed CRUD/history | core + routine router | yes | T1/T2 | Medium |
| REQ-SE-003 Character validation | core | yes | T1/T4 | Medium |
| REQ-SE-004 day range | core | yes | T1/T4 | Medium |
| REQ-SE-005 modern timeWindow | core | yes | T1/T3/T4 | Medium |
| REQ-SE-006 Location/Absent | core + UI | yes | T1/T4 | Medium |
| REQ-SE-007 priority | core + UI | yes | T1/T6 | Medium |
| REQ-SE-008 reason | core + UI | yes | T1/T4 | Low |
| REQ-SE-009 runtime separation | existing history/runtime | no runtime prod change | T2/T3 | High conceptual / Low code |
| REQ-SE-010 diagnostics | existing analysis | no | T6 | Low |
| REQ-SE-011 Search | existing derived index | no | T5 | Low |
| REQ-SE-012 persistence | existing projection/repository | no | T3 | Low |
| REQ-SE-013 semantic no-op | core + existing history | yes in core | T1 | High correctness |

## 19. Risk analysis

### RISK-SE-01 — semantic no-op creates Undo noise

Cause:

Serializing a normalized modern object before comparing semantic meaning.

Example:

legacy `periodId: 'day'`
vs modern
`timeWindow: {type:'period', periodId:'day'}`.

Mitigation:

Compare normalized semantics before any touched/new project creation.

Priority: **P0**.

### RISK-SE-02 — imported stale data becomes impossible to remove

Cause:

Using update Candidate validity as remove validity.

Mitigation:

Remove validates id existence only.

Priority: **P0**.

### RISK-SE-03 — authoring mutates live simulation

Cause:

Routing Schedule Exception through runtime/simulation code.

Mitigation:

Core accepts NarrativeProject authored fields only; tests assert Playhead/Actual Presence identity/value preservation.

Priority: **P0**.

### RISK-SE-04 — Routine semantics regress during "reuse"

Cause:

Refactoring current Routine validation to fit D3.

Mitigation:

No Routine validator refactor in this slice.

Priority: **P1**.

### RISK-SE-05 — warning becomes hidden validation rule

Cause:

Form precomputes ambiguity and disables Apply.

Mitigation:

Structural validation excludes ambiguity analysis.

Priority: **P1**.

### RISK-SE-06 — render-time migration

Cause:

Loading legacy/stale record into local form triggers execute/save.

Mitigation:

Resolver is pure; canonical mutation only from explicit Apply/Remove.

Priority: **P1**.

### RISK-SE-07 — component becomes coupled to RoutineRule

Cause:

One shared draft/state machine for Routine and Exception.

Mitigation:

Focused ScheduleException subcomponent with independent local state.

Priority: **P1**.

### RISK-SE-08 — timeline scope creep

Cause:

Trying to visualize exception priority/location while adding CRUD.

Mitigation:

Timeline files frozen out.

Priority: **P1**.

### RISK-SE-09 — Search scope creep

Cause:

Fixing precise Search centering while touching exception authoring.

Mitigation:

Current navigation limitation documented and deferred.

Priority: **P2**.

## 20. Rollback boundary

Rollback is intentionally narrow.

Because D3 adds no schema/migration/runtime format:

a failed implementation can be reverted by removing/reverting:

- new `schedule-exception-authoring.ts`;
- Schedule Exception command integration in `routine-authoring.ts`;
- new Schedule Exception UI subcomponent;
- composition line in `routine-authoring-panel.tsx`;
- optional small CSS change;
- associated tests.

Persisted projects remain compatible because:

- old ScheduleException shape is unchanged;
- legacy `periodId` remains readable;
- no new discriminant is required by persistence;
- runtime projection is unchanged.

## 21. Implementation dependency order

After Stages 5–8 approve exact design:

1. implement/test pure Schedule Exception authoring core;
2. wire typed commands into existing authoring router;
3. verify exact no-op/history behavior;
4. add focused UI subcomponent;
5. compose into existing Routine authoring surface;
6. add UI integration tests;
7. add runtime-history regression evidence;
8. add persistence regression evidence;
9. add Search/diagnostic derived evidence if not already covered;
10. full Stage 9 verification.

Do not start with UI before core/contracts are fixed.

## 22. Stage 4 decisions

### DEC-SE-013 — production scope

Approve only the narrow authoring core/router/UI surface.

### DEC-SE-014 — validation reuse

Do not refactor RoutineRule validation.

D3 owns narrow strict Candidate validation.

### DEC-SE-015 — UI component boundary

Create a focused Schedule Exception subcomponent under existing WORLD/TIME schedule authoring surface.

### DEC-SE-016 — workspace composition

Do not modify `narrative-workspace.tsx`.

Compose inside `RoutineAuthoringPanel`.

### DEC-SE-017 — schema/persistence

No schema, migration, persistence production changes.

### DEC-SE-018 — runtime

No runtime/history/context production changes.

### DEC-SE-019 — diagnostics

No schedule-analysis/Story Brain production changes.

### DEC-SE-020 — Search

No Project Search production change.

Precise exception-window Search centering deferred.

### DEC-SE-021 — timeline

No Schedule Exception timeline visualization in D3 first slice.

### DEC-SE-022 — RoutineRule

No RoutineRule behavior change/refactor.

### DEC-SE-023 — rollback

Feature is removable without data migration or runtime rollback logic.

## 23. Files impact summary

### Expected production modifications

1. **new** `src/store/narrative-project/schedule-exception-authoring.ts`
2. `src/store/narrative-project/routine-authoring.ts`
3. **new** `src/components/narrative/workspace/schedule-exception-authoring-panel.tsx`
4. `src/components/narrative/workspace/routine-authoring-panel.tsx`
5. **conditional only** existing workspace CSS if Stage 5 proves necessary

### Expected test modifications/additions

1. **new** `src/store/narrative-project/__tests__/schedule-exception-authoring.test.ts`
2. extend `src/store/narrative-project/__tests__/runtime-history.test.ts`
3. **new** `src/store/narrative-project/__tests__/schedule-exception-authoring-persistence.test.ts`
4. **new** `src/components/narrative/workspace/__tests__/schedule-exception-authoring.integration.test.tsx`
5. test-only extension of `src/application/narrative/__tests__/project-search.test.ts`
6. test-only extension of `src/domain/narrative/__tests__/schedule-exception-analysis.test.ts`

### Production files forbidden without reopening Stage 4

Any production change outside the approved P1–P4/C1 set requires an explicit Stage 4 amendment before implementation.

That includes especially:

- domain schedule/project types;
- schema/migrations;
- persistence;
- runtime-history/context;
- schedule-analysis;
- Search/navigation;
- timeline/indexes;
- Player/compiler.

## 24. Gate Review — Stage 4 → Stage 5 Component Design

### Impact checks

✅ Exact production blast radius frozen.

✅ Test-only blast radius identified.

✅ Schema impact = none.

✅ Migration impact = none.

✅ Runtime production impact = none.

✅ Persistence production impact = none.

✅ Search production impact = none.

✅ Diagnostic production impact = none.

✅ Timeline production impact = none.

✅ RoutineRule refactor explicitly excluded.

✅ UI component extraction decision made.

✅ Project Search exact-window centering explicitly deferred.

✅ Rollback is narrow and data-compatible.

### Gate decision

**✅ PASS to Stage 5 Component Design.**

No Stage 4 blocker exists.

Production implementation remains prohibited until Stages 5–8 fix component ownership, contracts, dynamic flow and detailed design.

## 25. Next concrete stage — do not skip

**Stage 5: Component Design.**

It must define:

1. public responsibilities/exports of `schedule-exception-authoring.ts`;
2. exact command routing integration in `routine-authoring.ts`;
3. resolved read-model shape used by UI;
4. Draft ownership and synchronization rules;
5. create vs edit state transitions;
6. legacy/stale/conflicting rendering;
7. Apply/Cancel/Remove responsibilities;
8. how the new subcomponent is composed into `RoutineAuthoringPanel`;
9. accessible labels/messages;
10. exact test seams.

Only after Stage 5 passes may Stage 6 freeze TypeScript contracts.
