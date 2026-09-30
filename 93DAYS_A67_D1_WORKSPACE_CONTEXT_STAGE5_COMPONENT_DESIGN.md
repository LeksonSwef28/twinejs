# 93 Days — A67-D1 Workspace Context · Stage 5 Component Design

Status: **STAGE 5 COMPLETE — PASS to Contracts / Interfaces**
Base: `93-days-editor@ba0285295b3727c0518349344560d1577c971172`
Depends on Stage 0–4 Workspace Context documents.
Date: **2026-09-30**
Production code: **none**

## 1. Purpose

Break the approved architecture into components with one clear reason to exist.

This stage defines responsibilities, inputs, outputs, dependencies, state and error boundaries. It does **not** define final TypeScript signatures or implementation.

## 2. Component map

```text
NarrativeProjectContext
        │
        ▼
NarrativeWorkspace
        │
        ├── AuthoringSessionFocusProvider
        │       └── AuthorFocusPolicy
        │
        └── AuthoringNavigationAdapter
                └── AuthoringNavigationPlanner
                        ├── projectSearchNavigationTarget()
                        ├── storyCanvasViewportForNode()
                        └── worldTimeViewportForStoryNode()

Consumers:
- StoryWorkspace
- ProjectSearchPanel
- CrossWorkspaceNavigator
- WorldTimeWorkspace
```

No new global store, event bus or persisted project field is introduced.

---

# COMP-WC-001 — AuthorFocusPolicy

**Название:** Author Focus Policy / Validator

**Ответственность:**  
Define the finite first-slice focus value and determine whether a focus reference still resolves to a canonical supported entity.

**Вход:**
- candidate Story-node or Character focus reference;
- current canonical project data required to resolve Story nodes / Characters.

**Выход:**
- valid canonical focus;
- or invalid/no focus.

**Используемые зависимости:**
- canonical Story-node ids;
- canonical Character ids;
- stable entity ids.

**Предоставляемые возможности:**
- construct/recognize supported focus kinds;
- compare two focus values;
- validate existence;
- reject stale focus;
- reject unsupported kinds.

**Состояние:** none.

**Ошибки:**
- unknown Story node;
- unknown Character;
- unsupported focus kind.

These are normal validation outcomes, not thrown infrastructure failures.

**Связанные требования:** REQ-WC-001, 004, 005.

**Связанные Use Cases:** UC-003, 004, 006, 009, 010.

**Single reason to exist:**  
Protect the semantic boundary of what Author Focus means.

---

# COMP-WC-002 — AuthoringSessionFocusProvider

**Название:** Authoring Session Focus Provider

**Ответственность:**  
Own exactly one non-persisted Author Focus for the active NarrativeWorkspace session and expose explicit focus/clear operations to sibling authoring surfaces.

**Вход:**
- explicit author focus request;
- current canonical project changes for stale validation.

**Выход:**
- current valid Author Focus or none;
- explicit set/clear capabilities.

**Используемые зависимости:**
- COMP-WC-001 AuthorFocusPolicy;
- existing Narrative Project read access.

**Предоставляемые возможности:**
- read current focus;
- set supported focus;
- clear focus;
- clear stale focus when canonical entity is deleted.

**Состояние:**
- one `AuthorFocus | undefined`.

No entity copy, viewport, history, Canvas node id or runtime state.

**Ошибки:**
- requested focus no longer resolves;
- stale focus after canonical project mutation.

Both degrade to no focus rather than inventing a replacement.

**Связанные требования:** REQ-WC-001, 002, 003, 004, 005.

**Связанные Use Cases:** UC-001 through UC-010 where focus participates.

**Single reason to exist:**  
Maintain active-session canonical focus continuity.

---

# COMP-WC-003 — AuthoringNavigationPlanner

**Название:** Authoring Navigation Planner

**Ответственность:**  
Convert an explicit author navigation intent into a deterministic plan using existing project/editor state and existing navigation helpers.

It does **not** execute commands and does **not** own focus state.

**Вход:**
- current Narrative Project read model;
- current editor viewport/workspace state;
- navigation intent;
- Split View mode where workspace switching semantics depend on it.

Candidate intents required by current Use Cases:
- open Story node in STORY;
- open Story node in WORLD/TIME;
- open Character in STORY;
- open Project Search document using existing target semantics.

**Выход:**
- target canonical focus transition when applicable;
- ordered editor-navigation actions/plan;
- typed projection status.

**Используемые зависимости:**
- `projectSearchNavigationTarget()`;
- `storyCanvasViewportForNode()`;
- `worldTimeViewportForStoryNode()`;
- canonical Story/Character lookup;
- current Story Canvas projection.

**Предоставляемые возможности:**
- one deterministic place for explicit cross-surface navigation rules;
- missing-Canvas behavior;
- unscheduled-Story behavior;
- Split View workspace-switch behavior;
- optional focus transition for supported targets.

**Состояние:** none.

**Ошибки/status outcomes:**
- canonical target missing;
- Story visual representation unavailable;
- Story temporal projection unavailable;
- unsupported search document for focus;
- no navigation action required.

These should be typed outcomes, not UI strings.

**Связанные требования:** REQ-WC-003, 005, 006, 007.

**Связанные Use Cases:** UC-001, 002, 003, 004, 005, 007, 008, 009.

**Single reason to exist:**  
Plan cross-surface author navigation consistently.

---

# COMP-WC-004 — AuthoringNavigationAdapter

**Название:** Authoring Navigation Adapter / Hook

**Ответственность:**  
Apply a navigation plan in the active UI session by coordinating existing editor commands with Author Focus transitions.

This is the bridge between stateless application planning and React/store actions.

**Вход:**
- explicit navigation intent from a UI component.

**Выход:**
- navigation result/status for the calling presentation;
- side effects limited to:
  - existing `editor/*` commands;
  - COMP-WC-002 focus set/clear where the plan requires it.

**Используемые зависимости:**
- COMP-WC-002 AuthoringSessionFocusProvider;
- COMP-WC-003 AuthoringNavigationPlanner;
- existing `useNarrativeProject()` execute/project read access.

**Предоставляемые возможности:**
- `open story in Story`;
- `open story in time`;
- `open character in Story`;
- `open search document`;
- consistent explicit navigation entry point for sibling UI surfaces.

Final method names belong to Stage 6.

**Состояние:** none beyond dependencies.

**Ошибки:**
- planner returns unavailable projection;
- canonical target became stale between intent and apply.

Presentation decides wording. Adapter must not fabricate a fallback entity/time.

**Связанные требования:** REQ-WC-003, 004, 005, 006, 007.

**Связанные Use Cases:** UC-001, 002, 003, 005, 007, 008, 009.

**Single reason to exist:**  
Apply an approved author-navigation plan without duplicating orchestration in each UI component.

---

# COMP-WC-005 — NarrativeWorkspace Composition Root

**Название:** NarrativeWorkspace session composition

**Ответственность:**  
Compose the existing authoring workspace and host the narrow session focus/navigation providers required by its child surfaces.

**Вход:**
- existing Narrative Project context;
- current workspace UI lifecycle.

**Выход:**
- child surfaces under one authoring-session boundary.

**Используемые зависимости:**
- COMP-WC-002;
- COMP-WC-004;
- existing Narrative Project store;
- existing Story/WORLD-TIME layout.

**Предоставляемые возможности:**
- lifecycle boundary for session focus;
- same focus available to Story/Search/CrossNavigator/WORLD-TIME;
- focus survives child workspace mount/unmount;
- Split View consumers share one focus.

**Состояние:**
Existing local session state remains:
- Split View;
- library/export/debug visibility;
- Preview-from-here request;
- direct navigation form state.

Author Focus is added through the narrow session component, not mixed into project persistence.

**Ошибки:** none specific beyond provider composition failures.

**Связанные требования:** REQ-WC-001, 004, 007.

**Связанные Use Cases:** UC-001, 007, 010.

**Single reason to exist:**  
Remain the composition root of one authoring session.

---

# COMP-WC-006 — StoryWorkspace Focus Projection

**Название:** StoryWorkspace

**Ответственность for this feature:**  
Project canonical Story/Character Author Focus into the existing Story canvas/inspector while retaining Canvas-only interaction state locally.

**Вход:**
- current Author Focus;
- canonical project;
- navigation adapter;
- Canvas interaction.

**Выход:**
- canonical Story/Character inspection/highlighting;
- explicit focus requests when Story/Character visuals are clicked;
- explicit navigation request to WORLD/TIME;
- existing authored edit commands from inspector.

**Используемые зависимости:**
- COMP-WC-002 focus read/set;
- COMP-WC-004 navigation adapter;
- existing Narrative Project store;
- existing Story analysis/navigation helpers.

**Предоставляемые возможности:**
- click Story visual → Story focus;
- click Character visual → Character focus;
- return from WORLD/TIME → inspector can resolve same canonical focus;
- select visual copy without confusing it with canonical identity.

**Состояние that remains local:**
- drag state;
- pan state;
- connection source/mode;
- form fields;
- **selectedCanvasNodeId** for the concrete visual instance;
- local Item inspection/selection because Item is outside first-slice Author Focus.

### Important local arbitration

Current `selectedStoryEntity` mixes canonical and visual responsibilities.

Target split:

```text
shared:
AuthorFocus = StoryNode | Character

local:
selectedCanvasNodeId?: string
selectedLocalItemId?: string
```

Clicking Story/Character:
- clears local Item inspection;
- sets shared canonical focus;
- records clicked Canvas node id locally when needed.

Clicking Item:
- keeps Item as local Story inspection;
- does not promote Item into Author Focus;
- local Item inspection may temporarily take presentation precedence over shared Focus without changing the session Focus.

When returning from another workspace:
- shared Focus restores canonical inspector/highlight;
- if there is no remembered concrete Canvas copy, Story may choose the first matching visual deterministically for viewport/highlight purposes;
- visual-instance-only actions such as **remove this Character reference from canvas** require a concrete local Canvas selection.

**Errors:**
- focused canonical entity deleted → provider clears focus;
- focused entity has no Canvas representation → canonical inspector may still exist; no visual node is fabricated;
- multiple visual copies → canonical focus remains one; local selected copy controls instance-specific actions.

**Связанные требования:** REQ-WC-001, 002, 003, 004, 005.

**Связанные Use Cases:** UC-001, 003, 004, 006, 007.

**Single reason to exist:**  
Remain the Story authoring surface; Focus is only its canonical selection input, not a new responsibility.

---

# COMP-WC-007 — ProjectSearchPanel Handoff

**Название:** ProjectSearchPanel

**Ответственность for this feature:**  
Keep search/discovery state local and delegate explicit Open/Show navigation to the shared adapter.

**Вход:**
- search query/filter/user selection;
- navigation adapter.

**Выход:**
- existing search results/backrefs;
- explicit navigation intent when author opens a result.

**Используемые зависимости:**
- existing Project Search application services;
- COMP-WC-004 navigation adapter.

**Предоставляемые возможности:**
- supported Story/Character open coordinates focus;
- unsupported search kinds retain existing navigation behavior without becoming fake focus;
- Show Story in time uses the shared orchestration path.

**Состояние remains local:**
- query;
- kind;
- activeKey;
- selectedStoryIds;
- bulk location;
- navigationHistory.

**Errors:**
- search document target no longer exists;
- projection unavailable.

Search UI handles presentation status; it does not repair canonical state.

**Связанные требования:** REQ-WC-003, 005, 006.

**Связанные Use Cases:** UC-002, 003, 008, 009.

**Single reason to exist:**  
Search and navigate project documents, not own Author Focus.

---

# COMP-WC-008 — CrossWorkspaceNavigator Handoff

**Название:** CrossWorkspaceNavigator

**Ответственность for this feature:**  
Keep its filtering/selection widget local and delegate explicit Show actions to the shared authoring navigation adapter.

**Вход:**
- local filters;
- selected Story node;
- navigation adapter;
- Split View presentation context if needed by UI.

**Выход:**
- explicit Story→STORY / Story→WORLD-TIME navigation intent;
- existing Preview-from-here intent unchanged.

**Используемые зависимости:**
- existing Story filter/context helpers;
- COMP-WC-004 navigation adapter.

**Предоставляемые возможности:**
- Show in Story;
- Show in time;
- consistent Story focus transition on explicit open.

**Состояние remains local:**
- storyNodeId dropdown;
- locationFilterId;
- characterFilterId.

Changing these selects does not change global Author Focus.

**Errors:**
- Story visual unavailable;
- Story has no exact authored time.

Buttons may remain disabled when projection is known unavailable.

**Связанные требования:** REQ-WC-003, 005, 006, 007.

**Связанные Use Cases:** UC-001, 005, 007.

**Single reason to exist:**  
Offer filtered Story↔WORLD/TIME navigation choices.

---

# COMP-WC-009 — WorldTimeWorkspace Story Handoff

**Название:** WorldTimeWorkspace

**Ответственность for this feature:**  
Render WORLD/TIME and delegate explicit Story-marker opens to the shared navigation adapter.

**Вход:**
- Story marker click;
- navigation adapter.

**Выход:**
- explicit `open Story in STORY` intent.

**Используемые зависимости:**
- existing WORLD/TIME data/indexing;
- COMP-WC-004 navigation adapter.

**Предоставляемые возможности:**
- marker open establishes same Story canonical focus;
- no duplicate Story viewport math in WORLD/TIME.

**Состояние remains local/existing:**
- timeline pan;
- viewport size;
- direct navigator inputs/errors;
- world zoom behavior.

**Errors:**
- canonical Story deleted between render/click;
- Story visual unavailable in Story Canvas.

Focus may still become the canonical Story even when no Canvas visual exists, according to the shared plan semantics.

**Связанные требования:** REQ-WC-003, 004, 005, 006.

**Связанные Use Cases:** UC-001, 004, 007.

**Single reason to exist:**  
Remain the temporal/spatial authoring surface.

---

## 3. Components explicitly NOT created

### No WorkspaceContext mega-object

Rejected because it would combine:
- focus;
- viewport;
- search state;
- history;
- Split View;
- future AI context.

That is a God-state boundary.

### No FocusHistory component

No first-slice requirement.

### No CanvasFocusStore

Canvas-instance selection belongs locally to StoryWorkspace.

### No SearchFocusAdapter component

ProjectSearchPanel can call the shared navigation adapter directly; a separate wrapper would have no independent responsibility.

### No WorldTimeFocusStore

WORLD/TIME consumes/initiates navigation but does not own canonical focus.

---

## 4. Dependency graph

```text
AuthorFocusPolicy
        ↑
AuthoringSessionFocusProvider
        ↑
        │
AuthoringNavigationAdapter ← AuthoringNavigationPlanner
        ↑                         ↑
        │                         ├─ Project Search navigation target
NarrativeWorkspace                ├─ Story viewport helper
        │                         └─ WORLD/TIME target helper
        ├──────────┬──────────┬──────────┐
        ▼          ▼          ▼          ▼
 StoryWorkspace  Search   CrossNav   WorldTime
```

No leaf UI component depends on another leaf UI component.

---

## 5. Cohesion / coupling check

### COMP-WC-001
High cohesion, no state, low coupling.

### COMP-WC-002
High cohesion if it stores only current focus.  
**BLOCKER if** navigation history, viewport or entity copies enter this provider.

### COMP-WC-003
High cohesion if it only plans navigation.  
**BLOCKER if** it starts authoring Story data or rendering UI messages.

### COMP-WC-004
Acceptable UI/application coupling: its purpose is explicitly to bridge plan → existing commands/session focus.  
Must remain thin.

### NarrativeWorkspace
No new business responsibility; it only composes the session boundary.

### Leaf UI
Keep existing local widget state local. This prevents shared Focus from becoming generic global selection state.

---

## 6. Reuse decisions

### Reuse unchanged
- `projectSearchNavigationTarget()`;
- `storyCanvasViewportForNode()`;
- `worldTimeViewportForStoryNode()`;
- `workspacePanelsForMode()`;
- existing editor commands;
- existing Project Search index/backrefs;
- existing Split View composition.

### Replace duplicated orchestration
- ProjectSearch Story open logic;
- CrossWorkspaceNavigator show logic;
- WORLD/TIME openStoryNode viewport math;
- Story inspector Show in time path.

### Preserve local behavior
- Search Back history;
- Item inspection;
- Canvas drag/pan;
- filters/dropdowns;
- Preview-from-here;
- direct Day+HH:MM navigation.

---

## 7. Traceability

| Requirement | Use Cases | Components |
|---|---|---|
| REQ-WC-001 single focus | UC-001/002/003/004/007/008 | WC-001,002,005,006 |
| REQ-WC-002 Story selection → focus | UC-001/004 | WC-002,006 |
| REQ-WC-003 cross-surface handoff | UC-001/002/003/007/008 | WC-003,004,006,007,008,009 |
| REQ-WC-004 editor-only | UC-001/002/003/005/006/007/010 | WC-001,002,004 |
| REQ-WC-005 stale safe handling | UC-003B/005/006/009 | WC-001,002,003 |
| REQ-WC-006 reuse navigation owners | UC-001/002/003/005/008/009 | WC-003,004 |
| REQ-WC-007 no new workspace | UC-001/007 | WC-005,008,009 |

Every component traces to at least one requirement/use case.

---

## 8. New finding from Component Design

**FINDING-WC-C01 — local Canvas instance selection is required, but a shared projection hint is not.**

Current Story UI uses `canvasNodeId` to:
- visually mark the concrete selected node;
- remove a specific Character/Item visual reference.

Therefore the correct split is:

```text
Canonical Author Focus
        +
Story-local selectedCanvasNodeId
```

not:

```text
Author Focus containing canvasNodeId
```

This closes the Stage 2/3 open question about an optional shared projection hint for the first slice.

**Decision:** no shared projection hint in first implementation.

---

## 9. Gate Review — Component Design → Contracts / Interfaces

✅ Every approved architecture block has a component responsibility.

✅ Every component has one clear reason to exist.

✅ No new global state or God component.

✅ Leaf UI components do not import one another.

✅ Canonical focus and Canvas instance selection are cleanly separated.

✅ Search active document and Author Focus remain separate.

✅ Local Item inspection can remain intact without extending focus types.

✅ Existing navigation helpers/commands have explicit reuse owners.

✅ Duplicated orchestration has one target component instead of four patches.

### NEEDS REVIEW

⚠ Exact sequencing when a navigation plan can establish Focus but cannot project visually must be specified in Stage 6 contracts.

⚠ Exact behavior of Search Back with Author Focus remains intentionally unchanged in first slice; contracts must avoid accidentally promising focus restoration.

### Decision

**✅ PASS to Stage 6 — Contracts / Interfaces.**

No BLOCKER.

Do not implement before the component interaction contracts are explicit.
