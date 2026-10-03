# 93 Days — A67-D3 Schedule Exception Authoring · Stage 8 Detailed Design

Status: **STAGE 8 COMPLETE — PASS to Implementation**
Base: `93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`
Design head before this document: `40784d4ab541d29db39b666526c3bf0b5388797e`
Stage 7 exact-head Branch Check: **#37117840047 GREEN**
Depends on A67-D3 Stage 0–7 documents.
Date: **2026-10-03**
Change type: **detailed design only**
Production code in this stage: **none**

## 0. Goal / Definition of Done

Stage 8 converts the approved A67-D3 architecture, contracts and dynamic flows into an implementation-ready design.

Definition of Done:

1. exact production files remain inside frozen Stage 4 boundary;
2. exact core imports/exports/helper decomposition are fixed;
3. exact resolver/validator/equality/serialization/apply algorithms are fixed;
4. exact router insertion shape is fixed;
5. exact React local state model is fixed;
6. every raw legacy/stale/conflicting state has deterministic draft initialization;
7. source revision / ABA mechanics are implementation-ready;
8. pending Add/Update/Remove settlement works without timers or command-result API;
9. exact handlers and canonical-confirmation ordering are fixed;
10. exact summary/accessible wording seams are fixed;
11. composition point in RoutineAuthoringPanel is fixed;
12. no CSS change is expected;
13. exact test files/scenarios and implementation commit sequence are fixed;
14. no schema/migration/runtime/persistence/Search/diagnostic/timeline production change is required;
15. no production implementation is included in Stage 8.

## 1. Verified Stage 8 baseline

Verified at design head:

`40784d4ab541d29db39b666526c3bf0b5388797e`

Stable remains:

`93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`

Stage 7 exact-head CI:

- Branch Check #37117840047 — SUCCESS;
- verify — SUCCESS;
- windows-electron-launch-contract — SUCCESS.

PR #48 is:

- open;
- draft;
- mergeable;
- not merged.

Production tree for D3 is still unchanged.

## 2. ADR-D8-SE-001 — exact production file impact

### New production files

```text
src/store/narrative-project/schedule-exception-authoring.ts
src/components/narrative/workspace/schedule-exception-authoring-panel.tsx
```

### Modified production files

```text
src/store/narrative-project/routine-authoring.ts
src/components/narrative/workspace/routine-authoring-panel.tsx
```

### CSS

No production CSS modification is expected.

### Forbidden without reopening Stage 4

```text
src/domain/narrative/schedule.ts
src/domain/narrative/project.ts
src/domain/narrative/project-factory.ts
schema/migration modules

src/store/narrative-project/runtime-history.ts
src/store/narrative-project/runtime-snapshot.ts
src/store/narrative-project/narrative-project-context.tsx
src/store/narrative-project/persistence-projection.ts
src/store/narrative-project/repository.ts

src/domain/narrative/schedule-analysis.ts
src/application/narrative/project-search.ts
src/application/narrative/story-brain-diagnostic-navigation.ts
src/application/narrative/authoring-navigation.ts

src/components/narrative/workspace/world-time-indexes.ts
src/components/narrative/workspace/world-time-workspace.tsx
src/components/narrative/workspace/narrative-workspace.tsx

Player/compiler/export
A67-D1 AuthorFocus
AI
```

If implementation proves a forbidden production file is required, stop and amend Stage 4 before proceeding.

# 3. New core module — exact imports and exports

Path:

`src/store/narrative-project/schedule-exception-authoring.ts`

Exact conceptual imports:

```ts
import {
  NarrativeCharacter,
  NarrativeLocation
} from '../../domain/narrative/entities';
import {NarrativeProject} from '../../domain/narrative/project';
import {
  RoutineTimeWindow,
  ScheduleException
} from '../../domain/narrative/schedule';
```

Exact public export surface remains Stage 6 CONTRACT-SE-040.

Types:

- `NormalizedScheduleExceptionWindow`;
- `ScheduleExceptionAuthoringIntent`;
- `ScheduleExceptionAuthoringCandidate`;
- `ScheduleExceptionAuthoringCommand`;
- `ResolvedScheduleExceptionCharacter`;
- `ResolvedScheduleExceptionRange`;
- `ResolvedScheduleExceptionWindow`;
- `ResolvedScheduleExceptionIntent`;
- `ResolvedScheduleExceptionForAuthoring`;
- `ScheduleExceptionCandidateValidation`.

Functions:

- `resolveScheduleExceptionForAuthoring`;
- `validateScheduleExceptionCandidate`;
- `scheduleExceptionAuthoringEquals`;
- `applyScheduleExceptionAuthoringCommand`;
- `isScheduleExceptionAuthoringCommand`.

No default export.

No React/runtime/Search/Story Brain imports.

# 4. Core internal helper decomposition

Keep internal helpers file-local.

Preferred internal helpers:

```ts
function dayIsValid(project: NarrativeProject, day: number): boolean;
function minuteIsValid(minute: number): boolean;

function normalizedExactOffset(
  startMinute: number,
  endMinute: number,
  endDayOffset: number | undefined
): 0 | 1 | undefined;

function exactWindowIsValid(
  startMinute: number,
  endMinute: number,
  endDayOffset: number
): boolean;

function normalizeReason(reason: string | undefined): string | undefined;

function serializeScheduleExceptionCandidate(
  candidate: ScheduleExceptionAuthoringCandidate
): ScheduleException;

function touched(project: NarrativeProject): NarrativeProject;
```

Do not export these.

Do not modify or reuse the private RoutineRule helpers in `routine-authoring.ts`.

## 4.1 dayIsValid

```ts
return (
  Number.isInteger(day) &&
  day >= 1 &&
  day <= project.template.dayCount
);
```

## 4.2 minuteIsValid

```ts
return Number.isInteger(minute) && minute >= 0 && minute < 24 * 60;
```

## 4.3 normalizedExactOffset

Rules:

1. if explicit value is `0` or `1`, return it;
2. if value is `undefined`, infer:
   - end < start → 1;
   - otherwise → 0;
3. any other runtime value → undefined.

This mirrors current executable schedule readers.

## 4.4 exactWindowIsValid

Requires:

- valid integer start;
- valid integer end;
- offset 0 or 1;
- `endMinute + endDayOffset * 1440 > startMinute`.

Same-time +1 day is valid.

Same-time +0 is invalid.

# 5. resolveScheduleExceptionForAuthoring exact algorithm

Input:

- current project;
- raw ScheduleException.

Output:

`ResolvedScheduleExceptionForAuthoring`.

## Character

Lookup raw `characterId`.

Found:

```ts
{status:'resolved', characterId, character}
```

Missing:

```ts
{status:'unresolved', characterId}
```

No fallback.

## Range

Read raw `activeRange.fromDay` and optional `toDay`.

If invalid bounds/order:

```ts
{status:'invalid', fromDay, toDay}
```

Else:

- `toDay === undefined` → through-project-end;
- `toDay === fromDay` → one-day;
- otherwise → bounded.

Do not convert open-ended to project final day.

## Window precedence

1. raw `timeWindow`;
2. else legacy raw top-level `periodId`;
3. else missing.

### Modern/legacy period

Period exists in template:

```ts
{
  status:'resolved',
  source:'modern' | 'legacy-period',
  value:{type:'period', periodId}
}
```

Missing period:

```ts
{
  status:'unresolved-period',
  source,
  periodId
}
```

### Exact

Compute normalized offset.

If:

- invalid minute;
- invalid explicit offset;
- non-positive effective interval;

return:

```ts
{
  status:'invalid-exact',
  startMinute,
  endMinute,
  endDayOffset
}
```

Otherwise:

```ts
{
  status:'resolved',
  source:'modern',
  value:{
    type:'exact',
    startMinute,
    endMinute,
    endDayOffset: normalizedOffset
  }
}
```

### Shadowed legacy residue

If `timeWindow` exists, ignore top-level legacy `periodId` for semantic read.

Do not delete it.

## Intent

Order:

1. `absent === true && targetLocationId` → conflicting;
2. `absent === true` → absent;
3. `targetLocationId` → Location resolved/unresolved;
4. otherwise → unspecified.

## Priority

`Number.isFinite(exception.priority)`

→ valid/invalid status.

# 6. validateScheduleExceptionCandidate exact algorithm

Validation order:

1. nonblank `candidate.id.trim()`;
2. Character exists;
3. activeRange:
   - from valid;
   - optional to valid;
   - optional to >= from;
4. time window:
   - period → period exists or `missing-period`;
   - exact → strict exact validity or `invalid-time-window`;
5. Location intent → Location exists;
6. priority finite.

Return exact Stage 6 statuses.

Do not call ambiguity analysis.

Do not inspect Playhead/Actual Presence.

# 7. scheduleExceptionAuthoringEquals exact algorithm

Algorithm:

1. validate Candidate against project;
   - invalid → false;
2. resolve current raw exception;
3. require:
   - current id equals candidate id;
   - Character resolved;
   - range valid;
   - window resolved;
   - intent is resolved Location or Absent;
   - priority valid;
4. compare semantic values.

## Character

`resolved.characterId === candidate.characterId`.

## Range

Compare authored intent exactly:

### Candidate open-ended

Current must be `through-project-end` with same fromDay.

### Candidate explicit one-day/bounded

Current must not be through-project-end and must have equal numeric from/to.

Therefore:

`{fromDay:7}`

is not equal to:

`{fromDay:7,toDay:dayCount}`.

## Window

Period:

- both normalized period;
- equal period id.

Exact:

- both normalized exact;
- equal start/end/effective explicit offset.

This gives legacy-period and inferred-offset equivalence.

## Intent

Candidate Location:

current must be `location-resolved` with same Location id.

Candidate Absent:

current must be `absent`.

Unresolved/conflicting/unspecified current is never equal.

## Priority

Strict numeric equality.

## Reason

Compare:

`normalizeReason(current.reason) === normalizeReason(candidate.reason)`.

# 8. serializeScheduleExceptionCandidate exact shape

Use conditional object construction so new writes do not intentionally preserve compatibility residue.

Shared fields:

```ts
{
  id: candidate.id,
  characterId: candidate.characterId,
  activeRange: {...candidate.activeRange},
  timeWindow:
    candidate.timeWindow.type === 'period'
      ? {
          type:'period',
          periodId:candidate.timeWindow.periodId
        }
      : {
          type:'exact',
          startMinute:candidate.timeWindow.startMinute,
          endMinute:candidate.timeWindow.endMinute,
          endDayOffset:candidate.timeWindow.endDayOffset
        },
  priority: candidate.priority,
  ...normalizedReason
}
```

### Location intent

Add only:

`targetLocationId`.

Do not add:

- `absent`;
- top-level `periodId`.

### Absent intent

Add only:

`absent:true`.

Do not add:

- `targetLocationId`;
- top-level `periodId`.

### Reason

If normalized reason exists:

`reason: normalized`.

Otherwise omit it.

# 9. applyScheduleExceptionAuthoringCommand exact algorithm

## Add

```text
validate Candidate
→ invalid => exact project
→ duplicate id?
→ yes => exact project
→ serialize
→ append exactly one
→ touched(...)
```

## Update

```text
find same id
→ missing => exact project
→ validate Candidate
→ invalid => exact project
→ semantic equality?
→ yes => exact project
→ serialize
→ replace exactly one same-id record
→ touched(...)
```

Candidate id is the lookup id.

No separate command id field exists.

## Remove

```text
id exists?
→ no => exact project
→ filter exactly that id
→ touched(...)
```

No resolver/Candidate validation.

## Identity

Every no-op returns the exact input project object before `touched`.

# 10. isScheduleExceptionAuthoringCommand exact algorithm

```ts
return (
  command.type === 'scheduleException/add' ||
  command.type === 'scheduleException/update' ||
  command.type === 'scheduleException/remove'
);
```

No prefix matching.

# 11. routine-authoring.ts exact integration

Add import:

```ts
import {
  ScheduleExceptionAuthoringCommand,
  applyScheduleExceptionAuthoringCommand,
  isScheduleExceptionAuthoringCommand
} from './schedule-exception-authoring';
```

Extend:

`NarrativeAuthoringCommand`

with:

`ScheduleExceptionAuthoringCommand`.

## Fallback guard

Current fallback to `narrativeProjectHistoryReducer` must additionally require:

`!isScheduleExceptionAuthoringCommand(action.command)`.

## nextProject selection

Preferred minimal shape:

```ts
const nextProject = isScheduleExceptionAuthoringCommand(action.command)
  ? applyScheduleExceptionAuthoringCommand(state.present, action.command)
  : isRoutineCommand(action.command)
    ? applyRoutineCommand(state.present, action.command)
    : isStoryMetadataCommand(action.command)
      ? applyStoryMetadataCommand(state.present, action.command)
      : applyMoveConditionCommand(state.present, action.command);
```

Existing identity/history logic below remains unchanged.

Do not refactor RoutineRule helpers.

# 12. New UI component — imports

Path:

`src/components/narrative/workspace/schedule-exception-authoring-panel.tsx`

Conceptual imports:

```ts
import * as React from 'react';
import {formatMinuteOfDay} from '../../../domain/narrative/calendar';
import {ScheduleException} from '../../../domain/narrative/schedule';
import {useNarrativeProject} from '../../../store/narrative-project';
import {
  ResolvedScheduleExceptionForAuthoring,
  ScheduleExceptionAuthoringCandidate,
  ScheduleExceptionCandidateValidation,
  resolveScheduleExceptionForAuthoring,
  scheduleExceptionAuthoringEquals,
  validateScheduleExceptionCandidate
} from '../../../store/narrative-project/schedule-exception-authoring';
```

No runtime/Search/Story Brain imports.

# 13. File-local UI types

## Range draft

Use Stage 6 discriminated type:

```ts
type ScheduleExceptionRangeDraft =
  | {mode:'one-day'; day:string}
  | {mode:'bounded'; fromDay:string; toDay:string}
  | {mode:'through-project-end'; fromDay:string};
```

## Window draft

```ts
type ScheduleExceptionWindowDraft =
  | {mode:'period'; periodId:string}
  | {
      mode:'exact';
      startTime:string;
      endTime:string;
      endDayOffset:'0' | '1';
    };
```

## Intent draft

```ts
type ScheduleExceptionIntentDraft =
  | {mode:'unset'}
  | {mode:'location'; locationId:string}
  | {mode:'absent'}
  | {mode:'conflicting-import'; storedLocationId:string};
```

## Full form

```ts
interface ScheduleExceptionFormDraft {
  characterId: string;
  range: ScheduleExceptionRangeDraft;
  window: ScheduleExceptionWindowDraft;
  intent: ScheduleExceptionIntentDraft;
  priority: string;
  reason: string;
  windowNeedsExplicitRepair?: boolean;
}
```

The repair flag is local-only and handles raw exact data whose invalid offset cannot be represented by the valid `'0'|'1'` control without accidentally treating the substituted UI value as a deliberate repair.

## Edit source/state

```ts
interface ScheduleExceptionEditSource {
  id: string;
  revision: number;
  raw: ScheduleException;
}

interface ScheduleExceptionEditState {
  source: ScheduleExceptionEditSource;
  draft: ScheduleExceptionFormDraft;
}
```

## Pending commit

```ts
type PendingScheduleExceptionCommit =
  | {type:'create'; candidate:ScheduleExceptionAuthoringCandidate}
  | {
      type:'update';
      candidate:ScheduleExceptionAuthoringCandidate;
      sourceId:string;
      sourceRevision:number;
      sourceRaw:ScheduleException;
    }
  | {type:'remove'; id:string};
```

# 14. File-local parsing/format helpers

Implement locally.

## parseInteger

Reject blank/whitespace.

Equivalent:

```ts
function parseInteger(value:string) {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}
```

## parsePriority

Reject blank before `Number`.

Equivalent:

```ts
function parsePriority(value:string) {
  if (!value.trim()) return undefined;
  return Number(value);
}
```

Core later rejects non-finite values.

## parseClock

Reuse same accepted syntax as Routine UI:

- `H:MM` / `HH:MM`;
- hour 0..23;
- minute 0..59.

## clockValue

Return zero-padded `HH:MM` only for a valid minute.

Invalid imported minute → empty string.

## valid select value

Never feed a missing imported id as if it were a valid select option.

For Character/Location/period:

- current canonical id exists → id;
- otherwise → empty string.

# 15. Clean create draft

Function:

```ts
function createScheduleExceptionDraft(project: NarrativeProject):
  ScheduleExceptionFormDraft
```

Exact defaults:

- `characterId:''`;
- range:
  `{mode:'one-day', day:'1'}`;
- window:
  - if at least one template period:
    `{mode:'period', periodId:project.template.periods[0].id}`;
  - otherwise:
    `{mode:'exact',startTime:'09:00',endTime:'17:00',endDayOffset:'0'}`;
- intent:
  `{mode:'unset'}`;
- priority:
  `''`;
- reason:
  `''`;
- no repair flag.

These are visible form conveniences only.

No id is generated.

No default priority.

# 16. Draft initialization from existing raw exception

Function:

```ts
function draftFromResolvedException(
  project: NarrativeProject,
  resolved: ResolvedScheduleExceptionForAuthoring
): ScheduleExceptionFormDraft
```

## Character

Resolved → current id.

Unresolved → empty string.

Stored missing id stays visible only in canonical card summary.

## Range

### valid one-day

`{mode:'one-day',day:String(fromDay)}`

### valid bounded

`{mode:'bounded',fromDay:String(fromDay),toDay:String(toDay)}`

### valid through-project-end

`{mode:'through-project-end',fromDay:String(fromDay)}`

### invalid raw

Preserve raw numeric text without pretending validity:

- raw `toDay === undefined` → through-project-end with raw from text;
- raw `toDay === raw.fromDay` → one-day;
- otherwise → bounded with raw from/to text.

Core validation prevents commit until valid.

## Window

### resolved period

`{mode:'period',periodId:value.periodId}`

This includes legacy resolved period.

### unresolved period

`{mode:'period',periodId:''}`

Do not put missing id into a valid select.

### resolved exact

Use normalized exact:

- clockValue start/end;
- explicit offset string.

### invalid exact

- mode exact;
- valid minute values become clock strings, invalid minutes become empty strings;
- explicit raw offset 0/1 is preserved;
- invalid raw offset becomes `'0'` **plus `windowNeedsExplicitRepair:true`**.

If the exact interval is invalid even with a representable offset, core validation keeps Apply disabled.

### missing window

Use:

`{mode:'period',periodId:''}`.

No first-period silent repair on edit.

## Intent

### resolved Location

`{mode:'location',locationId:current id}`

### unresolved Location

`{mode:'location',locationId:''}`

### Absent

`{mode:'absent'}`

### conflicting

`{mode:'conflicting-import',storedLocationId:raw id}`

### unspecified

`{mode:'unset'}`

## Priority

`String(raw.priority)`.

Invalid in-memory values remain non-committable through core validation.

## Reason

`raw.reason ?? ''`.

No trim during load.

# 17. Explicit repair flag behavior

`windowNeedsExplicitRepair` is cleared only by a deliberate author action affecting the window:

- choosing Period/Exact mode;
- choosing a period;
- changing start;
- changing end;
- changing end-day offset.

It is not cleared by:

- changing priority;
- changing reason;
- changing Character;
- changing intent.

Candidate builder returns undefined while this flag is true.

This prevents silent repair of an unrepresentable imported exact offset.

# 18. Candidate builder

File-local:

```ts
function candidateFromDraft(
  id: string,
  draft: ScheduleExceptionFormDraft
): ScheduleExceptionAuthoringCandidate | undefined
```

## ID

Require nonblank id.

## Character

Require nonblank draft Character id.

## Range

- one-day: parse day → `{fromDay:day,toDay:day}`;
- bounded: parse both → explicit range;
- through-project-end: parse from → omit toDay.

Do not apply project bounds here.

## Window

If repair flag → undefined.

### period

Require nonblank period id.

Return modern period.

### exact

Parse both clocks.

Require endDayOffset exactly `'0'`/`'1'`.

Return numeric explicit offset.

## Intent

- Location requires nonblank Location id;
- Absent valid;
- unset/conflicting-import → undefined.

## Priority

Trim first.

Blank → undefined.

Nonblank → `Number(...)`.

May be non-finite; core validation owns rejection.

## Reason

Pass draft text as candidate reason.

Core equality/serialization normalize it.

# 19. UI local state layout

Inside `ScheduleExceptionAuthoringPanel`:

```ts
const {project,execute,createId} = useNarrativeProject();

const [createDraft,setCreateDraft] = React.useState(
  () => createScheduleExceptionDraft(project)
);
const [editState,setEditState] =
  React.useState<ScheduleExceptionEditState>();
const [pending,setPending] =
  React.useState<PendingScheduleExceptionCommit>();
const [message,setMessage] = React.useState('');

const sourceRevisionRef = React.useRef(0);
```

Derived:

```ts
const editingRaw = editState
  ? project.scheduleExceptions.find(
      item => item.id === editState.source.id
    )
  : undefined;

const editSourceIsCurrent =
  Boolean(editState && editingRaw === editState.source.raw);
```

A same semantic value in a different raw object is a canonical transition.

Object reference is the source-version signal.

# 20. startEdit exact behavior

Handler receives current raw exception.

Steps:

1. increment `sourceRevisionRef.current`;
2. resolve raw through core;
3. construct draft from resolved;
4. set:
   - id;
   - new revision;
   - raw object reference;
   - draft;
5. clear pending;
6. set informative edit message or anomaly message.

No canonical command.

# 21. Canonical edit synchronization effect

Use one narrow effect for same-entity canonical changes.

Conceptual logic:

```ts
React.useEffect(() => {
  if (!editState || pending?.type === 'update') {
    return;
  }

  const current = project.scheduleExceptions.find(
    item => item.id === editState.source.id
  );

  if (!current) {
    sourceRevisionRef.current += 1;
    setEditState(undefined);
    setMessage(
      'Исключение изменилось в проекте. Черновик обновлён из текущего состояния.'
    );
    return;
  }

  if (current === editState.source.raw) {
    return;
  }

  sourceRevisionRef.current += 1;
  const resolved = resolveScheduleExceptionForAuthoring(project,current);
  setEditState({
    source:{
      id:current.id,
      revision:sourceRevisionRef.current,
      raw:current
    },
    draft:draftFromResolvedException(project,resolved)
  });
  setMessage(
    'Исключение изменилось в проекте. Черновик обновлён из текущего состояния.'
  );
}, [
  project.scheduleExceptions,
  project.characters,
  project.locations,
  project.template,
  editState,
  pending
]);
```

Implementation may narrow dependencies to stable values, but must preserve semantics.

## Immediate stale protection before effect

Update button additionally requires:

`editingRaw === editState.source.raw`.

Therefore a stale draft cannot dispatch during the render before this effect rebases it.

## Unrelated changes

If E raw object reference is unchanged:

- runtime root replacement;
- another exception update;
- unrelated authoring

do not rebase the draft.

# 22. ABA behavior implementation

Sequence:

`A1 → B1 → A2`.

Observed canonical raw reference transitions:

- A1 → B1 increments revision;
- B1 → A2 increments revision.

Original dirty draft stores A1/source revision R1.

After B transition it is replaced.

Returning to semantic A has a new/current source revision R3.

No equality of semantic content can reactivate R1.

No serialized source-key comparison.

# 23. Pending settlement — central ADR

## Decision

Use one post-dispatch canonical-settlement effect.

No:

- timers;
- Promise around execute;
- provider API changes;
- reducer result channel;
- optimistic success reset.

Why this works:

A handler performs local `setPending(...)` and `execute(...)` in one interaction.

React processes the local pending update and provider reducer update before the resulting committed render.

If reducer exact-no-ops, the local pending update still causes the child to render.

Therefore the first committed render with `pending` is sufficient to inspect canonical desired state.

## Required safety

The settlement effect must never dispatch another authored command.

It only:

- confirms;
- clears/rebases local state;
- sets local message.

# 24. Pending create settlement

When:

`pending.type === 'create'`

find raw exception by candidate id.

### Desired state present

If raw exists and:

`scheduleExceptionAuthoringEquals(project, raw, pending.candidate)`

is true:

- clear pending;
- reset create draft using current project;
- clear/replace success message.

### Missing id

The Add did not materialize.

- clear pending;
- keep current create draft;
- recompute validation;
- show canonical-validation failure message.

### Same id but different semantics

Treat canonical project as authoritative.

- clear pending;
- keep current create draft;
- show canonical-validation/source conflict message.

Do not claim success.

# 25. Pending update settlement

Pending stores:

- Candidate;
- source id/revision;
- source raw object.

Find current raw by id.

### Current raw absent

Canonical source changed/was removed.

- clear pending;
- clear edit state;
- increment source revision;
- show source-changed message.

### Current raw semantically equals intended Candidate

Desired state is achieved.

- clear pending;
- increment revision;
- resolve current raw;
- reinitialize edit state from current canonical raw;
- Apply becomes disabled.

This is success even if another synchronous canonical action happened to produce the same desired state.

### Current raw differs and object reference differs from sourceRaw

Canonical source changed differently.

- clear pending;
- increment revision;
- resolve current raw;
- reinitialize edit state from current raw;
- show source-changed message.

### Current raw is still exact sourceRaw

The Update exact-no-opped/rejected.

- clear pending;
- keep dirty edit draft;
- keep original source revision/raw;
- show canonical-validation failure message.

This is the required no-timer rejected-command settlement.

# 26. Pending remove settlement

Find id.

### Id absent

Desired state achieved.

- clear pending;
- if editing same id, clear edit state and increment source revision;
- no stale edit remains.

This includes idempotent remove where another action already removed it.

### Id still present

Unexpected/rejected desired-state failure.

- clear pending;
- keep canonical card;
- if editing same id and raw changed, rebase to it;
- show local failure/source-changed message.

Remove never depends on Candidate validity.

# 27. Settlement effect ordering

Use a single effect where pending handling runs before ordinary edit-source synchronization.

Conceptual ordering:

```text
if pending:
  settle pending from canonical state
  return

else if editState:
  synchronize external canonical source
```

Do not let both branches rebase in the same effect cycle.

This prevents double revision increments.

# 28. Create handler exact flow

`submitCreate(event)`:

1. prevent default;
2. if pending exists → return;
3. generate id:
   `createId('schedule-exception')`;
4. build Candidate from create draft;
5. if undefined:
   - message = incomplete;
   - return;
6. validate Candidate;
7. if invalid:
   - message = canonical validation failure;
   - return;
8. set pending create Candidate;
9. execute:
   `{type:'scheduleException/add',candidate}`;
10. do **not** reset draft.

## ID generation timing note

Generating the id immediately before Candidate construction/dispatch is acceptable.

If draft fails to build before id is needed, implementation may build all non-id fields first to avoid consuming an unused random id.

No generated id is persisted unless Add succeeds.

# 29. Update handler exact flow

`submitUpdate(event)`:

1. prevent default;
2. require editState;
3. require no pending;
4. find current raw by edit id;
5. require:
   `currentRaw === editState.source.raw`;
6. build Candidate using existing id;
7. incomplete → local message, return;
8. validate against current project;
9. invalid → local message, return;
10. semantic equality true → return without dispatch;
11. set pending update carrying source revision/raw;
12. execute Update;
13. do not reset/rebase locally yet.

# 30. Remove handler exact flow

`removeException(id)`:

1. if pending for same operation exists → return;
2. set pending remove;
3. execute:
   `{type:'scheduleException/remove',id}`;
4. do not immediately clear edit state solely because dispatch was called;
5. canonical absence settles removal.

# 31. Cancel handler

Edit cancel:

1. if pending update/remove for edited id is active, button should be disabled;
2. otherwise:
   - clear edit state;
   - clear message;
   - no command.

Create form is always separately available.

No create Cancel button is required in first slice.

# 32. Create and edit presentation structure

Render subsection:

```tsx
<section
  aria-label="Исключения расписания"
  className="narrative-workspace__skill-check-editor"
>
  <h3>Исключения расписания</h3>
  <p>...</p>

  {editState ? (
    <form ...>{/* edit form */}</form>
  ) : (
    <form ...>{/* create form */}</form>
  )}

  {message && <small>{message}</small>}

  <div className="narrative-workspace__move-list">
    {/* cards */}
  </div>
</section>
```

Using existing classes is sufficient.

No CSS change expected.

# 33. Form fields and exact accessible labels

Use Stage 6 exact seams.

- `Персонаж исключения`
- `Тип диапазона исключения`
- `День исключения`
- `С дня исключения`
- `По день исключения`
- `Тип временного окна исключения`
- `Период исключения`
- `Начало исключения`
- `Конец исключения`
- `День окончания исключения`
- `Тип назначения исключения`
- `Локация исключения`
- `Приоритет исключения`
- `Причина исключения`

Buttons:

- create `+ Исключение`;
- update `Сохранить исключение`;
- cancel `Отменить редактирование исключения`;
- card edit `Редактировать исключение`;
- card remove `Удалить исключение`.

## Exact-end-day options

Values:

- `0` — `В тот же день`;
- `1` — `На следующий день`.

Clock edits do not auto-change this selection after exact draft initialization.

# 34. Window-mode behavior

## Create default

If periods exist → first period selected.

This is a visible create-form convenience.

If no periods → exact 09:00–17:00 same day.

## Switch to Period

Set:

```ts
{
  mode:'period',
  periodId: project.template.periods[0]?.id ?? ''
}
```

This is deliberate user action, so it may choose first current period.

Clear repair flag.

## Switch to Exact

Set:

```ts
{
  mode:'exact',
  startTime:'09:00',
  endTime:'17:00',
  endDayOffset:'0'
}
```

Clear repair flag.

## Existing exact edit

Preserve normalized current values and explicit offset.

Do not infer offset again after every time edit.

# 35. Range-mode behavior

## Switch to one-day

Use current meaningful from/day value if parseable; otherwise `'1'`.

## Switch to bounded

Use current start if available; to defaults to same/start or current project day bound as visible draft only.

## Switch to through-project-end

Preserve current start when possible.

Critical:

Switching modes is explicit author action.

No canonical write until Save/Create.

# 36. Intent-mode behavior

Rendered select should have placeholder for:

- unset;
- conflicting-import.

## Select Location

Set:

```ts
{mode:'location',locationId:''}
```

Do not carry old/conflicting stale id.

## Select Absent

Set:

```ts
{mode:'absent'}
```

No Location target remains in Candidate.

# 37. Apply predicates

## Create enabled

Only when:

- no pending;
- Candidate can build using a prospective id-independent validation shape or actual commit id;
- complete required form;
- validation can be shown as valid.

Implementation may compute a preview Candidate using a fixed nonblank sentinel id such as:

`'__schedule-exception-draft__'`

**only for button validation**, never dispatch/persist it.

Preferred simpler implementation:

- compute local completeness separately;
- leave button enabled only when required form fields parse;
- submit handler remains authoritative.

Do not call `createId` during every render.

## Edit enabled

Require:

- editState;
- current raw identity equals source raw;
- no pending;
- Candidate builds with existing id;
- Candidate validates;
- semantic equality false.

## Remove enabled

Existing raw id and no pending remove for it.

Malformed data does not disable Remove.

# 38. Create button validation without consuming ids

Detailed decision:

Do **not** call `createId` to determine button enabled state.

Use file-local helper:

```ts
function draftIsLocallyComplete(
  draft: ScheduleExceptionFormDraft
): boolean
```

or build Candidate with an internal constant nonblank preview id that is never emitted.

Preferred implementation:

`candidateFromDraft('__draft__',draft)`

then `validateScheduleExceptionCandidate(project,preview)`.

Because validation only requires id nonblank and does not test id uniqueness, this is safe for enablement.

On submit, generate the real id and validate again.

# 39. Card summary helpers

File-local formatters.

## formatRange

Resolved:

- one-day:
  `День N`;
- bounded:
  `Дни A–B`;
- through-project-end:
  `С дня A до конца проекта`;
- invalid:
  `Некорректный диапазон: <from>–<to|…>`.

## formatWindow

### resolved period

Lookup current label.

Display:

`Период: <label>`.

Legacy may additionally include:

`(legacy)`

but exact wording is optional.

### resolved exact

`HH:MM–HH:MM`

plus:

` (+1 день)`

when offset = 1.

### unresolved period

`Период не найден: <id>`.

### invalid exact

`Некорректное точное время`.

### missing

`Временное окно не указано`.

## formatIntent

- resolved Location → Location name;
- unresolved → `Локация не найдена: <id>`;
- absent → `Отсутствует`;
- conflicting → `Конфликт назначения: одновременно локация и отсутствие`;
- unspecified → `Назначение не указано`.

## Character

- resolved → name;
- unresolved → `Персонаж не найден: <id>`.

## Priority

Valid:

`Приоритет: N`.

Invalid:

`Некорректный приоритет`.

## Reason

If raw reason is nonblank after trim, show:

`Причина: <raw reason>`.

Do not mutate raw reason for display.

# 40. Card actions

Each card:

```tsx
<article
  key={exception.id}
  className="narrative-workspace__move-card"
>
  ...
  <div className="narrative-workspace__inspection-actions">
    <button
      type="button"
      onClick={() => startEdit(exception)}
      aria-label="Редактировать исключение"
    >
      Редактировать
    </button>
    <button
      type="button"
      onClick={() => removeException(exception.id)}
      aria-label="Удалить исключение"
    >
      Удалить
    </button>
  </div>
</article>
```

Accessible button names must remain Stage 6 seams.

If repeated buttons make names ambiguous in tests, tests may locate the card first and query within it.

Do not add exception id to accessible label solely for tests unless needed for real accessibility.

# 41. Empty/degraded states

## No exceptions

`Пока нет исключений расписания.`

## No Characters

Create Character select is empty.

Show:

`Для исключения нужен персонаж.`

Existing cards remain inspectable/removable.

## No Locations + Location intent

Show:

`Для назначения в локацию нужна существующая локация.`

Absent remains available.

## No periods

Period selector shows placeholder/empty.

Exact mode remains available.

# 42. Canonical validation messages

Use Stage 6 stable strings.

Incomplete:

`Проверь обязательные поля исключения расписания.`

Canonical validation failure:

`Исключение не сохранено: проверь дни, время, приоритет и ссылки.`

Source changed:

`Исключение изменилось в проекте. Черновик обновлён из текущего состояния.`

Conflicting intent:

`Выбери одно назначение: локацию или отсутствие.`

No new toast/event bus.

# 43. RoutineAuthoringPanel exact composition point

Import:

```ts
import {ScheduleExceptionAuthoringPanel}
  from './schedule-exception-authoring-panel';
```

Render the new component inside the existing top-level:

`<section aria-label="Расписания персонажей">...`

after the current RoutineRule list/empty state and before closing the section.

Conceptual final tail:

```tsx
<div className="narrative-workspace__move-list">
  {/* existing RoutineRule cards exactly as today */}
</div>

<ScheduleExceptionAuthoringPanel />
```

Do not move the component into `narrative-workspace.tsx`.

Do not change RoutineRule behavior.

# 44. Runtime/history design — no production change

D3 command goes through existing authoring history.

Meaningful command:

- one history transition.

No-op:

- exact history-state identity.

Undo/Redo remains:

`keepCurrentRuntime(restored.present,current.present)`.

No D3 code writes:

- Playhead;
- Actual Presence.

# 45. Persistence design — no production change

Existing authored projection already includes Schedule Exceptions.

Implementation adds no:

- repository method;
- migration;
- schema version;
- persistence envelope field.

Test only.

# 46. Search/diagnostic design — no production change

After canonical mutation:

- Project Search naturally derives current exception documents;
- schedule analysis naturally derives priority ambiguity;
- Story Brain remains existing navigation owner.

No explicit refresh event.

No D3 import of Search/analysis.

# 47. Exact core/store test file

New:

`src/store/narrative-project/__tests__/schedule-exception-authoring.test.ts`

Fixture must provide:

- at least two Characters;
- at least two Locations;
- template periods;
- existing RoutineRule sentinel;
- optional raw legacy/stale exceptions.

Required groups:

### Resolver

1. resolved Character/Location;
2. unresolved Character;
3. unresolved Location;
4. Absent;
5. conflicting intent;
6. unspecified intent;
7. one-day/bounded/open-ended;
8. invalid range;
9. modern period;
10. legacy period;
11. modern shadows legacy;
12. unresolved period;
13. exact inferred offset;
14. exact explicit offset;
15. invalid exact;
16. invalid priority.

### Validator

17. valid Location Candidate;
18. valid Absent Candidate;
19. missing Character;
20. missing Location;
21. invalid range;
22. missing period;
23. invalid exact minute/duration;
24. same-time +1 valid;
25. non-finite priority;
26. zero priority valid.

### Equality

27. modern same;
28. legacy period vs modern period;
29. omitted offset vs inferred explicit;
30. open-ended vs explicit final day non-equal;
31. reason trim equal;
32. unresolved/conflicting current false.

### Apply / history

33. add;
34. duplicate add identity;
35. changed update;
36. same-value update identity;
37. meaningful legacy edit modernizes edited record;
38. shadowed legacy removed only on meaningful edit;
39. remove malformed raw;
40. missing remove identity;
41. RoutineRule unchanged;
42. Undo/Redo;
43. Redo preserved after no-op.

# 48. Exact UI integration test file

New:

`src/components/narrative/workspace/__tests__/schedule-exception-authoring.integration.test.tsx`

Use real:

- NarrativeProjectProvider;
- localStorage repository seeding;
- RoutineAuthoringPanel.

Do not mock core reducer behavior.

Required scenarios:

1. section/labels render;
2. create Location;
3. create Absent;
4. create cross-midnight explicit +1;
5. same-time +1 can commit;
6. blank priority does not become zero;
7. explicit priority zero can commit;
8. open-ended range writes omitted toDay;
9. edit valid exception;
10. same-value edit disabled/no mutation;
11. Cancel no mutation;
12. legacy period displays without mutation;
13. legacy equivalent edit no mutation;
14. meaningful legacy edit modernizes;
15. unresolved Character safe;
16. unresolved Location safe;
17. conflicting intent requires explicit choice;
18. unspecified intent requires explicit choice;
19. missing period safe;
20. malformed record remains removable;
21. dirty edit survives unrelated runtime/root update;
22. dirty edit survives other-exception update;
23. same-id canonical change rebases dirty draft;
24. A→B→A does not resurrect old dirty draft;
25. rejected stale target commit unlocks pending state without timeout;
26. remove confirmation exits edit after canonical absence.

Use `waitFor` only for React canonical render/effect settling, not as product correctness timing.

# 49. Runtime-history test extension

Modify test-only:

`src/store/narrative-project/__tests__/runtime-history.test.ts`

Exact regression:

1. authored E priority/window state A;
2. authored update to B;
3. runtime projection changes Playhead and Actual Presence;
4. Undo:
   - E A restored;
   - current runtime preserved;
5. Redo:
   - E B restored;
   - current runtime preserved.

No production runtime change.

# 50. Persistence test

New:

`src/store/narrative-project/__tests__/schedule-exception-authoring-persistence.test.ts`

Required:

1. modern authored Location exception persists/reopens;
2. Absent persists;
3. runtime Playhead/Actual Presence independently persist through existing runtime projection;
4. legacy top-level period record loads;
5. rendering/read does not modernize;
6. meaningful command modernizes edited record;
7. save/reopen preserves modern result;
8. untouched sibling legacy record stays legacy.

# 51. Derived regression tests

Test-only allowed:

`src/application/narrative/__tests__/project-search.test.ts`

Add focused D3-created project evidence only if not already trivially covered:

- Add reflected;
- Update reflected;
- Remove absent.

Do not change exact-time Search navigation behavior.

Test-only allowed:

`src/domain/narrative/__tests__/schedule-exception-analysis.test.ts`

Use command-produced records:

- different priority overlap → no ambiguity;
- equal max priority → warning.

No production derived-system change.

# 52. Implementation commit sequence

After Stage 8 exact-head GREEN:

## Commit A — core + router + focused core tests

Production:

- new `schedule-exception-authoring.ts`;
- narrow `routine-authoring.ts` integration.

Tests:

- new core/store authoring tests.

Commit message target:

`feat: add schedule exception authoring core`

Gate:

- exact-head Branch Check GREEN before UI commit.

## Commit B — UI + UI integration

Production:

- new `schedule-exception-authoring-panel.tsx`;
- small composition change in `routine-authoring-panel.tsx`.

Tests:

- new UI integration test.

Commit message target:

`feat: edit schedule exceptions in WORLD TIME`

Gate:

- exact-head Branch Check GREEN.

## Commit C — boundary regression evidence

Tests only:

- runtime-history;
- persistence;
- Project Search if needed;
- schedule analysis if needed.

Commit message target:

`test: cover schedule exception authoring boundaries`

Gate:

- exact-head Branch Check GREEN.

## Repair commits

If CI finds a concrete defect:

- use the smallest focused repair commit;
- do not expand frozen production boundary;
- exact-head GREEN again.

# 53. Stage 9 verification checklist

Before PR ready/merge:

### Production blast radius

Expected only:

1. `src/store/narrative-project/schedule-exception-authoring.ts`;
2. `src/store/narrative-project/routine-authoring.ts`;
3. `src/components/narrative/workspace/schedule-exception-authoring-panel.tsx`;
4. `src/components/narrative/workspace/routine-authoring-panel.tsx`.

No CSS expected.

### Required invariants

- strict Candidate writes;
- legacy read compatibility;
- semantic same-value no-op;
- stale/conflicting safe read;
- malformed remove;
- no runtime mutation;
- runtime-preserving Undo/Redo;
- persistence round-trip;
- Search/diagnostics derived;
- RoutineRule isolation;
- open-ended range preserved;
- ABA draft protection;
- rejected pending settlement without timers.

### CI

- lint;
- web build;
- standalone Player build;
- Electron main build;
- full test suite;
- canonical Player smoke;
- Vite smoke;
- Electron smoke;
- Windows Electron launch contract.

# 54. Rollback design

Rollback removes/reverts only:

- D3 core;
- router integration;
- D3 UI component;
- one composition line;
- D3 tests.

No data rollback/migration required.

Existing raw ScheduleException records remain compatible.

# 55. Detailed decisions

### DEC-SE-056 — core stays one module

Resolver, Candidate policy, semantic equality and mutation remain one semantic owner.

### DEC-SE-057 — no shared Routine validator refactor

D3 duplicates only narrow primitive validation concepts.

### DEC-SE-058 — strict new writes are modern

No new top-level legacy `periodId`.

### DEC-SE-059 — read anomalies are typed, never auto-repaired

Rendering is non-mutating.

### DEC-SE-060 — explicit exact offset survives editing

Same-day/next-day is first-class UI state.

### DEC-SE-061 — invalid unrepresentable exact import requires deliberate repair

Local repair flag prevents silent substitution.

### DEC-SE-062 — edit version uses raw object identity + monotonic revision

No semantic source-key.

### DEC-SE-063 — immediate stale Apply protection uses raw identity

Effect timing is not required for safety.

### DEC-SE-064 — pending settlement is post-dispatch canonical observation

No timeout, Promise or provider change.

### DEC-SE-065 — pending settlement runs before ordinary edit synchronization

Prevents double rebase/revision.

### DEC-SE-066 — create id is commit-time only

No id persisted/generated as form identity.

### DEC-SE-067 — remove is canonical-absence confirmed

Malformed data remains deletable.

### DEC-SE-068 — create/edit UI shares one focused component

No extra workspace/provider.

### DEC-SE-069 — existing CSS is enough

No style expansion unless implementation reveals a verified accessibility/layout defect.

# 56. Detailed findings

### FINDING-SE-042 — rejected synchronous command can settle deterministically

Because pending local state itself guarantees a render and execute uses the same interaction's state update, the first committed render with pending can inspect canonical state and settle success/rejection without timeouts.

### FINDING-SE-043 — source raw identity is required in addition to revision

Before synchronization effect runs, identity mismatch immediately disables stale Update.

Revision then provides ABA traceability across observed canonical transitions.

### FINDING-SE-044 — imported invalid exact offset needs a separate local repair marker

The valid UI control cannot represent arbitrary invalid numeric offsets.

Without a repair marker, substituting 0/1 could silently turn malformed imported data into a committable repair.

### FINDING-SE-045 — create enablement must not consume ids

Preview validation uses a nonpersisted sentinel id; real id is generated only on submit.

### FINDING-SE-046 — no production persistence/Search/diagnostic changes are needed

All downstream behavior is already derived from canonical project state.

# 57. Gate Review — Stage 8 → Implementation

### Detailed design checks

✅ Exact production files fixed.

✅ Core imports/exports fixed.

✅ Resolver algorithm fixed.

✅ Candidate validator algorithm fixed.

✅ Equality algorithm fixed.

✅ Serialization fixed.

✅ Add/update/remove algorithms fixed.

✅ Router integration fixed.

✅ React state types fixed.

✅ Create defaults fixed.

✅ Every resolved/anomalous raw state maps to deterministic draft state.

✅ Invalid exact import repair semantics fixed.

✅ Source revision/identity mechanics fixed.

✅ ABA ordering fixed.

✅ Rejected pending Add/Update settlement fixed without timers/API expansion.

✅ Create/update/remove handlers fixed.

✅ Accessible labels/messages fixed.

✅ Card summary format semantics fixed.

✅ RoutineAuthoringPanel composition point fixed.

✅ No CSS expected.

✅ Exact core/UI/runtime/persistence/derived tests fixed.

✅ Implementation commit sequence fixed.

✅ Stage 4 blast radius remains intact.

### Gate decision

**✅ PASS to Implementation after this Stage 8 exact head is GREEN.**

No Detailed Design BLOCKER remains.

Production implementation must not begin until the Stage 8 docs-only commit itself has an exact-head successful Branch Check.
