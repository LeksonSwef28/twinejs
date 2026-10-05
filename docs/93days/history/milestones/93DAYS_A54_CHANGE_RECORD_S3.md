# 93 Days — A54-S3 Change Record

Change ID: **A54-S3**  
Stage / Requirement: **A54 — Canonical Player Host & Standalone Packaging / browser-package closure**  
Risk: **HIGH**  
Exact implementation SHA: `c7ac8c91edf893071255a8fd0753955235890712`  
PR: **#27 — A54: canonical player host and standalone packaging**

## Problem / requirement

A54 must prove that the A53 player session can boot through a dedicated browser Player entry without the editor application and that both supported artifact-source paths work in a real browser:

- editor development launch -> dedicated Player window;
- standalone Player HTML -> embedded exact runtime artifact.

## Expected

- exact serialized A52 artifact reaches A53 unchanged apart from JSON transport;
- dedicated Player boots a canonical session;
- no editor providers/routes are required;
- development handoff is temporary and not a save/persistence model;
- standalone artifact data is embedded in Player HTML without copied gameplay logic;
- failures are visible and atomic.

## Evidence / reproduction

S1 exact head `f3b836308bd5fe0c8be6d583fa3c53531d615062` passed **#483 GREEN**.

S2 exact head `0abb73b02f3104ff21e2c4c84b2b1033b276035f` passed **#484 GREEN**.

S3 browser gate intentionally exposed defects before closure:

- **#486 FAIL** — first browser test used a same-document hash transition instead of the production new-window launch; reproduction was corrected.
- **#487 FAIL** — production-shaped new-window test did not boot from the `sessionStorage` handoff; standalone embedded artifact boot passed.
- **#488 FAIL** — same-origin one-shot `localStorage` mailbox still failed in development path; standalone path again passed. Inspection found the destructive mailbox read/removal inside `PlayerApp` render under `React.StrictMode`.
- **#489 GREEN** after moving artifact-source consumption to the player entrypoint before React render.

## Root cause

**CONFIRMED.**

There were two separate test/host issues:

1. the initial browser regression did not reproduce the production new-window launch shape;
2. the production Player performed a destructive one-shot artifact read during React rendering. Under development `React.StrictMode`, repeated render evaluation could observe the mailbox after it had already been consumed.

The transport was also made explicitly cross-window by using a same-origin temporary `localStorage` mailbox. Player consumption removes the value immediately; failed popup launch removes it on the editor side.

## Affected boundaries

- dedicated player entry;
- browser artifact-source adapter;
- development editor -> player handoff;
- standalone package embedding;
- Narrative Export launch/download surface;
- A54 CI/browser smoke.

## Must not change

- authored Narrative Project schema;
- A52 artifact v1 shape;
- A53 player save v1 shape;
- canonical Move/effect/simulation semantics;
- editor Undo/Redo or Narrative persistence;
- A52 validation-only compiler proof;
- generic Story Format publisher semantics.

## Regression / verification

Workflow **#489 GREEN** on exact implementation SHA `c7ac8c91edf893071255a8fd0753955235890712`:

- 0 production dependency vulnerabilities;
- lint PASS;
- web build PASS;
- standalone player build PASS;
- Electron main build PASS;
- **345/345 Jest suites**;
- **2093 passed tests**, 23 skipped, 42 todo, 2158 total;
- 0 snapshots;
- Chromium Player smoke **2/2 passed**;
- Vite smoke PASS;
- Electron smoke PASS.

The Chromium tests prove both:

- ephemeral development handoff -> new dedicated Player window -> canonical runtime ready;
- embedded exact artifact -> standalone Player -> canonical runtime ready.

## Minimal patch / ownership result

The final player flow is:

`exact artifact -> inline or development source -> one-time source resolution -> A54 host JSON boundary -> A53 materializer -> canonical TypeScript runtime`

No second mechanics engine was introduced.

## Rollback / roll-forward

No authored data or save migration exists in A54.

Rollback is code-only: revert the A54 player entry/host/package/export additions and retain A53 as the stable runtime boundary. Existing legacy Story Format export and A52 compiler proof remain available.

## Gate state

- E0 Evidence: **PASS**
- E1 Scope: **PASS**
- E2 Contract: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS**
- E5 Verification ladder: **PASS — #483 / #484 / #489**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS for implementation — PR #27 open, draft and mergeable**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Learning/recovery: **PASS**

**Decision:** A54 implementation is verified and ready for merge review. This closure documentation commit must receive its own exact-head branch gate before merge authorization can be acted on.
