# A60 Contract — Phone / SMS & Flexible Social Contact Loop

Status: **ACTIVE / CONTRACT LOCKED**  
Stage: **A60 — Phone / SMS & Flexible Social Contact Loop**  
Risk: **MEDIUM** with explicit HIGH re-scope triggers  
Stable source: `93-days-editor` @ `787db91868c7ce4f7c52795ac03ce7bf44f105cc`  
Feature branch: `feature/a60-phone-social-loop`  
Decision date: **2026-09-21**

## 1. Evidence boundary

A59 is merged and post-merge verified on exact stable SHA `787db91868c7ce4f7c52795ac03ce7bf44f105cc`.

Post-merge evidence — **93 Days Branch Check #584 GREEN**:

- production audit: 0 vulnerabilities;
- 370/370 Jest suites;
- 2183 passed, 23 skipped, 42 todo, 2248 total;
- Chromium canonical Player smoke: 7/7;
- Vite smoke: PASS;
- Electron smoke: PASS;
- separate Prettify / ESLint / Jest / Playwright workflows: GREEN.

Repository evidence:

- the player already owns a concrete button phone tagged `phone` + `communication`;
- A57 already models an outgoing call as a canonical Narrative Move guarded by `character-has-item`;
- exact scheduled Story work already supports locationless events;
- Story state/history already distinguishes completed vs missed/blocked paths;
- Moves already mutate Knowledge, relationships, memories and Story state;
- A59 Player save/reload/continue already preserves canonical runtime history.

The first social-contact loop therefore starts by reusing Story/Moves/Outcomes, not by adding a message engine.

## 2. Current canon / era

Current project source precedence fixes the playable summer in **2000**.

A60 design constraints:

- button-phone interaction;
- calls and SMS;
- mobile ownership matters socially but is not universal;
- no smartphone patterns, read receipts, group-chat ecosystem or mobile-map assumptions;
- city forums/computer-club internet remain a separate future system;
- telecom tariffs remain unmodeled until a setting-specific research decision exists.

## 3. Goal

Prove one scalable social loop:

`incoming contact -> read/answer -> agreement/decline -> travel/time -> physical meeting or miss -> later social consequence`

The loop must remain explainable by Story Brain, comparable in Preview, playable through the canonical Player and persistent through save/reload/continue.

## 4. Scope / risk rule

A60 stays **MEDIUM** while it adds:

- canonical authored content;
- optional Story communication metadata;
- read-only/derived Player phone projection;
- presentation;
- tests.

Stop and reclassify the affected slice **HIGH** before adding any of:

- mutable inbox/read/contact/delivery runtime collections;
- new persistence runtime fields;
- save/artifact/schema version change;
- background auto-execution of communication;
- a second scheduler/dialogue engine;
- new generic world-time condition semantics.

## 5. A60-S1 — Content-only social loop proof

Before phone-specific UI, prove the semantics using existing runtime.

Required content:

1. Day Two locationless scheduled incoming SMS, one-shot and zero duration.
2. Player + social contact participants.
3. Reading/executing the scheduled work records canonical Story history.
4. A reply Story becomes available only after the incoming SMS is completed.
5. Reply Moves require the player to possess the canonical phone.
6. At least accept / decline branches.
7. Accept opens a physical evening meeting at a real location with a finite miss window.
8. Meeting executed vs missed creates different canonical history.
9. A later action/consequence distinguishes accepted+met / accepted+missed / declined.
10. Save/restore preserves the branch.

S1 must not add communication-specific runtime state.

## 6. A60-S2 — Minimal authored communication metadata

Only after S1 semantics are proven, add optional metadata to canonical Story:

```ts
communication?: {
  channel: 'sms' | 'phone-call';
}
```

Rules:

- metadata changes presentation, not runtime ownership;
- exact Story placement/runtimePolicy remain the timing/miss source;
- Story title/description remain authored visible content;
- participants/primary character remain canonical social references;
- old projects without the field remain compatible;
- no hidden title/tag naming convention is used as message semantics.

Story Metadata authoring must support the field through existing undoable `story/updateAuthoring`.

Locationless communication is remote communication: Story Brain must not interpret it as requiring physical scheduled co-presence. Communication with an authored location still receives normal WORLD/TIME physical diagnostics.

## 7. A60-S3 — Derived Player phone surface

Phone availability is derived from canonical carrying state:

- resolve the player's carried top-level + contained items;
- resolve ItemDefinition tags;
- a carried item tagged `phone` makes the phone surface available;
- never hardcode `arrival-button-phone-1`.

Derive communication state from existing Story/runtime history:

- due, unconsumed one-shot SMS -> unread;
- opening SMS -> existing Story execution -> completed/read;
- SMS normally has no miss window;
- due phone-call inside its miss window -> ringing;
- expired/missed phone-call -> missed-call history;
- consumed communication is represented by canonical runtime occurrences.

Communication Story opportunities are excluded from generic `Событие рядом` once the phone surface exists.

Player actions delegate to existing Story/Move application APIs only.

## 8. Contact-list rule

First attempt a **derived** phonebook from non-dormant communication evidence and handled communication history.

Do not leak dormant/future authored contacts.

Do not add `knownContacts[]` runtime state merely for UI convenience. A dedicated contact-discovery contract is justified only by authored cases that cannot be represented safely by existing Knowledge/history.

## 9. Flexible-time rule

Use existing Story exact start + `missAfterMinutes` first.

Do not add a generic world-time Guard merely to support different arrival shades. If authored content later requires outcome selection based on exact lateness inside the valid window, record a reproduced mechanics gap and scope that condition separately.

## 10. A60-S4 — First social destination loop

Use one modest social destination, preferably a dorm courtyard/common area, before canonizing a major bar/social hub.

The loop must connect:

- one contact;
- one phone invitation;
- one route/location;
- one flexible meeting;
- one relationship/Knowledge/memory consequence;
- one missed-event consequence;
- one later social echo.

## 11. Invariants

- **A60-I01** — Narrative Project remains authored truth.
- **A60-I02** — communication reuses Story/Moves/Outcomes.
- **A60-I03** — schedules never write Actual Presence automatically.
- **A60-I04** — remote communication never requires shared location.
- **A60-I05** — outgoing/reply phone actions require possessed phone unless explicitly authored otherwise.
- **A60-I06** — missed meetings are alternate histories, not generic quest failures.
- **A60-I07** — runtime occurrences remain provenance where sufficient.
- **A60-I08** — no second save/message/runtime engine.
- **A60-I09** — no hidden RNG.
- **A60-I10** — forum/internet-club systems stay out of scope.
- **A60-I11** — historical telecom tariffs are not invented as game facts.
- **A60-I12** — new mutable communication state requires explicit HIGH-risk re-scope.

## 12. Verification ladder

### Per authored change

- structural/reference validation;
- focused Story Brain WHY;
- Preview branch comparison where applicable;
- focused content/runtime test.

### Per slice

- deterministic compile;
- canonical Player integration;
- save/reload/continue where history changes;
- compatibility checks;
- lint/type/build;
- exact-head Branch Check.

### Before merge

- self-review;
- exact-head full Branch Check GREEN;
- truthful change record/roadmap;
- explicit merge authorization;
- post-merge exact stable verification.

## 13. Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 S1 implementation: **PENDING**
- E5 S2 metadata/presentation: **PENDING**
- E6 S3/S4 Player/social loop: **PENDING**
- E7 Self-review / PR CI: **PENDING**
- E8 Merge: **PENDING — explicit authorization required at merge time**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**
