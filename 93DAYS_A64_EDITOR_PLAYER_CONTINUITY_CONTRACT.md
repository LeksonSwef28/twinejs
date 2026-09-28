# 93 Days — A64 Editor → Player Continuity Contract

Change ID: **A64**
Stage: **Editor-to-Player continuity / cold Day 1 → Day 4 acceptance**
Risk: **MEDIUM initially; HIGH only if a runtime boundary must change**
Base: `93-days-editor@8967fdf8ea327b5355a29175171cc7b233065645`
Source state: A63 runtime is already stable; docs-only PR #37 is intentionally not part of this branch.
Date: **2026-09-28**

## 1. Goal

Prove that the same canonical Narrative Project authored/exported by the adapted TwineJS can be compiled into the A52 runtime artifact, opened by the canonical Player, and played continuously from the cold Day One start through observable Day Four consequences.

A64 is a continuity/acceptance stage. It MUST NOT add new gameplay semantics merely to make the acceptance test pass.

## 2. Evidence from the stable tree

Confirmed on exact stable base:

- `NarrativeExportPanel` reads the current project from `useNarrativeProject()`.
- `prepareNarrativeStoryExport(project, hostStory)` compiles exactly that project through `compileNarrativeRuntimeArtifact(project)`.
- `Открыть Player` sends that exact compiled artifact through the existing one-shot development handoff.
- standalone packaging embeds the same runtime artifact into the dedicated Player HTML shell.
- `NarrativeProjectProvider` loads a persisted project by host Story id; with no persisted project it creates a generic empty `NarrativeProject`.
- `create93DaysPlayerNpcSocialDeliveryProject()` contains the current A63 production content chain, but the fresh editor bootstrap does not select that builder by itself.
- the existing A63 Chromium E2E proves the Day Three Player behavior from a programmatically prepared Day Three runtime; it is not a cold Day One → Day Four proof.

Therefore the first suspected gap is **content/bootstrap selection at the editor boundary**, not the compiler or Player runtime.

## 3. Required continuity

The accepted production chain is:

`Narrative Project -> validate/Story Brain -> A52 compiler -> runtime artifact v1 -> A53 materialization/save -> A54/A55 Player -> canonical runtime APIs`

There must be no second authored graph and no alternate Player-only content source.

## 4. A64 slices

### A64-S1 — AS-IS export/bootstrap audit

Status: **PASS**

The exact owners above are identified. No code change is required to establish the current behavior.

### A64-S2 — Use Case Gate

Status: **IN PROGRESS**

The use cases and expected observable outcomes live in `93DAYS_A64_USE_CASE_GATEBOOK.md`.

No new core code is allowed in this slice.

### A64-S3 — cold Player acceptance

Add a real browser regression that:

1. compiles the exact A63 builder from authored Day One state;
2. boots the normal standalone Player without replacing `initialRuntime` with a later save;
3. reaches Day Two through Player UI;
4. covers at least one complete meeting branch through Day Three A63 08:00/08:15 delivery;
5. exercises direct answer or explicit silence;
6. crosses into Day Four and observes the corresponding authored consequence;
7. proves Save/Continue in the continuous path;
8. adds narrow negative/alternative tests where a single full browser branch would be wasteful.

A failure must be classified before any fix: **content / presentation / tooling-bootstrap / runtime**.

### A64-S4 — minimal reproduced-gap fix

Only a failure reproduced by S3 may authorize implementation.

If the failure is editor bootstrap/content selection, the fix belongs at that boundary. If the A63 builder already plays cold Day One → Day Four in the Player, no Player/runtime rewrite is allowed.

## 5. Acceptance branches

Minimum evidence:

- **met**: accept Day Two meeting and complete it;
- **missed**: accept but miss it;
- **declined**: decline beforehand;
- Day Three A63 report remains exact-time and Actual-Presence-based;
- direct Day Three answer and silence remain distinct;
- Day Four consequence is observable;
- save/restore never duplicates one-shot social work.

One branch MUST be continuous in Chromium from cold Day One to Day Four. Other combinations may use narrower integration tests if they exercise the same canonical APIs and preserve provenance.

## 6. Invariants

- Narrative Project is the single authored source.
- A52 artifact format/version remains unchanged unless a separately proven compatibility need exists.
- fresh runtime consequences are never copied from Editor/Preview.
- Scheduled Presence never becomes Actual Presence implicitly.
- no hidden RNG.
- no second clock.
- no global rumor queue.
- no generated Passage graph becomes authored truth.
- rejected operations remain atomic.
- old artifacts do not silently opt into A63 semantics.
- A64 does not merge without a new explicit user message `мердж`.

## 7. Definition of Done

A64 is DONE only when:

- the production project selected for export is explicit and testable;
- a cold Day One A63 artifact reaches an observable Day Four consequence through the canonical Player;
- alternative histories and replay safety have regression evidence;
- any reproduced gap is fixed at its real owner with a minimal diff;
- exact feature-head Branch Check is GREEN;
- a fresh explicit merge authorization is received;
- the exact post-merge stable SHA passes the post-merge gate.

## 8. Recovery

A64 acceptance tests/docs are additive. Any bootstrap/UI adapter introduced by S4 must be independently revertible without migrating authored persistence, changing artifact v1, or removing the stable A63 runtime.
