# A68-C1 — PACKAGED QA EVIDENCE AND COVERAGE

Status: **ENGINEERING PACKAGED SMOKE PASS / HUMAN UX WALKTHROUGH PENDING**
Updated: **2026-10-08**
Verified stable baseline: `93-days-editor@82a9bb711ae547fec8b6ec15b5bde107a775fc3e`

## Evidence ledger

- PR [#73](https://github.com/LeksonSwef28/twinejs/pull/73): merged; selected A68-C1 direct/forum packaged smoke.
- [Branch Check #850](https://github.com/LeksonSwef28/twinejs/actions/runs/37744639271): exact PR head `eea3d279ed74de58ce81e03f9f40618439b875bd`, GREEN on all four CI jobs.
- [Branch Check #851](https://github.com/LeksonSwef28/twinejs/actions/runs/37749146081): post-merge stable `82a9bb711ae547fec8b6ec15b5bde107a775fc3e`, GREEN on all four CI jobs.
- Windows workflow job ID: `windows-qa-portable-smoke`. Its QA executable is built with `electron-builder.qa.config.js`, launched on a GitHub-hosted Windows runner and uploaded as the `93-days-qa-windows-portable` Actions artifact after smoke succeeds.
- Entry points: `scripts/smoke-qa-portable.ps1` launches the packaged executable; `scripts/smoke-qa-player.cjs` connects to its actual Electron renderer and exercises the Canonical Player through UI controls.

## Exact smoke coverage

1. Open packaged QA Editor, create a clean Story, load and compile the A68-C1 production project, and open its standalone Canonical Player.
2. Confirm Player readiness and exercise save/continue.
3. For each source path, start with cold Day 1 Player arrival and travel through the authored station-to-dorm route.
4. Advance **Days 2–7 using repeated Player wait buttons** to reach the Day 8 opportunity. The intermediate week's individual Story events are **not** played scene by scene.
5. On Day 8 travel to Computer Club and choose either (a) direct administrator conversation or (b) mediated forum reading, then save/continue.
6. On Day 9 return to the dorm and explicitly choose to tell dorm duty about the information.
7. On Day 10, direct history exercises the familiar administrator follow-up. Forum-only history checks that the personal follow-up does **not** become available without established familiarity.

The direct and forum histories are separately covered. This is a selected A68-C1 causal-path smoke, **not** a complete `Day 1–10` narrative walkthrough. Its UI waits advance the real Simulation Playhead through normal Player controls; they do not mutate runtime state or substitute Editor Preview for Player.

## What this evidence does not prove

- A67 Day 2–7 scene-by-scene coherence and pacing; separate canonical runtime integration tests exist, but are not a continuous packaged UI playthrough.
- Human comprehension, emotional pacing, choice clarity, or a human A67/A68-C1 acceptance verdict.
- Complete combinatorial branch coverage, a clean-machine human tester run, or full close-and-relaunch save restoration.
- Public distribution readiness, signing/notarization, formal security/privacy review, or a finalized GPL distribution analysis.
- A69 production-scale performance.

## Current gates and next action

- **A67:** engineering PASS; human week-level UX walkthrough PENDING.
- **A68-C1:** engineering PASS (including this packaged smoke); human UX walkthrough PENDING.
- **A68-C2:** NOT SELECTED until findings from a real human C1 walkthrough.
- **A69:** PROPOSED / FOUNDATION READY; production-scale measurement gate not executed.

Download the QA artifact from the successful #851 Actions run while it remains available. Run the independent Windows human walkthrough using `A68_HUMAN_WALKTHROUGH_PROTOCOL.md`; record findings in `A68_PLAYTEST_FINDINGS.md`. Do not promote CI smoke logs into human UX evidence.
