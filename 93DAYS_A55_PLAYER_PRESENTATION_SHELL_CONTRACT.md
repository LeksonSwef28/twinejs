# A55 Contract — Player Presentation Shell

Status: **IMPLEMENTATION VERIFIED / MERGE REVIEW READY**  
Stage: **A55 — Player Presentation Shell**  
Risk: **HIGH**  
Stable source: `93-days-editor` @ `0b115b52b42ef05d16bc213865cc07b3a2eb6e76`  
Feature branch: `feature/a55-player-presentation-shell`  
Decision date: **2026-09-20**

## 1. E0 — repository evidence / exact gap

A54 is merged and post-merge verified on exact stable SHA `0b115b52b42ef05d16bc213865cc07b3a2eb6e76`.

At that SHA:

- A52 emits the deterministic `narrative-runtime-artifact` v1;
- A53 owns player session materialization, runtime-only save identity and safe project replacement;
- A54 owns a dedicated Player entry, artifact transport/package boundary and real-browser boot;
- `src/player/player-app.tsx` is still a technical host screen: project name, artifact identity, world time and a zero-minute runtime probe;
- canonical Actual Presence already exists as `simulation.actualLocationByCharacter`;
- canonical Narrative Moves already resolve/apply through `resolveNarrativeProjectMove` / `resolveAndApplyNarrativeProjectMove`;
- physical/body/carrying read APIs already exist;
- there is **no canonical authored player-character identity field**;
- `NarrativeLocation` and `NarrativeScene` currently expose names, not authored prose descriptions;
- there is no canonical money/economy runtime contract yet.

**Root cause classification:** the next gap is a player-facing read/action presentation boundary over existing runtime data, not a missing gameplay engine.

## 2. Goal

A55 replaces the A54 technical host screen with the smallest real player-facing shell that reads and mutates the canonical A53 session through existing runtime APIs.

Target flow:

`A53 session -> A55 presentation projection -> player input -> canonical runtime API -> A53 session replacement -> A55 feedback`

A55 must not invent world facts, hidden randomness, money state or alternative action semantics.

## 3. Ownership boundaries

### Presentation projection

A55 may derive display-only values from the current `NarrativeProject`:

- current day/time;
- player perspective resolution;
- current location and unambiguous scene label;
- characters actually present at that location;
- authored Story nodes relevant to that location;
- player-authored Narrative Moves and their current runtime availability;
- body/physical read state;
- carried item read state.

Projection code is pure read-side logic. It does not mutate authored data or runtime.

### Player perspective policy

The schema does not yet contain `playerCharacterId`, so A55 must not silently select an arbitrary character.

The temporary presentation policy is deterministic and conservative:

1. if a character with exact id `player` exists, use it;
2. otherwise, if exactly one `full` cognition character exists, use it;
3. otherwise, if exactly one character currently has Actual Presence, use it;
4. otherwise return an explicit **unresolved perspective** state.

This convention is presentation-only. If A56 proves that authored player identity is required, that must be a separate schema decision rather than hidden A55 inference.

### Scene projection

Runtime currently has no active-scene id.

A55 may display a scene only when exactly one authored `NarrativeScene` belongs to the current location. With zero or multiple scenes, it must display a neutral location-level state rather than guessing an active scene.

### Actions / dialogue

A55 may expose only Narrative Moves whose `actorCharacterId` exactly matches the resolved player character.

- Move guards/resolution are evaluated by canonical runtime APIs.
- Automatic and condition-based moves may be executed through `resolveAndApplyNarrativeProjectMove`.
- Skill checks require explicit runtime input; A55 must **not roll secretly**. Such actions are shown as requiring a future explicit check/input UI.
- Successful runtime project mutations enter the player session only through `replaceNarrativePlayerSessionProject`.
- Player feedback comes from canonical outcome labels/traces, not hand-authored UI-only consequences.

## 4. A55 invariants

- **A55-I01 — No second engine:** UI contains no duplicate Guard/Move/effect/simulation implementation.
- **A55-I02 — Actual Presence only:** visible local characters derive from `simulation.actualLocationByCharacter`, not schedules or Story participants.
- **A55-I03 — No arbitrary protagonist:** ambiguous perspective produces an explicit setup state.
- **A55-I04 — No arbitrary scene:** multiple same-location scenes never select an implicit active scene.
- **A55-I05 — Canonical actions:** player actions are authored Narrative Moves for the resolved player actor.
- **A55-I06 — Canonical mutation boundary:** mutations enter session only through A53 replacement.
- **A55-I07 — No hidden RNG:** skill-check Moves never auto-roll.
- **A55-I08 — Authored/runtime immutability:** definitions are not rewritten by presentation.
- **A55-I09 — No editor dependency:** Player shell does not import editor App/providers/routes/persistence.
- **A55-I10 — Body is read from canonical state:** missing body display state may use canonical `createCharacterBodyState` defaults but does not persist merely by rendering.
- **A55-I11 — Inventory is physical:** display uses ItemInstance placement/runtime overlays and canonical carrying resolution, not abstract counts invented by UI.
- **A55-I12 — Money gap remains explicit:** no fake wallet/balance is created before a canonical economy contract exists.
- **A55-I13 — Host errors remain visible:** A54 malformed/incompatible artifact failures stay player-facing and atomic.
- **A55-I14 — Empty content is valid:** an artifact with no playable perspective renders a safe setup/empty state, not a crash.

## 5. Verification design

A55 must prove:

1. perspective policy resolves `player` explicitly and rejects ambiguity;
2. current location derives only from Actual Presence;
3. local character list changes with Actual Presence;
4. scene is shown only when unambiguous;
5. action list contains only Moves authored for the resolved player;
6. guard-blocked/unknown Moves cannot mutate runtime;
7. automatic/condition Move clicks use canonical resolution/application and A53 replacement;
8. canonical outcome label/trace is visible as player feedback;
9. skill-check Move is not secretly rolled;
10. body and carried item surfaces derive from canonical read APIs;
11. A54 empty-artifact browser smoke still boots into a safe Player state;
12. a real-browser presentation fixture can show location + actually present NPC + execute a canonical Move;
13. full exact-head web/player/Electron/Jest/Chromium/Vite/Electron gates remain green.

## 6. Minimal slices

### A55-S1 — Pure presentation projection + shell

- `player-presentation.ts` pure read model;
- perspective resolution;
- world-time/location/scene projection;
- Actual Presence character projection;
- body + carrying summaries;
- Player shell layout and empty/setup states;
- focused unit tests.

### A55-S2 — Canonical player actions + feedback

- available authored Move projection;
- canonical execution through Living Simulation;
- A53 session replacement;
- outcome feedback/dialogue response surface;
- explicit skill-check input-required state;
- component/browser regression.

### A55-S3 — Browser and product closure

- real-browser fixture with player/location/NPC/Move;
- CI browser gate includes A55 presentation regression;
- responsive/accessibility pass for shell;
- self-review/change record/roadmap closure;
- final exact-head CI.

## 7. Explicit non-goals

A55 does **not** author the bus station/day-one world; that is A56.

A55 does not introduce:

- player travel semantics or travel-time costs;
- economy/money rules;
- save UI;
- new body/injury/item mechanics;
- a dialogue scripting language;
- active-scene runtime semantics;
- hidden random adapters;
- final visual-art direction.

## 8. Recovery

No schema or save migration is planned.

Rollback is presentation code only: restore the A54 technical Player screen while retaining the A52/A53/A54 artifact/session/host chain.

## 9. Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 Minimal implementation: **PASS — S1/S2/S3**
- E5 Exact-head verification: **PASS — S1 #494, S2 #497, S3 #498; final closure-doc exact-head CI follows this record**
- E6 Self-review: **PASS**
- E7 PR/CI: **PASS for implementation — draft PR #28 open and mergeable**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**


## 10. Implementation evidence

### A55-S1 — presentation projection + shell

Implemented:

- pure `player-presentation.ts` read model;
- conservative player-perspective resolution with explicit unresolved state;
- world day/time HUD;
- location and unambiguous scene projection;
- local character list from **Actual Presence only**;
- canonical body-state display;
- physical inventory/carrying summary from ItemInstance/runtime placement;
- explicit “money unavailable” placeholder instead of fake economy state;
- responsive player-facing layout;
- A54 malformed/empty host states preserved.

Verification:

- first S1 workflow **#493** reached browser smoke with all audit/lint/build/Jest steps green but failed because the smoke test used an ambiguous text locator matching both the setup heading and explanatory paragraph;
- test-only selector fix changed the assertion to the exact heading role;
- exact S1 head `a923035470da6316f9aca4b7d0479b25333ee561` passed **#494 GREEN**:
  - 0 production vulnerabilities;
  - 346/346 Jest suites;
  - 2098 passed, 23 skipped, 42 todo; 2163 total;
  - Chromium host smoke 2/2;
  - Vite/Electron smoke PASS.

### A55-S2 — canonical actions + feedback

Implemented:

- `player-action.ts` thin player-action boundary;
- only Moves authored for the resolved player actor appear;
- Story node runtime state/location scopes the action list;
- guard/resolution is delegated to Living Simulation;
- automatic/condition outcomes execute through `resolveAndApplyNarrativeProjectMove`;
- successful projects enter the player session through A53 `replaceNarrativePlayerSessionProject`;
- canonical outcome labels/traces become player feedback;
- skill-check Moves remain explicit `input-required`; no RNG is invented.

Verification/learning:

- **#495 FAIL** exposed only a TypeScript narrowing issue in the new rejection union; fixed without semantic change;
- **#496 FAIL** exposed test-fixture assumptions: A52 intentionally compiles a **fresh runtime with empty Actual Presence**, so presence authored before compile must not be expected in a newly materialized player session;
- tests were corrected to set runtime Actual Presence after materialization through the canonical presence API, and the UI fixture stopped pretending compiler initial runtime contained live presence;
- exact S2 head `c8d26b15a585dc0c053eb8653bf1e7c391195ce7` passed **#497 GREEN**:
  - 0 production vulnerabilities;
  - 348/348 Jest suites;
  - 2103 passed, 23 skipped, 42 todo; 2168 total;
  - Chromium host smoke 2/2;
  - Vite/Electron smoke PASS.

### A55-S3 — browser/product closure

Added:

- real standalone browser fixture with authored Player, NPC, location, scene and Move;
- explicit runtime Actual Presence fixture layered onto the compiled artifact **only for the browser test**, preserving A52 fresh-game semantics;
- narrow viewport 390x844 regression;
- accessibility regression with `jest-axe`;
- real browser proof:
  `runtime Actual Presence -> visible NPC -> authored Move -> canonical outcome -> Story-state effect -> action disappears`.

Exact S3 implementation head `0764c93f235699c29cb6d7e2a877d7fe6f4681a1` passed **#498 GREEN**:

- production dependency audit: **0 vulnerabilities**;
- lint PASS;
- web build PASS;
- standalone Player build PASS;
- Electron main build PASS;
- **348/348 Jest suites**;
- **2104 passed tests**, 23 skipped, 42 todo; 2169 total;
- 0 snapshots;
- Chromium canonical Player smoke: **3/3 passed**:
  - development handoff boot;
  - standalone embedded artifact boot;
  - Actual Presence + NPC + canonical Move/outcome presentation;
- Vite smoke PASS;
- Electron smoke PASS.

## 11. Self-review

Self-review confirms:

- no authored Narrative Project schema change;
- no A52 artifact version change;
- no A53 player save/session identity change;
- no Move/Guard/effect/simulation semantics copied into UI;
- no hidden random adapter;
- visible NPCs derive only from Actual Presence;
- ambiguous protagonist/scene remains unresolved instead of guessed;
- player mutations enter through A53 replacement;
- body/carrying display uses canonical domain/application reads;
- rendering does not persist canonical body defaults;
- no editor App/provider/router import entered Player;
- no invented money balance/economy contract;
- A52 fresh-runtime Actual Presence semantics were preserved rather than weakened for presentation tests.

**Decision:** A55 implementation is VERIFIED and ready for merge review. The closure documentation commit must pass one final exact-head full branch gate. Merge remains blocked until explicit authorization; after merge, the exact resulting stable SHA must be post-merge verified before A56 begins.
