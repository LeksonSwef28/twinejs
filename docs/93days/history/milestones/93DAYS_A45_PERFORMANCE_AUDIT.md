# 93 Days — A45 Scale & Editor Hot-Path Audit

## Scope

A45 measures the existing production model rather than introducing a benchmark-only simulation path. The scale fixture uses the normal 93-day template, ordinary Story nodes/connections, ordinary RoutineRules, ordinary character runtime state, the normal simulation orchestrator, the normal reaction evaluator, and the normal runtime snapshot serializer/restorer.

The executable CI gates intentionally use generous millisecond budgets. They are regression tripwires for order-of-magnitude slowdowns, not claims about a specific end-user machine or a substitute for profiling a packaged production build.

## Scale fixture

The A45 fixture spans all 93 days and currently contains:

- 744 exactly scheduled Story nodes (8 per day);
- 743 Story connections;
- 96 scheduled characters across all cognition tiers;
- 96 daily RoutineRules;
- 24 locations with actual-presence distribution;
- dense runtime variants with 3,000 MemoryTrace records.

The fixture does not alter calendar length, skip runtime domains, bypass Story scheduling, disable body/injury advancement, or use a separate benchmark schema.

## Runtime gates

### Long step vs batching

The complete remaining summer is advanced once as a single Simulation Playhead delta and again in one-day batches. CI requires the same final canonical day/minute, the same ordered due-work ids, unchanged authored Story graph identity, and equivalent representative body state.

This specifically protects the invariant that batching is an execution strategy, not a semantic mode.

### Story/schedule projection

`scheduledStoryWork()` runs on the full Story fixture. `routineWindowForDay()` runs every daily rule across every day. The gate verifies the full expected work/window count and applies only a coarse regression budget.

### Memory-aware reactions

The normal `evaluateReactionCandidateSet()` path ranks 80 authored candidates against 3,000 memories. Salience thresholds use an explicit Simulation Playhead moment; no cache or reduced candidate representation exists solely for A45.

### Runtime snapshot

The normal runtime snapshot format serializes and restores a project carrying 3,000 memories, mind states, relationships, actual presence and the rest of the runtime projection. CI gates both serialized size and restore time, while confirming authored Story graph references remain outside the restored runtime projection.

## Editor render audit

### World / Time workspace — primary scale risk

The current render path correctly limits day/tick generation to the visible time range, but location rows still contain multiplicative scans:

1. for every location, the component scans all `routineRules` before producing schedule blocks;
2. for every location, it filters all characters to find actual presence;
3. for every location, it filters all visible Story nodes again by `placement.locationId`;
4. period background bands are regenerated for every visible day in every location row.

The first three are logically indexable by location. At production density the desirable shape is one O(rules + characters + visible-story) indexing pass followed by O(items-for-this-location) row rendering, rather than O(locations × global-collection-size).

This is a render/projection concern only. It must not change Scheduled Presence into Actual Presence or precompute runtime outcomes.

### Story workspace

The Story workspace already memoizes canonical entity lookup maps, continuity analysis and connected-node highlighting. One remaining avoidable allocation is rebuilding the `visualNodeByStoryId` map on every render. Full-canvas node/edge rendering also remains the likely future pressure point if authoring graphs grow into several thousand visible canvas instances; viewport culling/virtualization should remain purely visual and must never remove canonical Story entities or executable edges from the project model.

### Playtest / Debug surface

The A44 debug snapshot intentionally projects a broad runtime view. It is appropriate for an explicitly opened debug dock, but should not be recomputed by hidden panels at animation frequency. Play mode currently advances in explicit intervals and the dock remains a diagnostic surface, not a background simulation worker.

## A45 acceptance interpretation

A45 is considered healthy when the scale gates pass on CI and no semantic shortcut is introduced to make them pass. A performance gate failure should first be treated as a profiling signal. Optimizations must preserve the project contracts: View Cursor != Simulation Playhead, Scheduled Presence != Actual Presence, authored Story != runtime Story state, and ReactionCandidate != PendingReaction != Executed Action.
