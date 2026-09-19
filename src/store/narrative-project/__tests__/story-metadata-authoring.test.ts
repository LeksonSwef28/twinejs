import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	NarrativeProjectHistoryState,
	narrativeProjectHistoryReducer
} from '../reducer';
import {narrativeProjectAuthoringReducer} from '../routine-authoring';

function baseState(): NarrativeProjectHistoryState {
	let state: NarrativeProjectHistoryState = {
		past: [],
		present: createNarrativeProject(
			'story-metadata-authoring',
			'Story metadata authoring',
			ninetyThreeDaysTemplate
		),
		future: []
	};
	state = narrativeProjectHistoryReducer(state, {
		type: 'execute',
		command: {
			type: 'character/add',
			id: 'mila',
			profileId: 'mila-profile',
			name: 'Мила',
			cognitionTier: 'full'
		}
	});
	state = narrativeProjectHistoryReducer(state, {
		type: 'execute',
		command: {
			type: 'character/add',
			id: 'anton',
			profileId: 'anton-profile',
			name: 'Антон',
			cognitionTier: 'light'
		}
	});
	return narrativeProjectHistoryReducer(state, {
		type: 'execute',
		command: {
			type: 'story/addDraftNode',
			id: 'story-a',
			canvasNodeId: 'canvas-story-a',
			kind: 'beat',
			title: 'Черновой блок',
			position: {x: 100, y: 100}
		}
	});
}

describe('story metadata authoring', () => {
	test('updates authored metadata and policy without mutating runtime story state', () => {
		const state = baseState();
		const next = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/updateAuthoring',
				id: 'story-a',
				kind: 'event',
				title: 'Встреча у библиотеки',
				description: 'Авторское описание сцены',
				primaryCharacterId: 'mila',
				participantIds: ['mila', 'anton'],
				runtimePolicy: {
					occurrenceMode: 'repeatable',
					durationMinutes: 25,
					missAfterMinutes: 40,
					interruption: 'locked'
				}
			}
		});

		expect(next.present.storyNodes[0]).toEqual(
			expect.objectContaining({
				kind: 'event',
				title: 'Встреча у библиотеки',
				description: 'Авторское описание сцены',
				primaryCharacterId: 'mila',
				participantIds: ['mila', 'anton'],
				runtimePolicy: {
					occurrenceMode: 'repeatable',
					durationMinutes: 25,
					missAfterMinutes: 40,
					interruption: 'locked'
				}
			})
		);
		expect(next.present.storyNodeStateOverrides).toEqual({});
		expect(next.present.activeStoryExecutions).toEqual([]);
		expect(next.present.runtimeOccurrences).toEqual([]);
		expect(next.past).toHaveLength(state.past.length + 1);
	});

	test('rejects invalid policy or references and remains undoable', () => {
		const state = baseState();
		const invalid = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/updateAuthoring',
				id: 'story-a',
				kind: 'event',
				title: 'Невалидный блок',
				participantIds: ['missing-character'],
				runtimePolicy: {durationMinutes: -1}
			}
		});
		expect(invalid).toBe(state);

		const updated = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/updateAuthoring',
				id: 'story-a',
				kind: 'dialogue',
				title: 'Разговор',
				participantIds: ['mila']
			}
		});
		const undone = narrativeProjectAuthoringReducer(updated, {type: 'undo'});
		expect(undone.present.storyNodes[0].title).toBe('Черновой блок');
		expect(undone.present.storyNodes[0].kind).toBe('beat');
	});
});
