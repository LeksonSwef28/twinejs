import {NarrativeMoveDefinition} from '../../../domain/narrative/interaction';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	createPreviewScenario,
	executePreviewMove,
	setPreviewRuntimeInput
} from '../preview-laboratory';
import {inspectPreviewWatch, previewWatchId} from '../preview-watches';

function watchProject() {
	const project = createNarrativeProject(
		'a51-preview-watches',
		'A51 preview watches',
		ninetyThreeDaysTemplate
	);
	project.locations = [
		{id: 'home', name: 'Дом'},
		{id: 'station', name: 'Станция'}
	];
	project.characters = [
		{
			id: 'player',
			name: 'Игрок',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'player-default'
		},
		{
			id: 'katya',
			name: 'Катя',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'katya-default'
		}
	];
	project.claims = [
		{id: 'claim-promise', text: 'Мы ещё увидимся.', stance: 'unresolved', tags: []}
	];
	project.storyNodes = [
		{
			id: 'meeting',
			kind: 'event',
			title: 'Встреча',
			participantIds: ['player', 'katya'],
			activationState: 'available'
		}
	];
	project.relationships = [
		{
			fromCharacterId: 'player',
			toCharacterId: 'katya',
			values: {trust: 4, tension: -1}
		}
	];
	project.simulation.actualLocationByCharacter = {
		player: 'home',
		katya: 'station'
	};
	project.simulation.characterKnowledge = [
		{
			id: 'knowledge:player:claim-promise',
			characterId: 'player',
			claimId: 'claim-promise',
			attitude: 'believes',
			confidence: 0.6,
			source: {type: 'authored'},
			timesHeard: 2
		}
	];
	const move: NarrativeMoveDefinition = {
		id: 'promise',
		storyNodeId: 'meeting',
		kind: 'inform',
		label: 'Дать обещание',
		actorCharacterId: 'player',
		targetCharacterIds: ['katya'],
		guards: [
			{
				id: 'same-place',
				condition: {
					type: 'characters-share-location',
					characterIds: ['player', 'katya']
				}
			}
		],
		resolution: {type: 'automatic', outcomeId: 'accepted'},
		outcomes: [
			{
				id: 'accepted',
				key: 'success',
				label: 'Принято',
				effectStoryNodeIds: [],
				effects: [
					{
						id: 'complete-meeting',
						type: 'story-node-set-state',
						storyNodeId: 'meeting',
						state: 'completed'
					}
				]
			}
		]
	};
	project.narrativeMoves = [move];
	return project;
}

describe('A51 typed preview watches', () => {
	test('read supported runtime concepts without mutating the scenario', () => {
		const scenario = createPreviewScenario(watchProject());
		const before = JSON.stringify(scenario);

		expect(inspectPreviewWatch(scenario, {type: 'moment'})).toEqual({
			type: 'moment',
			day: scenario.project.simulation.day,
			minuteOfDay: scenario.project.simulation.minuteOfDay
		});
		expect(
			inspectPreviewWatch(scenario, {type: 'actual-location', characterId: 'player'})
		).toEqual({type: 'actual-location', characterId: 'player', locationId: 'home'});
		expect(
			inspectPreviewWatch(scenario, {
				type: 'knowledge',
				characterId: 'player',
				claimId: 'claim-promise'
			})
		).toEqual({
			type: 'knowledge',
			characterId: 'player',
			claimId: 'claim-promise',
			attitude: 'believes',
			confidence: 0.6,
			timesHeard: 2
		});
		expect(
			inspectPreviewWatch(scenario, {
				type: 'relationship-axis',
				fromCharacterId: 'player',
				toCharacterId: 'katya',
				axis: 'trust'
			})
		).toEqual({
			type: 'relationship-axis',
			fromCharacterId: 'player',
			toCharacterId: 'katya',
			axis: 'trust',
			value: 4
		});
		expect(
			inspectPreviewWatch(scenario, {type: 'story-node-state', storyNodeId: 'meeting'})
		).toEqual({type: 'story-node-state', storyNodeId: 'meeting', state: 'available'});
		expect(JSON.stringify(scenario)).toBe(before);
	});

	test('re-evaluates against sandbox changes and effective Story runtime state', () => {
		let scenario = createPreviewScenario(watchProject());
		scenario = setPreviewRuntimeInput(scenario, {
			type: 'moment',
			day: 2,
			minuteOfDay: 600
		});
		scenario = setPreviewRuntimeInput(scenario, {
			type: 'actual-location',
			characterId: 'player',
			locationId: 'station'
		});
		scenario = setPreviewRuntimeInput(scenario, {
			type: 'knowledge',
			characterId: 'katya',
			claimId: 'claim-promise',
			attitude: 'knows',
			confidence: 0.95
		});
		scenario = executePreviewMove(scenario, 'promise').scenario;

		expect(inspectPreviewWatch(scenario, {type: 'moment'})).toMatchObject({
			day: 2,
			minuteOfDay: 600
		});
		expect(
			inspectPreviewWatch(scenario, {type: 'actual-location', characterId: 'player'})
		).toMatchObject({locationId: 'station'});
		expect(
			inspectPreviewWatch(scenario, {
				type: 'knowledge',
				characterId: 'katya',
				claimId: 'claim-promise'
			})
		).toMatchObject({attitude: 'knows', confidence: 0.95});
		expect(
			inspectPreviewWatch(scenario, {type: 'story-node-state', storyNodeId: 'meeting'})
		).toMatchObject({state: 'completed'});
	});

	test('rejects invalid typed references without changing the scenario', () => {
		const scenario = createPreviewScenario(watchProject());
		const before = JSON.stringify(scenario);

		expect(() =>
			inspectPreviewWatch(scenario, {type: 'actual-location', characterId: 'missing'})
		).toThrow('Unknown preview watch character: missing');
		expect(() =>
			inspectPreviewWatch(scenario, {
				type: 'knowledge',
				characterId: 'player',
				claimId: 'missing'
			})
		).toThrow('Unknown preview watch claim: missing');
		expect(() =>
			inspectPreviewWatch(scenario, {
				type: 'relationship-axis',
				fromCharacterId: 'player',
				toCharacterId: 'katya',
				axis: ''
			})
		).toThrow('Preview relationship watch axis must not be empty.');
		expect(() =>
			inspectPreviewWatch(scenario, {type: 'story-node-state', storyNodeId: 'missing'})
		).toThrow('Unknown preview watch story node: missing');
		expect(JSON.stringify(scenario)).toBe(before);
	});

	test('uses stable typed identities rather than generic object paths', () => {
		expect(previewWatchId({type: 'moment'})).toBe('moment');
		expect(
			previewWatchId({type: 'actual-location', characterId: 'player'})
		).toBe('actual-location:player');
		expect(
			previewWatchId({
				type: 'relationship-axis',
				fromCharacterId: 'player',
				toCharacterId: 'katya',
				axis: 'trust'
			})
		).toBe('relationship-axis:player:katya:trust');
	});
});
