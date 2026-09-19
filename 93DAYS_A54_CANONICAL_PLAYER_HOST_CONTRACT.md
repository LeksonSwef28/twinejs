# A54 Contract — Canonical Player Host & Standalone Packaging

Status: **ACTIVE / S3 VERIFICATION**  
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
- E4 Minimal implementation: **PASS — S1/S2 / S3 TEST CLOSURE**
- E5 Exact-head verification: **PASS — S1 #483, S2 #484 / S3 PENDING**
- E6 Self-review: **PENDING**
- E7 PR/CI: **PENDING**
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
