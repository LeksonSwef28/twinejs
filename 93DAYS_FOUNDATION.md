# 93 Days Narrative Editor — Foundation commit

This branch starts from the exact Twine 2.12.0 release commit (`020b8dcd308d0103bb8ca1f547f2eaae247f17e8`).

This foundation establishes the first real implementation boundaries:

- Story Edit opens a dedicated Narrative Workspace instead of the Passage Map.
- One Twine Story hosts one separate Narrative Project.
- `93 Days` is a template rather than a hard-coded assumption in the reusable core.
- Project data is separate from Twine Passage/Story entities.
- Initial shells exist for schedule, presence transitions and character cognition.
- Snapshot Undo/Redo covers domain edits.
- Editor navigation is excluded from Undo history, and Undo/Redo preserves the current editor view instead of restoring an old camera/time cursor.
- Persistence sits behind `NarrativeProjectRepository` and currently uses a dedicated localStorage key.
- Exact editor time is represented as `Day + minuteOfDay`; the editor view cursor is explicitly distinct from the simulation playhead.
- Canvas metadata is separate from narrative entities through `CanvasNodeInstance`: one Character/Event/etc. may have multiple visual instances without duplicating the domain object.
- Routine authoring now has a forward-compatible exact `startMinute/endMinute` time-window shape in addition to legacy period-based schema-v1 data.

## Living Story UI direction

The editor has two primary synchronized authoring surfaces that operate on one canonical Narrative Project and runtime world state:

1. **Story / Living Canvas** — an Obsidian-like node-first authoring workspace for events, dialogue, conditions, choices, character references, facts, notes, groups and effects. Locations are not primary Story Canvas nodes.
2. **World / Time** — a temporal-spatial workspace for the 93-day timeline, schedules, locations, presence and movement.

These are two views over the same underlying domain data, not separate sources of truth.

The implementation should preserve the domain flow:

`Time -> Schedule -> Presence -> Scene -> Available Events -> Character Decision -> Action -> Event -> Effects -> World State`

### Current UX boundary

- Story owns story structure and narrative logic.
- World / Time owns locations, schedule authoring and temporal/spatial navigation.
- Moving the editor view cursor never advances simulation time.
- Runtime presence is shown only for the simulation playhead until schedule/presence resolvers can derive historical/future projections safely.
- `Fact`, `Knowledge` and `Memory` remain separate domain concepts even when later visualized together.

### Next UI implementation

Replace the temporary period table/navigation controls with a virtualized pan/zoom World / Time surface:

`93 days -> days -> periods -> hours -> 5-minute detail`

Then replace the temporary Story node layout with persisted free-positioned canvas instances, pan/zoom, notes/groups, typed links and nested canvases.

Not implemented yet: full Living Canvas graph engine, virtualized World / Time canvas, Routine Editor, Schedule Resolver, Presence Transition Planner, Dialogue Graph, Event/Trigger execution, utility decision resolution, memory retrieval/decay, knowledge propagation, inventory simulation, narrative compiler/exporter, or Electron-specific project persistence.
