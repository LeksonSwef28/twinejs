import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {createDefaultNarrativeOutcome} from '../../../domain/narrative/interaction';
import {narrativeProjectHistoryReducer} from '../../../store/narrative-project/reducer';
import {inspectStoryNodeRemoval} from '../story-node-removal';

function projectWithTwoNodes() {
	const project = createNarrativeProject(
		'remove-test-host', 'Безопасное удаление', ninetyThreeDaysTemplate
	);
	project.storyNodes = [
		{id: 'a', kind: 'event', title: 'Сцена A', participantIds: [], activationState: 'draft'},
		{id: 'b', kind: 'dialogue', title: 'Сцена Б', participantIds: [], activationState: 'draft'}
	];
	project.editor.storyCanvas!.nodes = [
		{id: 'canvas-a1', kind: 'entity', entityRef: {type: 'storyNode', id: 'a'}, position: {x: 0, y: 0}},
		{id: 'canvas-a2', kind: 'entity', entityRef: {type: 'storyNode', id: 'a'}, position: {x: 250, y: 0}}
	];
	return project;
}

function deleteNode(project: ReturnType<typeof projectWithTwoNodes>) {
	return narrativeProjectHistoryReducer(
		{past: [], present: project, future: []},
		{type: 'execute', command: {type: 'story/removeNode', id: 'a'}}
	);
}

describe('W3 Story node deletion dependency preflight', () => {
	test('allows an isolated canonical node; both visual instances disappear and the edit supports undo', () => {
		const project = projectWithTwoNodes();
		expect(inspectStoryNodeRemoval(project, 'a')).toEqual({
			status: 'ready',
			references: []
		});
		const deleted = deleteNode(project);
		expect(deleted.present.storyNodes.map(node => node.id)).toEqual(['b']);
		expect(deleted.present.editor.storyCanvas?.nodes).toEqual([]);
		expect(deleted.past).toHaveLength(1);
		const undone = narrativeProjectHistoryReducer(deleted, {type: 'undo'});
		expect(undone.present.storyNodes).toEqual(project.storyNodes);
	});

	test('prevents command dispatch from silently removing a Story connection', () => {
		const project = projectWithTwoNodes();
		project.storyConnections.push({
			id: 'edge-ab',
			sourceNodeId: 'a',
			targetNodeId: 'b',
			kind: 'flow',
			mode: 'executable',
			sourcePortId: 'flow-out',
			targetPortId: 'flow-in'
		});
		const result = inspectStoryNodeRemoval(project, 'a');
		expect(result.status).toBe('blocked');
		if (result.status === 'blocked') {
			expect(result.references).toEqual([
				expect.objectContaining({kind: 'story-connection', id: 'edge-ab'})
			]);
		}
		const deleted = deleteNode(project);
		expect(deleted.present).toBe(project);
		expect(deleted.past).toEqual([]);
		expect(project.storyConnections).toHaveLength(1);
	});

	test('blocks deletion of a node with its own Move and cross-node causal effects', () => {
		const project = projectWithTwoNodes();
		const outcome = createDefaultNarrativeOutcome('move-b');
		project.narrativeMoves = [
			{
				id: 'move-b',
				storyNodeId: 'b',
				kind: 'inform',
				label: 'Рассказать о событии A',
				targetCharacterIds: [],
				guards: [{id: 'g-1', condition: {type: 'story-node-state', storyNodeId: 'a', state: 'available'}}],
				resolution: {type: 'automatic', outcomeId: outcome.id},
				outcomes: [{...outcome, effectStoryNodeIds: ['a']}]
			},
			{
				id: 'move-a',
				storyNodeId: 'a',
				kind: 'observe',
				label: 'Действие сцены A',
				targetCharacterIds: [],
				guards: [],
				resolution: {type: 'automatic', outcomeId: 'move-a:outcome:continue'},
				outcomes: [createDefaultNarrativeOutcome('move-a')]
			}
		];
		const result = inspectStoryNodeRemoval(project, 'a');
		expect(result.status).toBe('blocked');
		if (result.status === 'blocked') {
			expect(result.references.filter(r => r.kind === 'move').map(r => r.id))
				.toEqual(['move-b', 'move-a']);
		}
		expect(deleteNode(project).present).toBe(project);
	});

	test('does not delete Story state referenced by runtime history or state overrides', () => {
		const project = projectWithTwoNodes();
		project.storyNodeStateOverrides['a'] = 'available';
		const inspection = inspectStoryNodeRemoval(project, 'a');
		expect(inspection.status).toBe('blocked');
		if (inspection.status === 'blocked') {
			expect(inspection.references).toEqual(
				expect.arrayContaining([
					expect.objectContaining({kind: 'story-state-override', id: 'a'})
				])
			);
		}
		expect(deleteNode(project).present).toBe(project);
	});

	test('missing node never becomes a destructive history action', () => {
		const project = projectWithTwoNodes();
		expect(inspectStoryNodeRemoval(project, 'missing').status).toBe('missing');
		const updated = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{type: 'execute', command: {type: 'story/removeNode', id: 'missing'}}
		);
		expect(updated.present).toBe(project);
		expect(updated.past).toEqual([]);
	});
});
