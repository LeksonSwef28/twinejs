import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {executeNarrativePlayerAction} from '../player-action';
import {deriveNarrativePlayerPresentation} from '../player-presentation';
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

function start() {
	const materialized = materializeNarrativePlayerSession(compileFixture());
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

});
