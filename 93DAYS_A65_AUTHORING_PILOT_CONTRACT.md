# 93 Days — A65 Authoring Pilot Contract

Change ID: **A65**
Stage: **first complete authoring pilot**
Base: `93-days-editor@d155def56607274c7eed9bf8e45a5ce73c9330d9`
Date: **2026-09-28**

## Goal

Complete one real authoring batch in the adapted TwineJS without authoring the gameplay graph in TypeScript:

`NPC -> Story scene -> two alternative Moves -> authored consequences -> Story Brain WHY -> Preview both branches -> compile -> canonical Player`.

The pilot is intentionally small. A65 validates the authoring product; it does not expand the game world or add runtime mechanics.

## Source-derived pilot scope

The post-A63 design pack defines A65 as one writer-day pilot:

- create/edit one NPC;
- create one Story scene with two meaningful alternatives;
- add location/time only when the story needs it;
- add one delayed consequence;
- verify diagnostics / WHY / Preview / Player;
- record every manual workaround;
- classify findings as content / presentation / tooling / runtime.

## S0 — AS-IS audit

### PASS / reusable capabilities

Existing code already owns:

- NPC creation in STORY Project Library;
- canonical character metadata editing through `CanonicalEntityPanel`;
- Story node creation and metadata;
- multiple Narrative Moves on one Story node;
- typed Guards and Outcomes;
- Story-state Outcome effects;
- Story Brain WHY / Impact / Coverage;
- isolated Preview laboratory with fork / resolve;
- A52 compile and canonical Player handoff.

### Rejected audit hypothesis

**A65-H01 — canonical entity editor is implemented but not mounted — REJECTED.**

The first shallow audit saw `CanonicalEntityPanel` as a reusable component but missed its transitive mount. Browser evidence then exposed two copies after an attempted direct mount. A deeper call-site check proved that `ProjectIdentityPanel` already renders `CanonicalEntityPanel` on the normal Story route.

Evidence FOR the original hypothesis: direct `NarrativeWorkspace` JSX had no `CanonicalEntityPanel`.  
Evidence AGAINST / decisive: `NarrativeWorkspace -> ProjectIdentityPanel -> CanonicalEntityPanel` already exists on stable.  
Action: the duplicate mount and its temporary accessibility workaround were reverted exactly to stable. The pilot now reuses the existing editor through its real owner.

### Reproduced tooling gap

**A65-GAP-01 — a new Story node cannot be promoted from draft through UI.**

`story/addDraftNode` correctly creates `activationState: draft`. Canonical Player actions only expose Story nodes whose effective state is `available` or `active`. `StoryMetadataPanel` edits title/type/participants/runtime policy but currently has no authored activation-state field.

Owner: **tooling/authoring**.  
Fix: add activation state to the existing Story metadata command/panel; do not change runtime state overrides or Player rules.

## Pilot content

The automated pilot starts from the explicit A63 production starter so it tests the real product path.

It authors transient test content through UI only:

1. create a pilot NPC and edit its canonical name/tier;
2. create one dialogue Story node;
3. mark the authored node `available`, set the Player as actor/participant and the pilot NPC as participant;
4. create two alternative Moves;
5. each Move completes the owning pilot scene, making the alternatives mutually exclusive after resolution;
6. one branch opens an existing authored Day Four follow-up as the delayed consequence;
7. inspect the scene in Story Brain;
8. fork Preview and resolve both choices independently;
9. compile/export the same project and open canonical Player;
10. execute one authored pilot choice in Player and prove the sibling choice disappears.

No pilot test data is committed into the A63 content builder.

## Definition of Done

A65 is done when:

- the one reproduced authoring gap is closed at its existing owner and the rejected mount hypothesis is documented;
- one browser pilot creates and edits the NPC and scene through normal UI;
- two alternative Moves are authored without direct runtime/session mutation;
- Story Brain explains the pilot Moves;
- Preview forks exercise both branches while source remains unchanged;
- canonical Player exposes and resolves the authored choice;
- delayed consequence uses existing typed Story-state effect semantics;
- exact-head Branch Check is GREEN;
- no runtime/schema/save format change is introduced;
- merge still requires a fresh explicit user message `мердж`.

## Deferred to A66

Usability observations that do not block this pilot, especially fast arbitrary day/time navigation, layout/search polish and Windows-machine-specific workflow friction, belong to A66 after A65 evidence is complete.


## Verification trail in progress

- **#660 FAIL**: builds/lint passed; one axe failure exposed duplicate landmark semantics after the mistaken direct canonical-editor mount.
- **#661 FAIL**: builds/lint passed; the attempted role-only accessibility workaround did not remove the native `section` landmark.
- **#662 FAIL**: Jest became GREEN after changing the temporary container semantics, then Chromium reached the pilot and failed on an intentionally over-broad NPC text locator.
- **#663 FAIL**: Jest remained GREEN; Chromium progressed to the canonical editor and proved there were two editor instances. This evidence rejected A65-H01 and identified the pre-existing `ProjectIdentityPanel -> CanonicalEntityPanel` mount.
- Duplicate mount and temporary canonical-panel semantic changes are reverted to exact stable. Final pilot verification is pending on the corrected ownership path.
