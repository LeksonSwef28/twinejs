# 93 Days — A46 Upstream Integration & Stabilization Readiness

Date: 2026-09-13

## Scope

A46 stabilizes the long-lived `93-days-editor` branch against the current `develop` branch after the gameplay/domain stages A33–A45. It does not add a new gameplay system. Its purpose is to prove that the existing Narrative Editor and Living Simulation architecture still works after a real upstream synchronization and current toolchain upgrade.

## Upstream synchronization

- Upstream `develop` synchronized at `7ee47c0db47746d656f976a3ed5791f14de9f52c`.
- The synchronization is a real two-parent merge, not a cosmetic history marker: merge commit `1ea3a4f63c5e0312394b2c8a38fb8208163f2ab5` uses the current `develop` tree as its base and overlays the intentional 93 Days changes.
- The sync incorporated the 26 upstream commits that were outside the feature branch's previous merge base.
- Post-stabilization comparison reports `93-days-editor` as `behind: 0` relative to `develop`.
- GitHub reports PR #1 as mergeable.

## Architecture invariants preserved

The upstream merge and stabilization changes preserve the non-negotiable architecture boundaries:

- exactly two top-level workspaces remain: STORY and WORLD/TIME;
- Split View remains a lens, not a third workspace;
- View Cursor remains separate from Simulation Playhead;
- Scheduled Presence remains separate from Actual Presence;
- authored Story definitions remain separate from runtime Story state;
- authored effect definitions remain separate from applied runtime effects;
- due work remains declarative until explicit execution;
- runtime simulation does not rewrite authored Story placement as a shortcut;
- runtime/playtest updates remain isolated from authoring Undo/Redo history.

## Dependency and runtime compatibility

The synchronized upstream dependency set includes the current Twine 2.12.0 toolchain used by `develop`, including Electron 43.4.1, Jest 30.4.2, Vite 8.2.2, TypeScript 4.9.5 and electron-builder 26.15.3.

The first post-merge CI runs exposed an `EBADENGINE` mismatch: the updated Electron/tooling dependency graph requires Node 22.12 or newer in places while the inherited workflows were still executing on Node 20. A46 therefore standardizes the relevant 93 Days, ESLint, Jest and Playwright workflows on Node 22.12.0. The complete branch verification succeeds on that runtime.

Residual metadata item: `package.json` still advertises `engines.node >=20`. A future dependency-maintenance change should update the manifest and lockfile coherently rather than silently changing package metadata during this stabilization stage. CI is intentionally stricter and now tests the supported Node 22.12 runtime.

## Story Edit and Playwright migration

The branch intentionally replaces the stock passage-map Story Edit surface with the 93 Days Narrative Workspace. Therefore the inherited passage-map Playwright smoke tests no longer represented the product being developed.

A46 replaces those obsolete smoke assumptions with end-to-end contracts for the actual Narrative Editor:

- first-run/welcome persistence still works;
- creating a Twine story opens the 93 Days Narrative Editor;
- STORY and WORLD/TIME are the only top-level workspaces;
- selected workspace state persists after save/reload;
- Split View does not become a third workspace;
- Playtest / Debug opens the Living Simulation surface;
- Simulation Playhead controls are present inside the playtest surface.

Two stabilization failures were locator ambiguities, not product regressions: `Play` also matched surrounding Playtest/Playhead controls, and `+5 мин` existed both in Story View Cursor navigation and Simulation Playhead stepping. They were fixed with exact/scoped Playwright locators. This preserves and tests the architectural distinction between authoring navigation and runtime simulation instead of hiding it.

## Regression evidence

The final code stabilization head before this document is `94e5c959db09e725a936c145571910030791e858`.

On that head:

- `93 Days Branch Check` run #320 passed dependency install, lint, web build, Electron-main build, full Jest/coverage suite, Vite smoke and Electron smoke;
- upstream `Jest Tests` run #6 passed;
- upstream `ESLint` run #6 passed;
- upstream `Playwright Tests` run #6 passed across the configured browser projects with the Narrative Editor smoke contracts;
- upstream `Prettify PRs` run #6 passed.

The branch had already passed the same full 93 Days verification on the first Node 22.12 stabilization head (#319); the final pass additionally includes the fully scoped Playwright contracts.

## PR readiness

At the code-stabilization head, PR #1 is:

- open;
- draft;
- not merged;
- mergeable according to GitHub;
- based on current `develop` with `behind: 0`;
- intentionally large (129 changed files at the readiness audit).

The PR remains draft on purpose. A46 makes it integration-ready for continued review and development; it does not authorize merging it into `develop`.

The PR description must explicitly disclose that this is no longer a small foundation patch: it contains the Narrative Workspace replacement for Story Edit, the authored/runtime persistence split, Story/runtime execution, NPC decision/action economy, memory/cognition, body/injury/carrying systems, Living Simulation playtest/debug tooling, and the 93-day scale/performance gates.

## A46 conclusion

A46 is complete once the documentation-closing commit itself passes the final branch/PR CI. The code stabilization target is already green, synchronized with `develop`, and preserves the architecture boundaries established in A33–A45.
