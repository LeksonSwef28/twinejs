import {compileNarrativeRuntimeArtifact, NarrativeRuntimeArtifactV1} from '../export-compiler';
import {setNarrativeCharacterActualLocation} from '../living-simulation';
import {executeNarrativePlayerAction} from '../player-action';
import {
	serializeNarrativePlayerSave,
	restoreNarrativePlayerSaveJson
} from '../player-save';
import {deriveNarrativePlayerPresentation} from '../player-presentation';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {executeNarrativePlayerStoryWork} from '../player-story-work';
import {executeNarrativePlayerTravel} from '../player-travel';
import {executeNarrativePlayerWait} from '../player-wait';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {
	create93DaysFirstWeekProject,
	firstWeekIds,
	firstWeekProjectId
} from '../../../domain/narrative/content/93-days-first-week';
import {phoneSocialLoopIds} from '../../../domain/narrative/content/93-days-phone-social-loop';
import {
	a63ContactArrivalStoryId
} from '../../../domain/narrative/content/93-days-player-npc-social-delivery';
import {rumorSocialEchoIds} from '../../../domain/narrative/content/93-days-rumor-social-echo';

const playerId = arrivalCorridorIds.characters.player;
const contactId = dayOneNarrativeIds.characters.localContact;
const smsWorkId = 'story-node:' + phoneSocialLoopIds.story.incomingSms;
const reportWorkId = 'story-node:' + rumorSocialEchoIds.story.contactReportsToDormDuty;
const dayFiveWorkId = 'story-node:' + firstWeekIds.story.dayFiveMarketIntroduction;
const daySixCinemaWorkId = 'story-node:' + firstWeekIds.story.daySixCinema;
const daySixDormWorkId = 'story-node:' + firstWeekIds.story.daySixDormCounterline;

function compileFixture(): NarrativeRuntimeArtifactV1 {
	const compiled = compileNarrativeRuntimeArtifact(create93DaysFirstWeekProject());
	if (compiled.status !== 'compiled') {
		throw new Error(
			compiled.diagnostics.map(item => item.source).join('\n')
		);
	}
	return compiled.artifact;
}

function start(artifact: NarrativeRuntimeArtifactV1) {
	const materialized = materializeNarrativePlayerSession(artifact);
	if (materialized.status !== 'ready') {
		throw new Error(materialized.summary);
	}
	const started = bootstrapNarrativePlayerWorldStart(materialized.session);
	if (started.status === 'rejected') {
		throw new Error(started.summary);
	}
	return started.session;
}

function wait(session: NarrativePlayerSession, minutes: number) {
	const result = executeNarrativePlayerWait(session, minutes);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}

function waitUntil(
	session: NarrativePlayerSession,
	day: number,
	minuteOfDay: number
) {
	const now =
		(session.currentProject.simulation.day - 1) * 24 * 60 +
		session.currentProject.simulation.minuteOfDay;
	const target = (day - 1) * 24 * 60 + minuteOfDay;
	if (target <= now) {
		throw new Error('A67 first-week test requires a future target.');
	}
	return wait(session, target - now);
}

function story(
	session: NarrativePlayerSession,
	workId: string,
	decision: 'execute' | 'miss'
) {
	const result = executeNarrativePlayerStoryWork(
		session,
		workId,
		decision,
		playerId
	);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}

function action(session: NarrativePlayerSession, moveId: string) {
	const result = executeNarrativePlayerAction(session, moveId, playerId);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}


function replace(
	session: NarrativePlayerSession,
	project: NarrativePlayerSession['currentProject']
) {
	const result = replaceNarrativePlayerSessionProject(session, project);
	if (result.status !== 'updated') {
		throw new Error('A67 Player session replacement failed.');
	}
	return result.session;
}

function place(
	session: NarrativePlayerSession,
	characterId: string,
	locationId: string
) {
	return replace(
		session,
		setNarrativeCharacterActualLocation(
			session.currentProject,
			characterId,
			locationId
		)
	);
}

function declinedHistoryBeforeDelivery() {
	let session = start(compileFixture());
	session = waitUntil(session, 2, 10 * 60 + 30);
	session = story(session, smsWorkId, 'execute');
	session = action(session, phoneSocialLoopIds.moves.decline);
	session = waitUntil(session, 3, 8 * 60);
	return session;
}

function declinedHistoryThroughDayThree() {
	return wait(declinedHistoryBeforeDelivery(), 15);
}

function playerKnows(session: NarrativePlayerSession, claimId: string) {
	return session.currentProject.simulation.characterKnowledge.some(
		item => item.characterId === playerId && item.claimId === claimId
	);
}

describe('A67-W1 first-week content skeleton', () => {
	test('extends the existing Day 1-4 production project without a new schema', () => {
		const project = create93DaysFirstWeekProject();

		expect(project.projectId).toBe(firstWeekProjectId);
		expect(project.schemaVersion).toBe(3);
		expect(
			project.storyNodes.some(
				node => node.id === rumorSocialEchoIds.story.contactReportsToDormDuty
			)
		).toBe(true);
		expect(
			project.locations.map(location => location.id)
		).toEqual(
			expect.arrayContaining([
				firstWeekIds.locations.oldMarket,
				firstWeekIds.locations.oldCinema
			])
		);
		expect(
			project.characters.some(
				character => character.id === firstWeekIds.characters.cameraStudent
			)
		).toBe(true);
	});

	test('keeps Old City market and cinema as separate canonical locations', () => {
		const project = create93DaysFirstWeekProject();
		const market = project.locations.find(
			location => location.id === firstWeekIds.locations.oldMarket
		);
		const cinema = project.locations.find(
			location => location.id === firstWeekIds.locations.oldCinema
		);

		expect(market?.name).toBe('Старый рынок');
		expect(cinema?.name).toBe('Старый кинотеатр');
		expect(firstWeekIds.locations.oldMarket).not.toBe(
			firstWeekIds.locations.oldCinema
		);
	});

	test('places a coherent Day 5-7 topology into canonical Story data', () => {
		const project = create93DaysFirstWeekProject();
		const nodes = Object.fromEntries(
			project.storyNodes.map(node => [node.id, node])
		);

		expect(nodes[firstWeekIds.story.dayFiveMarketIntroduction].placement).toMatchObject({
			day: 5,
			locationId: firstWeekIds.locations.oldMarket
		});
		expect(nodes[firstWeekIds.story.daySixCinema].placement).toMatchObject({
			day: 6,
			locationId: firstWeekIds.locations.oldCinema
		});
		expect(nodes[firstWeekIds.story.daySixDormCounterline].placement).toMatchObject({
			day: 6,
			locationId: arrivalCorridorIds.locations.studentDormitory
		});
		expect(nodes[firstWeekIds.story.daySevenWeekEcho].placement).toMatchObject({
			day: 7,
			locationId: arrivalCorridorIds.locations.studentDormitory
		});
		expect(nodes[firstWeekIds.story.daySevenWeekEcho].activationState).toBe(
			'dormant'
		);
	});

	test('adds ordinary routes and routine data for the new social hub', () => {
		const project = create93DaysFirstWeekProject();

		expect(project.travelRoutes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.routes.dormToMarketBus,
					destinationLocationId: firstWeekIds.locations.oldMarket
				}),
				expect.objectContaining({
					id: firstWeekIds.routes.marketToCinemaWalk,
					originLocationId: firstWeekIds.locations.oldMarket,
					destinationLocationId: firstWeekIds.locations.oldCinema
				})
			])
		);
		expect(project.routineRules).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.routines.cameraStudentMarket,
					characterId: firstWeekIds.characters.cameraStudent,
					targetLocationId: firstWeekIds.locations.oldMarket
				}),
				expect.objectContaining({
					id: firstWeekIds.routines.cameraStudentCinema,
					characterId: firstWeekIds.characters.cameraStudent,
					targetLocationId: firstWeekIds.locations.oldCinema
				})
			])
		);
	});

	test('still compiles through the canonical runtime artifact compiler', () => {
		const compiled = compileNarrativeRuntimeArtifact(
			create93DaysFirstWeekProject()
		);

		expect(compiled.status).toBe('compiled');
		if (compiled.status !== 'compiled') {
			throw new Error(
				compiled.diagnostics.map(item => item.source).join('\n')
			);
		}
		expect(compiled.artifact.authored.projectId).toBe(firstWeekProjectId);
	});

	test('preserves inherited A63 exact-time Day Three NPC delivery', () => {
		const session = declinedHistoryThroughDayThree();

		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.storyNodeId === a63ContactArrivalStoryId &&
					item.result === 'executed' &&
					item.moment.day === 3 &&
					item.moment.minuteOfDay === 8 * 60 + 15
			)
		).toHaveLength(1);
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.workId === reportWorkId &&
					item.result === 'executed' &&
					item.moment.day === 3 &&
					item.moment.minuteOfDay === 8 * 60 + 15
			)
		).toHaveLength(1);
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'move-outcome' &&
					item.moveId === rumorSocialEchoIds.moves.reportDeclined
			)
		).toHaveLength(1);
		expect(
			session.currentProject.simulation.characterKnowledge.some(
				item =>
					item.characterId === arrivalCorridorIds.characters.dormDuty &&
					item.claimId === rumorSocialEchoIds.claims.declinedMeeting &&
					item.source.type === 'told' &&
					item.source.sourceCharacterId === contactId
			)
		).toBe(true);
	});

	test('preserves inherited A63 delivery when first-week travel crosses 08:15', () => {
		let session = declinedHistoryBeforeDelivery();
		session = place(
			session,
			playerId,
			arrivalCorridorIds.locations.studentDormitory
		);

		const travelled = executeNarrativePlayerTravel(
			session,
			firstWeekIds.routes.dormToMarketBus,
			playerId
		);
		expect(travelled.status).toBe('applied');
		if (travelled.status !== 'applied') {
			throw new Error(travelled.summary);
		}
		session = travelled.session;

		expect(session.currentProject.simulation).toMatchObject({
			day: 3,
			minuteOfDay: 8 * 60 + 24
		});
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.workId === reportWorkId &&
					item.result === 'executed' &&
					item.moment.day === 3 &&
					item.moment.minuteOfDay === 8 * 60 + 15
			)
		).toHaveLength(1);
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'move-outcome' &&
					item.moveId === rumorSocialEchoIds.moves.reportDeclined
			)
		).toHaveLength(1);
	});

	test('carries prior social history into the Day Five market and Old City branch', () => {
		let session = declinedHistoryThroughDayThree();

		session = waitUntil(session, 5, 17 * 60 + 30);
		session = place(session, playerId, firstWeekIds.locations.oldMarket);
		session = place(
			session,
			firstWeekIds.characters.cameraStudent,
			firstWeekIds.locations.oldMarket
		);
		session = story(session, dayFiveWorkId, 'execute');

		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.moves.marketDeclined,
					state: 'ready'
				})
			])
		);
		session = action(session, firstWeekIds.moves.marketDeclined);

		expect(
			session.currentProject.simulation.characterKnowledge
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					characterId: firstWeekIds.characters.cameraStudent,
					claimId: rumorSocialEchoIds.claims.declinedMeeting,
					source: expect.objectContaining({
						type: 'told',
						sourceCharacterId: playerId
					})
				})
			])
		);
		expect(playerKnows(session, firstWeekIds.claims.cinemaInvitation)).toBe(true);
		expect(
			session.currentProject.relationships
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					fromCharacterId: firstWeekIds.characters.cameraStudent,
					toCharacterId: playerId,
					values: expect.objectContaining({familiarity: 0.08})
				})
			])
		);
		expect(
			session.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('day-five') &&
					memory.tags.includes('new-contact') &&
					memory.summary.includes('старом рынке')
			)
		).toBe(true);
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySixCinema
			]
		).toBe('available');

		session = waitUntil(session, 6, 18 * 60);
		session = place(session, playerId, firstWeekIds.locations.oldCinema);
		session = place(
			session,
			firstWeekIds.characters.cameraStudent,
			firstWeekIds.locations.oldCinema
		);
		session = story(session, daySixCinemaWorkId, 'execute');
		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.moves.cinemaStay,
					state: 'ready'
				})
			])
		);
		session = action(session, firstWeekIds.moves.cinemaStay);

		expect(
			playerKnows(session, firstWeekIds.claims.cinemaFutureContested)
		).toBe(true);
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySixDormCounterline
			]
		).toBe('blocked');
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySevenWeekEcho
			]
		).toBe('available');

		session = waitUntil(session, 7, 11 * 60);
		session = place(
			session,
			playerId,
			arrivalCorridorIds.locations.studentDormitory
		);
		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.moves.weekOldCity,
					state: 'ready'
				})
			])
		);
		session = action(session, firstWeekIds.moves.weekOldCity);
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySevenWeekEcho
			]
		).toBe('completed');
	});


	test('makes the Day Six cinema and dorm choices mutually exclusive from the same prior history', () => {
		let base = declinedHistoryThroughDayThree();
		base = waitUntil(base, 5, 17 * 60 + 30);
		base = place(base, playerId, firstWeekIds.locations.oldMarket);
		base = place(
			base,
			firstWeekIds.characters.cameraStudent,
			firstWeekIds.locations.oldMarket
		);
		base = story(base, dayFiveWorkId, 'execute');
		base = action(base, firstWeekIds.moves.marketDeclined);

		let cinema = waitUntil(base, 6, 18 * 60);
		cinema = place(cinema, playerId, firstWeekIds.locations.oldCinema);
		cinema = place(
			cinema,
			firstWeekIds.characters.cameraStudent,
			firstWeekIds.locations.oldCinema
		);
		cinema = story(cinema, daySixCinemaWorkId, 'execute');
		cinema = action(cinema, firstWeekIds.moves.cinemaStay);

		let dorm = waitUntil(base, 6, 18 * 60 + 15);
		dorm = place(
			dorm,
			playerId,
			arrivalCorridorIds.locations.studentDormitory
		);
		dorm = place(
			dorm,
			arrivalCorridorIds.characters.dormDuty,
			arrivalCorridorIds.locations.studentDormitory
		);
		dorm = story(dorm, daySixDormWorkId, 'execute');
		dorm = action(dorm, firstWeekIds.moves.dormStay);

		expect(
			cinema.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySixDormCounterline
			]
		).toBe('blocked');
		expect(
			dorm.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySixCinema
			]
		).toBe('blocked');

		expect(
			playerKnows(cinema, firstWeekIds.claims.cinemaFutureContested)
		).toBe(true);
		expect(
			playerKnows(cinema, firstWeekIds.claims.dormEveningContinuation)
		).toBe(false);
		expect(
			playerKnows(dorm, firstWeekIds.claims.cinemaFutureContested)
		).toBe(false);
		expect(
			playerKnows(dorm, firstWeekIds.claims.dormEveningContinuation)
		).toBe(true);

		expect(
			cinema.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('day-six') &&
					memory.tags.includes('cinema')
			)
		).toBe(true);
		expect(
			dorm.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('day-six') &&
					memory.tags.includes('dorm')
			)
		).toBe(true);
	});


	test('closes Day Seven with different week-end reflections for different Day Six histories', () => {
		let base = declinedHistoryThroughDayThree();
		base = waitUntil(base, 5, 17 * 60 + 30);
		base = place(base, playerId, firstWeekIds.locations.oldMarket);
		base = place(
			base,
			firstWeekIds.characters.cameraStudent,
			firstWeekIds.locations.oldMarket
		);
		base = story(base, dayFiveWorkId, 'execute');
		base = action(base, firstWeekIds.moves.marketDeclined);

		let oldCity = waitUntil(base, 6, 18 * 60);
		oldCity = place(oldCity, playerId, firstWeekIds.locations.oldCinema);
		oldCity = place(
			oldCity,
			firstWeekIds.characters.cameraStudent,
			firstWeekIds.locations.oldCinema
		);
		oldCity = story(oldCity, daySixCinemaWorkId, 'execute');
		oldCity = action(oldCity, firstWeekIds.moves.cinemaStay);
		oldCity = waitUntil(oldCity, 7, 11 * 60);
		oldCity = place(
			oldCity,
			playerId,
			arrivalCorridorIds.locations.studentDormitory
		);

		let dorm = waitUntil(base, 6, 18 * 60 + 15);
		dorm = place(
			dorm,
			playerId,
			arrivalCorridorIds.locations.studentDormitory
		);
		dorm = place(
			dorm,
			arrivalCorridorIds.characters.dormDuty,
			arrivalCorridorIds.locations.studentDormitory
		);
		dorm = story(dorm, daySixDormWorkId, 'execute');
		dorm = action(dorm, firstWeekIds.moves.dormStay);
		dorm = waitUntil(dorm, 7, 11 * 60);

		expect(
			deriveNarrativePlayerPresentation(oldCity.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.moves.weekOldCity,
					state: 'ready'
				})
			])
		);
		expect(
			deriveNarrativePlayerPresentation(dorm.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.moves.weekDorm,
					state: 'ready'
				})
			])
		);

		oldCity = action(oldCity, firstWeekIds.moves.weekOldCity);
		dorm = action(dorm, firstWeekIds.moves.weekDorm);

		expect(
			oldCity.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySevenWeekEcho
			]
		).toBe('completed');
		expect(
			dorm.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySevenWeekEcho
			]
		).toBe('completed');

		expect(
			oldCity.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('first-week') &&
					memory.summary.includes('старый рынок')
			)
		).toBe(true);
		expect(
			dorm.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('first-week') &&
					memory.summary.includes('общежитие')
			)
		).toBe(true);
	});



	test('lets a missed Day Six Old City aftermath become later Day Seven evidence', () => {
		let session = declinedHistoryThroughDayThree();

		session = waitUntil(session, 5, 17 * 60 + 30);
		session = place(session, playerId, firstWeekIds.locations.oldMarket);
		session = place(
			session,
			firstWeekIds.characters.cameraStudent,
			firstWeekIds.locations.oldMarket
		);
		session = story(session, dayFiveWorkId, 'execute');
		session = action(session, firstWeekIds.moves.marketDeclined);

		// The player stays in the dorm on Day Six. The camera student still arrives
		// at the cinema and the authored NPC-only aftermath runs at 19:15.
		session = waitUntil(session, 6, 18 * 60 + 15);
		session = place(
			session,
			playerId,
			arrivalCorridorIds.locations.studentDormitory
		);
		session = place(
			session,
			arrivalCorridorIds.characters.dormDuty,
			arrivalCorridorIds.locations.studentDormitory
		);
		session = story(session, daySixDormWorkId, 'execute');
		session = action(session, firstWeekIds.moves.dormStay);
		session = waitUntil(session, 6, 19 * 60 + 16);

		expect(
			session.currentProject.simulation.characterKnowledge.some(
				item =>
					item.characterId === firstWeekIds.characters.cameraStudent &&
					item.claimId === firstWeekIds.claims.cinemaAftermath
			)
		).toBe(true);
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySevenMarketAftermath
			]
		).toBe('available');
		expect(
			playerKnows(session, firstWeekIds.claims.cinemaAftermath)
		).toBe(false);

		// On Day Seven the player can learn what happened later, rather than being
		// replayed the same Day Six scene.
		session = waitUntil(session, 7, 16 * 60);
		session = place(session, playerId, firstWeekIds.locations.oldMarket);
		session = place(
			session,
			firstWeekIds.characters.cameraStudent,
			firstWeekIds.locations.oldMarket
		);
		session = story(
			session,
			'story-node:' + firstWeekIds.story.daySevenMarketAftermath,
			'execute'
		);

		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.moves.learnCinemaAftermath,
					state: 'ready'
				})
			])
		);
		session = action(session, firstWeekIds.moves.learnCinemaAftermath);

		expect(playerKnows(session, firstWeekIds.claims.cinemaAftermath)).toBe(true);
		expect(
			session.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('missed-event') &&
					memory.tags.includes('later-evidence')
			)
		).toBe(true);
	});

	test('restores a Day Six first-week save and continues into the Day Seven closure', () => {
		const artifact = compileFixture();
		let session = start(artifact);

		session = waitUntil(session, 2, 10 * 60 + 30);
		session = story(session, smsWorkId, 'execute');
		session = action(session, phoneSocialLoopIds.moves.decline);
		session = waitUntil(session, 5, 17 * 60 + 30);
		session = place(session, playerId, firstWeekIds.locations.oldMarket);
		session = place(
			session,
			firstWeekIds.characters.cameraStudent,
			firstWeekIds.locations.oldMarket
		);
		session = story(session, dayFiveWorkId, 'execute');
		session = action(session, firstWeekIds.moves.marketDeclined);
		session = waitUntil(session, 6, 18 * 60 + 15);
		session = place(
			session,
			playerId,
			arrivalCorridorIds.locations.studentDormitory
		);
		session = place(
			session,
			arrivalCorridorIds.characters.dormDuty,
			arrivalCorridorIds.locations.studentDormitory
		);
		session = story(session, daySixDormWorkId, 'execute');
		session = action(session, firstWeekIds.moves.dormStay);

		const serialized = serializeNarrativePlayerSave(session);
		const fresh = start(artifact);
		const restored = restoreNarrativePlayerSaveJson(fresh, serialized);

		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error('Expected A67 first-week save to restore.');
		}
		session = restored.session;

		expect(session.currentProject.simulation).toMatchObject({
			day: 6,
			minuteOfDay: 18 * 60 + 45
		});
		expect(
			playerKnows(session, firstWeekIds.claims.dormEveningContinuation)
		).toBe(true);
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySixCinema
			]
		).toBe('blocked');

		session = waitUntil(session, 7, 11 * 60);
		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.moves.weekDorm,
					state: 'ready'
				})
			])
		);
		session = action(session, firstWeekIds.moves.weekDorm);
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySevenWeekEcho
			]
		).toBe('completed');
	});

	test('lets the Day Six dorm line become a distinct week-end history', () => {
		let session = declinedHistoryThroughDayThree();

		session = waitUntil(session, 6, 18 * 60 + 15);
		session = place(
			session,
			playerId,
			arrivalCorridorIds.locations.studentDormitory
		);
		session = place(
			session,
			arrivalCorridorIds.characters.dormDuty,
			arrivalCorridorIds.locations.studentDormitory
		);
		session = story(session, daySixDormWorkId, 'execute');
		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.moves.dormStay,
					state: 'ready'
				})
			])
		);
		session = action(session, firstWeekIds.moves.dormStay);

		expect(
			playerKnows(session, firstWeekIds.claims.dormEveningContinuation)
		).toBe(true);
		expect(
			playerKnows(session, firstWeekIds.claims.cinemaFutureContested)
		).toBe(false);
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySixCinema
			]
		).toBe('blocked');
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySevenWeekEcho
			]
		).toBe('available');

		session = waitUntil(session, 7, 11 * 60);
		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: firstWeekIds.moves.weekDorm,
					state: 'ready'
				})
			])
		);
		session = action(session, firstWeekIds.moves.weekDorm);
		expect(
			session.currentProject.storyNodeStateOverrides[
				firstWeekIds.story.daySevenWeekEcho
			]
		).toBe('completed');
		expect(
			session.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('first-week') &&
					memory.summary.includes('общежитие')
			)
		).toBe(true);
	});

});
