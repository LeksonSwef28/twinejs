# 93 Days — A67-D3 Schedule Exception Authoring · Stage 2 Domain Model

Status: **STAGE 2 COMPLETE — Gate to Existing Architecture Verification**
Base: `93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`
Depends on:
- `93DAYS_A67_D3_SCHEDULE_EXCEPTION_AUTHORING_STAGE0.md`
- `93DAYS_A67_D3_SCHEDULE_EXCEPTION_AUTHORING_STAGE1_USE_CASES.md`
Date: **2026-10-03**
Production code in this slice: **none**

## 1. Stage 2 purpose

Stage 1 proved that Schedule Exception authoring is not a new scheduler.

The canonical authored concept already exists:

```ts
NarrativeProject.scheduleExceptions: ScheduleException[]
```

The missing capability is an authoring read/write model around that existing collection.

Stage 2 defines the smallest domain/application vocabulary required to support:

- create;
- inspect;
- edit;
- remove;
- Undo/Redo;
- legacy `periodId` read compatibility;
- stale/conflicting imported data;
- semantic no-op behavior;
- existing priority diagnostics;
- strict separation from Simulation Playhead and Actual Presence.

It does **not** approve production file layout or implementation.

## 2. Canonical aggregate boundary

### Aggregate root

The canonical consistency boundary remains:

> **NarrativeProject**

A Schedule Exception authoring mutation may need to inspect, atomically:

- `scheduleExceptions`;
- `characters`;
- `locations`;
- `template.dayCount`;
- `template.periods`.

Therefore the mutation is conceptually:

`NarrativeProject -> ScheduleException collection transition`

not:

- a standalone Schedule Exception repository;
- a RoutineRule child mutation;
- an editor-only record;
- a simulation mutation.

### Aggregate member

`ScheduleException` remains an authored entity/value record identified by:

`ScheduleException.id`

For this slice its id is stable.

Editing an exception does not re-key it.

### Collection identity rules

- add requires a new unique exception id;
- update requires an existing exception with the same id;
- remove targets an existing id;
- remove must remain possible even if the stored record contains stale or otherwise uneditable imported fields.

## 3. Existing canonical persisted model remains unchanged

Current domain shape:

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

Stage 2 decision:

> **Do not add persisted fields for A67-D3 first slice.**

In particular, do not add:

- `routineRuleId`;
- `mode`;
- `selected`;
- `resolvedLocation`;
- `conflictStatus`;
- `isLegacy`;
- `runtimeApplied`;
- editor form state.

All such concepts, if needed, are derived/application/presentation state.

## 4. Model classification

### ENTITY-SE-001 — ScheduleException

**Classification:** existing canonical authored record.

**Identity:** `id`.

**Owned collection:** `NarrativeProject.scheduleExceptions`.

**Current persisted fields:** unchanged.

### VO-SE-001 — Normalized Schedule Exception Window

**Classification:** read-side/application Value Object.

**Persistence:** never a second persisted owner.

Conceptual shape:

```ts
type NormalizedScheduleExceptionWindow =
  | {
      type: 'period';
      periodId: string;
    }
  | {
      type: 'exact';
      startMinute: number;
      endMinute: number;
      endDayOffset: 0 | 1;
    };
```

Purpose:

- give modern `timeWindow` and legacy top-level `periodId` one semantic comparison vocabulary;
- make inferred exact-window day offset explicit for comparison;
- avoid treating persistence compatibility shape as a second authoring model.

### VO-SE-002 — Schedule Exception Intent

**Classification:** application authoring Value Object.

Conceptual valid new-write variants:

```ts
type ScheduleExceptionIntent =
  | {type: 'location'; locationId: EntityId}
  | {type: 'absent'};
```

This is **not** a persisted replacement for existing optional fields.

It is a safer authoring representation that serializes back to the existing ScheduleException shape.

### VO-SE-003 — Schedule Exception Authoring Candidate

**Classification:** validated application Value Object.

**Persistence:** not persisted directly as a new model.

Conceptual shape:

```ts
interface ScheduleExceptionAuthoringCandidate {
  id: EntityId;
  characterId: EntityId;
  activeRange: DayRange;
  timeWindow: NormalizedScheduleExceptionWindow;
  intent: ScheduleExceptionIntent;
  priority: number;
  reason?: string;
}
```

A Candidate represents a complete value that is valid enough to attempt add/update against the current NarrativeProject.

It deliberately excludes:

- legacy top-level `periodId`;
- incomplete form state;
- conflicting `absent + targetLocationId`;
- unresolved references.

### VO-SE-004 — Resolved Schedule Exception Authoring View

**Classification:** pure read-side/application projection.

**Persistence:** never persisted.

Purpose:

- inspect current raw canonical data safely;
- resolve references;
- identify legacy/stale/conflicting states without render-time mutation;
- provide enough information to initialize an edit draft.

The exact TypeScript representation is deferred, but it must preserve the distinctions below.

## 5. Read-side Character resolution

Conceptual Character reference state:

```ts
type ResolvedScheduleExceptionCharacter =
  | {
      status: 'resolved';
      characterId: EntityId;
      character: NarrativeCharacter;
    }
  | {
      status: 'unresolved';
      characterId: EntityId;
    };
```

Rules:

- current canonical Character lookup determines resolved/unresolved;
- unresolved is a **read result**, not a new ScheduleException variant;
- rendering unresolved Character must not mutate the stored exception;
- a new/update Candidate requires a currently existing Character.

## 6. Read-side intent resolution

Stored raw fields permit more combinations than the new-write authoring form.

The read model must distinguish them.

Conceptually:

```ts
type ResolvedScheduleExceptionIntent =
  | {
      status: 'location-resolved';
      locationId: EntityId;
      location: NarrativeLocation;
    }
  | {
      status: 'location-unresolved';
      locationId: EntityId;
    }
  | {
      status: 'absent';
    }
  | {
      status: 'conflicting';
      locationId: EntityId;
      location?: NarrativeLocation;
    }
  | {
      status: 'unspecified';
    };
```

### Resolution rules

1. `absent === true` and `targetLocationId` exists:
   - `conflicting`.
2. `absent === true` and no target:
   - `absent`.
3. target exists and absence is not true:
   - resolve Location;
   - `location-resolved` or `location-unresolved`.
4. neither semantic intent exists:
   - `unspecified`.

### Important distinction

New writes allow only:

- location;
- absent.

Read-side inspection must still tolerate:

- conflicting;
- unspecified;
- unresolved location.

No automatic repair occurs.

## 7. Read-side active range resolution

Current canonical shape:

```ts
interface DayRange {
  fromDay: number;
  toDay?: number;
}
```

The authoring read model should classify valid intent as:

```ts
type ResolvedScheduleExceptionRange =
  | {
      status: 'valid';
      mode: 'one-day';
      fromDay: number;
      toDay: number;
    }
  | {
      status: 'valid';
      mode: 'bounded';
      fromDay: number;
      toDay: number;
    }
  | {
      status: 'valid';
      mode: 'through-project-end';
      fromDay: number;
    }
  | {
      status: 'invalid';
      raw: DayRange;
    };
```

### Semantic rules

- one day: `toDay === fromDay`;
- bounded: `toDay > fromDay`;
- through project end: `toDay === undefined`;
- valid days must be inside current `template.dayCount`;
- `toDay < fromDay` is invalid.

### No equivalence collapse

`{fromDay: 7}`

and

`{fromDay: 7, toDay: project.template.dayCount}`

may currently expand over the same days, but they express different authored intent:

- open through project end;
- explicitly bounded.

They are **not** semantically equal for authoring no-op purposes.

## 8. Read-side time-window resolution

The read projection must mirror the precedence already used by current schedule readers.

### Precedence

1. if `timeWindow` exists, it is the modern authored source;
2. otherwise, if legacy `periodId` exists, it is the compatibility source;
3. otherwise, the stored exception has no resolvable time-window source.

### Conceptual read states

```ts
type ResolvedScheduleExceptionWindow =
  | {
      status: 'resolved';
      source: 'modern' | 'legacy-period';
      value: NormalizedScheduleExceptionWindow;
    }
  | {
      status: 'unresolved-period';
      source: 'modern' | 'legacy-period';
      periodId: string;
    }
  | {
      status: 'invalid-exact';
      startMinute: number;
      endMinute: number;
      endDayOffset?: number;
    }
  | {
      status: 'missing';
    };
```

### Period resolution

A period window is resolved only when its `periodId` exists in current:

`project.template.periods`.

Missing periods remain inspectable as unresolved.

### Exact normalization

For comparison/read projection:

```ts
effectiveEndDayOffset =
  timeWindow.endDayOffset
    ?? (timeWindow.endMinute < timeWindow.startMinute ? 1 : 0)
```

The normalized exact window uses an explicit `0 | 1`.

This mirrors current authored schedule interpretation.

### Exact structural validity

A Candidate requires:

- integer `startMinute`;
- integer `endMinute`;
- each in `0..1439`;
- `endDayOffset` in `0 | 1`;
- effective end absolute minute strictly greater than start absolute minute.

This permits the existing model's explicit next-day intervals and rejects zero/negative effective windows.

Stage 2 does not invent a narrower "must be less than 24 hours" rule because the current type permits `endDayOffset: 1`.

## 9. Modern source vs shadowed legacy periodId

A stored exception can theoretically contain both:

- modern `timeWindow`;
- legacy `periodId`.

Current readers give `timeWindow` precedence.

A67-D3 must preserve that behavior.

Therefore:

- read semantics use `timeWindow`;
- a shadowed legacy `periodId` is compatibility residue, not a second active window;
- rendering does not remove it;
- same-value Apply does not create history merely to clean it;
- a **meaningful explicit edit** may serialize the resulting exception in modern form and omit legacy `periodId`.

## 10. Transient authoring draft

Incomplete UI state is required while the author fills the form.

It must remain presentation/application state only.

Conceptual vocabulary:

```ts
type ScheduleExceptionRangeDraft =
  | {mode: 'one-day'; day?: number}
  | {mode: 'bounded'; fromDay?: number; toDay?: number}
  | {mode: 'through-project-end'; fromDay?: number};

type ScheduleExceptionWindowDraft =
  | {type: 'period'; periodId?: string}
  | {
      type: 'exact';
      startMinute?: number;
      endMinute?: number;
      endDayOffset?: 0 | 1;
    };

type ScheduleExceptionIntentDraft =
  | {type: 'unset'}
  | {type: 'location'; locationId?: EntityId}
  | {type: 'absent'}
  | {
      type: 'conflicting-import';
      locationId: EntityId;
    };

interface ScheduleExceptionDraft {
  mode: 'create' | 'edit';
  id: EntityId;
  characterId?: EntityId;
  range: ScheduleExceptionRangeDraft;
  window: ScheduleExceptionWindowDraft;
  intent: ScheduleExceptionIntentDraft;
  priority?: number;
  reason: string;
}
```

Exact React field-string handling is deferred to component design.

### Draft invariants

An incomplete Draft may exist locally.

It must never be inserted into `NarrativeProject.scheduleExceptions`.

## 11. Candidate construction

A pure conceptual operation converts:

`Draft + current NarrativeProject -> Candidate validation result`.

Candidate construction must:

1. preserve stable exception id;
2. resolve Character against current project;
3. construct valid DayRange;
4. resolve/validate period or exact time window;
5. require one explicit new-write intent;
6. resolve Location for location intent;
7. require finite numeric priority;
8. normalize optional reason according to authoring policy.

Only a complete valid draft becomes a Candidate.

## 12. Reason normalization decision

Stage 1 left whitespace handling open.

Stage 2 defines the authoring comparison/write policy:

```ts
normalizedReason = reason.trim() || undefined
```

Why:

- `reason` is optional human-authored metadata;
- whitespace-only text has no useful authored meaning;
- the project already uses trimmed authoring metadata in other authoring paths;
- the normalization can live in Candidate construction and does not require changing the persisted shape.

### Imported reason behavior

Read rendering preserves access to the raw stored reason.

Rendering does not mutate it.

For semantic comparison, current stored reason is compared using the same trim/blank normalization.

Therefore opening an exception whose only difference is surrounding whitespace and pressing Apply need not create history solely for whitespace cleanup.

A later **meaningful edit** may serialize the normalized reason.

## 13. Priority model

Priority remains:

`number`

Candidate validity requires:

```ts
Number.isFinite(priority)
```

Stage 2 deliberately does **not** require integer-only values.

Reason:

Stage 1 found no current domain evidence for an integer-only restriction.

Semantic equality uses numeric equality after finite validation.

No hidden default priority exists in the Candidate model.

## 14. Candidate serialization to existing canonical shape

A valid Candidate serializes to the existing `ScheduleException`.

### Location intent

Conceptually:

```ts
{
  id,
  characterId,
  activeRange,
  timeWindow: modernTimeWindow,
  targetLocationId: intent.locationId,
  priority,
  reason
}
```

No new top-level `periodId`.

No authored `absent: true`.

### Absent intent

Conceptually:

```ts
{
  id,
  characterId,
  activeRange,
  timeWindow: modernTimeWindow,
  absent: true,
  priority,
  reason
}
```

No target Location.

No new top-level `periodId`.

### Important

This serialization is a **write projection**, not a new persistence schema.

The final stored object remains `ScheduleException`.

## 15. Semantic comparison model

Stage 1 requires semantically unchanged Apply to be a true no-op.

Comparison therefore must not use raw object identity.

Conceptual operation:

`scheduleExceptionAuthoringEquals(currentStored, candidate, project)`

### Comparable fields

Semantic equality requires equality of:

- same exception id;
- same Character id;
- same authored DayRange intent;
- same normalized time-window meaning;
- same unambiguous intent;
- same Location id for location intent;
- same finite priority;
- same normalized reason.

### Legacy period equivalence

These are semantically equal for authoring:

```ts
{periodId: 'day', timeWindow: undefined}
```

and:

```ts
{timeWindow: {type: 'period', periodId: 'day'}}
```

provided all other authored fields are semantically equal.

Therefore Apply must not create a history entry merely to modernize a legacy period representation.

### Exact-window equivalence

An exact window with omitted `endDayOffset` compares using the same inferred effective offset as current schedule readers.

Example:

```ts
{type:'exact', startMinute: 1380, endMinute: 60}
```

is semantically equivalent to:

```ts
{type:'exact', startMinute: 1380, endMinute: 60, endDayOffset: 1}
```

for no-op comparison.

### Non-comparable imported states

A stored record with:

- unresolved Character;
- unresolved Location;
- conflicting location + absence;
- unspecified intent;
- unresolved/missing/invalid window;
- invalid range;
- invalid priority

cannot silently become a valid Candidate by equality inference.

It must be explicitly repaired or removed.

## 16. Validation vocabulary

Stage 2 defines conceptual result statuses.

Exact production type names remain deferred to Stage 5/6.

### Candidate/build validation

```ts
type ScheduleExceptionCandidateValidation =
  | {status: 'valid'; candidate: ScheduleExceptionAuthoringCandidate}
  | {status: 'invalid-id'}
  | {status: 'missing-character'; characterId: EntityId}
  | {status: 'invalid-active-range'}
  | {status: 'invalid-time-window'}
  | {status: 'missing-period'; periodId: string}
  | {status: 'invalid-priority'}
  | {status: 'missing-intent'}
  | {status: 'conflicting-intent'}
  | {status: 'missing-location'; locationId: EntityId};
```

Not every UI draft needs to surface these exact labels.

The taxonomy exists to keep validation deterministic and testable.

## 17. Add validation semantics

Conceptual operation:

`validateScheduleExceptionAdd(project, candidate)`

Deterministic logical checks:

1. candidate id is nonblank/usable;
2. no existing Schedule Exception has that id;
3. Character exists;
4. active range is valid;
5. time window is valid/resolved;
6. priority is finite;
7. intent is valid;
8. Location exists when intent is Location;
9. result is valid add.

Required add-specific failure:

```ts
{status: 'duplicate-id'; id}
```

A conflict with another exception's time/priority is **not** structural invalidity.

Existing schedule analysis remains responsible for ambiguity warnings.

## 18. Update validation semantics

Conceptual operation:

`validateScheduleExceptionUpdate(project, candidate)`

Logical checks:

1. existing exception with `candidate.id` exists;
2. Candidate references/range/window/priority/intent remain valid against current project;
3. compare current stored exception against Candidate semantically;
4. if equal -> `unchanged`;
5. otherwise -> valid update.

Required update-specific failure:

```ts
{status: 'missing-exception'; id}
```

### Identity rule

Update does not rename/re-key an exception.

If future UX needs id changes, that is a separate delete/add-style requirement.

## 19. Remove validation semantics

Conceptual operation:

`validateScheduleExceptionRemove(project, id)`

Results:

- removable;
- missing-exception.

### Critical rule

Remove does **not** require the stored exception to pass current add/update validation.

Why:

An imported stale/conflicting exception must still be deletable.

Therefore remove checks identity only.

## 20. Mutation result vocabulary

Conceptual authored operation result:

```ts
type ScheduleExceptionMutationResult =
  | {
      status: 'added';
      exception: ScheduleException;
    }
  | {
      status: 'updated';
      previous: ScheduleException;
      next: ScheduleException;
    }
  | {
      status: 'removed';
      previous: ScheduleException;
    }
  | {
      status: 'unchanged';
      exception: ScheduleException;
    }
  | {
      status: 'rejected';
      reason: ScheduleExceptionMutationRejection;
    };
```

This is Stage 2 vocabulary only.

Current reducer architecture may encode outcomes through exact project identity rather than returning this type publicly.

Stage 3 must verify the smallest integration shape.

## 21. Aggregate transition rules

### Add

If valid and id is unique:

- append exactly one canonical ScheduleException;
- do not alter Routine Rules;
- do not alter runtime state.

### Update

If valid and semantically changed:

- replace exactly one ScheduleException with the same id;
- write modern `timeWindow`;
- write one unambiguous new-write intent;
- preserve all unrelated exception records;
- do not alter Routine Rules;
- do not alter runtime state.

### Remove

If id exists:

- remove exactly one ScheduleException;
- preserve Routine Rules;
- preserve all unrelated project state.

### No-op/rejected

Return the exact original authored project object when possible under existing reducer architecture.

This allows current authoring history wrapper to avoid a new Undo entry.

## 22. Schedule Exception authoring state machine

At collection level:

```text
                    +------------------+
                    |    Nonexistent   |
                    +------------------+
                       |            ^
                 valid add        remove
                       v            |
                    +------------------+
                    |      Exists      |
                    +------------------+
                       |            |
                 valid update     same-value
                       |            |
                       v            v
                    +------------------+
                    | Exists (changed) |
                    +------------------+
```

Invalid add/update/remove requests leave the project unchanged.

Same-value update is a no-op.

## 23. Imported/stale record lifecycle

A stored exception may be:

- fully authorable;
- legacy-window but semantically valid;
- unresolved Character;
- unresolved Location;
- conflicting location + absence;
- unspecified intent;
- invalid range/window/priority.

The read model must still allow:

- list rendering;
- inspection;
- Remove.

### Repair

A repair requires constructing a new valid Candidate explicitly.

Repair is a meaningful authored update.

### No render repair

Opening/listing/editing does not mutate the raw stored exception.

## 24. Legacy-to-modern write rule

Stage 1 requires modern writes but no history noise from representation-only modernization.

Therefore:

### Same semantic value

If a valid legacy record resolves to the same Candidate:

- exact project no-op;
- keep raw legacy representation unchanged;
- no history entry.

### Meaningful edit

If at least one authored semantic field changes:

- serialize the resulting whole exception using modern `timeWindow`;
- omit legacy `periodId`;
- preserve only the new explicit Location/Absent intent;
- normalize reason.

This creates one intentional modernization boundary without a load-time migration.

## 25. Diagnostics are outside mutation validity

Existing schedule analysis owns:

- different-priority overlap interpretation;
- equal maximum-priority ambiguity warning.

Therefore Candidate/Add/Update validation must not ask:

> "Does this create a Story Brain ambiguity?"

as a validity requirement.

After a successful authored mutation:

`canonical project -> existing schedule analysis -> findings`

This preserves:

`validation != diagnostics`.

## 26. Project Search is a derived projection

Project Search already derives documents from:

`project.scheduleExceptions`.

No search-specific Schedule Exception state belongs in the authoring model.

After add/update/remove, search output is recomputed from canonical project state.

Therefore:

- no search mutation command;
- no search index persistence;
- no search cache invalidation protocol is required at the domain model level.

## 27. Runtime state is outside the authoring model

Forbidden inputs to Schedule Exception authored validation/transition:

- Simulation Playhead;
- `simulation.actualLocationByCharacter`;
- runtime memories;
- runtime Story execution;
- current Player action;
- runtime item placement;
- runtime occurrence history.

Forbidden outputs:

- Actual Presence mutation;
- Simulation Playhead mutation;
- Story execution;
- Player action;
- runtime save mutation.

Allowed authored inputs:

- Schedule Exception collection;
- Characters;
- Locations;
- project template day count;
- project template periods;
- candidate authored fields.

### Consequence

The mutation can be implemented/tested as a pure authored-project transition.

## 28. RoutineRule is outside exception ownership

Schedule Exception authoring may visually coexist with recurring RoutineRule authoring.

It does not mean one is owned by the other.

No Stage 2 model introduces:

- `routineRuleId`;
- routine mutation as a side effect;
- BehaviorProfile validation for exceptions;
- recurrence for exceptions.

The only shared concepts are reusable validation primitives:

- day;
- minute;
- period;
- canonical reference lookup.

## 29. Persistence semantics

Current persistence projection defines authored state as NarrativeProject minus explicit runtime/editor keys.

`scheduleExceptions` is not excluded from the authored projection.

Therefore the current architecture already classifies it as authored persistence data.

Stage 2 implication:

- no new persisted collection;
- no runtime projection field;
- no editor projection field;
- no schema field justified by the authoring UI.

Stage 4 must still verify real save/reopen behavior with focused evidence.

## 30. Authoring history semantics

The current authoring reducer wrapper only creates a new history entry when the mutation returns a different project object.

Therefore the model aligns with existing infrastructure:

### Meaningful transitions

- add;
- semantically changed update;
- remove.

These should return a new authored project.

### No meaningful transition

- invalid draft/candidate;
- duplicate id;
- missing exception;
- missing Character/Location/period;
- invalid range/window/priority;
- same semantic update.

These should preserve exact project identity at the mutation boundary where architecture permits.

Stage 3 must verify runtime-preserving Undo/Redo integration for this command family rather than inventing a new history stack.

## 31. Explicit non-entities / non-models

Do not introduce for A67-D3 first slice:

- ScheduleExceptionEntity with separate persistence table;
- ScheduleOverrideRule entity;
- ExceptionPriorityBand entity;
- RuntimeScheduleException entity;
- persisted ScheduleExceptionDraft;
- ScheduleExceptionSelection persisted in NarrativeProject;
- global ScheduleException AuthorFocus;
- RoutineRuleExceptionLink;
- ExceptionConflictResolution entity;
- timeline marker as canonical state;
- exception-specific runtime queue.

None are justified by Stage 0/1 requirements.

## 32. Domain/application invariants

### INV-SE-001

`NarrativeProject.scheduleExceptions[]` is the single canonical authored owner.

### INV-SE-002

`ScheduleException != RoutineRule`.

### INV-SE-003

`Authored Schedule Intent != Actual Presence`.

### INV-SE-004

`View Cursor != Simulation Playhead`.

### INV-SE-005

New writes use modern `timeWindow`.

### INV-SE-006

Legacy `periodId` remains read-compatible and is not rewritten on render.

### INV-SE-007

One valid new-write exception intent is either Location or Absent.

### INV-SE-008

Imported conflicting/unspecified/stale intent is read-side state requiring explicit repair, not automatic mutation.

### INV-SE-009

A new/update Character reference must resolve in current NarrativeProject.

### INV-SE-010

A Location intent target must resolve in current NarrativeProject.

### INV-SE-011

Priority must be finite; ambiguity is diagnostic, not structural invalidity.

### INV-SE-012

Semantically equal update is a true authored no-op.

### INV-SE-013

Remove depends on exception identity only and remains available for malformed/stale imported records.

### INV-SE-014

Schedule Exception authored mutation does not read or write Playhead/Actual Presence as transition inputs/outputs.

### INV-SE-015

Incomplete form Draft never enters the canonical project.

## 33. Conceptual API vocabulary for later stages

Stage 2 does not approve file layout.

Later stages may use vocabulary equivalent to:

```ts
resolveScheduleExceptionForAuthoring(project, exception)

buildScheduleExceptionCandidate(project, draft)

scheduleExceptionAuthoringEquals(project, current, candidate)

validateScheduleExceptionAdd(project, candidate)

validateScheduleExceptionUpdate(project, candidate)

validateScheduleExceptionRemove(project, id)

applyScheduleExceptionAuthoringCommand(project, command)
```

Architecture must prefer the smallest set actually needed.

Do not create helpers solely because they are listed conceptually.

## 34. Stage 1 questions resolved

### Q1 — raw canonical persisted ScheduleException

Unchanged existing `ScheduleException` inside `NarrativeProject.scheduleExceptions[]`.

### Q2 — uniform legacy/modern window representation

Use non-persisted `NormalizedScheduleExceptionWindow`.

Modern `timeWindow` wins when present; legacy `periodId` is fallback only.

### Q3 — unresolved Character/Location references

Represent as read-side resolved/unresolved states.

Do not mutate raw data on read.

### Q4 — conflicting imported absent + targetLocationId

Represent as read-side `conflicting`.

Do not infer a winner.

New Candidate cannot be constructed until author chooses one intent.

### Q5 — exact transient draft shape

Local create/edit Draft with partial range/window/intent/priority fields.

Not persisted.

### Q6 — valid Candidate threshold

Candidate requires:

- usable id;
- existing Character;
- valid DayRange;
- valid modern-resolvable time window;
- one explicit valid Location/Absent intent;
- existing Location when required;
- finite priority;
- normalized optional reason.

### Q7 — semantic equality

Compare authored meaning, not raw representation.

Legacy period and equivalent modern period are equal.

Exact windows compare using effective day offset.

Range mode remains semantically significant.

### Q8 — validation statuses

Minimum taxonomy includes:

- invalid-id;
- duplicate-id;
- missing-exception;
- missing-character;
- invalid-active-range;
- invalid-time-window;
- missing-period;
- invalid-priority;
- missing-intent;
- conflicting-intent;
- missing-location;
- unchanged;
- valid add/update/remove.

### Q9 — add/update/remove history identity

Only meaningful collection transitions create new authored project identity/history.

Rejected and same-value requests remain exact no-op where architecture allows.

### Q10 — runtime independence

Required mutation context excludes Simulation and Actual Presence entirely.

## 35. Requirement / Use Case / Model traceability

| Requirement | Use Cases | Model owner | Rule / service | Status |
|---|---|---|---|---|
| REQ-SE-001 canonical owner | UC-001/006/008/019 | ENTITY-SE-001 | INV-SE-001 | ✅ modeled |
| REQ-SE-002 typed CRUD/history | UC-001/006/007/008/020 | NarrativeProject collection transition | §§17–22/30 | ✅ modeled |
| REQ-SE-003 Character validation | UC-001/012/016 | resolved Character + Candidate | §§5/11/17–18 | ✅ modeled |
| REQ-SE-004 day range | UC-001/005/014 | Resolved range + Candidate | §§7/11 | ✅ modeled |
| REQ-SE-005 modern timeWindow | UC-001/003/004/014/015 | normalized window | §§8–9/24 | ✅ modeled |
| REQ-SE-006 location/absence | UC-001/002/013/016/017 | intent VO + resolved intent | §§6/14 | ✅ modeled |
| REQ-SE-007 priority | UC-001/006/010/011/014 | Candidate priority | §§13/25 | ✅ modeled |
| REQ-SE-008 reason | UC-001/006 | normalized optional metadata | §12 | ✅ modeled |
| REQ-SE-009 runtime separation | UC-001/007/018 | external runtime state | §27 / INV-SE-003/004/014 | ✅ modeled |
| REQ-SE-010 diagnostics owner | UC-008/010/011 | existing schedule-analysis | §25 | ✅ modeled |
| REQ-SE-011 search compatibility | UC-008/009 | derived index | §26 | ✅ modeled |
| REQ-SE-012 persistence | UC-009/015/016 | authored projection | §29 | ✅ modeled |
| REQ-SE-013 semantic no-op | UC-006/007/012/013/014/020 | semantic comparator | §§15/20/30 | ✅ modeled |

## 36. Stage 2 architecture findings

### FINDING-SE-009 — no domain schema addition is justified

Every required authored state already fits current ScheduleException.

Draft/resolution/candidate concepts are non-persisted.

### FINDING-SE-010 — raw persisted shape and valid new-write shape should differ

The raw shape must remain permissive enough to read legacy/imported data.

The authoring Candidate should be stricter:

- modern timeWindow;
- explicit unambiguous intent;
- valid references;
- finite priority.

This avoids a load-time migration while preventing new ambiguous records from normal UI.

### FINDING-SE-011 — semantic normalization is required for no-op correctness

Raw object equality would incorrectly treat:

- legacy period vs modern period;
- inferred vs explicit exact end-day offset;
- blank vs absent reason

as meaningful authoring changes.

A normalized comparison boundary is therefore required.

### FINDING-SE-012 — read resolver and write validator have different jobs

Read resolver must tolerate stale/conflicting records.

Write validator must reject unresolved/incomplete candidates.

One generic `isValidScheduleException` boolean would lose required semantics.

### FINDING-SE-013 — remove has intentionally weaker validity requirements than update

A stale imported record must remain removable.

Therefore remove validates identity only.

### FINDING-SE-014 — current authoring history identity rule is reusable

Existing `narrativeProjectAuthoringReducer` already skips history when the mutation returns exact current project.

A67-D3 should fit that boundary instead of inventing a second history mechanism.

### FINDING-SE-015 — shared schedule validation should be primitive-level

Routine and exception authoring share:

- day validity;
- minute validity;
- period resolution;
- possibly exact-window normalization.

They do **not** share:

- recurrence;
- BehaviorProfile requirement.

Stage 3 must identify the best existing owner for reusable primitives.

### FINDING-SE-016 — diagnostics remain post-mutation derived analysis

Priority ties are not Candidate invalidity.

The existing schedule-analysis owner should remain unchanged unless later architecture verification discovers a real defect.

### FINDING-SE-017 — persistence already classifies scheduleExceptions as authored

Current projection excludes explicit runtime/editor keys; scheduleExceptions remains in authored projection.

Likely implementation needs persistence regression tests, not production persistence changes.

## 37. Gate Review — Stage 2 → Stage 3 Existing Architecture Verification

### Model checks

✅ Canonical aggregate root defined.

✅ Existing persisted shape retained.

✅ Raw/read/draft/candidate concepts separated.

✅ Legacy period compatibility modeled without migration.

✅ Exact cross-midnight normalization modeled.

✅ Character/Location stale-reference read states modeled.

✅ Conflicting/unspecified intent modeled.

✅ Priority validity separated from ambiguity diagnostics.

✅ Add/update/remove identity semantics defined.

✅ Same-value no-op semantics defined.

✅ Remove of stale records remains possible.

✅ Runtime state excluded from authored transition model.

### Traceability checks

✅ Every Stage 1 scenario has a model representation.

✅ Every Stage 0 requirement maps to model rules.

✅ No new persisted entity is required.

✅ No new runtime entity is required.

### Questions Stage 3 must verify in current code

1. Where should shared day/minute/period/exact-window authoring primitives live without creating circular ownership?
2. Can Schedule Exception commands extend current `NarrativeAuthoringCommand` alongside Routine commands cleanly?
3. Does current authoring history wrapper preserve exact no-op identity for the new command family?
4. Where can resolved read/candidate helpers live so domain `schedule.ts` remains canonical types rather than UI logic?
5. Does existing RoutineAuthoringPanel have a safe component boundary for a separate exceptions section, or should a sibling component be introduced?
6. Does existing Project Search require zero production changes for CRUD reflection?
7. Does current schedule-analysis require zero production changes for post-authoring ambiguity reflection?
8. Does current persistence projection/repository already round-trip ScheduleException fields unchanged?
9. Does authoring Undo/Redo preserve current runtime state through the existing provider/history boundary?
10. Which files are proven in/out of the implementation blast radius?

### Gate decision

**✅ PASS to Stage 3 Existing Architecture Verification.**

No Stage 2 BLOCKER exists.

Production implementation remains prohibited until Stage 3–8 complete and Stage 4 approves the blast radius.

## 38. Next concrete stage — do not skip

**Stage 3: Existing Architecture Verification for Schedule Exception Authoring.**

At minimum it must inspect and trace:

- `src/domain/narrative/schedule.ts`;
- `src/domain/narrative/world-time.ts`;
- `src/domain/narrative/schedule-analysis.ts`;
- `src/store/narrative-project/routine-authoring.ts`;
- `src/store/narrative-project/reducer.ts`;
- `src/store/narrative-project/runtime-history.ts`;
- Narrative Project provider/history integration;
- `src/components/narrative/workspace/routine-authoring-panel.tsx`;
- `src/components/narrative/workspace/world-time-workspace.tsx`;
- Project Search;
- Story Brain diagnostic navigation;
- persistence projection/repository;
- focused existing tests.

Only after Stage 3 has proven actual code owners may Stage 4 freeze the implementation blast radius.
