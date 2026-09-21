import {createCharacterBodyState} from '../../../domain/narrative/body';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {evaluateNarrativePhysicalAction, applyNarrativeItemRuntimePlacement} from '../physical';
import {advanceNarrativeProjectSimulation} from '../simulation';
import {consumeNarrativeFoodItem} from '../consumables';

function foodProject() {
	const project = createNarrativeProject(
		'a58-food-story',
		'A58 food',
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
	project.itemDefinitions = [
		{
			id: 'travel-bag',
			name: 'Дорожная сумка',
			tags: ['bag'],
			carry: {weightKg: 1, volumeUnits: 8, sizeClass: 'medium'},
			container: {
				capacityVolumeUnits: 12,
				maxContentsWeightKg: 7,
				maxItemSize: 'medium',
				carryStyle: 'shoulder',
				handsRequired: 0
			}
		},
		{
			id: 'meal',
			name: 'Плотный перекус',
			tags: ['food'],
			carry: {weightKg: 0.35, volumeUnits: 1.5, sizeClass: 'small'},
			food: {satietyGain: 0.55, digestionMinutes: 30}
		}
	];
	project.itemInstances = [
		{
			id: 'bag-1',
			definitionId: 'travel-bag',
			placement: {type: 'character', characterId: 'player'}
		},
		{
			id: 'meal-1',
			definitionId: 'meal',
			placement: {type: 'character', characterId: 'player'}
		}
	];
	project.simulation.bodyByCharacter.player = createCharacterBodyState('player', {
		fatigue: 0.2,
		satiety: 0.2
	});
	return project;
}

describe('A58 concrete food integration', () => {
	test('consumes carried food through canonical body state and digestion', () => {
		const project = foodProject();
		const authoredBefore = JSON.stringify(project.itemInstances);

		const consumed = consumeNarrativeFoodItem(project, 'meal-1', 'player');

		expect(consumed.status).toBe('applied');
		if (consumed.status !== 'applied') {
			throw new Error(consumed.summary);
		}
		expect(consumed.project.simulation.bodyByCharacter.player.satiety).toBeCloseTo(
			0.75
		);
		expect(
			consumed.project.simulation.bodyByCharacter.player
				.digestionRemainingMinutes
		).toBe(30);
		expect(consumed.project.itemPlacementOverrides['meal-1']).toEqual({
			type: 'unplaced'
		});
		expect(JSON.stringify(consumed.project.itemInstances)).toBe(authoredBefore);

		const fastRun = evaluateNarrativePhysicalAction(
			consumed.project,
			'player',
			'fast-run'
		);
		expect(fastRun.allowed).toBe(false);
		expect(fastRun.blockers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'body',
					code: 'digesting-heavy-meal'
				})
			])
		);

		const afterThirty = advanceNarrativeProjectSimulation(
			consumed.project,
			30
		).project;
		expect(
			afterThirty.simulation.bodyByCharacter.player
				.digestionRemainingMinutes
		).toBe(0);
		expect(
			evaluateNarrativePhysicalAction(afterThirty, 'player', 'fast-run').allowed
		).toBe(true);
	});

	test('food inside a carried container still counts as possessed', () => {
		let project = foodProject();
		const packed = applyNarrativeItemRuntimePlacement(project, 'meal-1', {
			type: 'container',
			containerInstanceId: 'bag-1'
		});
		expect(packed.applied).toBe(true);
		project = packed.project;

		const consumed = consumeNarrativeFoodItem(project, 'meal-1', 'player');

		expect(consumed.status).toBe('applied');
		if (consumed.status !== 'applied') {
			throw new Error(consumed.summary);
		}
		expect(consumed.project.itemPlacementOverrides['meal-1']).toEqual({
			type: 'unplaced'
		});
	});

	test('rejects food that is not carried without changing the project', () => {
		const project = foodProject();
		project.itemInstances[1] = {
			...project.itemInstances[1],
			placement: {type: 'unplaced'}
		};

		const result = consumeNarrativeFoodItem(project, 'meal-1', 'player');

		expect(result).toMatchObject({
			status: 'rejected',
			reason: 'not-carried',
			project
		});
	});
});
