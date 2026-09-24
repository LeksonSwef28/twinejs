import {NarrativeProjectCommand} from '../../../application/narrative/commands';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	narrativeProjectHistoryReducer,
	NarrativeProjectHistoryState
} from '../reducer';

function execute(
	state: NarrativeProjectHistoryState,
	command: NarrativeProjectCommand
): NarrativeProjectHistoryState {
	return narrativeProjectHistoryReducer(state, {type: 'execute', command});
}

function baseState() {
	let state: NarrativeProjectHistoryState = {
		past: [],
		present: createNarrativeProject('advanced', 'Advanced', ninetyThreeDaysTemplate),
		future: []
	};
	state = execute(state, {
		type: 'story/addDraftNode',
		id: 'scene',
		canvasNodeId: 'canvas-scene',
		kind: 'dialogue',
		title: 'Разговор',
		position: {x: 0, y: 0}
	});
	for (const id of ['actor', 'target']) {
		state = execute(state, {
			type: 'character/add',
			id,
			profileId: `${id}-profile`,
			name: id,
			cognitionTier: 'full'
		});
	}
	state = execute(state, {type: 'fact/add', id: 'fact', title: 'Факт'});
	state = execute(state, {
		type: 'claim/add',
		id: 'claim',
		text: 'Утверждение',
		aboutFactId: 'fact',
		stance: 'supports'
	});
	return state;
}

describe('advanced narrative authoring', () => {
	test('instantiates a reusable template as one undoable authoring command', () => {
		let state = baseState();
		state = execute(state, {
			type: 'template/add',
			template: {
				id: 'template',
				name: 'Сообщить',
				roles: [
					{id: 'speaker', label: 'Говорящий'},
					{id: 'listener', label: 'Слушатель'}
				],
				claimSlots: [{id: 'claim-slot', label: 'Claim', required: true}],
				moves: [
					{
						id: 'tell',
						kind: 'inform',
						label: 'Рассказать',
						actorRoleId: 'speaker',
						targetRoleIds: ['listener'],
						communicatedClaimSlotId: 'claim-slot'
					}
				],
				tags: []
			}
		});
		const beforeInstantiation = state;
		state = execute(state, {
			type: 'template/instantiate',
			templateId: 'template',
			instanceId: 'instance',
			binding: {
				storyNodeId: 'scene',
				characterByRole: {speaker: 'actor', listener: 'target'},
				claimBySlot: {'claim-slot': 'claim'}
			}
		});

		expect(state.present.narrativeMoves).toHaveLength(1);
		expect(state.present.narrativeMoves[0]).toEqual(
			expect.objectContaining({
				id: 'instance:tell',
				actorCharacterId: 'actor',
				targetCharacterIds: ['target'],
				communicatedClaimId: 'claim'
			})
		);

		const undone = narrativeProjectHistoryReducer(state, {type: 'undo'});
		expect(undone.present.narrativeMoves).toEqual(
			beforeInstantiation.present.narrativeMoves
		);
		expect(undone.present.interactionTemplates).toHaveLength(1);
	});

	test('authors typed effects only when their project references exist', () => {
		let state = baseState();
		state = execute(state, {
			type: 'move/add',
			id: 'move',
			storyNodeId: 'scene',
			kind: 'inform',
			label: 'Реплика',
			actorCharacterId: 'actor',
			targetCharacterIds: ['target']
		});
		const outcomeId = state.present.narrativeMoves[0].outcomes[0].id;
		state = execute(state, {
			type: 'move/addEffect',
			moveId: 'move',
			outcomeId,
			effect: {
				id: 'bad-mood',
				type: 'character-mood-set',
				character: {type: 'character', characterId: 'missing'},
				mood: 'angry'
			}
		});
		expect(state.present.narrativeMoves[0].outcomes[0].effects).toEqual([]);

		state = execute(state, {
			type: 'move/addEffect',
			moveId: 'move',
			outcomeId,
			effect: {
				id: 'trust',
				type: 'relationship-adjust',
				from: {type: 'move-target', targetIndex: 0},
				to: {type: 'move-actor'},
				axis: 'trust',
				delta: -2
			}
		});
		expect(state.present.narrativeMoves[0].outcomes[0].effects).toEqual([
			expect.objectContaining({id: 'trust', type: 'relationship-adjust'})
		]);
	});

	test('stores an authored reaction set against moves from the same Story node', () => {
		let state = baseState();
		state = execute(state, {
			type: 'move/add',
			id: 'positive',
			storyNodeId: 'scene',
			kind: 'inform',
			label: 'Ответить спокойно',
			actorCharacterId: 'target'
		});
		state = execute(state, {
			type: 'move/add',
			id: 'negative',
			storyNodeId: 'scene',
			kind: 'threaten',
			label: 'Ответить резко',
			actorCharacterId: 'target'
		});
		state = execute(state, {
			type: 'reaction/addSet',
			set: {
				id: 'reaction-set',
				storyNodeId: 'scene',
				reactingCharacterId: 'target',
				counterpartCharacterId: 'actor',
				candidates: [
					{
						id: 'candidate-positive',
						moveId: 'positive',
						valence: 'positive',
						baseScore: 2,
						guards: [],
						considerations: [
							{
								id: 'trust-consideration',
								type: 'relationship-at-least',
								axis: 'trust',
								value: 5,
								weight: 3
							}
						]
					},
					{
						id: 'candidate-negative',
						moveId: 'negative',
						valence: 'negative',
						baseScore: 0,
						guards: [],
						considerations: []
					}
				]
			}
		});

		expect(state.present.reactionCandidateSets).toHaveLength(1);
		expect(state.present.reactionCandidateSets[0].candidates).toHaveLength(2);
	});
});
