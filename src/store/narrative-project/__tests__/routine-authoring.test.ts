import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {narrativeProjectAuthoringReducer} from '../routine-authoring';

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

function projectWithCharacterAndLocation() {
	let state = narrativeProjectAuthoringReducer(initialState(), {
		type: 'execute',
		command: {type: 'location/add', id: 'cafe', name: 'Кафе'}
	});
	state = narrativeProjectAuthoringReducer(state, {
		type: 'execute',
		command: {
			type: 'character/add',
			id: 'katya',
			profileId: 'katya-profile',
			name: 'Катя',
			cognitionTier: 'full'
		}
	});
	return state;
}

describe('routine authoring', () => {
	test('authors schedule intent without changing actual presence and supports undo/redo', () => {
		let state = projectWithCharacterAndLocation();
		const runtimeBefore = state.present.simulation.actualLocationByCharacter;

		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'routine/add',
				rule: {
					id: 'routine-cafe',
					characterId: 'katya',
					behaviorProfileId: 'katya-profile',
					activeRange: {fromDay: 1, toDay: 93},
					recurrence: {type: 'everyDay'},
					timeWindow: {type: 'period', periodId: 'morning'},
					targetLocationId: 'cafe'
				}
			}
		});

		expect(state.present.routineRules).toEqual([
			expect.objectContaining({
				id: 'routine-cafe',
				characterId: 'katya',
				targetLocationId: 'cafe'
			})
		]);
		expect(state.present.simulation.actualLocationByCharacter).toBe(runtimeBefore);

		state = narrativeProjectAuthoringReducer(state, {type: 'undo'});
		expect(state.present.routineRules).toEqual([]);
		state = narrativeProjectAuthoringReducer(state, {type: 'redo'});
		expect(state.present.routineRules).toHaveLength(1);
	});

	test('rejects missing references and invalid day ranges without creating history', () => {
		const state = projectWithCharacterAndLocation();
		const pastLength = state.past.length;
		const invalid = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'routine/add',
				rule: {
					id: 'routine-invalid',
					characterId: 'katya',
					behaviorProfileId: 'katya-profile',
					activeRange: {fromDay: 30, toDay: 20},
					recurrence: {type: 'everyDay'},
					timeWindow: {type: 'period', periodId: 'morning'},
					targetLocationId: 'missing-location'
				}
			}
		});

		expect(invalid).toBe(state);
		expect(invalid.present.routineRules).toEqual([]);
		expect(invalid.past).toHaveLength(pastLength);
	});

	test('updates exact recurring windows and removes routines explicitly', () => {
		let state = projectWithCharacterAndLocation();
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'routine/add',
				rule: {
					id: 'routine-cafe',
					characterId: 'katya',
					behaviorProfileId: 'katya-profile',
					activeRange: {fromDay: 1},
					recurrence: {type: 'weekly', weekdays: ['monday', 'friday']},
					timeWindow: {
						type: 'exact',
						startMinute: 20 * 60,
						endMinute: 1 * 60,
						endDayOffset: 1
					},
					targetLocationId: 'cafe'
				}
			}
		});
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'routine/update',
				rule: {
					...state.present.routineRules[0],
					recurrence: {type: 'everyNDays', every: 2, anchorDay: 1}
				}
			}
		});

		expect(state.present.routineRules[0].recurrence).toEqual({
			type: 'everyNDays',
			every: 2,
			anchorDay: 1
		});

		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {type: 'routine/remove', id: 'routine-cafe'}
		});
		expect(state.present.routineRules).toEqual([]);
	});
});
