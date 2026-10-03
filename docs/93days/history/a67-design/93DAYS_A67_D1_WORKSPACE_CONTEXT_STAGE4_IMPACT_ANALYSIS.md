# 93 Days — A67-D1 Workspace Context · Stage 4 Impact Analysis

Status: **STAGE 4 COMPLETE — PASS to Component Design**
Base: `93-days-editor@ba0285295b3727c0518349344560d1577c971172`
Depends on Stage 0–3 Workspace Context documents.
Date: **2026-09-30**
Production code: **none**

## 1. Purpose

Map every approved Workspace Context requirement through the existing project down to likely components, interfaces, functions, files and tests **before Component Design**.

Protocol chain:

`REQ → Use Case → Architecture block → Component → Interface → Function → File → Test`

This is an impact map, not implementation approval.

---

## 2. Change boundary

### Must change

- active authoring session must gain one current canonical Story/Character focus;
- explicit Story/Search/WORLD-TIME navigation must coordinate that focus;
- Story projection must read canonical focus instead of owning Story/Character identity only in local React state;
- stale focus must clear when canonical entity disappears;
- duplicated Story cross-navigation must be routed through one shared orchestration boundary.

### Must not change

- Narrative Project authored schema;
- runtime projection;
- persistence format;
- project migrations;
- simulation time/presence/knowledge;
- compiler/export;
- Player;
- Schedule rules;
- Story execution semantics;
- Project Search indexing semantics;
- existing View Cursor != Simulation Playhead behavior.

### Deferred

- Item/Location/Fact/Claim/Move focus;
- global focus history;
- pinned/recent entities;
- restart persistence;
- AI consumption of focus;
- automatic related-entity focus;
- new top-level workspace.

---

## 3. Impact matrix

| Requirement | Use Cases | Architecture block | Likely components | Likely files | Tests | Risk |
|---|---|---|---|---|---|---|
| REQ-WC-001 one current focus | UC-001/002/003/004/007/008 | authoring-session state | Workspace session focus owner | new narrow session contract + `narrative-workspace.tsx` | session/component tests | Medium |
| REQ-WC-002 Story selection updates focus | UC-001/004 | Story projection → session | StoryWorkspace | `story-workspace.tsx` | Story focus projection test + e2e | Medium |
| REQ-WC-003 cross-surface handoff | UC-001/002/003/007/008 | navigation orchestration | shared coordinator, Search, CrossNavigator, WORLD/TIME | new application/session navigation module; 3 UI files | unit orchestration + e2e | High |
| REQ-WC-004 editor-only | UC-001/002/003/005/006/007/010 | session boundary | focus owner/coordinator | session contract; workspace composition | negative mutation tests | Medium |
| REQ-WC-005 stale safe handling | UC-003B/005/006/009 | focus validation | pure validator + session owner | new focus contract/service | unit + component | Medium |
| REQ-WC-006 reuse existing nav owners | UC-001/002/003/005/008/009 | existing editor commands/helpers | coordinator | existing `workspace-navigation.ts`, `project-search.ts` reused | existing regression + coordinator tests | High |
| REQ-WC-007 no third workspace | UC-001/007 | NarrativeWorkspace composition | NarrativeWorkspace | likely no semantic change to `workspacePanelsForMode` | existing navigation test + e2e | Low |

---

## 4. Likely new files

Names are provisional until Component Design, but blast radius is expected to require only small focused additions.

### Candidate N1 — focus contract / validation

Preferred location:

`src/domain/narrative/author-focus.ts`

Likely responsibilities:

- finite `StoryNode | Character` focus reference type;
- equality / supported-kind rules;
- pure existence validation against project data.

Reason to prefer a new file over expanding `editor.ts`:
- focus is not persisted editor viewport data;
- keeps `editor.ts` from becoming a generic session-state container.

Alternative: a small application-layer contract if Component Design concludes project lookup makes this concept application-only.

### Candidate N2 — shared navigation orchestration

Preferred location:

`src/application/narrative/authoring-navigation.ts`

Likely responsibilities:

- resolve explicit "open Story/Character" intents;
- reuse existing `projectSearchNavigationTarget()`;
- reuse `storyCanvasViewportForNode()` and `worldTimeViewportForStoryNode()`;
- return/apply a finite navigation plan/status;
- coordinate focus transition with existing editor navigation commands.

It must not own state or React.

### Candidate N3 — session focus provider/hook

Preferred location:

`src/components/narrative/workspace/authoring-session-context.tsx`

Likely responsibilities:

- current focus state;
- explicit set/clear;
- stale validation against current canonical project;
- make focus available to sibling workspace surfaces.

It must not duplicate Narrative Project data.

---

## 5. Existing files likely to change

### `src/components/narrative/workspace/narrative-workspace.tsx`

**Required change:**
- establish the session-focus composition boundary;
- provide focus/navigation capabilities to child authoring surfaces.

**Must remain unchanged semantically:**
- two workspaces only;
- Split View remains a lens;
- Preview/runtime ownership unchanged.

**Indirect risk:**
- workspace-level component tests mock many children; introducing a provider must not make unrelated Preview tests fail.

---

### `src/components/narrative/workspace/story-workspace.tsx`

Current relevant functions/state:
- `selectedStoryEntity`;
- `selectCanvasNode()`;
- `openSelectedStoryNodeInWorldTime()`;
- inspector derivation from local selection.

**Required change:**
- StoryNode/Character selection establishes session focus;
- StoryNode/Character inspector/highlight projects from canonical focus.

**Keep local:**
- Item selection in first slice;
- drag state;
- pan state;
- connection source/mode;
- Canvas-instance-specific interaction where still needed.

**Danger:**
Do not move the full current `SelectedStoryEntity` union into global/session state because it contains `canvasNodeId` and Item.

---

### `src/components/narrative/workspace/project-search-panel.tsx`

Current relevant functions/state:
- `activeKey`;
- `navigationHistory`;
- `applyDocumentNavigation()`;
- `showStoryNodeInTime()`.

**Required change:**
- supported Story/Character opens coordinate Author Focus;
- use shared navigation orchestration for Story navigation.

**Must remain local:**
- query;
- kind filter;
- bulk selection;
- local Back history;
- active search document.

**Danger:**
Do not equate `activeKey` with Author Focus; unsupported search kinds remain valid active documents.

---

### `src/components/narrative/workspace/cross-workspace-navigator.tsx`

Current functions:
- `showInStory()`;
- `showInWorldTime()`.

**Required change:**
- explicit Show action establishes/retains Story-node focus;
- use shared navigation orchestration.

**Must remain local:**
- location filter;
- character filter;
- dropdown selection.

**Danger:**
Changing a filter/dropdown alone must not steal global Author Focus.

---

### `src/components/narrative/workspace/world-time-workspace.tsx`

Current relevant function:
- `openStoryNode()`.

**Required change:**
- Story marker open establishes Story-node focus;
- centralize Story viewport calculation/orchestration.

**Must remain unchanged:**
- timeline pan/zoom;
- direct moment navigator;
- routine rendering;
- Simulation Playhead separation.

---

## 6. Existing files likely reused without semantic changes

### `src/domain/narrative/workspace-navigation.ts`

Reuse:
- `storyCanvasViewportForNode()`;
- `worldTimeViewportForStoryNode()`;
- Story/WORLD-TIME context calculations.

Possible additive helper only if Component Design proves it belongs here.

No reason to rewrite current navigation math.

### `src/application/narrative/project-search.ts`

Reuse:
- search index;
- back references;
- `projectSearchNavigationTarget()`.

Potentially expose a small conversion to supported focus/navigation intent, but do not change indexing semantics.

### `src/store/narrative-project/*`

Expected: **no change**.

If implementation needs to modify persistence/repository/schema solely for first-slice focus, reopen architecture gate.

---

## 7. Functions likely impacted

| Function/state | Action |
|---|---|
| `StoryWorkspace.selectCanvasNode()` | modify: supported Story/Character → session focus |
| `StoryWorkspace.openSelectedStoryNodeInWorldTime()` | refactor to shared navigation orchestration |
| `ProjectSearchPanel.applyDocumentNavigation()` | refactor supported paths through coordinator |
| `ProjectSearchPanel.showStoryNodeInTime()` | refactor through coordinator |
| `CrossWorkspaceNavigator.showInStory()` | refactor through coordinator |
| `CrossWorkspaceNavigator.showInWorldTime()` | refactor through coordinator |
| `WorldTimeWorkspace.openStoryNode()` | refactor through coordinator |
| `selectedStoryEntity` | split responsibility; do not simply lift wholesale |
| `workspacePanelsForMode()` | expected unchanged |

No implementation signature is approved yet.

---

## 8. Tests to add/extend

### Pure/domain/application tests

#### New focus validation tests
Prove:
- Story node exists → valid;
- Character exists → valid;
- deleted id → invalid/none;
- rename does not invalidate;
- unsupported kind cannot be created in first-slice contract.

Candidate new test:
`src/domain/narrative/__tests__/author-focus.test.ts`

#### Navigation orchestration tests
Prove:
- Story target returns focus + Story viewport/workspace intent;
- scheduled Story → WORLD/TIME target;
- unscheduled Story does not invent time;
- Character without Canvas still yields canonical focus with no fabricated visual target;
- repeated navigation is deterministic;
- no runtime mutation.

Candidate:
`src/application/narrative/__tests__/authoring-navigation.test.ts`

### Existing regression suites

`src/domain/narrative/__tests__/workspace-navigation.test.ts`
- keep existing Story/WORLD-TIME math regression;
- only extend if a pure helper is added there.

`src/application/narrative/__tests__/project-search.test.ts`
- keep indexing/navigation target behavior;
- add only if search→focus conversion is housed in this module.

### Component tests

Candidate:
`src/components/narrative/workspace/__tests__/authoring-session-focus.test.tsx`

Prove:
- focus survives Story unmount → WORLD/TIME → Story remount;
- stale focus clears when project no longer contains entity;
- Split View shares one focus;
- unsupported panel-local selection does not steal focus.

### Browser/E2E

Extend current authoring E2E path in `e2e/player-host.spec.ts` with one focused vertical journey:

1. create/select Story event;
2. bind exact authored time;
3. open in WORLD/TIME;
4. Story marker remains same canonical focus;
5. return to STORY;
6. inspector/highlight reflects same Story;
7. Simulation Playhead text is unchanged.

Second focused case:
- search Character with no Canvas representation;
- open result;
- no Canvas node is fabricated;
- authored/runtime counts unchanged.

---

## 9. Regression risks

### High — navigation divergence

If one existing handler bypasses the coordinator, Focus and viewport can disagree.

Mitigation:
- enumerate all explicit open/navigation entry points;
- component design gives them one dependency.

### High — accidental Canvas creation

Character search without Canvas is an intentional use case.

Mitigation:
- test Canvas node count before/after open.

### Medium — unrelated tests fail because provider is introduced

Current `NarrativeWorkspace` unit tests mock child panels heavily.

Mitigation:
- provider must have a safe default inside NarrativeWorkspace composition;
- do not require all isolated child tests to construct the whole app unless they consume session focus.

### Medium — local Item selection regression

StoryWorkspace currently selects Items through the same local union.

Mitigation:
- split only Story/Character identity; keep Item path intact in first slice.

### Medium — search Back semantics accidentally change

Local navigation history currently stores viewports/workspace, not Author Focus.

Mitigation:
- Stage 4 does not require Back to restore focus;
- leave local history behavior unchanged unless a later requirement explicitly changes it.

### Low — persistence regression

Should be zero because persistence is out of blast radius.

Any persistence diff is a warning that implementation scope expanded incorrectly.

---

## 10. What should be refactored separately vs together

### Refactor together with feature

The duplicated **explicit Story open/navigation orchestration** should be centralized together with Focus because patching focus into three/four handlers would create new inconsistency immediately.

This refactor is directly required by the feature.

### Do NOT refactor together

- Project Search indexing;
- Search Back history;
- global workspace layout;
- Story Canvas rendering;
- routine authoring;
- Project Library;
- runtime store;
- persistence;
- Preview architecture;
- CSS redesign;
- generic entity navigation for every entity type.

Those are unrelated and must remain out of scope.

---

## 11. Indirect breakage checklist

Implementation must verify:

- A66 Story direct moment navigation still moves only View Cursor;
- A66 WORLD/TIME direct moment navigation still preserves Simulation Playhead;
- A67 world-authoring pilot still completes through normal UI;
- Story Canvas drag/pan remains functional;
- Project Search still opens unsupported entity kinds through existing behavior;
- Search Back still restores its local viewport/workspace snapshots;
- Split View still shows exactly Story + WORLD/TIME;
- Preview-from-here remains independent from session Author Focus;
- Undo/Redo does not gain focus-only entries;
- project save output is unchanged by changing Focus.

---

## 12. Traceability through likely files/tests

| REQ | Use Case | Interface/operation | Function area | File | Test |
|---|---|---|---|---|---|
| WC-001 | 001/002/003/007 | session focus read/write | focus owner | new session context + NarrativeWorkspace | authoring-session-focus test |
| WC-002 | 001/004 | select canonical focus | selectCanvasNode | StoryWorkspace | component + e2e |
| WC-003 | 001/002/003/007/008 | open/focus navigation intent | shared nav coordinator | new application module + 3 UI callers | authoring-navigation + e2e |
| WC-004 | 001/010 | session-only transition | no project command | session owner | negative mutation test |
| WC-005 | 003B/005/006/009 | validate focus | pure validator | new focus contract/service | unit + component |
| WC-006 | 001/002/005/008/009 | existing viewport/workspace commands | coordinator delegates | existing nav helpers/execute | regression + orchestration |
| WC-007 | 001/007 | projection only | workspace composition | NarrativeWorkspace | existing + focus component/e2e |

---

## 13. Impact gate

### Coverage

✅ Every requirement maps to Use Case, architecture owner, likely code surface and test.

✅ Existing regression suites covering navigation were identified.

✅ Runtime/persistence/schema/compiler are explicitly outside the expected blast radius.

### Scope control

✅ Required navigation refactor is directly connected to the feature.

✅ Unrelated Search/Canvas/Library/runtime refactors are excluded.

✅ First slice remains StoryNode + Character only.

### Risk

⚠ Cross-navigation refactor is the highest-risk part because it touches several UI entry points.

⚠ StoryWorkspace local selection must be split carefully so Item interaction is not broken.

⚠ Search Back intentionally does not yet restore Author Focus; this remains a known first-slice limitation, not an accidental omission.

### Decision

**✅ PASS to Component Design.**

No BLOCKER.

Next stage must define the exact components and interfaces before any code is written.
