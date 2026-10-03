# 93 Days — A66-S2 Windows Electron Start Contract

Change ID: **A66-S2**
Stage: **local Windows authoring workflow**
Base: `93-days-editor@80c2218e01447f74cec29f4e6c5493c863e313b8`
Date: **2026-09-29**

## Goal

Make the documented local Electron authoring command work from ordinary Windows PowerShell / cmd without requiring Bash:

`npm.cmd run start:electron`

while preserving the existing macOS/Linux behavior and the current Electron development semantics.

## Proven blocker

Stable currently defines:

`start:electron = NODE_ENV=development npm-run-all ...`

npm scripts are executed by a platform-dependent shell. On Windows the default shell is `cmd.exe`, where the POSIX prefix `NODE_ENV=development command` is not valid.

The existing 93 Days Branch Check does not cover this path:

- the workflow runs on `ubuntu-latest`;
- its Electron smoke invokes `start:electron:boot` directly;
- therefore the shell portability of `start:electron` is not exercised.

The PowerShell execution-policy issue around `npm.ps1` is separate. The supported Windows fallback remains `npm.cmd`.

## Scope

A66-S2 is a launch-workflow fix, not an Electron architecture change.

Candidate implementation:

- add `cross-env` as a development dependency;
- change only the environment prefix of `start:electron` to:
  `cross-env NODE_ENV=development ...`;
- preserve the existing `npm-run-all` clean/build/boot sequence;
- document the Windows `npm.cmd` commands and the existing backup warning;
- add explicit Windows verification so this path cannot silently regress.

## Required invariants

The change must not:

- alter Narrative Project data;
- alter runtime/save/artifact schemas;
- change Electron story-directory behavior;
- change production packaging;
- remove the existing backup warning;
- replace `start:electron:boot` ownership;
- require PowerShell execution-policy changes.

## Acceptance

1. Windows shell can set `NODE_ENV=development` through the project-owned npm command without the POSIX assignment failure.
2. macOS/Linux keeps the same development environment and command sequence.
3. existing Linux Branch Check remains GREEN.
4. Windows verification uses Node 22.12+ / npm 10+ and explicitly proves the development environment can be propagated with the same project dependency.
5. README gives a copy-paste Windows path:
   - `npm.cmd install` (or `npm.cmd ci` when using the lockfile exactly);
   - `npm.cmd run start:electron`.
6. The warning to back up the Twine Stories folder remains prominent.

## Verification strategy

Test-first / evidence-first:

- first add a Windows CI probe against the current stable-style environment assignment and record the expected failure;
- then make the smallest script/dependency change;
- require Windows probe GREEN plus the complete existing Ubuntu Branch Check;
- do not claim local Windows authoring is fixed from Ubuntu-only evidence.

## Out of scope

- installer/release packaging on Windows;
- code signing;
- changing Electron persistence locations;
- PowerShell policy modification;
- Story/Player UX changes;
- performance tuning;
- replacing npm-run-all.

## Merge gate

A66-S2 must end with:

- Windows-specific GREEN evidence;
- complete ordinary Branch Check GREEN on the exact head;
- clean diff limited to launch workflow, dependency lock, documentation, verification;
- separate explicit merge authorization.
