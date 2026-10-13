# A86 — Inspector of scheduled and terminal delayed Claim consequences

Date: 2026-10-13
Status: **isolated feature branch; full repository build/CI NOT RUN**.
Baseline: `93-days-editor@073b88bd60e4f898b7d23a99e92bee64369f6820`.
Branch: `feat/a86-deferred-claim-inspector-block`.

## Goal
Give a writer an understandable, read-only explanation of delayed knowledge from **actually resolved** Move Outcomes: pending, applied and expired. Show who is scheduled to learn which Claim, the source, the causal Move/Outcome, creation moment, due moment and terminal reason. Acknowledge unverifiable historical definitions instead of silently mislabeling them.

## Architecture and invariants
- Reuses the existing append-only `runtimeOccurrences` journal; no second pending queue or clock.
- Pure `createDeferredClaimInspectorSnapshot(project, limit)` projects all entries by `causeOccurrenceId + effectId`; a terminal entry closes a schedule. A direct expiry beyond Day 93 is visible without a scheduled entry.
- Reuses A85's existing `deferredEffectSignature` for semantic comparison, with additional existence checks. If an author has modified or deleted definitions, or a legacy journal lacks a signature, the inspector **withholds** current recipient/Claim/source labels and explains why.
- Pending counts are derived from the **full** journal, never the last-30 occurrence debug slice. Lists show up to 25 entries, with total counts and deterministic order.
- UI lives inside the existing Simulation Debug / Playtest panel. No authored data mutation, new command, runtime time advance or Player save schema modification.
- A pending deadline in the past is labelled as waiting for a simulation step, not automatically expired.

## Blocks and local testing
1. Application block: `src/application/narrative/deferred-claim-inspector.ts`.
2. UI block: `src/components/narrative/workspace/deferred-claim-inspector-panel.tsx`, mounted into existing `simulation-debug-panel.tsx`.
3. Reuse: export preexisting `deferredEffectSignature` from `deferred-claim.ts`.
4. Tests: `src/application/narrative/__tests__/deferred-claim-inspector.test.ts` and `src/components/narrative/workspace/__tests__/deferred-claim-inspector-panel.test.tsx`.

In the isolated local sandbox, TypeScript 5.x typechecked the pure projection against minimal API type stubs and **6/6 Node native test cases passed** (pending, terminal, direct expiry, changed definitions, legacy signature, limit/overdue). **This is NOT a claim that project Jest tests, full TypeScript build, React UI tests or Electron smoke passed.** No checkout/npm dependencies are reachable in this runner; GitHub Actions are deliberately not triggered due to budget.

## Integration gate when a local checkout is available
Use Node 22.12.x and the repository's lockfile. On a local machine:
```bash
npm ci
npx jest src/application/narrative/__tests__/deferred-claim-inspector.test.ts src/components/narrative/workspace/__tests__/deferred-claim-inspector-panel.test.tsx --runInBand
npm run lint
npm run build:web
npm run build:player
```
After passing these, run the affected living-simulation and snapshot regressions. Review A85 legacy fail-closed behavior and inspect manually in Playtest. Open PR/merge only when required verification policy can be satisfied; **do not claim green GitHub CI while quota is exhausted**.

## Non-goals and open risks
- No cancellation, replacement, generic scheduled effects or autonomous NPC delivery.
- An old scheduled record with no signature cannot restore exact original labels.
- Last 25 completed records are visible; totals include all history. Large-journal performance still needs profiling against production-scale content.
- Manual writer usability and real Player roundtrip are pending.

## Rollback
Remove A86 panel mount and its new application/UI files, revert the signature export to private. Do not modify or truncate journal history; runtime semantics remain A85.
