# A52-S3 Contract — Transient Export Adapter & Source-Linked Export UI

Status: **CONTRACT PASS / IMPLEMENTATION VERIFIED**  
Stage: **A52-S3**  
Risk: **HIGH**  
Verified source: `2fe6a165734c8ed427dc81f1cad28895fcc3a4ee`  
Source gate: workflow **#459 GREEN** — **334/334 suites**, **2044 passed tests** (23 skipped, 42 todo; 2109 total), diagnostics upload PASS, Vite smoke PASS, Electron smoke PASS.

## 1. Goal

S3 connects the verified A52 pure compiler to the existing Twine publishing boundary without reintroducing the old Passage graph as authored state.

S3 produces a **transient generated Story** in memory, binds it through the existing story-format publisher, and exposes export readiness/diagnostics in the Narrative Workspace.

S3 does **not** claim the generated HTML is the final runnable 93 Days game. The generated Story contains the versioned compiler artifact as a deterministic data passage. A52-S4 owns the minimal runnable compiler proof.

## 2. Existing repository boundary

Generic Twine publishing already belongs to:

- `src/util/publish.ts` — `publishStoryWithFormat()`;
- `src/store/story-formats` — format discovery/loading;
- `src/util/save-file.ts` — browser/Electron file download.

The legacy `BuildActions` publishes persisted `Story.passages`. Narrative Workspace replaced Passage-map authoring, so using that action directly would publish stale/empty host Passage state instead of canonical Narrative Project data.

S3 therefore adds a Narrative-specific adapter. It does not modify generic publisher semantics.

## 3. Pure preparation adapter

Conceptual contract:

```text
prepareNarrativeStoryExport(project, hostStory)
  -> blocked { diagnostics }
  -> ready   { artifact, diagnostics, story }
```

The adapter:

1. verifies `hostStory.id === project.hostStoryId`;
2. calls `compileNarrativeRuntimeArtifact(project)`;
3. stops atomically if compilation is blocked;
4. serializes the verified runtime artifact;
5. creates one deterministic generated Passage containing that serialized artifact;
6. creates a transient Story using only allowed host packaging identity.

## 4. Host Story ownership

The persisted outer Story is a host/package identity container, not narrative truth.

S3 may copy only:

- `id`;
- `ifid`;
- `storyFormat`;
- `storyFormatVersion`.

The transient Story name is `project.name`.

S3 must **not** copy:

- host `passages`;
- host `startPassage`;
- host `script`;
- host `stylesheet`;
- host Story tags/tag colors;
- host selection/editor layout values as narrative content.

Transient-only required Story fields use deterministic neutral values.

This prevents legacy/stale Twine Story content from becoming a second narrative source.

## 5. Generated artifact Passage

V1 generated Passage:

- deterministic id derived from project identity;
- deterministic reserved name;
- deterministic reserved tag;
- `story = hostStory.id`;
- text = exact `serializeNarrativeRuntimeArtifact(artifact)` output;
- fixed neutral geometry;
- not selected/highlighted.

No current timestamp, random id, editor state, live runtime state or Preview state enters the generated Passage.

The Passage is compiler output only. It is never dispatched into Stories state and never persisted.

## 6. Adapter diagnostics

S3 adds one finite adapter blocker:

- `host-story-mismatch` — caller supplied a host Story whose id does not match `project.hostStoryId`.

It produces no transient Story.

Compiler/Story Brain diagnostics from S2 pass through unchanged.

No missing-entity source navigation is fabricated for adapter-level project/package errors.

## 7. Publishing orchestration

A small Narrative export hook/orchestrator may:

1. prepare the transient Story;
2. if blocked, return the diagnostics without loading/publishing;
3. load the transient Story's existing configured story format;
4. call `publishStoryWithFormat(transientStory, formatSource, getAppInfo())`;
5. return HTML + transient Story + diagnostics.

Format load failures may surface as ordinary operation errors, consistent with existing publishing behavior.

The orchestrator must not:

- dispatch Story actions;
- dispatch Narrative authoring commands;
- call `replaceRuntimeProject`;
- save Narrative Project;
- mutate host Story;
- write generated Passage data into persistence.

## 8. Export UI

Narrative Workspace adds an **Export** toggle/action in the existing header.

The export surface is a panel/lens inside the existing workspace. It is not a third top-level workspace.

The panel shows:

- readiness: ready / blocked;
- blocker count;
- advisory count;
- finite diagnostics;
- generated artifact format/version when ready;
- explicit text that S3 output is compiler/export data and S4 owns runnable proof;
- publish/download action only when ready;
- operation error if story-format loading/publishing/download preparation fails.

The panel itself has no authoring data model.

## 9. Source-linked diagnostics

For `source: story-brain` diagnostics, the panel reuses:

`storyBrainNavigationForFinding(project, finding)`.

When navigation exists, **К источнику** may update editor navigation state exactly as Story Brain already does.

That navigation:

- may switch STORY/WORLD-TIME;
- may center Story canvas or WORLD/TIME viewport;
- remains editor navigation and therefore stays outside authoring Undo/Redo;
- never advances Simulation Playhead.

Compiler/adapter diagnostics without a concrete source do not invent one.

## 10. Download contract

S3 may save the published HTML only after successful preparation + format binding.

Filename is derived from the transient Story through the existing story filename helper.

Downloading is an explicit user action. It does not mark the Narrative Project dirty and does not create an Undo/Redo record.

## 11. Determinism

Given the same:

- compiled Narrative Project authored input;
- host package identity (`id`, `ifid`, story format name/version);
- format source;
- app info;

the transient Story data passed to the generic publisher is deterministic.

S3 does not promise byte-identical final HTML across different app versions or different story-format source versions; those are explicit packaging inputs outside the runtime artifact v1 contract.

## 12. Required regressions

Before S3 is implementation-verified:

1. adapter discards all host Passages;
2. adapter discards host script/stylesheet/tags/tag colors;
3. adapter preserves only allowed host package identity;
4. generated Passage contains exact canonical artifact JSON;
5. repeated preparation is structurally deterministic;
6. host Story and Narrative Project are not mutated;
7. host-story mismatch blocks atomically;
8. compiler blocker passes through and creates no transient Story;
9. advisory diagnostics pass through while export remains ready;
10. publishing orchestration calls existing `publishStoryWithFormat()` with the transient Story;
11. publishing orchestration does not dispatch/save generated Story state;
12. UI blocks publish action when blockers exist;
13. UI shows advisory/blocker counts distinctly;
14. Story Brain export diagnostics can navigate to their existing source;
15. source jump changes editor navigation only and creates no authoring Undo step;
16. successful explicit publish calls existing `saveHtml` with the derived transient filename;
17. legacy host Passage text never appears in prepared/published Narrative export data.

## 13. Non-goals

S3 does not:

- implement player-facing runtime rendering;
- evaluate Moves/Outcomes;
- create a second JS runtime;
- make artifact JSON human-authored;
- preserve legacy host Story script/style/passages;
- add a third workspace;
- declare A52 DONE.

## 14. Recovery

S3 is derived-only. Rollback is a direct revert of adapter/orchestration/UI files.

No persisted author data migration is introduced.

## 15. Decision

## 16. Implementation verification

S3 was delivered in three isolated code slices:

- pure adapter `0f34cd531ac23dc8f19cd9aa84e84274c7a8ce08` → workflow **#461 GREEN**;
- Narrative publishing hook `6e994b8d9ced0ad24955001e6cdbd107edfdfcf4` → workflow **#462 GREEN**;
- export panel/wiring `c82d364bc4e486d59210854f478325e0508443ba` → workflow **#463 GREEN**.

Final S3 code gate #463:
- **337/337 suites**;
- **2059 passed**;
- **23 skipped**;
- **42 todo**;
- **2124 total**;
- diagnostics upload PASS;
- Vite smoke PASS;
- Electron smoke PASS.

Verified behavior:
- legacy host Passages/script/style/tags are discarded;
- only host package identity crosses the adapter;
- generated artifact Passage is deterministic and unpersisted;
- compiler and adapter blockers are atomic;
- Story Brain advisories remain exportable;
- generic `publishStoryWithFormat()` is reused unchanged;
- explicit HTML download uses existing `saveHtml` / Story filename helper;
- source-linked diagnostics issue editor-only navigation commands;
- Narrative Export is a panel inside the existing workspace, not a third workspace.

**A52-S3 transient adapter + export UI: DONE / VERIFIED.**
