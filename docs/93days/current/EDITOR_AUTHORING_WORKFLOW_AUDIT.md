# Editor Authoring Workflow — independent-feedback integration and first audit

Status: **DECISIONS RECORDED / STATIC SOURCE AUDIT STARTED / HUMAN AUTHORING TRIAL PENDING**  
Date: **2026-10-12**  
Audited stable baseline: `93-days-editor@f649481e2b1208fa143bb53850112847902095e1`  
Scope: **the authoring environment**, not investment readiness, a gameplay-engine rewrite, or the release readiness of the 93-day game.

## 1. Product decision — what we are building

The immediate product is a **PC-based narrative authoring environment**, developed from TwineJS, for safely writing and maintaining large nonlinear, simulation-aware stories. `93 дня до конца нашего лета` is its demanding real-world use case and eventual game, not a reason to prioritize arbitrary gameplay/runtime expansion over author experience.

A writer should be able to define/edit characters, scenes, dialogue, choices, relationships, knowledge with provenance, world/time, locations, routines, and consequences; understand dependencies; safely experiment, save, recover, import/export; and verify work in the canonical Player **without programming ordinary content**.

The core author loop is:

`create/edit -> validate/explain -> preview in context -> inspect dependencies -> save/restore -> compile/export -> play -> revise`.

Success for this audit is measured by **the writer's ability to complete that loop reliably**, not PR count, number of game days, or presence of a large number of features.

The first user is the project creator; other non-programmer writers should be able to use the tool later. Keep the current canonical Narrative Project, deterministic mechanics, Story Brain, and authored/editor/runtime separation. They are existing assets to expose more clearly, not systems to duplicate.

## 2. Independent feedback — accepted directions, NOT implementation mandates

Input: multiple independent opinions from writers, programmers, designers and non-specialists collected on 2026-10-12. These are **design suggestions**, not verified code defects or automatic requirements.

### Strong recurring needs

1. **Writing-first / progressive disclosure**: a calm scene-focused view; context, Story Brain, graphs, calendar and diagnostics on demand; explain issues in ordinary language.
2. **Context and causality**: show who is present, what a character could know, why a Story/Move is or is not available, and what downstream content may depend on a change.
3. **Safe authoring**: recoverable edits, named snapshots/compare/restore, safe rename/delete, impact preflight, portable backups.
4. **Usable characters**: one author-facing workflow for initial relations, knowledge, memory, routine and explainable evolution; do not make the author edit low-level runtime state.
5. **Dynamic rather than exclusively passage-to-passage connections**: local typed dependency views; executable conditions and runtime history matter as well as visual reference edges.
6. **Import/export contracts**: distinguish author-editable project backups, runtime artifacts, and future interoperability with other engines. Round-trip before promising compatibility.
7. **Scale / collaboration readiness**: measure actual UI/indexing cost; document future merge needs, but do not impose a new storage model without proof.
8. **Controlled AI assistance (future)**: AI may draft/explain/propose. No silent writes to authored truth; every structural change needs explicit author review and acceptance. Deterministic runtime must not depend on live arbitrary LLM improvisation.

### Do NOT silently adopt

- No forced 4-phase clock replacing the existing minute-based world time.
- No new generic NPC scheduler or second gameplay/social engine because a reviewer suggested one.
- No mandatory per-entity JSON storage or engine migration before a proven authoring bottleneck.
- No assumption that JSON by itself executes the same semantics in Unity/Godot/etc.
- Do not block *saving drafts* for all diagnostics: separate safe draft persistence from compilation/export blocking conditions.
- No autonomous AI changes to canon, NPC history or gameplay outcomes.
- Examples about summer camps/directors are brainstorming illustrations, **not** a retcon of the 2000-era city setting.
- Do not replace A67/A68 human Player UX evidence with an authoring-tool review: both gates remain distinct.

## 3. Source audit baseline — implemented vs incomplete

These observations are from the cited code at the audited SHA; **no manual GUI trial has been performed by this audit**.

| ID | Evidence / existing owner | Assessment | Confidence |
|---|---|---|---|
| EA-01 | `src/components/narrative/workspace/{story-workspace,world-time-workspace,narrative-move-panel,routine-authoring-panel,schedule-exception-authoring-panel}.tsx` | Major STORY/WORLD-TIME and condition/effect authoring surfaces **exist**; their end-to-end usability for a non-programmer is still **unverified** | CODE + UX UNKNOWN |
| EA-02 | `src/application/narrative/story-brain-query.ts`; `src/application/narrative/project-search.ts` | Story Brain offers Why/Impact/Coverage queries; search indexes entities and implements typed `projectBackReferences`. A new generic impact engine is **not justified** without a concrete failure case | CODE |
| EA-03 | `src/store/narrative-project/reducer.ts`; `narrative-project-context.tsx` | Authoring undo/redo exists; `past/future` initialize as empty arrays at app load. Persistent named cross-session history is **not established** | CODE |
| EA-04 | `narrative-project-context.tsx` and `repository.ts` | Narrative Project is saved in localStorage, debounced by 500 ms; `saveStatus` can be error. Test crash/close and user-facing backup/restore behavior; do **not** claim an atomic disk-file save | CODE |
| EA-05 | `recoverable-repository.ts` and `repository.ts` | Recovery avoids the corrupt-load -> blank-project -> autosave failure; recognized legacy v1/v2 payloads are read/hydrated toward v3. It is **wrong** to say migration/recovery is absent. Future schema migration policy + real round-trip coverage remain an audit item | CODE |
| EA-06 | `src/domain/narrative/project.ts`, `src/store/narrative-project/persistence-projection.ts` | Canonical `schemaVersion: 3` and separate authored/editor/runtime projections exist. `hostStoryId` binds a Narrative Project to a host Twine story; cross-host import must be verified, not presumed | CODE |
| EA-07 | `src/components/narrative/workspace/narrative-export-panel.tsx`, `src/application/narrative/export-compiler.ts` | Runtime artifact JSON and publishing/HTML routes exist. **A reproducible full author-editable project package and its round-trip import are not yet established by this review.** Runtime export != source-project backup | CODE / FULL ROUND-TRIP UNKNOWN |
| EA-08 | `src/application/narrative/project-search.ts` | Backreferences exist but are finite, typed traversals (Story, Move, Character, Location, Claim, Fact, Item etc.). Before any destructive edit, test whether every *relevant* authored dependency is shown; never advertise exhaustive impact without coverage proof | CODE / COVERAGE UNKNOWN |
| EA-09 | `src/application/narrative/commands.ts` and `src/store/narrative-project/reducer.ts` | `story/removeNode` and `move/remove` commands exist. Comprehensive cross-entity safe-delete, archive, entity merge, cross-project dependency remap **not verified** | CODE / UX UNKNOWN |
| EA-10 | `docs/93days/current/SYSTEM_STATUS.md` | Initial relationship authoring, initial knowledge UI, unified character inner-world workflow are explicitly **PARTIAL** | DOCUMENTED |
| EA-11 | `src/domain/narrative/content/93-days-first-week.ts` and `93-days-computer-club-cycle.ts` | Important production fixture content is assembled using TS builders. This is a **reason to test** whether the same ordinary edits are possible via UI, not proof that UI authoring is impossible | CODE |
| EA-12 | `docs/93days/current/ROADMAP.md` | A45/A50 synthetic load fixtures, canvas culling and WORLD/TIME virtualization already exist. Real-content A69 authoring/performance proof remains unperformed | DOCUMENTED |

### Important distinctions

- **CODE** means mechanism exists in source; it does not automatically prove good UX.
- **DOCUMENTED** is the present repo status and still subject to verification.
- **UNKNOWN** is not a confirmed defect. Do not mark it P0 or implement a speculative subsystem.
- The package/saving/impact review is **not** a substitute for a clean-machine/manual GUI authoring trial.

## 3a. A77 — source snapshot export slice (2026-10-12)

Status: **IMPLEMENTED ON FEATURE BRANCH / CI AND MANUAL DOWNLOAD PENDING** (update only after evidence).

The Export/Compiler authoring UI now offers **`Снимок Narrative Project JSON`**, an explicit human-readable snapshot of the current `narrative-project-projections-v1` envelope with the editable **authored, editor and runtime projections**. This is independent of successful gameplay compilation, so an incomplete draft can be saved for inspection. It does not invoke any authoring/runtime commands. In project recovery mode the download is disabled: the fallback must never be mistaken for the user's damaged original.

**Scope warning:** this is **NOT** a self-contained project transfer or a restorable story package. The `hostStoryId` remains bound to its Twine host; the snapshot excludes its host Story/passages. There is currently **no user-facing source-snapshot import/restore path**. The full backup + cross-host round-trip in W6 is still open. The user must separately export their Twine Story if needed; do not promote A77 as completed backup/restore.

Verification contracts introduced: projection-preserving JSON round-trip, no mutation during serialization, compile-blocked download, and recovery disabled state. The remaining proof is a real download/file inspection on an independent authoring install.

## 3b. A78 — guarded same-host source restore slice (2026-10-12)

Status: **IMPLEMENTED ON FEATURE BRANCH / CI AND HUMAN FILE-ROUND-TRIP PENDING**.

The A77 source snapshot can now be **selected, parsed and previewed in EXPORT / COMPILER**. The UI explicitly confirms the project name and counts, and requires a checked author confirmation before restoration. It refuses invalid JSON, compiler/runtime artifacts, incomplete projection envelopes, incompatible schema/template, different host Story identity, a nonblank authored project, or a blank project with nonempty Preview/runtime history.

**Safety boundary:** restore is limited to a **blank Narrative Project already attached to the very same host Twine Story ID** and the same current schema/template; no auto-migration, cross-host import, silent overwrite or partial merge. It reuses the existing explicit project replacement boundary, which resets session undo history. If recovery is active, file selection is disabled. A78 therefore enables a useful narrow restore but **does not** close the general W6 portable-project round trip (host Story/passages are still outside the snapshot), named revisions, or full recovery from a damaged storage profile.

Unit/UI tests cover preflight accept/reject, unchanged existing project, confirmation gate and correct replace callback. Independent manual source-file export/import and save/reopen verification is still required before changing the W6 evidence status.

## 3c. A79 — safe Story node deletion preflight (2026-10-12)

Status: **IMPLEMENTED ON FEATURE BRANCH / CI + HUMAN AUTHOR TRIAL PENDING**.

The Story inspector checks canonical dependencies before allowing deletion of a Story node. It lists impacted connections, owned/other Moves (including guard/outcome references), reaction sets, authored definitions, and runtime occurrences/state references. References are resolved conservatively: a match blocks deletion rather than silently rewriting a different author's content. Duplicate Canvas representations of a canonical node are deliberately excluded from blockers and are removed together with the canonical node only when no dependencies exist.

**Critical defense in depth:** `story/removeNode` checks the same preflight in the reducer, not only the button. A direct command cannot silently cascade-remove connected narrative data. A referenced node is preserved unchanged, with no undo-history entry. An isolated node is still deletable and undoable. This is a deliberately **strict interim policy**; it does not introduce a full safe-refactor/rewire wizard, and it does not imply the existing Project Search/Story Brain references are exhaustive.

Verification: unit tests for isolated deletion, Story connections, other/owned Move dependencies, runtime overrides and missing-node no-op; UI integration checks that blocked deletion explains at least the linked Story to the author. Manual author trial W3 and detailed per-reference navigation remain open.

## 3d. A80 — actionable Story dependency references (2026-10-12)

Status: **IMPLEMENTED ON FEATURE BRANCH / CI AND HUMAN UI WALKTHROUGH PENDING**.

The A79 Story removal preflight now includes **navigation to the linked Story node** where a canonical destination exists. Story connections also have a deliberate **two-step unlink** action in the inspector. `story/disconnect` removes exactly one selected Story connection, never its endpoint nodes, authored Moves or runtime state; in-session Undo restores the edge. The pending confirmation is cleared when inspected Story focus changes; no unlink occurs on the first click. Navigation reuses existing authoring focus/viewport plans and does not advance simulation time.

Only typed Story connections receive direct unlink controls. For Moves, the preflight may navigate to a different owning Story, but does not silently rewrite Move guards or delete the Move. Other dependency types retain an explanatory blocker until a dedicated safe edit workflow is proven.

**Still open:** non-Story dependency navigation/refactoring, complete W3 human author trial, full rename impact and dependency coverage review. A80 does not claim exhaustive reference detection or a general refactor wizard.

## 4. First reproducible audit — author workflow trial

Test on a **separate/replaceable Story or a backed-up copy**; never overwrite the user's real production story to run this experiment. Record app version, SHA, platform, project/host IDs, time spent, UI steps, errors, and whether manual TS/JSON edits were necessary.

| Trial | Steps | PASS / evidence |
|---|---|---|
| W1 — author content | Through the UI only, create a new location, two characters, a routine and a scene with a choice, guard and relationship/knowledge consequence | Reopen all authored definitions in the UI; compile succeeds or records an actionable documented limitation; **no TS edits** |
| W2 — explain causality | Before/after changing a guard or a character's initial knowledge, use Story Brain Why/Impact and Project Search/backreferences | Author can answer *why available*, *where the dependency is*, *what changes*; identify any unreported use |
| W3 — safe edit | On a disposable clone, rename an entity, then attempt to remove a Story/Move referenced elsewhere | No silent broken references; user can preview relevant references and recover edit; any missing preflight is a *finding*, not an assumed implemented feature |
| W4 — persistence | Save, wait for explicit saved state, close, reopen; then test undo/redo in-session and look for a prior-session snapshot | Authoring survives reopen. Document **explicitly** whether prior-session history exists (not required for simple save PASS) |
| W5 — recovery | On a disposable profile, exercise invalid/corrupted project payload and recoverable repository behavior using existing test fixtures | Corrupt payload is backed up; fresh autosave is blocked pending intentional reset; no destructive test on real author data |
| W6 — round-trip | Compare author backup/host Story export, canonical runtime-artifact JSON, HTML publish; try a complete author-editable project transfer between clean Story/profile instances | Verify *exactly* which format round-trips authored/editor data and references; do not claim runtime artifact is an author backup |
| W7 — scale | Time open/search/diagnostics/scroll/render/export on real authored content, then on existing synthetic scale fixtures | Baseline measures captured before modifying indexing or canvas |

**For each finding:** `ID | reproduction | expected | actual | surface/owner | source evidence | severity | priority | proposed smallest fix | verification`.

Pass categories: `VERIFIED UI`, `CODE-CONTRACT ONLY`, `MANUAL PENDING`, `REPRODUCED DEFECT`, `FUTURE CANDIDATE`.

### How to interpret W1 honestly

The current A68 production starter lets the author load and play a pre-authored TypeScript-composed fixture. **Loading that starter is not evidence that a non-programmer can author the same content through the UI.** Do not inflate authoring coverage by using fixture injection.

## 5. Risk-focused finding backlog (triage, not committed implementation)

| Finding | Priority to investigate | Current next proof |
|---|---|---|
| AF-01 — non-programmer end-to-end authoring friction | HIGH | W1 + UI walkthrough, time/steps, missing author controls |
| AF-02 — cross-session recovery/snapshots and backup fidelity | HIGH | W4–W6, backup/restore on disposable data |
| AF-03 — deletion/rename impact preflight completeness | HIGH | W2–W3 for Story, Move, Character, Claim and Location |
| AF-04 — full project import/export and schema round-trip | HIGH | W6, matrix of outputs vs owned data |
| AF-05 — initial relationships / character inner-world authoring | HIGH | W1; compare UI with documented PARTIAL fields |
| AF-06 — visible dynamic causality / contextual diagnostics | MEDIUM | W2 author comprehension, extend existing Story Brain where needed |
| AF-07 — calm writing layout, quick capture, local focused graph | MEDIUM | UX feedback + timed writing task, no global UI rewrite |
| AF-08 — editor scale / search CPU / history memory cost | MEDIUM | W7; optimize measured bottleneck only |
| AF-09 — cross-project partial imports and multi-author merge | LATER | Define safe import/dependency-remap requirements after source round-trip |
| AF-10 — AI proposer with explicit author acceptance | LATER | Separate opt-in concept review; no automatic authored changes |

## 6. Engineering next-step gate

1. Publish this **first static audit** as a traceable baseline; link it from the current source of truth. This does *not* close W1–W7.
2. Execute W1, W2, W4, W6 first on a disposable project. These give the most information about author experience and source-data safety.
3. Triage each reproduced finding by the **existing owner**. Implement the smallest change with a regression test rather than creating a parallel system.
4. Before altering persistence/import, test the old stored payload formats, failure paths and project/host identity, and retain a reversible backup.
5. Continue A67/A68 human **Player** acceptance separately. Do not claim it closed through editor tests; do not select A68-C2 based only on this audit.

**Completion condition for the present audit:** evidence-backed W1–W7 results, explicit owner/priority per real gap, and a narrow implementation order agreed from actual author workflow pressure. This document is the starting ledger, not a declaration of completion.
