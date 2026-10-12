# Editor usability research -> measurable A81 implementation
Date: 2026-10-12
Target branch: `93-days-editor`
Status: researched and designed; automated/real-human evidence reported separately.

## Grounded outside guidance (not proof the product is usable)

1. **NIST usability testing**: representative users accomplishing representative tasks; collect completion, time, errors and observations, not just unit test passes. https://www.nist.gov/programs-projects/usability-testing
2. **Nielsen Norman Group's ten usability heuristics**: status visibility, recognition over recall, error prevention, user control/Undo, and ordinary-language recovery. https://www.nngroup.com/articles/ten-usability-heuristics/
3. **VS Code navigation: Go to References, Peek and Back**: avoid losing writing context when moving between references. https://code.visualstudio.com/docs/editing/editingevolved
4. **NN/g confirmation dialog guidance**: expensive irreversible actions deserve specific consequences and deliberate confirmation, while repeated prompts for routine reversible actions cause warning fatigue. https://www.nngroup.com/articles/confirmation-dialog/
5. **NN/g progressive disclosure**: advanced or secondary controls belong in the relevant authoring context rather than on screen all the time. https://www.nngroup.com/articles/progressive-disclosure/

These principles justify evaluating tasks and small UI changes, **not** copying another IDE wholesale.

## Repository facts at A80 stable

- `StoryWorkspace` preflights Story node removal and A80 jumps to an owning/linked Story. This is insufficient if the issue is a guard on *one specific Move* because `MoveConditionsPanel` selects a separate Move independently.
- `MoveConditionsPanel` already authors Guards and their removal; reuse it instead of creating another editing engine.
- `CanonicalEntityPanel` already edits `character/location/fact/claim/item-definition` by stable IDs. There is no general delete command for these types in the current Narrative Project command set. Do not invent a destructive action merely to check a UX box.
- `Project Search` already computes **bounded, typed** backreferences, not an exhaustive deep dependency audit. Any use in metadata UI must label this limitation, and absence of results must NOT claim that an entity has no dependencies.
- A67/A68 fixtures assembled in TypeScript are production examples, not evidence of an author's capability to make the same story through UI.

## Focused acceptance (A81)

**W3 Move/Guard**
- From a blocked Story deletion preflight, clicking a specific Move reference selects **that Move's conditions**, not merely its parent Story; it does not advance simulation.
- Missing/stale Move IDs should not silently select an unrelated Move. Selection clears safely or shows an unavailable status.
- Navigation is offered contextually; no new permanent global panel or gameplay engine.
- Long-term back navigation/inline peek is a separate product trial, not assumed implemented.

**W3 entity changes**
- When renaming a character/location/fact/claim/item definition, an author sees existing *indexed* references before saving and knows they are not exhaustive.
- Core IDs and referential links survive metadata rename; the action is undoable.
- No new delete control or cascade; do not confuse canonical entity and its canvas instance.

**W1 author-only trial**
- Start with a fresh host Narrative Project, not a hardcoded TS story fixture.
- Via DOM/user actions: create a character, a Story node, a Move, an availability guard; check canonical project state, save/reopen and inspect UI. The test code may be TypeScript; **the authoring path may not inject project content programmatically**.
- Record friction and gaps, not just success. A test with synthetic DOM clicks validates command reachability but **does not** substitute a non-programmer walkthrough or long-session satisfaction.

## Risks caught before implementation

- Selecting a Move solely by Story may land on the wrong action; use the exact canonical Move ID.
- Hidden effect of selecting dependencies: View Cursor and author panel selection must not move Simulation Playhead.
- Stale references, duplicate labels and renamed entities: key by stable ID and never by the visible label.
- A new destructive command could bypass preflight; keep existing delete protections and avoid cross-entity cascade.
- Backreference index currently covers selected typed relationships. Never use it to certify deletion safety.
- Tests that prepopulate finished story definitions in TS falsely pass "UI-only authoring". Tests must initiate commands via visible form controls and retain one clean independent profile.
- Too many confirmations and permanent UI warnings disrupt writing; show typed reference details in context only, no modal for non-destructive rename.
- Preserve Undo for structured edits and visibility of save state, and leave cross-session history as a separate evidence gap.

## Evidence boundary

Automated tests can establish correct route/selection, immutable IDs, undo and working form controls. NIST-style human task testing is still required to establish whether real writers understand the interface, finish tasks efficiently and feel comfortable.
