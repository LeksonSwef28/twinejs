# A82 — W1 complex author workflow: observable evidence and limits

Date: 2026-10-12
Scope: existing desktop editor authoring UI; **no new gameplay engine or generic NPC scheduler**.
Status: **implementation on feature branch, exact-head CI and human walkthrough pending**.

## What this trial tests

A clean current-host Narrative Project, containing no manually injected author content, is authored by UI DOM events:

1. Create characters **Ира** and **Миша**, and two Story nodes for a courtyard meeting and next-day conversation.
2. Create an objective fact and one possibly disputable Claim through Project Library.
3. Create two distinct initial-knowledge records with distinct provenance: **Ира observed** the Claim; **Миша read it via a mediated forum source**. Neither record silently transfers knowledge to the other character.
4. Author a Move on the first node, with an actor, target and communicated Claim.
5. Attach a **trust +2** Outcome Effect for the specific characters, and an Outcome Effect that **unlocks the second Story node when this outcome resolves**.
6. Verify authored data are persisted, initial Knowledge sources remain different, Preview Simulation Playhead was not advanced by authoring, source-snapshot projection is readable into a blank target with the same host ID, and closing/reopening reloads the data.

The test is automated with React Testing Library, but **content is created exclusively through visible forms**: no handcrafted Narrative Project seeded into the authoring test. Fixture construction is used only to inspect snapshot compatibility after authoring.

## UX findings before marking feature complete

- **True day-delayed effect remains unproven/unsupported via the tested Outcome Effects controls.** The second Story node title mentions the next day, but the authored effect merely sets Story state upon Outcome resolution. That is **not** an event scheduled for day +1 or day +3 and must never be reported as such.
- **Story body writing remains outside this workflow.** Creating a Story node and Move does not prove the author can draft a long scene or dialogue text comfortably.
- Source snapshot serialisation is checked on this UI-authored project, **not an end-to-end download+file picker import action**. A77/A78 have separate UI tests; cross-host Twine Story/passages portability is still open.
- Project Library edits and Outcome Effects use distinct panels. Count context switches, confusing vocabulary and clicks in a real non-programmer session; no human efficiency/usability claim follows from automated success.
- The previously misleading EXPORT / COMPILER text said source snapshot import did not exist. A82 updates the copy to accurately say **guarded same-host empty-project restore** exists; full Story-inclusive portability does not.
- Runtime consequences are authored, **not executed** in this trial. No proof of storytelling pacing, player understanding or day-2 reaction.

## Human acceptance protocol (not yet performed)

Give an author who has not studied the implementation a blank project and a short one-page writing brief. Without tips about technical identifiers, ask them to create these two characters, the conflicting knowledge sources, a trust change, a future follow-up, then export a source snapshot and reopen their work. Record task completion, time, erroneous actions, Undo/recovery needs and clarification requests. Ask which words (Claim/Move/Outcome/Guard) were unclear, and whether they understood the difference between an effect attached to a choice and an effect scheduled for a future day. Stop short of claiming success without actual observations.

## Recommended next issue

Create an **author-readable explicit delayed-consequence contract** only after checking whether the existing authored due-work/Story time machinery already satisfies the use case. Define semantics and validation first; do not add generic background scheduling or a second simulation engine.
