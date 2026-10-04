# A68 — SECOND SOCIAL / CITY CONTENT CYCLE

Status: **PREPARED / BLOCKED ON A67 HUMAN UX WALKTHROUGH**
Updated: **2026-10-04**
Base stable: `bed7aa73b829f73fa2d4fb921a92b0408be127fb`

## Purpose

A68 expands the game beyond the first-week Old City/dorm loop into a broader social network and a second city layer.

It is a content-production milestone. It must reuse the existing relationship, knowledge/provenance, Story, travel, routine, phone and Player systems.

A68 must not introduce a second rumor engine, generalized social-belief engine, or separate internet simulation unless authored content proves a concrete missing contract.

## Source basis

MASTER v31 source support used for this preparation:

- `14_LOCATION_REGISTRY_V01.md` — Computer Club: **fixed by function**, approximate position between Old and New City near students; Bar “Конечная”: **working** main social-hub candidate.
- `16_YOUTH_AND_SOCIAL_SPACES.md` — Computer Club functions: LAN, games, early internet, forums/chats, disk exchange, youth companies and double online/offline identities; dormitory remains a social location.
- `13_CITY_STRUCTURE_V02.md` — central-student transition contains university, dormitory, Computer Club, Bar “Конечная” and links to Central Park.
- `20_SOCIAL_GRAPH_RULES.md` — culture/group intersections describe typical contact, not friendship/enmity; interpersonal state stays separate.
- `02_CITY_WORLD.md` — city progression from Old City through the central-student transition into New City; the Player should gradually learn routes and social links rather than unlock a single linear map.

Research social-atlas group nodes are used only as idea/evidence support. Candidate group labels are not promoted to game canon merely because they exist in the atlas.

## Source-grounded first cluster

The first A68 cluster should be the **Computer Club / central-student transition**.

MASTER v31 supports this choice:

- the Computer Club is fixed by function and approximate position;
- it sits between the Old City and New City, close to students;
- its established functions include LAN games, early internet, forums/chats, disk exchange, youth companies and double online/offline identities;
- the dormitory is already a working player home base in the same central-student transition;
- the Old City remains connected, so A67 relationships do not become obsolete.

The Bar “Конечная” is a strong later social hub, but its exact implementation remains WORKING rather than fixed. Do not make it the first A68 dependency.

## A68-C1 — Computer Club bridge batch

### Goal

Create the first post-week social expansion without new runtime architecture.

The batch should introduce:

- one canonical Computer Club location;
- authored routes from the dorm/student transition;
- at least two new NPC roles;
- one existing NPC from A67 connected to the new cluster;
- one bridge NPC whose life plausibly intersects more than one social environment;
- one in-person information path and one computer-club-mediated information path that use the same Claim/provenance model;
- at least one consequence that reaches a different place/NPC than where it originated.

### NPC roles

Do not freeze biographies before implementation, but the first two roles should cover distinct social functions:

1. **Club worker / administrator / technically competent student worker**
   - institutional/practical contact;
   - sees regulars and newcomers;
   - can connect ordinary student life to early-network culture.

2. **Club regular / student bridge**
   - belongs to the student environment but spends time in the club;
   - can plausibly know the A67 camera student or another existing student;
   - should bridge groups rather than represent a whole culture deterministically.

At least one existing A67 character should reappear in the cluster so A68 feels like expansion of one city, not a disconnected episode.

## Content loop

The first batch should cover roughly the next few playable days rather than attempt a full second week at once.

### Entry

The Player learns of the Computer Club through an existing social contact, location routine, or practical need.

No forced “internet quest”.

### First intersection

At the club, the Player encounters information that can be:

- heard directly;
- repeated secondhand;
- attributed to an online nickname or forum post;
- contradicted later in person.

All of these remain ordinary Claims with explicit provenance. “Internet” is a source/channel context, not a new belief system.

### Cross-place consequence

A club-originating Claim or plan must later affect:

- the dormitory;
- the Old City;
- or another existing social contact.

Likewise, an A67 relationship/history should affect at least one club interaction.

### Repeated relationship

At least one new NPC relationship must evolve across more than one event/day.

A68 should not be satisfied by a one-scene cameo network.

## City-theme use

The Computer Club naturally expresses the project’s modernization-vs-memory theme without turning it into a morality binary.

Possible content tensions include:

- whether new networked spaces replace older meeting places or simply add another layer;
- access, cost and technical literacy;
- online persona vs in-person reputation;
- imported outside culture/information vs local context;
- excitement about connection vs loss of privacy/slow local trust.

No side is automatically “progressive good” or “old bad”.

## Social-graph rule

Research social-atlas edges are evidence/idea support, not direct game relationship values.

In particular:

- group overlap does not imply friendship;
- rare overlap does not forbid an NPC bridge;
- a character may belong to multiple environments;
- interpersonal relationship state remains separate from group/culture typicality.

## Explicit non-goals for C1

Do not add:

- generic social-group belief state;
- automatic rumor spread;
- a separate forum/internet engine;
- generic NPC scheduler expansion;
- full New City implementation;
- Bar “Конечная” as a mandatory dependency;
- garage/Box 47 content;
- large historical exposition;
- new Character Inner World subsystem.

## Acceptance proof for C1

A68-C1 is accepted when:

1. the Computer Club is reachable through canonical Player travel;
2. at least two new NPCs have authored routines;
3. one existing A67 NPC participates in or reacts to the new network;
4. one bridge NPC participates in repeated events;
5. the same fact/claim can arrive through different explicit sources without hidden auto-spread;
6. one club-originating consequence reaches another location/social line;
7. one prior A67 history changes a C1 interaction or consequence;
8. save/continue remains safe;
9. ordinary edits remain authorable through canonical tools;
10. playtest can explain why the cross-place consequence happened.

## A68-C2 — next cluster, not yet committed

After C1 proves the pattern, choose one second cluster from current MASTER-backed options.

Strong candidates:

- **Bar “Конечная”** — cross-group social hub connecting students, musicians, garage people and older regulars;
- **Central Park / youth space** — leisure, dates, youth groups and city transition;
- **New City waterfront / youth pier** — visible contrast with Old City and a natural modernization layer.

Choose from real C1 playtest pressure. Do not prebuild all three.

## A68 milestone gate

A68 as a whole should eventually prove:

- broader consequences across NPCs and places without hidden auto-spread;
- at least one cross-group relationship evolving over repeated events;
- Player-understandable cause/effect;
- canonical authoring;
- focused fixes instead of architecture rewrite by default.

## Current blocker

A67 engineering closure passes, but its current docs still require one manual Player UX/pacing walkthrough.

A68 preparation may proceed now. Production implementation should begin after that walkthrough confirms no P0/P1 first-week blocker.
