import {createHeavyMealBodyEffect} from '../../../domain/narrative/body';
import {ItemDefinition, ItemInstance} from '../../../domain/narrative/items';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	applyNarrativeItemRuntimePlacement,
	evaluateNarrativePhysicalAction
} from '../physical';
import {applyNarrativeProjectBodyEffect} from '../simulation';

function projectWithPlayer() {
	const project = createNarrativeProject(
		'physical-story',
		'Physical integration',
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
	project.locations = [{id: 'home', name: 'Дом'}];
	const definitions: ItemDefinition[] = [
		{
			id: 'portfolio',
			name: 'Портфель',
			tags: ['bag'],
			carry: {weightKg: 1, volumeUnits: 5, sizeClass: 'medium'},
			container: {
				capacityVolumeUnits: 8,
				maxContentsWeightKg: 5,
				maxItemSize: 'medium',
				carryStyle: 'hand',
				handsRequired: 1,
				climbEffortMultiplier: 1.15
			}
		},
		{
			id: 'thermos',
			name: 'Термос',
			tags: ['drink'],
			carry: {weightKg: 0.8, volumeUnits: 3, sizeClass: 'medium'}
		},
		{
			id: 'small-bag',
			name: 'Маленькая сумочка',
			tags: ['bag'],
			carry: {weightKg: 0.4, volumeUnits: 3, sizeClass: 'small'},
			container: {
				capacityVolumeUnits: 3,
				maxContentsWeightKg: 1,
				maxItemSize: 'small',
				carryStyle: 'shoulder',
				handsRequired: 0
			}
		}
	];
	const instances: ItemInstance[] = [
		{
			id: 'portfolio-1',
			definitionId: 'portfolio',
			placement: {type: 'character', characterId: 'player'}
		},
		{
			id: 'thermos-1',
			definitionId: 'thermos',
			placement: {type: 'location', locationId: 'home'}
		},
		{
			id: 'small-bag-1',
			definitionId: 'small-bag',
			placement: {type: 'location', locationId: 'home'}
		}
	];
	project.itemDefinitions = definitions;
	project.itemInstances = instances;
	return project;
}

describe('A39 project physical read/write side', () => {
	test('combines digestion, injuries and carried equipment into one explainable action result', () => {
		let project = projectWithPlayer();
		project = applyNarrativeProjectBodyEffect(
			project,
			createHeavyMealBodyEffect('meal', 'player')
		).project;
		project.injuriesByCharacter.player = [
			{
				id: 'ankle',
				characterId: 'player',
				kind: 'ankle-sprain',
				region: 'ankle',
				pain: 'painful',
				recoveryRemainingMinutes: 240,
				treatment: 'self-care'
			}
		];

		const result = evaluateNarrativePhysicalAction(project, 'player', 'fast-run');
		expect(result.allowed).toBe(false);
		expect(result.blockers).toEqual(
			expect.arrayContaining([
				expect.objectContaining({source: 'body', code: 'digesting-heavy-meal'}),
				expect.objectContaining({source: 'injury', code: 'injury-blocks-action'})
			])
		);
	});

	test('packs a thermos into the portfolio without rewriting authored placement', () => {
		const project = projectWithPlayer();
		const authoredBefore = JSON.stringify(project.itemInstances);

		const result = applyNarrativeItemRuntimePlacement(project, 'thermos-1', {
			type: 'container',
			containerInstanceId: 'portfolio-1'
		});

		expect(result.applied).toBe(true);
		expect(result.project.itemPlacementOverrides['thermos-1']).toEqual({
			type: 'container',
			containerInstanceId: 'portfolio-1'
		});
		expect(JSON.stringify(result.project.itemInstances)).toBe(authoredBefore);
	});

	test('small bag rejects the thermos and leaves runtime placement unchanged', () => {
		const project = projectWithPlayer();
		const result = applyNarrativeItemRuntimePlacement(project, 'thermos-1', {
			type: 'container',
			containerInstanceId: 'small-bag-1'
		});

		expect(result.applied).toBe(false);
		expect(result.packing?.blockers.map(blocker => blocker.code)).toContain(
			'item-too-large'
		);
		expect(result.project).toBe(project);
		expect(project.itemPlacementOverrides).toEqual({});
	});
});
