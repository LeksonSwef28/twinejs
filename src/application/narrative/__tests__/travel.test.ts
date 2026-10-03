import {createCharacterBodyState} from '../../../domain/narrative/body';
import {
	arrivalCorridorIds,
	create93DaysArrivalCorridorProject
} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {setNarrativeCharacterActualLocation} from '../living-simulation';
import {executeNarrativeTravel} from '../travel';

describe('A56-S2 canonical travel orchestration', () => {
	test('advances canonical time, preserves due work and moves only the traveller', () => {
		let project = create93DaysArrivalCorridorProject();
		const start = project.simulation.minuteOfDay;
		project.storyNodes = [
			...project.storyNodes,
			{
				id: 'travel-crossed-story',
				kind: 'event',
				title: 'Событие во время дороги',
				participantIds: [],
				placement: {day: 1, minuteOfDay: start + 2},
				activationState: 'available'
			}
		];
		project = setNarrativeCharacterActualLocation(
			project,
			arrivalCorridorIds.characters.player,
			arrivalCorridorIds.locations.busStation
		);
		project = setNarrativeCharacterActualLocation(
			project,
			arrivalCorridorIds.characters.studentTraveller,
			arrivalCorridorIds.locations.studentDormitory
		);

		const result = executeNarrativeTravel(
			project,
			arrivalCorridorIds.routes.stationToSquareWalk,
			arrivalCorridorIds.characters.player
		);

		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error('Expected travel to apply.');
		}
		expect(result.simulation.trace.appliedMinutes).toBe(3);
		expect(result.project.simulation.minuteOfDay).toBe(start + 3);
		expect(
			result.project.simulation.actualLocationByCharacter.player
		).toBe(arrivalCorridorIds.locations.transportSquare);
		expect(
			result.project.simulation.actualLocationByCharacter[
				arrivalCorridorIds.characters.studentTraveller
			]
		).toBe(arrivalCorridorIds.locations.studentDormitory);
		expect(result.simulation.dueWork.map(work => work.sourceEntityId)).toContain(
			'travel-crossed-story'
		);
		expect(result.project.simulation.bodyByCharacter.player).toBeDefined();
		expect(result.project.simulation.bodyByCharacter.player.fatigue).toBeGreaterThan(
			0.05
		);
	});

	test('keeps wrong-origin travel atomic', () => {
		let project = create93DaysArrivalCorridorProject();
		project = setNarrativeCharacterActualLocation(
			project,
			arrivalCorridorIds.characters.player,
			arrivalCorridorIds.locations.transportSquare
		);
		const before = JSON.stringify(project);

		const result = executeNarrativeTravel(
			project,
			arrivalCorridorIds.routes.stationToSquareWalk,
			arrivalCorridorIds.characters.player
		);

		expect(result).toMatchObject({
			status: 'rejected',
			reason: 'wrong-origin',
			project
		});
		expect(JSON.stringify(project)).toBe(before);
	});

	test('keeps physically blocked walking travel atomic', () => {
		let project = create93DaysArrivalCorridorProject();
		project = setNarrativeCharacterActualLocation(
			project,
			arrivalCorridorIds.characters.player,
			arrivalCorridorIds.locations.busStation
		);
		project.simulation.bodyByCharacter.player = createCharacterBodyState(
			'player',
			{sleepRemainingMinutes: 30}
		);
		const before = JSON.stringify(project);

		const result = executeNarrativeTravel(
			project,
			arrivalCorridorIds.routes.stationToSquareWalk,
			arrivalCorridorIds.characters.player
		);

		expect(result.status).toBe('rejected');
		if (result.status !== 'rejected') {
			throw new Error('Expected physical travel rejection.');
		}
		expect(result.reason).toBe('physical-blocked');
		expect(result.physical?.blockers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({source: 'body', code: 'sleeping'})
			])
		);
		expect(JSON.stringify(project)).toBe(before);
	});

	test('rejects project-end partial travel without teleporting', () => {
		let project = create93DaysArrivalCorridorProject();
		project = setNarrativeCharacterActualLocation(
			project,
			arrivalCorridorIds.characters.player,
			arrivalCorridorIds.locations.busStation
		);
		project.simulation.day = 93;
		project.simulation.minuteOfDay = 24 * 60 - 2;
		const before = JSON.stringify(project);

		const result = executeNarrativeTravel(
			project,
			arrivalCorridorIds.routes.stationToSquareWalk,
			arrivalCorridorIds.characters.player
		);

		expect(result).toMatchObject({
			status: 'rejected',
			reason: 'project-end',
			project
		});
		expect(JSON.stringify(project)).toBe(before);
	});

	test('offers meaningfully different authored transit durations', () => {
		const project = create93DaysArrivalCorridorProject();
		const taxi = project.travelRoutes?.find(
			route => route.id === arrivalCorridorIds.routes.stopToTowerRouteTaxi
		);
		const bus = project.travelRoutes?.find(
			route => route.id === arrivalCorridorIds.routes.stopToTowerCityBus
		);

		expect(taxi?.durationMinutes).toBe(18);
		expect(bus?.durationMinutes).toBe(26);
		expect(taxi?.destinationLocationId).toBe(bus?.destinationLocationId);
	});
});
