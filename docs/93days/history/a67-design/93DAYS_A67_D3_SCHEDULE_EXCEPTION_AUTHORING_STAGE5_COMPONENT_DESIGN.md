# 93 Days — A67-D3 Schedule Exception Authoring · Stage 5 Component Design

Status: **STAGE 5 COMPLETE — PASS to Contracts / Interfaces**
Base: `93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`
Depends on A67-D3 Stage 0–4 documents.
Date: **2026-10-03**
Production code in this slice: **none**

## 1. Purpose

Break the frozen Stage 4 impact surface into components with one clear reason to exist.

This stage defines:

- responsibilities;
- dependency direction;
- read/write ownership;
- UI draft ownership;
- create/edit/remove interaction;
- stale/legacy/conflicting behavior;
- canonical-source synchronization;
- accessibility expectations;
- test seams.

It does **not** freeze exact TypeScript signatures or command discriminants.

Those belong to Stage 6.

## 2. Component map

```text
NarrativeProjectContext
        │
        ├── project
        ├── execute(command)
        └── createId(prefix)
                │
                ▼
RoutineAuthoringPanel
        │
        ├── existing RoutineRule editor
        └── COMP-SE-003 ScheduleExceptionAuthoringPanel
                │
                ├── local incomplete Draft
                ├── COMP-SE-001 resolve stored exception
                ├── COMP-SE-001 build/validate complete Candidate
                └── execute(schedule-exception command)
                              │
                              ▼
                    COMP-SE-002 authoring router
                              │
                              ▼
                    COMP-SE-001 mutation core
                              │
                              └── NarrativeProject.scheduleExceptions
```

Existing infrastructure continues around this path:

```text
authoring history
  └── meaningful project identity only

Undo / Redo
  └── keepCurrentRuntime(...)
        ├── current Simulation Playhead preserved
        └── current Actual Presence preserved

derived systems
  ├── Project Search
  ├── schedule-analysis
  └── persistence
```

No new:

- provider;
- global store;
- runtime service;
- AuthorFocus kind;
- top-level workspace;
- persisted editor state;
- timeline projection.

# COMP-SE-001 — Schedule Exception Authoring Core

**Name:** Schedule Exception Authoring Core.

**Layer:** store / authored aggregate policy, pure except normal authored project timestamping on a successful mutation.

**Frozen Stage 4 file:**

`src/store/narrative-project/schedule-exception-authoring.ts`

## Responsibility

Own the complete Schedule Exception authoring semantics that must be shared by the command mutation path and presentation read path:

1. typed Schedule Exception authoring command family;
2. tolerant read resolution of raw stored ScheduleException;
3. legacy/modern window normalization;
4. Character and Location reference resolution;
5. Location / Absent / conflicting / unspecified intent resolution;
6. complete Candidate validation;
7. optional reason normalization;
8. semantic equality;
9. add/update/remove authored transition.

## Why this is one component

These operations all answer one domain/application question:

> What does this stored or requested Schedule Exception mean for authoring, and may it become the next canonical authored value?

Splitting them into unrelated utility files would weaken the single semantic owner.

The React component must not reimplement this policy.

## Inputs

Depending on operation:

- current `NarrativeProject`;
- one raw stored `ScheduleException`;
- one complete authoring Candidate;
- one Schedule Exception authored command;
- one exception id for removal.

## Outputs

Conceptually:

- resolved read projection;
- Candidate validation result;
- semantic equal / changed;
- original or changed NarrativeProject.

Exact exported type names belong to Stage 6.

## Dependencies allowed

- `NarrativeProject`;
- `ScheduleException`;
- `RoutineTimeWindow`;
- `DayRange`;
- canonical Characters;
- canonical Locations;
- project template day count/periods.

## Dependencies forbidden

- React;
- DOM values;
- RoutineAuthoringPanel;
- Simulation Playhead as mutation input;
- Actual Presence;
- runtime history;
- Project Search;
- Story Brain;
- AuthorFocus;
- WORLD/TIME viewport.

## Read resolution responsibility

The component must resolve a raw exception into enough stable information for safe rendering.

Required semantic groups:

### Character

```text
resolved(character)
unresolved(characterId)
```

### Range

```text
valid one-day
valid bounded
valid through-project-end
invalid(raw range)
```

### Window

```text
resolved modern period
resolved legacy period
resolved exact
unresolved modern period
unresolved legacy period
invalid exact
missing
```

### Intent

```text
resolved Location
unresolved Location
Absent
conflicting (Absent + Location)
unspecified
```

### Priority

Read-side projection must remain render-safe even if imported raw priority is non-finite or otherwise unsuitable for a new Candidate.

Normal project JSON cannot encode `NaN`/Infinity faithfully, but the pure resolver should still not assume that every in-memory imported/test value is valid.

## Modern-window precedence

If raw exception has both:

- `timeWindow`;
- legacy top-level `periodId`;

the read resolver uses `timeWindow` as semantic source.

The legacy field is shadowed compatibility residue.

No read operation removes it.

## Candidate responsibility

A Candidate represents a complete intended new canonical value.

It contains only authoring meaning needed for a write:

- stable id;
- Character id;
- valid active range;
- modern normalized time window;
- explicit unambiguous Location or Absent intent;
- finite numeric priority;
- normalized optional reason.

It contains no:

- legacy top-level `periodId`;
- unresolved reference;
- incomplete form value;
- React state;
- runtime state.

## Strict Candidate validation

The core is authoritative even if UI pre-validates.

Required checks:

- usable id;
- Character exists;
- days are valid;
- `toDay` does not precede `fromDay`;
- period exists;
- exact minutes are valid integers in 0..1439;
- exact effective interval ends strictly after its start;
- effective exact end-day offset is 0 or 1;
- intent is exactly Location or Absent;
- Location exists for Location intent;
- priority is finite.

### Exact interval rule

For exact Candidate:

```text
absoluteEnd = endMinute + endDayOffset * 1440
absoluteEnd > startMinute
```

This is intentionally stricter than current RoutineRule authoring validation.

## Reason normalization

Candidate/write comparison uses:

```text
trim(reason)
blank -> undefined
```

Raw rendering remains non-destructive.

## Semantic equality responsibility

The core compares current raw stored exception with complete Candidate by authored meaning.

It must treat as equal when all semantic fields match, including:

- legacy `periodId = P` vs modern `timeWindow.periodId = P`;
- exact omitted offset vs equivalent inferred explicit offset;
- whitespace-only/trim-equivalent reason;
- same Character/range/intent/priority.

It must **not** collapse:

- through-project-end range into explicit final-day bound;
- conflicting raw intent into Location or Absent;
- unresolved references into a selected replacement.

## Mutation responsibility

### Add

Order:

1. Candidate structurally valid against current project?
2. id already exists?
3. invalid/duplicate → exact original project;
4. valid → serialize one modern ScheduleException;
5. append exactly one record;
6. update normal authored `updatedAt`.

### Update

Order:

1. existing id?
2. Candidate valid against current project?
3. semantic equality?
4. any failure / unchanged → exact original project;
5. meaningful update → replace exactly one same-id record with modern canonical serialization;
6. update normal authored `updatedAt`.

### Remove

Order:

1. id exists?
2. missing → exact original project;
3. exists → remove exactly that record;
4. update normal authored `updatedAt`.

Remove does not require Candidate validity.

## Mutation isolation

On successful add/update/remove, the core modifies only:

- `scheduleExceptions`;
- ordinary authored update metadata such as `updatedAt`.

It does not modify:

- `routineRules`;
- `simulation`;
- `editor`;
- runtime history arrays;
- Characters;
- Locations;
- template;
- Story state.

## Single reason to exist

Own Schedule Exception authored meaning and canonical transition policy.

# COMP-SE-002 — Existing Narrative Authoring Router Integration

**Name:** existing NarrativeProject authored command/history router.

**Existing frozen Stage 4 file:**

`src/store/narrative-project/routine-authoring.ts`

## Responsibility

Integrate the new command family into the existing authored history path.

## Required changes

Conceptually:

1. import the new Schedule Exception command type;
2. include it in `NarrativeAuthoringCommand`;
3. recognize its command discriminants;
4. route it to COMP-SE-001;
5. keep the existing identity-based history rule.

## Required history behavior

If COMP-SE-001 returns:

`nextProject === state.present`

then router returns the exact current history state.

Therefore:

- no Undo entry;
- Redo preserved;
- no false authoring change.

If COMP-SE-001 returns a changed project:

- old present enters `past`;
- new project becomes `present`;
- `future` clears.

## Explicitly not owned

COMP-SE-002 must not:

- validate Schedule Exception fields itself;
- duplicate semantic equality;
- inspect diagnostics;
- update runtime;
- refactor RoutineRule validation;
- know React draft state.

## Existing RoutineRule branch

RoutineRule behavior is left unchanged.

D3 adds a sibling command branch.

## Single reason to exist

Route typed authored commands through the existing history mechanism.

# COMP-SE-003 — ScheduleExceptionAuthoringPanel

**Name:** focused Schedule Exception authoring UI.

**Layer:** React presentation.

**Frozen Stage 4 file:**

`src/components/narrative/workspace/schedule-exception-authoring-panel.tsx`

## Responsibility

Let the author:

- inspect all existing Schedule Exceptions;
- start a new exception draft;
- edit one existing exception;
- repair stale/conflicting imported data explicitly;
- Cancel local edits;
- Remove an exception even when it is stale/conflicting;
- submit one complete Candidate through typed authored command execution.

It is a form/list presentation component, not a second schedule engine.

## Canonical dependencies

The component reads from existing `useNarrativeProject()`:

- `project`;
- `execute`;
- `createId`.

It reads:

- `project.scheduleExceptions`;
- `project.characters`;
- `project.locations`;
- `project.template.dayCount`;
- `project.template.periods`.

It calls COMP-SE-001 for:

- stored read resolution;
- Candidate validity/equality assistance as finalized in Stage 6.

## Why it uses context directly

Passing the entire project/execute/createId through RoutineAuthoringPanel props would turn the parent into needless plumbing.

The existing RoutineAuthoringPanel already uses the same context directly.

A focused sibling subcomponent may do the same without creating a new ownership layer.

## Local state ownership

All incomplete form state is local to COMP-SE-003.

Conceptual UI draft:

```ts
type ExceptionRangeMode =
  | 'one-day'
  | 'bounded'
  | 'through-project-end';

type ExceptionWindowMode = 'period' | 'exact';

type ExceptionIntentDraftMode =
  | 'unset'
  | 'location'
  | 'absent'
  | 'conflicting-import';

interface ScheduleExceptionFormDraft {
  editingId?: string;
  characterId: string;

  rangeMode: ExceptionRangeMode;
  fromDay: string;
  toDay: string;

  windowMode: ExceptionWindowMode;
  periodId: string;
  startTime: string;
  endTime: string;
  endDayOffset: '0' | '1';

  intentMode: ExceptionIntentDraftMode;
  locationId: string;

  priority: string;
  reason: string;

  sourceToken?: string;
}
```

Exact Stage 6 type may split create/edit state rather than use one interface.

The important ownership rule is:

> string/blank/partial form state stays in React and never enters NarrativeProject.

## Create mode

Default state should make required intent visible without inventing semantic data.

### Initial create defaults

Allowed UI conveniences:

- range mode: one-day;
- `fromDay`: current sensible authored default such as day 1;
- window mode: period when at least one template period exists, otherwise exact;
- first template period may be preselected as a **visible form convenience**;
- exact clock fields may use visible starter values;
- intent starts explicit or unset according to Detailed Design;
- priority must start blank;
- reason starts blank.

### No hidden priority

The component must not invent 0/10/100.

Priority remains blank until the author supplies it.

### Create id timing

Preferred design:

- do not reserve/persist an id merely by opening the form;
- generate `createId('schedule-exception')` only when a locally complete create draft is about to dispatch Add.

This avoids unused draft identifiers and keeps identity an authored commit concern.

Stage 6 will freeze exact prefix/discriminant.

## Edit mode

Pressing Edit on one stored exception:

1. resolve raw exception through COMP-SE-001;
2. keep current canonical summary visible;
3. create a local editable draft;
4. attach draft to a **canonical source token** for that stored exception version.

### Resolved valid values

Initialize corresponding controls normally.

### Legacy period

If legacy `periodId` resolves:

- initialize Period mode with that period id;
- current summary may label it as legacy/compatibility if useful;
- no canonical mutation occurs.

### Unresolved Character

- current summary shows stored missing Character id;
- editable Character selector starts blank;
- author must deliberately select a valid Character before Apply.

### Unresolved Location

- current summary shows stored missing Location id;
- Location intent remains visible;
- editable Location selector starts blank;
- author must choose a valid Location or switch to Absent.

### Conflicting imported intent

If raw record has both:

- `absent: true`;
- target Location;

then:

- current summary states the conflict;
- draft intent starts `conflicting-import`;
- Apply disabled;
- author must explicitly choose Location or Absent.

### Unspecified intent

If neither Location nor Absent is present:

- current summary states that destination is not specified;
- draft intent starts `unset`;
- Apply disabled until explicit choice.

### Missing/unresolved window

If period id is missing from template or no usable window exists:

- current summary shows unresolved/missing authored value;
- editable controls do not silently substitute the first period as if it were canonical;
- author must explicitly choose a valid period or exact window.

### Invalid range/priority

Show raw current summary safely.

Editable fields may carry a parseable raw value when possible, but Apply remains disabled until the draft builds a valid Candidate.

## Canonical source synchronization

This is a P0 UI correctness rule.

The edit draft is derived from one concrete canonical exception version.

It must reset/rebase when that source changes because of:

- successful Apply;
- Undo;
- Redo;
- another authored update;
- project reload/recovery replacement.

It must not reset because unrelated project/runtime state changes.

## Why id/value key alone is insufficient

A source key based only on:

`exception.id + serialized semantic value`

can suffer an ABA transition:

```text
canonical A
  -> canonical B
  -> canonical A
```

A stale dirty draft originally based on the first A must not be treated as current merely because semantic key is again A.

Therefore Component Design requires a version-aware source token.

## Source-token design

Preferred pattern:

- keep a ref to the last canonical raw exception object for the editing id;
- maintain a monotonically increasing local source revision;
- increment revision when:
  - editing id changes; or
  - canonical raw exception object reference changes; or
  - the edited exception disappears/reappears;
- derive:
  `sourceToken = revision + ':' + editingId`;
- draft stores the token it was initialized from.

The form is current only when:

`draft.sourceToken === currentSourceToken`.

Exact React mechanics belong to Detailed Design.

### Why object reference is useful here

Existing immutable authored reducers replace a changed record while preserving unchanged record references.

Unrelated runtime/project updates normally do not replace the raw ScheduleException object.

This gives a narrow change signal without serializing all fields.

### Disappearance

If the exception being edited is removed externally/Undo changes availability:

- exit or invalidate edit mode;
- do not dispatch an Update against stale local draft.

## Dirty draft vs canonical update

Canonical update wins.

If author has an uncommitted dirty edit and an Undo/Redo/external authored change updates that same exception:

- stale local draft is discarded/reinitialized;
- UI reflects new canonical source.

No merge UI is required for first slice.

## Draft parsing responsibilities

The React component owns string-to-primitive parsing only:

- day number inputs;
- clock `HH:MM` to minute;
- priority text/number to Number;
- explicit range mode;
- intent control.

It does not own canonical validity.

The core revalidates every Candidate against current project at dispatch time.

## Clock behavior

Use the same human interaction convention as Routine authoring:

- exact start/end use time controls;
- end earlier than start defaults to next-day offset 1;
- end later than start defaults to same-day offset 0.

Because D3 must also round-trip explicit exact semantics, the UI should preserve an existing valid stored `endDayOffset` when loading edit state.

For ambiguous cases such as same start/end:

- offset 0 is invalid;
- offset 1 represents a 24-hour window under current Stage 2 contract.

Detailed Design must make the next-day meaning explicit enough that the author can intentionally preserve/change it.

## Range UI

The form must expose range intent, not only two numbers.

Required modes:

### One day

- one day field;
- Candidate activeRange writes:
  `{fromDay: N, toDay: N}`.

### Bounded

- from + to fields;
- Candidate writes both values.

### Through project end

- from field only;
- Candidate omits `toDay`.

This prevents UI from collapsing open-ended intent into explicit final-day bound.

## Intent UI

Required options after imported repair state:

- At Location;
- Absent.

### At Location

Show Location selector.

Apply requires a current canonical Location.

### Absent

Hide/disable Location selector.

Candidate contains Absent intent only.

### Switching intent

Switching to Absent clears the editable Location target.

Switching to Location requires deliberate valid Location selection.

Do not silently restore an old stale/conflicting Location unless the author reselects it.

## Priority UI

Use numeric input with explicit explanatory text.

Required explanation:

- higher priority overrides lower priority during overlap;
- equal maximum priority may produce an ambiguity warning.

Do not claim that the form itself resolves conflicts.

Do not block Apply solely because an ambiguity warning may result.

## Reason UI

Plain optional text input/textarea.

Current raw reason may be shown as entered.

Candidate normalizes trim/blank on Apply.

## Apply rule

UI should disable Apply when it cannot construct a complete Candidate.

It may also disable Apply for an edit when COMP-SE-001 proves candidate semantically unchanged.

Authoritative protection remains in the core because canonical references can change between render and dispatch.

## Apply — create

1. parse local draft;
2. construct complete Candidate fields;
3. locally validate through COMP-SE-001;
4. if invalid, keep form and show actionable message;
5. generate id;
6. dispatch typed Add;
7. after canonical project reflects successful add, reset to clean create mode.

### Important

Do not optimistically clear the form before there is canonical evidence that the add exists.

Because `execute` returns void, the UI cannot treat dispatch itself as proof of success.

Detailed Design must use canonical project observation or a safely deterministic local rule.

## Apply — edit

1. ensure draft source token matches current canonical source;
2. build complete Candidate with existing id;
3. validate;
4. compare semantic equality;
5. unchanged → no dispatch or harmless core no-op; preferred UI behavior is disable/no dispatch;
6. changed → dispatch Update;
7. on canonical source change, reinitialize from the new stored record.

Do not clear edit mode merely because `execute` was called.

## Cancel

### Create mode

Reset local draft only.

No command.

### Edit mode

Exit edit mode and restore clean create state.

No command.

No history entry.

## Remove

Remove button acts on raw stored id, not Candidate.

Therefore it remains available for:

- stale Character;
- stale Location;
- conflicting intent;
- invalid/missing window;
- otherwise malformed imported record.

After dispatch, local edit state clears only once the canonical record is absent or immediately in a way that cannot emit a stale update; Detailed Design will specify exact sequencing.

## User feedback

No toast/event bus is introduced.

Use local inline status text.

Messages should distinguish at least:

- incomplete/invalid draft;
- stale edit source changed;
- unresolved imported reference requiring repair;
- conflicting imported intent;
- no exceptions yet.

A normal Story Brain ambiguity warning remains owned by Story Brain.

## List/read view

Each canonical exception card should identify:

- Character name or unresolved stored id;
- day-range meaning;
- window meaning;
- Location / Absent / conflict / unspecified intent;
- priority;
- optional reason;
- Edit;
- Remove.

### Range labels

Must distinguish:

- `День N`;
- `Дни A–B`;
- `С дня A до конца проекта`.

### Window labels

Must distinguish:

- resolved period label;
- exact time, including `+1 день` when applicable;
- missing/unresolved period id;
- missing/invalid window.

### Intent labels

Must distinguish:

- Location name;
- missing Location id;
- Absent;
- conflicting stored intent;
- unspecified destination.

Unresolved/conflicting states must be textual, not color-only.

## Empty states

### No exceptions

Show explicit empty-state text.

### No Characters

Creation cannot produce a Candidate.

Explain that a Character is required.

Existing stale exception cards remain inspectable/removable.

### No Locations

Absent remains authorable.

Location intent cannot commit.

### No periods

Period mode cannot commit.

Exact mode remains available.

## Accessibility

Required accessible labels for:

- Character;
- range mode;
- day/from/to controls;
- time-window mode;
- period;
- start/end time;
- next-day/end-day-offset control if exposed;
- intent mode;
- Location;
- priority;
- reason;
- Apply/Create;
- Cancel;
- Edit;
- Remove.

Do not rely on placeholder alone.

Native disabled semantics should be used for disabled Apply.

Status/error text must be textual.

## Single reason to exist

Own the Schedule Exception list/form interaction while delegating canonical semantics to COMP-SE-001.

# COMP-SE-004 — Existing RoutineAuthoringPanel Container

**Name:** existing WORLD/TIME authored schedule section container.

**Existing frozen Stage 4 file:**

`src/components/narrative/workspace/routine-authoring-panel.tsx`

## Responsibility for D3

Keep existing RoutineRule editor unchanged and compose COMP-SE-003 in the same schedule authoring surface.

## Preferred structure

Conceptually:

```tsx
<section aria-label="Расписания персонажей">
  <RoutineRulesSection /> // existing current content, whether inline or not
  <ScheduleExceptionAuthoringPanel />
</section>
```

Stage 4 does not approve extracting the existing Routine editor into another production file.

Therefore first-slice implementation should make the smallest composition change:

- retain current component/function;
- render the new Schedule Exception component near the end of the current schedule section.

## Content hierarchy

The existing introductory wording should continue to explain that authored schedule intent does not directly rewrite Actual Presence.

The Schedule Exception subsection should additionally state that it temporarily overrides normal schedule intent by priority.

## Dependencies

COMP-SE-004 depends on COMP-SE-003 only for composition.

It should not own exception draft state or validation.

## Single reason to exist

Remain the existing WORLD/TIME schedule authoring surface.

# COMP-SE-005 — Existing Authoring History / Runtime Preservation

No production file change.

## Existing owners

- NarrativeProject history reducer;
- NarrativeProjectContext;
- `keepCurrentRuntime`.

## Responsibility reused

Meaningful D3 authored changes participate in Undo/Redo.

Undo/Redo restores authored exceptions while preserving current runtime projection.

## Test seam

A D3 runtime-history test must prove:

```text
authored exception A
  -> authored exception B
  -> runtime advances / Actual Presence changes
  -> Undo authored
       exception A restored
       current runtime preserved
  -> Redo authored
       exception B restored
       current runtime preserved
```

## Single reason to exist

Existing cross-cutting history/runtime boundary; no D3 code ownership.

# COMP-SE-006 — Existing Persistence Boundary

No production file change.

## Responsibility reused

Schedule Exceptions remain in authored projection.

Simulation remains in runtime projection.

Legacy records remain load-compatible.

## Test seam

Save/reopen must prove:

- modern authored D3 record persists;
- runtime remains independent;
- legacy raw record loads;
- explicit meaningful edit can modernize only the edited exception.

# COMP-SE-007 — Existing Derived Search / Diagnostics

No production file change.

## Project Search

Reads canonical `scheduleExceptions`.

CRUD should naturally change derived documents.

Current fromDay-midnight navigation remains unchanged.

## Schedule analysis / Story Brain

Reads canonical `scheduleExceptions`.

Equal-max priority remains warning.

Different-priority overlap remains valid.

## Test seam

Use existing public derived functions against projects produced by D3 authored commands.

Do not mock a second conflict/search engine in UI tests.

## 3. Dependency direction

Allowed:

```text
domain schedule/project
        ↑
schedule-exception-authoring core
        ↑
routine-authoring router
        ↑
NarrativeProjectContext execute path

schedule-exception-authoring core
        ↑
ScheduleExceptionAuthoringPanel
        ↑
RoutineAuthoringPanel composition
```

The UI may depend on read/validation exports from the core.

The core may not depend on UI.

Derived Search/diagnostics depend on canonical project after the fact; D3 core does not call them.

## 4. State ownership table

| State | Owner | Persisted? |
|---|---|---:|
| raw ScheduleException records | NarrativeProject.scheduleExceptions | yes |
| legacy periodId | raw ScheduleException compatibility shape | yes if already stored |
| modern timeWindow | raw ScheduleException | yes |
| resolved Character/Location/window status | COMP-SE-001 derived projection | no |
| complete Candidate | transient command/application value | no |
| create/edit form strings | COMP-SE-003 | no |
| editing exception id | COMP-SE-003 | no |
| canonical source revision/token | COMP-SE-003 local refs/state | no |
| validation/status message | COMP-SE-003 | no |
| Undo/Redo history | existing authoring history | in-memory editor mechanism |
| Simulation Playhead | runtime simulation | runtime persistence |
| Actual Presence | runtime simulation | runtime persistence |
| ambiguity warning | derived schedule analysis | no |
| Search document | derived Project Search | no |

## 5. Draft synchronization state machine

### Create

```text
Clean Create
   │ edit fields
   ▼
Dirty / incomplete create draft
   │
   ├── Cancel -> Clean Create
   │
   └── valid Apply
          │
          ├── core reject -> keep draft + status
          │
          └── canonical new record appears
                 -> Clean Create
```

### Edit

```text
Stored Exception version V1
   │ Edit
   ▼
Draft(sourceToken V1)
   │
   ├── local field edits -> Dirty Draft(V1)
   │
   ├── Cancel -> exit edit
   │
   ├── canonical same entity changes to V2
   │       -> discard stale draft
   │       -> initialize Draft(V2)
   │
   ├── entity disappears
   │       -> exit/invalidate edit
   │
   └── valid changed Apply
          -> dispatch Update
          -> wait for canonical V2
          -> initialize Draft(V2)
```

### ABA safety

```text
V1 semantic A
 -> V2 semantic B
 -> V3 semantic A
```

Draft created from V1 is not valid for V3 merely because semantic content matches again.

Source revision distinguishes V1 from V3.

## 6. Why UI must not optimistically assume execute succeeded

Current context API:

`execute(command): void`

There is no returned mutation result.

Core may reject due to a race after UI validation:

- Character removed;
- Location removed;
- template period changed;
- source version changed.

Therefore Component Design prohibits:

```text
execute(...)
immediately reset edit/create as if success
```

without canonical confirmation.

### Create confirmation

The generated id is known.

Successful add is confirmed when current canonical:

`project.scheduleExceptions.some(item => item.id === generatedId)`.

If a dispatched create is rejected, keep the draft and show/recompute invalid state.

### Edit confirmation

Successful update is confirmed by canonical source version change and semantic equality to the intended Candidate.

If source changes differently, treat as canonical external change and rebase rather than pretending success.

### Remove confirmation

Removal is confirmed when id is absent.

This avoids introducing a command result bus while keeping UI truthful.

Detailed Design must keep confirmation logic small.

## 7. Candidate building split

### UI owns

- parsing input strings;
- choosing range mode;
- choosing window mode;
- choosing intent mode;
- generating create id at commit;
- forming a complete typed Candidate-shaped value only when fields are parseable.

### Core owns

- canonical reference existence;
- day bounds;
- period resolution;
- exact interval validity;
- priority finite;
- semantic equality;
- canonical serialization.

### Why

HTML controls are UX, not integrity boundaries.

Core remains authoritative under races/tests/imports.

## 8. Styling decision

### Decision

**No CSS production change is required by Stage 5 design.**

Existing classes are sufficient:

- `narrative-workspace__move-editor`;
- `narrative-workspace__compact-form`;
- `narrative-workspace__skill-check-editor`;
- `narrative-workspace__move-list`;
- `narrative-workspace__move-card`;
- `narrative-workspace__inspection-actions`.

The new subsection should reuse them.

### Reopen condition

Only if implementation proves a concrete accessibility/layout defect.

Any CSS addition remains inside the Stage 4 conditional C1 boundary.

## 9. Test seams

### TEST-SEAM-SE-001 — core read resolution

Directly test COMP-SE-001:

- resolved/unresolved Character;
- one-day/bounded/open-ended range;
- modern/legacy period;
- exact inferred/explicit offset;
- missing period;
- missing/invalid window;
- Location/Absent/conflicting/unspecified intent.

### TEST-SEAM-SE-002 — Candidate validation

Directly test:

- Character target;
- Location target;
- day bounds;
- period exists;
- exact positive effective duration;
- priority finite;
- reason normalization.

### TEST-SEAM-SE-003 — semantic equality

Directly test:

- raw modern same;
- legacy period vs modern period;
- inferred vs explicit exact offset;
- range intent distinction;
- reason trim;
- conflict/unresolved cannot become silent equal repair.

### TEST-SEAM-SE-004 — authored mutation/history

Use existing authoring reducer:

- add;
- update;
- remove;
- exact identity no-op;
- Undo/Redo;
- Redo preservation on no-op.

### TEST-SEAM-SE-005 — UI create

Render existing WORLD/TIME schedule surface.

Drive accessible controls.

Assert:

- no mutation before Apply;
- valid create;
- rejected create keeps draft;
- canonical confirmation resets form.

### TEST-SEAM-SE-006 — UI edit / ABA

Assert:

- Edit initializes from canonical record;
- local dirty draft does not mutate project;
- Undo/Redo/external same-id canonical transition invalidates stale draft;
- A→B→A does not resurrect V1 draft;
- successful update reinitializes from canonical result.

### TEST-SEAM-SE-007 — stale/conflicting UI

Fixtures with:

- missing Character;
- missing Location;
- both absent + Location;
- unspecified intent;
- legacy missing period.

Assert:

- render-safe;
- no auto mutation;
- explicit repair works;
- Remove works without repair.

### TEST-SEAM-SE-008 — runtime preservation

Existing runtime-history seam.

Assert current Playhead/Actual Presence survive D3 authored Undo/Redo.

### TEST-SEAM-SE-009 — persistence

Save/reload modern and legacy records with independent runtime.

### TEST-SEAM-SE-010 — derived Search/diagnostics

Run existing derived functions against post-command project.

No production Search/diagnostic modifications.

## 10. Component-to-file mapping

| Component | Production file | Change type |
|---|---|---|
| COMP-SE-001 Authoring Core | `src/store/narrative-project/schedule-exception-authoring.ts` | new |
| COMP-SE-002 Router | `src/store/narrative-project/routine-authoring.ts` | narrow modify |
| COMP-SE-003 UI | `src/components/narrative/workspace/schedule-exception-authoring-panel.tsx` | new |
| COMP-SE-004 Container | `src/components/narrative/workspace/routine-authoring-panel.tsx` | narrow composition |
| COMP-SE-005 History/runtime | existing files | test only |
| COMP-SE-006 Persistence | existing files | test only |
| COMP-SE-007 Search/diagnostics | existing files | test only |
| Styling | existing workspace CSS | no change expected |

No component requires a file outside frozen Stage 4 production boundary.

## 11. Component-to-requirement traceability

| Requirement | Component owner |
|---|---|
| REQ-SE-001 canonical owner | COMP-SE-001 |
| REQ-SE-002 typed CRUD/history | COMP-SE-001 + COMP-SE-002 |
| REQ-SE-003 Character validation | COMP-SE-001 |
| REQ-SE-004 day range | COMP-SE-001 + COMP-SE-003 |
| REQ-SE-005 modern timeWindow | COMP-SE-001 + COMP-SE-003 |
| REQ-SE-006 Location/Absent | COMP-SE-001 + COMP-SE-003 |
| REQ-SE-007 priority | COMP-SE-001 + COMP-SE-003 + existing analysis |
| REQ-SE-008 reason | COMP-SE-001 + COMP-SE-003 |
| REQ-SE-009 runtime separation | COMP-SE-001 isolation + COMP-SE-005 |
| REQ-SE-010 diagnostics | COMP-SE-007 |
| REQ-SE-011 Search | COMP-SE-007 |
| REQ-SE-012 persistence | COMP-SE-006 |
| REQ-SE-013 semantic no-op | COMP-SE-001 + COMP-SE-002 |

## 12. Component design decisions

### DEC-SE-024 — one semantic core

Read resolution, Candidate validation, semantic equality and mutation live together in the focused Schedule Exception authoring core.

### DEC-SE-025 — router remains thin

`routine-authoring.ts` only integrates command/history routing.

### DEC-SE-026 — focused React component

Schedule Exception CRUD gets its own React component file.

### DEC-SE-027 — context access

The new subcomponent uses existing NarrativeProject context directly.

No prop plumbing/provider.

### DEC-SE-028 — local draft only

Incomplete state never enters NarrativeProject.

### DEC-SE-029 — canonical confirmation

Because `execute` returns void, create/update/remove UI does not treat dispatch as success; it observes canonical project state.

### DEC-SE-030 — version-aware edit source

Edit draft uses a canonical source token/revision, not only id/value equality.

ABA transitions invalidate stale draft.

### DEC-SE-031 — range intent explicit

One-day, bounded, and through-project-end are separate UI modes.

### DEC-SE-032 — imported anomalies remain explicit

Missing references, conflicting/unspecified intent and missing windows are rendered without auto repair.

### DEC-SE-033 — Remove bypasses Candidate validation

Raw record id is enough to request deletion.

### DEC-SE-034 — no CSS expected

Reuse existing workspace classes.

### DEC-SE-035 — no command result bus

Canonical observation plus pure validation is sufficient.

## 13. Stage 5 findings

### FINDING-SE-030 — create success needs canonical confirmation

Current `execute(): void` means UI cannot infer success from dispatch.

Generated-id observation solves this without changing context API.

### FINDING-SE-031 — edit draft needs source-version identity

Semantic key alone is insufficient under ABA.

A local source revision tied to canonical raw object replacement is required.

### FINDING-SE-032 — current immutable update style supports narrow source tracking

Changed entities receive replacement objects while unrelated project/runtime updates usually preserve the exception object reference.

This makes raw object reference a useful local invalidation signal.

### FINDING-SE-033 — component must preserve open-ended range intent

Current Routine UI collapses omitted `toDay` to project dayCount during editing.

D3 must not copy that behavior because Stage 2 says open-ended and explicit final bound are semantically distinct.

### FINDING-SE-034 — legacy edit does not require a migration UI

Valid legacy period can initialize modern period controls.

Only meaningful explicit Apply writes modern shape.

### FINDING-SE-035 — invalid imported records need read summary separate from editable draft

This avoids silently replacing a missing Character/Location/period with the first available option.

### FINDING-SE-036 — exact time UI must represent end-day offset deliberately

Simple "end earlier means next day" is enough for most creates, but edit round-trip requires preserving valid explicit offset, including same-time +1 day.

Stage 6/8 must make that representation deterministic.

## 14. Gate Review — Stage 5 → Stage 6 Contracts / Interfaces

### Component checks

✅ Every frozen production file has one bounded responsibility.

✅ No component escapes Stage 4 blast radius.

✅ Semantic core ownership defined.

✅ Router remains history integration only.

✅ UI subcomponent ownership defined.

✅ Draft/canonical boundary defined.

✅ Create/edit/remove flows defined.

✅ Canonical confirmation defined.

✅ Stale/unresolved/conflicting behavior defined.

✅ Legacy behavior defined.

✅ ABA-safe source synchronization defined.

✅ Range intent preservation defined.

✅ Exact window offset design requirement identified.

✅ Accessibility labels defined.

✅ CSS expansion not required.

✅ Test seams defined.

### Stage 6 must freeze

1. exact exported TypeScript types from `schedule-exception-authoring.ts`;
2. exact command discriminants and payloads;
3. exact Candidate / normalized window / intent types;
4. exact resolved read projection discriminants;
5. exact validation result vocabulary;
6. exact semantic equality signature;
7. exact mutation/apply signature;
8. exact command type guard/router integration;
9. exact UI draft types where cross-function contracts matter;
10. exact end-day-offset control semantics;
11. exact source-token contract needed for edit synchronization;
12. exact labels/messages needed by integration tests.

### Gate decision

**✅ PASS to Stage 6 Contracts / Interfaces.**

No Stage 5 blocker exists.

Production implementation remains prohibited until Stage 6–8 complete.
