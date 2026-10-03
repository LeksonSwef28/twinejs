import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {NarrativeProjectHistoryState} from '../reducer';
import {
	NarrativeAuthoringCommand,
	narrativeProjectAuthoringReducer
} from '../routine-authoring';

function execute(
	state: NarrativeProjectHistoryState,
	command: NarrativeAuthoringCommand
) {
	return narrativeProjectAuthoringReducer(state, {type: 'execute', command});
}

function fixture(): NarrativeProjectHistoryState {
	let state: NarrativeProjectHistoryState = {
		past: [],
		present: createNarrativeProject(
			'move-conditions',
			'Move conditions',
			ninetyThreeDaysTemplate
		),
		future: []
	};
	state = execute(state, {
		type: 'character/add',
		id: 'mila',
		profileId: 'mila-profile',
		name: 'Мила',
		cognitionTier: 'full'
	});
	state = execute(state, {
		type: 'character/add',
		id: 'anton',
		profileId: 'anton-profile',
		name: 'Антон',
		cognitionTier: 'full'
	});
	state = execute(state, {type: 'fact/add', id: 'fact-a', title: 'Факт'});
	state = execute(state, {
		type: 'claim/add',
		id: 'claim-a',
		text: 'Утверждение',
		aboutFactId: 'fact-a',
		stance: 'supports'
	});
	state = execute(state, {
		type: 'story/addDraftNode',
		id: 'story-a',
		canvasNodeId: 'canvas-a',
		kind: 'dialogue',
		title: 'Разговор',
		position: {x: 0, y: 0}
	});
	state = execute(state, {
		type: 'story/addDraftNode',
		id: 'story-b',
		canvasNodeId: 'canvas-b',
		kind: 'event',
		title: 'Позже',
		position: {x: 250, y: 0}
	});
	state = execute(state, {
		type: 'move/add',
		id: 'move-a',
		storyNodeId: 'story-a',
		kind: 'ask',
		label: 'Спросить',
		actorCharacterId: 'mila',
		targetCharacterIds: ['anton'],
		communicatedClaimId: 'claim-a'
	});
	return state;
}

describe('Move conditions authoring', () => {
	test('authors full guard and condition resolver without touching runtime state', () => {
		let state = fixture();
		state = execute(state, {
			type: 'move/addGuard',
			moveId: 'move-a',
			guard: {
				id: 'guard-a',
				label: 'Мила знает утверждение',
				condition: {
					type: 'character-knows-claim',
					characterId: 'mila',
					claimId: 'claim-a'
				}
			}
		});
		const originalOutcome = state.present.narrativeMoves[0].outcomes[0];
		state = execute(state, {
			type: 'move/setConditionResolution',
			moveId: 'move-a',
			condition: {
				type: 'story-node-state',
				storyNodeId: 'story-b',
				state: 'available'
			},
			trueOutcomeId: originalOutcome.id,
			falseOutcomeId: 'outcome-false',
			newFalseOutcome: {
				id: 'outcome-false',
				key: 'condition-false',
				label: 'Условие не выполнено',
				effectStoryNodeIds: [],
				effects: []
			}
		});

		const move = state.present.narrativeMoves[0];
		expect(move.guards).toEqual([expect.objectContaining({id: 'guard-a'})]);
		expect(move.outcomes[0]).toEqual(originalOutcome);
		expect(move.outcomes[1]).toEqual(
			expect.objectContaining({id: 'outcome-false'})
		);
		expect(move.resolution).toEqual({
			type: 'condition',
			condition: {
				type: 'story-node-state',
				storyNodeId: 'story-b',
				state: 'available'
			},
			trueOutcomeId: originalOutcome.id,
			falseOutcomeId: 'outcome-false'
		});
		expect(state.present.storyNodeStateOverrides).toEqual({});
		expect(state.present.runtimeOccurrences).toEqual([]);
	});

	test('supports negated guards, removal and automatic resolver restoration', () => {
		let state = fixture();
		state = execute(state, {
			type: 'move/addGuard',
			moveId: 'move-a',
			guard: {
				id: 'guard-share',
				negated: true,
				condition: {
					type: 'characters-share-location',
					characterIds: ['mila', 'anton']
				}
			}
		});
		expect(state.present.narrativeMoves[0].guards[0].negated).toBe(true);
		state = execute(state, {
			type: 'move/removeGuard',
			moveId: 'move-a',
			guardId: 'guard-share'
		});
		expect(state.present.narrativeMoves[0].guards).toEqual([]);
		const outcomeId = state.present.narrativeMoves[0].outcomes[0].id;
		state = execute(state, {
			type: 'move/setAutomaticResolution',
			moveId: 'move-a',
			outcomeId
		});
		expect(state.present.narrativeMoves[0].resolution).toEqual({
			type: 'automatic',
			outcomeId
		});
	});

	test('rejects missing references and duplicate share-location participants', () => {
		const state = fixture();
		const missing = execute(state, {
			type: 'move/addGuard',
			moveId: 'move-a',
			guard: {
				id: 'guard-bad',
				condition: {
					type: 'character-has-item',
					characterId: 'mila',
					itemInstanceId: 'missing'
				}
			}
		});
		expect(missing).toBe(state);
		const duplicate = execute(state, {
			type: 'move/addGuard',
			moveId: 'move-a',
			guard: {
				id: 'guard-bad-share',
				condition: {
					type: 'characters-share-location',
					characterIds: ['mila', 'mila']
				}
			}
		});
		expect(duplicate).toBe(state);
	});
});
