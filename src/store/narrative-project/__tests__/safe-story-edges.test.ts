import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {
	analyzeStoryContinuity,
	connectedStoryNodeIds
} from '../../../domain/narrative/story-analysis';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {narrativeProjectHistoryReducer} from '../reducer';

function initialState() {
	return {
		past: [],
		present: createNarrativeProject(
			'story-safe-edges',
			'Safe edges',
			ninetyThreeDaysTemplate
		),
		future: []
	};
}

function stateWithTwoStoryNodes() {
	let state = initialState();
	for (const [id, x] of [
		['a', 0],
		['b', 300]
	] as const) {
		state = narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: {
				type: 'story/addDraftNode',
				id,
				canvasNodeId: `visual-${id}`,
				kind: 'beat',
				title: id.toUpperCase(),
				position: {x, y: 0}
			}
		});
	}
	return state;
}

describe('safe Story edge modes', () => {
	test('defaults a new connection to reference mode', () => {
		const state = narrativeProjectHistoryReducer(stateWithTwoStoryNodes(), {
			type: 'execute',
			command: {
				type: 'story/connect',
				id: 'edge-reference',
				sourceNodeId: 'a',
				targetNodeId: 'b',
				kind: 'flow',
				sourcePortId: 'flow-out',
				targetPortId: 'flow-in'
			}
		});

		expect(state.present.storyConnections[0].mode).toBe('reference');
	});

	test('requires explicit executable mode and typed ports', () => {
		const state = narrativeProjectHistoryReducer(stateWithTwoStoryNodes(), {
			type: 'execute',
			command: {
				type: 'story/connect',
				id: 'edge-executable',
				sourceNodeId: 'a',
				targetNodeId: 'b',
				kind: 'flow',
				mode: 'executable',
				sourcePortId: 'flow-out',
				targetPortId: 'flow-in'
			}
		});

		expect(state.present.storyConnections).toEqual([
			expect.objectContaining({
				id: 'edge-executable',
				mode: 'executable'
			})
		]);
	});

	test('rejects executable edges without ports or with semantic-only kinds', () => {
		const withoutPorts = narrativeProjectHistoryReducer(
			stateWithTwoStoryNodes(),
			{
				type: 'execute',
				command: {
					type: 'story/connect',
					id: 'edge-no-ports',
					sourceNodeId: 'a',
					targetNodeId: 'b',
					kind: 'flow',
					mode: 'executable'
				}
			}
		);
		expect(withoutPorts.present.storyConnections).toHaveLength(0);

		const semantic = narrativeProjectHistoryReducer(stateWithTwoStoryNodes(), {
			type: 'execute',
			command: {
				type: 'story/connect',
				id: 'edge-semantic',
				sourceNodeId: 'a',
				targetNodeId: 'b',
				kind: 'semantic',
				mode: 'executable',
				sourcePortId: 'semantic-out',
				targetPortId: 'semantic-in'
			}
		});
		expect(semantic.present.storyConnections).toHaveLength(0);
	});

	test('lets an author explicitly promote a safe typed reference edge', () => {
		let state = narrativeProjectHistoryReducer(stateWithTwoStoryNodes(), {
			type: 'execute',
			command: {
				type: 'story/connect',
				id: 'edge-promote',
				sourceNodeId: 'a',
				targetNodeId: 'b',
				kind: 'flow',
				mode: 'reference',
				sourcePortId: 'flow-out',
				targetPortId: 'flow-in'
			}
		});
		state = narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: {
				type: 'story/setConnectionMode',
				id: 'edge-promote',
				mode: 'executable'
			}
		});

		expect(state.present.storyConnections[0].mode).toBe('executable');
	});

	test('reference edges support Focus but do not count as causal continuity', () => {
		const project = createNarrativeProject(
			'story-analysis',
			'Analysis',
			ninetyThreeDaysTemplate
		);
		project.storyNodes = [
			{
				id: 'a',
				kind: 'beat',
				title: 'A',
				participantIds: [],
				activationState: 'draft'
			},
			{
				id: 'b',
				kind: 'beat',
				title: 'B',
				participantIds: [],
				activationState: 'draft'
			}
		];
		project.storyConnections = [
			{
				id: 'edge',
				sourceNodeId: 'a',
				targetNodeId: 'b',
				kind: 'flow',
				mode: 'reference',
				sourcePortId: 'flow-out',
				targetPortId: 'flow-in'
			}
		];

		expect(connectedStoryNodeIds('a', project.storyConnections)).toEqual(
			new Set(['a', 'b'])
		);
		expect(
			analyzeStoryContinuity(
				project.storyNodes,
				project.storyConnections,
				project.template.dayCount
			).isolatedNodeIds
		).toEqual(['a', 'b']);

		project.storyConnections[0].mode = 'executable';
		expect(
			analyzeStoryContinuity(
				project.storyNodes,
				project.storyConnections,
				project.template.dayCount
			).isolatedNodeIds
		).toEqual([]);
	});
});
