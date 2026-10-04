# A67 — WEEK-LEVEL PLAYTEST FINDINGS

Status: **ENGINEERING PASS / HUMAN UX WALKTHROUGH PENDING**
Updated: **2026-10-04**
Branch: `test/a67-cold-player-closure`
Base stable: `955b560c3d02d861371de1532aab2823ac5cec5b`

## Method

This closure pass separates two forms of evidence:

1. **Canonical-control engineering walkthrough** — cold Player session using only Player travel, wait, Story work and Move actions. No direct test-only mutation of Player/NPC Actual Presence is allowed in the acceptance history.
2. **Human UX playtest** — presentation clarity, pacing and whether consequences are understandable without reading implementation state.

The first is automated in this branch. The second cannot be replaced by unit/integration tests and remains a distinct observation task if engineering proof passes.

## Walkthrough target

Cold history:

- Day 1: bus station → transport square → station stop → dormitory using authored routes.
- Day 2: receive SMS and decline the meeting in advance.
- Day 3: inherited A63 NPC delivery occurs at its authored time.
- Day 5: depart dormitory and arrive at Old Market while authored NPC arrival runs independently.
- Day 6: travel Old Market → Old Cinema, attend the city-change line, then return to the dormitory.
- Day 7: reach the week-end reflection through Player presentation/actions.

## Findings

### RUNTIME — cold-path proof previously incomplete

**Status: PASS**

Earlier focused A67 tests used a local `place()` helper to establish Actual Presence before testing individual scenes. That is valid for focused state tests but did not by itself prove the roadmap gate “cold Player reaches Day 7 through canonical controls.”

The closure test removes direct presence mutation from the acceptance history and uses authored travel plus production due-work. Exact-head Branch Check #37180243828 passes.

### PRESENTATION / RUNTIME — Day 7 clock-time visibility

**Status: FIXED / PASS**

The Day 7 week reflection is authored at 11:00. Player action presentation filters Story placement by day, while the current reflection Move is guarded by Story state `available` rather than an active Story occurrence.

Finding confirmed: the reflection Move could become visible from the start of Day 7 because Player actions filtered Story placement by day while the Move only required Story state `available`.

Fix: the week reflection is now scheduled one-shot Story work, and its branch Moves require Story state `active`. The cold-path regression verifies the action is absent at 10:59, the Story opportunity appears at 11:00, and the reflection becomes actionable only after that Story work begins.

### TOOLING — first-week ordinary authoring

**Status: PASS**

PR #50 includes a canonical authoring rehearsal over the real first-week project: Claim, Routine, Story metadata, Story placement, Move/effect, undo/redo and runtime artifact compilation are exercised without direct fixture mutation.

### CONTENT — two legitimate histories

**Status: PASS**

The first-week content has distinct Old City and dorm histories, different Claims/memories/Story state, and missed-event later evidence.

## Closure rule

Engineering closure status:

- **PASS** — cold canonical-control history;
- **PASS** — Day 7 authored-time visibility;
- **PASS** — post-merge stable regressions on `955b560c…` (Jest/ESLint/Playwright/Prettify);
- **PASS** — exact-head closure Branch Check #37180243828;
- **PASS** — findings classified with no known P0/P1 engineering blocker.

Formal A67 closure still requires one manual Player UX/pacing walkthrough. That observation can create follow-up CONTENT/PRESENTATION defects, but automated engineering evidence is not labeled as a human playtest.
