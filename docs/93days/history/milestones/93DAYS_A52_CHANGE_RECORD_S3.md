# A52 Change Record — S3 Transient Export Adapter & UI

Change ID: A52-S3  
Stage / Requirement: A52 / REQ-006..REQ-007  
Risk: HIGH  
Exact verified code SHA: `c82d364bc4e486d59210854f478325e0508443ba`

## Requirement

Connect the verified runtime artifact compiler to the existing Twine publishing boundary without making persisted Story Passages a second narrative source.

Expose export readiness and source-linked diagnostics inside the Narrative Workspace.

## Contract evidence

S3 contract head:
- `524fd96cbf5c08463256bebb9ebaed45187ef4a2`;
- workflow **#460 GREEN**.

The contract requires:
- generated Story/Passage data to remain transient;
- legacy host narrative content to be discarded;
- only host package identity to cross the adapter;
- generic Twine publishing to remain canonical;
- source navigation to remain editor-only;
- S3 output not to be misrepresented as the runnable proof.

## Implementation slices

### Pure adapter

Head `0f34cd531ac23dc8f19cd9aa84e84274c7a8ce08` → **#461 GREEN**.

Adds:
- deterministic generated artifact Passage;
- transient Story with project name + host id/IFID/story-format identity;
- explicit `host-story-mismatch` blocker;
- compiler diagnostic pass-through;
- no legacy Passage/script/style/tag copying;
- no input mutation.

### Publishing orchestration

Head `6e994b8d9ced0ad24955001e6cdbd107edfdfcf4` → **#462 GREEN**.

Adds a Narrative-specific hook that:
- prepares the transient Story;
- loads the existing configured Story Format;
- calls unchanged `publishStoryWithFormat()`;
- returns HTML without dispatching generated Story data.

### Export UI

Head `c82d364bc4e486d59210854f478325e0508443ba` → **#463 GREEN**.

Adds:
- Export toggle in existing Narrative Workspace header;
- readiness / blocker / advisory / artifact-version display;
- source-linked diagnostics;
- editor-only Story/WORLD-TIME navigation;
- explicit HTML download through existing `saveHtml`;
- clear S3 vs S4 runnable-proof disclosure.

## Final verification

Workflow **#463 GREEN** on exact code head:

- install PASS;
- production audit PASS;
- lint PASS;
- web build PASS;
- Electron build PASS;
- **337/337 Jest suites**;
- **2059 passed tests**;
- 23 skipped;
- 42 todo;
- 2124 total;
- diagnostics upload PASS;
- Vite smoke PASS;
- Electron smoke PASS.

## Self-review

Compare `524fd96c...` → `c82d364b...` contains only:
- adapter + adapter tests;
- Narrative publishing hook + tests;
- export panel/CSS/tests;
- 11-line workspace wiring;
- focused Story Edit route integration test.

No changes to:
- generic `src/util/publish.ts`;
- Stories reducer/persistence;
- Narrative persistence;
- canonical resolver/effect/simulation code;
- A51 Preview/Debug state.

Generated Passages are never dispatched or saved.

## Recovery

Revert S3 commits. No persisted schema/data migration exists.

## Protocol gates

E0 Evidence: PASS  
E1 Scope: PASS  
E2 Contract: PASS  
E3 Verification design: PASS  
E4 Minimal patch: PASS  
E5 Verification ladder: PASS (#461, #462, #463)  
E6 Self-review: PASS  
E7 PR/CI: PASS for S3 slice  
E8 Merge: PENDING A52 completion  
E9 Post-merge: PENDING A52 completion  
E10 Learning/recovery: PASS

**A52-S3: DONE / VERIFIED.**
