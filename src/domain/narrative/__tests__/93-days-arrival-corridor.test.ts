import {
	compileNarrativeRuntimeArtifact,
	serializeNarrativeRuntimeArtifact
} from '../../../application/narrative/export-compiler';
import {resolveCharacterCarryLoad} from '../carrying';
import {
	arrivalCorridorIds,
	create93DaysArrivalCorridorProject
} from '../content/93-days-arrival-corridor';
import {validateNarrativeProjectReferences} from '../project-reference-validation';
import {analyzeNarrativeScheduleConflicts} from '../schedule-analysis';

function ids(values: {id: string}[]) {
	return values.map(value => value.id);
}

describe('A56-S1 arrival corridor authored world', () => {
	test('contains the opening corridor without premature city/route canon', () => {
		const project = create93DaysArrivalCorridorProject();

		expect(project.projectId).toBe('93-days-arrival-corridor-v1');
		expect(project.locations.map(location => location.name)).toEqual([
			'Междугородний автовокзал',
			'Транспортная площадь',
			'Остановка у автовокзала',
			'Киоски у транспортной площади',
			'Пересадка у водонапорной башни',
			'Студенческое общежитие'
		]);
		expect(project.locations.some(location => /улица|проспект|маршрут №|автобус №/i.test(location.name))).toBe(
			false
		);
		expect(project.characters.find(character => character.id === 'player')).toMatchObject({
			name: 'Неизвестный',
			cognitionTier: 'full'
		});
		expect(project.characters.length).toBeGreaterThanOrEqual(5);
		expect(project.routineRules.length).toBeGreaterThanOrEqual(6);
	});

	test('uses unique stable ids and has no broken authored references', () => {
		const project = create93DaysArrivalCorridorProject();
		const groups = [
			project.locations,
			project.scenes,
			project.characters,
			project.itemDefinitions,
			project.itemInstances,
			project.behaviorProfiles,
			project.routineRules,
			project.storyNodes,
			project.narrativeMoves
		];

		for (const group of groups) {
			const groupIds = ids(group);
			expect(new Set(groupIds).size).toBe(groupIds.length);
		}

		expect(validateNarrativeProjectReferences(project).findings).toEqual([]);
	});

	test('authored NPC routines have no overlap or exception ambiguity', () => {
		const project = create93DaysArrivalCorridorProject();
		expect(analyzeNarrativeScheduleConflicts(project).findings).toEqual([]);

		const studentRules = project.routineRules.filter(
			rule => rule.characterId === arrivalCorridorIds.characters.studentTraveller
		);
		expect(studentRules.map(rule => rule.targetLocationId)).toEqual([
			arrivalCorridorIds.locations.busStation,
			arrivalCorridorIds.locations.stationStop,
			arrivalCorridorIds.locations.studentDormitory
		]);
	});

	test('starts with physical luggage, phone and passport owned by the player', () => {
		const project = create93DaysArrivalCorridorProject();
		const load = resolveCharacterCarryLoad(
			arrivalCorridorIds.characters.player,
			project.itemDefinitions,
			project.itemInstances,
			project.itemPlacementOverrides
		);

		expect(load.topLevelItemIds).toEqual([
			arrivalCorridorIds.items.buttonPhone,
			arrivalCorridorIds.items.passport,
			arrivalCorridorIds.items.travelBag
		]);
		expect(load.totalWeightKg).toBeCloseTo(1.32);
		expect(load.handsOccupied).toBe(0);
	});

	test('compiles deterministically while preserving A52 fresh Actual Presence', () => {
		const first = compileNarrativeRuntimeArtifact(
			create93DaysArrivalCorridorProject()
		);
		const second = compileNarrativeRuntimeArtifact(
			create93DaysArrivalCorridorProject()
		);

		expect(first.status).toBe('compiled');
		expect(second.status).toBe('compiled');
		if (first.status !== 'compiled' || second.status !== 'compiled') {
			throw new Error('Expected Arrival Corridor preset to compile.');
		}

		expect(first.diagnostics.filter(item => item.disposition === 'blocker')).toEqual(
			[]
		);
		expect(serializeNarrativeRuntimeArtifact(first.artifact)).toBe(
			serializeNarrativeRuntimeArtifact(second.artifact)
		);
		expect(first.artifact.initialRuntime.simulation.actualLocationByCharacter).toEqual(
			{}
		);
		expect(first.artifact.authored.storyNodes).toHaveLength(6);
		expect(first.artifact.authored.narrativeMoves).toHaveLength(6);
	});
});
