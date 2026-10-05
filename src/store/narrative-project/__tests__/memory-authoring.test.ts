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

function projectWithMemoryMove(communicatedClaim: boolean): NarrativeProjectHistoryState {
	const project = createNarrativeProject(
		'story-memory-authoring',
		'Memory authoring',
		ninetyThreeDaysTemplate
	);
	let state: NarrativeProjectHistoryState = {
		past: [],
		present: project,
		future: []
	};
	state = execute(state, {
		type: 'story/addDraftNode',
		id: 'scene-memory',
		canvasNodeId: 'visual-scene-memory',
		kind: 'dialogue',
		title: 'Разговор, который запомнится',
		position: {x: 0, y: 0}
	});
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
	if (communicatedClaim) {
		state = execute(state, {
			type: 'claim/add',
			id: 'claim-promise',
			text: 'Я вернусь завтра'
		});
	}
	state = execute(state, {
		type: 'move/add',
		id: 'move-memory',
		storyNodeId: 'scene-memory',
		kind: 'inform',
		label: 'Сказать важную фразу',
		actorCharacterId: 'speaker',
		targetCharacterIds: ['listener'],
		communicatedClaimId: communicatedClaim ? 'claim-promise' : undefined
	});
	return state;
}

describe('memory Outcome authoring', () => {
	test('stores a character-remembers effect without applying runtime memory', () => {
		let state = projectWithMemoryMove(true);
		state = execute(state, {
			type: 'move/addEffect',
			moveId: 'move-memory',
			outcomeId: 'move-memory:outcome:continue',
			effect: {
				id: 'effect-memory',
				type: 'character-remembers',
				character: {type: 'character', characterId: 'listener'},
				summary: 'Говорящий пообещал вернуться завтра.',
				importance: 0.8,
				baseStrength: 0.7,
				tags: ['promise'],
				source: {type: 'current-move'}
			}
		});

		expect(state.present.narrativeMoves[0].outcomes[0].effects).toEqual([
			expect.objectContaining({
				id: 'effect-memory',
				type: 'character-remembers',
				summary: 'Говорящий пообещал вернуться завтра.'
			})
		]);
		expect(state.present.memories).toEqual([]);
	});

	test('accepts communicated Claim provenance only when the Move communicates a Claim', () => {
		let valid = projectWithMemoryMove(true);
		valid = execute(valid, {
			type: 'move/addEffect',
			moveId: 'move-memory',
			outcomeId: 'move-memory:outcome:continue',
			effect: {
				id: 'effect-claim-memory',
				type: 'character-remembers',
				character: {type: 'move-target', targetIndex: 0},
				summary: 'Обещание вернуться.',
				importance: 0.6,
				baseStrength: 0.6,
				tags: ['claim'],
				source: {type: 'communicated-claim'}
			}
		});
		expect(valid.present.narrativeMoves[0].outcomes[0].effects).toHaveLength(1);

		let invalid = projectWithMemoryMove(false);
		invalid = execute(invalid, {
			type: 'move/addEffect',
			moveId: 'move-memory',
			outcomeId: 'move-memory:outcome:continue',
			effect: {
				id: 'effect-invalid-claim-memory',
				type: 'character-remembers',
				character: {type: 'move-target', targetIndex: 0},
				summary: 'Нечего привязать к Claim.',
				importance: 0.5,
				baseStrength: 0.5,
				tags: [],
				source: {type: 'communicated-claim'}
			}
		});
		expect(invalid.present.narrativeMoves[0].outcomes[0].effects).toEqual([]);
	});

	test('rejects a memory effect that points to a missing fixed Character', () => {
		let state = projectWithMemoryMove(true);
		state = execute(state, {
			type: 'move/addEffect',
			moveId: 'move-memory',
			outcomeId: 'move-memory:outcome:continue',
			effect: {
				id: 'effect-missing-character-memory',
				type: 'character-remembers',
				character: {type: 'character', characterId: 'missing'},
				summary: 'Это не должно сохраниться.',
				importance: 0.5,
				baseStrength: 0.5,
				tags: [],
				source: {type: 'owning-story-node'}
			}
		});

		expect(state.present.narrativeMoves[0].outcomes[0].effects).toEqual([]);
	});
});
