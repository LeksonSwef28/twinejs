# 93 Days — A67-D3 Schedule Exception Authoring · Stage 3 Existing Architecture Verification

Status: **STAGE 3 COMPLETE — Gate to Impact Analysis**
Base: `93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`
Depends on:
- `93DAYS_A67_D3_SCHEDULE_EXCEPTION_AUTHORING_STAGE0.md`
- `93DAYS_A67_D3_SCHEDULE_EXCEPTION_AUTHORING_STAGE1_USE_CASES.md`
- `93DAYS_A67_D3_SCHEDULE_EXCEPTION_AUTHORING_STAGE2_DOMAIN_MODEL.md`
Date: **2026-10-03**
Production code in this slice: **none**

## 1. Stage 3 purpose

Stage 2 defined the desired authoring model around the already-existing canonical collection:

`NarrativeProject.scheduleExceptions[]`.

Stage 3 verifies that model against the live stable architecture.

The goal is not to redesign the schedule system.

The goal is to answer:

- which current owners already satisfy the required behavior;
- which logic can be reused directly;
- where narrow new code is unavoidable;
- which earlier assumptions were too strong;
- which files are actually candidates for Stage 4 blast-radius approval.

No production implementation is approved by this document.

## 2. Verification baseline

Verified stable/base:

`93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`

Verified Stage 2 exact head:

`7cd69a6b5a7edd0ad87e26337efb90f688f7f6e2`

Stage 2 Branch Check:

`#37110793807 — SUCCESS`

Relevant current owners inspected:

- `src/domain/narrative/schedule.ts`
- `src/domain/narrative/world-time.ts`
- `src/domain/narrative/schedule-analysis.ts`
- `src/store/narrative-project/routine-authoring.ts`
- `src/store/narrative-project/editor-authoring.ts`
- `src/store/narrative-project/reducer.ts`
- `src/store/narrative-project/runtime-history.ts`
- `src/store/narrative-project/narrative-project-context.tsx`
- `src/store/narrative-project/persistence-projection.ts`
- `src/store/narrative-project/repository.ts`
- `src/components/narrative/workspace/routine-authoring-panel.tsx`
- `src/components/narrative/workspace/narrative-workspace.tsx`
- `src/components/narrative/workspace/world-time-workspace.tsx`
- `src/components/narrative/workspace/use-authoring-navigation.ts`
- `src/application/narrative/authoring-navigation.ts`
- `src/application/narrative/project-search.ts`
- `src/application/narrative/story-brain-diagnostic-navigation.ts`
- current routine/history/persistence/search/schedule-diagnostic tests.

## 3. FACT / HYPOTHESIS / UNKNOWN summary

### FACT

- ScheduleException already belongs to the authored NarrativeProject.
- Existing authoring command/history path can host another typed command family.
- Exact same project object means no authored Undo entry.
- NarrativeProjectContext preserves current runtime state across authoring Undo/Redo.
- ScheduleException is already inside authored persistence projection.
- Project Search and Story Brain derive from canonical `scheduleExceptions`.
- Existing ambiguity analysis already owns priority-tie warnings.
- Routine authoring UI is mounted whenever WORLD/TIME panels are visible.

### HYPOTHESIS confirmed as feasible

- D3 can be implemented without schema, migration, Player or runtime changes.
- A separate Schedule Exceptions section can live beside current Routine authoring without a new workspace.
- A narrow pure helper layer can provide read resolution, Candidate construction and semantic equality.

### UNKNOWN left for Stage 4/5

- exact helper file split;
- whether shared schedule primitive extraction is worth one extra production file;
- whether the exception UI should be a sibling component or a subcomponent extracted from the existing panel;
- exact test-file split.

## 4. Existing command routing is already sufficient

### FACT-ARCH-SE-001 — NarrativeAuthoringCommand is the current schedule authoring command owner

`routine-authoring.ts` currently defines:

```ts
export type RoutineAuthoringCommand =
  | {type: 'routine/add'; rule: RoutineRule}
  | {type: 'routine/update'; rule: RoutineRule}
  | {type: 'routine/remove'; id: string};
```

and:

```ts
export type NarrativeAuthoringCommand =
  | NarrativeProjectCommand
  | RoutineAuthoringCommand
  | StoryMetadataAuthoringCommand
  | MoveConditionAuthoringCommand;
```

Therefore Schedule Exception CRUD can extend the existing authored schedule command layer.

No new command bus is required.

### FACT-ARCH-SE-002 — EditorAuthoringCommand already includes NarrativeAuthoringCommand

`editor-authoring.ts` routes every `NarrativeAuthoringCommand` through:

`narrativeProjectAuthoringReducer`.

Therefore adding a Schedule Exception command family to NarrativeAuthoringCommand does not require:

- provider changes;
- editorAuthoring reducer changes;
- new global state.

### Architecture implication

The default routing is:

`ScheduleException UI`
→ `useNarrativeProject().execute(command)`
→ `editorAuthoringReducer`
→ `narrativeProjectAuthoringReducer`
→ narrow Schedule Exception apply function
→ canonical `NarrativeProject.scheduleExceptions`.

## 5. Current history/no-op contract is reusable

### FACT-ARCH-SE-003 — authoring history uses reference identity

`narrativeProjectAuthoringReducer` computes `nextProject` and checks:

```ts
if (nextProject === state.present) {
  return state;
}
```

A meaningful change appends old `present` to `past`, updates `present`, and clears `future`.

### Consequence

D3 semantic no-op/rejection must return the exact original NarrativeProject object before `touched(...)`.

This directly supports:

- duplicate id rejection;
- missing target rejection;
- invalid range/window/priority rejection;
- missing update/remove id;
- same-semantic-value update.

### FACT-ARCH-SE-004 — Routine update does not currently implement semantic same-value no-op

Current `routine/update` validates existence/validity, then always returns a touched project.

Therefore D3 cannot simply copy the Routine update behavior if Stage 2 semantic no-op is to be honored.

This is not a defect in Routine authoring scope.

It is a requirement difference for Schedule Exception editing.

## 6. Runtime-preserving Undo/Redo is already physical architecture

### FACT-ARCH-SE-005 — runtime-history copies only runtime projection fields

`projectNarrativeRuntimeOntoAuthoring(authoredProject, runtimeSource)` starts from the authored project and overlays only runtime fields such as:

- memories;
- relationships;
- pending reactions;
- mind states;
- injuries;
- item placement overrides;
- Story runtime overrides/occurrences;
- active Story executions;
- simulation.

It does **not** copy `scheduleExceptions` from the runtime source.

### FACT-ARCH-SE-006 — NarrativeProjectContext preserves current runtime during Undo/Redo

Context Undo/Redo does:

`keepCurrentRuntime(restored.present, current.present)`.

Therefore an authored Schedule Exception Undo/Redo can restore older `scheduleExceptions` while preserving:

- current Simulation Playhead;
- current `simulation.actualLocationByCharacter`;
- other live runtime state.

### Architecture implication

D3 needs focused regression evidence.

It does **not** need a new runtime-history mechanism.

## 7. Persistence already has the correct authored/runtime split

### FACT-ARCH-SE-007 — scheduleExceptions is authored projection data

`NarrativeProjectAuthoredProjection` excludes explicit runtime/editor keys.

`scheduleExceptions` is not excluded.

Therefore it is already physically classified as authored persistence.

### FACT-ARCH-SE-008 — schema-v2/v3 hydration preserves saved scheduleExceptions through the authored aggregate

`hydrateSchemaV2OrV3` begins with:

```ts
{
  ...fresh,
  ...saved,
  ...
}
```

and does not replace `scheduleExceptions` with a runtime projection value.

### FACT-ARCH-SE-009 — schema-v1 migration explicitly preserves legacy scheduleExceptions

The schema-v1 migration contains:

```ts
scheduleExceptions: legacy.scheduleExceptions ?? []
```

This is direct evidence that legacy `periodId` exception records remain load-compatible.

### Important limitation

Repository hydration does not validate/repair every ScheduleException field or reference.

That is compatible with Stage 2:

- stale/conflicting raw records remain readable;
- new authored writes are stricter;
- no load-time auto-repair.

### Stage 4 expectation

No production persistence or migration file should be modified unless a focused test proves a real defect.

## 8. Current schedule primitives: reusable pieces and non-reusable assumptions

This is a major Stage 3 finding.

### FACT-ARCH-SE-010 — reusable day/minute concepts already exist, but as private helpers

`routine-authoring.ts` has private:

- `dayIsValid(project, day)`;
- `minuteIsValid(minute)`;
- `timeWindowIsValid(project, rule)`.

These concepts are relevant to Schedule Exception authoring.

They are not currently exported/shared.

### FACT-ARCH-SE-011 — routine-specific validator cannot be reused wholesale

`routineRuleIsAuthoringValid` additionally requires:

- matching BehaviorProfile;
- recurrence validity;
- RoutineRule shape.

Schedule Exceptions require neither BehaviorProfile nor recurrence.

Creating a fake RoutineRule only to reuse this validator would violate the model boundary.

### FACT-ARCH-SE-012 — current routine exact-window validity is weaker than the Stage 2 Candidate contract

Current Routine validation accepts exact windows when:

- start/end are valid minutes;
- `endDayOffset` is undefined/0/1.

It does **not** require the effective interval to end after it starts.

Therefore values such as:

- same start/end with offset 0;
- end earlier than start with explicit offset 0

can pass that current validator even though downstream schedule analysis may produce zero/negative effective windows and skip them.

### Consequence

D3 must not blindly reuse `timeWindowIsValid` as its complete Candidate validity rule.

A narrow shared primitive extraction may reuse:

- day bounds;
- minute bounds;
- period lookup;
- effective exact end-day-offset normalization.

But exception Candidate validation still needs its own effective interval check.

### FACT-ARCH-SE-013 — time-window interpretation is duplicated today

Equivalent logic currently appears in:

- `world-time.ts::routineWindowForDay`;
- `schedule-analysis.ts::exceptionWindowForDay`;
- `story-brain-diagnostic-navigation.ts::firstExceptionCenter`;
- `RoutineAuthoringPanel` form helpers.

### Architecture implication

A67-D3 should **not** opportunistically refactor all schedule readers.

That would mix feature implementation with unrelated cleanup.

Stage 4 should allow only a narrow shared authoring helper if it materially reduces new duplication.

Broader schedule-window consolidation is P2/P3 follow-up.

## 9. Schedule analysis already owns ambiguity semantics

### FACT-ARCH-SE-014

`analyzeNarrativeScheduleConflicts` already analyzes all canonical Schedule Exceptions.

For each Character and overlapping segment:

- it finds maximum active priority;
- one unique maximum is valid;
- multiple exceptions tied at that maximum produce `schedule-exception-ambiguity`;
- severity is `warning`.

### FACT-ARCH-SE-015

Different-priority overlaps are explicitly tested as non-ambiguous.

### Consequence

D3 mutation validation must not:

- call ambiguity a structural invalidity;
- renumber priority;
- choose a winner;
- implement duplicate overlap analysis in the form.

Successful authored mutations naturally feed the existing analysis because it reads canonical `project.scheduleExceptions`.

### Stage 4 expectation

`schedule-analysis.ts` production code should remain untouched unless tests reveal an existing bug.

## 10. Project Search already reflects CRUD from canonical state

### FACT-ARCH-SE-016

`buildProjectSearchIndex(project)` loops directly over:

`project.scheduleExceptions`.

Its document contains:

- exception id;
- Character-derived title;
- target Location/absence label;
- priority;
- Character/Location aliases.

### FACT-ARCH-SE-017

Back-references already connect Schedule Exceptions to:

- owning Character;
- target Location when present.

### Consequence

Add/update/remove needs no explicit search-index mutation.

Search results update as a derived projection when canonical project changes.

### CORRECTION-ARCH-SE-001 — current Project Search navigation is less precise than earlier wording implied

Current `projectSearchNavigationTarget` for a Schedule Exception sets:

```ts
absoluteMinute:
  (exception.activeRange.fromDay - 1) * minutesPerDay
```

That is the **start of the first authored day**, not the center/start of the exception's actual period/exact time window.

`planAuthoringNavigation` uses that value directly for WORLD/TIME viewport centering.

Therefore the following stronger claim is **not proven**:

> Project Search currently centers on the precise authored exception window.

What is proven:

- Search identifies the canonical Schedule Exception;
- Search navigates to WORLD/TIME;
- Search moves the View Cursor only;
- Search does not move Simulation Playhead.

### Scope interpretation

Exact exception-window centering is not required to make Schedule Exceptions authorable in the Stage 1 local-panel flow.

Therefore this mismatch is **not a D3 blocker** and does not force Project Search into the first implementation blast radius.

If exact-window Search centering becomes a product requirement, it should be a separate small navigation improvement or an explicitly approved D3 addition.

## 11. Story Brain diagnostic navigation is already more precise

### FACT-ARCH-SE-018

For `schedule-exception-ambiguity`, Story Brain navigation centers on the actual overlap midpoint.

For broken-authored-reference owner kind `schedule-exception`, `firstExceptionCenter` interprets:

- exact windows;
- inferred/explicit cross-midnight offset;
- modern period;
- legacy `periodId`.

### Consequence

D3 does not need new diagnostic-navigation production code.

Existing diagnostics already satisfy the "warning remains navigable" requirement.

## 12. WORLD/TIME UI ownership is already suitable

### FACT-ARCH-SE-019 — RoutineAuthoringPanel is mounted as the schedule authoring surface

`narrative-workspace.tsx` renders:

```tsx
{visiblePanels.showWorldTime && <RoutineAuthoringPanel />}
```

This occurs when WORLD/TIME is visible, including split-view semantics through existing `workspacePanelsForMode`.

### FACT-ARCH-SE-020 — the panel already has all canonical context required by D3

`RoutineAuthoringPanel` obtains:

- `project`;
- `execute`;
- `createId`

from `useNarrativeProject()`.

Therefore a Schedule Exception authoring section can access:

- Characters;
- Locations;
- template day count;
- template periods;
- current exceptions;
- typed execute boundary.

No new provider/context is needed.

### FACT-ARCH-SE-021 — current routine form already demonstrates local draft/apply semantics

Routine authoring stores transient React state for:

- edit id;
- Character;
- destination;
- day range;
- recurrence;
- time window;
- message.

Canonical mutation occurs only on submit.

This is a directly reusable interaction pattern for D3.

### Architecture implication

D3 should reuse the **pattern**, not force one combined draft object with RoutineRule.

Routine Rule and Schedule Exception drafts have different semantics.

## 13. UI component boundary: extend surface, avoid monolith growth

### FACT-ARCH-SE-022

`RoutineAuthoringPanel` is already a substantial component containing:

- helpers;
- Routine create/edit form;
- Routine list;
- validation feedback.

Adding the full Schedule Exception form directly into the same component body would materially increase complexity.

### Stage 3 design constraint

The first-slice surface remains the existing WORLD/TIME schedule authoring area.

However Stage 5 should strongly consider:

- keeping `RoutineAuthoringPanel` as the containing schedule surface;
- extracting a sibling/subcomponent for Schedule Exception CRUD.

This preserves the Stage 1 surface decision without turning one component into two independent editors interleaved in one function.

Exact file split remains Stage 5.

## 14. WORLD/TIME timeline visualization is not required by current architecture

### FACT-ARCH-SE-023

`world-time-indexes.ts` indexes:

- Routine Rules by Location;
- Actual Presence by Location;
- visible Story nodes by Location.

It does not index Schedule Exceptions.

### FACT-ARCH-SE-024

`world-time-workspace.tsx` renders routine schedule blocks using `routineWindowForDay`, not exception bands.

### Consequence

Adding exception bands would require:

- new indexing/projection rules;
- absent-intent visualization;
- priority/overlap stacking policy;
- unresolved target behavior.

Stage 1 correctly deferred this.

### Stage 4 expectation

No production change to:

- `world-time-indexes.ts`;
- `world-time-workspace.tsx`

for the first authoring slice.

The existing schedule authoring panel is mounted outside the timeline component and is sufficient.

## 15. Current authoring UI helpers can be selectively reused

### FACT-ARCH-SE-025

`RoutineAuthoringPanel` already contains local helpers:

- `parseClock`;
- `clockValue`;
- `buildWindow`.

The UI behavior:

- exact end earlier than start => `endDayOffset: 1`.

This matches the common cross-midnight case.

### Limitation

These helpers are component-local and Routine-specific.

The D3 first slice can:

- reuse them by extracting a small UI helper if Stage 5 proves worthwhile; or
- duplicate only trivial display parsing if extraction would cause larger churn.

The architectural priority is avoiding duplicated **canonical validation semantics**, not eliminating every two-line presentation helper.

## 16. Current schedule readers support legacy period fallback

### FACT-ARCH-SE-026

Both:

- `routineWindowForDay` for RoutineRule;
- `exceptionWindowForDay` inside schedule analysis

use:

`timeWindow.periodId` first, then legacy top-level `periodId`.

### FACT-ARCH-SE-027

Story Brain `firstExceptionCenter` follows the same precedence.

### Consequence

Stage 2 modern-write / legacy-read policy is compatible with current readers.

No migration is required.

The D3 read-side helper must mirror this precedence.

## 17. Existing tests provide strong reuse evidence

### TEST-EVIDENCE-SE-001 — routine authoring history/runtime boundary

`routine-authoring.test.ts` already proves:

- authored schedule intent does not change Actual Presence;
- Undo/Redo works;
- invalid references/ranges can return the exact same history state.

This is the closest command-path precedent.

### TEST-EVIDENCE-SE-002 — runtime history

`runtime-history.test.ts` proves:

- runtime replacement creates no authored Undo;
- redo survives runtime updates;
- authored Undo can preserve current runtime projection.

D3 should extend this specifically for `scheduleExceptions` and Actual Presence/Playhead.

### TEST-EVIDENCE-SE-003 — persistence

`routine-authoring-persistence.test.ts` proves the authored schedule pattern survives save/reopen while runtime presence remains independent.

D3 needs equivalent explicit Schedule Exception evidence.

### TEST-EVIDENCE-SE-004 — Project Search

`project-search.test.ts` already constructs a Schedule Exception and proves:

- it is indexed;
- Character back-reference contains it;
- Location back-reference can contain it;
- Schedule Exception back-references resolve Character/Location;
- search navigation enters WORLD/TIME without mutating simulation.

### TEST-EVIDENCE-SE-005 — ambiguity diagnostics

`schedule-exception-analysis.test.ts` and Story Brain schedule-exception tests already prove:

- equal maximum-priority overlaps produce warning;
- a higher-priority winner suppresses false tie warnings;
- diagnostic navigation reaches WORLD/TIME.

### Consequence

Production Search/diagnostic changes are unlikely.

Stage 9 should add integration evidence around newly authored CRUD rather than rewrite those systems.

## 18. Existing architecture reuse matrix

| Need | Current owner | Reuse decision |
|---|---|---|
| canonical exception collection | `NarrativeProject.scheduleExceptions` | reuse directly |
| canonical type | `ScheduleException` | reuse directly |
| period/exact type | `RoutineTimeWindow` | reuse directly |
| typed authoring command routing | `NarrativeAuthoringCommand` | extend |
| authoring history | `narrativeProjectAuthoringReducer` | reuse |
| exact no-op history | project reference identity | reuse |
| runtime-preserving Undo/Redo | context + `keepCurrentRuntime` | reuse |
| current schedule UI surface | `RoutineAuthoringPanel` under WORLD/TIME | reuse surface |
| Schedule Exception form/list | none | new UI subcomponent/section |
| tolerant read resolver | none | new narrow pure helper |
| Candidate construction | none | new narrow pure helper |
| semantic equality | none | new narrow pure helper |
| day bounds | private routine helper | extract/reuse conceptually |
| minute bounds | private routine helper | extract/reuse conceptually |
| period lookup | repeated current code | narrow reuse/extraction |
| effective exact offset | repeated current code | narrow reuse/extraction |
| strict positive exact interval | none in current authoring validator | new D3 validation rule |
| ambiguity analysis | `schedule-analysis.ts` | reuse unchanged |
| Search index | `project-search.ts` | reuse unchanged |
| diagnostic navigation | Story Brain navigation | reuse unchanged |
| persistence authored projection | `persistence-projection.ts` | reuse unchanged |
| repository legacy load | `repository.ts` | reuse unchanged |
| timeline exception bands | none | deferred |

## 19. Likely implementation owners for Stage 4

Pending Stage 4 approval, the smallest likely production set is:

### P1 — Schedule Exception authoring core

Either:

- extend `src/store/narrative-project/routine-authoring.ts`; and/or
- introduce one narrow adjacent schedule-exception authoring/helper module.

Responsibilities:

- typed CRUD command family;
- tolerant resolver / normalization;
- Candidate validation;
- semantic equality;
- add/update/remove application;
- exact original project on rejection/no-op.

### P1 — WORLD/TIME schedule authoring UI

Likely:

- `src/components/narrative/workspace/routine-authoring-panel.tsx`; and possibly
- one extracted adjacent Schedule Exception subcomponent.

Responsibilities:

- local Draft;
- list/read state;
- create/edit/remove;
- explicit Location vs Absent;
- priority/reason;
- stale/conflicting display;
- Apply/Cancel.

### Tests

Focused tests around:

- authoring core;
- UI integration;
- runtime-preserving history;
- persistence;
- existing search/diagnostic derivation after CRUD.

## 20. Files not currently justified for production modification

Stage 3 evidence does **not** justify production changes to:

- `src/domain/narrative/schedule.ts`;
- `src/domain/narrative/project.ts`;
- schema version;
- migrations;
- `src/domain/narrative/world-time.ts`;
- `src/domain/narrative/schedule-analysis.ts`;
- `src/application/narrative/project-search.ts`;
- `src/application/narrative/story-brain-diagnostic-navigation.ts`;
- `src/application/narrative/authoring-navigation.ts`;
- `src/components/narrative/workspace/world-time-indexes.ts`;
- `src/components/narrative/workspace/world-time-workspace.tsx`;
- `src/store/narrative-project/runtime-history.ts`;
- `src/store/narrative-project/narrative-project-context.tsx`;
- `src/store/narrative-project/persistence-projection.ts`;
- `src/store/narrative-project/repository.ts`;
- Player runtime;
- compiler/export;
- A67-D1 AuthorFocus;
- AI.

Tests in these areas may be extended for regression evidence without production changes.

## 21. Architecture anti-patterns ruled out

Do not:

- add Schedule Exception directly to runtime simulation state;
- create a second persisted exception collection;
- add `routineRuleId` merely to make UI nesting convenient;
- mutate Routine Rules when editing an exception;
- block valid authoring because Story Brain reports a warning;
- auto-renumber priority;
- auto-repair stale/conflicting imported data on render;
- write legacy top-level `periodId` for new records;
- run Playhead or Actual Presence updates on Apply;
- persist React draft state;
- add a global AuthorFocus kind solely for local exception editing;
- add timeline bands before they have their own design;
- refactor every existing schedule-window reader as collateral work;
- use current Routine validator unchanged for exception exact-window validity.

## 22. Missing focused test coverage identified

Stage 9 should include at least:

1. add one-day exact Location exception;
2. add Absent exception;
3. add period exception using modern `timeWindow`;
4. add exact cross-midnight exception;
5. support one-day / bounded / through-project-end ranges;
6. reject duplicate id with exact history no-op;
7. reject missing Character;
8. reject missing Location;
9. reject invalid day range;
10. reject missing period;
11. reject invalid/non-finite priority;
12. reject zero/negative effective exact window according to Stage 2 Candidate contract;
13. meaningful update writes modern shape;
14. legacy-period semantically same Apply is exact no-op;
15. inferred vs explicit exact day-offset equality is no-op;
16. meaningful edit of legacy record modernizes only that edited record;
17. conflicting/stale imported record renders safely;
18. stale/conflicting record can be removed;
19. same-value modern update is exact no-op;
20. remove -> Undo -> Redo;
21. authored CRUD preserves current Playhead and Actual Presence;
22. authored Undo/Redo preserves later current runtime state;
23. save/reopen preserves Schedule Exception independently from runtime;
24. Project Search reflects add/update/remove from canonical project;
25. existing different-priority behavior remains non-ambiguous;
26. equal-max tie remains a warning after authored CRUD;
27. Routine Rules remain unchanged by exception CRUD;
28. UI local draft Cancel makes no canonical mutation.

## 23. Stage 2 open questions answered by architecture

### Q1 — shared schedule primitives owner

No existing public shared authoring primitive module exists.

Primitive logic is currently private/repeated.

Stage 4/5 may approve a **narrow** extraction for:

- day bounds;
- minute bounds;
- period resolution;
- effective exact offset.

Do not broaden this into a schedule subsystem refactor.

### Q2 — can commands extend current NarrativeAuthoringCommand?

Yes.

No EditorAuthoringCommand/provider changes are structurally required.

### Q3 — does current history preserve exact no-op?

Yes.

Return exact current project before `touched`.

### Q4 — where can resolver/candidate helpers live?

No existing canonical owner provides them.

They should live adjacent to authored schedule mutation code, not inside persisted domain types and not inside React only.

Exact file is Stage 5.

### Q5 — does RoutineAuthoringPanel have a safe boundary?

The WORLD/TIME surface is correct, but the component is already large.

Use the surface; strongly prefer an extracted exception subcomponent rather than doubling one function body.

### Q6 — does Project Search require production change for CRUD reflection?

No.

It derives directly from canonical `scheduleExceptions`.

Exact-window centering is a separate navigation quality issue, not required for D3 CRUD.

### Q7 — does schedule-analysis require production change?

No evidence of need.

Existing semantics match Stage 1 decision.

### Q8 — does persistence round-trip existing ScheduleException shape?

Architecture says yes:

- authored projection includes it;
- schema-v1 explicitly preserves it;
- schema-v2/v3 saved aggregate preserves it.

Focused D3 persistence test still required.

### Q9 — does Undo/Redo preserve current runtime?

Yes through NarrativeProjectContext + `keepCurrentRuntime`.

Focused D3 test required.

### Q10 — proven implementation blast-radius candidates

Current evidence points to:

- schedule authoring core/routing;
- WORLD/TIME schedule authoring UI;
- tests.

Everything else should default to test-only or no change.

## 24. Traceability update

| Requirement | Use Cases | Domain Model | Verified architecture owner | Status |
|---|---|---|---|---|
| REQ-SE-001 canonical owner | UC-001/006/008/019 | ENTITY-SE-001 | NarrativeProject.scheduleExceptions | verified |
| REQ-SE-002 typed CRUD/history | UC-001/006/007/008/020 | collection transition | NarrativeAuthoringCommand + authoring reducer | verified feasible |
| REQ-SE-003 Character validation | UC-001/012/016 | resolved Character/Candidate | authoring core has project context | verified feasible |
| REQ-SE-004 day range | UC-001/005/014 | resolved range/Candidate | private day primitive exists | narrow extraction/new validation |
| REQ-SE-005 modern timeWindow | UC-001/003/004/014/015 | normalized window | current readers support modern+legacy | verified |
| REQ-SE-006 location/absence | UC-001/002/013/016/017 | intent VO | project Character/Location context available | verified feasible |
| REQ-SE-007 priority | UC-001/006/010/011/014 | finite priority | existing analysis consumes numeric priority | verified |
| REQ-SE-008 reason | UC-001/006 | normalized metadata | no conflicting owner | feasible |
| REQ-SE-009 runtime separation | UC-001/007/018 | runtime external | runtime-history/context | verified |
| REQ-SE-010 diagnostics owner | UC-008/010/011 | existing analysis | schedule-analysis + Story Brain | verified |
| REQ-SE-011 search compatibility | UC-008/009 | derived search | project-search | CRUD verified; exact-time centering not proven |
| REQ-SE-012 persistence | UC-009/015/016 | authored projection | persistence projection/repository | verified architecture |
| REQ-SE-013 semantic no-op | UC-006/007/012/013/014/020 | semantic comparator | exact project identity history | verified mechanism |

## 25. Stage 3 findings

### FINDING-SE-018 — existing authored command/history architecture is sufficient

No new state management, command bus or provider is required.

### FINDING-SE-019 — Schedule Exception needs its own narrow authoring core

RoutineRule validator cannot be reused wholesale because it owns recurrence/BehaviorProfile semantics and lacks D3 semantic equality.

### FINDING-SE-020 — shared validation should be primitive-level only

Reuse day/minute/period/effective-offset concepts.

Do not force exceptions through RoutineRule validation.

### FINDING-SE-021 — strict exact-window Candidate validation is new behavior

Current Routine validator does not prove positive effective duration.

D3 must implement/test the Stage 2 Candidate contract explicitly.

### FINDING-SE-022 — exact-object no-op is the key history contract

All invalid/same-semantic paths must return exact current project before `touched`.

### FINDING-SE-023 — persistence needs evidence, not redesign

Current physical projection already places Schedule Exceptions in authored data.

### FINDING-SE-024 — Search CRUD is already derived correctly

No production search-index mutation is required.

### FINDING-SE-025 — Project Search exact-window centering is not current behavior

Current Search centers on first authored day at midnight.

This is a documented scope correction, not a hidden assumption.

### FINDING-SE-026 — diagnostics need evidence, not redesign

Existing ambiguity semantics match Stage 1.

### FINDING-SE-027 — WORLD/TIME timeline files need not enter first-slice blast radius

The existing mounted schedule authoring panel is enough for CRUD.

### FINDING-SE-028 — local UI draft pattern is already established

Routine authoring demonstrates the intended presentation/canonical boundary.

### FINDING-SE-029 — component extraction is preferable to monolith growth

Reuse the existing schedule surface while isolating exception-specific draft/UI logic.

## 26. Gate Review — Stage 3 → Stage 4 Impact Analysis

### Architecture verification checks

✅ Live PR/base/head unchanged at Stage 3 start.

✅ Stage 2 exact-head CI was GREEN.

✅ Typed authoring routing verified.

✅ Exact no-op history mechanism verified.

✅ Runtime-preserving Undo/Redo verified.

✅ Persistence authored projection verified.

✅ Legacy Schedule Exception load path verified.

✅ Current Routine validation limitations identified.

✅ Existing ambiguity analysis verified.

✅ Project Search derived CRUD behavior verified.

✅ Project Search exact-time navigation limitation documented.

✅ WORLD/TIME mounting/surface ownership verified.

✅ Timeline visualization confirmed unnecessary for first slice.

✅ No schema/runtime/Player/compiler dependency identified.

### Gate decision

**✅ PASS to Stage 4 Impact Analysis.**

There is no architecture blocker.

Stage 4 must now freeze the production blast radius before any implementation begins.

## 27. Mandatory Stage 4 decisions

Stage 4 must explicitly decide:

1. exact production files allowed for the Schedule Exception authoring core;
2. whether to extract shared schedule authoring primitives or keep them narrowly colocated;
3. whether UI is:
   - a Schedule Exception subcomponent under current panel; or
   - direct panel extension;
4. whether Project Search exact-window centering remains deferred;
5. confirm no production changes in:
   - domain persisted shape;
   - schema/migrations;
   - runtime-history/context;
   - persistence projection/repository;
   - schedule-analysis;
   - Project Search;
   - Story Brain navigation;
   - WORLD/TIME timeline/indexes;
   - Player/compiler/AI;
6. exact regression test files;
7. rollback boundary.

Only after Stage 4 freezes this blast radius may Component Design begin.
