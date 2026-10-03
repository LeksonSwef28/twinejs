# A51 Change Record — S1 closure / CI run #427

Change ID: **A51-S1-CI-427**  
Stage / Requirement: **A51-S1 baseline stabilization / REQ-001..009 evidence gate**  
Risk: **HIGH**  
Verified source SHA: `af2ffcf8ef4973be6f0755e629c93f02b6f4978c`  
Verified workflow run: `93 Days Branch Check #427` / run id `35111187737`  
Verified job: `verify` / job id `104845007934`

This record closes the stabilization loop opened by `93DAYS_A51_CHANGE_RECORD_CI_422.md`. The #422 record remains historical evidence of the original red baseline and must not be rewritten as if that run had passed.

## Problem / evidence

The A51 baseline was blocked at `Run test suite`. A diagnostics-only CI change preserved `jest-ci.log` and coverage under `if: always()`, which exposed the exact E0 evidence:

1. `preview-laboratory-panel.test.tsx` searched for `/occurrence-/`, while the real canonical runtime occurrence rendered by the laboratory uses the stable `occurrence:...` format (observed `occurrence:promise:accepted:...`).
2. Invalid preview input validation threw from inside the React `setScenarios` functional updater. The surrounding `run()` try/catch had already returned, so the intended validation error escaped instead of being rendered in the panel.

The failing diagnostic run reported 1 failed / 323 passed suites, with 2 failed tests out of 2066 total.

## Contract decision

- Runtime occurrence identity is canonical runtime provenance and is not renamed to satisfy a stale UI matcher.
- Invalid test-only preview input must remain rejected atomically and the authoring laboratory must surface that validation error without mutating the scenario.
- No coverage threshold, exclusion, runtime semantics or authoring invariant may be weakened to obtain green CI.

## Minimal patch

- `PreviewLaboratoryPanel.replaceActive()` now computes the transformed active scenario synchronously before scheduling the state replacement, allowing `run()` to catch application validation exceptions and render them as laboratory errors.
- The provenance UI regression assertion now checks the real `occurrence:promise:accepted...` runtime ID format.
- The diagnostics CI step remains available: `set -o pipefail`, Jest output through `tee`, and always-uploaded log/coverage artifact.

The two root-cause commits after the diagnostics commit changed only the panel helper and the single provenance assertion (9 diff lines across 2 files when compared with the diagnostics SHA).

## Verification evidence

Exact-head run #427 on `af2ffcf8ef4973be6f0755e629c93f02b6f4978c` completed successfully:

```text
checkout/setup             PASS
npm ci                     PASS
production dependency audit PASS
lint                       PASS
web build                  PASS
Electron main build        PASS
Jest + coverage            PASS
Vite smoke                 PASS
Electron smoke             PASS
```

Jest summary from the preserved green artifact:
- Test Suites: **324 passed, 324 total**
- Tests: **2001 passed**, 23 skipped, 42 todo, 2066 total
- Snapshots: 0

## Self-review

Reviewed against `93DAYS_ENGINEERING_CHANGE_PROTOCOL.md` Step 6 and `93DAYS_A51_ARCHITECTURE_VERIFICATION.md`:

- canonical runtime logic remains delegated to existing resolver/effect/simulation APIs;
- preview source isolation and no authoring/live-runtime dispatch remain covered;
- invalid operations remain atomic;
- unset Actual Presence serialization fix remains present;
- authored Move/Outcome definitions remain unchanged through sandbox action chains;
- no coverage thresholds or exclusions were weakened;
- no new A51-S2+ feature slice was mixed into the S1 root-cause patch;
- no open PR review threads were present at S1 closure review;
- rollback remains focused: revert the diagnostic/fix commits before integration if required.

No known S1 blocker remains hidden behind the green suite.

## Gate status

| Gate | Status | Evidence |
|---|---|---|
| E0 Evidence | **PASS** | exact failures captured in preserved Jest diagnostics |
| E1 Scope | **PASS** | A51 ownership/boundaries documented |
| E2 Contract | **PASS** | runtime provenance + validation behavior classified against invariants |
| E3 Verification design | **PASS** | application contracts + UI regressions + full gate |
| E4 Minimal patch | **PASS** | focused helper fix + truthful matcher correction |
| E5 Verification ladder | **PASS** | exact-head run #427 fully green |
| E6 Self-review | **PASS** | critical diff/boundaries reviewed; no known S1 blocker |
| E7 PR/CI | **PASS for S1** | PR #24 mergeable; exact S1 SHA green |
| E8 Merge | **BLOCKED / NOT REQUESTED** | A51 stage continues with S2+; no merge performed |
| E9 Post-merge | **N/A** | not merged |
| E10 Learning/recovery | **PASS** | diagnostics channel now preserves exact future Jest evidence |

## Next permitted action

Advance to **A51-S2 — Progressive disclosure + human-readable diagnostics** while preserving all S1 invariants and keeping the full gate green between slices.

Bookkeeping commits made after the verified S1 SHA are new exact heads and must receive their own CI verification before further feature work.