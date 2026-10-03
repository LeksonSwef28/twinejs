# 93 Days — A67-D3 Schedule Exception Authoring · Stage 6 Contracts / Interfaces

Status: **STAGE 6 COMPLETE — PASS to Dynamic Flow / Data Flow**
Base: `93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`
Depends on A67-D3 Stage 0–5 documents.
Date: **2026-10-03**
Production code in this slice: **none**

## 1. Purpose

Freeze exact interfaces between the Stage 5 components.

This stage defines:

- command discriminants and payloads;
- exported authoring-core types;
- read projection discriminants;
- Candidate shape;
- validation statuses;
- semantic equality;
- mutation/apply contract;
- router integration contract;
- UI draft contracts where behavior depends on exact shape;
- exact end-day-offset semantics;
- canonical source token semantics;
- stable accessible labels used by integration tests.

No production implementation is approved by this document.

## 2. Important executable-semantics correction

Current executable schedule readers in:

- `world-time.ts`;
- `schedule-analysis.ts`;
- `story-brain-diagnostic-navigation.ts`

all interpret an exact `RoutineTimeWindow` with omitted `endDayOffset` as:

```ts
window.endDayOffset ??
  (window.endMinute < window.startMinute ? 1 : 0)
```

That is the contract A67-D3 must mirror.

This differs from an older domain comment that says omitted schema-v1 exact offsets are interpreted as same-day.

Stage 6 chooses **current executable behavior** as authoritative for D3 read/equality semantics.

The domain comment itself remains outside the frozen production blast radius and is not changed in D3.

# CONTRACT-SE-001 — Normalized authoring window

Exact exported type:

```ts
export type NormalizedScheduleExceptionWindow =
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

## Semantics

This is a non-persisted authoring value.

It always has:

- modern period representation; or
- exact representation with explicit end-day offset.

It never has:

- top-level legacy `periodId`;
- optional exact offset.

# CONTRACT-SE-002 — Authoring intent

Exact exported type:

```ts
export type ScheduleExceptionAuthoringIntent =
  | {
      type: 'location';
      locationId: string;
    }
  | {
      type: 'absent';
    };
```

## Semantics

This is the only valid **new-write/update Candidate** intent.

Read-side raw imported data may still resolve to:

- conflicting;
- unspecified;
- unresolved Location.

Those are not Candidate variants.

# CONTRACT-SE-003 — Complete Candidate

Exact exported type:

```ts
export interface ScheduleExceptionAuthoringCandidate {
  id: string;
  characterId: string;
  activeRange: {
    fromDay: number;
    toDay?: number;
  };
  timeWindow: NormalizedScheduleExceptionWindow;
  intent: ScheduleExceptionAuthoringIntent;
  priority: number;
  reason?: string;
}
```

## Required semantics

A Candidate is complete.

It may still fail validation against the current project because references/template values can become stale.

It must never contain:

- partial form strings;
- legacy top-level `periodId`;
- both Location and Absent;
- missing intent;
- React state.

# CONTRACT-SE-004 — Typed authored commands

Exact exported type:

```ts
export type ScheduleExceptionAuthoringCommand =
  | {
      type: 'scheduleException/add';
      candidate: ScheduleExceptionAuthoringCandidate;
    }
  | {
      type: 'scheduleException/update';
      candidate: ScheduleExceptionAuthoringCandidate;
    }
  | {
      type: 'scheduleException/remove';
      id: string;
    };
```

## Discriminants

Exactly:

- `scheduleException/add`;
- `scheduleException/update`;
- `scheduleException/remove`.

## Create id prefix

The first-slice UI uses:

```ts
createId('schedule-exception')
```

only at create commit time.

## Sync/async

Commands are synchronous local authoring commands through existing `execute(command): void`.

No Promise.

# CONTRACT-SE-005 — Character read resolution

Exact exported type:

```ts
export type ResolvedScheduleExceptionCharacter =
  | {
      status: 'resolved';
      characterId: string;
      character: NarrativeCharacter;
    }
  | {
      status: 'unresolved';
      characterId: string;
    };
```

Missing Character is read-safe data.

No throw.

No mutation.

No fallback Character.

# CONTRACT-SE-006 — Range read resolution

Exact exported type:

```ts
export type ResolvedScheduleExceptionRange =
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
      fromDay: number;
      toDay?: number;
    };
```

## Validity

Valid only when:

- `fromDay` is an integer inside 1..dayCount;
- optional `toDay` is an integer inside 1..dayCount;
- optional `toDay >= fromDay`.

## Mode

- `toDay === fromDay` → one-day;
- `toDay > fromDay` → bounded;
- `toDay === undefined` → through-project-end.

Open-ended range is not semantically equal to explicit `toDay === dayCount`.

# CONTRACT-SE-007 — Window read resolution

Exact exported type:

```ts
export type ResolvedScheduleExceptionWindow =
  | {
      status: 'resolved';
      source: 'modern';
      value: NormalizedScheduleExceptionWindow;
    }
  | {
      status: 'resolved';
      source: 'legacy-period';
      value: {
        type: 'period';
        periodId: string;
      };
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

## Source precedence

1. existing `timeWindow` if present;
2. otherwise legacy top-level `periodId`;
3. otherwise missing.

## Period

Resolved only when current template contains that period id.

## Exact normalization

For a structurally valid exact raw window:

```ts
const effectiveEndDayOffset =
  window.endDayOffset ??
  (window.endMinute < window.startMinute ? 1 : 0);
```

Resolved exact value always contains explicit `0 | 1`.

## Exact read validity

Resolved exact requires:

- integer start/end;
- each 0..1439;
- provided offset is undefined/0/1;
- effective absolute end strictly greater than start.

Otherwise return `invalid-exact`.

# CONTRACT-SE-008 — Intent read resolution

Exact exported type:

```ts
export type ResolvedScheduleExceptionIntent =
  | {
      status: 'location-resolved';
      locationId: string;
      location: NarrativeLocation;
    }
  | {
      status: 'location-unresolved';
      locationId: string;
    }
  | {
      status: 'absent';
    }
  | {
      status: 'conflicting';
      locationId: string;
      location?: NarrativeLocation;
    }
  | {
      status: 'unspecified';
    };
```

## Resolution order

- `absent === true` + target id → conflicting;
- `absent === true` + no target → absent;
- target id + not absent → resolved/unresolved Location;
- neither → unspecified.

Rendering never repairs these states.

# CONTRACT-SE-009 — Resolved exception aggregate

Exact exported type:

```ts
export interface ResolvedScheduleExceptionForAuthoring {
  exception: ScheduleException;
  character: ResolvedScheduleExceptionCharacter;
  activeRange: ResolvedScheduleExceptionRange;
  window: ResolvedScheduleExceptionWindow;
  intent: ResolvedScheduleExceptionIntent;
  priorityStatus: 'valid' | 'invalid';
}
```

## Purpose

UI uses one pure resolved view while retaining the original raw exception for:

- raw id;
- raw priority;
- raw reason;
- removal.

No resolved projection is persisted.

# CONTRACT-SE-010 — Read resolver

Exact exported function:

```ts
export function resolveScheduleExceptionForAuthoring(
  project: NarrativeProject,
  exception: ScheduleException
): ResolvedScheduleExceptionForAuthoring;
```

## Properties

- synchronous;
- pure;
- deterministic for same inputs;
- no throw for stale references/legacy anomalies;
- no project mutation;
- no fallback target selection.

# CONTRACT-SE-011 — Candidate validation result

Exact exported type:

```ts
export type ScheduleExceptionCandidateValidation =
  | {
      status: 'valid';
    }
  | {
      status: 'invalid-id';
    }
  | {
      status: 'missing-character';
      characterId: string;
    }
  | {
      status: 'invalid-active-range';
    }
  | {
      status: 'missing-period';
      periodId: string;
    }
  | {
      status: 'invalid-time-window';
    }
  | {
      status: 'missing-location';
      locationId: string;
    }
  | {
      status: 'invalid-priority';
    };
```

## Important exclusions

No:

- ambiguity status;
- recurrence status;
- BehaviorProfile status;
- Story Brain status.

A typed Candidate already has one valid intent variant, so no `missing-intent` or `conflicting-intent` status is needed here.

Those are draft/read concerns.

# CONTRACT-SE-012 — Candidate validator

Exact exported function:

```ts
export function validateScheduleExceptionCandidate(
  project: NarrativeProject,
  candidate: ScheduleExceptionAuthoringCandidate
): ScheduleExceptionCandidateValidation;
```

## Validation order

Deterministic first-failure order:

1. nonblank id;
2. Character exists;
3. active range valid;
4. time window valid;
5. period exists when period mode;
6. Location exists when Location intent;
7. priority finite.

For exact windows, validity includes:

```ts
endMinute + endDayOffset * 1440 > startMinute
```

## Note on period status ordering

A period Candidate with a missing period returns:

`missing-period`

rather than generic `invalid-time-window`.

Generic invalid-time-window is used for malformed exact values.

# CONTRACT-SE-013 — Reason normalization

Exact semantic helper may remain internal, but behavior is frozen:

```ts
normalizeReason(reason?: string): string | undefined
```

Equivalent semantics:

```ts
const trimmed = reason?.trim();
return trimmed ? trimmed : undefined;
```

Used for:

- serialization;
- semantic equality.

Read rendering does not rewrite the raw reason.

# CONTRACT-SE-014 — Semantic equality

Exact exported function:

```ts
export function scheduleExceptionAuthoringEquals(
  project: NarrativeProject,
  current: ScheduleException,
  candidate: ScheduleExceptionAuthoringCandidate
): boolean;
```

## Preconditions / safe behavior

The function is safe for any raw current exception.

It returns false if:

- Candidate validation fails;
- current Character is unresolved;
- current range is invalid;
- current window is missing/unresolved/invalid;
- current intent is conflicting/unspecified/unresolved;
- current priority is invalid.

## Equality fields

True only when semantic equality holds for:

- id;
- Character id;
- active-range authored intent;
- normalized window;
- valid Location/Absent intent;
- priority;
- normalized reason.

## Legacy equivalence

These compare equal:

```ts
{
  timeWindow: undefined,
  periodId: 'day'
}
```

and:

```ts
{
  timeWindow: {type: 'period', periodId: 'day'}
}
```

when all other semantics match.

## Exact offset equivalence

These compare equal:

```ts
{type:'exact', startMinute:1380, endMinute:60}
```

and:

```ts
{type:'exact', startMinute:1380, endMinute:60, endDayOffset:1}
```

because current executable readers infer offset 1.

## Range non-equivalence

These do not compare equal solely because they currently cover the same final days:

```ts
{fromDay:7}
```

vs

```ts
{fromDay:7, toDay:project.template.dayCount}
```

# CONTRACT-SE-015 — Candidate serialization

Serialization may remain internal.

A valid Candidate serializes to existing `ScheduleException`.

## Location

Equivalent canonical result:

```ts
{
  id: candidate.id,
  characterId: candidate.characterId,
  activeRange: candidate.activeRange,
  timeWindow: candidate.timeWindow,
  targetLocationId: candidate.intent.locationId,
  priority: candidate.priority,
  reason: normalizedReason
}
```

Omit:

- `periodId`;
- `absent`.

## Absent

Equivalent canonical result:

```ts
{
  id: candidate.id,
  characterId: candidate.characterId,
  activeRange: candidate.activeRange,
  timeWindow: candidate.timeWindow,
  absent: true,
  priority: candidate.priority,
  reason: normalizedReason
}
```

Omit:

- `periodId`;
- `targetLocationId`.

## Exact writes

Write explicit `endDayOffset`.

# CONTRACT-SE-016 — Apply authored command

Exact exported function:

```ts
export function applyScheduleExceptionAuthoringCommand(
  project: NarrativeProject,
  command: ScheduleExceptionAuthoringCommand
): NarrativeProject;
```

## Add

- invalid Candidate → exact original project;
- duplicate id → exact original project;
- valid → append serialized modern exception and update `updatedAt`.

## Update

- missing id → exact original project;
- invalid Candidate → exact original project;
- semantic equal → exact original project;
- valid changed → replace exactly one same-id exception and update `updatedAt`.

## Remove

- missing id → exact original project;
- existing id → remove exactly one record and update `updatedAt`;
- raw record validity is irrelevant.

## Atomicity

No partial mutation.

## Runtime isolation

The function must not alter:

- `simulation`;
- `routineRules`;
- runtime history/projection fields;
- Characters;
- Locations;
- editor state.

# CONTRACT-SE-017 — Command type guard

Exact exported function:

```ts
export function isScheduleExceptionAuthoringCommand(
  command: {type: string}
): command is ScheduleExceptionAuthoringCommand;
```

Returns true only for the three exact D3 discriminants.

No string-prefix wildcard matching.

# CONTRACT-SE-018 — NarrativeAuthoringCommand integration

`routine-authoring.ts` extends:

```ts
export type NarrativeAuthoringCommand =
  | NarrativeProjectCommand
  | RoutineAuthoringCommand
  | ScheduleExceptionAuthoringCommand
  | StoryMetadataAuthoringCommand
  | MoveConditionAuthoringCommand;
```

## Router behavior

Before fallback to ordinary NarrativeProject commands:

- detect Schedule Exception authored command;
- call `applyScheduleExceptionAuthoringCommand`.

If returned project is exact current `state.present`:

- return exact current history state.

If changed:

- add one authored history snapshot;
- clear future.

RoutineRule branch remains unchanged.

# CONTRACT-SE-019 — UI range draft contract

Local-only type equivalent to:

```ts
type ScheduleExceptionRangeDraft =
  | {
      mode: 'one-day';
      day: string;
    }
  | {
      mode: 'bounded';
      fromDay: string;
      toDay: string;
    }
  | {
      mode: 'through-project-end';
      fromDay: string;
    };
```

## Why discriminated

The UI must preserve authored range intent.

Do not represent open-ended as a blank `toDay` inside an otherwise ambiguous two-number form.

# CONTRACT-SE-020 — UI window draft contract

Local-only type equivalent to:

```ts
type ScheduleExceptionWindowDraft =
  | {
      mode: 'period';
      periodId: string;
    }
  | {
      mode: 'exact';
      startTime: string;
      endTime: string;
      endDayOffset: '0' | '1';
    };
```

## Exact offset control

The UI exposes an explicit control:

Accessible label exactly:

**`День окончания исключения`**

Allowed values:

- `0` → same authored day;
- `1` → next authored day.

Visible option wording:

- `В тот же день`;
- `На следующий день`.

## Initialization

### Existing valid exact

Use the normalized resolved offset.

### New draft / switching into exact

Start with:

- current exact starter times;
- inferred offset:
  - end < start → `1`;
  - otherwise → `0`.

After initialization the offset is explicit draft state.

Changing clock fields does not silently rewrite an already explicit offset.

If the resulting interval becomes invalid:

- Apply disabled;
- author changes time or offset deliberately.

This permits round-trip of every currently valid `0 | 1` exact shape, including same-time +1 day.

# CONTRACT-SE-021 — UI intent draft

Local-only type:

```ts
type ScheduleExceptionIntentDraft =
  | {
      mode: 'unset';
    }
  | {
      mode: 'location';
      locationId: string;
    }
  | {
      mode: 'absent';
    }
  | {
      mode: 'conflicting-import';
      storedLocationId: string;
    };
```

## Candidate conversion

Only:

- location with nonblank id;
- absent

can become Candidate intent.

`unset` and `conflicting-import` cannot.

# CONTRACT-SE-022 — Edit source token

Local synchronization contract:

```ts
interface ScheduleExceptionEditSource {
  id: string;
  revision: number;
  raw: ScheduleException;
}

type ScheduleExceptionSourceToken = string;
```

Token equivalent to:

```ts
`${source.id}:${source.revision}`
```

## Revision rule

For the current editing id, increment local revision when:

- raw exception object reference changes;
- record disappears;
- record reappears;
- editing id changes.

## ABA rule

A → B → A produces three source revisions even if first/third semantic content matches.

A draft stores the source token from which it was initialized.

A draft is eligible for Update only when its token equals the current token.

## Unrelated project changes

Do not increment solely because:

- project root object changes;
- runtime changes;
- another Schedule Exception changes;
- unrelated authored data changes.

# CONTRACT-SE-023 — Pending canonical confirmation

Local UI-only types may be equivalent to:

```ts
type PendingScheduleExceptionCommit =
  | {
      type: 'create';
      candidate: ScheduleExceptionAuthoringCandidate;
    }
  | {
      type: 'update';
      candidate: ScheduleExceptionAuthoringCandidate;
      sourceToken: ScheduleExceptionSourceToken;
    }
  | {
      type: 'remove';
      id: string;
    };
```

Not persisted.

## Create success

Confirmed when canonical project contains candidate id and stored semantics equal intended Candidate.

Then:

- clear pending;
- reset create draft.

If same id appears with different semantics:

- do not claim success;
- treat canonical state as authoritative and show local status.

## Update success

Confirmed when:

- same id still exists;
- canonical source revision changed;
- canonical semantics equal intended Candidate.

Then reinitialize edit draft from canonical new source.

If source changes differently:

- discard stale draft;
- reinitialize from canonical source;
- show stale-source status.

## Remove success

Confirmed when id no longer exists.

Then exit edit mode if it targeted that id.

# CONTRACT-SE-024 — Candidate build boundary in UI

UI local conversion returns either:

```ts
ScheduleExceptionAuthoringCandidate
```

or:

```ts
undefined
```

for incomplete/unparseable form state.

## UI parses

- integer days;
- HH:MM clock values;
- numeric priority;
- range mode;
- intent mode.

## Core validates

After a Candidate object is built, UI calls:

`validateScheduleExceptionCandidate(project, candidate)`.

Only `status === 'valid'` may dispatch Add/Update.

# CONTRACT-SE-025 — Priority input

Accessible label exactly:

**`Приоритет исключения`**

The local value is a string.

Candidate construction uses:

```ts
const priority = Number(priorityText);
```

but blank/whitespace is incomplete and must not become numeric zero accidentally.

Therefore:

- trim first;
- blank → no Candidate;
- nonblank → Number(...);
- core still requires `Number.isFinite(priority)`.

## Help text

Exact first-slice explanatory sentence:

**`Более высокий приоритет перекрывает более низкий; одинаковый максимальный приоритет может дать предупреждение о неоднозначности.`**

# CONTRACT-SE-026 — Exact accessible labels

Section:

**`Исключения расписания`**

Controls:

- Character: **`Персонаж исключения`**
- range mode: **`Тип диапазона исключения`**
- one-day field: **`День исключения`**
- bounded/open start: **`С дня исключения`**
- bounded end: **`По день исключения`**
- window mode: **`Тип временного окна исключения`**
- period: **`Период исключения`**
- exact start: **`Начало исключения`**
- exact end: **`Конец исключения`**
- exact end day: **`День окончания исключения`**
- intent: **`Тип назначения исключения`**
- Location: **`Локация исключения`**
- priority: **`Приоритет исключения`**
- reason: **`Причина исключения`**

Buttons:

- create: **`+ Исключение`**
- update: **`Сохранить исключение`**
- cancel: **`Отменить редактирование исключения`**
- edit card: **`Редактировать исключение`**
- remove card: **`Удалить исключение`**

These strings are stable first-slice integration-test seams.

# CONTRACT-SE-027 — Range option values

Accessible range-mode select values:

- `one-day`;
- `bounded`;
- `through-project-end`.

Visible wording:

- `Один день`;
- `Диапазон дней`;
- `До конца проекта`.

# CONTRACT-SE-028 — Window option values

Window-mode values:

- `period`;
- `exact`.

Visible wording:

- `Период суток`;
- `Точное время`.

# CONTRACT-SE-029 — Intent option values

Intent select values:

- `unset`;
- `location`;
- `absent`.

Visible wording:

- `Выбери назначение`;
- `Находиться в локации`;
- `Отсутствовать`.

For conflicting imported edit state, the local draft may hold `conflicting-import`, but the rendered select value should remain an explicit non-committable placeholder until the author chooses Location or Absent.

# CONTRACT-SE-030 — Read summary wording contract

Exact sentence text is not frozen for every dynamic card value, but semantic markers are mandatory.

Cards must include textual forms equivalent to:

- unresolved Character: `Персонаж не найден: <id>`;
- unresolved Location: `Локация не найдена: <id>`;
- conflicting intent: `Конфликт назначения: одновременно локация и отсутствие`;
- unspecified intent: `Назначение не указано`;
- unresolved period: `Период не найден: <id>`;
- missing window: `Временное окно не указано`;
- invalid exact: `Некорректное точное время`;
- invalid priority: `Некорректный приоритет`;
- empty list: `Пока нет исключений расписания.`.

Unresolved/conflicting state must not be color-only.

# CONTRACT-SE-031 — Local validation/status messages

Minimum stable status strings:

Incomplete/unparseable form:

**`Проверь обязательные поля исключения расписания.`**

Candidate fails canonical validation:

**`Исключение не сохранено: проверь дни, время, приоритет и ссылки.`**

Canonical edit source changed while draft was open:

**`Исключение изменилось в проекте. Черновик обновлён из текущего состояния.`**

Conflicting imported intent:

**`Выбери одно назначение: локацию или отсутствие.`**

No Character available for creation:

**`Для исключения нужен персонаж.`**

No Location available while Location intent selected:

**`Для назначения в локацию нужна существующая локация.`**

No new toast/event bus.

# CONTRACT-SE-032 — Apply predicates

## Create

Create button enabled only when:

- local draft can build Candidate;
- Candidate validation is valid;
- no pending create is awaiting canonical confirmation.

No semantic-equality check because id is new.

## Edit

Update button enabled only when:

- editing raw exception exists;
- draft source token equals current source token;
- local draft builds Candidate using the same id;
- Candidate validation is valid;
- `scheduleExceptionAuthoringEquals(...) === false`;
- no pending update/remove for that id.

## Remove

Remove remains enabled for any existing raw exception unless a remove for that same id is already pending.

Candidate validity is irrelevant.

# CONTRACT-SE-033 — Cancel

Create-mode Cancel/reset, if rendered, is local only.

Edit Cancel button:

**`Отменить редактирование исключения`**

Behavior:

- clear edit id;
- clear pending update for that edit if no command was dispatched;
- reset to clean create draft;
- dispatch nothing;
- create no history.

# CONTRACT-SE-034 — Runtime non-contract

No D3 core/UI/router API reads or writes:

- Simulation Playhead for Candidate validity;
- Actual Presence;
- runtime occurrence state;
- item placement runtime;
- Player state.

Undo/Redo runtime preservation remains existing context behavior only.

# CONTRACT-SE-035 — Diagnostics non-contract

Candidate validation never calls schedule ambiguity analysis.

Equal maximum-priority overlaps are structurally commit-able.

Existing derived analysis may report warning after canonical mutation.

# CONTRACT-SE-036 — Search non-contract

No D3 API updates a Search index.

Project Search remains derived from canonical project.

Current Schedule Exception navigation remains fromDay-midnight behavior.

Exact-window Search centering is outside D3.

# CONTRACT-SE-037 — Persistence non-contract

No new persistence API.

No schema version.

No migration.

No Schedule Exception draft persistence.

Existing authored projection persists raw canonical `scheduleExceptions`.

# CONTRACT-SE-038 — Test identity requirements

Core/store tests must use identity assertions for no-op behavior.

Required examples equivalent to:

```ts
expect(applyScheduleExceptionAuthoringCommand(project, duplicateAdd)).toBe(project);
expect(applyScheduleExceptionAuthoringCommand(project, invalidUpdate)).toBe(project);
expect(applyScheduleExceptionAuthoringCommand(project, sameSemanticUpdate)).toBe(project);
expect(applyScheduleExceptionAuthoringCommand(project, missingRemove)).toBe(project);
```

History-level assertions must also prove:

- `past` unchanged on no-op;
- `future` preserved on no-op;
- one meaningful command adds exactly one authored transition.

# CONTRACT-SE-039 — Repeat / idempotency

| Operation | Repeat behavior |
|---|---|
| resolve raw exception | deterministic for same project/raw value |
| validate Candidate | deterministic for same project/Candidate |
| semantic equality | deterministic |
| add same id twice | first may add; second exact no-op |
| update same semantic value | exact no-op |
| meaningful update repeated | first changes; second exact no-op |
| remove existing twice | first removes; second exact no-op |
| render legacy/stale | never mutates |
| Cancel | never mutates |
| ambiguity warning | outside mutation validity |

# CONTRACT-SE-040 — Export surface

The new core module exports exactly the following D3 public surface unless Stage 8 finds a compile-level reason to narrow it further:

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

Do not export:

- React draft types;
- source-token types;
- pending UI commit state;
- formatting strings;
- internal serializer;
- internal reason-normalizer.

## 3. Dependency direction

Allowed:

```text
domain schedule/entities/project
      ↓
schedule-exception-authoring core
      ↓
routine-authoring router
      ↓
existing authoring history

domain + core
      ↓
ScheduleExceptionAuthoringPanel
      ↓
existing execute(command)

RoutineAuthoringPanel
      ↓
ScheduleExceptionAuthoringPanel composition
```

Forbidden reverse dependencies:

- core importing React;
- core importing Project Search/Story Brain;
- router owning UI draft;
- domain importing authoring core;
- runtime importing form state.

## 4. Sync / async table

| Contract | Mode |
|---|---|
| read resolver | synchronous |
| Candidate validation | synchronous |
| semantic equality | synchronous |
| apply authored command | synchronous pure project transition except timestamp |
| command dispatch | synchronous reducer scheduling via existing React state update |
| UI canonical confirmation | render/effect observation of next canonical state |
| persistence | existing debounced repository behavior, outside immediate command result |
| Search/diagnostics | existing derived behavior after project update |

No network/AI/worker dependency.

## 5. Error ownership

### Resolver

Stale/legacy anomalies → typed resolved state.

No throw.

### Candidate validator

Invalid authored request → typed validation status.

No throw.

### Apply function

Invalid/missing/same-value → exact original project.

No throw for normal authoring semantics.

### Router

Exact project identity → exact history state.

### UI

Incomplete draft / invalid Candidate / stale source → local inline status.

### Infrastructure defects

Broken React/store invariants remain defects, not semantic validation statuses.

## 6. Contract decisions

### DEC-SE-036 — command names

- `scheduleException/add`;
- `scheduleException/update`;
- `scheduleException/remove`.

### DEC-SE-037 — command payload

Add/update carry strict `ScheduleExceptionAuthoringCandidate`, not raw `ScheduleException`.

### DEC-SE-038 — normalized exact window

Candidate exact offset is mandatory `0 | 1`.

### DEC-SE-039 — omitted raw exact offset

Read/equality infer using current executable reader rule.

### DEC-SE-040 — validation vocabulary

Use the exact statuses in CONTRACT-SE-011.

### DEC-SE-041 — equality

Raw-to-Candidate semantic comparison, not raw object equality.

### DEC-SE-042 — remove

Id-only and independent of Candidate validity.

### DEC-SE-043 — source synchronization

Version-aware revision/token contract is required for edit drafts.

### DEC-SE-044 — exact offset UI

Expose explicit same-day/next-day control.

### DEC-SE-045 — canonical confirmation

Use canonical observation rather than changing `execute(): void`.

### DEC-SE-046 — public export surface

Freeze CONTRACT-SE-040.

## 7. Stage 6 findings

### FINDING-SE-037 — current executable exact-offset inference is the real compatibility contract

All active readers agree on inference when `endDayOffset` is omitted.

D3 equality/read normalization must use that same behavior.

### FINDING-SE-038 — Candidate type eliminates several conceptual validation statuses

Because Candidate intent is already a strict union, missing/conflicting intent stays a UI/read concern rather than a Candidate validation status.

### FINDING-SE-039 — raw read model must tolerate invalid priority separately from Candidate validation

This keeps imported data inspectable/removable.

### FINDING-SE-040 — explicit end-day control is necessary for round-trip completeness

Without it, valid exact windows such as same-time +1 day or start/end pairs spanning more than a simple inferred midnight cannot be faithfully edited.

### FINDING-SE-041 — command payload should carry authored meaning, not compatibility residue

Using Candidate rather than raw ScheduleException guarantees normal UI writes cannot accidentally emit legacy `periodId` or conflicting Location/Absent fields.

## 8. Gate Review — Stage 6 → Stage 7 Dynamic Flow / Data Flow

### Contract checks

✅ Exact command discriminants fixed.

✅ Exact command payloads fixed.

✅ Exact exported Candidate/window/intent types fixed.

✅ Exact read projection discriminants fixed.

✅ Exact validation statuses fixed.

✅ Exact equality signature fixed.

✅ Exact apply signature fixed.

✅ Exact router guard/integration contract fixed.

✅ Exact range draft modes fixed.

✅ Exact exact-window offset control fixed.

✅ ABA-safe source-token contract fixed.

✅ Pending canonical-confirmation model fixed.

✅ Stable accessible labels fixed.

✅ No runtime/persistence/Search/diagnostic API expansion.

### Stage 7 must trace

1. create flow from keystroke to canonical project;
2. edit flow with source token;
3. same-value edit;
4. rejected stale-reference edit;
5. legacy period read → meaningful edit → modern write;
6. conflicting imported intent repair;
7. remove malformed raw exception;
8. Undo/Redo while runtime changes after authored edit;
9. persistence flow;
10. Search/diagnostic derived refresh;
11. A→B→A edit-source transition;
12. failure/no-op paths and exact identity.

### Gate decision

**✅ PASS to Stage 7 Dynamic Flow / Data Flow.**

No Stage 6 blocker exists.

Production implementation remains prohibited until Stage 7 and Stage 8 complete.
