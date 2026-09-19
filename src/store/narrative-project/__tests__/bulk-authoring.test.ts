import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {applyBulkStoryAuthoringCommand} from '../bulk-authoring';
import {editorAuthoringReducer} from '../editor-authoring';

function initialState() {
	return {
		past: [],
		present: createNarrativeProject(
			'story-a50-bulk',
			'A50 bulk test',
			ninetyThreeDaysTemplate
		),
		future: []
	};
}

describe('A50 safe bulk authoring', () => {
	test('applies a Story location bulk edit as one Undo step and restores all nodes together', () => {
		let state = editorAuthoringReducer(initialState(), {
			type: 'execute',
			command: {type: 'location/add', id: 'bar', name: 'Бар'}
		});
		state = editorAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/addDraftNode',
				id: 'story-a',
				canvasNodeId: 'canvas-a',
				kind: 'event',
				title: 'Встреча',
				position: {x: 10, y: 10}
			}
		});
		state = editorAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/addDraftNode',
				id: 'story-b',
				canvasNodeId: 'canvas-b',
				kind: 'dialogue',
				title: 'Разговор',
				position: {x: 300, y: 10}
			}
		});
		state = editorAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/setPlacement',
				id: 'story-a',
				placement: {day: 4, minuteOfDay: 600}
			}
		});
		state = editorAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/setPlacement',
				id: 'story-b',
				placement: {day: 5, minuteOfDay: 720}
			}
		});

		const beforeBulkPast = state.past.length;
		state = editorAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'story/bulkSetLocation',
				storyNodeIds: ['story-a', 'story-b'],
				locationId: 'bar'
			}
		});

		expect(state.past).toHaveLength(beforeBulkPast + 1);
		expect(state.present.storyNodes.map(node => node.placement)).toEqual([
			{day: 4, minuteOfDay: 600, locationId: 'bar'},
			{day: 5, minuteOfDay: 720, locationId: 'bar'}
		]);

		state = editorAuthoringReducer(state, {type: 'undo'});
		expect(state.present.storyNodes.map(node => node.placement)).toEqual([
			{day: 4, minuteOfDay: 600},
			{day: 5, minuteOfDay: 720}
		]);
	});

	test('fails atomically when any selected Story id or location reference is invalid', () => {
		const project = createNarrativeProject(
			'story-a50-bulk-invalid',
			'A50 invalid bulk test',
			ninetyThreeDaysTemplate
		);
		project.storyNodes.push({
			id: 'story-a',
			kind: 'event',
			title: 'Событие',
			participantIds: [],
			activationState: 'draft'
		});

		expect(
			applyBulkStoryAuthoringCommand(project, {
				type: 'story/bulkSetLocation',
				storyNodeIds: ['story-a', 'missing'],
				locationId: undefined
			})
		).toBe(project);
		expect(
			applyBulkStoryAuthoringCommand(project, {
				type: 'story/bulkSetLocation',
				storyNodeIds: ['story-a'],
				locationId: 'missing-location'
			})
		).toBe(project);
		expect(
			applyBulkStoryAuthoringCommand(project, {
				type: 'story/bulkSetLocation',
				storyNodeIds: []
			})
		).toBe(project);
	});

	test('clears only location while preserving authored time and removes an otherwise empty placement', () => {
		const project = createNarrativeProject(
			'story-a50-bulk-clear',
			'A50 clear bulk test',
			ninetyThreeDaysTemplate
		);
		project.locations.push({id: 'bar', name: 'Бар'});
		project.storyNodes.push(
			{
				id: 'timed',
				kind: 'event',
				title: 'По времени',
				participantIds: [],
				activationState: 'draft',
				placement: {day: 7, minuteOfDay: 540, locationId: 'bar'}
			},
			{
				id: 'location-only',
				kind: 'beat',
				title: 'Только место',
				participantIds: [],
				activationState: 'draft',
				placement: {locationId: 'bar'}
			}
		);

		const next = applyBulkStoryAuthoringCommand(project, {
			type: 'story/bulkSetLocation',
			storyNodeIds: ['timed', 'location-only', 'timed']
		});

		expect(next.storyNodes[0].placement).toEqual({day: 7, minuteOfDay: 540});
		expect(next.storyNodes[1].placement).toBeUndefined();
	});
});
