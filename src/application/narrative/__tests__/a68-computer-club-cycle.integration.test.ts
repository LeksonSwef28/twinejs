import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {executeNarrativePlayerAction} from '../player-action';
import {deriveNarrativePlayerPresentation} from '../player-presentation';
import {
	restoreNarrativePlayerSaveJson,
	serializeNarrativePlayerSave
} from '../player-save';
import {
	materializeNarrativePlayerSession,
	NarrativePlayerSession
} from '../player-runtime';
import {executeNarrativePlayerStoryWork} from '../player-story-work';
import {executeNarrativePlayerTravel} from '../player-travel';
import {executeNarrativePlayerWait} from '../player-wait';
import {bootstrapNarrativePlayerWorldStart} from '../player-world-start';
import {arrivalCorridorIds} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {
	computerClubCycleIds,
	computerClubCycleProjectId,
	create93DaysComputerClubCycleProject
} from '../../../domain/narrative/content/93-days-computer-club-cycle';
import {firstWeekIds} from '../../../domain/narrative/content/93-days-first-week';
import {phoneSocialLoopIds} from '../../../domain/narrative/content/93-days-phone-social-loop';

const playerId = arrivalCorridorIds.characters.player;

function compileFixture() {
	const compiled = compileNarrativeRuntimeArtifact(
		create93DaysComputerClubCycleProject()
	);
	if (compiled.status !== 'compiled') {
		throw new Error(compiled.diagnostics.map(item => item.source).join('\n'));
	}
	return compiled.artifact;
}

function start(artifact = compileFixture()) {
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
		throw new Error('A68 test requires a future target.');
	}
	return wait(session, target - now);
}

function story(session: NarrativePlayerSession, storyNodeId: string) {
	const result = executeNarrativePlayerStoryWork(
		session,
		'story-node:' + storyNodeId,
		'execute',
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

function travel(
	session: NarrativePlayerSession,
	routeId: string
): NarrativePlayerSession {
	const result = executeNarrativePlayerTravel(session, routeId, playerId);
	if (result.status !== 'applied') {
		throw new Error(result.summary);
	}
	return result.session;
}

describe('A68-C1 Computer Club topology', () => {
	test('extends the canonical first-week project and still compiles', () => {
		const project = create93DaysComputerClubCycleProject();

		expect(project.projectId).toBe(computerClubCycleProjectId);
		expect(project.schemaVersion).toBe(3);
		expect(
			project.locations.filter(
				location => location.id === computerClubCycleIds.locations.computerClub
			)
		).toHaveLength(1);
		expect(
			project.characters.some(
				character => character.id === firstWeekIds.characters.cameraStudent
			)
		).toBe(true);
		expect(
			project.characters.map(character => character.id)
		).toEqual(
			expect.arrayContaining([
				computerClubCycleIds.characters.clubWorker,
				computerClubCycleIds.characters.clubRegular
			])
		);

		const compiled = compileNarrativeRuntimeArtifact(project);
		expect(compiled.status).toBe('compiled');
	});

	test('adds explicit dorm and Computer Club travel in both directions', () => {
		const project = create93DaysComputerClubCycleProject();

		expect(project.travelRoutes).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.routes.dormToClub,
					originLocationId: arrivalCorridorIds.locations.studentDormitory,
					destinationLocationId:
						computerClubCycleIds.locations.computerClub,
					mode: 'walk'
				}),
				expect.objectContaining({
					id: computerClubCycleIds.routes.clubToDorm,
					originLocationId: computerClubCycleIds.locations.computerClub,
					destinationLocationId:
						arrivalCorridorIds.locations.studentDormitory,
					mode: 'walk'
				})
			])
		);
	});

	test('authors two distinct NPC routines for the Computer Club', () => {
		const project = create93DaysComputerClubCycleProject();

		expect(project.routineRules).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.routines.clubWorker,
					characterId: computerClubCycleIds.characters.clubWorker,
					targetLocationId: computerClubCycleIds.locations.computerClub,
					activeRange: {fromDay: 8, toDay: 93}
				}),
				expect.objectContaining({
					id: computerClubCycleIds.routines.clubRegular,
					characterId: computerClubCycleIds.characters.clubRegular,
					targetLocationId: computerClubCycleIds.locations.computerClub,
					activeRange: {fromDay: 8, toDay: 93}
				})
			])
		);
	});

	test('reaches the Computer Club from cold Player start using canonical travel only', () => {
		let session = start();

		session = travel(session, arrivalCorridorIds.routes.stationToSquareWalk);
		session = travel(session, arrivalCorridorIds.routes.squareToStopWalk);
		session = travel(session, arrivalCorridorIds.routes.stopToDormCityBus);

		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(arrivalCorridorIds.locations.studentDormitory);

		expect(
			deriveNarrativePlayerPresentation(session.currentProject).travelOptions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.routes.dormToClub,
					state: 'ready'
				})
			])
		);

		session = travel(session, computerClubCycleIds.routes.dormToClub);
		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(computerClubCycleIds.locations.computerClub);

		expect(
			deriveNarrativePlayerPresentation(session.currentProject).travelOptions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.routes.clubToDorm,
					state: 'ready'
				})
			])
		);
	});

	test('preserves distinct direct and mediated provenance for the same club claim', () => {
		let base = start();

		base = travel(base, arrivalCorridorIds.routes.stationToSquareWalk);
		base = travel(base, arrivalCorridorIds.routes.squareToStopWalk);
		base = travel(base, arrivalCorridorIds.routes.stopToDormCityBus);
		base = waitUntil(base, 8, 17 * 60 + 44);
		base = travel(base, computerClubCycleIds.routes.dormToClub);

		expect(base.currentProject.simulation).toMatchObject({
			day: 8,
			minuteOfDay: 18 * 60
		});
		expect(
			base.currentProject.simulation.actualLocationByCharacter[
				computerClubCycleIds.characters.clubWorker
			]
		).toBe(computerClubCycleIds.locations.computerClub);
		expect(
			base.currentProject.simulation.actualLocationByCharacter[
				computerClubCycleIds.characters.clubRegular
			]
		).toBe(computerClubCycleIds.locations.computerClub);

		base = story(base, computerClubCycleIds.story.entry);
		expect(
			deriveNarrativePlayerPresentation(base.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.moves.askWorker,
					state: 'ready'
				}),
				expect.objectContaining({
					id: computerClubCycleIds.moves.readForum,
					state: 'ready'
				})
			])
		);

		const direct = action(base, computerClubCycleIds.moves.askWorker);
		const mediated = action(base, computerClubCycleIds.moves.readForum);

		const directKnowledge =
			direct.currentProject.simulation.characterKnowledge.find(
				item =>
					item.characterId === playerId &&
					item.claimId === computerClubCycleIds.claims.nightSession
			);
		const mediatedKnowledge =
			mediated.currentProject.simulation.characterKnowledge.find(
				item =>
					item.characterId === playerId &&
					item.claimId === computerClubCycleIds.claims.nightSession
			);

		expect(directKnowledge?.source).toEqual({
			type: 'told',
			sourceCharacterId: computerClubCycleIds.characters.clubWorker,
			sourceEventId: computerClubCycleIds.story.entry
		});
		expect(mediatedKnowledge?.source).toEqual({
			type: 'mediated',
			medium: 'forum',
			attribution: 'north_bridge',
			sourceEventId: computerClubCycleIds.story.entry
		});
		expect(directKnowledge?.claimId).toBe(mediatedKnowledge?.claimId);
		expect(directKnowledge?.confidence).toBeGreaterThan(
			mediatedKnowledge?.confidence ?? 0
		);
	});


	test('uses A67 Old City knowledge to expose one warmer Computer Club entry move', () => {
		let baseline = start();
		baseline = travel(
			baseline,
			arrivalCorridorIds.routes.stationToSquareWalk
		);
		baseline = travel(baseline, arrivalCorridorIds.routes.squareToStopWalk);
		baseline = travel(baseline, arrivalCorridorIds.routes.stopToDormCityBus);
		baseline = waitUntil(baseline, 8, 17 * 60 + 44);
		baseline = travel(baseline, computerClubCycleIds.routes.dormToClub);
		baseline = story(baseline, computerClubCycleIds.story.entry);

		const baselineActions =
			deriveNarrativePlayerPresentation(baseline.currentProject).actions;
		expect(baselineActions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.moves.askWorker,
					state: 'ready'
				}),
				expect.objectContaining({
					id: computerClubCycleIds.moves.readForum,
					state: 'ready'
				})
			])
		);
		expect(
			baselineActions.find(
				action => action.id === computerClubCycleIds.moves.referenceCinema
			)?.state
		).not.toBe('ready');

		let oldCity = start();
		oldCity = travel(
			oldCity,
			arrivalCorridorIds.routes.stationToSquareWalk
		);
		oldCity = travel(oldCity, arrivalCorridorIds.routes.squareToStopWalk);
		oldCity = travel(oldCity, arrivalCorridorIds.routes.stopToDormCityBus);

		oldCity = waitUntil(oldCity, 2, 10 * 60 + 30);
		oldCity = story(oldCity, phoneSocialLoopIds.story.incomingSms);
		oldCity = action(oldCity, phoneSocialLoopIds.moves.decline);

		oldCity = waitUntil(oldCity, 5, 17 * 60 + 6);
		oldCity = travel(oldCity, firstWeekIds.routes.dormToMarketBus);
		oldCity = story(oldCity, firstWeekIds.story.dayFiveMarketIntroduction);
		oldCity = action(oldCity, firstWeekIds.moves.marketDeclined);

		oldCity = waitUntil(oldCity, 6, 17 * 60 + 52);
		oldCity = travel(oldCity, firstWeekIds.routes.marketToCinemaWalk);
		oldCity = story(oldCity, firstWeekIds.story.daySixCinema);
		oldCity = action(oldCity, firstWeekIds.moves.cinemaStay);
		expect(
			oldCity.currentProject.simulation.characterKnowledge.some(
				item =>
					item.characterId === playerId &&
					item.claimId === firstWeekIds.claims.cinemaFutureContested
			)
		).toBe(true);

		oldCity = waitUntil(oldCity, 6, 18 * 60 + 45);
		oldCity = travel(oldCity, firstWeekIds.routes.cinemaToMarketWalk);
		oldCity = travel(oldCity, firstWeekIds.routes.marketToDormBus);
		oldCity = waitUntil(oldCity, 8, 17 * 60 + 44);
		oldCity = travel(oldCity, computerClubCycleIds.routes.dormToClub);
		oldCity = story(oldCity, computerClubCycleIds.story.entry);

		expect(
			deriveNarrativePlayerPresentation(oldCity.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.moves.referenceCinema,
					state: 'ready'
				})
			])
		);

		oldCity = action(oldCity, computerClubCycleIds.moves.referenceCinema);
		expect(oldCity.currentProject.relationships).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					fromCharacterId: computerClubCycleIds.characters.clubWorker,
					toCharacterId: playerId,
					values: expect.objectContaining({familiarity: 0.04})
				})
			])
		);
		expect(
			oldCity.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('a67-continuity') &&
					memory.tags.includes('computer-club')
			)
		).toBe(true);
	});


	test('repeats the club worker relationship across days and save/restore', () => {
		const artifact = compileFixture();
		let session = start(artifact);

		session = travel(session, arrivalCorridorIds.routes.stationToSquareWalk);
		session = travel(session, arrivalCorridorIds.routes.squareToStopWalk);
		session = travel(session, arrivalCorridorIds.routes.stopToDormCityBus);
		session = waitUntil(session, 8, 17 * 60 + 44);
		session = travel(session, computerClubCycleIds.routes.dormToClub);
		session = story(session, computerClubCycleIds.story.entry);
		session = action(session, computerClubCycleIds.moves.askWorker);

		expect(
			session.currentProject.simulation.characterKnowledge.some(
				item =>
					item.characterId === playerId &&
					item.claimId === computerClubCycleIds.claims.nightSession
			)
		).toBe(true);
		expect(session.currentProject.relationships).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					fromCharacterId: computerClubCycleIds.characters.clubWorker,
					toCharacterId: playerId,
					values: expect.objectContaining({familiarity: 0.03})
				})
			])
		);
		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.bridgeFollowup
			]
		).toBe('available');

		const serialized = serializeNarrativePlayerSave(session);
		const restored = restoreNarrativePlayerSaveJson(
			start(artifact),
			serialized
		);
		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error('Expected A68 repeated-bridge save to restore.');
		}
		session = restored.session;

		expect(session.currentProject.relationships).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					fromCharacterId: computerClubCycleIds.characters.clubWorker,
					toCharacterId: playerId,
					values: expect.objectContaining({familiarity: 0.03})
				})
			])
		);
		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.bridgeFollowup
			]
		).toBe('available');

		session = travel(session, computerClubCycleIds.routes.clubToDorm);
		session = waitUntil(session, 10, 18 * 60 + 14);
		session = travel(session, computerClubCycleIds.routes.dormToClub);

		expect(session.currentProject.simulation).toMatchObject({
			day: 10,
			minuteOfDay: 18 * 60 + 30
		});
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.storyNodeId === computerClubCycleIds.story.workerReturn &&
					item.result === 'executed'
			)
		).toHaveLength(1);
		expect(
			session.currentProject.simulation.actualLocationByCharacter[
				computerClubCycleIds.characters.clubWorker
			]
		).toBe(computerClubCycleIds.locations.computerClub);

		session = story(session, computerClubCycleIds.story.bridgeFollowup);
		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.moves.bridgeFollowup,
					state: 'ready'
				})
			])
		);

		session = action(session, computerClubCycleIds.moves.bridgeFollowup);
		expect(session.currentProject.relationships).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					fromCharacterId: computerClubCycleIds.characters.clubWorker,
					toCharacterId: playerId,
					values: expect.objectContaining({familiarity: 0.07})
				})
			])
		);
		expect(
			session.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('repeated-contact') &&
					memory.tags.includes('relationship')
			)
		).toBe(true);
		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.bridgeFollowup
			]
		).toBe('completed');
	});


	test('restores the first club interaction and continues the dorm echo exactly once', () => {
		const artifact = compileFixture();
		let session = start(artifact);

		session = travel(session, arrivalCorridorIds.routes.stationToSquareWalk);
		session = travel(session, arrivalCorridorIds.routes.squareToStopWalk);
		session = travel(session, arrivalCorridorIds.routes.stopToDormCityBus);
		session = waitUntil(session, 8, 17 * 60 + 44);
		session = travel(session, computerClubCycleIds.routes.dormToClub);
		session = story(session, computerClubCycleIds.story.entry);
		session = action(session, computerClubCycleIds.moves.askWorker);
		session = wait(session, 30);

		const beforeSaveKnowledge =
			session.currentProject.simulation.characterKnowledge.find(
				item =>
					item.characterId === playerId &&
					item.claimId === computerClubCycleIds.claims.nightSession
			);
		expect(session.currentProject.simulation).toMatchObject({
			day: 8,
			minuteOfDay: 18 * 60 + 30
		});
		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(computerClubCycleIds.locations.computerClub);
		expect(beforeSaveKnowledge?.source).toEqual({
			type: 'told',
			sourceCharacterId: computerClubCycleIds.characters.clubWorker,
			sourceEventId: computerClubCycleIds.story.entry
		});
		expect(session.currentProject.relationships).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					fromCharacterId: computerClubCycleIds.characters.clubWorker,
					toCharacterId: playerId,
					values: expect.objectContaining({familiarity: 0.03})
				})
			])
		);
		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.entry
			]
		).toBe('completed');
		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.dormEcho
			]
		).toBe('available');
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.storyNodeId === computerClubCycleIds.story.entry &&
					item.result === 'executed'
			)
		).toHaveLength(1);

		const serialized = serializeNarrativePlayerSave(session);
		const restored = restoreNarrativePlayerSaveJson(
			start(artifact),
			serialized
		);
		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error('Expected A68 cross-place save to restore.');
		}
		session = restored.session;

		const restoredKnowledge =
			session.currentProject.simulation.characterKnowledge.find(
				item =>
					item.characterId === playerId &&
					item.claimId === computerClubCycleIds.claims.nightSession
			);
		expect(session.currentProject.simulation).toMatchObject({
			day: 8,
			minuteOfDay: 18 * 60 + 30
		});
		expect(
			session.currentProject.simulation.actualLocationByCharacter[playerId]
		).toBe(computerClubCycleIds.locations.computerClub);
		expect(restoredKnowledge?.source).toEqual(beforeSaveKnowledge?.source);
		expect(session.currentProject.relationships).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					fromCharacterId: computerClubCycleIds.characters.clubWorker,
					toCharacterId: playerId,
					values: expect.objectContaining({familiarity: 0.03})
				})
			])
		);
		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.entry
			]
		).toBe('completed');
		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.dormEcho
			]
		).toBe('available');
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.storyNodeId === computerClubCycleIds.story.entry &&
					item.result === 'executed'
			)
		).toHaveLength(1);

		session = travel(session, computerClubCycleIds.routes.clubToDorm);
		session = waitUntil(session, 9, 19 * 60);
		session = story(session, computerClubCycleIds.story.dormEcho);
		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.moves.tellDormDuty,
					state: 'ready'
				})
			])
		);
		session = action(session, computerClubCycleIds.moves.tellDormDuty);
		session = wait(session, 15);

		const dormKnowledge =
			session.currentProject.simulation.characterKnowledge.find(
				item =>
					item.characterId === arrivalCorridorIds.characters.dormDuty &&
					item.claimId === computerClubCycleIds.claims.nightSession
			);
		expect(dormKnowledge?.source).toEqual({
			type: 'told',
			sourceCharacterId: playerId,
			sourceEventId: computerClubCycleIds.story.dormEcho
		});
		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.dormEcho
			]
		).toBe('completed');
		expect(
			session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.storyNodeId === computerClubCycleIds.story.dormEcho &&
					item.result === 'executed'
			)
		).toHaveLength(1);

		const repeated = executeNarrativePlayerStoryWork(
			session,
			'story-node:' + computerClubCycleIds.story.dormEcho,
			'execute',
			playerId
		);
		expect(repeated.status).toBe('rejected');
		if (repeated.status !== 'rejected') {
			throw new Error('Expected the one-shot dorm echo to reject replay.');
		}
		expect(repeated.reason).toBe('runtime-rejected');
		expect(
			repeated.session.currentProject.runtimeOccurrences.filter(
				item =>
					item.type === 'story-work' &&
					item.storyNodeId === computerClubCycleIds.story.dormEcho &&
					item.result === 'executed'
			)
		).toHaveLength(1);
	});


	test('presents the dorm consequence with enough structural causality for the Player', () => {
		let session = start();

		session = travel(session, arrivalCorridorIds.routes.stationToSquareWalk);
		session = travel(session, arrivalCorridorIds.routes.squareToStopWalk);
		session = travel(session, arrivalCorridorIds.routes.stopToDormCityBus);
		session = waitUntil(session, 8, 17 * 60 + 44);
		session = travel(session, computerClubCycleIds.routes.dormToClub);
		session = story(session, computerClubCycleIds.story.entry);
		session = action(session, computerClubCycleIds.moves.askWorker);
		session = wait(session, 30);
		session = travel(session, computerClubCycleIds.routes.clubToDorm);
		session = waitUntil(session, 9, 19 * 60);

		const beforeStory =
			deriveNarrativePlayerPresentation(session.currentProject);
		expect(beforeStory).toMatchObject({
			day: 9,
			minuteOfDay: 19 * 60,
			locationState: 'resolved',
			location: {
				id: arrivalCorridorIds.locations.studentDormitory,
				name: 'Студенческое общежитие'
			}
		});
		expect(beforeStory.localCharacters).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: arrivalCorridorIds.characters.dormDuty,
					name: 'Дежурная общежития'
				})
			])
		);
		expect(beforeStory.storyOpportunities).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: 'story-node:' + computerClubCycleIds.story.dormEcho,
					storyNodeId: computerClubCycleIds.story.dormEcho,
					title: 'Девятый день: клубная новость возвращается в общежитие',
					scheduledDay: 9,
					scheduledMinuteOfDay: 19 * 60,
					locationName: 'Студенческое общежитие',
					state: 'ready'
				})
			])
		);

		session = story(session, computerClubCycleIds.story.dormEcho);
		const activeStory =
			deriveNarrativePlayerPresentation(session.currentProject);
		expect(activeStory.actions).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.moves.tellDormDuty,
					label:
						'Рассказать дежурной, что услышал о завтрашнем вечере в клубе',
					storyNodeId: computerClubCycleIds.story.dormEcho,
					storyTitle:
						'Девятый день: клубная новость возвращается в общежитие',
					dialogue: true,
					state: 'ready'
				})
			])
		);
	});


	test('carries a club-originating claim into a later dorm conversation without auto-spread', () => {
		let session = start();

		session = travel(session, arrivalCorridorIds.routes.stationToSquareWalk);
		session = travel(session, arrivalCorridorIds.routes.squareToStopWalk);
		session = travel(session, arrivalCorridorIds.routes.stopToDormCityBus);
		session = waitUntil(session, 8, 17 * 60 + 44);
		session = travel(session, computerClubCycleIds.routes.dormToClub);
		session = story(session, computerClubCycleIds.story.entry);
		session = action(session, computerClubCycleIds.moves.readForum);

		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.dormEcho
			]
		).toBe('available');
		expect(
			session.currentProject.simulation.characterKnowledge.some(
				item =>
					item.characterId === arrivalCorridorIds.characters.dormDuty &&
					item.claimId === computerClubCycleIds.claims.nightSession
			)
		).toBe(false);

		session = travel(session, computerClubCycleIds.routes.clubToDorm);
		session = waitUntil(session, 9, 19 * 60);
		session = story(session, computerClubCycleIds.story.dormEcho);

		expect(
			deriveNarrativePlayerPresentation(session.currentProject).actions
		).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					id: computerClubCycleIds.moves.tellDormDuty,
					state: 'ready'
				})
			])
		);

		session = action(session, computerClubCycleIds.moves.tellDormDuty);

		const dormKnowledge =
			session.currentProject.simulation.characterKnowledge.find(
				item =>
					item.characterId === arrivalCorridorIds.characters.dormDuty &&
					item.claimId === computerClubCycleIds.claims.nightSession
			);
		expect(dormKnowledge?.source).toEqual({
			type: 'told',
			sourceCharacterId: playerId,
			sourceEventId: computerClubCycleIds.story.dormEcho
		});
		expect(
			session.currentProject.storyNodeStateOverrides[
				computerClubCycleIds.story.dormEcho
			]
		).toBe('completed');
		expect(
			session.currentProject.memories.some(
				memory =>
					memory.characterId === playerId &&
					memory.tags.includes('cross-place') &&
					memory.tags.includes('computer-club')
			)
		).toBe(true);
	});

});
