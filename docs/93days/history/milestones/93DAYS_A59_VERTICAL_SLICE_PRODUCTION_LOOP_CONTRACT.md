# A59 Contract — Vertical Slice Closure & Content Production Loop

Status: **DONE / MERGE REVIEW READY**  
Stage: **A59 — Vertical Slice Closure & Content Production Loop**  
Risk: **MEDIUM**  
Stable source: `93-days-editor` @ `22ff1e408f48455e7125b3dec65ad5393700992a`  
Feature branch: `feature/a59-vertical-slice-production-loop`  
Decision date: **2026-09-21**

## 1. Evidence boundary

A58 is merged into stable and post-merge verified by **93 Days Branch Check #566 GREEN** on exact stable SHA:

`22ff1e408f48455e7125b3dec65ad5393700992a`

Post-merge evidence:

- production audit: 0 vulnerabilities;
- 367/367 Jest suites;
- 2175 passed, 23 skipped, 42 todo;
- Chromium canonical Player smoke: 6/6;
- Vite smoke: PASS;
- Electron smoke: PASS;
- separate Jest / Playwright / ESLint / Prettify workflows: GREEN.

Repository evidence also shows that A59 must reuse, not rebuild, the existing production tools:

- Story Brain already provides read-only Focus / Impact / Why / Coverage / Bridges analysis;
- Story Brain diagnostics already navigate findings back to Story or WORLD/TIME sources;
- Preview Laboratory already supports isolated runtime inputs, forks, authored Move execution, forced authored outcomes and downstream scenario comparison;
- A58 already provides a real compiled Player path through money, purchase, packing, food, digestion, paid transport, sleep and save/restore;
- A57 already provides divergent Knowledge / relationship / missed-event histories and Day Two reflection.

The remaining A59 gap is therefore **proof + production workflow**, not another gameplay or analysis engine.

## 2. Goal

Prove that the current editor/runtime stack is ready to produce more game content efficiently.

The stage must establish one traceable loop:

`author canonical content -> validate/analyze -> inspect alternatives -> compile -> play real slice -> record observation -> classify defect/content need -> navigate back to authored source`

A59 is complete when new vertical-slice content can be added mainly through canonical authoring data and existing editor tools, with runtime code changes reserved for confirmed mechanics gaps.

## 3. Scope

A59 may add:

- real-slice integration/regression tests;
- Story Brain evidence tests against the actual 93 Days slice;
- Preview Laboratory evidence tests against the actual 93 Days slice;
- source-navigation evidence for real slice diagnostics;
- authoring checklists/templates and validation budgets;
- structured playtest observation / triage documentation;
- narrowly-scoped presentation or tooling fixes only when a reproduced A59 proof exposes a real defect.

A59 must not proactively add new gameplay mechanics.

## 4. Risk rule

A59 is **MEDIUM** only while it stays in tests, read-only diagnostics, sandbox Preview, documentation and local presentation/tooling fixes.

If evidence requires changing any canonical runtime semantics, persistence format, compiler format, save contract, Move/effect semantics or authored/runtime ownership boundary, implementation stops and the affected slice is reclassified **HIGH** before that change.

## 5. Full slice closure proof

One named A59 regression must cover the vertical-slice definition of done using the canonical A58 project.

The proof must demonstrate, directly or through existing canonical application APIs:

1. fresh compiled artifact and player-world bootstrap;
2. arrival Actual Presence;
3. meaningful world time;
4. player movement;
5. an actually present NPC;
6. choice-driven conversation;
7. Knowledge consequence;
8. relationship consequence;
9. optional Story occurrence executed or explicitly missed;
10. material resource purchase/spend;
11. real container packing;
12. food/body consequence;
13. canonical elapsed-time consequence;
14. independent NPC occurrence without protagonist presence;
15. route to lodging;
16. sleep and Day Two wake;
17. Day Two action reflecting Day One history;
18. Player save;
19. restore;
20. continued canonical action after restore with prior history preserved.

The regression must use the same canonical content builders/runtime APIs as the Player; it must not duplicate a mini runtime inside the test.

## 6. Story Brain evidence

A59 must prove Story Brain explains at least two real player-visible consequences from the 93 Days slice.

Required evidence:

- a real A57/A58 Move or Day Two reflection action can be focused;
- WHY exposes the relevant availability/guard evidence from current runtime state;
- Impact/Focus links the Move to its Story/Knowledge/character dependencies;
- project/focus diagnostics remain read-only;
- if a diagnostic has a source target, existing source-navigation resolves to the canonical authoring workspace/entity.

No A59-specific duplicate dependency graph is allowed.

## 7. Preview evidence

A59 must prove the existing Preview Laboratory is useful for real content iteration.

At minimum:

- create a preview scenario from canonical 93 Days authored content;
- reproduce one meaningful choice or branch;
- fork an alternative;
- execute or force only existing authored outcomes;
- compare scenarios;
- show at least one meaningful downstream runtime difference relevant to the slice;
- leave the source project unchanged.

Forced Preview outcomes are test/inspection tools only and never become Player gameplay behavior.

## 8. Authoring production kit

A59 must add a compact production guide/checklist covering the canonical surfaces required by this slice:

- characters and cognition/profile references;
- locations/scenes;
- routine/schedule inputs;
- Story nodes and placement/runtime policy;
- Moves, Guards, resolution and Outcomes;
- Knowledge/Claims;
- relationships;
- items/containers/food properties;
- economy offers/fares when needed;
- optional/missed events;
- delayed consequences / Day Two reflection;
- compiler validation;
- Story Brain inspection;
- Preview scenario inspection;
- Player regression;
- save/restore;
- source navigation.

Templates must describe **what to author and verify**, not create a second serialized content format.

## 9. Validation budget

A59 must define a practical validation ladder for content production.

Minimum budget:

### Per authored change
- reference/structural validation;
- focused Story Brain diagnostics;
- focused Preview trace or scenario when branching logic changes;
- affected unit/content test.

### Per content batch
- deterministic compile;
- real Player integration regression;
- save/restore regression if runtime history is affected;
- lint/type/build.

### Before merge
- full exact-head Branch Check;
- self-review;
- source-navigation/traceability check;
- truthful roadmap/change record.

The workflow should favor focused local checks before expensive full CI.

## 10. Playtest observation workflow

A59 must define a compact observation record with:

- observation ID;
- exact build/SHA;
- route/history used;
- expected player experience;
- observed player experience;
- evidence/reproduction;
- classification: `content | presentation | tooling | runtime-mechanics`;
- severity;
- canonical source owner;
- proposed next action.

Rules:

- an observation is not automatically a runtime bug;
- anecdotal friction must not trigger architecture rewrites without reproduction/evidence;
- a confirmed mechanics gap becomes a separately scoped runtime change;
- content/presentation defects should be fixed at their owning layer.

At least one first-pass A59 playtest/engineering-playthrough observation set must be recorded and triaged.

## 11. A59 invariants

- **A59-I01** — Narrative Project remains the only authored narrative source of truth.
- **A59-I02** — Story Brain remains read-only.
- **A59-I03** — Preview remains an isolated sandbox and never mutates the source project.
- **A59-I04** — A59 adds no second gameplay/runtime engine.
- **A59-I05** — Player proof uses canonical application/runtime APIs only.
- **A59-I06** — authoring templates/checklists do not become a second content schema.
- **A59-I07** — source navigation resolves to existing canonical workspaces/entities rather than copied documentation anchors.
- **A59-I08** — playtest findings are evidence-classified before implementation.
- **A59-I09** — runtime mechanics changes require an explicit re-scope/reclassification.
- **A59-I10** — no hidden gameplay RNG is added.
- **A59-I11** — artifact format/version and project schema version stay unchanged unless a separately approved HIGH-risk decision says otherwise.
- **A59-I12** — A58/A57 histories remain valid and unchanged by analysis tooling.

## 12. Minimal slices

### A59-S1 — Vertical-slice Definition-of-Done regression

Deliver:

- one canonical arrival -> Day Two -> save/restore -> continue regression;
- explicit coverage of Knowledge, relationship, optional Story history, economy, food/body, container and independent NPC occurrence;
- no production runtime changes unless the regression exposes a confirmed defect.

Gate:

- focused test GREEN;
- neighboring A57/A58 regressions GREEN;
- exact-head Branch Check GREEN.

### A59-S2 — Real Story Brain + Preview production evidence

Deliver:

- Story Brain test(s) against canonical 93 Days content/runtime state;
- Preview fork/compare test against canonical 93 Days content;
- source-navigation evidence for at least one real slice diagnostic or authored source.

Gate:

- existing Story Brain/Preview invariants preserved;
- source project immutability proved;
- exact-head Branch Check GREEN.

### A59-S3 — Production kit + first triage loop

Deliver:

- authoring checklist/templates;
- validation budget;
- source-navigation workflow;
- first structured playtest/engineering-playthrough observation set with evidence-based classification;
- A59 change record / roadmap closure;
- full exact-head CI.

Gate:

- no unresolved BLOCKER/HIGH issue;
- PR merge-review ready only after closure exact-head GREEN.

## 13. Explicit non-goals

A59 does not implement:

- new economy depth;
- jobs/wages;
- phone/SMS/forum systems;
- new injury mechanics;
- new NPC autonomy engine;
- a new Story Brain;
- a new Preview engine;
- telemetry/analytics service;
- large Player UI redesign;
- 93-day content expansion;
- final city/naming/price decisions.

Those belong to A60+ or separately evidenced mechanics work.

## 14. Recovery

A59 should be mostly additive tests/docs/read-only evidence.

Recovery path:

- revert A59 tests/docs/tooling additions;
- stable A58 gameplay remains intact;
- no authored project migration is expected;
- no save/artifact compatibility rollback should be required.

If A59 uncovers a genuine runtime defect, the repair gets its own explicit regression and recovery note.

## 15. Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS**
- E5 Verification ladder: **PASS — closure head `03f1a13a2a96bf3741fe4c7ecd7d0ab35de72ded`, #580 GREEN**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS for closure — #580 GREEN; final status-only exact-head CI still required before PR readiness**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**


## 16. Implementation verification evidence

### A59-S1

Exact head:

`3f3350ff67908107f5ecb937bd6c174979b1d3e7`

**93 Days Branch Check #568 — GREEN**

- 368/368 Jest suites;
- 2176 passed, 23 skipped, 42 todo;
- Chromium 6/6;
- audit 0 vulnerabilities;
- Vite/Electron PASS.

### A59-S2

Exact head:

`ed401708b69980429db2d5cac69090835a88d7b9`

**93 Days Branch Check #570 — GREEN**

- 369/369 Jest suites;
- 2179 passed, 23 skipped, 42 todo;
- Chromium 6/6;
- audit 0 vulnerabilities;
- Vite/Electron PASS.

The prior #569 failure was isolated to a new test variable reference and did not indicate a production/runtime defect.

### A59-S3 implementation

Exact head:

`4ce6d143ab1bb20740503051893f1a8ff3f691da`

**93 Days Branch Check #576 — GREEN**

- 370/370 Jest suites;
- 2183 passed, 23 skipped, 42 todo;
- Chromium 7/7;
- audit 0 vulnerabilities;
- Vite/Electron PASS.

This head proves the player-facing save/reload/continue gap is closed using the existing canonical save codec.

## 17. S3 production kit

A59 adds:

- `93DAYS_A59_CONTENT_PRODUCTION_KIT.md`
- `93DAYS_A59_PLAYTEST_OBSERVATIONS.md`
- `93DAYS_A59_CHANGE_RECORD.md`

These documents define the authoring/validation/source-navigation loop and classify the first playthrough observations without creating a second content or runtime schema.

A final exact-head Branch Check is still required after closure documentation is complete.


## 18. Closure verification

Documentation/closure head:

`03f1a13a2a96bf3741fe4c7ecd7d0ab35de72ded`

**93 Days Branch Check #580 — GREEN**

- production audit: 0 vulnerabilities;
- lint / web build / standalone Player build / Electron main build: PASS;
- 370/370 Jest suites;
- 2183 passed, 23 skipped, 42 todo, 2248 total;
- 0 snapshots;
- Chromium canonical Player smoke: 7/7;
- Vite smoke: PASS;
- Electron smoke: PASS.

A59 is complete through the pre-merge closure gate. This status-only documentation update must itself retain exact-head GREEN before PR #32 is marked Ready for review.
