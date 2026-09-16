# A51 Change Record — S3 Typed Watches

Change ID: **A51-S3-TYPED-WATCHES**  
Stage / Requirement: **A51-S3 / REQ-012 Typed Watches**  
Risk: **MEDIUM** (read-only investigation tooling inside the HIGH-risk A51 preview boundary)  
Verified code SHA: `8851d8978e6b90b999f75d6ccd84d85455de84b7`  
Verified workflow run: `93 Days Branch Check #433` / run id `35132460924`

## Problem / requirement

Authors need to keep a small set of runtime facts visible while they mutate and compare sandbox scenarios. Requiring them to inspect raw JSON for every check would defeat the author-facing Analysis layer, while a generic object-path Watch API would couple the UI to internal serialization details and bypass reviewed runtime concepts.

## Contract

S3 provides a finite typed read projection over supported sandbox runtime concepts. Watches are local investigation state: they are not authored definitions, are not persisted, do not enter authoring Undo/Redo, and never write to live runtime.

Approved Watch definitions are:

```text
moment
actual-location(characterId)
knowledge(characterId, claimId)
relationship-axis(fromCharacterId, toCharacterId, axis)
story-node-state(storyNodeId)
```

Generic arbitrary object-path / JSON-path Watches remain explicitly deferred.

`story-node-state` reads the canonical effective Story runtime projection through `narrativeRuntimeStoryNodes()`; S3 does not reconstruct Story-state semantics.

## Implementation

Primary slice: `aa229cafd2ba6e9e090ccfa7df6c8be00d1a3b09` (`feat: add A51 typed preview watches`).

Added:
- `src/application/narrative/preview-watches.ts` — finite typed definitions, stable typed identities and pure read-only inspector;
- `src/application/narrative/__tests__/preview-watches.test.ts` — contract tests for supported projections, mutation safety and invalid typed references;
- `src/components/narrative/workspace/preview-typed-watches.tsx` — local Analysis UI for adding/removing Watches and rendering current values;
- `src/components/narrative/workspace/__tests__/preview-typed-watches.test.tsx` — UI regressions proving typed selectors and automatic recomputation.

The existing `preview-laboratory-panel.tsx` changed by only two integration lines: one import and one always-mounted Watch component hidden outside Analysis. Keeping it mounted preserves the local Watch collection while the author moves between Preview, Analysis and Deep Debug.

## Failure evidence and minimal correction

Workflow #432 on `aa229cafd2ba6e9e090ccfa7df6c8be00d1a3b09` reached lint and both builds successfully but failed the Jest gate.

The preserved diagnostics identified one exact E0:
- suite: `preview-typed-watches.test.tsx`;
- the assertion `getByText(/Simulation moment/)` matched both the Watch-type `<option>` and the rendered Watch label `<strong>`;
- product behavior was correct; the test selector was ambiguous.

Run #432 summary: **325 suites passed, 1 failed; 2007 tests passed, 1 failed; 23 skipped; 42 todo; 2073 total**.

Minimal correction: `8851d8978e6b90b999f75d6ccd84d85455de84b7` (`test: scope A51 typed watch assertion`) scopes the assertion to the `Typed watch values` list. No product code changed.

## Regression evidence

Application tests prove:
- every approved Watch category reads the expected sandbox runtime value;
- reading Watches leaves the complete `PreviewScenario` unchanged;
- Watches re-evaluate after explicit sandbox changes;
- Story-state Watch observes canonical effective runtime state after a real authored Outcome is applied;
- invalid character/Claim/Story references fail without mutating the scenario;
- an empty relationship axis is rejected;
- stable IDs are derived from typed definitions, not generic object paths.

UI tests prove:
- no free-form path field is offered;
- supported Watch selectors are typed by Character, Claim, relationship axis and Story node;
- Watch values update when the `PreviewScenario` prop changes;
- Watch-list state is local to the preview UI.

## Exact-head verification

Workflow run #433 on `8851d8978e6b90b999f75d6ccd84d85455de84b7` completed **SUCCESS**.

Full gate:
- install: PASS;
- production dependency audit: PASS;
- lint: PASS;
- web build: PASS;
- Electron main build: PASS;
- Jest/coverage: PASS;
- diagnostics upload: PASS;
- Vite smoke: PASS;
- Electron smoke: PASS.

Jest evidence from preserved `93-days-test-diagnostics` artifact:
- Test Suites: **326 passed / 326 total**;
- Tests: **2008 passed, 23 skipped, 42 todo / 2073 total**;
- Snapshots: 0;
- coverage thresholds were not reduced and no coverage exclusion was added.

## Self-review

Reviewed against A51 invariants and the engineering protocol:
- inspector is pure/read-only and appends no preview action;
- no persistence, authoring-history or live-runtime write path was added;
- no generic arbitrary object-path API exists;
- effective Story state is delegated to the canonical runtime projection;
- UI Watch collection is local investigation state and automatically renders against the current sandbox;
- Preview Laboratory integration is two lines, keeping the S3 boundary reviewable;
- no open PR review threads remain.

No known BLOCKER/HIGH S3 issue remains after run #433.

## Gate status

| Gate | Status | Evidence |
|---|---|---|
| E0 Evidence | **PASS** | exact #432 selector failure captured from diagnostics |
| E1 Scope | **PASS** | read-only Watch projection + Analysis UI only |
| E2 Contract | **PASS** | finite typed union; canonical Story projection; no arbitrary paths |
| E3 Verification design | **PASS** | application mutation-safety + UI recomputation regressions |
| E4 Minimal patch | **PASS** | one S3 slice plus one test-only selector correction |
| E5 Verification ladder | **PASS** | full run #433 green on exact code SHA |
| E6 Self-review | **PASS** | no known HIGH/BLOCKER; review threads empty |
| E7 PR/CI | **PASS for S3 slice** | PR #24 exact-head code gate green |
| E8 Merge | **N/A for S3** | A51 stage continues; do not merge yet |
| E9 Post-merge | **N/A** | not merged |
| E10 Learning/recovery | **PASS** | test queries must target the semantic Watch surface, not duplicated option text |

## Closure / next permitted action

**A51-S3 is DONE.** The overall A51 stage remains **IN PROGRESS**.

Next permitted slice: **A51-S4 — Preview from here semantic contract gate**.

S4 must not infer runtime truth from editor navigation. In particular, View Cursor must remain distinct from Simulation Playhead and Scheduled Presence must remain distinct from Actual Presence. Implementation is blocked until the selected authoring context and any missing time/presence/knowledge prerequisites have an explicit reviewed contract.
