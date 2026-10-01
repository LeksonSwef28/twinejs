# 93 Days — A67-D1 Workspace Context · Stage 1 Use Cases

Status: **STAGE 1 COMPLETE — Gate to Domain Model**
Base: `93-days-editor@ba0285295b3727c0518349344560d1577c971172`
Depends on: `93DAYS_A67_D1_WORKSPACE_CONTEXT_STAGE0.md`
Date: **2026-09-30**
Production code in this slice: **none**

## 1. Stage 1 purpose

Stage 0 established the problem:

> several editor surfaces know locally what the author is working on, but there is no shared editor-level canonical entity focus.

Stage 1 does not choose TypeScript interfaces or storage yet. It defines the real author journeys that the next Domain Model must support.

The scenarios below are intentionally narrower than a future global navigation/session framework.

## 2. Use-case scope decision

The first Workspace Context slice shall support only these canonical focus kinds:

- **Story node**
- **Character**

Reason:

- both are already visible/selectable in STORY;
- Project Search already resolves both;
- Story-node focus is required for the strongest proven A67 cross-workspace friction;
- Character focus is required to prove that focus is canonical identity rather than Canvas identity.

Deferred from the first slice:

- Location focus;
- Item focus;
- Fact/Claim/Move focus;
- Routine/ScheduleException focus;
- recent/pinned entities;
- global navigation history.

Deferral is deliberate. It does not mean those entities can never participate later.

## 3. Lifetime decision recovered from scenarios

The first slice requires:

> **focus survives ordinary workspace/component switching within the current editing session.**

The first slice does **not** require:

> focus must be restored after closing/reopening the project/application.

Therefore persistence across application restart remains optional and must not drive Stage 2 prematurely.

This resolves UNKNOWN-WC-001 enough to continue: **session continuity is required; restart persistence is not.**

## 4. UC-WC-001 — Story node → WORLD/TIME → Story keeps canonical focus

**Actor:** author.

**Related requirements:** REQ-WC-001, REQ-WC-002, REQ-WC-003, REQ-WC-004, REQ-WC-006, REQ-WC-007.

### Preconditions

- a Story node exists;
- it has one Story Canvas visual instance;
- it has exact authored day/time;
- Simulation Playhead is at another moment.

### Trigger

Author selects the Story node and chooses the existing action to show it in WORLD/TIME.

### Main flow

1. STORY establishes the selected Story node as canonical author focus.
2. Existing Story→WORLD/TIME navigation resolves the authored placement.
3. Existing WORLD/TIME viewport owner moves the View Cursor/timeline.
4. Workspace changes to WORLD/TIME when Split View is off.
5. Canonical focus remains the same Story node.
6. WORLD/TIME visually represents that Story node through its existing Story marker.
7. Author opens the marker back in STORY.
8. Existing Story viewport navigation moves to the relevant Canvas instance.
9. STORY inspector/highlighting projects from the same canonical focus.

### Alternative flow — Split View

- both panes stay mounted;
- workspace mode need not switch;
- one canonical focus is projected by both panes where representable.

### Error / boundary

If the Story node loses exact authored time before the WORLD/TIME action:

- focus remains the Story node;
- navigation to an exact moment is unavailable;
- no time is invented;
- Simulation Playhead is unchanged.

### Result

The author does not lose the subject of work while changing views.

### Must not happen

- focus becomes `canvasNodeId`;
- Simulation Playhead moves;
- authored Story placement changes;
- runtime presence is fabricated;
- an Undo step is created for focus/navigation.

---

## 5. UC-WC-002 — Project Search Story result opens the same focused Story node

**Actor:** author.

**Related requirements:** REQ-WC-001, REQ-WC-003, REQ-WC-004, REQ-WC-006.

### Preconditions

- Project Search contains a Story result;
- the Story node has a Canvas representation.

### Trigger

Author searches for the Story node and presses **Open**.

### Main flow

1. Search resolves its existing stable navigation target.
2. The canonical Story node becomes author focus.
3. Existing Story viewport navigation centers an available visual instance.
4. Existing workspace selection opens STORY.
5. Story inspector/highlighting reflects the same canonical Story node.

### Repeated action

Opening the same result again is idempotent with respect to authored/runtime state.

It may re-center the viewport, but it must not create a second focus object or authored history entry.

### Result

Search no longer has a private concept of "active result" that disappears at the destination.

---

## 6. UC-WC-003 — Project Search Character result works even without a Canvas instance

**Actor:** author.

**Related requirements:** REQ-WC-001, REQ-WC-003, REQ-WC-004, REQ-WC-005, REQ-WC-006.

### Preconditions

- a canonical Character exists;
- the Character is indexed by Project Search.

### Main flow A — Character has a Canvas instance

1. Author opens Character search result.
2. Character canonical identity becomes author focus.
3. STORY opens.
4. Existing navigation may center the Character visual instance.
5. character-facing inspector/metadata projections may use the canonical focus.

### Alternative flow B — Character has no Canvas instance

1. Author opens Character search result.
2. Character canonical identity still becomes author focus.
3. STORY may open because it is the current Character destination.
4. No Canvas node is fabricated.
5. No unrelated Character is selected.
6. The UI may show the canonical focused Character as "not represented on this canvas" until a later UX action is designed.

### Result

Canonical focus is not dependent on visual placement.

### Architectural evidence produced by this UC

`Canvas Instance != Canonical Entity` is not just a documentation invariant; the focus design must make this separation executable.

---

## 7. UC-WC-004 — one canonical entity has multiple Canvas instances

**Actor:** author.

**Related requirements:** REQ-WC-001, REQ-WC-002, REQ-WC-003, REQ-WC-006.

### Preconditions

- the same canonical Character or Story entity is represented by more than one visual instance allowed by the editor model.

### Trigger

Author selects one visual instance.

### Main flow

1. canonical focus becomes the entity identity, not the selected visual-node identity;
2. the originating visual instance may be remembered as a **navigation hint** only;
3. leaving and returning to STORY must not create a second canonical identity.

### Alternative

If the original visual instance no longer exists when returning:

- focus remains the canonical entity if it still exists;
- a target projection may choose another valid visual representation deterministically;
- if none exists, the no-Canvas behavior from UC-WC-003 applies.

### Result

Visual multiplicity does not duplicate domain identity.

### Stage 2 implication

The Domain Model may need to distinguish:

- canonical focus identity;
- optional projection/navigation hint.

The hint must never become authoritative entity identity.

---

## 8. UC-WC-005 — unscheduled Story node keeps focus but cannot fabricate WORLD/TIME destination

**Actor:** author.

**Related requirements:** REQ-WC-003, REQ-WC-004, REQ-WC-005, REQ-WC-006.

### Preconditions

- a Story node is focused;
- it has no complete authored day/time.

### Trigger

Author requests **Show in time**.

### Main flow

1. focus remains the Story node;
2. navigation resolver reports that no exact WORLD/TIME moment is available;
3. existing WORLD/TIME viewport is not moved to an invented fallback;
4. Simulation Playhead stays unchanged;
5. authored placement stays unchanged.

### Result

The editor distinguishes "focused entity" from "available projection in this view".

---

## 9. UC-WC-006 — focused entity is deleted

**Actor:** author.

**Related requirements:** REQ-WC-004, REQ-WC-005.

### Preconditions

- a Story node is current canonical focus.

### Trigger

The author deletes that canonical Story node through the existing authoring command.

### Main flow

1. canonical deletion succeeds according to existing authoring semantics;
2. focus validation detects that the focused canonical id no longer resolves;
3. focus becomes **none / invalidated**;
4. no nearest/first entity is silently substituted;
5. stale inspector/highlight state disappears;
6. runtime state is not changed merely to repair editor focus.

### Undo alternative

If authoring Undo restores the deleted entity:

- Stage 1 does **not** require focus to resurrect automatically;
- restoring prior focus may be considered later if evidence shows it is useful.

### Result

Stale editor metadata cannot impersonate a canonical entity.

---

## 10. UC-WC-007 — Split View projects one focus into two panes

**Actor:** author.

**Related requirements:** REQ-WC-001, REQ-WC-003, REQ-WC-004, REQ-WC-007.

### Preconditions

- Split View is enabled;
- a scheduled Story node is focused.

### Trigger

Author changes focus from either pane.

### Main flow

1. one canonical author focus is updated;
2. STORY projects the focus through Story selection/inspection;
3. WORLD/TIME projects the same focus through its Story marker/time context;
4. neither pane creates a competing second focus owner;
5. Simulation Playhead is unchanged.

### Alternative — focus representable only on one side

Example: Character focus without a direct WORLD/TIME projection.

- canonical focus remains Character;
- STORY may represent it;
- WORLD/TIME must not pretend another entity is focused;
- WORLD/TIME may remain visually neutral until a Character projection is explicitly designed.

### Result

Split View is still a lens over two workspaces, not two independent author contexts.

---

## 11. UC-WC-008 — opening a related entity intentionally replaces focus

**Actor:** author.

**Related requirements:** REQ-WC-001, REQ-WC-003, REQ-WC-006.

### Preconditions

- Story node A is focused;
- Project Search/back-reference exposes Character B.

### Trigger

Author explicitly opens Character B.

### Main flow

1. focus changes from Story node A to Character B;
2. navigation projects Character B where possible;
3. A is not retained as a hidden second "active" focus.

### Result

The first slice has **one current focus**, not a focus stack.

### Deferred

Recent entities / back stack / pinned entities remain separate future concepts.

---

## 12. UC-WC-009 — unsupported entity type does not force premature generalization

**Actor:** author.

**Related requirements:** REQ-WC-005, REQ-WC-006.

### Preconditions

- Project Search returns an entity kind not supported by the first focus slice, for example Fact, Claim, Move, Item, Routine or ScheduleException.

### Trigger

Author opens the result.

### Main flow

1. existing navigation behavior remains available;
2. the first focus contract is not expanded implicitly;
3. no fake Story-node/Character focus is created;
4. future support requires its own requirement/use-case coverage.

### Result

Focus remains a finite typed contract rather than a generic `{type: string, id: string}` dumping ground.

---

## 13. UC-WC-010 — runtime changes do not steal author focus

**Actor:** author / preview tooling.

**Related requirements:** REQ-WC-004.

### Preconditions

- a Story node or Character is focused;
- Preview/simulation performs an allowed runtime update.

### Trigger

Runtime projection changes, such as time, presence, knowledge or relationship state.

### Main flow

1. author focus remains unchanged unless the author performs an explicit focus/navigation action;
2. runtime operations do not dispatch focus changes implicitly;
3. focus itself does not write runtime state.

### Result

`Author Focus != Runtime Attention/Reaction Target`.

This prevents future AI/simulation systems from accidentally hijacking editor context.

---

## 14. Error and boundary matrix

| Condition | Required behavior |
|---|---|
| Empty focus | valid state; no entity inspector/highlight implied |
| Same focus selected repeatedly | idempotent; no authored/runtime mutation |
| Focused canonical entity missing | invalidate/clear focus; no fallback entity |
| Story node has no authored time | keep focus; no WORLD/TIME moment fabrication |
| Character has no Canvas instance | keep Character focus; no visual instance fabrication |
| Multiple Canvas instances | one canonical focus; visual target is only a navigation projection |
| Split View cannot represent focus in one pane | keep canonical focus; pane remains neutral |
| Unsupported entity kind | preserve existing navigation; do not coerce into supported focus |
| Simulation advances | focus does not change |
| Undo/Redo authored content | no requirement to restore old focus in first slice |
| Reopen application | focus restoration not required in first slice |

## 15. Requirement coverage

| Requirement | Use Cases | Coverage |
|---|---|---|
| REQ-WC-001 single editor author focus | UC-001,002,003,004,007,008 | ✅ |
| REQ-WC-002 Story selection participates | UC-001,004 | ✅ |
| REQ-WC-003 contextual navigation establishes focus | UC-001,002,003,007,008 | ✅ |
| REQ-WC-004 focus is editor-only | UC-001,002,003,005,006,007,010 | ✅ |
| REQ-WC-005 invalid/stale safe handling | UC-003B,005,006,009 | ✅ |
| REQ-WC-006 reuse navigation owners | UC-001,002,003,005,008,009 | ✅ |
| REQ-WC-007 no new workspace | UC-001,007 | ✅ |

No Stage 0 requirement is left without scenario coverage.

## 16. Scenarios intentionally NOT added

The following are not justified by current requirements and therefore do not enter Stage 1:

- global focus history;
- pinned entities;
- breadcrumb graph;
- automatic related-entity suggestions;
- AI-selected focus;
- cross-project focus;
- synchronized focus with Player runtime;
- multi-selection;
- focus on arbitrary custom entity types.

These require separate requirements later.

## 17. New design findings produced by Stage 1

### FINDING-WC-001 — canonical focus cannot contain only Canvas identity

UC-WC-003/004 prove this.

A Character may exist without a Canvas instance and a canonical entity may have multiple visual instances.

Therefore the next Domain Model must model canonical identity independently.

### FINDING-WC-002 — focus and projection availability are separate concepts

UC-WC-005/007 prove this.

An entity can remain current focus even when the current pane cannot project it.

### FINDING-WC-003 — a visual instance may be a navigation hint, not identity

UC-WC-004 suggests an optional projection hint may improve return navigation.

This is not yet a required field. Stage 2 must determine whether it is needed or whether deterministic projection lookup is sufficient.

### FINDING-WC-004 — shared focus does not require global navigation history

UC-WC-008 proves that the first slice can remain one current focus.

Existing Project Search back navigation can remain local for now.

### FINDING-WC-005 — focus must not be driven by runtime

UC-WC-010 makes explicit a separation that future AI/Dialogue work will rely on:

`Author Focus != Runtime Agent Attention`.

## 18. Stage 1 decisions

### DEC-WC-001 — first supported focus kinds

**Story node + Character.**

Location and Item are deferred.

### DEC-WC-002 — lifetime requirement

Focus must survive workspace/component switching in the active editing session.

Persistence after application restart is not required for the first slice.

### DEC-WC-003 — stale focus behavior

If the canonical entity no longer exists, focus clears/invalidates.

No implicit replacement.

### DEC-WC-004 — one current focus

No focus stack, multi-focus or hidden secondary focus in first slice.

### DEC-WC-005 — projection neutrality

A pane that cannot represent the current focus remains neutral rather than selecting a different entity.

## 19. Traceability update

| ID | Requirement | Use Case | Architecture | Component | Detailed Design | Code | Test | Status |
|---|---|---|---|---|---|---|---|---|
| REQ-WC-001 | single editor author focus | UC-001/002/003/004/007/008 | Editor navigation | Stage 2 pending | — | — | Stage 9 | ✅ UC covered |
| REQ-WC-002 | Story selection updates focus | UC-001/004 | Story/editor boundary | Stage 2 pending | — | — | Stage 9 | ✅ UC covered |
| REQ-WC-003 | cross-surface handoff | UC-001/002/003/007/008 | Workspace navigation | Stage 2 pending | — | — | Stage 9 | ✅ UC covered |
| REQ-WC-004 | editor-only / no runtime mutation | UC-001/002/003/005/006/007/010 | Editor projection | Stage 2 pending | — | — | Stage 9 | ✅ UC covered |
| REQ-WC-005 | stale focus safe handling | UC-003B/005/006/009 | Focus validation | Stage 2 pending | — | — | Stage 9 | ✅ UC covered |
| REQ-WC-006 | reuse existing navigation owners | UC-001/002/003/005/008/009 | Existing command boundary | Stage 2 pending | — | — | Stage 9 | ✅ UC covered |
| REQ-WC-007 | no new workspace | UC-001/007 | Presentation architecture | Stage 2 pending | — | — | Stage 9 | ✅ UC covered |

## 20. Gate Review — Stage 1 → Stage 2 Domain Model

### Traceability checks

✅ Every Stage 0 functional requirement has at least one real Use Case.

✅ Every Use Case maps to existing requirements.

✅ No new gameplay/runtime requirement appeared.

✅ Error, empty, repeated-action and stale-reference cases are covered.

✅ Component unavailability in this feature is represented by missing projection, not fabricated data.

### Architecture checks

✅ Story node focus can reuse existing Story/WORLD-TIME navigation semantics.

✅ Character scenario proves focus must be canonical rather than Canvas-local.

✅ Split View does not require a third workspace or second focus.

✅ Simulation/runtime remains outside focus ownership.

⚠ Optional visual projection hint requires a Stage 2 decision.

⚠ Exact ownership (persisted editor projection vs session-level editor/application state) remains a Stage 2 design choice because both can satisfy current Use Cases.

### Gate decision

**✅ PASS to Stage 2 Domain Model.**

No BLOCKER exists.

The next stage must define the smallest domain/editor model that supports these Use Cases without creating a generic universal entity graph or a second source of truth.

No production implementation should begin before the Stage 2 Gate passes.
