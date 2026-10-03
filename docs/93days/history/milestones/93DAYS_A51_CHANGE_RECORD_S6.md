# 93 Days Narrative Editor — A51 Change Record S6

Status: **S6 CODE VERIFIED / A51 CLOSURE BOOKKEEPING**  
Stage: **A51-S6 — Reproduction metadata**  
Requirement: **REQ-014 reproduction metadata**  
Date: **2026-09-17**

## 1. Goal

Close the final A51 slice without inventing an RNG/replay architecture that the canonical runtime does not own. S6 records and presents only the explicit inputs/results that already determine Preview Laboratory behavior.

## 2. Repository evidence and decision

The canonical Move path is deterministic from sandbox state plus explicit resolver inputs. Skill checks receive caller-supplied `skillValue` and `rollTotal`; automatic/condition resolution does not generate a hidden roll. Repository review found no canonical hidden RNG/seed ownership that S6 could truthfully serialize.

Decision:

- add finite typed reproduction metadata for concrete Preview Laboratory operations;
- keep `Trace only` read-only and derive a read-only trace descriptor rather than appending provenance;
- expose raw metadata only in Deep Debug;
- do not add a seed, random token, hidden dice service, replay cursor or event-sourcing contract;
- keep S5 checkpoint snapshots as the owner of exact historical sandbox state.

The governing contract is `93DAYS_A51_S6_REPRODUCTION_METADATA_CONTRACT.md`.

## 3. Implementation

Contract head:
- `b344618c168e8da590a3e3d7686f1ea3b7a4ed83` — `docs: define A51 S6 reproduction metadata contract`.

Application metadata:
- `1d93361e50461a9130a92c4e4fcbfc6a4c55fc42` — `feat: record A51 reproduction metadata`.
- `src/application/narrative/preview-reproduction.ts` defines the finite metadata union and defensive clone helpers.
- completed actions can record exact typed test inputs, requested/applied advance minutes, Move resolution input/outcome, forced Outcome ids and checkpoint restore id.
- checkpoint restore metadata does not embed the checkpoint snapshot.
- automatic resolution records `{input: {}}`; no RNG/seed field is synthesized.

Deep Debug projection:
- `40ce2fa972839c9e602417f7f8ecd6e43be4d35d` — `feat: expose A51 reproduction metadata in deep debug`.
- `PreviewReproductionDebug` is rendered only in Deep Debug.
- current trace metadata contains scenario id, source action count, Move id, exact explicit resolver input, status and resolved Outcome when present.
- `Trace only` stays read-only and does not append a laboratory action.

## 4. Regression coverage

Application regressions verify:

- exact typed test-input metadata and independence from caller mutation;
- exact `skillValue` + `rollTotal` for resolved skill checks;
- unchanged canonical resolver result while metadata is captured;
- no fabricated seed/random/RNG field for automatic resolution;
- forced Outcome ids;
- requested vs canonical applied advance minutes;
- checkpoint restore id without embedded snapshot;
- JSON serialization stability;
- invalid input remains atomic and appends no misleading metadata.

UI regressions verify:

- Preview and Analysis do not expose raw reproduction metadata;
- Deep Debug does expose it;
- automatic trace shows explicit empty input and no RNG/seed token;
- skill trace shows the exact supplied values;
- Trace only creates no reproduction-history action;
- resolved actions expose structured history;
- authoring `execute` and live `replaceRuntimeProject` remain untouched.

## 5. CI defect trail

The implementation deliberately added a second legitimate textual representation of provenance facts in Deep Debug. Legacy UI tests that used global Testing Library text selectors therefore became ambiguous. Production/runtime semantics were not changed to satisfy them.

### Workflow #450 — RED, test-only selector ambiguity

Head `dc159d057de5be8322fc4eaa724f9711211fb12f` passed install, production audit, lint and both builds, then Jest reported:

- 2 failed / 331 passed suites (333 total);
- 3 failed, 2034 passed, 23 skipped, 42 todo tests (2102 total).

Exact E0 class: global selectors found multiple intentional matches for:

- `"status": "blocked"` — raw Move trace and current trace reproduction metadata;
- `resolved-outcome` — reproduction metadata history and Preview provenance;
- `checkpoint-restore` — reproduction metadata history and Preview provenance.

`764e8e2556fba8934455928ecdf3604b2404de46` scoped those assertions to the semantic panels they were originally intended to verify (`Raw Move trace` / `Preview provenance`). No production file changed.

### Workflow #451 — RED, final remaining selector ambiguity

Head `764e8e2556fba8934455928ecdf3604b2404de46` again passed install, production audit, lint and both builds. Jest improved to:

- 332 passed / 1 failed suites (333 total);
- 2036 passed / 1 failed, 23 skipped, 42 todo tests (2102 total).

Exact E0: the remaining legacy global `/forced-outcome/` assertion matched both reproduction metadata and Preview provenance.

`2aa3e6f63b29ae2f80515ad8e4c09b780b101aeb` scoped that assertion to `Preview provenance`. The commit changes one test assertion only.

## 6. Exact S6 code gate

Final S6 code head:

`2aa3e6f63b29ae2f80515ad8e4c09b780b101aeb`

Workflow **#452 — GREEN**:

- install PASS;
- production dependency audit PASS;
- lint PASS;
- web build PASS;
- Electron main build PASS;
- Jest/coverage PASS: **333/333 suites**, **2037 passed tests**, 23 skipped, 42 todo, 2102 total;
- diagnostics artifact upload PASS;
- Vite smoke PASS;
- Electron smoke PASS.

## 7. Architecture result

S6 preserves all A51 boundaries:

- authored source is unchanged by sandbox work;
- Preview actions do not enter authoring Undo/Redo;
- Preview actions do not replace live runtime;
- canonical resolver/effect/simulation functions remain the sole semantic engine;
- reproduction metadata is finite, typed, JSON-serializable and cloned from mutable caller inputs;
- metadata is non-persisted investigation state;
- no hidden randomness is claimed where none exists;
- checkpoint snapshot semantics remain independent from provenance metadata.

## 8. Closure decision

**A51-S6 implementation: VERIFIED.**

This bookkeeping change may mark S6 and the A51 implementation stage DONE because S6 is the final planned A51 slice. The bookkeeping head itself must still pass the same full exact-head branch gate before A51 closure evidence is final.

PR #24 must remain open/unmerged until that closure gate is recorded and an explicit merge decision is made.
