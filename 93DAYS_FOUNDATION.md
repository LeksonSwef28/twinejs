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

Not implemented yet: Scene Graph, Routine Editor, Schedule Resolver, Presence Transition Planner, Dialogue Graph, Event/Trigger execution, memory retrieval/decay, knowledge propagation, or Electron-specific project persistence.
