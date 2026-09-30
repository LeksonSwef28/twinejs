# A67 — World Authoring Pilot

## Goal

Prove that the TwineJS-based 93 Days editor can author a small coherent world through normal UI only, without JSON editing, runtime-state mutation, or hidden IDs.

## Pilot world

The browser pilot creates and links:

- two characters;
- two locations;
- one item definition and one item instance;
- one recurring authored routine;
- one Objective Fact;
- one Claim linked to that Fact;
- one Initial Knowledge seed;
- one Story event placed at an exact Day + HH:MM and location.

## Authoring path

The pilot must use only visible editor surfaces:

1. Story Project Library for characters, item definition/instance, and Story event.
2. WORLD/TIME for locations and authored routine.
3. Project Library for Fact, Claim, and Initial Knowledge.
4. Story exact-moment navigator and Story inspector for event placement.
5. Project Search / WORLD/TIME to verify the authored world remains discoverable and cross-navigable.

## Invariants

- Authored Project remains the sole authored source of truth.
- Scheduled Presence != Actual Presence.
- View Cursor != Simulation Playhead.
- Fact != Claim != Knowledge.
- The pilot must not mutate Simulation Playhead.
- No runtime/save/schema changes are part of A67 discovery.

## Evidence

A browser test is the first artifact. It intentionally adds no production implementation.

If the pilot passes, the result establishes capability but may still expose UX friction such as excessive surface switching or weak contextual authoring.

If the pilot fails, the first reproducible UI break becomes the candidate A67-S1 friction slice.

## Completion

A67 discovery is complete when the pilot has an exact-head CI result and the observed authoring friction is documented and prioritized.
