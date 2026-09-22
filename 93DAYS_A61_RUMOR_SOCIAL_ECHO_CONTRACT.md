# A61 Contract — Rumor & Social Echo

Status: **IMPLEMENTATION VERIFIED / CLOSURE PENDING**  
Stage: **A61 — Rumor & Social Echo**  
Risk: **MEDIUM** with explicit HIGH re-scope triggers  
Stable source: `93-days-editor` @ `9531bc4a9c1d919fe30e034060232b18cba2cb30`  
Feature branch: `feature/a61-rumor-social-echo`  
Decision date: **2026-09-22**

## 1. Evidence boundary

A60 is merged and post-merge verified on exact stable SHA `9531bc4a9c1d919fe30e034060232b18cba2cb30`.

Post-merge evidence — **93 Days Branch Check #615 GREEN**:

- production audit: 0 vulnerabilities;
- 373/373 Jest suites;
- 2192 passed, 23 skipped, 42 todo, 2257 total;
- Chromium canonical Player smoke: 10/10;
- Vite smoke: PASS;
- Electron smoke: PASS;
- separate Jest / Playwright / ESLint / Prettify workflows: GREEN.

Repository evidence already supports the first rumor chain:

- Narrative Moves can carry `communicatedClaimId`;
- a Knowledge effect can learn the communicated Claim;
- `source: {type: 'move-actor'}` records runtime Knowledge provenance as `told` with `sourceCharacterId`;
- Knowledge already stores confidence, timesHeard and learned/reinforced moments;
- memories can point to communicated Claims;
- ReactionCandidateSet can score NPC responses using known Claims, relationships, memory tags and Story state;
- explicit NPC decision selection/execution already exists and never invents hidden randomness.

The first rumor loop therefore starts as authored content + existing cognition/NPC decision APIs, not as a new rumor engine.

## 2. Project-source alignment

Current project source says:

- specific-person events update interpersonal state first;
- social beliefs change more slowly;
- rumor is a valid event family;
- rumor credibility depends on source trust;
- friendships/rivalries/rumors should accumulate over the 93-day summer;
- social-space overlap is contextual and does not automatically imply friendship.

A61 will prove this at small scale with concrete NPCs before any generalized social-network propagation system is considered.

## 3. Goal

Prove one explainable chain:

`A60 meeting result -> NPC tells NPC -> listener stores provenance -> listener evaluates source trust -> later player-visible social reaction`

The chain must distinguish at least:

- player kept the agreed meeting;
- player agreed but did not appear;
- player declined in advance.

The listener must not react identically to all three histories.

## 4. Scope / risk rule

A61 stays **MEDIUM** while it adds:

- canonical Claims/Story/Moves/Outcomes;
- explicit NPC-to-NPC communication;
- authored relationship/memory effects over canonical runtime relationship/memory state;
- ReactionCandidateSet content;
- explicit NPC decision opportunities in tests/application orchestration;
- Player-visible follow-up content;
- Story Brain/Preview evidence and tests.

Stop and reclassify affected work **HIGH** before adding:

- automatic graph-wide rumor propagation;
- background fan-out to arbitrary NPCs;
- a global rumor queue;
- new mutable social-belief stores;
- new Knowledge persistence shape;
- new save/artifact/schema version;
- hidden stochastic spread;
- direct use of demographic/social-group priors to mutate interpersonal meters.

## 5. A61-S1 — Content-only rumor provenance

Layer content on `create93DaysPhoneSocialLoopProject()`.

Required first chain:

1. one existing A60 local contact is the source;
2. one existing dorm NPC is the listener;
3. three authored Claims distinguish met / missed / declined histories;
4. NPC-to-NPC Story becomes relevant on Day Three;
5. source Move communicates exactly one authored Claim;
6. listener learns via `claim: communicated-claim`;
7. Knowledge source is `move-actor`, yielding runtime `told(sourceCharacterId)`;
8. confidence is authored for the concrete communication;
9. memory records that the listener heard the report;
10. authored definitions remain unchanged during runtime.

No generic rumor subsystem is added.

## 6. A61-S2 — Source-trust reaction proof

Use existing ReactionCandidateSet + NPC decision selection.

Source trust is canonical runtime interpersonal state, not authored initial data. A61 authors the trust threshold/weight and evaluates the current `RelationshipState` at the explicit NPC decision boundary.

Fresh compiled artifacts correctly materialize with no pre-authored runtime relationships. Integration evidence supplies explicit runtime trust premises (`0.65` for trusted-source proof and `0.30` for reserve-judgment proof); A61 does not smuggle runtime relationship state into authored content.

Candidate reactions should be authored, not hardcoded:

- trust the report;
- reserve judgment;
- optionally dismiss it if a reproduced content need appears.

Scoring may use:

- knows-claim;
- relationship-at-least on a trust axis;
- memory-tag;
- relevant Story state.

The selected NPC Move may update:

- listener -> player relationship;
- listener memory/mood;
- later Story state.

No hidden randomness. Exact ties may use only explicit supplied random input, though the first A61 proof should prefer deterministic scores.

## 7. A61-S3 — Player-visible social echo

After the NPC-to-NPC chain, the player encounters the listener in an existing social location.

The Player should see different authored reaction/actions based on the actual chain.

Minimum proof:

- met history can produce warmer recognition;
- missed-after-acceptance can produce guarded/cooler recognition;
- declined-in-advance is distinct from breaking the accepted plan;
- the Player never sees a generic debug label such as “rumor score”.

The response remains a canonical Story/Move interaction.

## 8. Rumor provenance rule

A rumor is not a free-floating string.

For A61:

- content is a canonical Claim;
- teller is the Move actor;
- listener is the target/recipient;
- runtime source uses existing `KnowledgeSource.told`;
- Story/runtime occurrence supplies event/time provenance;
- memory may reference the communicated Claim.

If this cannot explain a future multi-hop case, record that case before extending the data model.

## 9. Confidence and trust rule

A61 must not pretend that confidence and source trust are the same value.

- Claim confidence remains subjective Knowledge confidence.
- Source trust remains an interpersonal relationship axis.
- ReactionCandidateSet combines evidence declaratively for one NPC choice.
- A61 does not introduce a universal mathematical truth-propagation formula.

A later stage may require a generalized credibility model only after multiple authored arcs demonstrate repeated duplication.

## 10. Social-belief safeguard

A61 concerns concrete interpersonal/social knowledge about the player's actions.

It must not:

- infer group attitudes from one meeting;
- apply culture/group priors directly to friendship/trust;
- transform research statistics into interpersonal deltas;
- create generalized prejudice/opinion changes from a single rumor.

## 11. Invariants

- **A61-I01** — Narrative Project remains authored truth.
- **A61-I02** — rumor content is a canonical Claim.
- **A61-I03** — teller/listener provenance uses existing Move + KnowledgeSource.
- **A61-I04** — no automatic graph-wide spread.
- **A61-I05** — source trust and Claim confidence stay separate.
- **A61-I06** — NPC reaction selection remains explicit and deterministic unless an explicit draw is supplied.
- **A61-I07** — schedules never mutate Actual Presence automatically.
- **A61-I08** — player-visible consequences remain canonical Story/Moves.
- **A61-I09** — no second cognition/runtime/save engine.
- **A61-I10** — no hidden RNG.
- **A61-I11** — interpersonal events do not directly mutate group-level beliefs.
- **A61-I12** — any new mutable rumor store requires explicit HIGH-risk re-scope.

## 12. Verification ladder

### Per content batch

- project/reference validation;
- focused Story Brain WHY/Impact;
- Preview branch comparison;
- focused cognition/NPC decision tests.

### Runtime proof

- exact communicated Claim;
- listener Knowledge source character;
- confidence/timesHeard/moment;
- deterministic ReactionCandidate ranking;
- selected NPC Move and relationship/memory effect;
- later Player-visible branch;
- save/restore preservation;
- authored source immutability.

### Before merge

- self-review;
- exact-head full Branch Check GREEN;
- truthful change record/roadmap;
- fresh merge gate;
- merge authorization;
- post-merge exact stable verification.

## 13. Implementation evidence

- **#619 FAILURE** on `e073b71c6755ba0ee03827295432f338662e73bf`: A61 echo Story nodes used partial `{day, locationId}` placement. The blocking Story Brain diagnostic was corrected by keeping those dormant echo nodes location-scoped and opening them from the Day Three assessment.
- **#620 GREEN** on `16feef426ec0f8bcecc306dc5323580dbd83aafe`: S1 compile/runtime provenance proof passed.
- **#621 FAILURE** on `25e16539668c96e984e549b5e870e47c65cb3910`: the source-trust test exposed an ownership mistake. `relationships` are runtime state and fresh compiled artifacts intentionally start without an authored runtime relationship baseline.
- The false builder-side trust initializer was removed. S2 now tests the authored trust criterion against explicit canonical runtime relationship premises instead of pretending runtime state is authored data.
- **#624 GREEN** on `aa583552977e89d92b38e18c6733bd0ee726ed6f`: deterministic source-trust ranking plus Player-visible warm/guarded/neutral social echo passed.
- **#625 GREEN** on `0e474a7eb0d3b3a3614a9d1342205cdb212e58b1`: Player save/fresh materialization/restore preserves rumor provenance, runtime trust, NPC assessment and the opened echo.
- **#626 GREEN** on exact implementation head `930be316fca8622d22b790393fba4de0db059171`: 374/374 Jest suites; 2207 passed, 23 skipped, 42 todo, 2272 total; Chromium 10/10; audit 0 vulnerabilities; Vite/Electron PASS. Story Brain explains the trust score and Preview compares believe/reserve runtime differences.

Stable-to-implementation review: **12 commits ahead / 0 behind** stable. Changed boundaries are limited to the A61 contract/roadmap, one A61 content module and one focused integration-evidence suite. No runtime field, save format, artifact version, project schema, hidden RNG or second rumor/cognition engine was added.

## 14. Gate state

- E0 Evidence: **PASS**
- E1 Scope / ownership: **PASS**
- E2 Contract / invariants: **PASS**
- E3 Verification design: **PASS**
- E4 S1 rumor provenance: **PASS — #620 / #626 GREEN**
- E5 S2 source-trust NPC reaction: **PASS — #624 / #626 GREEN**
- E6 S3 Player-visible echo + persistence: **PASS — #624 / #625 / #626 GREEN**
- E7 Self-review / implementation CI: **PASS — #626 GREEN; docs-only closure exact-head CI pending**
- E8 Merge: **PENDING — requires a new explicit user message “мердж” immediately before merge**
- E9 Post-merge: **PENDING**
- E10 Recovery: **PASS**
