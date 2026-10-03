# 93 Days — A67-D3 Schedule Exception Authoring · Stage 0 / Architecture Entry Gate

Status: **STAGE 0 COMPLETE — Gate to Use Case Design**
Base: `93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`
Date: **2026-10-03**
Change type: **writer UX / authored schedule override editing**
Risk class: **MEDIUM**
Production code in this slice: **none**

## 0. Why this document exists

A67 World Authoring Pilot proved that a small coherent world can already be authored through visible editor UI and exposed several concrete writer-workflow gaps.

Two of those gaps are now closed on stable:

- A67-D1 Workspace Context / Contextual Authoring;
- A67-D2 Authored Item Placement.

The next evidence-backed gap is **Schedule Exception authoring**:

- `ScheduleException` already exists in the canonical authored domain;
- `NarrativeProject.scheduleExceptions` is already persisted authored data;
- Project Search already indexes Schedule Exceptions and can navigate to their WORLD/TIME moment;
- Story Brain schedule analysis already reports ambiguous equal-maximum-priority exceptions;
- diagnostic navigation already understands Schedule Exception owners;
- but the visible authoring UI exposes recurring `RoutineRule` authoring only;
- the typed authoring reducer has `routine/add|update|remove`, but no equivalent Schedule Exception mutation boundary.

This means an author can inspect/search/analyze exception data that already exists, but cannot create or edit it through the normal editor workflow.

This document performs only **Stage 0** from the traceable design protocol.

It does not add commands, forms, schema fields, migrations, runtime resolution changes or Player behavior.

## 1. Current project stage — what is already genuinely complete

### Proven foundations

- one canonical authored Narrative Project;
- `RoutineRule` and `ScheduleException` domain types;
- `NarrativeProject.routineRules` and `NarrativeProject.scheduleExceptions`;
- recurring schedule authoring in WORLD/TIME;
- typed authoring history with Undo/Redo;
- recoverable project persistence;
- Project Search indexing for Routine Rules and Schedule Exceptions;
- Story Brain schedule-overlap and Schedule Exception ambiguity diagnostics;
- navigation from Schedule Exception search/diagnostic context into WORLD/TIME;
- A67-D1 shared author focus/contextual navigation;
- A67-D2 canonical authored Item placement editing;
- exact post-merge stable Branch Check after A67-D2.

### What is not complete for the next modification

For **Schedule Exception authoring**, current stable does not yet provide:

- a typed add/update/remove command family for Schedule Exceptions;
- authoring validation for a newly submitted Schedule Exception;
- a visible form for creating or editing one;
- a visible list/selection owner for existing exceptions;
- explicit UX for priority and ambiguity;
- explicit behavior for absent vs target-location intent;
- explicit behavior for legacy `periodId` data;
- focused Undo/Redo and persistence tests for authored exception mutations;
- proof that editing schedule intent does not directly mutate Actual Presence or Simulation Playhead.

Therefore production implementation must not start before the design gates.

## 2. Existing code owners relevant to this slice

### Canonical domain owner

`src/domain/narrative/schedule.ts`

Current authored shape:

```ts
export interface ScheduleException {
  id: EntityId;
  characterId: EntityId;
  activeRange: DayRange;
  timeWindow?: RoutineTimeWindow;
  /** Legacy schema-v1 period selector. */
  periodId?: string;
  targetLocationId?: EntityId;
  absent?: boolean;
  priority: number;
  reason?: string;
}
```

The exception reuses the same `RoutineTimeWindow` shape as recurring schedule intent:

- period window;
- exact start/end minutes;
- optional cross-midnight `endDayOffset`.

### Canonical project owner

`src/domain/narrative/project.ts`

```ts
routineRules: RoutineRule[];
scheduleExceptions: ScheduleException[];
```

Schedule Exceptions are already part of the authored project aggregate.

### Existing authoring command owner

`src/store/narrative-project/routine-authoring.ts`

Current schedule authoring command family:

```ts
export type RoutineAuthoringCommand =
  | {type: 'routine/add'; rule: RoutineRule}
  | {type: 'routine/update'; rule: RoutineRule}
  | {type: 'routine/remove'; id: string};
```

There is currently no `ScheduleExceptionAuthoringCommand`.

The same file already owns reusable concepts needed by this slice:

- day validation;
- exact-minute validation;
- period validation;
- authored schedule target validation;
- authoring history integration.

Stage 3/4 must decide whether these helpers should be shared rather than duplicated.

### Existing WORLD/TIME authoring owner

`src/components/narrative/workspace/routine-authoring-panel.tsx`

The visible panel currently creates/edits/removes recurring `RoutineRule` values.

It does not expose `project.scheduleExceptions`.

### Existing WORLD/TIME projection owner

`src/components/narrative/workspace/world-time-workspace.tsx`

The workspace renders authored routine bands, Story markers and runtime Actual Presence.

Current location indexes in:

`src/components/narrative/workspace/world-time-indexes.ts`

index `RoutineRule`, Actual Presence and Story nodes, but not Schedule Exceptions.

That is evidence of a presentation gap, not yet proof that exception timeline rendering must enter the first implementation slice.

### Existing search owner

`src/application/narrative/project-search.ts`

Schedule Exceptions are already indexed as:

`schedule-exception`

Search resolves:

- Character reference;
- target Location reference when present;
- WORLD/TIME navigation center from the exception active range/window.

### Existing diagnostics owner

`src/domain/narrative/schedule-analysis.ts`

Current semantics already distinguish:

- routine overlap;
- `schedule-exception-ambiguity`.

For overlapping Schedule Exceptions, different priorities are valid overrides.

Only simultaneous exceptions tied at the **maximum active priority** produce ambiguity findings.

The analysis is read-only and does not choose a winner.

### Existing diagnostic navigation owner

`src/application/narrative/story-brain-diagnostic-navigation.ts`

A Schedule Exception diagnostic can navigate to WORLD/TIME centered on the exception's authored window while preserving the existing editor/runtime boundary.

### Persistence owner

`src/store/narrative-project/persistence-projection.ts`
`src/store/narrative-project/repository.ts`

`scheduleExceptions` already belong to the authored projection through the canonical project shape.

The initial architecture hypothesis is therefore **no schema field and no migration**.

Stage 4 must verify this before implementation.

## 3. AS-IS

### AS-IS-SE-01 — ScheduleException is already canonical authored data

The canonical owner is:

`NarrativeProject.scheduleExceptions[]`

It is not:

- editor-only state;
- Story Canvas geometry;
- runtime Actual Presence;
- a Player save-only overlay.

### AS-IS-SE-02 — exception semantics are character-scoped schedule intent

Each exception currently carries:

- one canonical Character id;
- one authored active day range;
- one authored time window;
- optional target Location;
- optional absence intent;
- numeric priority;
- optional reason.

There is no `routineRuleId` field.

Therefore current domain semantics do **not** model an exception as a child record owned by one particular RoutineRule.

Any proposal to add such a link is a domain change and is outside Stage 0 assumptions.

### AS-IS-SE-03 — priority already has diagnostic meaning

Current schedule analysis treats different-priority overlaps as valid authored overrides.

Ambiguity exists when two or more simultaneously active exceptions share the same maximum priority for one Character.

The diagnostic layer reports this as a warning.

It does not silently rewrite priority and does not choose an exception.

### AS-IS-SE-04 — time-window compatibility already exists

Schedule Exceptions reuse `RoutineTimeWindow`.

New authored schedule data should use `timeWindow`.

Legacy `periodId` remains readable for schema-v1 compatibility.

The new authoring flow must not turn legacy compatibility into a second modern authoring path.

### AS-IS-SE-05 — Search can find exceptions that the UI cannot author

Project Search already:

- indexes Schedule Exceptions;
- includes their Character and target Location in references;
- navigates them to WORLD/TIME;
- centers the View Cursor at the authored exception moment.

There is no corresponding normal editor form at that destination.

### AS-IS-SE-06 — diagnostics can explain exception ambiguity

Story Brain already exposes Schedule Exception ambiguity evidence.

This slice does not need a new conflict engine.

The authoring UX should reuse those diagnostics rather than duplicate priority-resolution logic.

### AS-IS-SE-07 — WORLD/TIME does not currently render exception bands in its location indexes

The current WORLD/TIME index helper covers:

- RoutineRule by target Location;
- runtime Actual Presence;
- visible Story nodes.

Schedule Exceptions are not indexed there.

Stage 1 must prove whether direct exception visualization is required for the minimum useful authoring workflow.

### AS-IS-SE-08 — recurring schedule authoring already owns similar validation

`routineRuleIsAuthoringValid` already validates:

- canonical Character;
- matching BehaviorProfile;
- day range;
- recurrence;
- period/exact time window;
- target Location or absence.

Schedule Exceptions do not need recurrence or BehaviorProfile validation, but they do need overlapping day/time/reference validation concepts.

Duplicating those rules independently would create drift risk.

### AS-IS-SE-09 — authored schedule editing must remain separate from live simulation state

Existing architecture distinguishes authored schedule intent from runtime Actual Presence and Simulation Playhead.

This Stage 0 does not assume that committing an exception immediately teleports a Character or advances time.

Any such behavior would be a runtime architecture change requiring reopened impact analysis.

## 4. TO-BE problem statement

The editor needs a deterministic, visible way to create, inspect, edit and remove canonical Schedule Exceptions without requiring JSON/project-file editing.

The author should be able to express:

> For this Character, during this authored day/time interval, temporarily override normal schedule intent with this higher-priority location/absence intent, for this optional reason.

The resulting authored data must remain exactly one canonical `ScheduleException` record.

The authoring action must not directly mutate:

- Simulation Playhead;
- `simulation.actualLocationByCharacter`;
- Player runtime state;
- recurring RoutineRule records.

## 5. Main goal

**GOAL-SE-001**

Allow an author to manage canonical `ScheduleException` records through normal WORLD/TIME authoring UI while preserving existing schedule priority semantics, diagnostics, persistence and runtime separation.

Observable minimum success:

1. a canonical Character and Location exist;
2. the author creates a Schedule Exception for an authored day/time window;
3. the record appears in `project.scheduleExceptions`;
4. it can be inspected and edited;
5. Undo restores the previous authored state;
6. Redo reapplies it;
7. Project Search continues to find it;
8. schedule diagnostics continue to analyze it;
9. save/reopen preserves it;
10. Simulation Playhead and current Actual Presence remain unchanged by the authoring mutation itself.

## 6. Constraints / non-negotiable invariants

- `Schedule Exception != Routine Rule`
- `Authored Schedule Intent != Actual Presence`
- `View Cursor != Simulation Playhead`
- `Authored Project != Runtime Save`
- diagnostics are read-only evidence, not an automatic fixer;
- canonical owner remains `NarrativeProject.scheduleExceptions[]`;
- existing `ScheduleException` shape is the starting point;
- existing priority semantics must not be silently redefined;
- no automatic priority renumbering;
- no hidden winner selection for equal maximum-priority overlaps;
- no new `routineRuleId` ownership link without a reopened domain/impact gate;
- new authoring should use `timeWindow`, not create new legacy `periodId` data;
- editing an exception must not directly write Actual Presence;
- editing an exception must not advance Simulation Playhead;
- no AI integration.

## 7. Scope

### In scope

- create a Schedule Exception;
- inspect/select an existing Schedule Exception;
- edit its existing canonical fields;
- remove an existing Schedule Exception;
- canonical Character selection;
- authored active day range;
- period or exact time window;
- target Location / absence intent using the existing domain shape;
- priority authoring;
- optional reason authoring;
- typed authoring command/reducer boundary;
- target and structural validation;
- Undo/Redo;
- persistence round-trip;
- Project Search compatibility;
- Story Brain schedule-diagnostic compatibility;
- explicit proof that authoring does not directly mutate Actual Presence or Simulation Playhead.

### Out of scope

- changing RoutineRule recurrence semantics;
- adding a `routineRuleId` foreign key;
- a new schedule resolver;
- changing current priority winner semantics;
- automatically fixing ambiguity warnings;
- runtime teleportation / presence writes;
- schedule→Actual Presence materialization;
- Player runtime behavior changes;
- compiler/export format changes;
- schema version bump or migration unless Stage 4 proves a real necessity;
- new recurrence support for ScheduleException;
- bulk Schedule Exception editing;
- AI schedule generation;
- Relationship model;
- Character Inner World;
- location hierarchy;
- travel-topology redesign;
- A67-D1 AuthorFocus expansion solely to represent a Schedule Exception.

## 8. Functional requirements

### REQ-SE-001 — canonical owner remains scheduleExceptions

The editor shall persist authored Schedule Exception mutations only in:

`NarrativeProject.scheduleExceptions[]`

No duplicate exception source of truth may be introduced in editor state, WORLD/TIME geometry, AuthorFocus or runtime state.

### REQ-SE-002 — typed add/update/remove authoring boundary

The editor shall use typed authoring commands for:

- add;
- update;
- remove.

These mutations shall participate in authored Undo/Redo.

Stage 6 will fix exact command names and payloads.

### REQ-SE-003 — Character reference validation

A newly committed Schedule Exception shall reference an existing canonical Character.

A missing Character target shall produce a safe no-op / rejected mutation with no partial project change.

Exact reducer identity/no-op semantics are deferred to Contracts.

### REQ-SE-004 — active day-range validation

The committed active range shall be inside the current project template day range.

If `toDay` exists, it shall not precede `fromDay`.

The editor must not commit an impossible authored range.

### REQ-SE-005 — modern time-window authoring

Newly authored exceptions shall use `timeWindow`.

The first slice shall support the existing modern variants:

- period;
- exact.

Exact-window authoring must preserve the existing cross-midnight `endDayOffset` semantics.

Legacy `periodId` remains a read-compatibility concern, not a second normal write path.

### REQ-SE-006 — existing location/absence intent must remain explicit

The UI shall let the author express the existing canonical intent without inventing a new placement/presence field.

Stage 1 must define exact behavior for:

- target Location;
- absent state;
- imported records that contain unusual combinations of existing optional fields.

The editor must not silently fabricate a target Location.

### REQ-SE-007 — priority semantics remain explicit

The author shall be able to inspect and intentionally set the exception priority.

The editor shall not silently renumber priorities to avoid a conflict.

When current diagnostics identify an equal-maximum-priority ambiguity, the author must receive or retain truthful diagnostic evidence.

Whether such a warning blocks Apply is intentionally unresolved for Stage 1; current domain analysis treats it as a warning, not a mutation error.

### REQ-SE-008 — reason remains authored metadata

The optional `reason` field shall remain author-controlled authored metadata.

Stage 1 must specify empty/whitespace handling before the command contract is fixed.

### REQ-SE-009 — authoring mutation does not directly change runtime presence

Adding, updating or removing a Schedule Exception shall not by itself:

- change `simulation.actualLocationByCharacter`;
- advance Simulation Playhead;
- execute Story work;
- execute a Move/Outcome;
- mutate runtime history overlays.

### REQ-SE-010 — diagnostics remain the analysis owner

Schedule overlap/ambiguity detection shall continue to use the existing schedule-analysis owner.

The form shall not implement a second independent conflict-resolution algorithm.

### REQ-SE-011 — Project Search remains compatible

After a successful add/update, Project Search shall continue to index the canonical Schedule Exception.

After removal, the removed exception shall no longer appear in the derived search index.

No duplicate search entity is introduced.

### REQ-SE-012 — persistence round-trip

A successfully authored Schedule Exception shall survive normal project save/reopen.

Stage 4 must verify that the existing authored projection already provides this without production persistence changes.

### REQ-SE-013 — deterministic same-value behavior

Submitting an unchanged canonical exception must have deterministic history semantics.

Contracts must decide whether this is an exact reducer no-op.

The default design preference is no new authored Undo entry for a semantic no-op.

## 9. UX requirements

### UX-SE-001 — author in schedule context

The primary editing surface should live in or adjacent to existing WORLD/TIME schedule authoring rather than create another top-level workspace.

Stage 1 must prove the exact surface.

### UX-SE-002 — distinguish recurring rule from exception

The UI must visibly distinguish:

- recurring RoutineRule;
- temporary/high-priority Schedule Exception.

An author must not mistake editing an exception for rewriting the recurring routine.

### UX-SE-003 — priority must be understandable

Priority cannot be an unexplained magic number.

Stage 1 must define the minimum explanation/context necessary to let authors understand:

- larger priority wins over lower priority in overlap;
- equal maximum priority can be ambiguous.

This requirement does not mandate a particular widget.

### UX-SE-004 — absence is first-class intent

An exception that means "Character is absent" must be authorable without requiring a fake Location.

### UX-SE-005 — current canonical values remain readable before editing

The author should be able to inspect:

- Character;
- day range;
- time window;
- target/absence;
- priority;
- reason

before committing a mutation.

### UX-SE-006 — legacy records are not silently rewritten

If an existing project contains a legacy `periodId`-backed exception, opening the authoring surface must not mutate the project merely because the editor rendered it.

Stage 1 must define safe edit/apply behavior.

## 10. Non-functional requirements

### NFR-SE-001 — local deterministic authoring

No network, AI, worker or background process is required.

### NFR-SE-002 — reuse schedule validation concepts

Day and time-window validation should share existing schedule authoring logic where practical.

Stage 5 should prefer a shared narrow validation core over duplicated minute/day/period rules.

### NFR-SE-003 — no schema expansion by default

The domain shape already exists.

Any new persisted Schedule Exception field is a Stage 4 blocker requiring explicit justification.

### NFR-SE-004 — backwards compatibility

Existing projects containing Schedule Exceptions must remain readable.

Legacy `periodId` compatibility must not be broken solely by adding authoring UI.

### NFR-SE-005 — small reviewable implementation

The likely implementation should extend the existing schedule authoring boundary and UI instead of creating a parallel editor subsystem.

## 11. Open questions for Stage 1

### UNKNOWN-SE-001 — exact visible surface

Candidate A:

- extend `RoutineAuthoringPanel` with a clearly separate Schedule Exceptions section.

Candidate B:

- a sibling panel inside WORLD/TIME.

Stage 1 must choose from concrete journeys, not visual preference.

### UNKNOWN-SE-002 — list/selection model

The project currently has search navigation to an exception moment but no canonical exception selection/focus type.

Stage 1 must decide whether local WORLD/TIME selection is sufficient.

Expanding global AuthorFocus is not assumed.

### UNKNOWN-SE-003 — priority input policy

The domain stores `number`.

Stage 1 must define:

- accepted authored numeric values;
- whether integer-only is desirable or would be a new restriction;
- default priority for a newly created exception;
- how the UX explains winner/tie behavior.

Do not invent a numeric domain before the use cases are fixed.

### UNKNOWN-SE-004 — equal-priority ambiguity during Apply

Current diagnostics classify the condition as `warning`.

Stage 1 must decide whether:

- Apply is allowed and the warning remains visible; or
- a narrower authoring guard is justified.

The default architecture should not silently change current diagnostic severity.

### UNKNOWN-SE-005 — target Location vs absent combination

The current TypeScript shape permits optional `targetLocationId` and optional `absent`.

Existing routine validation gives absence precedence, but there is no Schedule Exception authoring validator yet.

Stage 1 must define safe authoring behavior without silently rewriting imported data.

### UNKNOWN-SE-006 — single-day vs multi-day creation

The domain permits `DayRange`.

Stage 1 must prove whether the first useful workflow needs both:

- one-day exception;
- multi-day exception.

Avoid a new recurrence system.

### UNKNOWN-SE-007 — timeline visualization

Search/diagnostics can already navigate to the authored moment, but WORLD/TIME location rows do not currently index Schedule Exceptions.

Stage 1 must decide whether the first authoring workflow requires:

- rendered exception bands/markers; or
- list/form editing plus existing navigation only.

Timeline visualization is not automatically in scope.

### UNKNOWN-SE-008 — deletion behavior

Stage 1 must specify:

- remove → Undo → Redo;
- Project Search disappearance;
- diagnostic disappearance;
- no RoutineRule mutation.

### UNKNOWN-SE-009 — stale imported references

Stage 1 must define UI behavior when an existing Schedule Exception references a missing Character or Location.

The editor must remain inspectable and must not silently choose a replacement.

## 12. What is intentionally left unchanged

- `ScheduleException` domain field set;
- RoutineRule recurrence semantics;
- schedule-analysis priority algorithm;
- Story Brain diagnostic severity;
- Actual Presence ownership;
- Simulation Playhead;
- Player runtime;
- runtime save model;
- compiler/export artifact shape;
- schema version;
- migrations;
- A67-D1 AuthorFocus contract;
- A67-D2 Item placement contract;
- Project Search architecture;
- WORLD/TIME as an existing top-level workspace.

## 13. Initial impact hypothesis — not an implementation approval

Likely touched later if Stage 1–4 confirm the design:

- `src/store/narrative-project/routine-authoring.ts`
  - likely add typed Schedule Exception commands;
  - likely introduce/reuse shared day/time/reference validation.
- `src/components/narrative/workspace/routine-authoring-panel.tsx`
  - likely expose a separate Schedule Exception authoring section.
- focused store/UI tests.

Conditionally touched only if Stage 1 proves visualization/navigation need:

- `src/components/narrative/workspace/world-time-indexes.ts`;
- `src/components/narrative/workspace/world-time-workspace.tsx`;
- related WORLD/TIME tests.

Likely **not** touched:

- `src/domain/narrative/schedule.ts`;
- `src/domain/narrative/project.ts`;
- schema version / migrations;
- `src/domain/narrative/schedule-analysis.ts`;
- Project Search production code;
- diagnostic navigation production code;
- runtime history/snapshot;
- simulation;
- Player;
- compiler/export;
- AI.

If a later stage proves one of these "not touched" owners must change, Stage 4 Impact Analysis must be reopened before coding.

## 14. Risk review

### RISK-SE-01 — UI creates a second schedule semantics engine

Mitigation:

- reuse canonical ScheduleException fields;
- reuse schedule validation concepts;
- leave conflict semantics in schedule-analysis.

### RISK-SE-02 — authoring mutation teleports runtime Character state

Mitigation:

- mutation changes authored `scheduleExceptions` only;
- regression-test Actual Presence and Simulation Playhead.

### RISK-SE-03 — priority conflict is silently hidden

Mitigation:

- no automatic renumbering;
- retain existing ambiguity diagnostic;
- Stage 1 explicitly defines warning behavior.

### RISK-SE-04 — RoutineRule and ScheduleException become conflated

Mitigation:

- separate UI labeling;
- separate typed command discriminants;
- never require a fake `routineRuleId`.

### RISK-SE-05 — legacy periodId is rewritten on render

Mitigation:

- rendering is read-only;
- new writes use `timeWindow`;
- edit/apply migration semantics must be explicit before implementation.

### RISK-SE-06 — validation logic drifts from routine authoring

Mitigation:

- Stage 3 verifies existing owners;
- Stage 5 prefers shared schedule-authoring validation primitives where justified.

### RISK-SE-07 — scope expands into runtime scheduler redesign

Mitigation:

- D3 is an authoring-surface slice;
- runtime resolution changes are explicitly excluded unless a reproducible defect forces a reopened architecture gate.

### RISK-SE-08 — global focus expands unnecessarily

Mitigation:

- first prove local WORLD/TIME exception selection/editing;
- D1 AuthorFocus is not expanded without a cross-workspace use case.

## 15. Initial traceability seed

| ID | Requirement | Use Case | Domain Owner | Architecture | Component | Code | Test | Status |
|---|---|---|---|---|---|---|---|---|
| REQ-SE-001 | canonical owner | pending Stage 1 | ScheduleException | authored project | pending | — | — | ⚠ |
| REQ-SE-002 | typed CRUD | pending Stage 1 | authored history | schedule authoring | pending | — | — | ⚠ |
| REQ-SE-003 | Character validation | pending Stage 1 | Character ref | authoring validator | pending | — | — | ⚠ |
| REQ-SE-004 | day range validation | pending Stage 1 | DayRange | authoring validator | pending | — | — | ⚠ |
| REQ-SE-005 | modern timeWindow writes | pending Stage 1 | RoutineTimeWindow | compatibility boundary | pending | — | — | ⚠ |
| REQ-SE-006 | location/absence intent | pending Stage 1 | ScheduleException | WORLD/TIME authoring | pending | — | — | ⚠ |
| REQ-SE-007 | priority semantics | pending Stage 1 | priority | schedule-analysis | pending | — | — | ⚠ |
| REQ-SE-009 | runtime separation | pending Stage 1 | simulation runtime | authored/runtime boundary | pending | — | — | ⚠ |
| REQ-SE-010 | diagnostics reuse | pending Stage 1 | schedule-analysis | Story Brain | pending | — | — | ⚠ |
| REQ-SE-011 | search compatibility | pending Stage 1 | derived index | Project Search | pending | — | — | ⚠ |
| REQ-SE-012 | persistence | pending Stage 1 | authored project | repository | pending | — | — | ⚠ |
| REQ-SE-013 | semantic no-op | pending Stage 1 | authored history | reducer | pending | — | — | ⚠ |

## 16. Gate review — Stage 0 → Stage 1 Use Cases

### Checks

✅ Gap is directly evidenced by the A67 authoring pilot.

✅ D1 and D2 are merged and post-merge GREEN on stable.

✅ Canonical `ScheduleException` domain owner already exists.

✅ Persisted authored owner already exists.

✅ Search already recognizes Schedule Exceptions.

✅ Diagnostics already recognize Schedule Exception ambiguity.

✅ Existing priority semantics are documented in current code.

✅ Existing schedule authoring provides reusable validation concepts.

✅ No new source of truth is proposed.

✅ No schema addition is proposed.

✅ Runtime Actual Presence remains a separate owner.

✅ Simulation Playhead remains separate from authored schedule editing.

⚠ Exact UI surface is intentionally unresolved.

⚠ Priority input/default policy requires use-case design.

⚠ Equal-priority warning behavior during Apply requires use-case design.

⚠ Imported legacy/stale record behavior requires explicit scenarios.

⚠ Timeline visualization is conditional, not assumed.

### Gate decision

**✅ PASS to Stage 1 Use Case design.**

There is no Stage 0 architecture blocker.

Implementation must not begin until Stage 1 and the remaining design gates prove:

- exact writer journeys;
- validation semantics;
- legacy behavior;
- priority/warning UX;
- component impact;
- contracts;
- regression coverage.

## 17. Next concrete stage — do not skip

**Stage 1: Use Cases / scenario design for Schedule Exception Authoring.**

At minimum Stage 1 must specify these journeys:

1. Existing Character + Location → create a one-day exact-window exception → save.
2. Create an absence exception without inventing a Location.
3. Create/use a period-based exception through modern `timeWindow`.
4. Edit Location, day/time range, priority and reason → Apply.
5. Change an exception → Undo → Redo.
6. Remove an exception → Undo → Redo.
7. Save/reopen → canonical Schedule Exception is preserved.
8. Project Search finds the new/edited exception and removed exceptions disappear.
9. Create two overlapping exceptions with different priority → higher priority remains valid and no false ambiguity is introduced.
10. Create two overlapping maximum-priority ties → existing ambiguity diagnostic remains truthful; Stage 1 decides whether Apply is allowed.
11. Attempt to commit missing Character / missing target Location → safe rejection with no partial mutation.
12. Open an imported legacy `periodId` exception → inspect safely without render-time mutation.
13. Open an imported stale reference → inspect safely without silently choosing a replacement.
14. Edit exception while Simulation has current Actual Presence → authored data changes but Playhead/Actual Presence are not directly rewritten.
15. Verify RoutineRule records remain unchanged by exception CRUD.

Only after the Stage 1 Gate may the project choose the exact form, selection model, priority UX and whether first-slice WORLD/TIME exception visualization is required.
