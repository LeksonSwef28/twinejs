import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {NarrativeProjectHistoryState} from '../reducer';
import {narrativeProjectAuthoringReducer} from '../routine-authoring';

function fixture(): NarrativeProjectHistoryState {
	let state: NarrativeProjectHistoryState = {
		past: [],
		present: createNarrativeProject(
			'story-connections',
			'Story connections',
			ninetyThreeDaysTemplate
		),
		future: []
	};
	const execute = (command: Parameters<typeof narrativeProjectAuthoringReducer>[1]) => {
		state = narrativeProjectAuthoringReducer(state, command);
	};
	execute({
		type: 'execute',
		command: {
			type: 'story/addDraftNode',
			id: 'source',
			canvasNodeId: 'canvas-source',
			kind: 'beat',
			title: 'Источник',
			position: {x: 0, y: 0}
		}
	});
	execute({
		type: 'execute',
		command: {
			type: 'story/addDraftNode',
			id: 'target',
			canvasNodeId: 'canvas-target',
			kind: 'beat',
			title: 'Цель',
			position: {x: 250, y: 0}
		}
	});
	return state;
}

describe('Story connection authoring', () => {
	test('promotes eligible typed flow to executable and remains undoable', () => {
		let state = fixture();
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/connect',
				id: 'flow-a',
				sourceNodeId: 'source',
				targetNodeId: 'target',
				kind: 'flow',
				mode: 'reference',
				sourcePortId: 'flow-out',
				targetPortId: 'flow-in'
			}
		});
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {type: 'story/setConnectionMode', id: 'flow-a', mode: 'executable'}
		});
		expect(state.present.storyConnections[0].mode).toBe('executable');
		const undone = narrativeProjectAuthoringReducer(state, {type: 'undo'});
		expect(undone.present.storyConnections[0].mode).toBe('reference');
	});

	test('disconnects only the selected edge, preserves nodes and supports undo', () => {
		let state = fixture();
		for (const id of ['edge-one', 'edge-two']) {
			state = narrativeProjectAuthoringReducer(state, {
				type: 'execute',
				command: {
					type: 'story/connect',
					id,
					sourceNodeId: 'source',
					targetNodeId: 'target',
					kind: 'flow',
					mode: 'reference'
				}
			});
		}
		const originalNodes = state.present.storyNodes;
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {type: 'story/disconnect', id: 'edge-one'}
		});
		expect(state.present.storyNodes).toEqual(originalNodes);
		expect(state.present.storyConnections.map(edge => edge.id)).toEqual(['edge-two']);
		state = narrativeProjectAuthoringReducer(state, {type: 'undo'});
		expect(state.present.storyConnections.map(edge => edge.id)).toEqual([
			'edge-one', 'edge-two'
		]);

		const noChange = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {type: 'story/disconnect', id: 'unknown'}
		});
		expect(noChange).toBe(state);
	});

	test('refuses executable mode for semantic edges', () => {
		let state = fixture();
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/connect',
				id: 'semantic-a',
				sourceNodeId: 'source',
				targetNodeId: 'target',
				kind: 'semantic',
				mode: 'reference',
				sourcePortId: 'semantic-out',
				targetPortId: 'semantic-in'
			}
		});
		const before = state;
		const after = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/setConnectionMode',
				id: 'semantic-a',
				mode: 'executable'
			}
		});
		expect(after).toBe(before);
		expect(after.present.storyConnections[0].mode).toBe('reference');
	});
});
