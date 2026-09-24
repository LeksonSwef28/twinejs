import {
	compileNarrativeRuntimeArtifact,
	serializeNarrativeRuntimeArtifact
} from '../../../application/narrative/export-compiler';
import {
	arrivalCorridorIds
} from '../content/93-days-arrival-corridor';
import {
	create93DaysEverydaySystemsProject,
	everydaySystemsIds
} from '../content/93-days-everyday-systems';
import {narrativeProjectSchemaVersion} from '../project';

describe('A58 authored everyday systems slice', () => {
	test('compiles deterministically without changing artifact or project versions', () => {
		const first = compileNarrativeRuntimeArtifact(
			create93DaysEverydaySystemsProject()
		);
		const second = compileNarrativeRuntimeArtifact(
			create93DaysEverydaySystemsProject()
		);
		expect(first.status).toBe('compiled');
		expect(second.status).toBe('compiled');
		if (first.status !== 'compiled' || second.status !== 'compiled') {
			throw new Error('Expected A58 authored project to compile.');
		}
		expect(first.artifact.version).toBe(1);
		expect(first.artifact.sourceSchemaVersion).toBe(
			narrativeProjectSchemaVersion
		);
		expect(serializeNarrativeRuntimeArtifact(first.artifact)).toBe(
			serializeNarrativeRuntimeArtifact(second.artifact)
		);
		expect(first.artifact.initialRuntime.cashByCharacter).toEqual({
			[arrivalCorridorIds.characters.player]: 12000
		});
	});

	test('authors one concrete heavy meal offer and paid transit tradeoffs', () => {
		const project = create93DaysEverydaySystemsProject();
		const food = project.itemDefinitions.find(
			item => item.id === everydaySystemsIds.items.heavyMealDefinition
		);
		const foodInstance = project.itemInstances.find(
			item => item.id === everydaySystemsIds.items.heavyMeal
		);
		const offer = project.economy?.purchaseOffers.find(
			candidate => candidate.id === everydaySystemsIds.offers.heavyMeal
		);
		expect(food?.food).toEqual({
			satietyGain: 0.55,
			digestionMinutes: 30
		});
		expect(foodInstance?.placement).toEqual({
			type: 'location',
			locationId: arrivalCorridorIds.locations.foodPoint
		});
		expect(offer).toMatchObject({
			locationId: arrivalCorridorIds.locations.foodPoint,
			itemInstanceId: everydaySystemsIds.items.heavyMeal,
			priceMinorUnits: 1800
		});

		const fares = Object.fromEntries(
			(project.travelRoutes ?? []).map(route => [
				route.id,
				route.fareMinorUnits
			])
		);
		expect(
			fares[arrivalCorridorIds.routes.stopToTowerRouteTaxi]
		).toBe(1200);
		expect(fares[arrivalCorridorIds.routes.stopToTowerCityBus]).toBe(600);
		expect(fares[arrivalCorridorIds.routes.stopToDormCityBus]).toBe(800);
		expect(fares[arrivalCorridorIds.routes.stationToSquareWalk]).toBeUndefined();
	});

	test('compiler rejects malformed authored food properties', () => {
		const project = create93DaysEverydaySystemsProject();
		const food = project.itemDefinitions.find(
			item => item.id === everydaySystemsIds.items.heavyMealDefinition
		);
		if (!food?.food) {
			throw new Error('Expected heavy meal fixture.');
		}
		food.food = {...food.food, digestionMinutes: -1};

		const result = compileNarrativeRuntimeArtifact(project);

		expect(result.status).toBe('blocked');
		expect(result.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'compiler',
					code: 'invalid-food-item'
				})
			])
		);
	});
});
