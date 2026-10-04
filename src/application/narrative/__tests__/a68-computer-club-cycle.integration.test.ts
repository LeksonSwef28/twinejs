import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {deriveNarrativePlayerPresentation} from '../player-presentation';
import {materializeNarrativePlayerSession} from '../player-runtime';
import {executeNarrativePlayerTravel} from '../player-travel';
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

function travel(
	session: ReturnType<typeof start>,
	routeId: string
): ReturnType<typeof start> {
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
});
