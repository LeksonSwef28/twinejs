import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {executeNarrativeTravel} from '../travel';

function fareProject() {
	const project = createNarrativeProject(
		'a58-fare-story',
		'A58 fares',
		ninetyThreeDaysTemplate
	);
	project.characters = [
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.locations = [
		{id: 'a', name: 'A'},
		{id: 'b', name: 'B'}
	];
	project.travelRoutes = [
		{
			id: 'paid',
			label: 'Платный автобус',
			originLocationId: 'a',
			destinationLocationId: 'b',
			durationMinutes: 20,
			mode: 'city-bus',
			fareMinorUnits: 300
		},
		{
			id: 'free',
			label: 'Бесплатная дорога',
			originLocationId: 'a',
			destinationLocationId: 'b',
			durationMinutes: 25,
			mode: 'custom'
		}
	];
	project.cashByCharacter = {player: 1000};
	project.simulation.actualLocationByCharacter.player = 'a';
	project.simulation.day = 1;
	project.simulation.minuteOfDay = 6 * 60;
	return project;
}

describe('A58 paid travel atomicity', () => {
	test('charges exactly once after successful canonical time advancement', () => {
		const project = fareProject();

		const result = executeNarrativeTravel(project, 'paid', 'player');

		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error(result.summary);
		}
		expect(result.project.cashByCharacter.player).toBe(700);
		expect(result.spendTrace).toMatchObject({
			amountMinorUnits: 300,
			balanceBeforeMinorUnits: 1000,
			balanceAfterMinorUnits: 700
		});
		expect(result.project.simulation.minuteOfDay).toBe(6 * 60 + 20);
		expect(result.project.simulation.actualLocationByCharacter.player).toBe('b');
		expect(project.cashByCharacter.player).toBe(1000);
		expect(project.simulation.minuteOfDay).toBe(6 * 60);
		expect(project.simulation.actualLocationByCharacter.player).toBe('a');
	});

	test('insufficient funds rejects before time/location changes', () => {
		const project = fareProject();
		project.cashByCharacter = {player: 299};

		const result = executeNarrativeTravel(project, 'paid', 'player');

		expect(result).toMatchObject({
			status: 'rejected',
			reason: 'insufficient-funds',
			project
		});
		expect(project.simulation.minuteOfDay).toBe(6 * 60);
		expect(project.simulation.actualLocationByCharacter.player).toBe('a');
		expect(project.cashByCharacter.player).toBe(299);
	});

	test('project-end rejection charges nothing', () => {
		const project = fareProject();
		project.simulation.day = project.template.dayCount;
		project.simulation.minuteOfDay = 24 * 60 - 10;

		const result = executeNarrativeTravel(project, 'paid', 'player');

		expect(result).toMatchObject({
			status: 'rejected',
			reason: 'project-end',
			project
		});
		expect(project.cashByCharacter.player).toBe(1000);
		expect(project.simulation.actualLocationByCharacter.player).toBe('a');
	});

	test('free routes preserve A56 behavior and do not write cash', () => {
		const project = fareProject();

		const result = executeNarrativeTravel(project, 'free', 'player');

		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error(result.summary);
		}
		expect(result.project.cashByCharacter.player).toBe(1000);
		expect(result.fareMinorUnits).toBeUndefined();
		expect(result.spendTrace).toBeUndefined();
		expect(result.project.simulation.minuteOfDay).toBe(6 * 60 + 25);
		expect(result.project.simulation.actualLocationByCharacter.player).toBe('b');
	});
});
