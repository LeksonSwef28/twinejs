# 93 Days — A67-D3 Schedule Exception Authoring · Stage 7 Dynamic Flow / Data Flow

Status: **STAGE 7 COMPLETE — PASS to Detailed Design**
Base: `93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`
Design head before this document: `81e9d1d023154dd49208c6465638ae8e8566e6a9`
Depends on A67-D3 Stage 0–6 documents.
Date: **2026-10-03**
Production code in this slice: **none**

## 0. Goal / Definition of Done

Stage 7 answers:

> Can the frozen Stage 6 contracts execute end-to-end through the current authored command/history/context/persistence architecture without transiently persisting incomplete Schedule Exceptions, silently repairing legacy/stale data, mutating runtime presence, losing draft correctness under canonical changes, or creating false Undo history?

Definition of Done:

1. create path traced from form input to canonical project;
2. edit path traced with source-token protection;
3. same-value/no-op path explicit;
4. stale reference race explicit;
5. legacy period read → meaningful modern write explicit;
6. conflicting imported intent repair explicit;
7. malformed raw remove path explicit;
8. Undo/Redo after later runtime changes explicit;
9. persistence path explicit;
10. Search/diagnostic derived refresh explicit;
11. A→B→A source transition explicit;
12. all failure paths preserve exact identity where required;
13. no production implementation started;
14. no blocker remains before Stage 8 Detailed Design.

## 1. Live architecture facts used by this stage

### FACT-SE-D7-001 — execute applies against current reducer state

NarrativeProjectContext exposes:

`execute(command): void`

implemented through a functional state update.

Therefore command validation runs against the then-current reducer state, not a stale project object captured when the button first rendered.

This is the primary defense against:

- Character removed between render and Apply;
- Location removed between render and Apply;
- template period removed/changed;
- same exception changed before old handler dispatches.

### FACT-SE-D7-002 — history is controlled by project reference identity

The authored history router compares:

`nextProject === state.present`.

Exact original project means:

- no `past` append;
- no `future` clear;
- no authored Undo step.

### FACT-SE-D7-003 — current runtime survives authored Undo/Redo

NarrativeProjectContext applies:

`keepCurrentRuntime(restored.present, current.present)`

after authored history Undo/Redo.

Therefore current:

- Simulation Playhead;
- `simulation.actualLocationByCharacter`;
- other runtime projection fields

remain current while older/newer authored Schedule Exceptions are restored.

### FACT-SE-D7-004 — Schedule Exceptions are already persisted authored data

No feature-specific repository call is required.

A canonical Schedule Exception change enters normal project save flow.

### FACT-SE-D7-005 — Search and diagnostics are derived

Project Search and schedule analysis read:

`project.scheduleExceptions`

from canonical project state.

The D3 mutation path does not push updates into either system.

### FACT-SE-D7-006 — current executable readers infer missing exact offset

For raw exact windows:

`endDayOffset ?? (endMinute < startMinute ? 1 : 0)`

is the active behavior in schedule readers.

D3 resolution/equality follows that same rule.

## 2. Global execution rule — canonical project wins

There are four state classes:

### Canonical authored state

`NarrativeProject.scheduleExceptions[]`

### Local form state

Incomplete create/edit draft strings and modes.

### Local synchronization state

- editing id;
- source revision/token;
- pending canonical confirmation.

### Derived state

- Search index;
- Story Brain schedule findings;
- persistence projections.

Correct ordering:

```text
render canonical project
→ resolve raw exceptions
→ initialize/synchronize local draft
→ author edits local draft
→ UI parses complete Candidate
→ core validates Candidate against current render
→ execute typed command
→ reducer/core validates again against latest project
→ canonical mutation OR exact no-op
→ authored history changes only if canonical project identity changed
→ next render observes canonical state
→ pending commit confirms/fails from canonical evidence
→ draft reinitializes only from canonical source
→ Search/diagnostics/persistence derive naturally
```

### Safety rule

No incomplete draft ever enters NarrativeProject.

Valid local transient states include:

- blank Character;
- blank priority;
- Location intent with no selected Location;
- invalid clock pair;
- conflicting imported intent awaiting explicit choice;
- draft referring to a target deleted after the last render.

All remain local until a complete Candidate exists.

## 3. Render/read flow — raw canonical record → safe authoring projection

For each raw exception E:

1. UI reads current E directly from `project.scheduleExceptions`;
2. calls `resolveScheduleExceptionForAuthoring(project, E)`;
3. resolver classifies:
   - Character;
   - range;
   - window;
   - intent;
   - priority validity;
4. card summary renders canonical meaning/anomalies;
5. no mutation is dispatched.

### Read result examples

#### Valid modern period

```text
raw timeWindow(period P)
→ period P exists
→ resolved source=modern
```

#### Valid legacy period

```text
raw timeWindow missing + periodId=P
→ P exists
→ resolved source=legacy-period
```

#### Shadowed legacy period

```text
raw timeWindow modern + legacy periodId
→ modern timeWindow wins
→ legacy residue does not affect current semantic read
```

#### Missing period

```text
period id not in template
→ unresolved-period
→ render id text
→ no fallback period selected canonically
```

#### Conflicting intent

```text
absent=true + targetLocationId=L
→ conflicting
→ render conflict
→ no winner inferred
```

## 4. Flow 1 — create one-day Location exception

### Initial canonical state

- Character C exists;
- Location L exists;
- template period/time rules valid;
- no exception with new id;
- current Simulation Playhead = P;
- Actual Presence map = A.

### Step 1 — author fills local form

Example:

- Character = C;
- range mode = one-day;
- day = 4;
- window mode = exact;
- start = 10:00;
- end = 12:00;
- end day = same day;
- intent = Location;
- Location = L;
- priority = 50;
- reason = "appointment".

Every field update mutates React local state only.

Canonical project remains unchanged.

### Step 2 — UI parses Candidate fields

Local conversion parses:

- day 4;
- 10:00 → 600;
- 12:00 → 720;
- offset `0`;
- priority "50" → 50.

At this moment no id has been generated yet.

### Step 3 — create id

When complete local input is ready to commit:

`createId('schedule-exception')`

produces id E.

Candidate:

```ts
{
  id: E,
  characterId: C,
  activeRange: {fromDay: 4, toDay: 4},
  timeWindow: {
    type: 'exact',
    startMinute: 600,
    endMinute: 720,
    endDayOffset: 0
  },
  intent: {type: 'location', locationId: L},
  priority: 50,
  reason: 'appointment'
}
```

### Step 4 — advisory UI validation

UI calls:

`validateScheduleExceptionCandidate(project, candidate)`.

Result = valid.

### Step 5 — pending confirmation is established

Before/with dispatch, local pending state records:

```text
create(candidate E)
```

The UI must not yet reset the form.

### Step 6 — dispatch

```ts
execute({
  type: 'scheduleException/add',
  candidate
})
```

### Step 7 — reducer routes current command

Existing authored router identifies D3 command and calls:

`applyScheduleExceptionAuthoringCommand(currentProject, command)`.

### Step 8 — core revalidates current canonical project

Order:

1. id nonblank;
2. Character C still exists;
3. day 4 still valid;
4. exact window structurally valid and positive duration;
5. Location L still exists;
6. priority finite;
7. duplicate E absent.

### Step 9 — canonical serialization

Core writes existing ScheduleException shape:

```ts
{
  id: E,
  characterId: C,
  activeRange: {fromDay: 4, toDay: 4},
  timeWindow: {
    type: 'exact',
    startMinute: 600,
    endMinute: 720,
    endDayOffset: 0
  },
  targetLocationId: L,
  priority: 50,
  reason: 'appointment'
}
```

No top-level legacy `periodId`.

No `absent`.

### Step 10 — history

Core returns new project.

Router creates exactly one authored history transition.

### Step 11 — runtime invariants

Unchanged:

- Playhead P;
- Actual Presence A;
- runtime occurrence data.

### Step 12 — canonical confirmation

Next render finds exception E.

UI compares raw E to pending Candidate using semantic equality.

If equal:

- pending create clears;
- create form resets.

This is the first point where UI may claim success.

## 5. Flow 2 — create Absent period exception

Differences from Flow 1:

Draft:

- window = period P;
- intent = Absent.

Candidate:

```ts
timeWindow: {type:'period', periodId:P}
intent: {type:'absent'}
```

Serialized canonical result:

- `timeWindow.periodId = P`;
- `absent: true`;
- no target Location;
- no legacy top-level `periodId`.

No fake "Nowhere" Location is created.

## 6. Flow 3 — exact cross-midnight create

Draft:

- start 23:30;
- end 01:00;
- explicit end-day control = next day.

Candidate:

```ts
{
  type: 'exact',
  startMinute: 1410,
  endMinute: 60,
  endDayOffset: 1
}
```

Validation:

`60 + 1440 > 1410` → valid.

Canonical writes explicit offset 1.

### Invalid sibling

If:

- start 23:30;
- end 01:00;
- endDayOffset 0,

then:

`60 > 1410` → false.

Candidate validation rejects.

No canonical mutation.

## 7. Flow 4 — same-time 24-hour exact window

Draft:

- start 10:00;
- end 10:00;
- end day = next day.

Candidate:

```text
start = 600
end = 600
offset = 1
absoluteEnd = 2040
```

Valid under Stage 6 contract.

Same time with offset 0 is invalid.

This proves why end-day control cannot be inferred only from clock ordering after every edit.

## 8. Flow 5 — edit valid exception with source token

### Initial canonical version V1

Exception E:

- Character C;
- day 4;
- Location L1;
- priority 50.

UI enters edit.

Local source:

```text
id = E
revision = R1
raw = object(V1)
token = E:R1
```

Draft stores token E:R1.

### Local edit

Author changes:

- Location L1 → L2;
- priority 50 → 100.

No canonical mutation.

### Apply predicate

Requires:

- current E exists;
- current token still E:R1;
- Candidate builds;
- Candidate validates;
- semantic equality = false;
- no pending command for E.

### Dispatch

`scheduleException/update(candidate E)`.

### Core latest-state check

Core finds current E and revalidates current project references.

If valid and changed:

- replaces exactly E;
- other exceptions keep their relative entries/object references as normal immutable map behavior;
- Routine Rules unchanged.

### Canonical V2

Next render observes new raw object for E.

Local source revision increments:

`R1 → R2`.

Pending update Candidate equals canonical V2.

Then:

- pending clears;
- draft initializes from V2;
- token becomes E:R2;
- Apply disabled.

## 9. Flow 6 — same-value edit

### Valid modern stored state

Canonical E already semantically equals the draft Candidate.

UI layer:

`scheduleExceptionAuthoringEquals(...) === true`.

Update button disabled.

Normally no command dispatches.

### Defensive core path

If same-value Update reaches core anyway:

1. existing E found;
2. Candidate valid;
3. semantic equality true;
4. exact original project returned.

Router receives exact project identity and returns exact history state.

Therefore:

- no Undo entry;
- existing Redo preserved;
- `updatedAt` does not change.

## 10. Flow 7 — legacy period opened and Cancelled

### Raw E

```ts
{
  timeWindow: undefined,
  periodId: 'day',
  ...
}
```

### Read

Resolver:

- period exists;
- source = legacy-period;
- normalized semantic window = period "day".

### Edit initialization

UI period controls initialize to "day".

No command.

### Cancel

Local edit state clears.

Raw canonical E still has legacy top-level `periodId`.

No modernization.

No history.

## 11. Flow 8 — legacy period Apply with no meaningful semantic change

Same initial raw E as Flow 7.

Candidate uses modern:

```ts
timeWindow: {type:'period', periodId:'day'}
```

All other semantics equal.

Equality normalizes raw legacy period and Candidate modern period to same authored meaning.

Result:

- UI may disable Update;
- defensive core Update returns exact original project.

Therefore merely opening old data and pressing equivalent Apply cannot create a migration-style Undo entry.

## 12. Flow 9 — meaningful edit of legacy period modernizes only edited record

### Initial

E uses legacy `periodId:'day'`.

Author changes priority 50 → 100.

Candidate uses modern period window.

### Equality

Priority differs → false.

### Update

Core serializes whole updated E from Candidate:

- writes modern `timeWindow:{type:'period',periodId:'day'}`;
- omits legacy top-level `periodId`;
- writes normalized reason/intent.

Other Schedule Exceptions remain untouched, including any legacy representation they still contain.

### Postcondition

Modernization is a consequence of a meaningful authored edit, not a load/render migration.

## 13. Flow 10 — raw exact omitted offset semantic no-op

### Raw E

```ts
timeWindow: {
  type:'exact',
  startMinute: 1380,
  endMinute: 60
}
```

Current executable reader semantics infer offset 1.

UI resolver returns normalized:

```ts
{
  type:'exact',
  startMinute:1380,
  endMinute:60,
  endDayOffset:1
}
```

Draft displays next-day control.

Candidate preserves explicit offset 1.

Equality sees same semantics.

Update is no-op.

A meaningful edit later writes explicit offset.

## 14. Flow 11 — stale Character disappears between render and dispatch

### Render

Character C exists.

Candidate validates locally.

### Concurrent authored change

C disappears before reducer executes.

Old click handler still dispatches Candidate with C.

### Latest reducer state

Core validation runs against current project.

Character C missing.

Result:

- exact original current project;
- no exception write;
- no history;
- no runtime change.

### Next render

UI recomputes validation.

Candidate invalid.

Pending create/update must not claim success because canonical intended value never appears.

Inline status remains/updates.

No fallback Character is selected.

## 15. Flow 12 — stale Location disappears between render and dispatch

Symmetric to Flow 11.

If Candidate intent = Location L and L disappears:

- core returns exact project;
- no history;
- no fallback Location;
- no conversion to Absent.

## 16. Flow 13 — period disappears between render and dispatch

### Render

Period P exists.

### Before reducer execution

Template period P is no longer present.

Core Candidate validation returns:

`missing-period(P)`.

Exact original project.

No history.

UI on next render sees missing period and requires deliberate repair.

## 17. Flow 14 — conflicting imported intent repair

### Raw E

```text
absent = true
targetLocationId = L
```

### Read

Resolver returns:

`intent.status = conflicting`.

Card says conflict explicitly.

### Edit initialization

Draft intent = `conflicting-import`.

No Candidate can be built.

Update disabled.

### Repair A — choose Location

Author explicitly chooses Location.

A valid current Location must be selected.

Candidate intent:

`{type:'location', locationId:L2}`.

Update serializes:

- `targetLocationId:L2`;
- no `absent`.

### Repair B — choose Absent

Candidate intent:

`{type:'absent'}`.

Update serializes:

- `absent:true`;
- no target Location.

No silent choice is made before explicit author action.

## 18. Flow 15 — unresolved Location repair

### Raw E

`targetLocationId='missing-L'`, no absence.

Resolver:

`location-unresolved(missing-L)`.

Card shows stored id.

Edit draft:

- intent mode = Location;
- editable Location selection = blank.

The stale id is not inserted as if it were a valid select option.

Author chooses valid L2 or Absent.

Only then can Candidate build.

## 19. Flow 16 — unspecified intent repair

### Raw E

No target Location and no `absent:true`.

Resolver:

`unspecified`.

Edit draft:

`intent=unset`.

Update disabled.

Author explicitly chooses Location or Absent.

No implicit Absent assumption.

## 20. Flow 17 — remove malformed/stale raw record

### Initial raw E

E may have any read anomaly:

- missing Character;
- missing Location;
- conflicting intent;
- missing period;
- invalid exact window;
- invalid day range.

### Remove

UI dispatches:

```ts
{type:'scheduleException/remove', id:E}
```

No Candidate is built.

### Core

Checks only:

Does exception id E currently exist?

If yes:

- remove exactly E;
- touched authored project;
- one history entry.

If no:

- exact project no-op.

### Confirmation

UI exits/clears edit when E is absent canonically.

This guarantees stale imported data cannot trap the user in an undeletable state.

## 21. Flow 18 — remove then Undo then Redo

### Remove

E exists → one authored removal history step.

### Undo

History restores authored snapshot containing E.

Context overlays current runtime projection.

Postconditions:

- E returns;
- current Playhead preserved;
- current Actual Presence preserved.

### Redo

E removed again.

Runtime still preserved.

UI list follows canonical collection.

If edit mode was previously cleared after removal, Undo restoring E does not automatically reopen edit mode.

No global focus contract requires that.

## 22. Flow 19 — authored update, then runtime advances, then Undo/Redo

This is the critical cross-boundary flow.

### T0 authored state

E priority = 50.

Runtime:

- Playhead = day 20 14:30;
- Actual Presence = A0.

### T1 authored update

E priority becomes 100.

History has authored snapshot with priority 50.

Runtime still A0 / same Playhead.

### T2 runtime advances independently

Runtime becomes:

- Playhead = day 20 15:15;
- Actual Presence = A1.

No authored history entry is added by runtime replacement.

### T3 Undo authored

Context restores authored snapshot priority 50.

Then:

`keepCurrentRuntime(restoredAuthored, currentRuntime)`.

Result:

- priority = 50;
- Playhead remains 15:15;
- Actual Presence remains A1.

### T4 Redo authored

- priority = 100;
- runtime remains current 15:15 / A1.

This proves:

`Authored Schedule Intent != Actual Presence`.

## 23. Flow 20 — dirty edit draft + unrelated runtime update

### Initial

E source token = E:R1.

Draft dirty.

### Runtime step

Only simulation/runtime fields change.

Raw exception object E is unchanged.

Source revision must not increment.

Draft token remains current.

Dirty input stays intact.

The form must not depend on whole project object identity.

## 24. Flow 21 — dirty edit draft + another Schedule Exception changes

Editing E.

Another exception F changes.

If E raw object reference remains unchanged:

- E source revision unchanged;
- E dirty draft preserved.

This prevents unrelated exception edits from destroying current work.

## 25. Flow 22 — dirty edit draft + same exception changes canonically

### Initial

E raw V1, token E:R1.

Draft dirty based on V1.

### External authored change

Same E becomes raw V2.

On next render:

- raw object reference differs;
- revision increments R1 → R2;
- draft token no longer matches current source token.

Required behavior:

1. canonical summary immediately shows V2;
2. stale draft is discarded;
3. draft reinitializes from V2;
4. local status says canonical source changed.

No stale Update from V1 may be enabled.

## 26. Flow 23 — A → B → A canonical ABA transition

This is the Stage 5/6 synchronization proof.

### Initial

Canonical E = semantic A.

Raw object = A1.

Revision = R1.

Draft initialized from A1 and then made dirty.

### Canonical transition 1

E becomes semantic B, raw object B1.

Revision:

R1 → R2.

Dirty draft from R1 becomes stale and is replaced from B.

### Canonical transition 2

E becomes semantic A again, raw object A2 or restored historic A object.

At the transition from current B1 to A:

raw object reference changes.

Revision:

R2 → R3.

Even if semantic A equals the original semantic A, current token is:

E:R3

not:

E:R1.

Therefore the original dirty draft can never become current again by accidental semantic-key collision.

## 27. Flow 24 — create command rejected after local validation

Possible causes:

- Character disappeared;
- Location disappeared;
- period disappeared;
- generated id unexpectedly collided.

### Before dispatch

Pending create stores Candidate E.

### Reducer

Returns exact current project.

### Next render

Canonical project does not contain intended E with equal semantics.

Therefore pending create is **not confirmed**.

UI must:

- keep/reconstruct author input;
- surface validation/current-state message;
- clear or replace the pending attempt so the user can retry;
- not enter an infinite disabled pending state.

### Stage 8 requirement

Detailed Design must specify one-shot pending settlement so a rejected synchronous reducer attempt does not leave the button permanently locked.

No command result bus is added.

## 28. Flow 25 — update command rejected after local validation

Possible stale reference race.

Pending update stores:

- Candidate;
- source token E:R1.

Reducer no-ops.

Two cases:

### Canonical E still V1

Source token remains E:R1.

Candidate no longer validates under the latest project context.

Pending attempt settles as rejected.

Draft remains available for correction.

### Canonical E changed independently to V2

Source revision becomes R2.

Pending intent is not semantically confirmed.

Canonical change wins:

- stale draft discarded;
- draft initialized from V2;
- source-changed status shown.

## 29. Flow 26 — remove command already obsolete

UI dispatched remove E, but E was removed before reducer handles old action.

Core:

- E missing;
- exact project no-op.

Next render already has E absent.

From UI perspective desired canonical postcondition is satisfied.

Pending remove may settle successfully based on absence, even though this specific command made no mutation.

This is safe because remove is idempotent.

## 30. Flow 27 — Search derived refresh after create/update/remove

### Create

Canonical E appears.

Next call/render of Project Search index reads current project and includes E.

No D3 Search mutation.

### Update

Canonical E fields change.

Derived Search document reflects current:

- Character;
- Location/absence;
- priority;
- aliases/details.

### Remove

E absent from canonical collection.

Derived index contains no E document.

### Navigation

Current Search navigation remains its existing behavior:

- WORLD/TIME;
- center based on first authored day at midnight.

D3 does not change exact-time centering.

## 31. Flow 28 — diagnostic refresh after priority authoring

### Case A — different priority overlap

E1 priority 50.

Author creates E2 priority 100 over same Character/time.

Mutation is structurally valid.

Derived schedule analysis finds unique maximum 100.

No ambiguity warning for that overlap.

### Case B — equal maximum priority

E1 priority 100.

Author creates E2 priority 100.

Mutation remains structurally valid and commits.

Derived analysis later reports existing:

`schedule-exception-ambiguity`

warning.

D3 UI does not undo, auto-increment or block the authored change.

## 32. Flow 29 — persistence after modern create

### T0

Author creates modern E.

### In-memory canonical state

E exists in `scheduleExceptions`.

### Existing save path

NarrativeProjectProvider/repository persists current project through existing authored projection.

No D3-specific call.

### Stored authored state

Includes E with:

- modern `timeWindow`;
- Location or Absent fields;
- priority/reason.

### Runtime stored separately

Simulation remains in runtime projection according to current repository rules.

### Reopen

Hydrated project contains E.

Resolver reads modern E normally.

No migration.

## 33. Flow 30 — persistence of untouched legacy record

Legacy E loads with top-level `periodId`.

Simply opening/rendering/editing-then-cancelling:

- emits no command;
- persistence remains unchanged except unrelated normal saves caused elsewhere;
- E remains legacy representation.

D3 does not perform load-time normalization.

## 34. Flow 31 — persistence after meaningful legacy edit

Legacy E meaningfully edited.

Core writes modern E.

Normal save persists modern representation for E.

Other untouched legacy exceptions remain untouched.

No schema version change.

## 35. Flow 32 — open-ended range round-trip

### Raw E

`activeRange = {fromDay:7}`.

Resolver returns:

`through-project-end`.

Edit draft initializes same mode.

If no meaningful semantic change:

- equality true;
- no update.

If priority changes:

- Candidate retains:
  `{fromDay:7}`;
- write does not convert to:
  `{fromDay:7,toDay:dayCount}`.

This preserves authored range intent.

## 36. Flow 33 — bounded final-day range remains bounded

Raw E:

`{fromDay:7,toDay:project.template.dayCount}`.

Resolver returns bounded, not through-project-end.

Edit draft preserves bounded mode.

No semantic collapsing with open-ended form.

## 37. Flow 34 — priority blank vs numeric zero

Local priority field = blank.

UI must not do:

`Number('') === 0`

and accidentally create priority 0.

Correct flow:

1. trim;
2. blank => incomplete draft;
3. no Candidate.

If author explicitly types `0`:

- nonblank;
- Number('0') = 0;
- finite;
- Candidate may be valid.

Therefore priority zero is allowed, but blank is not silently zero.

## 38. Flow 35 — reason whitespace normalization

Raw current reason:

`" appointment "`.

Candidate reason:

`"appointment"`.

Semantic equality normalizes both through trim.

If every other field is equal:

- no-op;
- raw stored whitespace is not rewritten just for cleanup.

If another semantic field changes:

- meaningful update occurs;
- serialized reason becomes `"appointment"`.

Whitespace-only Candidate reason serializes as undefined.

## 39. Flow 36 — shadowed legacy period residue

Raw E has:

- modern `timeWindow:{type:'period', periodId:'morning'}`;
- legacy top-level `periodId:'day'`.

Resolver uses modern morning.

### No meaningful change

Candidate morning.

Equality uses modern active meaning.

No-op.

Shadowed legacy `day` remains stored because no write occurred.

### Meaningful change

Priority changes.

Update serializes modern Candidate and omits legacy top-level `periodId`.

This removes residue only as part of explicit meaningful edit.

## 40. Flow 37 — idempotent repeated commands

### Repeated add

First valid Add E:

- changes project.

Second Add same id E:

- duplicate id;
- exact no-op.

### Repeated update

First changed update:

- changes E V1→V2.

Immediate repeated same Candidate against V2:

- semantic equality;
- exact no-op.

### Repeated remove

First remove:

- removes E.

Second remove:

- id missing;
- exact no-op.

This makes UI retries safe at the canonical mutation layer.

## 41. Flow 38 — RoutineRule isolation

Initial project contains Routine Rules R.

Any D3 add/update/remove:

- changes only `scheduleExceptions` plus normal `updatedAt`;
- `routineRules` reference/content remains logically unchanged.

No BehaviorProfile mutation.

No recurrence mutation.

## 42. Ordering guarantees

### Create

```text
local form
→ parse
→ generate id
→ Candidate
→ local validate
→ pending create
→ execute
→ router
→ latest-state validate
→ duplicate check
→ canonical append or exact no-op
→ history only if changed
→ render
→ canonical confirmation
→ local reset/status
```

### Update

```text
canonical E V1
→ resolve
→ source token R1
→ local draft
→ Candidate(E)
→ ensure current token R1
→ validate
→ equality
→ pending update(R1)
→ execute
→ latest-state validate
→ current E lookup
→ equality against current E
→ replace or exact no-op
→ history only if changed
→ render
→ source revision update
→ canonical confirmation/rebase
```

### Remove

```text
raw E
→ click Remove
→ pending remove(E)
→ execute
→ current E lookup
→ remove or exact no-op
→ render
→ absence confirms desired state
```

## 43. No dependency on React batching

Correctness must hold if:

- pending local state commits before reducer update;
- reducer update renders before an effect settles pending state;
- source-token effect runs in a later render;
- runtime project replacement happens between UI renders.

Why safe:

- local draft is noncanonical;
- reducer validates latest project;
- UI claims success only from canonical observation;
- stale source token disables/invalidates Update;
- remove desired state is idempotent absence.

## 44. Failure/no-op ownership

### Incomplete form

UI.

No command.

### Invalid Candidate at current render

UI disables commit and shows local status.

### Candidate becomes stale before reducer

Core rejects against current project.

Exact project no-op.

### Duplicate add id

Core exact no-op.

### Missing update id

Core exact no-op.

### Same semantic update

Core exact no-op.

### Missing remove id

Core exact no-op.

### Equal-priority ambiguity

Not a failure.

Derived diagnostic warning after commit.

### Persistence failure

Existing repository/saveStatus owns it.

No D3 error channel.

### Search/diagnostic rendering failure

Existing subsystem defect, not D3 mutation status.

## 45. Exact identity invariants across flows

### INV-SE-D7-001

No incomplete Schedule Exception enters NarrativeProject.

### INV-SE-D7-002

Latest-state canonical validation happens inside core for every Add/Update.

### INV-SE-D7-003

Rejected Add/Update returns exact current project.

### INV-SE-D7-004

Same semantic Update returns exact current project.

### INV-SE-D7-005

Missing Remove returns exact current project.

### INV-SE-D7-006

Exact project no-op produces exact history-state no-op.

### INV-SE-D7-007

Meaningful Add/Update/Remove produces exactly one authored history transition.

### INV-SE-D7-008

D3 mutation never writes Simulation Playhead or Actual Presence.

### INV-SE-D7-009

Authored Undo/Redo preserves current runtime projection.

### INV-SE-D7-010

Legacy/stale/conflicting read never mutates canonical state.

### INV-SE-D7-011

Meaningful legacy edit writes modern timeWindow only for edited record.

### INV-SE-D7-012

Open-ended range intent survives edit round-trip.

### INV-SE-D7-013

Equal-priority ambiguity remains post-mutation derived warning.

### INV-SE-D7-014

Project Search changes only as a derived consequence of canonical CRUD.

### INV-SE-D7-015

Dirty edit draft survives unrelated runtime/other-entity changes.

### INV-SE-D7-016

Same-entity canonical change invalidates stale draft.

### INV-SE-D7-017

A→B→A cannot resurrect an obsolete draft token.

## 46. Stage 8 implementation-sensitive issues to resolve

Stage 7 finds no architecture blocker, but Stage 8 must make the following mechanics exact.

### DD-SE-001 — pending synchronous rejection settlement

Because `execute(): void` returns no result, a locally established pending Add/Update may be followed by exact canonical no-op.

Detailed Design must specify a bounded settlement mechanism so pending state does not stay locked forever.

Preferred constraints:

- no timeout-based correctness;
- no new provider API;
- no command result bus;
- settle by observing canonical state plus one post-dispatch render/effect cycle;
- if desired canonical state did not materialize and source/current validation explains rejection, clear pending and keep draft.

### DD-SE-002 — source revision mechanics

Define exact refs/state/effect ordering so:

- one raw-object transition increments once;
- unrelated root project changes do not increment;
- disappear/reappear increments;
- switching edit id reinitializes cleanly.

### DD-SE-003 — successful create reset

Specify how generated id is retained until canonical confirmation, then cleared exactly once.

### DD-SE-004 — successful update vs external update distinction

If source changes after dispatch:

- intended semantic result → success;
- different semantic result → canonical external change/rebase.

### DD-SE-005 — exact summary formatting

Define helper functions for:

- day ranges;
- clock values;
- period labels;
- intent;
- priority anomalies.

### DD-SE-006 — no-period create defaults

Project factory currently requires at least one template period for fresh projects, but imported/test data may still violate assumptions.

UI must remain render-safe and Exact mode must not depend on a period.

### DD-SE-007 — remove confirmation/edit exit ordering

Avoid any render where stale edit draft can dispatch Update after canonical removal.

## 47. Test scenario matrix

| Flow | Core test | UI integration | Runtime/history | Persistence | Derived |
|---|---:|---:|---:|---:|---:|
| create Location | ✅ | ✅ |  | ✅ | Search |
| create Absent | ✅ | ✅ |  |  |  |
| cross-midnight | ✅ | ✅ |  |  |  |
| same-time +1 day | ✅ | ✅ |  |  |  |
| valid edit | ✅ | ✅ |  |  |  |
| same-value no-op | ✅ identity | ✅ disabled |  |  |  |
| legacy cancel | ✅ resolver | ✅ |  | ✅ |  |
| legacy semantic no-op | ✅ identity | ✅ |  |  |  |
| legacy meaningful edit | ✅ | ✅ |  | ✅ |  |
| omitted offset equivalence | ✅ | ✅ |  |  |  |
| stale Character | ✅ identity | ✅ |  |  |  |
| stale Location | ✅ identity | ✅ |  |  |  |
| stale period | ✅ identity | ✅ |  |  |  |
| conflicting repair | ✅ | ✅ |  |  |  |
| malformed remove | ✅ | ✅ |  |  |  |
| remove Undo/Redo | ✅ |  | ✅ |  |  |
| runtime after authored edit |  |  | ✅ |  |  |
| runtime dirty draft |  | ✅ |  |  |  |
| same-entity canonical change |  | ✅ |  |  |  |
| A→B→A |  | ✅ |  |  |  |
| rejected pending commit | ✅ | ✅ |  |  |  |
| Search refresh |  |  |  |  | ✅ |
| ambiguity refresh |  |  |  |  | ✅ |
| open-ended range | ✅ | ✅ |  | ✅ |  |
| priority blank/zero | ✅ | ✅ |  |  |  |
| reason normalization | ✅ | ✅ |  | ✅ |  |
| shadowed legacy | ✅ | ✅ |  | ✅ |  |
| command idempotency | ✅ identity |  |  |  |  |
| Routine isolation | ✅ |  |  |  |  |

## 48. Dynamic decisions

### DEC-SE-047 — canonical confirmation is mandatory

Dispatch is not success.

Canonical observation is success evidence.

### DEC-SE-048 — latest project wins

Core validation against current reducer state is authoritative over stale UI validation.

### DEC-SE-049 — same-entity canonical change discards dirty draft

No first-slice merge/rebase of user draft against changed canonical exception.

### DEC-SE-050 — unrelated changes preserve draft

Source tracking is exception-specific, not project-root-specific.

### DEC-SE-051 — pending rejection must settle without timer correctness

Stage 8 must specify render/effect settlement.

### DEC-SE-052 — remove desired-state confirmation is absence

If E is already absent when command runs, UI may settle Remove as achieved.

### DEC-SE-053 — derived systems are pull/read consumers

D3 never pushes Search/diagnostic updates.

### DEC-SE-054 — exact offset remains explicit after draft initialization

Clock edits do not silently change explicit end-day selection.

### DEC-SE-055 — open-ended range is preserved end-to-end

No conversion to explicit project final day.

## 49. Gate Review — Stage 7 → Stage 8 Detailed Design

### Dynamic-flow checks

✅ Create traced end-to-end.

✅ Absent/period path traced.

✅ Exact cross-midnight and 24-hour exact path traced.

✅ Edit with source token traced.

✅ Same-value exact no-op traced.

✅ Legacy read/cancel/no-op/meaningful modernization traced.

✅ Stale Character/Location/period races traced.

✅ Conflicting/unresolved/unspecified repair traced.

✅ Malformed remove traced.

✅ Remove Undo/Redo traced.

✅ Runtime-changing-after-authored-edit Undo/Redo traced.

✅ Dirty draft under runtime/unrelated changes traced.

✅ Same-entity canonical change traced.

✅ A→B→A protection traced.

✅ Rejected pending Add/Update identified and bounded for Stage 8 mechanics.

✅ Persistence modern/legacy paths traced.

✅ Search/diagnostic derived refresh traced.

✅ No React batching dependency required.

✅ Exact identity/no-history semantics traced.

### Gate decision

**✅ PASS to Stage 8 Detailed Design.**

No Stage 7 BLOCKER exists.

Production implementation remains prohibited until Stage 8 completes and exact-head GREEN is recorded.

## 50. Next concrete stage — do not skip

**Stage 8: Detailed Design.**

It must freeze implementation-ready mechanics for:

1. exact internal helper decomposition inside `schedule-exception-authoring.ts`;
2. exact router code shape;
3. exact React local state structure;
4. draft initialization from every resolved read state;
5. candidate-builder implementation;
6. source revision refs/effects and ABA ordering;
7. pending Add/Update/Remove settlement without command result API;
8. exact create/update/remove handlers;
9. summary formatters;
10. exact composition point in RoutineAuthoringPanel;
11. no-CSS implementation expectation;
12. exact test fixtures/assertions and commit sequencing.

Only after Stage 8 passes may implementation begin.
