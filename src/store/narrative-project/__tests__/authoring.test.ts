import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {narrativeProjectHistoryReducer} from '../reducer';

function initialState() {
	return {
		past: [],
		present: createNarrativeProject(
			'story-1',
			'Test',
			ninetyThreeDaysTemplate
		),
		future: []
	};
}

describe('narrative authoring domain', () => {
	test('keeps item definitions separate from physical instances', () => {
		let state = narrativeProjectHistoryReducer(initialState(), {
			type: 'execute',
			command: {
				type: 'item/addDefinition',
				id: 'key-definition',
				name: 'Ключ от комнаты'
			}
		});
		state = narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: {
				type: 'item/addInstance',
				id: 'key-a',
				definitionId: 'key-definition'
			}
		});
		state = narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: {
				type: 'item/addInstance',
				id: 'key-b',
				definitionId: 'key-definition',
				placement: {type: 'location', locationId: 'bar'}
			}
		});

		expect(state.present.itemDefinitions).toHaveLength(1);
		expect(state.present.itemInstances).toEqual([
			expect.objectContaining({
				id: 'key-a',
				definitionId: 'key-definition',
				placement: {type: 'unplaced'}
			}),
			expect.objectContaining({
				id: 'key-b',
				definitionId: 'key-definition',
				placement: {type: 'location', locationId: 'bar'}
			})
		]);
	});

	test('lets a story draft gain and lose a world-time placement', () => {
		let state = narrativeProjectHistoryReducer(initialState(), {
			type: 'execute',
			command: {
				type: 'story/addDraftNode',
				id: 'beat-1',
				canvasNodeId: 'visual-beat-1',
				kind: 'beat',
				title: 'Катя узнаёт правду',
				position: {x: 100, y: 100}
			}
		});
		state = narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: {
				type: 'story/setPlacement',
				id: 'beat-1',
				placement: {
					day: 18,
					minuteOfDay: 19 * 60 + 35,
					locationId: 'bar'
				}
			}
		});

		expect(state.present.storyNodes[0].placement).toEqual({
			day: 18,
			minuteOfDay: 19 * 60 + 35,
			locationId: 'bar'
		});

		state = narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: {
				type: 'story/setPlacement',
				id: 'beat-1',
				placement: undefined
			}
		});
		expect(state.present.storyNodes[0].placement).toBeUndefined();
	});
});
