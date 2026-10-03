# 93 Days — A66-S2 Windows Electron Launch Contract

Change ID: **A66-S2**
Stage: **local Windows authoring workflow**
Base: `93-days-editor@80c2218e01447f74cec29f4e6c5493c863e313b8`
Date: **2026-09-29**

## Goal

Make the documented Electron development command:

`npm run start:electron`

portable across Windows PowerShell / cmd and POSIX shells without changing Electron runtime semantics.

## Proven friction

Stable currently defines:

`NODE_ENV=development npm-run-all --serial clean --parallel build:web build:electron-main --serial start:electron:boot`

as the `start:electron` package script.

The leading `NAME=value command` environment assignment is POSIX shell syntax. It is not a portable npm-script contract for ordinary Windows cmd / PowerShell use.

The current 93 Days Branch Check runs on Ubuntu only. Its Electron smoke invokes `start:electron:boot` directly, so it does not exercise or prove the documented `start:electron` path on Windows.

## Architectural boundary

A66-S2 is launch tooling only.

It must not change:

- Narrative Project data;
- Story/runtime behavior;
- Player behavior;
- Electron main-process behavior;
- save/artifact formats;
- authoring mechanics.

## Implementation contract

Replace shell-specific environment assignment with a Node wrapper:

`npm run start:electron -> node scripts/start-electron-dev.cjs`

The wrapper must:

1. set `NODE_ENV=development` inside Node;
2. preserve the existing launch order:
   - clean;
   - `build:web` and `build:electron-main` in parallel;
   - `start:electron:boot`;
3. use the already-installed `npm-run-all` programmatic API;
4. propagate failures with a non-zero exit code;
5. expose a side-effect-free `--check` mode that proves the wrapper owns `NODE_ENV=development` without building or launching Electron.

No new dependency is required.

## Test-first acceptance

Before production implementation, add a Jest contract test proving:

- `package.json#scripts.start:electron` points to the Node wrapper;
- `node scripts/start-electron-dev.cjs --check` exits successfully and reports `NODE_ENV=development`.

The first test commit is expected to be RED because stable still contains the POSIX shell script and the wrapper does not exist.

## Windows proof

Extend the 93 Days Branch Check with a small `windows-electron-launch-contract` job on `windows-latest`.

The Windows job must run the public npm script through the Windows executable:

`npm.cmd run start:electron -- --check`

and succeed without installing dependencies or launching Electron.

This proves ordinary PowerShell/cmd invocation can execute the documented script without POSIX environment syntax and that the wrapper sets the development environment.

## Safety

The existing README warning remains authoritative: development Electron can touch the Twine Stories folder, so users should back it up before running the real Electron app.

The `--check` mode must never launch Electron or touch story data.

## Out of scope

- packaging Windows installers;
- changing Electron boot behavior;
- moving story storage;
- changing `start:electron:boot`;
- Windows UI automation;
- PowerShell execution-policy changes for `npm.ps1`.

## Verification trail

- **#684 EXPECTED RED** on test-only head `67f653fcc75150ffa05c793649459ee14a19af58`:
  - install / audit / lint / web / Player / Electron builds: PASS;
  - Jest: 379 existing suites PASS, only the new A66-S2 suite FAIL;
  - exact failures:
    - `start:electron` still contained POSIX `NODE_ENV=development ...`;
    - `scripts/start-electron-dev.cjs` did not exist.
- Production implementation introduced:
  - `scripts/start-electron-dev.cjs`;
  - `start:electron -> node scripts/start-electron-dev.cjs`;
  - development environment ownership inside Node;
  - the original clean -> parallel builds -> Electron boot order;
  - dependency-free, side-effect-free `--check` mode.
- **#688 Windows job FAIL / harness RCA**:
  - Windows itself successfully executed `npm.cmd run start:electron -- --check`;
  - command exited successfully and printed `NODE_ENV=development`;
  - only the PowerShell assertion failed because `$output` was an array and `-notmatch` was applied element-wise.
  - product wrapper required no change.
- **#689 GREEN** on exact head `0ca68b145359f0cae9405aaa4c6c6e588d0f6efa`:
  - `windows-electron-launch-contract`: PASS on `windows-latest`;
  - Windows proof executed `npm.cmd run start:electron -- --check` and observed `NODE_ENV=development`;
  - Ubuntu verify: 0 vulnerabilities;
  - Jest: 380/380 suites, 2243 passed, 23 skipped, 42 todo;
  - Chromium: 14/14;
  - Vite smoke: PASS;
  - Electron smoke: PASS.

## Result

**PASS pending documentation-only exact-head recheck.**

A66-S2 removes POSIX-only environment assignment from the public Electron development command without adding dependencies or changing Electron runtime behavior.

Windows PowerShell users also have an explicit documented `npm.cmd` fallback when execution policy blocks `npm.ps1`.

A final exact-head Branch Check is required after documentation synchronization. Merge remains separately gated.
