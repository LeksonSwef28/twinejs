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

	test('switches editor workspace without adding undo history', () => {
		const project = createNarrativeProject('story-1', 'Test', ninetyThreeDaysTemplate);
		const state = narrativeProjectHistoryReducer(
			{past: [], present: project, future: []},
			{type: 'execute', command: {type: 'editor/selectWorkspace', workspace: 'world-time'}}
		);

		expect(state.present.editor.workspaceMode).toBe('world-time');
		expect(state.past).toHaveLength(0);
	});
});
