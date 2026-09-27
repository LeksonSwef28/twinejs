# 93 Days — TwineJS-first POST-A63 planning gate

**Date:** 2026-09-28  
**Status:** PRE-DESIGN / Gate 0 sources and product scope reviewed; A64 NOT approved or implemented.  
**Stable source:** `93-days-editor` @ `8967fdf8ea327b5355a29175171cc7b233065645`, [full Branch Check #649 GREEN](https://github.com/LeksonSwef28/twinejs/actions/runs/35943776363).  
**Archival companion:** external `93days_twine_design_pack_v14_post_A63_2026-09-28.zip` under project sources; this document is the durable repository-level entrypoint, not a copy of the 25-MB historical design archive.

## 1. Product decision and scope

The next active product is **our modified TwineJS editor** for authoring the actual 93 Days story and characters, with a canonical TypeScript-based standalone Player for running that same content. The separate Godot/2.5D visual prototype, the building-architecture research atlas and long-form world-history research are **out of scope** for this engineering stage. Do not create a second narrative runtime, Save codec or manually maintained Passage graph.

Keep exactly two authoring workspaces, **STORY** and **WORLD/TIME**, plus existing Story Brain/Preview authoring laboratories and the A52 compiler. Existing A53–A63 Player capabilities remain canonical. The newest available world/concept archive is MASTER CURRENT v31 (2026-09-19); its open naming/history decisions are not automatically promoted into editor requirements or gameplay content.

## 2. Verified AS-IS vs unproven TO-BE

| Topic | Evidence | Remaining decision/gap |
|---|---|---|
| Editor compiler/Player | A52–A63 merged; exact post-merge #649 GREEN | Verify normal authoring/export UI selects the intended A63 project rather than an older builder |
| Time and NPC social chain | A63 `player-time.ts`, `player-npc-social-delivery.ts`; exact-time tests | Continue preserving A63 explicit projectId opt-in and Actual Presence/one-shot guards |
| First four days | A57/A60 browser coverage, A62 Day Four authored content, A63 Day Three browser fixture | Run cold-start **Day One → Day Four** in one real standalone Player flow, plus Save/Continue and branch alternatives |
| Writing workflow | A47–A52 STORY/WORLD-TIME, A59 content kit, Story Brain and Preview | A real author must create/edit one character + one consequential scene **without manual TS changes** before declaring editor authoring ready |
| Local Windows | Node >=22.12, npm >=10; repo `npm start`; `package:player` requires `--artifact` | Verify on the actual Windows machine; prefer `npm.cmd` under restricted PowerShell. Electron dev safety requires Twine Stories backup and separate smoke |

## 3. Proposed A64 slices (not a commitment to implementation)

- **S0 / docs-only:** synchronize A63 roadmap/contract/change record with #648/#649 evidence; record TwineJS-first scope.
- **S1 / export audit:** identify default authored project and verify genuine A63 artifact via existing Narrative export/Player launch UI. Document the exact gap before touching compiler/runtime.
- **S2 / Gate 1 use cases:** author → validation → Preview/Story Brain → export; player cold Day One to Day Four; exact NPC report, direct answer/silence and persistent consequences; include error/alternate flows.
- **S3 / acceptance proof:** targeted integration and full standalone Player E2E from fresh A63 artifact; cover met/missed/declined, 08:00/08:15 actual presence, Day Four follow-up and Save/Continue without replay. Do not confuse a Day Three seeded fixture with an end-to-end proof.
- **S4 / gap closure only:** patch only confirmed owner (content vs UI vs tooling vs runtime), follow `93DAYS_ENGINEERING_CHANGE_PROTOCOL.md`, exact-head CI and independent merge authorization.

**Later proposal:** A65 writer's pilot with one NPC and two-choice scene; A66 local Windows/authoring UX issues observed in that pilot; A67 coherent first week of gameplay. Further growth into the full 93-day story is content-driven and gated by playtest evidence.

## 4. Source ownership and invariants

- Authored Narrative Project is the single truth; derived artifact is not an authoring surface.
- Scheduled Presence is not Actual Presence; Source of Claim is not listener belief or firsthand Player report.
- Simulation Playhead is unique; A63 splits due moments around the existing kernel rather than duplicating time.
- Runtime save remains runtime-only; old artifacts cannot implicitly opt into A63.
- Do not conflate the visual Godot archive with the current game-development repository.

## 5. Gate Review

**G0 scope:** PASS — TwineJS-first chosen, AS-IS baseline identified.  
**G1 requirements / use cases:** NEEDS REVIEW — validate detailed normal/negative/error paths against real editor and Player UI.  
**G2 component impact/contracts:** NEEDS REVIEW — audit ordinary export target, do not presume a new runtime defect.  
**A64 code:** NOT STARTED; no implementation authorization implied by this planning document.  
**Merge policy:** every individual PR requires its own separately requested `мердж` after exact-head CI and self-review; independently verify exact postmerge SHA.
