# A68-C1 — EXECUTABLE ACCEPTANCE CONTRACT

Status: **ENGINEERING ACCEPTANCE IMPLEMENTED / HUMAN UX WALKTHROUGH PENDING**
Updated: **2026-10-05**
Base stable: `9ad85cc12a289dfe80073be5a0a5c119189ec746`

## Purpose

Define the concrete acceptance histories used to verify the approved A68-C1 Computer Club content on the canonical Player/runtime path.

This contract documents acceptance behavior and closure evidence; it does not itself add production content or change runtime behavior.

## Existing production APIs to reuse

Use the same canonical Player path already proven in A67:

- `compileNarrativeRuntimeArtifact(...)`;
- `materializeNarrativePlayerSession(...)`;
- `bootstrapNarrativePlayerWorldStart(...)`;
- `executeNarrativePlayerTravel(...)`;
- `executeNarrativePlayerWait(...)`;
- `executeNarrativePlayerStoryWork(...)`;
- `executeNarrativePlayerAction(...)`;
- `deriveNarrativePlayerPresentation(...)`;
- `serializeNarrativePlayerSave(...)`;
- `restoreNarrativePlayerSaveJson(...)`.

A68-C1 should extend the existing first-week project builder rather than introduce a parallel Player/runtime fixture.

## Proposed production entry point

Prefer a new content composition layer:

`create93DaysComputerClubCycleProject()`

built from:

`create93DaysFirstWeekProject()`

The exact function name is not architectural. The invariant is that A68 content composes on top of the current canonical project instead of forking the gameplay model.

## Proposed C1 IDs

Namespace: `a68-`.

### Location / scene

- `a68-computer-club`
- `a68-computer-club:main-room`

### Characters

- `a68-club-worker`
- `a68-club-regular`

### Routes

Minimum:

- `a68-route-dorm-club`
- `a68-route-club-dorm`

Optional only if content timing requires it:

- `a68-route-club-old-city`
- `a68-route-old-city-club`

### Claims

Use one ordinary proposition as the first provenance proof.

Recommended semantic shape:

- a planned local gathering/change/event is being discussed;
- one source is an identifiable in-person character;
- another source is an attributed online nickname/forum/chat message;
- the proposition may be the same while source/provenance differs.

Avoid conspiracy framing and avoid making the internet source automatically more or less truthful.

### Story beats

Minimum four beats:

1. `club-entry` — Player reaches the Computer Club and meets at least one new NPC.
2. `source-split` — Player can acquire the same proposition through two explicit sources.
3. `cross-place-echo` — the club-originating proposition changes a later dorm or Old City interaction.
4. `bridge-followup` — repeated encounter with one bridge NPC on a later day.

## Acceptance history A — prior Old City connection

Precondition:

- Player completed the A67 Old City line and has a stronger/familiar relation with the camera student.

Expected C1 difference:

- camera student or another existing A67 connection gives an easier/warmer entry to the club;
- at least one Move, outcome or relationship delta differs from History B;
- no hidden global reputation flag is introduced.

Test proof:

- canonical Player presentation exposes the A-specific Move/outcome;
- relationship/knowledge/memory change is canonical state;
- the result survives save/restore.

## Acceptance history B — weaker / dorm-oriented first week

Precondition:

- Player chose the A67 dorm line or otherwise lacks the same Old City familiarity.

Expected C1 difference:

- Player can still reach and use the Computer Club;
- entry is not blocked;
- source/provenance path differs;
- the eventual cross-place consequence remains understandable.

The history must be viable, not a punishment branch.

## Test 1 — project composition and compile

Build the A68-C1 project from the existing first-week project.

Assert:

- existing A67 locations/characters/story remain present;
- Computer Club location exists exactly once;
- two new NPCs exist exactly once;
- schema version is unchanged unless a concrete compiler requirement proves otherwise;
- `compileNarrativeRuntimeArtifact` returns `compiled`.

Failure here is a content/composition defect by default, not justification for a new subsystem.

## Test 2 — cold canonical travel to Computer Club

Start from canonical Player world start and use authored routes only.

Required proof:

- Player can reach the dorm through existing Day 1 routes;
- later, Player can travel dorm → Computer Club using `executeNarrativePlayerTravel`;
- Player Actual Presence ends at `a68-computer-club`;
- fare/time/body restrictions, if authored, are surfaced by existing Player travel presentation;
- no direct `setNarrativeCharacterActualLocation` is allowed in this acceptance history.

## Test 3 — NPC routines and presence

At least two new NPCs need authored routine rules.

Required proof:

- expected Scheduled Presence is derived for the intended club window;
- due-work/routine advancement produces consistent Actual Presence where the current runtime contract expects it;
- the Player can arrive and find the intended character without test-only placement mutation.

If a character must appear at an exact authored instant, prefer the already proven scheduled Story-work arrival pattern rather than inventing a generic NPC scheduler.

## Test 4 — explicit provenance split

Create two histories that lead to the same underlying proposition.

History A source example:

- `a68-club-worker` tells the Player directly.

History B source example:

- a Story/Move representing an attributed forum/chat message gives the Player the proposition with a different explicit source context.

Acceptance:

- Player knows the same semantic proposition in both histories;
- the canonical knowledge/source record differs;
- no automatic rumor propagation occurs;
- later content can guard/branch on source-aware state using existing contracts.

If current source typing cannot represent the online-attributed case without lying about the source, that is a **real RUNTIME contract gap** and may open a focused sub-slice.

## Test 5 — A67 continuity changes C1

Use one existing A67 state only for the first implementation.

Preferred first dependency:

- relationship/familiarity with `a67-camera-student`, or
- knowledge of `a67-claim-cinema-future-contested`.

Acceptance:

- the difference changes one available Move, guard or outcome in C1;
- both histories remain playable;
- no duplicated A68-specific reputation variable is introduced.

## Test 6 — cross-place consequence

A proposition learned or reinforced in the Computer Club must affect a later scene elsewhere.

Preferred first destination:

- student dormitory, because it already anchors the Player and existing social provenance.

Alternative:

- Old Market / Old Cinema if the camera-student bridge is stronger in implementation.

Acceptance:

- consequence is not shown as a duplicate replay of the club scene;
- Player can explain the causal chain from source → knowledge/action → later reaction;
- later NPC knowledge is produced by explicit authored work/effects, not hidden auto-spread.

## Test 7 — repeated bridge relationship

One new NPC must appear in at least two authored events on different moments/days.

Acceptance:

- second encounter reads prior relationship/knowledge state;
- at least one relationship axis changes across the sequence;
- state is preserved by save/restore;
- NPC is not just a one-scene exposition device.

## Test 8 — save/continue

Save after the first Computer Club interaction and restore into a fresh Player session built from the same runtime artifact.

Assert preservation of:

- simulation day/time/location;
- Player knowledge and source provenance;
- relevant relationship state;
- Story state overrides;
- runtime occurrences needed for one-shot protection.

Continue after restore into the cross-place echo and prove it remains executable exactly once.

## Test 9 — Player presentation causality

At the cross-place consequence, Player-facing presentation should expose enough context that a tester can understand why the event is happening without reading raw project state.

Engineering assertion may cover only structural visibility:

- correct Story opportunity;
- correct action label;
- correct local character;
- correct timing/location.

Human playtest is still required for wording/clarity.

## Test 10 — authoring regression

Use the existing canonical authoring reducer to edit one ordinary A68-C1 element:

- Story placement;
- Claim text/tags;
- NPC routine;
- Move guard/effect.

Then:

- undo;
- redo;
- compile runtime artifact.

A68-C1 must not require direct TypeScript surgery for ordinary maintenance after the fixture is established.

## Initial implementation order

1. Project composition + IDs + Computer Club location/scene.
2. Dorm ↔ club routes.
3. Two NPC definitions + routines/arrival pattern.
4. Entry Story + first bridge relationship.
5. Provenance split.
6. Cross-place echo.
7. A67 continuity branch.
8. Save/continue and cold-path acceptance tests.
9. Human playtest focused on causality.

## Stop / escalate rule

Do not introduce a new type/class/system unless one of these acceptance tests demonstrates a concrete missing contract.

Classify failures as:

- **CONTENT** — authored data/branching/timing problem;
- **PRESENTATION** — Player cannot understand or access an otherwise valid state;
- **TOOLING** — canonical authoring cannot make the required ordinary edit;
- **RUNTIME** — current simulation/provenance/save contract cannot represent required behavior.

Only TOOLING/RUNTIME blockers may justify a focused platform sub-slice.
