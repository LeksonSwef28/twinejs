# 93 Days Narrative Editor — Foundation commit

This branch starts from the exact Twine 2.12.0 release commit (`020b8dcd308d0103bb8ca1f547f2eaae247f17e8`).

This foundation establishes the first real implementation boundaries:

- Story Edit opens a dedicated Narrative Workspace instead of the Passage Map.
- One Twine Story hosts one separate Narrative Project.
- `93 Days` is a template rather than a hard-coded assumption in the reusable core.
- Project data is separate from Twine Passage/Story entities.
- Initial shells exist for schedule, presence transitions and character cognition.
- Snapshot Undo/Redo covers domain edits.
- Editor day/period navigation is excluded from Undo history.
- Persistence sits behind `NarrativeProjectRepository` and currently uses a dedicated localStorage key.
- The first UI can create Locations and Characters and switch day/period.

## Living Story UI direction

The editor now has two primary synchronized authoring surfaces that operate on one canonical Narrative Project and runtime world state:

1. **Story / Living Canvas** — a node-first authoring workspace for scenes, events, dialogue, conditions, choices, character behavior, knowledge, memory, relationships, items and effects.
2. **World / Time** — a temporal-spatial workspace for day/time navigation, schedules, locations, presence and movement.

These are two views over the same underlying domain data, not separate sources of truth.

The implementation should preserve the domain flow:

`Time -> Schedule -> Presence -> Scene -> Available Events -> Character Decision -> Action -> Event -> Effects -> World State`

The next UI patch should establish exact `Day + HH:MM` time navigation and the shell for the two primary workspaces before introducing the full graph engine.

Not implemented yet: Living Canvas graph engine, Routine Editor, Schedule Resolver, Presence Transition Planner, Dialogue Graph, Event/Trigger execution, utility decision resolution, memory retrieval/decay, knowledge propagation, inventory simulation, or Electron-specific project persistence.
