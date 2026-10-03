# 93 Days — A66-S3 Isolated Electron Dev Profile Contract

Change ID: **A66-S3**
Stage: **safe local Electron authoring**
Base: `93-days-editor@dd7c259a75586f7ceff2f0f7ddb33e455a06737d`
Date: **2026-09-30**

## Goal

Make `npm run start:electron` safe for local development by defaulting the
development Electron process to a repository-local profile instead of the
normal Twine user folders.

## Proven friction

The current Electron startup path loads normal application preferences and,
unless explicitly overridden, derives mutable paths from Electron's ordinary
`userData` and `documents` locations.

That means development Electron can currently reach the normal user's:

- `prefs.json` and `app-prefs.json` through `userData`;
- Stories through `Documents/Twine/Stories`;
- Backups through `Documents/Twine/Backups`;
- Scratch files through `Documents/Twine/...`;
- user CSS through `Documents/Twine/...`.

`initApp()` also creates/backs up the selected story directory during startup.

README warning + manual backup is useful, but it is not isolation.

## Architecture decision

Use one development-only root owned by the launcher:

`.twine-dev-profile/`

The launcher exports an **absolute** `TWINE_DEV_PROFILE_ROOT` for the Electron
process.

Before `loadAppPrefs()`, Electron main startup applies that root by redirecting
the two existing Electron path owners:

- `userData -> <root>/user-data`
- `documents -> <root>/documents`

This intentionally reuses existing path derivation. Story, backup, scratch, user
CSS and JSON preference code must not gain parallel development-only storage
logic.

## Required startup order

`applyDevelopmentProfile() -> loadAppPrefs() -> initHardwareAcceleration() -> app.whenReady()`

The profile must be applied before preferences are loaded because
`loadAppPrefs()` reads `app-prefs.json` synchronously from `userData`.

## Activation contract

Isolation applies only when both are true:

1. `NODE_ENV === 'development'`;
2. `TWINE_DEV_PROFILE_ROOT` is a non-empty absolute path.

Packaged/production Electron behavior remains unchanged when the development
profile variable is absent.

## Launcher contract

`scripts/start-electron-dev.cjs` must:

- resolve `.twine-dev-profile` from repository root;
- set `TWINE_DEV_PROFILE_ROOT` before the build/boot chain;
- preserve the A66-S2 portable launch order;
- report both `NODE_ENV=development` and the absolute development profile root
  in side-effect-free `--check` mode.

## Repository hygiene

`/.twine-dev-profile/` must be ignored by Git.

## Test-first acceptance

Before production implementation, RED tests must prove current stable lacks the
profile contract:

1. `start-electron-dev.cjs --check` must report an absolute
   `TWINE_DEV_PROFILE_ROOT` ending in `.twine-dev-profile`;
2. Electron main startup source must apply the development profile before
   `loadAppPrefs()`;
3. `/.twine-dev-profile/` must be present in `.gitignore`.

The first test commit is expected RED.

## Planned implementation ownership

A small Electron main-process helper may own profile application. It may create
the two target directories synchronously before calling `app.setPath()`, since
startup must complete before synchronous preference loading.

It must not own Story/Backup/Scratch semantics.

## Safety proof

A later green test must directly verify that development profile application:

- redirects `userData`;
- redirects `documents`;
- runs before `loadAppPrefs()`;
- does nothing outside the explicit development-profile contract.

## Out of scope

- changing production Electron storage;
- changing Story/Backup/Scratch path derivation;
- changing save or runtime formats;
- changing Narrative Project semantics;
- choosing arbitrary external dev folders in UI;
- installer/package changes.

## Verification trail

- **#693 EXPECTED RED** on test-only head `cbb5f0639216283ca24c9371964b9f2b81c23edc`:
  - Windows A66-S2 launch contract: PASS;
  - install / audit / lint / web / Player / Electron builds: PASS;
  - Jest: 379 existing suites PASS, only the new A66-S3 suite FAIL;
  - 2243 existing tests PASS, exactly 3 new A66-S3 assertions FAIL;
  - exact missing contracts:
    - launcher did not report `TWINE_DEV_PROFILE_ROOT`;
    - main startup did not call `applyDevelopmentProfile()` before `loadAppPrefs()`;
    - `/.twine-dev-profile/` was not ignored.
- Production implementation introduced:
  - launcher-owned absolute repository-local `.twine-dev-profile`;
  - `TWINE_DEV_PROFILE_ROOT` propagation into Electron;
  - `applyDevelopmentProfile()` before app preference loading;
  - `userData -> <root>/user-data`;
  - `documents -> <root>/documents`;
  - Git ignore for `/.twine-dev-profile/`;
  - direct helper tests for redirect, production/no-root no-op, and relative-root rejection.
- **#697 FAIL / harness RCA**:
  - Windows launch contract: PASS;
  - production builds: PASS;
  - product helper source remained unchanged after RCA;
  - failures were limited to test infrastructure:
    - launcher test split output using escaped literal `\\r/\\n` instead of real newlines;
    - the shared manual `fs-extra` mock lacked `mkdirpSync`.
- **#698 GREEN** on exact head `8b93f73380804ea51c167802d395e9f07e7078b1`:
  - Windows launch contract: PASS;
  - Windows `--check` output includes both `NODE_ENV=development` and an absolute `TWINE_DEV_PROFILE_ROOT` ending in `.twine-dev-profile`;
  - audit: 0 vulnerabilities;
  - Jest: 381/381 suites, 2250 passed, 23 skipped, 42 todo;
  - Chromium: 14/14;
  - Vite smoke: PASS;
  - Electron smoke: PASS.

## Result

**PASS pending documentation-only exact-head recheck.**

A66-S3 isolates development Electron from the normal user profile by redirecting
Electron's existing `userData` and `documents` roots before preferences load.
Existing Story, Backup, Scratch, user CSS and JSON preference path owners continue
to derive from those roots; no parallel persistence system was added.

Production/packaged behavior remains unchanged when the explicit development
profile contract is absent.

A final exact-head Branch Check is required after this documentation
synchronization. Merge remains separately gated.
