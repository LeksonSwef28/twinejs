# 93 Days — A67-D1 Workspace Context · Stage 3 Architecture Verification

Status: **STAGE 3 COMPLETE — PASS to Component Design**
Base: `93-days-editor@ba0285295b3727c0518349344560d1577c971172`
Depends on Stage 0–2 Workspace Context documents.
Date: **2026-09-30**
Production code: **none**

## Goal

Verify the Stage 2 Author Focus model against the existing CORE / APPLICATION / STORE / UI architecture before Component Design.

## Current architecture

### Domain
- `domain/narrative/editor.ts`: View Cursor/workspace/viewports.
- `domain/narrative/workspace-navigation.ts`: pure Story↔WORLD/TIME calculations.
- `domain/narrative/project.ts`: canonical project aggregate.

### Application
- `application/narrative/project-search.ts`: search/backrefs and stable navigation targets.
- `application/narrative/preview-from-here.ts`: precedent for read-only authoring focus descriptors that never become runtime truth.

### Store
- `NarrativeProjectContext`: canonical project, execute, Undo/Redo, runtime replacement, persistence/recovery.
- persisted `editor` projection is part of the project envelope.

### UI
`NarrativeWorkspace` already owns session-only coordination:
- Split View;
- Library/Export/Playtest visibility;
- Preview-from-here request;
- transient direct-navigation form state.

Its children include Search, CrossWorkspaceNavigator, StoryWorkspace and WorldTimeWorkspace.

## Ownership decision

### Persist Focus in NarrativeProject.editor
**Rejected for first slice.**

Stage 1 requires continuity only during the active editor session, not after app restart. Persistence would add hydration/stale-reference/schema concerns without a requirement.

### Put Focus into NarrativeProjectContext
**Rejected as primary owner.**

That provider owns project/store/persistence/recovery concerns. Adding session navigation state there would broaden the store boundary and invite unrelated UI session state.

### NarrativeWorkspace session boundary
**Accepted.**

Reasons:
- every first-slice consumer is below it;
- its lifecycle equals the active authoring session;
- it already owns non-persisted session coordination;
- it survives STORY/WORLD-TIME child unmount/remount;
- no global store is required.

**DEC-WC-007:** Author Focus belongs to a narrow authoring-session boundary rooted at `NarrativeWorkspace`.

Exact React mechanism is Stage 4 work.

## Target dependency direction

```text
Domain focus value / validation semantics
          ↑
Application navigation orchestration
          ↑
Workspace session coordination
          ↑
Story / Search / WORLD-TIME UI
```

Forbidden:
- Story importing Search state;
- Search importing Story component state;
- WORLD/TIME reaching into Story local state;
- domain importing React/store UI;
- Focus mutating runtime;
- an event bus for this feature.

## Existing strengths to reuse

1. **One composition root** — all consumers meet under NarrativeWorkspace.
2. **Typed editor commands** already own workspace/viewports/View Cursor.
3. **Pure navigation helpers** already calculate Story/WORLD-TIME targets.
4. **Project Search navigation targets** already resolve stable destinations.
5. **Session-state precedent** already exists in NarrativeWorkspace.

## Real architecture issue found

**FINDING-WC-A01 — cross-surface Story navigation is duplicated in presentation code.**

Current paths:

- `ProjectSearchPanel.applyDocumentNavigation()`
  - resolves target;
  - scans Canvas;
  - moves Story/WORLD-TIME viewport;
  - switches workspace.

- `CrossWorkspaceNavigator.showInStory()/showInWorldTime()`
  - independently finds visual;
  - moves viewport;
  - switches workspace.

- `WorldTimeWorkspace.openStoryNode()`
  - independently finds Story visual;
  - independently computes Story viewport;
  - switches workspace.

WORLD/TIME does not even express the viewport calculation through the same helper used by the other paths.

### Why it matters

Adding Focus separately to these handlers would create:
- divergent focus timing;
- inconsistent missing-Canvas behavior;
- duplicated stale-reference handling;
- viewport/focus mismatch;
- future AI/editor context tied to UI internals.

### Required correction

Stage 4 must include a small **shared application/session navigation orchestration boundary**.

It does not own state. It coordinates:
- existing editor navigation commands;
- existing pure navigation helpers;
- explicit Author Focus transition.

## Target architecture

```text
NarrativeProjectContext
      │ project + execute()
      ▼
NarrativeWorkspace
      ├── session Author Focus owner
      └── navigation coordinator
             ├── Search
             ├── CrossWorkspaceNavigator
             ├── StoryWorkspace
             └── WORLD/TIME
```

Focus owner stores only the current finite focus reference.

It must not store:
- entity copies;
- viewport;
- navigation history;
- runtime state.

## Reconciliation with current local state

### ProjectSearchPanel.activeKey

Keep it.

`Search Active Document != Author Focus`.

Search supports many kinds that first-slice Focus does not. Opening a supported Story/Character coordinates both states; querying/filtering does not change Focus.

### CrossWorkspaceNavigator local selection/filter state

Keep it local.

Its selects are widget query state. Only explicit **Show in Story / Show in time** actions establish/retain canonical Story focus.

### StoryWorkspace.selectedStoryEntity

This currently mixes:
- canonical identity;
- `canvasNodeId`.

That union must not be moved wholesale into session state.

Target:
- StoryNode/Character canonical focus comes from session;
- Canvas-specific information stays projection-local only when needed;
- Item remains local in first slice because Item is not yet a supported Focus kind.

### WORLD/TIME Story marker

Explicit open of a Story marker should:
- establish Story-node focus;
- reuse central navigation orchestration;
- let Story projection consume Focus when mounted.

WORLD/TIME never owns Focus.

## Stale focus

Session Focus is validated against the current canonical project:

```text
project changes
   ↓
validate focus
   ├─ entity exists → keep
   └─ missing       → clear
```

Clearing stale Focus is not an authored command.

Undo may restore the deleted entity, but first-slice requirements do not automatically resurrect old Focus.

## Multiple Canvas instances

Author Focus never stores visual identity.

For navigation, existing stable Canvas order may choose the first matching visual instance deterministically.

An extra projection hint is still **deferred** unless Component Design proves a required scenario cannot be met without it.

## Files expected to remain outside blast radius

The first slice should not need changes to:
- Narrative Project schema;
- persistence projection;
- repository migrations/hydration;
- runtime history;
- simulation;
- compiler/export;
- Player.

If Stage 4 requires these, this architecture gate must be reopened.

## Risk review

**A01 Coordinator becomes God service**  
Mitigation: support only Stage 1 intents; delegate calculations to existing helpers; no domain/runtime mutation.

**A02 Session provider duplicates project store**  
Mitigation: store only AuthorFocusState; resolve current entity from Narrative Project.

**A03 Focus and failed projection become conflated**  
Mitigation: canonical focus and projection availability remain separate.

**A04 Unsupported search types enter Focus accidentally**  
Mitigation: finite StoryNode/Character union.

**A05 Application layer renders messages**  
Mitigation: return typed status; UI owns wording.

## Architecture mapping

| Requirement | Architectural owner |
|---|---|
| REQ-WC-001 one focus | NarrativeWorkspace session boundary |
| REQ-WC-002 Story selection → focus | Story UI → session contract |
| REQ-WC-003 cross-surface handoff | shared navigation coordinator |
| REQ-WC-004 editor-only | session state outside project/runtime |
| REQ-WC-005 stale handling | pure focus validation |
| REQ-WC-006 reuse navigation owners | existing commands/helpers |
| REQ-WC-007 no new workspace | existing NarrativeWorkspace composition |

## Gate Review — Stage 3 → Stage 4

✅ Every Stage 2 concept has an architectural owner.

✅ No new global store.

✅ No schema/persistence change.

✅ No runtime/gameplay dependency.

✅ No circular component dependency required.

✅ Existing commands/helpers are reusable.

✅ Search-active state remains distinct from Focus.

✅ Canvas identity remains distinct from Focus.

⚠ Existing duplicated navigation orchestration must be centralized rather than patched four times.

### Decision

**✅ PASS to Stage 4 — Component Design.**

No architectural BLOCKER.

Stage 4 must define components/interfaces/dependencies for:
- session focus owner;
- focus validator;
- shared navigation coordinator;
- Story projection;
- Search handoff;
- WORLD/TIME handoff;
- Split View behavior.

No production implementation before the Stage 4 Gate.
