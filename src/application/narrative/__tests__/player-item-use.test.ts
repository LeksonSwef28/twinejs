import {compileNarrativeRuntimeArtifact} from '../export-compiler';
import {executeNarrativePlayerFoodUse} from '../player-item-use';
import {materializeNarrativePlayerSession} from '../player-runtime';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';

function foodSession() {
	const project = createNarrativeProject(
		'a58-player-food-story',
		'A58 Player food',
		ninetyThreeDaysTemplate
	);
	project.projectId = 'a58-player-food-project';
	project.createdAt = '2000-06-01T00:00:00.000Z';
	project.updatedAt = '2000-06-01T00:00:00.000Z';
	project.characters = [
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		}
	];
	project.behaviorProfiles = [
		{id: 'player-default', characterId: 'player', name: 'Player default'}
	];
	project.itemDefinitions = [
		{
			id: 'meal',
			name: 'Meal',
			tags: ['food'],
			carry: {weightKg: 0.2, volumeUnits: 1, sizeClass: 'small'},
			food: {satietyGain: 0.2, digestionMinutes: 30}
		}
	];
	project.itemInstances = [
		{
			id: 'meal-1',
			definitionId: 'meal',
			placement: {type: 'character', characterId: 'player'}
		}
	];

	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected Player food fixture to compile.');
	}
	const materialized = materializeNarrativePlayerSession(compiled.artifact);
	if (materialized.status !== 'ready') {
		throw new Error(materialized.summary);
	}
	return materialized.session;
}

describe('A58 Player food-use bridge', () => {
	test('replaces session only after canonical food application succeeds', () => {
		const session = foodSession();

		const result = executeNarrativePlayerFoodUse(
			session,
			'meal-1',
			'player'
		);

		expect(result.status).toBe('applied');
		if (result.status !== 'applied') {
			throw new Error(result.summary);
		}
		expect(result.session).not.toBe(session);
		expect(
			result.session.currentProject.simulation.bodyByCharacter.player
				.digestionRemainingMinutes
		).toBe(30);
		expect(
			result.session.currentProject.itemPlacementOverrides['meal-1']
		).toEqual({type: 'unplaced'});
		expect(session.currentProject.itemPlacementOverrides).toEqual({});
	});

	test('rejection keeps the original Player session identity', () => {
		const session = foodSession();

		const result = executeNarrativePlayerFoodUse(
			session,
			'missing',
			'player'
		);

		expect(result).toMatchObject({
			status: 'rejected',
			reason: 'unknown-item',
			session
		});
	});
});
