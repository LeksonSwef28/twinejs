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

function projectWithStoryNode(): NarrativeProjectHistoryState {
	const project = createNarrativeProject(
		'story-moves',
		'Narrative Moves',
		ninetyThreeDaysTemplate
	);
	let state: NarrativeProjectHistoryState = {
		past: [],
		present: project,
		future: []
	};
	state = execute(state, {
		type: 'story/addDraftNode',
		id: 'scene-a',
		canvasNodeId: 'visual-scene-a',
		kind: 'dialogue',
		title: 'Разговор у двери',
		position: {x: 0, y: 0}
	});
	return state;
}

describe('narrative moves', () => {
	test('adds a no-check move with one automatic default outcome', () => {
		const state = execute(projectWithStoryNode(), {
			type: 'move/add',
			id: 'move-ask',
			storyNodeId: 'scene-a',
			kind: 'ask',
			label: 'Спросить, что произошло'
		});

		expect(state.present.narrativeMoves).toEqual([
			expect.objectContaining({
				id: 'move-ask',
				storyNodeId: 'scene-a',
				kind: 'ask',
				label: 'Спросить, что произошло',
				guards: [],
				targetCharacterIds: [],
				resolution: {
					type: 'automatic',
					outcomeId: 'move-ask:outcome:continue'
				}
			})
		]);
		expect(state.present.narrativeMoves[0].outcomes).toEqual([
			{
				id: 'move-ask:outcome:continue',
				key: 'continue',
				label: 'Продолжить',
				effectStoryNodeIds: []
			}
		]);
	});

	test('rejects missing owner, actor and communicated claim references', () => {
		let state = projectWithStoryNode();
		state = execute(state, {
			type: 'move/add',
			id: 'bad-owner',
			storyNodeId: 'missing',
			kind: 'inform',
			label: 'Невозможный ход'
		});
		state = execute(state, {
			type: 'move/add',
			id: 'bad-actor',
			storyNodeId: 'scene-a',
			kind: 'inform',
			label: 'Невозможный актор',
			actorCharacterId: 'missing-character'
		});
		state = execute(state, {
			type: 'move/add',
			id: 'bad-claim',
			storyNodeId: 'scene-a',
			kind: 'inform',
			label: 'Несуществующее утверждение',
			communicatedClaimId: 'missing-claim'
		});

		expect(state.present.narrativeMoves).toHaveLength(0);
	});

	test('keeps objective truth, speaker intent and listener belief separate', () => {
		let state = projectWithStoryNode();
		state = execute(state, {
			type: 'character/add',
			id: 'speaker',
			profileId: 'speaker-profile',
			name: 'Говорящий',
			cognitionTier: 'full'
		});
		state = execute(state, {
			type: 'character/add',
			id: 'listener',
			profileId: 'listener-profile',
			name: 'Слушатель',
			cognitionTier: 'full'
		});
		state = execute(state, {
			type: 'fact/add',
			id: 'fact-door',
			title: 'Начальник не давал разрешения'
		});
		state = execute(state, {
			type: 'claim/add',
			id: 'claim-permission',
			text: 'Начальник разрешил пройти',
			aboutFactId: 'fact-door',
			stance: 'contradicts'
		});
		state = execute(state, {
			type: 'move/add',
			id: 'move-lie',
			storyNodeId: 'scene-a',
			kind: 'deceive',
			label: 'Сказать, что начальник разрешил пройти',
			actorCharacterId: 'speaker',
			targetCharacterIds: ['listener'],
			communicatedClaimId: 'claim-permission',
			communicationIntent: 'deceive'
		});

		expect(state.present.objectiveFacts[0].title).toBe(
			'Начальник не давал разрешения'
		);
		expect(state.present.claims[0].stance).toBe('contradicts');
		expect(state.present.narrativeMoves[0].communicationIntent).toBe('deceive');
		expect(state.present.simulation.characterKnowledge).toEqual([]);
	});

	test('stores eligibility guards without mutating runtime state', () => {
		let state = projectWithStoryNode();
		state = execute(state, {
			type: 'character/add',
			id: 'actor',
			profileId: 'actor-profile',
			name: 'Актор',
			cognitionTier: 'full'
		});
		state = execute(state, {
			type: 'fact/add',
			id: 'fact-secret',
			title: 'Секрет существует'
		});
		state = execute(state, {
			type: 'claim/add',
			id: 'claim-secret',
			text: 'Я знаю секрет',
			aboutFactId: 'fact-secret',
			stance: 'supports'
		});
		state = execute(state, {
			type: 'move/add',
			id: 'move-secret',
			storyNodeId: 'scene-a',
			kind: 'inform',
			label: 'Рассказать секрет',
			actorCharacterId: 'actor',
			communicatedClaimId: 'claim-secret',
			guards: [
				{
					id: 'guard-knows',
					condition: {
						type: 'character-knows-claim',
						characterId: 'actor',
						claimId: 'claim-secret'
					}
				}
			]
		});

		expect(state.present.narrativeMoves[0].guards).toHaveLength(1);
		expect(state.present.simulation.characterKnowledge).toEqual([]);
	});

	test('accepts a condition resolution with explicit authored outcomes', () => {
		let state = projectWithStoryNode();
		state = execute(state, {
			type: 'story/addDraftNode',
			id: 'scene-yes',
			canvasNodeId: 'visual-yes',
			kind: 'effect',
			title: 'Ветка да',
			position: {x: 300, y: 0}
		});
		state = execute(state, {
			type: 'story/addDraftNode',
			id: 'scene-no',
			canvasNodeId: 'visual-no',
			kind: 'effect',
			title: 'Ветка нет',
			position: {x: 300, y: 200}
		});
		state = execute(state, {
			type: 'move/add',
			id: 'move-condition',
			storyNodeId: 'scene-a',
			kind: 'observe',
			label: 'Проверить состояние истории',
			outcomes: [
				{
					id: 'outcome-yes',
					key: 'yes',
					label: 'Да',
					effectStoryNodeIds: ['scene-yes']
				},
				{
					id: 'outcome-no',
					key: 'no',
					label: 'Нет',
					effectStoryNodeIds: ['scene-no']
				}
			],
			resolution: {
				type: 'condition',
				condition: {
					type: 'story-node-state',
					storyNodeId: 'scene-yes',
					state: 'available'
				},
				trueOutcomeId: 'outcome-yes',
				falseOutcomeId: 'outcome-no'
			}
		});

		expect(state.present.narrativeMoves[0].resolution.type).toBe('condition');
		expect(state.present.narrativeMoves[0].outcomes).toHaveLength(2);
	});

	test('removing the owning Story node removes its authored moves', () => {
		let state = execute(projectWithStoryNode(), {
			type: 'move/add',
			id: 'move-owned',
			storyNodeId: 'scene-a',
			kind: 'ask',
			label: 'Спросить'
		});
		state = execute(state, {type: 'story/removeNode', id: 'scene-a'});

		expect(state.present.narrativeMoves).toEqual([]);
	});
});
