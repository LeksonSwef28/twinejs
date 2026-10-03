# 93 Days — A67-D3 Schedule Exception Authoring · Stage 1 Use Cases

Status: **STAGE 1 COMPLETE — Gate to Domain Model**
Base: `93-days-editor@d06625f4b580d73cecbef7a6c9f8fe9babc623ba`
Depends on: `93DAYS_A67_D3_SCHEDULE_EXCEPTION_AUTHORING_STAGE0.md`
Date: **2026-10-03**
Production code in this slice: **none**

## 1. Stage 1 purpose

Stage 0 established the gap:

> `ScheduleException` is already canonical authored data, searchable and diagnosable, but the normal WORLD/TIME authoring flow cannot create, edit or remove it.

Stage 1 defines the writer journeys and resolves the minimum UX behavior required before Domain Model design.

It does not choose final TypeScript command names, reducer function names, JSX structure, CSS or persistence implementation.

The scenario set stays inside the current canonical `ScheduleException` fields.

Runtime schedule resolution, Actual Presence and Player behavior remain outside this slice.

## 2. First-slice UX surface decision

The first Schedule Exception authoring slice shall extend the existing **WORLD/TIME schedule authoring panel** with a visibly separate **Schedule Exceptions** section.

The likely current component owner is:

`src/components/narrative/workspace/routine-authoring-panel.tsx`

This is a behavioral decision, not a final component-name constraint.

### Why

- WORLD/TIME already owns visible recurring schedule authoring;
- the writer mentally compares a temporary exception against a recurring routine;
- Project Search and diagnostics already navigate Schedule Exceptions into WORLD/TIME;
- adding another top-level workspace would duplicate schedule context;
- placing Schedule Exception editing in Story would mix temporal intent with Story graph authoring;
- a separate section can clearly preserve `RoutineRule != ScheduleException`.

The first slice does **not** require editing from:

- Project Search result rows;
- Story inspector;
- Project Library;
- a new global Schedule workspace.

This resolves UNKNOWN-SE-001.

## 3. Selection/focus decision

The first slice shall use **local WORLD/TIME authoring selection/edit state** for Schedule Exceptions.

No new global `AuthorFocus` kind is required.

### Required behavior

- existing exceptions are listed in the Schedule Exceptions section;
- selecting Edit loads one canonical exception into local draft state;
- Cancel abandons the draft without mutating the project;
- successful Apply refreshes from canonical project data;
- removing the selected exception clears local edit state safely.

### Project Search compatibility

Project Search continues to:

- find the exception;
- navigate to WORLD/TIME;
- center the View Cursor around the exception's authored time.

The first slice does **not** require Project Search to force-open the exact exception form.

That would require additional cross-component selection handoff and is not necessary to make the entity authorable.

This resolves UNKNOWN-SE-002 without reopening A67-D1 global focus architecture.

## 4. Priority authoring decision

Priority remains the existing canonical `number`.

Stage 1 does **not** introduce a new enum such as low/normal/high.

### First-slice input policy

- the author must provide an explicit finite numeric priority;
- the form must not silently invent or renumber priority to avoid conflicts;
- larger priority remains the existing winner semantics during overlap;
- equal maximum priority remains diagnostically ambiguous.

### Default

There is **no hidden semantic default** for a newly created exception.

The draft may visually start with an empty priority input; Apply remains disabled until a finite number is supplied.

Why:

- repository evidence establishes comparison semantics, not a project-wide conventional default value;
- inventing 0/10/100 as a silent convention would create new semantics not owned by the domain;
- explicit input makes the author aware that priority is meaningful.

This resolves UNKNOWN-SE-003.

## 5. Ambiguity-on-Apply decision

An equal-maximum-priority overlap remains a **warning**, not a mutation validity error.

Therefore a structurally valid exception may be committed even when it creates or retains a `schedule-exception-ambiguity` finding.

### Why

- current `schedule-analysis.ts` classifies it as `severity: 'warning'`;
- current architecture intentionally reports ambiguity rather than selecting a winner;
- blocking Apply would silently upgrade an analysis warning into a new domain validity rule;
- existing/imported projects may legitimately contain such data and must remain editable.

### Required post-commit behavior

After the mutation, existing diagnostics remain authoritative.

The authoring form must not:

- choose a winner;
- auto-increment one priority;
- delete the competing exception;
- hide the resulting warning.

This resolves UNKNOWN-SE-004.

## 6. Location vs absence authoring decision

For **new writes**, the first-slice form exposes one explicit intent mode:

- **At Location**;
- **Absent**.

### At Location

A successful commit writes:

- `targetLocationId` = selected canonical Location;
- `absent` omitted or false-equivalent according to the final contract.

A canonical existing Location is required at mutation time.

### Absent

A successful commit writes:

- `absent: true`;
- no target Location in the newly authored canonical result.

### Imported unusual combinations

The TypeScript shape permits optional fields and old data may theoretically contain both a target Location and `absent: true`.

The first slice shall:

1. inspect such a stored record without render-time mutation;
2. present it as a conflicting/unresolved authoring state rather than silently choosing one meaning;
3. require the author to explicitly choose At Location or Absent before a repaired Apply;
4. canonicalize only as part of that explicit authored mutation.

This creates a safe new-write policy without claiming the historical persisted shape was invalid.

This resolves UNKNOWN-SE-005.

## 7. Day-range decision

The form must represent all existing `DayRange` meanings needed to edit canonical data:

1. **one day** — `fromDay === toDay`;
2. **bounded multi-day range** — `fromDay < toDay`;
3. **through project end** — `toDay === undefined`.

Important:

`toDay: undefined` does **not** mean "same day" in current exception expansion; it means through the remaining project range.

Therefore a one-day exception must be authored explicitly as:

`{fromDay: N, toDay: N}`.

The first slice does not add recurrence to Schedule Exceptions.

This resolves UNKNOWN-SE-006.

## 8. Timeline visualization decision

Dedicated Schedule Exception bands/markers in WORLD/TIME rows are **deferred** from the first slice.

### Minimum first-slice presentation

The separate Schedule Exceptions section must show enough canonical summary to identify each exception:

- Character;
- active day range;
- time window;
- At Location / Absent;
- priority;
- reason when present.

Existing Project Search and diagnostic navigation can still center WORLD/TIME on the relevant moment.

### Why visualization is deferred

- `world-time-indexes.ts` currently has no Schedule Exception index;
- adding exception bands raises unanswered questions about overlapping priority, location rows, absent intent and visual stacking;
- authorability does not require a second temporal visualization model;
- adding rendering now would expand the blast radius without proving it is needed.

A later evidence-backed slice may add exception bands using the same canonical records.

This resolves UNKNOWN-SE-007.

## 9. UC-SE-001 — create one-day exact-window Location exception

**Actor:** author.

**Related requirements:** REQ-SE-001, 002, 003, 004, 005, 006, 007, 009, 012.

### Preconditions

- Character Katya exists;
- Location Home exists;
- Simulation Playhead is at any current runtime moment;
- no matching exception id exists.

### Trigger

Author opens WORLD/TIME → Schedule Exceptions → New.

### Main flow

1. form starts as local draft only;
2. author selects Katya;
3. author enters day 4 as a one-day range;
4. canonical range draft resolves to:
   `{fromDay: 4, toDay: 4}`;
5. author chooses exact time;
6. author enters 10:00–12:00;
7. author chooses **At Location**;
8. author selects Home;
9. author enters an explicit finite priority;
10. optional reason may be entered;
11. Apply requests one typed authored mutation;
12. mutation boundary re-validates all canonical references/range/window values;
13. one `ScheduleException` is added to `project.scheduleExceptions`;
14. authored history receives one meaningful entry;
15. Simulation Playhead remains unchanged;
16. current Actual Presence remains unchanged.

### Result

A canonical one-day exception exists and is visible in the Schedule Exceptions list.

### Must not happen

- a RoutineRule is modified;
- Actual Presence is teleported to Home;
- the Playhead moves to day 4;
- a Story event executes;
- a runtime save record is directly mutated.

---

## 10. UC-SE-002 — create an absence exception

**Actor:** author.

**Related requirements:** REQ-SE-001, 002, 003, 004, 005, 006, 007.

### Preconditions

- canonical Character exists.

### Trigger

Author creates a Schedule Exception and selects **Absent**.

### Main flow

1. Character is selected;
2. valid active range and time window are provided;
3. explicit finite priority is provided;
4. intent mode is Absent;
5. no Location target is required;
6. Apply produces one canonical exception with absence intent;
7. no fake "Nowhere" Location is created.

### Result

Absence is first-class authored schedule intent.

---

## 11. UC-SE-003 — period-based exception uses modern timeWindow

**Actor:** author.

**Related requirements:** REQ-SE-005, 006.

### Preconditions

- project template contains period `day`;
- Character and target Location exist.

### Trigger

Author chooses a period-based time window.

### Main flow

1. UI shows canonical project periods;
2. author selects period `day`;
3. mutation writes:
   `timeWindow: {type:'period', periodId:'day'}`;
4. the mutation does not write a new legacy top-level `periodId`.

### Result

New authoring uses the modern canonical time-window path.

---

## 12. UC-SE-004 — exact cross-midnight exception

**Actor:** author.

**Related requirements:** REQ-SE-004, 005.

### Preconditions

- Character exists;
- exact-window mode is selected.

### Trigger

Author creates an exception from 23:30 to 01:00 next day.

### Main flow

1. start minute is valid;
2. end minute is valid;
3. draft explicitly represents the existing cross-midnight meaning;
4. canonical write uses `timeWindow.type === 'exact'`;
5. `endDayOffset` preserves the next-day end;
6. no new date/time representation is invented.

### Result

The authoring path can round-trip current exact-window semantics.

---

## 13. UC-SE-005 — bounded, one-day and open-ended active ranges

**Actor:** author.

**Related requirements:** REQ-SE-004.

### Variant A — one day

Day 7 only:

`{fromDay: 7, toDay: 7}`.

### Variant B — bounded range

Days 7–10:

`{fromDay: 7, toDay: 10}`.

### Variant C — through project end

From day 7 onward:

`{fromDay: 7}`.

### Invalid variants

Reject:

- day 0;
- day above template day count;
- `toDay < fromDay`.

### Result

The UI does not conflate an omitted `toDay` with a one-day exception.

---

## 14. UC-SE-006 — edit existing exception atomically

**Actor:** author.

**Related requirements:** REQ-SE-002, 003, 004, 005, 006, 007, 008, 013.

### Preconditions

An exception exists for:

- Katya;
- day 4;
- Home;
- exact 10:00–12:00;
- priority 50;
- reason "appointment".

### Trigger

Author presses Edit.

### Main flow

1. local draft is populated from the canonical stored exception;
2. author changes Location, range, time, priority and/or reason;
3. no canonical state changes while editing the draft;
4. Apply validates the complete candidate;
5. one atomic authored update replaces the canonical exception value;
6. unchanged Routine Rules remain referentially/logically unaffected;
7. authored history records one meaningful edit.

### Cancel flow

If author presses Cancel:

- canonical project remains unchanged;
- no Undo entry is created.

### Result

Partial form edits never leak into canonical state.

---

## 15. UC-SE-007 — Undo / Redo around exception edit

**Actor:** author.

**Related requirements:** REQ-SE-002, 009, 013.

### Preconditions

- exception priority is 50;
- runtime Playhead and Actual Presence have known current values.

### Trigger

Author changes priority to 100 and applies.

### Main flow

1. authored history records the change;
2. exception priority is 100;
3. Undo restores 50;
4. runtime state remains current according to existing authored/runtime separation;
5. Redo restores 100.

### Assertions

Across Apply / Undo / Redo:

- Simulation Playhead does not move;
- Actual Presence is not rewritten by the authoring command;
- no Runtime Schedule Exception overlay is created.

---

## 16. UC-SE-008 — remove exception → Undo → Redo

**Actor:** author.

**Related requirements:** REQ-SE-002, 010, 011.

### Preconditions

- canonical exception exists;
- Project Search indexes it;
- diagnostics may or may not reference it.

### Trigger

Author removes the exception.

### Main flow

1. typed remove command targets canonical exception id;
2. exception is removed from `project.scheduleExceptions`;
3. local edit selection clears if it targeted the removed id;
4. derived Project Search no longer returns the removed exception;
5. schedule diagnostics no longer analyze that removed record;
6. Undo restores it;
7. Redo removes it again.

### Must not happen

- a RoutineRule is removed;
- Character is removed;
- target Location is removed.

---

## 17. UC-SE-009 — persistence round-trip

**Actor:** author.

**Related requirements:** REQ-SE-012.

### Preconditions

- a valid Schedule Exception has been authored.

### Trigger

Project is saved and reopened through the existing repository boundary.

### Main flow

1. canonical `scheduleExceptions` is persisted with authored data;
2. project reloads;
3. same exception id exists;
4. Character/range/window/intent/priority/reason match the authored value;
5. runtime Simulation state is restored through its independent projection rules.

### Result

No second editor persistence channel is needed.

### Stage 4 implication

If existing persistence cannot round-trip the already-existing field, that is a discovered defect, not permission to redesign persistence casually.

---

## 18. UC-SE-010 — different-priority overlap remains valid

**Actor:** author.

**Related requirements:** REQ-SE-007, 010.

### Preconditions

For the same Character/time overlap:

- exception A priority = 50;
- exception B priority = 100.

### Trigger

Author commits B.

### Main flow

1. structural validation succeeds;
2. B is stored;
3. existing schedule analysis sees a unique maximum priority;
4. no false `schedule-exception-ambiguity` finding is created merely because the windows overlap.

### Result

Priority override semantics remain unchanged.

---

## 19. UC-SE-011 — equal maximum-priority ambiguity is allowed but visible

**Actor:** author.

**Related requirements:** REQ-SE-007, 010.

### Preconditions

For the same Character/time overlap:

- exception A priority = 100.

### Trigger

Author commits structurally valid exception B with priority = 100.

### Main flow

1. mutation is accepted;
2. no priority is auto-adjusted;
3. schedule analysis reports the existing ambiguity warning;
4. author can navigate/inspect the warning through existing diagnostic behavior;
5. the form does not claim that B "wins".

### Result

Authoring preserves truthful ambiguity rather than hiding it.

---

## 20. UC-SE-012 — invalid Character is rejected atomically

**Actor:** author / stale UI race.

**Related requirements:** REQ-SE-003, 013.

### Preconditions

- draft originally referenced Character X;
- Character X no longer exists at mutation time.

### Trigger

Apply attempts to commit the exception.

### Main flow

1. canonical mutation boundary rechecks Character X;
2. reference is missing;
3. mutation is rejected;
4. no Schedule Exception is added/updated;
5. no history entry is created;
6. no partial record is written.

### Result

UI filtering is not the only reference-integrity boundary.

---

## 21. UC-SE-013 — invalid target Location is rejected atomically

**Actor:** author / stale UI race.

**Related requirements:** REQ-SE-006, 013.

### Preconditions

- intent mode is At Location;
- selected Location X disappears before Apply.

### Main flow

1. canonical mutation validation rechecks Location X;
2. target is missing;
3. mutation is rejected;
4. previous canonical exception remains unchanged;
5. no replacement Location is fabricated.

### Absence variant

Absent intent does not require a target Location.

---

## 22. UC-SE-014 — invalid day/time/priority draft cannot commit

**Actor:** author.

**Related requirements:** REQ-SE-004, 005, 007.

### Invalid examples

- day outside project template;
- `toDay < fromDay`;
- missing/unknown period;
- exact minute outside 0..1439;
- unsupported `endDayOffset`;
- blank/non-finite priority.

### Main flow

1. UI may prevent Apply early;
2. mutation boundary still validates the candidate;
3. canonical project does not change;
4. no history entry is created.

### Result

The project never relies on HTML controls alone for canonical validity.

---

## 23. UC-SE-015 — legacy periodId exception is inspectable without render mutation

**Actor:** author opening older persisted data.

**Related requirements:** REQ-SE-005, UX-SE-006.

### Preconditions

Stored exception has:

- no `timeWindow`;
- valid legacy `periodId`.

### Main flow

1. editor resolves the legacy period for display;
2. simply opening/listing/editing the draft does not mutate the project;
3. current semantic period is readable;
4. Cancel leaves stored object untouched;
5. if author makes a meaningful edit and applies, the new canonical write uses modern `timeWindow`;
6. the explicit authored update may normalize that edited exception away from legacy `periodId`.

### Same-value requirement

Opening a legacy record and pressing Apply without a meaningful semantic edit must not create history noise solely to "modernize" it.

### Stage 2 implication

Semantic comparison may need a normalized/resolved view distinct from persisted raw shape.

---

## 24. UC-SE-016 — stale imported reference remains inspectable and repairable

**Actor:** author opening imperfect imported/legacy data.

**Related requirements:** REQ-SE-003, 006, 012.

### Variant A — missing Character

Stored exception references a Character id that no longer resolves.

### Variant B — missing target Location

Stored location intent references a missing Location.

### Main flow

1. exception list/form remains render-safe;
2. unresolved ids are shown explicitly;
3. rendering does not delete or rewrite the exception;
4. no first Character/Location is silently substituted;
5. author may deliberately repair the record by selecting valid canonical targets;
6. successful repair uses normal typed update.

### Result

Read-time recovery is non-destructive; repair is explicit authoring.

---

## 25. UC-SE-017 — conflicting imported location/absence fields require explicit repair

**Actor:** author.

**Related requirements:** REQ-SE-006.

### Preconditions

Stored exception contains both:

- `absent: true`;
- `targetLocationId`.

### Main flow

1. editor does not crash;
2. editor identifies that stored authoring intent is conflicting;
3. render does not silently clear either field;
4. Apply is unavailable until the author explicitly chooses:
   - At Location; or
   - Absent;
5. explicit repair writes one unambiguous new authored result.

### Result

The new UI does not retroactively pretend historical ambiguous shape was impossible.

---

## 26. UC-SE-018 — authored exception mutation does not rewrite live presence

**Actor:** author during an existing simulation/runtime state.

**Related requirements:** REQ-SE-009.

### Preconditions

- Simulation Playhead is day 20 at 14:30;
- Character Katya currently has an Actual Presence Location;
- author creates/edits a Schedule Exception for day 4.

### Trigger

Apply.

### Assertions

Immediately after authored mutation:

- Playhead is still day 20 at 14:30;
- `simulation.actualLocationByCharacter` is unchanged;
- no runtime Story work executes;
- no Player action executes.

### Important interpretation

This use case only specifies the authoring mutation boundary.

It does not redefine how existing runtime systems may later interpret authored schedule data during normal simulation.

---

## 27. UC-SE-019 — Routine Rules remain independent

**Actor:** author.

**Related requirements:** REQ-SE-001, 002.

### Preconditions

- Character has multiple recurring Routine Rules;
- one Schedule Exception exists.

### Main flow

1. author edits/removes the Schedule Exception;
2. `project.routineRules` remains logically unchanged;
3. no BehaviorProfile reference is rewritten;
4. recurring authoring UI still displays the same rules.

### Result

`ScheduleException != RoutineRule` remains executable as a boundary.

---

## 28. UC-SE-020 — same-value submission is a no-op

**Actor:** author.

**Related requirements:** REQ-SE-013.

### Preconditions

Canonical exception already equals the complete semantically resolved draft.

### Trigger

Apply is requested again without a meaningful authored change.

### Main flow

1. current canonical exception resolves;
2. candidate is semantically equal;
3. project remains unchanged;
4. no new authored history entry is created;
5. runtime/editor state remains unchanged.

### Result

Repeated Apply does not create Undo noise.

---

## 29. UI behavior derived from scenarios

Stage 1 fixes behavior, not final CSS.

The Schedule Exceptions section must provide:

### List/read view

For each existing exception:

- Character label or unresolved id;
- day-range summary;
- time-window summary;
- At Location / Absent / conflicting stored intent;
- priority;
- optional reason;
- Edit;
- Remove.

### Create/edit draft

The form needs:

1. Character selector;
2. day-range controls;
3. time-window mode:
   - Period;
   - Exact;
4. Period selector or exact start/end fields;
5. cross-midnight representation for Exact;
6. intent:
   - At Location;
   - Absent;
7. Location selector only for At Location;
8. explicit priority input;
9. optional reason;
10. Apply;
11. Cancel while editing.

### Canonical commit rule

No partial Schedule Exception is committed.

Local incomplete form state is allowed.

Canonical state changes only after a complete valid candidate passes the mutation boundary.

## 30. Empty-state behavior

### No Characters

No new Schedule Exception can be committed.

UI explains that a Character is required.

### No Locations

Absent exceptions remain authorable.

At Location intent cannot be committed until a Location exists.

### No exceptions

The list presents an empty state, not an error.

### No template periods

Period mode cannot produce a valid candidate.

Exact mode remains available if otherwise valid.

## 31. Search/diagnostic behavior derived from scenarios

### Project Search

No new search architecture is required.

Because search index is derived from canonical project state:

- add/update naturally changes indexed content after project update;
- remove naturally removes the document.

Stage 4 must verify that no production Project Search change is required.

### Story Brain diagnostics

No new ambiguity algorithm is required.

After authored changes, existing analysis runs against canonical exception records.

The first slice does not implement in-form duplicate conflict calculation.

## 32. Scenarios intentionally NOT added

Outside current requirements:

- exception bands on WORLD/TIME timeline;
- drag an exception in time;
- drag an exception between Location rows;
- bulk exception editing;
- priority auto-balancing;
- "fix ambiguity" one-click mutation;
- recurring exception rules;
- linking exception to one RoutineRule id;
- auto-projecting authored exception into Actual Presence on Apply;
- runtime schedule-session freezing;
- Player-facing schedule editor;
- AI-generated exceptions;
- global ScheduleException AuthorFocus;
- Project Search auto-opening the exact local form;
- schema migration of every legacy exception on load.

Each requires separate evidence or later design approval.

## 33. Requirement coverage

| Requirement | Use Cases | Coverage |
|---|---|---|
| REQ-SE-001 canonical owner | UC-001,006,008,019 | ✅ |
| REQ-SE-002 typed CRUD/history | UC-001,006,007,008,020 | ✅ |
| REQ-SE-003 Character validation | UC-001,012,016 | ✅ |
| REQ-SE-004 day-range validation | UC-001,005,014 | ✅ |
| REQ-SE-005 modern timeWindow | UC-001,003,004,014,015 | ✅ |
| REQ-SE-006 location/absence intent | UC-001,002,013,016,017 | ✅ |
| REQ-SE-007 priority semantics | UC-001,006,010,011,014 | ✅ |
| REQ-SE-008 reason metadata | UC-001,006 | ✅ |
| REQ-SE-009 runtime separation | UC-001,007,018 | ✅ |
| REQ-SE-010 diagnostics owner | UC-008,010,011 | ✅ |
| REQ-SE-011 search compatibility | UC-008,009 | ✅ |
| REQ-SE-012 persistence | UC-009,015,016 | ✅ |
| REQ-SE-013 semantic no-op | UC-006,007,012,013,014,020 | ✅ |

No Stage 0 functional requirement is left without scenario coverage.

## 34. New design findings produced by Stage 1

### FINDING-SE-001 — existing WORLD/TIME schedule panel is sufficient

The minimum workflow does not justify a new top-level workspace.

A separate section inside existing schedule authoring provides enough context while keeping RoutineRule and ScheduleException visibly distinct.

### FINDING-SE-002 — local edit state is sufficient

Canonical Schedule Exception identity can be selected/edited locally in WORLD/TIME.

Global AuthorFocus expansion is not needed for the first slice.

### FINDING-SE-003 — validation should share schedule primitives, not RoutineRule shape

Schedule Exceptions need:

- day validation;
- time-window validation;
- Character/Location reference validation.

They do not need:

- recurrence validation;
- BehaviorProfile validation.

Stage 2/5 should model shared validation at the correct granularity rather than calling `routineRuleIsAuthoringValid` on a fake RoutineRule.

### FINDING-SE-004 — warning analysis and mutation validity are separate

Equal maximum-priority overlap is diagnosable but structurally commit-able.

This distinction prevents the form from becoming a second Story Brain.

### FINDING-SE-005 — modern-write / legacy-read needs semantic normalization

A legacy `periodId` exception and an equivalent modern period `timeWindow` can represent the same authored schedule meaning.

Stage 2 needs a resolved/normalized authoring projection so:

- display is safe;
- same-value Apply can remain a no-op;
- explicit edits can write modern shape.

### FINDING-SE-006 — imported conflicting intent is a read problem, not permission for silent repair

Stored `absent + targetLocationId` combinations must be inspectable.

New authoring can enforce a clearer mutually exclusive form without render-time mutation.

### FINDING-SE-007 — exception timeline rendering is a separate presentation problem

Authoring completeness can be reached with list + form + existing time navigation.

Priority-aware timeline bands should not be pulled into this slice without evidence.

### FINDING-SE-008 — priority should be explicit

No repository evidence establishes a safe hidden default convention.

The author should provide a finite numeric priority intentionally.

## 35. Stage 1 decisions

### DEC-SE-001 — editing surface

**Existing WORLD/TIME schedule authoring panel, separate Schedule Exceptions section.**

### DEC-SE-002 — selection ownership

Local panel state.

No new AuthorFocus kind.

### DEC-SE-003 — first-slice visualization

List/form only.

Dedicated timeline exception bands deferred.

### DEC-SE-004 — priority input

Explicit finite number required.

No hidden semantic default.

### DEC-SE-005 — ambiguity warning

Equal maximum-priority ambiguity does not block structurally valid Apply.

Existing diagnostics remain authoritative.

### DEC-SE-006 — new-write intent

New authored result explicitly chooses either:

- At Location; or
- Absent.

Imported conflicting records require explicit repair.

### DEC-SE-007 — day range

Support:

- one day;
- bounded multi-day;
- through project end.

No recurrence added.

### DEC-SE-008 — time windows

New writes use `timeWindow`.

Support Period and Exact, including existing cross-midnight semantics.

### DEC-SE-009 — legacy periodId

Read safely without render mutation.

Meaningful explicit edit writes modern `timeWindow`.

Semantically unchanged Apply creates no history entry.

### DEC-SE-010 — search integration

Existing indexing/navigation is sufficient for first slice.

No search-to-form selection protocol.

### DEC-SE-011 — runtime boundary

CRUD mutates authored `scheduleExceptions` only.

No direct Playhead or Actual Presence mutation.

### DEC-SE-012 — no-op behavior

Semantically unchanged candidate creates no authored history entry.

## 36. Traceability update

| ID | Requirement | Use Case | Domain Owner | Architecture | Component | Detailed Design | Code | Test | Status |
|---|---|---|---|---|---|---|---|---|---|
| REQ-SE-001 | canonical owner | UC-001/006/008/019 | ScheduleException | Stage 2 pending | WORLD/TIME panel | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-002 | typed CRUD | UC-001/006/007/008/020 | authored history | schedule authoring | WORLD/TIME panel | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-003 | Character validation | UC-001/012/016 | Character ref | validator | WORLD/TIME panel | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-004 | day range | UC-001/005/014 | DayRange | validator | form | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-005 | modern timeWindow | UC-001/003/004/014/015 | RoutineTimeWindow | compatibility boundary | form | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-006 | location/absence | UC-001/002/013/016/017 | ScheduleException | authoring validator | form | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-007 | priority semantics | UC-001/006/010/011/014 | priority + analysis | schedule-analysis | form + diagnostics | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-008 | reason | UC-001/006 | ScheduleException | authored data | form | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-009 | runtime separation | UC-001/007/018 | simulation state | authored/runtime boundary | panel | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-010 | diagnostics reuse | UC-008/010/011 | schedule-analysis | Story Brain | existing | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-011 | search compatibility | UC-008/009 | derived search index | Project Search | existing | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-012 | persistence | UC-009/015/016 | authored project | repository | panel | — | — | Stage 9 | ✅ UC covered |
| REQ-SE-013 | semantic no-op | UC-006/007/012/013/014/020 | normalized candidate | reducer/history | panel | — | — | Stage 9 | ✅ UC covered |

## 37. Gate Review — Stage 1 → Stage 2 Domain Model

### Traceability checks

✅ Every Stage 0 functional requirement has scenario coverage.

✅ Create, edit, remove, Undo, Redo and persistence are explicit.

✅ Valid and invalid canonical references are explicit.

✅ One-day, bounded and open-ended ranges are distinguished.

✅ Period, exact and cross-midnight windows are covered.

✅ Legacy periodId read behavior is explicit.

✅ Priority override and equal-priority ambiguity are distinct.

✅ Imported stale/conflicting records are covered.

✅ Runtime Playhead/Actual Presence separation is explicit.

✅ RoutineRule isolation is explicit.

✅ Same-value history behavior is explicit.

### Scope checks

✅ No new ScheduleException domain field introduced.

✅ No new recurrence model introduced.

✅ No new top-level workspace introduced.

✅ No AuthorFocus expansion required.

✅ No timeline exception rendering required.

✅ No Project Search redesign required.

✅ No diagnostic algorithm duplication.

✅ No runtime presence mutation.

✅ No schema/migration requirement introduced.

### Architecture findings requiring Stage 2 modeling

Stage 2 must define the smallest model vocabulary for:

1. raw canonical stored `ScheduleException`;
2. modern resolved time-window view that can read legacy `periodId`;
3. resolved reference state:
   - Character resolved/unresolved;
   - Location resolved/unresolved;
   - location/absence/conflicting stored intent;
4. transient authoring draft shape;
5. validated canonical candidate;
6. semantic equality/no-op rules across legacy vs modern equivalent windows;
7. validation result taxonomy;
8. add/update/remove aggregate identity semantics;
9. proof that simulation/Actual Presence are not inputs/outputs of the authoring mutation.

It must **not** create a second persisted Schedule Exception model just to support UI drafts.

### Gate decision

**✅ PASS to Stage 2 Domain Model.**

No Stage 1 BLOCKER exists.

Production implementation remains prohibited until later design/impact/contracts gates pass.

## 38. Next concrete stage — do not skip

**Stage 2: Domain Model for Schedule Exception Authoring.**

At minimum it must answer:

1. What remains raw canonical persisted ScheduleException?
2. What application/presentation projection represents legacy `periodId` and modern `timeWindow` uniformly?
3. How are unresolved Character/Location references represented without mutating stored data?
4. How is conflicting imported `absent + targetLocationId` represented?
5. What is the exact transient draft shape for incomplete form state?
6. What makes a draft valid enough to become a canonical candidate?
7. What constitutes semantic equality, especially for legacy-period vs modern-period equivalence?
8. What validation statuses exist for missing id, duplicate id, invalid Character, invalid Location, invalid day range, invalid time window, invalid priority and same-value update?
9. How does add/update/remove interact with authored history identity?
10. How is the authoring aggregate boundary proven independent from simulation/Actual Presence?

Only after the Stage 2 Gate may Existing Architecture Verification refine code ownership.
