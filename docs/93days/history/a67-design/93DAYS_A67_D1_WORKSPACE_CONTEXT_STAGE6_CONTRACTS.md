# 93 Days — A67-D1 Workspace Context · Stage 6 Contracts / Interfaces

Status: **STAGE 6 COMPLETE — PASS to Dynamic Flow / Data Flow**
Base: `93-days-editor@ba0285295b3727c0518349344560d1577c971172`
Depends on Stage 0–5 Workspace Context documents.
Date: **2026-09-30**
Production code: **none**

## 1. Purpose

Define explicit contracts between the Stage 5 components.

For each connection this document specifies:
- why A calls B;
- input data;
- required fields;
- result;
- errors/statuses;
- sync/async;
- idempotency;
- retry/repeat behavior;
- who handles failure.

No implementation is approved by this document.

---

# CONTRACT-WC-001 — Author Focus value

Conceptual contract:

```ts
type AuthorFocus =
	| {type: 'story-node'; id: string}
	| {type: 'character'; id: string};
```

Required fields:
- `type`;
- stable canonical `id`.

Forbidden fields:
- display name/title;
- `canvasNodeId`;
- viewport;
- workspace;
- runtime state;
- entity snapshot/copy.

Semantics:
- value equality = same `type` + same `id`;
- finite union, not generic `type: string`;
- rename does not change identity.

---

# CONTRACT-WC-002 — AuthorFocusPolicy

## A → B

`AuthoringSessionFocusProvider → AuthorFocusPolicy`

### Why

Validate a requested/current focus against canonical project data.

### Conceptual interface

```ts
interface AuthorFocusPolicy {
	validate(
		project: NarrativeProject,
		focus: AuthorFocus | undefined
	): AuthorFocus | undefined;

	equals(
		left: AuthorFocus | undefined,
		right: AuthorFocus | undefined
	): boolean;
}
```

### Input

`project`
- current canonical Narrative Project.

`focus`
- none or first-slice Story/Character focus.

### Output

- same valid focus value;
- `undefined` if missing/stale.

### Errors

Unknown canonical id is a normal invalid result, not an exception.

Invalid runtime/infrastructure state is outside this contract.

### Sync/async

**Synchronous.**

Only in-memory project lookup is required.

### Idempotency

`validate(project, validate(project, focus))` returns the same result.

### Repeated calls

Allowed and expected after project mutations.

### If unavailable

There is no external dependency. If the policy cannot be called because the module is broken, the editor feature is defective; no fallback should guess entity identity.

---

# CONTRACT-WC-003 — Authoring Session Focus API

## UI consumer → session provider

### Why

Read or explicitly change the active canonical Author Focus.

### Conceptual interface

```ts
interface AuthoringSessionFocusValue {
	focus?: AuthorFocus;

	setFocus(next: AuthorFocus): void;
	clearFocus(): void;
}
```

Potential internal helper:

```ts
setFocusIfValid(next: AuthorFocus): FocusSetResult
```

Exact public shape may be refined in Detailed Design.

### Required behavior

`setFocus(next)`:
1. validate against current canonical project;
2. if valid, make it current;
3. if same as current, no semantic change;
4. if invalid, do not create stale state.

`clearFocus()`:
- current focus becomes none.

### Result / status

Recommended explicit result where caller needs feedback:

```ts
type FocusSetResult =
	| {status: 'focused'; focus: AuthorFocus}
	| {status: 'unchanged'; focus: AuthorFocus}
	| {status: 'invalid-target'};
```

A simple `void` setter is acceptable only if the caller does not need to distinguish these statuses.

### Errors

No thrown error for deleted/missing canonical target.

### Sync/async

**Synchronous React/session state API.**

### Idempotency

Setting the same valid focus repeatedly is idempotent.

### Retry

Allowed.

### Failure owner

UI/adaptor may display context if needed; provider only enforces valid state.

### Canonical project mutation

When project changes:
- current focus is revalidated;
- stale focus clears;
- no authored command is dispatched.

---

# CONTRACT-WC-004 — Navigation Intent

All cross-surface navigation enters the planner through a finite intent union.

Conceptual contract:

```ts
type AuthoringNavigationIntent =
	| {
			type: 'open-story-in-story';
			storyNodeId: string;
	  }
	| {
			type: 'open-story-in-world-time';
			storyNodeId: string;
	  }
	| {
			type: 'open-character-in-story';
			characterId: string;
	  }
	| {
			type: 'open-search-document';
			document: ProjectSearchDocument;
	  };
```

Do not add arbitrary:
`{type: string; payload: unknown}`.

### Why

Finite intents make supported behavior explicit and testable.

### Caller ownership

- StoryWorkspace;
- ProjectSearchPanel;
- CrossWorkspaceNavigator;
- WorldTimeWorkspace.

---

# CONTRACT-WC-005 — Navigation Plan

`AuthoringNavigationPlanner` returns data, never executes commands.

Conceptual contract:

```ts
interface AuthoringNavigationPlan {
	focusTransition?: AuthorFocus;
	commands: EditorNavigationCommand[];
	projection: NavigationProjectionStatus;
}
```

Where:

```ts
type EditorNavigationCommand =
	| Extract<EditorAuthoringCommand, {type: 'editor/selectWorkspace'}>
	| Extract<EditorAuthoringCommand, {type: 'editor/setStoryViewport'}>
	| Extract<EditorAuthoringCommand, {type: 'editor/setWorldTimeViewport'}>;

type NavigationProjectionStatus =
	| {status: 'projected'}
	| {status: 'canonical-only'; reason: 'no-story-visual'}
	| {status: 'unavailable'; reason: 'unscheduled-story'}
	| {status: 'unsupported-focus-kind'}
	| {status: 'missing-target'};
```

Exact type extraction syntax is illustrative; the semantic restriction is mandatory.

### Important invariant

The plan may contain a valid `focusTransition` even when visual projection is unavailable.

Example:

Character exists but has no Canvas representation:

```text
focusTransition = Character
commands = [selectWorkspace('story')] or [] depending current/split view
projection = canonical-only:no-story-visual
```

No Canvas node is fabricated.

---

# CONTRACT-WC-006 — AuthoringNavigationPlanner API

## Navigation adapter → planner

### Why

Build one deterministic cross-surface navigation plan.

### Conceptual interface

```ts
interface AuthoringNavigationPlanner {
	plan(
		project: NarrativeProject,
		intent: AuthoringNavigationIntent,
		options: {
			splitView: boolean;
		}
	): AuthoringNavigationPlan;
}
```

The planner reads current editor viewport/workspace from `project.editor`; no duplicate editor snapshot argument is required unless Detailed Design proves otherwise.

### Input requirements

`project`
- current project snapshot.

`intent`
- one supported explicit navigation action.

`splitView`
- required because workspace-switch commands differ when both panes are already visible.

### Output

One deterministic plan.

### Errors/status

Normal domain/navigation failures must be represented in `projection`, not thrown:
- missing target;
- no Canvas visual;
- unscheduled Story;
- unsupported focus kind.

Programmer-contract violations may still throw in implementation, but user/project data absence must not.

### Sync/async

**Synchronous.**

No I/O required.

### Idempotency

For the same project + intent + splitView, returned plan is deterministic.

Applying the same plan repeatedly may re-center a viewport, but must not mutate authored/runtime state.

### Retry

Allowed.

### Failure owner

Navigation adapter returns result to UI; UI decides whether to show a message or disable action.

---

# CONTRACT-WC-007 — Search document conversion

## Planner → existing Project Search application service

### Why

Reuse current search destination semantics.

### Input

`ProjectSearchDocument` + current project.

### Output

Existing `ProjectSearchNavigationTarget`.

### Focus conversion rule

Only:
- `story-node`;
- `character`

may directly become first-slice Author Focus.

Other search kinds can still navigate through existing back-reference/target rules, but they do not become fake Author Focus merely because the destination happens to be STORY.

Example:
- Move search result may navigate to its owning Story node.
- Whether that navigation establishes owning Story focus must be explicit in planner policy, not inferred by UI.

### Stage 6 decision

For first slice:

**If existing `projectSearchNavigationTarget()` resolves an unsupported document to an owning Story node, explicit Open may focus that resolved Story node.**

Rationale:
- the author is intentionally opening the actionable destination;
- destination identity is explicit in the returned target;
- this preserves current Search behavior while coordinating Focus.

But the original unsupported document remains `activeKey` in Search.

Thus:

`Search Active Document != Author Focus`.

---

# CONTRACT-WC-008 — AuthoringNavigationAdapter API

## Leaf UI → adapter

### Why

Apply the planner output through the existing project editor command channel and session Focus API.

### Conceptual interface

```ts
interface AuthoringNavigationActions {
	navigate(intent: AuthoringNavigationIntent): AuthoringNavigationResult;
}
```

Result:

```ts
interface AuthoringNavigationResult {
	focus?: AuthorFocus;
	projection: NavigationProjectionStatus;
}
```

### Apply order

Mandatory sequencing:

1. take current project snapshot;
2. create deterministic plan;
3. validate/apply `focusTransition`;
4. execute planned existing `editor/*` commands in declared order;
5. return projection status.

### Why Focus before commands?

Because canonical focus does not depend on successful visual projection.

A workspace transition/unmount must not destroy the intent before session focus is established.

### Race/stale protection

If target no longer validates at apply time:
- do not set focus;
- do not fabricate target;
- return `missing-target`;
- commands requiring that target must not be applied.

### Command execution

Use existing:
`useNarrativeProject().execute(command)`.

No new command bus.

### Sync/async

Conceptually **synchronous request API** over React/store state updates.

React rendering itself is asynchronous, but no Promise/I/O contract is required.

### Idempotency

Repeated same navigation is safe:
- focus may be unchanged;
- same viewport command may be issued;
- authored/runtime state does not change.

### Retry

Allowed.

### Failure owner

Calling presentation owns user-facing wording.

The adapter returns typed status only.

---

# CONTRACT-WC-009 — StoryWorkspace selection contract

## Story Canvas → Session Focus

### Story node click

Input:
- canonical Story node id;
- clicked `canvasNodeId`.

Actions:
1. local `selectedCanvasNodeId = clicked canvas id`;
2. clear local Item inspection;
3. request `AuthorFocus{story-node,id}`.

### Character click

Input:
- canonical Character id;
- clicked `canvasNodeId`.

Actions:
1. local `selectedCanvasNodeId = clicked canvas id`;
2. clear local Item inspection;
3. request `AuthorFocus{character,id}`.

### Item click

Input:
- item id;
- `canvasNodeId`.

Actions:
- set local Item inspection;
- set local concrete Canvas selection;
- **do not change Author Focus**.

### Empty Canvas click

Stage 6 decision:

- may clear local visual/Item selection;
- **does not automatically clear Author Focus** in first slice.

Rationale:
Focus represents current authoring subject across surfaces, not hover/visual selection.

If future UX wants "click empty = clear canonical focus", that needs a separate requirement.

---

# CONTRACT-WC-010 — StoryWorkspace projection contract

## Session Focus → StoryWorkspace

If focus = Story:
- resolve canonical Story node;
- use it for inspector/highlight;
- if a concrete local Canvas node matches, mark that visual selected;
- if no local selected copy exists, visual highlighting may apply to all/first matching representation as decided in Detailed Design, but instance-specific actions require concrete local selection.

If focus = Character:
- resolve canonical Character;
- inspector may show canonical Character even without Canvas representation;
- remove-this-reference action only enabled when local `selectedCanvasNodeId` is a concrete Character visual.

If no focus:
- canonical Story/Character inspector is empty unless local Item inspection owns the inspector.

If local Item inspection exists:
- Item inspector takes local presentation precedence;
- shared Author Focus remains unchanged.

---

# CONTRACT-WC-011 — ProjectSearchPanel → Navigation Adapter

### Open result

Input:
- full `ProjectSearchDocument`.

Before navigate:
- push existing local navigation snapshot.

Then:
- call `navigate({type:'open-search-document', document})`.

After:
- keep/set `activeKey = document.key` regardless of whether first-slice Author Focus exists, as long as current Search semantics consider it opened.

### Show Story in time

Input:
- Story search document.

Call:
`open-story-in-world-time`.

### Search Back

**First-slice explicit contract:**

Search Back restores only its existing:
- workspace;
- Story viewport;
- WORLD/TIME viewport.

It does **not** restore prior Author Focus.

No hidden focus mutation is allowed during Back.

This is a known first-slice limitation, not a missing implementation.

---

# CONTRACT-WC-012 — CrossWorkspaceNavigator → Navigation Adapter

Dropdown/filter changes:
- no Author Focus change.

`Show in Story`:
- explicit `open-story-in-story` intent.

`Show in time`:
- explicit `open-story-in-world-time` intent.

If Story has no temporal target:
- action should remain disabled where already knowable;
- if invoked against stale data, planner returns unavailable/missing-target;
- focus may remain/set to the Story if canonical target is valid, while no temporal command is applied.

Preview-from-here remains separate and does not use Author Focus implicitly.

---

# CONTRACT-WC-013 — WorldTimeWorkspace → Navigation Adapter

Story marker click:

```ts
navigate({
	type: 'open-story-in-story',
	storyNodeId
})
```

WORLD/TIME must not:
- calculate Story viewport itself;
- access Story local selection state;
- fabricate Canvas nodes.

If Story canonical entity exists but has no Canvas visual:
- focus becomes Story;
- workspace may switch to STORY when not Split View;
- projection status = canonical-only/no-story-visual.

---

# CONTRACT-WC-014 — Split View semantics

Input to planner:
`splitView: true`.

Rule:
- commands that exist only to switch between STORY and WORLD/TIME may be omitted because both panes are already visible;
- viewport commands remain valid;
- Author Focus transition still applies exactly once;
- both panes read the same session focus.

No per-pane focus.

---

# CONTRACT-WC-015 — stale canonical entity

## Project mutation → Session Focus Provider

When current project changes:

1. validate current focus;
2. if entity still exists → keep;
3. if missing → clear;
4. never issue editor navigation;
5. never select another entity;
6. never add an Undo entry.

Undo restoring the entity:
- does not auto-restore prior focus.

---

# CONTRACT-WC-016 — unavailable projection semantics

This closes the major Stage 5 open question.

## Case A — canonical target missing

Result:
`missing-target`.

- no Focus transition;
- no target-dependent editor commands.

## Case B — canonical target valid, Canvas visual missing

Result:
`canonical-only / no-story-visual`.

- Focus transition **does occur**;
- STORY workspace switch may occur when requested and not Split View;
- no Story viewport command;
- no Canvas node creation.

## Case C — Story canonical target valid, authored time missing

Result:
`unavailable / unscheduled-story`.

For explicit "Show in time":
- Focus transition **does occur**;
- no WORLD/TIME viewport command;
- no invented time;
- workspace should **not switch to WORLD/TIME** because there is no representable destination.

This preserves current author context and avoids landing the author in an unrelated timeline position.

## Case D — unsupported Search focus kind

Existing search navigation may still produce another actionable target.

- if resolved target is Story/Character → that resolved target may become Focus;
- otherwise no Focus transition.

---

# CONTRACT-WC-017 — no mutation guarantees

For every Focus/navigation call, unless the UI separately performs an authored edit:

Must remain unchanged:
- `project.updatedAt` due to focus itself;
- Story authored definitions;
- Simulation Playhead;
- Actual Presence;
- runtime knowledge;
- runtime relationships;
- runtime occurrences;
- authored Undo history due to focus itself.

Existing editor viewport/workspace commands may update persisted editor navigation state according to current architecture; Focus itself remains session-only.

---

## 2. Error ownership summary

| Error/status | Produced by | Handled by |
|---|---|---|
| invalid/stale Focus | FocusPolicy/Provider | Provider clears; UI optional indication |
| missing navigation target | Planner | Adapter/UI |
| no Story Canvas visual | Planner | UI may show canonical-only state |
| unscheduled Story for time | Planner | calling UI disables/shows message |
| unsupported focus kind | Planner | Search UI continues local semantics |
| React provider missing | session hook | programmer error; throw acceptable |
| project store unavailable | existing app boundary | outside this feature |

---

## 3. Sync / async summary

All first-slice contracts are synchronous and local.

No:
- network;
- database call;
- AI;
- background task;
- Promise requirement.

This is important for reproducibility and deterministic testing.

---

## 4. Idempotency summary

Idempotent/safe to repeat:
- validating same Focus;
- setting same Focus;
- opening same Story/Character;
- planning same navigation;
- applying same viewport target.

Not part of this feature:
- authored mutations from Story inspector remain governed by existing command semantics.

---

## 5. Dependency contract summary

```text
Story/Search/CrossNav/WorldTime
        ↓ explicit intent
AuthoringNavigationAdapter
        ↓ plan()
AuthoringNavigationPlanner
        ↓ pure existing helpers
Domain/Application reads

AuthoringNavigationAdapter
        ├─ setFocus()
        │      ↓
        │ AuthoringSessionFocusProvider
        │      ↓
        │ AuthorFocusPolicy
        │
        └─ execute(existing editor commands)
               ↓
        NarrativeProjectContext
```

There is no reverse dependency from Project store to Focus session state.

---

## 6. Traceability

| REQ | Main contracts |
|---|---|
| REQ-WC-001 | WC-001/002/003 |
| REQ-WC-002 | WC-003/009/010 |
| REQ-WC-003 | WC-004/005/006/008/011/012/013 |
| REQ-WC-004 | WC-003/008/015/017 |
| REQ-WC-005 | WC-002/003/005/015/016 |
| REQ-WC-006 | WC-005/006/007/008 |
| REQ-WC-007 | WC-006/014 |

---

## 7. Gate Review — Contracts → Dynamic Flow

✅ Every component-to-component relationship has an explicit purpose.

✅ Data shape is finite and typed.

✅ Normal missing-data cases are statuses, not exceptions.

✅ No async/I/O contract is introduced.

✅ Idempotency/retry behavior is defined.

✅ Error ownership is explicit.

✅ Canonical Focus may exist without visual projection.

✅ Unscheduled Story does not move WORLD/TIME or invent time.

✅ Search Back explicitly does not restore Focus in first slice.

✅ Empty Canvas click does not silently erase cross-workspace author context.

✅ No new command bus; existing editor command channel is reused.

### NEEDS REVIEW for Stage 7

⚠ Dynamic flow must verify that applying Focus before workspace commands does not produce transient UI contradictions during React renders.

⚠ Dynamic flow must verify Story deletion → stale-focus clearing → Undo sequence.

### Decision

**✅ PASS to Stage 7 — Dynamic Flow / Data Flow.**

No BLOCKER.

Do not implement before the main success/error flows are walked end-to-end.
