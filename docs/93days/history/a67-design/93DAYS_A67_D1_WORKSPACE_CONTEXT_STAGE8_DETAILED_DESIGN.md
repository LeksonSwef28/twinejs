# 93 Days — A67-D1 Workspace Context · Stage 8 Detailed Design

Status: **STAGE 8 COMPLETE — Gate to Implementation**
Base: `93-days-editor@ba0285295b3727c0518349344560d1577c971172`
Design branch before this document: `design/a67-d1-workspace-context-stage0@0e6dcbb3b1eed6b25054d17574898183ffcab71a`
Stage 7 exact-head Branch Check: **GREEN**
Depends on Stage 0–7 Workspace Context documents.
Change type: **detailed design only**
Production code in this stage: **none**

---

## 0. Goal / Definition of Done

Stage 8 converts the approved architecture and dynamic flows into an implementation-ready design.

Definition of Done:

1. exact module/file placement is fixed;
2. public TypeScript contracts are fixed closely enough for implementation;
3. Author Focus storage, validation and stale cleanup lifecycle are explicit;
4. StoryWorkspace canonical-vs-local projection is explicit;
5. deterministic behavior for multiple Canvas instances is explicit;
6. Search / CrossWorkspace / WORLD-TIME handoff changes are explicit;
7. test seams and concrete test files are defined;
8. no schema/runtime/compiler/Player change is required;
9. rollback is bounded;
10. no production implementation is included in this Stage.

---

# 1. Verified baseline facts

Verified against stable `ba0285295b3727c0518349344560d1577c971172`.

### FACT-D8-001 — project context already exposes the required store API

`NarrativeProjectContextValue` exposes:

- `project`;
- `execute(command)`;
- `undo()`;
- `redo()`;
- current authoring history capabilities.

No new command bus is required.

### FACT-D8-002 — editor navigation commands already exist

Existing command union already contains:

- `editor/selectWorkspace`;
- `editor/setStoryViewport`;
- `editor/setWorldTimeViewport`.

These commands already remain outside authored Undo history.

### FACT-D8-003 — existing pure navigation helpers exist

`src/domain/narrative/workspace-navigation.ts` already owns:

- `storyCanvasViewportForNode()`;
- `worldTimeViewportForStoryNode()`;
- Story absolute-minute semantics.

Detailed Design must reuse them instead of copying viewport math.

### FACT-D8-004 — Project Search already has a pure destination resolver

`src/application/narrative/project-search.ts` already owns:

- `ProjectSearchDocument`;
- `ProjectSearchNavigationTarget`;
- `projectSearchNavigationTarget()`.

This remains the Search destination source.

### FACT-D8-005 — current UI duplicates orchestration

Current duplicated command orchestration exists in:

- `StoryWorkspace.openSelectedStoryNodeInWorldTime()`;
- `ProjectSearchPanel`;
- `CrossWorkspaceNavigator`;
- `WorldTimeWorkspace.openStoryNode()`.

Implementation must replace these first-slice paths rather than add a second Focus write beside them.

### FACT-D8-006 — test stack supports the design

Repository already uses:

- Jest;
- React Testing Library;
- Testing Library hooks;
- jsdom.

No test-framework dependency is needed.

---

# 2. ADR-D8-001 — module placement

## Decision

Use four new production modules.

### Pure application semantics

```text
src/application/narrative/author-focus.ts
src/application/narrative/authoring-navigation.ts
```

### React/session integration

```text
src/components/narrative/workspace/authoring-session-focus.tsx
src/components/narrative/workspace/use-authoring-navigation.ts
```

## Why

`AuthorFocus` and navigation planning are deterministic authoring/application semantics and should not depend on React.

Session lifetime and store execution are React composition concerns and belong beside `NarrativeWorkspace`, not in the canonical project store.

## Rejected

- adding Focus to `NarrativeProject.editor`;
- adding Focus to `NarrativeProjectContext`;
- creating a global app store;
- adding a reducer command such as `editor/setAuthorFocus`;
- creating a generic event bus;
- storing Canvas instance identity in Focus.

---

# 3. Exact file impact

## New

```text
src/application/narrative/author-focus.ts
src/application/narrative/authoring-navigation.ts
src/application/narrative/__tests__/author-focus.test.ts
src/application/narrative/__tests__/authoring-navigation.test.ts

src/components/narrative/workspace/authoring-session-focus.tsx
src/components/narrative/workspace/use-authoring-navigation.ts
src/components/narrative/workspace/__tests__/authoring-session-focus.test.tsx
src/components/narrative/workspace/__tests__/workspace-context.integration.test.tsx
```

The workspace `__tests__` directory may be created if absent.

## Modified

```text
src/components/narrative/workspace/narrative-workspace.tsx
src/components/narrative/workspace/story-workspace.tsx
src/components/narrative/workspace/project-search-panel.tsx
src/components/narrative/workspace/cross-workspace-navigator.tsx
src/components/narrative/workspace/world-time-workspace.tsx
```

## Not modified

```text
src/domain/narrative/project.ts
src/domain/narrative/editor.ts
src/application/narrative/commands.ts
src/store/narrative-project/reducer.ts
src/store/narrative-project/editor-authoring.ts
src/store/narrative-project/narrative-project-context.tsx
persistence / migration modules
runtime / simulation
compiler / export
Player
```

If implementation proves one of these "not modified" files must change, stop and reopen impact analysis before expanding scope.

---

# 4. `author-focus.ts`

## Responsibility

Own the finite first-slice Focus value and pure canonical validation/matching helpers.

## Public contract

```ts
import {CanvasNodeInstance} from '../../domain/narrative/editor';
import {NarrativeCharacter} from '../../domain/narrative/entities';
import {NarrativeProject} from '../../domain/narrative/project';
import {StoryNodeDefinition} from '../../domain/narrative/story';

export type AuthorFocus =
	| {type: 'story-node'; id: string}
	| {type: 'character'; id: string};

export type ResolvedAuthorFocus =
	| {
			focus: Extract<AuthorFocus, {type: 'story-node'}>;
			storyNode: StoryNodeDefinition;
	  }
	| {
			focus: Extract<AuthorFocus, {type: 'character'}>;
			character: NarrativeCharacter;
	  };

export function resolveAuthorFocus(
	project: NarrativeProject,
	focus: AuthorFocus | undefined
): ResolvedAuthorFocus | undefined;

export function validateAuthorFocus(
	project: NarrativeProject,
	focus: AuthorFocus | undefined
): AuthorFocus | undefined;

export function authorFocusEquals(
	left: AuthorFocus | undefined,
	right: AuthorFocus | undefined
): boolean;

export function canvasNodeRepresentsAuthorFocus(
	node: CanvasNodeInstance,
	focus: AuthorFocus | undefined
): boolean;
```

## Behavior

### `resolveAuthorFocus`

- Story Focus resolves only through `project.storyNodes`;
- Character Focus resolves only through `project.characters`;
- missing id → `undefined`;
- never falls back to a different entity.

### `validateAuthorFocus`

Equivalent to:

```text
resolveAuthorFocus(project, focus)?.focus
```

No mutation.

### `canvasNodeRepresentsAuthorFocus`

Match only:

```text
node.entityRef.type == focus.type
AND
node.entityRef.id == focus.id
```

with the existing naming bridge:

```text
AuthorFocus 'story-node' ↔ Canvas entityRef 'storyNode'
AuthorFocus 'character'  ↔ Canvas entityRef 'character'
```

It must never match Item.

---

# 5. `authoring-navigation.ts`

## Responsibility

Purely convert one explicit navigation intent into one deterministic plan.

No React.
No command execution.
No session state.

## Public types

```ts
import {NarrativeProjectCommand} from './commands';
import {ProjectSearchDocument} from './project-search';

export type AuthoringNavigationIntent =
	| {type: 'open-story-in-story'; storyNodeId: string}
	| {type: 'open-story-in-world-time'; storyNodeId: string}
	| {type: 'open-character-in-story'; characterId: string}
	| {type: 'open-search-document'; document: ProjectSearchDocument};

export type AuthoringNavigationCommand = Extract<
	NarrativeProjectCommand,
	| {type: 'editor/selectWorkspace'}
	| {type: 'editor/setStoryViewport'}
	| {type: 'editor/setWorldTimeViewport'}
>;

export type NavigationProjectionStatus =
	| {status: 'projected'}
	| {status: 'canonical-only'; reason: 'no-story-visual'}
	| {status: 'unavailable'; reason: 'unscheduled-story'}
	| {status: 'unsupported-focus-kind'}
	| {status: 'missing-target'};

export interface AuthoringNavigationPlan {
	focusTransition?: AuthorFocus;
	commands: AuthoringNavigationCommand[];
	projection: NavigationProjectionStatus;
}

export interface AuthoringNavigationOptions {
	splitView: boolean;
}

export function planAuthoringNavigation(
	project: NarrativeProject,
	intent: AuthoringNavigationIntent,
	options: AuthoringNavigationOptions
): AuthoringNavigationPlan;
```

Using `NarrativeProjectCommand` here deliberately avoids an application → store dependency.

---

# 6. Planner detailed rules

## Shared ordering

When a destination has a viewport:

```text
viewport command
→ workspace command
```

Workspace command is omitted when:

- `splitView === true`; or
- destination workspace is already current.

Focus transition is plan metadata and is applied by the adapter before commands.

---

## 6.1 `open-story-in-story`

### Missing canonical Story

```text
focusTransition = none
commands = []
projection = missing-target
```

### Story exists + visual exists

Choose one navigation visual deterministically:

> first matching Story Canvas node in existing `storyCanvas.nodes` order.

This choice is for viewport centering only. It does not enter Focus.

Commands:

1. `editor/setStoryViewport(storyCanvasViewportForNode(...))`;
2. optional `editor/selectWorkspace('story')`.

Projection:

`projected`.

### Story exists + no visual

```text
focusTransition = Story
commands = [optional selectWorkspace('story')]
projection = canonical-only:no-story-visual
```

No Canvas node creation.

---

## 6.2 `open-character-in-story`

### Missing Character

`missing-target`.

### Character + one/many visuals

For navigation centering:

> first matching Character Canvas node in existing Canvas order.

For canonical visual projection later:

> all matching Character Canvas nodes represent the same Focus.

Commands:

- Story viewport to first visual;
- optional Story workspace switch.

Focus:

`Character(id)`.

### Character + zero visuals

- Character Focus is still valid;
- optional Story workspace switch;
- no Story viewport command;
- `canonical-only:no-story-visual`.

---

## 6.3 `open-story-in-world-time`

### Story missing

`missing-target`.

### Story exists but has no complete authored day+minute

```text
focusTransition = Story
commands = []
projection = unavailable:unscheduled-story
```

No WORLD/TIME switch.

No invented minute.

### Story has authored time

Reuse:

`worldTimeViewportForStoryNode()`.

Commands:

1. `editor/setWorldTimeViewport`;
2. optional `editor/selectWorkspace('world-time')`.

Projection:

`projected`.

---

## 6.4 `open-search-document`

First call existing:

`projectSearchNavigationTarget(project, document)`.

### Focus derivation — conservative first-slice rule

Direct focus:

- Search `story-node` → Story Focus if canonical Story exists;
- Search `character` → Character Focus if canonical Character exists.

Resolved owning Story:

- unsupported Search document whose navigation target has a valid `storyNodeId`
  may Focus that Story.

Do **not** infer Character Focus merely because an unsupported target carries a
`characterId`.

Why:

`routine-rule` and `schedule-exception` use Character ids as navigation context.
That does not mean the author explicitly opened the Character as the canonical
subject.

This keeps:

`Search Active Document != Author Focus`.

### Workspace/viewport preservation

For unsupported documents, preserve existing Search destination behavior:

- Story target with visual → Story viewport;
- WORLD/TIME target with absolute minute → WORLD/TIME viewport;
- destination workspace may still switch even with no first-slice Focus;
- no authored/runtime mutation.

### Missing direct Story/Character Search result

If the document itself claims `story-node` / `character` but that canonical
entity is missing:

- `missing-target`;
- no commands;
- no Focus.

### Unsupported document with no supported Focus

Commands may still navigate using existing target.

Projection status:

`unsupported-focus-kind`.

This status means "no first-slice canonical Focus projection", not "Search failed".

---

# 7. ADR-D8-002 — multiple Canvas instances

## Decision

`AuthorFocus` never selects a Canvas instance.

When Focus maps to multiple Canvas nodes:

- every matching node may receive canonical Focus styling;
- only `selectedCanvasNodeId` receives concrete instance-selection styling;
- viewport navigation chooses the first matching node in stable Canvas order;
- instance-specific actions require explicit local selection.

## Why

This preserves:

`Canvas Instance != Canonical Entity`.

It also avoids arbitrary instance identity leaking into shared session state.

---

# 8. `authoring-session-focus.tsx`

## Public API

```ts
export type FocusSetResult =
	| {status: 'focused'; focus: AuthorFocus}
	| {status: 'invalid-target'};

export interface AuthoringSessionFocusValue {
	focus?: AuthorFocus;
	setFocus(next: AuthorFocus): FocusSetResult;
	clearFocus(): void;
}

export const AuthoringSessionFocusProvider: React.FC;
export function useAuthoringSessionFocus(): AuthoringSessionFocusValue;
```

Detailed Design intentionally removes the Stage 6 optional
`focused vs unchanged` distinction.

The caller only needs:

- valid and stored;
- invalid and rejected.

Setting the same valid Focus remains idempotent and may return `focused`.

No extra state machine is justified.

---

# 9. Provider lifecycle

## Internal state

```ts
const [storedFocus, setStoredFocus] = React.useState<AuthorFocus>();
```

Only this state.

## Effective Focus

Every render computes:

```ts
const focus = validateAuthorFocus(project, storedFocus);
```

Consumers receive `focus`, never raw `storedFocus`.

This is the read-through stale protection established by Stage 7.

## Permanent stale cleanup

After a committed render in which:

```text
storedFocus exists
AND
validate(project, storedFocus) == undefined
```

the provider clears raw storage.

Conceptual implementation:

```ts
React.useEffect(() => {
	if (storedFocus && !focus) {
		setStoredFocus(undefined);
	}
}, [storedFocus, focus]);
```

This effect is cleanup only.

Correctness does not depend on the effect running before render because stale
Focus is already hidden by read-through validation.

The effect exists to prevent later Undo/entity restoration from resurrecting
the old Focus.

## `setFocus`

1. validate against current project;
2. invalid → return `invalid-target`, do not mutate;
3. valid → store validated identity;
4. return `focused`.

## `clearFocus`

Set raw Focus to undefined.

No project command.

No Undo entry.

---

# 10. ADR-D8-003 — project replacement lifetime

A session Focus must not survive replacement with a different Narrative Project
even if the new project accidentally reuses the same entity id.

## Decision

Key the session provider by canonical `project.projectId` at the
`NarrativeWorkspace` composition boundary.

Conceptually:

```tsx
export const NarrativeWorkspace: React.FC = () => {
	const {project} = useNarrativeProject();

	return (
		<AuthoringSessionFocusProvider key={project.projectId}>
			<NarrativeWorkspaceSession />
		</AuthoringSessionFocusProvider>
	);
};
```

This resets session Focus on explicit project replacement without polluting the
`AuthorFocus` value with project identity.

---

# 11. `use-authoring-navigation.ts`

## Responsibility

Thin adapter from pure plan to:

- session Focus;
- existing `execute(editor/*)`.

## Public API

```ts
export interface AuthoringNavigationResult {
	focus?: AuthorFocus;
	projection: NavigationProjectionStatus;
}

export interface AuthoringNavigationActions {
	navigate(intent: AuthoringNavigationIntent): AuthoringNavigationResult;
}

export function useAuthoringNavigation(options: {
	splitView: boolean;
}): AuthoringNavigationActions;
```

## Adapter algorithm

```text
plan = planAuthoringNavigation(current project, intent, splitView)

if plan.projection == missing-target:
    return result immediately

if plan.focusTransition exists:
    focusResult = setFocus(plan.focusTransition)

    if focusResult == invalid-target:
        return missing-target
        DO NOT execute target-dependent commands

for command in plan.commands:
    execute(command)

return {
    focus: successfully applied focusTransition if any,
    projection: plan.projection
}
```

## Why revalidate in provider after planning

Planner and provider are separate contracts.

Even though first-slice calls are synchronous, the adapter must not rely on
"planner said valid once" as authority for writing session state.

No Promise.
No background operation.

---

# 12. NarrativeWorkspace composition

The current large component is split mechanically, not architecturally.

## Outer

`NarrativeWorkspace`

Responsibilities added:

- read `project.projectId`;
- mount keyed `AuthoringSessionFocusProvider`.

## Inner

Suggested private component:

`NarrativeWorkspaceSession`.

It retains the existing NarrativeWorkspace implementation.

Inside it:

```ts
const navigation = useAuthoringNavigation({splitView});
```

Pass exactly one shared function:

`navigation.navigate`

to:

- `StoryWorkspace`;
- `ProjectSearchPanel`;
- `CrossWorkspaceNavigator`;
- `WorldTimeWorkspace`.

No Navigation Context is required.

This avoids another provider and keeps data flow explicit.

---

# 13. StoryWorkspace detailed state redesign

## Remove

```ts
SelectedStoryEntity =
  Character(id, canvasNodeId)
  | StoryNode(id, canvasNodeId)
  | Item(id, canvasNodeId)
```

as the canonical selection owner.

## Add local-only state

```ts
const [selectedCanvasNodeId, setSelectedCanvasNodeId] =
	React.useState<string>();

const [selectedLocalItemId, setSelectedLocalItemId] =
	React.useState<string>();
```

## Read shared canonical state

```ts
const {focus, setFocus} = useAuthoringSessionFocus();
```

## Canonical inspector source

`StoryNode` and `Character` inspector identity comes **only** from
`resolveAuthorFocus(project, focus)`.

Never from `selectedCanvasNodeId`.

This closes the Stage 7 P1 "double source of selection truth" risk.

---

# 14. StoryWorkspace click rules

## Story Canvas node click

1. `selectedLocalItemId = undefined`;
2. `selectedCanvasNodeId = clicked visual id`;
3. `setFocus({type:'story-node', id})`.

## Character Canvas node click

1. clear local Item inspection;
2. set concrete visual id;
3. set Character Focus.

## Item click

1. `selectedLocalItemId = item id`;
2. `selectedCanvasNodeId = clicked visual id`;
3. shared Focus unchanged.

## Empty Canvas behavior

Do not add a new Focus-clearing rule in this slice.

If existing interaction clears visual selection:

- local visual selection may clear;
- local Item inspection may clear;
- shared Focus remains.

---

# 15. StoryWorkspace reconciliation on external Focus change

This is required so a stale local Canvas instance cannot imply selection of a
different canonical entity.

When shared Focus changes:

### Local Item

If a new non-empty canonical Focus arrives from another surface:

- clear `selectedLocalItemId`.

Why:

an explicit Search/WORLD-TIME/Story navigation must be able to reveal its
canonical target instead of remaining masked by an old Item inspector.

Item click itself does not change Focus, so normal Item inspection remains stable.

### `selectedCanvasNodeId`

Keep it only when:

- the Canvas node still exists; and
- it represents the current shared Focus; or
- it represents the currently inspected local Item.

Otherwise clear it.

This reconciliation is local presentation hygiene, not Focus ownership.

---

# 16. StoryWorkspace inspector priority

Exactly:

```text
if selectedLocalItemId resolves:
    Item inspector
else if resolved Focus is Story:
    Story inspector
else if resolved Focus is Character:
    Character inspector
else:
    empty inspector
```

Item presentation precedence remains local and temporary.

Canonical Focus still remains available to sibling surfaces.

---

# 17. StoryWorkspace visual styling semantics

For each Canvas node derive two independent booleans:

```text
isConcreteSelected = node.id == selectedCanvasNodeId

isCanonicalFocused =
    canvasNodeRepresentsAuthorFocus(node, focus)
```

They are not synonyms.

Implementation may:

- preserve existing `is-selected` for concrete selection;
- add `is-focused` for canonical Focus.

If visual regression cost is high, first implementation may reuse existing
appearance, but the data booleans must remain distinct.

Connected Story dimming/highlighting uses shared Story Focus id, not local
Canvas id.

---

# 18. Instance-specific actions

## Character "remove from board"

Enabled only when:

- Focus resolves to Character C;
- `selectedCanvasNodeId` resolves to a Character Canvas node for C.

If Character Focus came from Search and has no explicitly selected visual:

- Character inspector still renders;
- remove-reference action is unavailable.

## Story delete

Story delete operates on canonical focused Story id.

After command:

- clear local `selectedCanvasNodeId`;
- do **not** manually choose another Focus;
- provider stale validation clears deleted Focus.

## Item remove from board

Uses local Item id + concrete `selectedCanvasNodeId`.

Shared Focus unchanged.

---

# 19. Story → WORLD/TIME action

Delete local viewport/workspace math from
`openSelectedStoryNodeInWorldTime()`.

Replace with:

```ts
navigate({
	type: 'open-story-in-world-time',
	storyNodeId: inspectedStoryNode.id
});
```

Existing UI can continue hiding/disabling the action when authored day/minute
is known to be absent.

Planner remains authoritative against stale data.

---

# 20. ProjectSearchPanel integration

## Props

Add:

```ts
navigate: AuthoringNavigationActions['navigate'];
```

## Open result

Keep:

- query state;
- filters;
- `activeKey`;
- navigationHistory;
- Back behavior.

Replace duplicated destination commands with:

```text
pushHistory()
→ navigate(open-search-document(document))
→ setActiveKey(document.key)
```

## Show Story in time

Use:

`open-story-in-world-time`.

Keep known-unscheduled UI guard/disabled state.

## Back

Intentionally keep the existing direct restoration of:

- Story viewport;
- WORLD/TIME viewport;
- workspace.

Back must **not call shared navigate()** because the first-slice contract says
Back does not restore or mutate Focus.

This is deliberate, not remaining duplication debt.

---

# 21. CrossWorkspaceNavigator integration

## Props

Remove `splitView` from this component if it is no longer used elsewhere.

Add:

```ts
navigate: AuthoringNavigationActions['navigate'];
```

## Show in Story

Call:

`open-story-in-story(selectedStoryId)`.

Important behavior change:

The button must not require a Canvas visual merely to be enabled.

If canonical Story exists but has no visual:

- navigation can still establish Story Focus;
- planner returns canonical-only;
- STORY may open.

Thus enable based on a selected canonical Story, not `visual`.

## Show in time

Keep disabled where `worldTarget` is already known absent.

When invoked:

`open-story-in-world-time(selectedStoryId)`.

## Preview from here

Untouched.

---

# 22. WorldTimeWorkspace integration

## Props

Add shared `navigate`.

## Remove local function

Remove the current `openStoryNode()` command orchestration.

Both Story marker kinds call:

```ts
navigate({
	type: 'open-story-in-story',
	storyNodeId: node.id
});
```

WORLD/TIME no longer:

- scans Story Canvas to center it;
- computes Story viewport;
- switches Story workspace itself.

---

# 23. Minimal user-facing error handling

No global toast framework is introduced.

For first slice:

- known impossible actions remain disabled where already knowable;
- stale-race `missing-target` may safely no-op;
- canonical-only state is represented by the inspector even without visual;
- typed results remain available for later inline messaging.

Reason:

error wording is P2 presentation work; semantic correctness is P1.

---

# 24. No schema / persistence change proof

Author Focus is not added to:

- `NarrativeProject`;
- `NarrativeEditorState`;
- repository projection;
- migration;
- localStorage payload.

Therefore:

- no schema version bump;
- no migration;
- no restart persistence promise;
- old projects load identically.

---

# 25. No runtime mutation proof

Neither new pure module imports simulation mutation services.

Adapter executes only the three permitted editor navigation command types.

Provider executes no project command.

Therefore Focus/navigation cannot directly mutate:

- Simulation Playhead;
- Actual Presence;
- runtime knowledge;
- relationships;
- occurrences;
- item runtime placement;
- body/injury state.

Tests still prove this boundary.

---

# 26. Test design

## 26.1 `author-focus.test.ts`

Required:

1. validates existing Story;
2. validates existing Character;
3. rejects missing Story;
4. rejects missing Character;
5. equality by type+id;
6. Story rename does not change Focus;
7. Canvas matcher distinguishes Story/Character/Item;
8. Canvas matcher supports multiple copies without choosing one.

---

## 26.2 `authoring-navigation.test.ts`

Required:

1. Story→Story with visual;
2. Story→Story no visual;
3. missing Story;
4. Character→Story with visual;
5. Character→Story without visual;
6. multiple Character visuals choose first stable Canvas node for viewport;
7. Story→WORLD/TIME success;
8. unscheduled Story keeps no WORLD/TIME commands;
9. Split View omits workspace switch;
10. same-workspace navigation omits redundant workspace switch;
11. direct Story Search Focus;
12. direct Character Search Focus;
13. Move Search resolving owning Story Focuses Story;
14. Routine/Schedule Search character context does not implicitly Focus Character;
15. unsupported Search can still preserve existing workspace navigation;
16. all command arrays contain only permitted `editor/*` navigation types.

---

## 26.3 `authoring-session-focus.test.tsx`

Use React Testing Library / hooks.

Required:

1. set valid Story Focus;
2. set valid Character Focus;
3. invalid set rejected;
4. repeated same Focus is safe;
5. committed Story deletion exposes `focus === undefined` immediately;
6. stale stored Focus cleanup completes;
7. Undo/entity restoration after cleanup does not resurrect Focus;
8. Character deletion equivalent;
9. `clearFocus()`;
10. projectId-keyed provider remount clears Focus even if ids collide.

Critical test sequencing for delete→Undo:

```text
render focused A
→ commit project without A
→ assert exposed Focus none
→ flush effects
→ commit restored project with A
→ assert Focus still none
```

Do not batch deletion and restoration into one unobservable render.

---

## 26.4 `workspace-context.integration.test.tsx`

Required journeys:

1. Story Canvas click → Focus Story → inspector Story;
2. Story → WORLD/TIME → Story preserves Focus;
3. Simulation Playhead unchanged through navigation;
4. Search Character without Canvas → canonical Character inspector, no node fabricated;
5. Item click → Item inspector while shared Focus unchanged;
6. subsequent external Focus change clears masking Item inspection;
7. Story with multiple visual copies → all canonical matches Focused, one concrete selected;
8. Character remove-reference action unavailable without concrete selected visual;
9. focused Story delete → Focus none;
10. Undo restores Story but not Focus;
11. Split View shares one Focus;
12. Search Back restores navigation only and does not restore Focus;
13. WORLD/TIME marker routes through shared navigation behavior;
14. CrossWorkspace Show in Story works even when no Story visual exists.

---

# 27. Regression suite / verification commands

Implementation Stage must run at least:

```text
npm run lint
npm run build:web
npm run build:player
npm run build:electron-main
npm test -- --runInBand
```

Use the repository's Branch Check as final exact-head verification.

If the CI workflow uses its own canonical command variants, the workflow result
is authoritative for the merge gate.

Status language:

- RUN/PASS only after observed success;
- otherwise NOT RUN / IN PROGRESS / FAIL.

---

# 28. Implementation order

Implementation should be small and reviewable.

## Slice I1 — pure semantics

Add:

- `author-focus.ts`;
- `authoring-navigation.ts`;
- pure tests.

No UI changes yet.

## Slice I2 — session boundary

Add:

- Focus provider;
- adapter hook;
- provider tests.

No leaf navigation replacement yet.

## Slice I3 — Story projection

Refactor `StoryWorkspace` canonical/local selection split.

Verify:

- Item behavior;
- Story delete;
- Character instance removal;
- multiple copies.

## Slice I4 — navigation handoffs

Replace orchestration in:

- Story;
- Search;
- CrossWorkspaceNavigator;
- WORLD/TIME.

## Slice I5 — integration/regression

Add end-to-end component integration tests and run the full Branch Check.

Do not mix unrelated refactors with these slices.

---

# 29. Rollback

Rollback is bounded because there is no schema migration.

If implementation fails:

1. revert A67-D1 implementation commits;
2. remove four new modules;
3. restore five modified UI files;
4. persisted Narrative Project data remains compatible;
5. no save migration rollback is required.

The design documents can remain as rejected/paused evidence if implementation
is reverted.

---

# 30. Traceability

| Requirement | Detailed design owner |
|---|---|
| REQ-WC-001 single Focus | `author-focus.ts` + session provider |
| REQ-WC-002 Story selection participates | StoryWorkspace click/projection rules |
| REQ-WC-003 cross-surface handoff | planner + adapter + four callers |
| REQ-WC-004 editor-only | session provider + command whitelist |
| REQ-WC-005 stale safe handling | read-through validation + cleanup effect |
| REQ-WC-006 reuse navigation owners | existing project-search + viewport helpers + editor commands |
| REQ-WC-007 no new workspace | planner Split View/workspace rules |

---

# 31. Detailed Design risk closure

### Stage 7 P1 — double canonical selection source

**CLOSED.**

Story/Character canonical inspector identity comes only from shared resolved
Focus.

`selectedCanvasNodeId` is concrete local instance identity only.

### Stage 7 P1 — stale cleanup cosmetic-only

**CLOSED.**

Read-through validation hides stale Focus immediately; effect permanently
clears storage.

### Stage 7 P1 — duplicated viewport orchestration

**CLOSED by implementation plan.**

All first-slice Open/Show paths move to one planner/adapter.

Search Back remains intentionally separate because it has different semantics.

### Stage 7 P2 — multiple Canvas instances

**CLOSED.**

All copies can project canonical Focus; first stable copy is navigation-only;
explicit click owns instance action identity.

### Stage 7 P2 — user-facing error copy

**DEFERRED, non-blocking.**

Typed status remains available. No incorrect/fabricated navigation is allowed.

---

# 32. Gate Review — Detailed Design → Implementation

✅ Exact new modules are named.

✅ Exact modified files are bounded.

✅ No global store / schema field / command bus is introduced.

✅ Author Focus public type is finite.

✅ Session provider lifecycle is explicit.

✅ Project replacement lifecycle is explicit.

✅ Stale deletion + Undo lifecycle is implementation-ready.

✅ Planner command whitelist and ordering are explicit.

✅ Search focus derivation is conservative and explicit.

✅ Multiple Canvas copies are deterministic without polluting Focus.

✅ Story canonical/local selection split is explicit.

✅ Instance-specific action safety is explicit.

✅ Test files and test cases are defined.

✅ Rollback requires no data migration.

✅ Runtime/compiler/Player boundaries stay untouched.

### Gate decision

**✅ PASS to Stage 9 — Implementation + Tests.**

No P0/P1 design BLOCKER remains.

Production implementation may begin only after this Stage 8 document is committed
and its exact-head Branch Check is GREEN.
