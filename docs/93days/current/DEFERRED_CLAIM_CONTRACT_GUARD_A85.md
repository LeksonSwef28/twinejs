# A85 — Delayed Claim contract guard before inspector

Date: 2026-10-13
Status: feature branch; exact-head CI and post-merge verification pending.
Target baseline: `93-days-editor@9de3884cf0d016eff4d587d825ca8726cb73f641`.

## Why (P1)

A84 scheduled a deferred Claim occurrence using a cause ID, effect ID and due time, but resolved the recipient, Claim and source against the **current** mutable Move/Outcome definitions at due time. An author could edit a still-pending effect without changing its ID or delay, causing knowledge to be delivered to the wrong character, or with the wrong provenance. Removing a referenced Claim or character could also create an orphaned knowledge state.

## Contract (minimal fail-closed patch)

- At real Outcome resolution, append the deferred occurrence with an immutable `definitionSignature` of the Move bindings, knowledge effect, and referenced Claim definition. Comparison is deterministic across JSON/object property order and save/reopen.
- At canonical due time, reject delivery if the signature no longer matches, if the canonical recipient/Claim/source/Story reference is missing, or if the scheduled effect definition is absent. Record an `expired` terminal journal entry with a specific reason rather than writing incorrect knowledge.
- Preserve the existing event queue (runtime occurrence journal), clock, single canonical executor, due time and idempotency. Do not mutate authored definitions or move the editor View Cursor.
- Extend the runtime occurrence validator with optional signature and additional explicit expiry reasons. Already-applied entries remain terminal and are not replayed.

## Compatibility boundary

Old A84 save files may contain pending delayed events **without** a definition signature. Their original semantic bindings are unrecoverable from the old journal; accepting the current definition would not be verifiable. Such events remain readable but **expire with `unverifiable-definition` when due**. This is a deliberate safety tradeoff: the save and unrelated runtime state remain intact, but the intended legacy pending Claim is not delivered automatically. Surface this limitation to authors rather than silently repairing or guessing.

Immediate Claim effects and other Outcome effect types are unchanged. Existing terminal journal entries remain terminal.

## Proof and remaining work

Added regression tests for changing recipient/source/Move target/Claim text between schedule and due, deleting a recipient/Claim/Story, and reading an unsigned legacy pending entry. Existing A84 tests exercise exact game minute, crossing multiple days, duplicate-choice isolation, save before/after due, end-of-project expiry and immediate-effect compatibility.

A green CI run will prove automated correctness **only**. No human usability session has been performed. A separate pending-event inspector remains the next author-facing improvement after this correctness gate, along with an explicit non-destructive workflow for author-initiated cancellation/replacement.

## Rollback

Revert the A85 changes (without rewriting or truncating user runtime occurrence history). Backward compatibility with older history is preserved structurally, but rolling back removes the stronger guard for future deliveries; avoid rollback if new pending effects rely on those guarantees.
