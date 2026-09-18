# A52 Change Record — S4 Minimal Runnable Compiler Proof

Change ID: A52-S4  
Stage / Requirement: A52 / REQ-008  
Risk: HIGH  
Exact verified code SHA: `45e0fd11356dd6abe94ad7cea07a1d9aa19c9e8d`

## Requirement

Prove that the deterministic `narrative-runtime-artifact` v1 can leave the editor as self-contained HTML and be consumed by browser JavaScript without implementing a second narrative runtime.

## Contract evidence

- S4 contract `6612e907e702d708c01294092569f9c51b286dcc` → workflow **#465 GREEN**.
- Packaging-identity refinement `1e84771f05b6472a9dff1c7ce3986afd1dc72ca3` → workflow **#466 GREEN**.

The refinement prevents the dedicated proof shell from being falsely labelled as the host Story Format in published Twine metadata. The proof creates only a transient packaging clone and preserves the exact generated artifact Passage.

## Implementation

### Proof core

Head `791ff5b30145459bed9606e0ba8268bd38e99ac3` → workflow **#467 GREEN**.

Adds:
- fixed Story Format identity `93 Days Compiler Proof` v1.0.0;
- deterministic validation-only Story Format source;
- S3 preparation reuse;
- proof-only transient packaging clone;
- binding through unchanged `publishStoryWithFormat()`;
- browser bootstrap that only locates, JSON-parses, compatibility-checks and renders artifact data.

Regressions execute the exact embedded bootstrap and cover:
- valid artifact ready state;
- exact artifact format/version;
- authored project name;
- fresh initial day/minute;
- missing artifact Passage;
- malformed JSON;
- wrong artifact format;
- unsupported artifact version;
- invalid initial moment;
- script-like authored content remaining inert;
- deterministic output/input non-mutation;
- compiler blocker pass-through;
- absence of dynamic-code/canonical evaluator hooks.

#467 exact counts:
- **338/338 suites**;
- **2070 passed**;
- 23 skipped;
- 42 todo;
- 2135 total;
- 0 snapshots;
- diagnostics upload PASS;
- both smoke checks PASS.

### Proof publishing/UI

Head `45e0fd11356dd6abe94ad7cea07a1d9aa19c9e8d` → workflow **#468 GREEN**.

Adds:
- `publishNarrativeProof()` orchestration using the dedicated proof source and no host-format loading;
- separate **Compiler proof HTML** action in the existing Export panel;
- `.compiler-proof.html` download through existing `saveHtml()` / filename helper;
- explicit validation-only copy;
- blocker disablement for both normal/proof export;
- regressions proving no authoring/runtime command dispatch.

Normal S3 **Собрать HTML** behavior remains unchanged.

## Final code verification

Workflow **#468 GREEN**:
- install PASS;
- production audit PASS;
- lint PASS;
- web build PASS;
- Electron build PASS;
- **338/338 Jest suites**;
- **2072 passed**;
- 23 skipped;
- 42 todo;
- 2137 total;
- 0 snapshots;
- diagnostics upload PASS;
- Vite smoke PASS;
- Electron smoke PASS.

## Boundary self-review

Code compare `1e84771f...` → `45e0fd11...` contains only:
- `runtime-proof.ts` + focused tests;
- Narrative publishing hook + focused test extension;
- Narrative Export panel/CSS + focused test extension.

No changes to:
- generic `src/util/publish.ts`;
- Narrative persistence;
- Stories reducer/persistence;
- canonical Guard/Move/Outcome/effect/simulation/schedule/cognition/body/injury runtime modules;
- Preview/A51 runtime state.

The proof shell does not call or copy canonical evaluator semantics. It reads inert artifact data only.

## Recovery

Revert S4 commits. S3 compiler-data export remains intact. No persisted schema/data migration exists.

## Requirement matrix

REQ-001 single source of truth: PASS  
REQ-002 deterministic artifact: PASS  
REQ-003 versioned schema: PASS  
REQ-004 authored initial runtime: PASS  
REQ-005 validation gate: PASS  
REQ-006 source-linked diagnostics: PASS  
REQ-007 Twine publishing reuse: PASS  
REQ-008 runnable proof without second runtime: PASS

## Protocol gates

E0 Evidence: PASS  
E1 Scope: PASS  
E2 Contract: PASS  
E3 Verification design: PASS  
E4 Minimal patch: PASS  
E5 Verification ladder: PASS (#465–#468)  
E6 Self-review: PASS  
E7 PR/CI: PASS for S4 code slice  
E8 Merge: PENDING final A52 closure gate  
E9 Post-merge: PENDING  
E10 Learning/recovery: PASS

**A52-S4: DONE / VERIFIED.**  
**A52 implementation requirements: COMPLETE; final exact-head closure gate pending.**
