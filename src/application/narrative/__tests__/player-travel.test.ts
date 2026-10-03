import {
	arrivalCorridorIds,
	create93DaysArrivalCorridorProject
} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {setNarrativeCharacterActualLocation} from '../living-simulation';
import {
	materializeNarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from '../player-runtime';
import {executeNarrativePlayerTravel} from '../player-travel';

function sessionAtStation() {
	const project = create93DaysArrivalCorridorProject();
	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected Arrival Corridor to compile.');
	}
	const materialized = materializeNarrativePlayerSession(compiled.artifact);
	if (materialized.status !== 'ready') {
		throw new Error('Expected Arrival Corridor to materialize.');
	}
	const located = setNarrativeCharacterActualLocation(
		materialized.session.currentProject,
		arrivalCorridorIds.characters.player,
		arrivalCorridorIds.locations.busStation
	);
	const replaced = replaceNarrativePlayerSessionProject(
		materialized.session,
		located
	);
	if (replaced.status !== 'updated') {
		throw new Error('Expected player station setup to update.');
	}
	return replaced.session;
}

describe('A56 Player travel boundary', () => {
	test('replaces session after canonical travel', () => {
		const initial = sessionAtStation();
		const start = initial.currentProject.simulation.minuteOfDay;
		const result = executeNarrativePlayerTravel(
			initial,
			arrivalCorridorIds.routes.stationToSquareWalk,
			arrivalCorridorIds.characters.player
		);

		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error('Expected player travel to apply.');
		}
		expect(result.session).not.toBe(initial);
		expect(result.durationMinutes).toBe(3);
		expect(result.destinationName).toBe('Транспортная площадь');
		expect(result.session.currentProject.simulation.minuteOfDay).toBe(start + 3);
		expect(
			result.session.currentProject.simulation.actualLocationByCharacter.player
		).toBe(arrivalCorridorIds.locations.transportSquare);
	});

	test('keeps rejected travel on the original player session', () => {
		const initial = sessionAtStation();
		const result = executeNarrativePlayerTravel(
			initial,
			arrivalCorridorIds.routes.stopToDormCityBus,
			arrivalCorridorIds.characters.player
		);

		expect(result).toMatchObject({
			status: 'rejected',
			session: initial,
			reason: 'wrong-origin'
		});
	});
});
