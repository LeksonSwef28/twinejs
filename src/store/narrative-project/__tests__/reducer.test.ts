import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {narrativeProjectHistoryReducer} from '../reducer';

describe('narrative project history', () => {
	test('undoes and redoes a domain edit', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const initial = {past: [], present: project, future: []};
		const added = narrativeProjectHistoryReducer(initial, {
			type: 'execute',
			command: {type: 'location/add', id: 'location-bar', name: 'Бар'}
		});

		expect(added.present.locations).toHaveLength(1);
		const undone = narrativeProjectHistoryReducer(added, {type: 'undo'});
		expect(undone.present.locations).toHaveLength(0);
		const redone = narrativeProjectHistoryReducer(undone, {type: 'redo'});
		expect(redone.present.locations).toHaveLength(1);
	});

	test('does not put editor day navigation into undo history', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const state = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{type: 'execute', command: {type: 'editor/selectDay', day: 25}}
		);

		expect(state.present.editor.selectedDay).toBe(25);
		expect(state.past).toHaveLength(0);
	});

	test('selects an exact moment and keeps the coarse period synchronized', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const state = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {type: 'editor/selectMoment', day: 4, minuteOfDay: 19 * 60 + 35}
			}
		);

		expect(state.present.editor.selectedDay).toBe(4);
		expect(state.present.editor.selectedMinuteOfDay).toBe(19 * 60 + 35);
		expect(state.present.editor.selectedPeriodId).toBe('evening');
		expect(state.past).toHaveLength(0);
	});

	test('keeps the wrapped night period synchronized before and after midnight', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const lateNight = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {type: 'editor/selectMoment', day: 4, minuteOfDay: 23 * 60 + 30}
			}
		);
		const earlyNight = narrativeProjectHistoryReducer(lateNight, {
			type: 'execute',
			command: {type: 'editor/selectMoment', day: 5, minuteOfDay: 2 * 60 + 15}
		});

		expect(lateNight.present.editor.selectedPeriodId).toBe('night');
		expect(earlyNight.present.editor.selectedPeriodId).toBe('night');
		expect(earlyNight.past).toHaveLength(0);
	});

	test('switches editor workspace without adding undo history', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const state = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{type: 'execute', command: {type: 'editor/selectWorkspace', workspace: 'world-time'}}
		);

		expect(state.present.editor.workspaceMode).toBe('world-time');
		expect(state.past).toHaveLength(0);
	});

	test('creates an unscheduled story node and its visual instance together', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const state = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {
					type: 'story/addDraftNode',
					id: 'story-node-1',
					canvasNodeId: 'canvas-node-1',
					kind: 'beat',
					title: 'Катя узнаёт правду',
					position: {x: 100, y: 200}
				}
			}
		);

		expect(state.present.storyNodes).toEqual([
			expect.objectContaining({
				id: 'story-node-1',
				title: 'Катя узнаёт правду',
				activationState: 'draft'
			})
		]);
		expect(state.present.storyNodes[0].placement).toBeUndefined();
		expect(state.present.editor.storyCanvas?.nodes).toEqual([
			expect.objectContaining({
				id: 'canvas-node-1',
				entityRef: {type: 'storyNode', id: 'story-node-1'},
				position: {x: 100, y: 200}
			})
		]);
		expect(state.past).toHaveLength(1);
	});

	test('keeps canvas movement outside authored undo history', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const withNode = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {
					type: 'editor/addCanvasReference',
					canvasNodeId: 'visual-katya',
					entityRef: {type: 'character', id: 'katya'},
					position: {x: 20, y: 30}
				}
			}
		);
		const moved = narrativeProjectHistoryReducer(withNode, {
			type: 'execute',
			command: {
				type: 'editor/moveCanvasNode',
				canvasNodeId: 'visual-katya',
				position: {x: 220, y: 330}
			}
		});

		expect(moved.present.editor.storyCanvas?.nodes[0].position).toEqual({
			x: 220,
			y: 330
		});
		expect(moved.past).toHaveLength(0);
	});

	test('connects story nodes through explicit typed ports', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		let state = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {
					type: 'story/addDraftNode',
					id: 'a',
					canvasNodeId: 'visual-a',
					kind: 'beat',
					title: 'A',
					position: {x: 0, y: 0}
				}
			}
		);
		state = narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: {
				type: 'story/addDraftNode',
				id: 'b',
				canvasNodeId: 'visual-b',
				kind: 'event',
				title: 'B',
				position: {x: 300, y: 0}
			}
		});
		state = narrativeProjectHistoryReducer(state, {
			type: 'execute',
			command: {
				type: 'story/connect',
				id: 'edge-1',
				sourceNodeId: 'a',
				targetNodeId: 'b',
				kind: 'flow',
				sourcePortId: 'flow-out',
				targetPortId: 'flow-in'
			}
		});

		expect(state.present.storyConnections).toEqual([
			expect.objectContaining({
				id: 'edge-1',
				sourcePortId: 'flow-out',
				targetPortId: 'flow-in'
			})
		]);
	});

	test('world-time viewport navigation updates the view cursor but not history', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const center = 40 * 24 * 60 + 23 * 60;
		const state = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {
					type: 'editor/setWorldTimeViewport',
					centerAbsoluteMinute: center,
					pixelsPerHour: 24,
					viewportWidth: 1000,
					viewportHeight: 500
				}
			}
		);

		expect(state.present.editor.selectedDay).toBe(41);
		expect(state.present.editor.selectedMinuteOfDay).toBe(23 * 60);
		expect(state.present.editor.selectedPeriodId).toBe('night');
		expect(state.present.editor.worldTimeViewport?.pixelsPerHour).toBe(24);
		expect(state.past).toHaveLength(0);
	});

	test('undo and redo preserve the current editor view instead of restoring an old camera moment', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const added = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{
				type: 'execute',
				command: {type: 'location/add', id: 'location-bar', name: 'Бар'}
			}
		);
		const navigated = narrativeProjectHistoryReducer(added, {
			type: 'execute',
			command: {type: 'editor/selectMoment', day: 30, minuteOfDay: 21 * 60 + 15}
		});
		const undone = narrativeProjectHistoryReducer(navigated, {type: 'undo'});

		expect(undone.present.locations).toHaveLength(0);
		expect(undone.present.editor.selectedDay).toBe(30);
		expect(undone.present.editor.selectedMinuteOfDay).toBe(21 * 60 + 15);

		const redone = narrativeProjectHistoryReducer(undone, {type: 'redo'});
		expect(redone.present.locations).toHaveLength(1);
		expect(redone.present.editor.selectedDay).toBe(30);
		expect(redone.present.editor.selectedMinuteOfDay).toBe(21 * 60 + 15);
	});
});
