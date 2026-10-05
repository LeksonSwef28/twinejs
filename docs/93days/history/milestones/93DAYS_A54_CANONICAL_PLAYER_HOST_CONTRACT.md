# A54 Contract — Canonical Player Host & Standalone Packaging

Status: **IMPLEMENTATION VERIFIED / MERGE REVIEW READY**  
Stage: **A54 — Canonical Player Host & Standalone Packaging**  
Risk: **HIGH**  
Stable source: `93-days-editor` @ `ea8ba7f03781ead91f63dd3fccd281dfb2a9ad2a`  
Feature branch: `feature/a54-canonical-player-host`  
Decision date: **2026-09-19**

## 1. E0 — exact requirement / repository evidence

A53 is merged and post-merge verified on exact stable SHA `ea8ba7f03781ead91f63dd3fccd281dfb2a9ad2a`.

At that SHA:

- A52 emits deterministic `narrative-runtime-artifact` v1;
- A53 materializes that artifact into a player-owned session and restores runtime-only saves;
- `src/index.tsx -> App -> editor providers -> Routes` is still the only application entry;
- `story-play`, `story-test` and `story-proof` are generic Twine Story Format routes, not the Narrative player runtime;
- Narrative Export still binds the artifact to transient Twine Story/Passage output for legacy HTML or compiler proof;
- there is no dedicated browser player entry, no host-level artifact source boundary, and no standalone player build.

**Root cause classification:** the remaining gap is host/packaging ownership, not gameplay mechanics.

## 2. Goal

A54 creates a dedicated player host that can boot A53 without loading the editor application shell.

Target flow:

`artifact source -> host loader -> A53 materializer -> canonical TypeScript runtime -> player host`

The host must be independently buildable and later packageable with exact artifact data. It may expose technical boot status, but A55 owns real player presentation.

## 3. Ownership

### Player entry

A54 owns a dedicated HTML/React entry. It must not require:

- `PrefsContextProvider`;
- `StoryFormatsContextProvider`;
- `StoriesContextProvider`;
- editor `StateLoader`;
- Narrative editor provider/history;
- generic Story Format play/test routes.

### Artifact source

A54 may accept artifact bytes from:

1. inline JSON embedded in the standalone player HTML/package;
2. an explicitly requested development handoff channel.

The artifact source adapter does not reinterpret authored/runtime semantics. Compatibility remains owned by A53 materialization.

### Runtime

A54 imports the same A53/canonical TypeScript modules as tests/editor Preview. Host code may orchestrate those APIs, but must not implement replacement Guard/Move/effect/simulation logic.

## 4. A54 invariants

- **A54-I01 — Dedicated entry:** player boot does not pass through editor providers or editor routes.
- **A54-I02 — Canonical runtime bundle:** the player build imports A53 and canonical runtime TypeScript modules directly.
- **A54-I03 — No Story Format engine fork:** no gameplay resolver/effect/simulation code is copied into Story Format JavaScript.
- **A54-I04 — Artifact fidelity:** exact serialized artifact data reaches A53 materialization unchanged except JSON parse/transport.
- **A54-I05 — Visible incompatibility:** missing, malformed or incompatible artifact input produces a player-host error state, not a partial session.
- **A54-I06 — Artifact immutability:** host boot/runtime probe does not mutate the artifact source.
- **A54-I07 — No editor ownership:** player host has no semantic dependency on editor workspace/view/history/persistence.
- **A54-I08 — No generated Passage persistence:** development launch creates no authored/generated Story or Passage state.
- **A54-I09 — Ephemeral development handoff:** editor-to-player development transport is explicitly temporary and is not a player save format.
- **A54-I10 — Standalone package boundary:** packaged player HTML carries artifact data and references only its player runtime assets.
- **A54-I11 — Build identity retained:** player session identity remains the identity materialized from the artifact.
- **A54-I12 — No hidden RNG/time:** host bootstrap introduces no random id, wall-clock gameplay state or hidden choice source.
- **A54-I13 — A52 proof remains proof:** compiler proof stays validation-only.
- **A54-I14 — Failure atomicity:** host errors return no partially usable player session.

## 5. Public host contract

```text
bootstrapNarrativePlayerHost(serializedArtifact)
  -> rejected { code, summary }
  -> ready { session }

browser artifact source
  -> inline artifact
  -> explicit development handoff
  -> missing source
```

The host bootstrap owns JSON parsing and delegates all artifact compatibility/materialization to A53.

## 6. Verification design

A54 must prove:

1. a serialized exact A52 artifact boots through the host boundary;
2. empty/malformed input is rejected visibly;
3. unsupported artifact format/version/schema propagates A53 rejection;
4. dedicated player entry does not import editor App/providers/routes;
5. browser source prefers embedded standalone artifact;
6. development handoff is read only when explicitly requested;
7. a zero-minute canonical simulation probe can run through shared runtime code without changing session time;
8. dedicated player Vite build succeeds;
9. development host boots in a real browser smoke test;
10. standalone package can embed exact artifact JSON into player HTML and boot from it;
11. Narrative Export can launch the development player without dispatching generated Passages;
12. full exact-head CI, web/Electron builds and existing smokes stay green.

## 7. Minimal slices

### A54-S1 — Dedicated host entry + loader

- pure host bootstrap over A53;
- browser artifact-source adapter;
- `player.html` + independent React entry;
- dedicated Vite player build;
- focused host/source tests.

### A54-S2 — Export handoff + package builder

- development launch from Narrative Export with no Story/Passage persistence;
- runtime artifact JSON download;
- standalone package builder that injects artifact JSON into built player HTML;
- package/launch regressions.

### A54-S3 — Browser/package closure

- Playwright host boot from development handoff;
- standalone packaged-host smoke;
- exact-head full CI;
- self-review/change record/PR closure.

## 8. Blast radius

Expected touch areas:

- `src/application/narrative/player-host.ts`;
- new `src/player/*` entry/host adapters;
- Narrative Export launch orchestration;
- player-only Vite/package tooling;
- focused tests/e2e/CI;
- A54 traceability docs.

Must not change without a new explicit decision:

- authored Narrative Project schema;
- A52 artifact v1 shape;
- A53 save v1 shape;
- canonical Move/effect/simulation semantics;
- editor Undo/Redo/persistence ownership;
- generic Twine publisher semantics;
- runtime-proof behavior.

## 9. Recovery

No authored or save migration is planned.

Rollback is code/build-tooling only: remove the player entry/host/package additions and retain A53 as the stable runtime boundary. Existing Twine publishing and compiler proof remain available.

## 10. Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS — S1/S2/S3**
- E5 Exact-head verification: **PASS — S1 #483, S2 #484, S3 #489**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS for implementation — draft PR #27 open and mergeable; closure-doc exact-head CI follows this record**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**


## 11. S1 verification evidence

Exact S1 head `f3b836308bd5fe0c8be6d583fa3c53531d615062` passed workflow **#483 GREEN**:

- production dependency audit: 0 vulnerabilities;
- lint PASS;
- web build PASS;
- Electron main build PASS;
- **343/343 suites**;
- **2087 passed tests** (23 skipped, 42 todo; 2152 total);
- 0 snapshots;
- Vite smoke PASS;
- Electron smoke PASS.

S1 therefore proves the dedicated host/source boundary without an editor-provider dependency. S2 may proceed.


## 12. S2 verification evidence

Exact S2 head `0abb73b02f3104ff21e2c4c84b2b1033b276035f` passed workflow **#484 GREEN**:

- production dependency audit: 0 vulnerabilities;
- lint PASS;
- web build PASS;
- dedicated standalone player build PASS;
- Electron main build PASS;
- **345/345 suites**;
- **2093 passed tests** (23 skipped, 42 todo; 2158 total);
- 0 snapshots;
- Vite smoke PASS;
- Electron smoke PASS.

S2 proves editor-to-player ephemeral handoff, direct artifact JSON export, package embedding contract and an independently built player bundle. S3 now closes real-browser boot for both handoff and embedded-package sources.


## 13. S3 verification evidence

A54-S3 added a real Chromium gate for both player input paths:

1. **development handoff** — exact serialized A52 artifact is handed from the editor origin to a new dedicated Player window and consumed once;
2. **standalone package** — exact serialized A52 artifact is embedded in `player.html` and boots without the editor application.

Browser verification exposed three useful failures before the final green implementation:

- workflow **#486** showed the first test reproduced a same-document hash transition rather than the production new-window launch. The test was corrected to open a separate player window.
- workflow **#487** then showed that `sessionStorage` was not a reliable cross-window handoff boundary for the production launch shape, while the embedded standalone artifact path remained green.
- workflow **#488** still failed the development path after moving the temporary mailbox to same-origin `localStorage`. Code review identified the remaining ownership defect: the one-shot artifact read/removal occurred inside `PlayerApp` render under `React.StrictMode`, so a development double render could consume the mailbox on the first render and observe it as missing on the second.
- the final fix moved the destructive artifact-source read to `src/player/index.tsx`, before React rendering. `PlayerApp` now receives an already-resolved source and has no artifact-transport side effect during render.

The development mailbox remains explicitly temporary: it is written only for a development launch, consumed and removed on first successful read, and removed by the editor if opening the player window fails. It is not a save format and carries no editor state.

Exact S3 implementation head `c7ac8c91edf893071255a8fd0753955235890712` passed workflow **#489 GREEN**:

- production dependency audit: **0 vulnerabilities**;
- lint PASS;
- web build PASS;
- dedicated standalone player build PASS;
- Electron main build PASS;
- **345/345 Jest suites**;
- **2093 passed tests** (23 skipped, 42 todo; 2158 total);
- 0 snapshots;
- Chromium canonical player smoke: **2/2 passed**:
  - development handoff boots the dedicated Player;
  - embedded standalone artifact boots the dedicated Player;
- Vite smoke PASS — `Vite responded successfully.`;
- Electron smoke PASS — `Electron stayed alive for the smoke window.`.

S3 therefore proves the A54 exit condition: the dedicated host can load the canonical artifact and execute the shared TypeScript runtime without the editor App and without copying gameplay semantics into Story Format JavaScript.

## 14. Self-review / merge decision

Self-review confirmed:

- no authored Narrative Project schema change;
- no A52 artifact v1 or A53 save v1 change;
- no canonical Guard/Move/effect/simulation semantic change;
- no editor provider, Undo/Redo or persistence ownership added to the Player;
- no generated Passage persistence;
- no gameplay implementation in Story Format JavaScript;
- development transport is separate from player saves;
- standalone artifact bytes remain the exact compiler serialization;
- A52 compiler proof remains validation-only.

**Decision:** A54 implementation is VERIFIED and ready for merge review. Merge remains blocked until explicit authorization. After merge, the exact resulting `93-days-editor` SHA must pass the branch gate before A55 starts.
