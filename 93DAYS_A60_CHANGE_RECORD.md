# 93 Days — A60 Change Record

Change ID: **A60**  
Stage: **Phone / SMS & Flexible Social Contact Loop**  
Risk: **MEDIUM**  
Stable source SHA: `787db91868c7ce4f7c52795ac03ce7bf44f105cc`  
Feature branch: `feature/a60-phone-social-loop`  
PR: **#33**  
Implementation closure head: `db0895bb351ba038d32ffc77737d3e84f16bdb19`

## Problem / requirement

A57 had an unanswered phone call, but communication was still presented as an ordinary Narrative Move. The game needed its first scalable early-2000s social loop without introducing a second message runtime:

`phone contact -> SMS -> reply -> travel/time -> physical meeting or miss -> later social consequence`

## Expected

The player should be able to:

- carry/use the existing button phone;
- receive/read an SMS;
- reply through canonical Moves;
- accept or decline a meeting;
- reach a real meeting place;
- attend or miss a flexible meeting;
- observe different Day Three social consequences;
- save/reload/continue with the branch preserved.

Authors should be able to mark Story communication explicitly without creating inbox/read/contact runtime state.

## Root cause / evidence

**CONFIRMED.**

Existing Story scheduling, Story runtime occurrences, Moves, Guards, Knowledge, relationships, memories, Actual Presence and Player saves were sufficient for the social semantics.

The proven gaps were:

1. no explicit authored communication channel metadata;
2. no phone-specific Player presentation over canonical Story history;
3. no authored Day Two phone-to-meeting social content.

No new scheduler, message engine, save format or runtime communication collection was required.

## Implementation

### A60-S1 — content-only social loop

Added canonical content in:

`src/domain/narrative/content/93-days-phone-social-loop.ts`

The loop adds:

- Day Two locationless incoming SMS;
- accept / decline reply Moves;
- dorm courtyard as a modest first social destination;
- a four-hour meeting window;
- explicit Actual Presence proof for the contact at the physical meeting;
- meeting executed vs missed history;
- distinct Day Three consequences for met / missed / declined branches.

Integration proof:

`src/application/narrative/__tests__/a60-phone-social-loop.integration.test.ts`

Exact evidence:

- implementation head after type-only correction: `fe83ef423a7e980a8a39435e50618068811a82fd`
- **93 Days Branch Check #588 — GREEN**
- 371/371 Jest suites;
- 2186 passed;
- Chromium 7/7;
- audit 0 vulnerabilities;
- Vite/Electron PASS.

### A60-S2 — authored communication metadata

Added optional Story metadata:

```ts
communication?: {
  channel: 'sms' | 'phone-call';
}
```

Changed canonical authoring/validation surfaces:

- `src/domain/narrative/story.ts`
- `src/store/narrative-project/routine-authoring.ts`
- `src/components/narrative/workspace/story-metadata-panel.tsx`
- `src/domain/narrative/authoring-analysis.ts`
- `src/application/narrative/export-compiler.ts`

Rules:

- old Story nodes remain valid when the field is absent;
- Story Metadata authoring is undoable through the existing command;
- malformed channels are diagnosed and block compile;
- locationless communication does not produce false physical scheduled-presence diagnostics;
- authored projection/compiler preserve the optional metadata deterministically;
- no project schema, artifact version or Player save version changed.

Exact evidence:

- final S2 head: `ccc122f7f8bc550042455c8905c4eca5c32b2aa9`
- **93 Days Branch Check #597 — GREEN**
- 372/372 Jest suites;
- 2189 passed;
- Chromium 7/7;
- audit 0 vulnerabilities;
- Vite/Electron PASS.

### A60-S3 — derived Player phone surface

The Player now derives phone availability and history from existing canonical state.

Phone availability:

- resolve current `CharacterCarryLoad`;
- inspect carried top-level + contained concrete items;
- resolve ItemDefinition tags;
- any carried item tagged `phone` enables the phone surface;
- no hardcoded `arrival-button-phone-1` dependency.

Phone state is derived from:

- Story communication metadata;
- Story scheduled work;
- Story runtime occurrences;
- current simulation time;
- existing Player Moves.

The projection distinguishes:

- unread SMS;
- read SMS;
- ringing/expired/missed calls when authored;
- handled communication history;
- derived contacts;
- communication-specific actions.

Communication Story work no longer appears in generic `Событие рядом`; communication Moves are removed from generic action presentation and shown through the phone surface.

No mutable inbox/read/contact collections were added.

Player UI changes:

- compact early-phone panel;
- contacts/history;
- SMS reading;
- reply actions;
- canonical Story/Move handlers only.

### A60-S4 — browser/save closure

Standalone Chromium proof covers:

- phone/SMS UI;
- incoming SMS reading;
- reply through phone actions;
- accepted physical meeting;
- explicit local contact presence;
- meeting execution;
- save -> reload -> Continue;
- Day Three continuation;
- accepted-but-missed meeting as a distinct branch.

The first S4 exact-head browser run (#607) had one test-only strict-selector failure: the same contact name was legitimately visible in two UI regions after the phone panel was added.

The locator was scoped to the local-presence `Здесь` panel. No gameplay/runtime fix was required.

Final implementation evidence:

- exact head: `db0895bb351ba038d32ffc77737d3e84f16bdb19`
- **93 Days Branch Check #608 — GREEN**
- production audit: **0 vulnerabilities**
- Jest: **373/373 suites**
- tests: **2192 passed, 23 skipped, 42 todo, 2257 total**
- snapshots: **0**
- Chromium: **10/10 passed**
- Vite: PASS
- Electron: PASS

## Architecture review

Stable-to-head review:

- branch is **25 commits ahead / 0 behind** stable at implementation closure;
- no second scheduler;
- no inbox/delivery/read runtime store;
- no `knownContacts[]` runtime state;
- no new persistence runtime fields;
- no save/artifact/schema bump;
- no copied dialogue resolver;
- no hidden RNG.

New production code is limited to:

- optional authored Story communication metadata;
- communication validation/authoring UI;
- A60 content;
- read-only Player phone projection/presentation.

## Historical framing

A60 preserves the project-era constraint: summer 2000, button phone, calls/SMS, non-universal mobile ownership.

Telecom tariffs remain deliberately unmodeled because setting-specific historical evidence has not yet been locked as game canon.

## Recovery

Rollback is additive:

- revert A60 content/metadata/presentation/tests;
- A59 stable Player/runtime/save behavior remains intact;
- old authored projects need no migration;
- no saved-runtime migration is required.

## Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 S1 implementation: **PASS — #588 GREEN**
- E5 S2 metadata/presentation: **PASS — #597 GREEN**
- E6 S3/S4 Player/social loop: **PASS — #608 GREEN**
- E7 Self-review: **PASS**
- E8 Merge: **AUTHORIZED — user granted merge permission on 2026-09-22; fresh merge gate required immediately before merge**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**

## Current conclusion

A60 has proved the first scalable phone/social loop without introducing a second communication runtime.

Closure documentation is verified by #610 GREEN on `cf468e4c3e1922c27e4503459db5f6503e89bf5d`. Final status-only exact-head `d06f87723543e6ca10fbdc24007252bf13792fc9` passed **#612 GREEN** with 373/373 Jest suites, 2192 passed and Chromium 10/10. PR #33 is Ready for review and merge is authorized subject to a fresh merge gate.


## Closure verification

**93 Days Branch Check #610 — GREEN** on closure head `cf468e4c3e1922c27e4503459db5f6503e89bf5d`.

- production audit: **0 vulnerabilities**;
- Jest: **373/373 suites**;
- tests: **2192 passed, 23 skipped, 42 todo, 2257 total**;
- snapshots: **0**;
- Chromium: **10/10 passed**;
- Vite smoke: PASS;
- Electron smoke: PASS.

No unresolved BLOCKER/HIGH item remains.


## Final pre-merge verification

Final status-only exact head:

`d06f87723543e6ca10fbdc24007252bf13792fc9`

**93 Days Branch Check #612 — GREEN**

- production audit: **0 vulnerabilities**;
- Jest: **373/373 suites**;
- tests: **2192 passed, 23 skipped, 42 todo, 2257 total**;
- snapshots: **0**;
- Chromium: **10/10 passed**;
- Vite smoke: PASS;
- Electron smoke: PASS.

No unresolved BLOCKER/HIGH item remains. Fresh base/head/mergeable/exact-CI verification is required immediately before merge.
