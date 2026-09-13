# 93 Days Editor — A31 / A32 Memory implementation note

This note records the implementation-facing state of the v10 Memory slices and is intended to be folded into `93DAYS_ARCHITECTURE_V10.md` during the next architecture consolidation.

## V10-A31 — Memory Foundation

A Memory is now an explicit runtime/cognition record and remains separate from objective truth and per-character belief:

```text
ObjectiveFact != Claim != CharacterKnowledge != MemoryTrace
```

`MemoryTrace` now supports structured provenance through `MemorySource`:

- owning Story node;
- resolved Narrative Move / Outcome;
- related Claim;
- explicitly authored source.

A new typed Outcome effect, `character-remembers`, can describe that a concrete resolved outcome creates or reinforces a memory for a fixed Character, move actor, or move target. Its authored definition contains summary, importance, base strength, tags and a provenance policy.

Runtime application is pure. It requires an exact runtime moment, resolves the relative Character/source references, and calls one deterministic create/reinforce path. Re-applying the same stable memory effect for the same Character reinforces the existing `MemoryTrace` instead of duplicating history. Reinforcement records a count and last-reinforced moment while preserving the original memory provenance.

Creating/editing an authored effect does not mutate preview state by itself. Applying the selected Outcome is still a separate runtime action.

## V10-A32 — Memory Salience / Decay

Current recall strength is derived rather than stored as destructive history mutation.

The deterministic salience model combines:

- `baseStrength`;
- `importance`;
- age since creation or latest reinforcement;
- reinforcement count.

Strength uses a configurable half-life curve. Reinforcement can add a bounded boost and resets the recency anchor. The output is an explainable `MemorySalienceTrace` containing age, decayed strength, importance, reinforcement contribution and final salience.

Important invariant:

```text
low salience != deleted memory
low salience != false Fact
low salience != removed Claim
low salience != erased CharacterKnowledge
```

Weak memories remain in history. A query can derive currently salient memories for one Character without mutating or deleting the underlying collection.

The Story authoring surface now has a read-only `Memory Salience` lens that evaluates existing runtime `MemoryTrace` records at the Simulation Playhead and shows the derived factors. It is intentionally not an automatic action selector.

## Tests / gates

The slice includes tests for:

- create vs reinforce semantics;
- stable memory IDs and no duplicate trace on reinforcement;
- provenance from a resolved Move/Outcome or communicated Claim;
- exact runtime moment requirement;
- salience decay over time;
- reinforcement increasing current salience;
- per-character salient-memory filtering without deleting weak history;
- input-state immutability.

## Related authoring ergonomics landed alongside the memory work

A Story ↔ World/Time semantic navigator and a Split View foundation were also added. Split View renders the two existing canonical workspaces together and does **not** introduce a third workspace or a new `NarrativeWorkspaceMode`. Jumping to a Story placement moves only the editor view cursor; it never advances the Simulation Playhead.

## Remaining local follow-ups

- expose `character-remembers` in the general Outcome Effects authoring panel and project-reference validator;
- optionally feed derived salience into memory-based Reaction Candidate considerations while retaining explicit explanation traces;
- fold this note into the main v10 architecture source;
- continue the planned authored/editor/runtime persistence projection cleanup before autonomous Living Simulation.
