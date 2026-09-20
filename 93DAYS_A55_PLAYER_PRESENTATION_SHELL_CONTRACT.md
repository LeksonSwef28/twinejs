# A55 Contract — Player Presentation Shell

Status: **ACTIVE / S1 IMPLEMENTATION**  
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
- E4 Minimal implementation: **PENDING**
- E5 Exact-head verification: **PENDING**
- E6 Self-review: **PENDING**
- E7 PR/CI: **PENDING**
- E8 Merge: **PENDING — explicit authorization required**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**
