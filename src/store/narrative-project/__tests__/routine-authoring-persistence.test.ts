import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {createLocalStorageNarrativeProjectRepository} from '../repository';
import {narrativeProjectAuthoringReducer} from '../routine-authoring';

const hostStoryId = 'routine-authoring-persistence';

describe('routine authoring persistence', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('saves and reloads authored routine rules without changing runtime presence', () => {
		let state = {
			past: [],
			present: createNarrativeProject(
				hostStoryId,
				'Routine persistence',
				ninetyThreeDaysTemplate
			),
			future: []
		};
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {type: 'location/add', id: 'library', name: 'Библиотека'}
		});
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'character/add',
				id: 'mila',
				profileId: 'mila-profile',
				name: 'Мила',
				cognitionTier: 'full'
			}
		});
		state = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {
				type: 'routine/add',
				rule: {
					id: 'mila-library',
					characterId: 'mila',
					behaviorProfileId: 'mila-profile',
					activeRange: {fromDay: 2, toDay: 80},
					recurrence: {type: 'weekly', weekdays: ['tuesday', 'thursday']},
					timeWindow: {type: 'period', periodId: 'day'},
					targetLocationId: 'library'
				}
			}
		});

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Routine persistence',
			ninetyThreeDaysTemplate
		);
		repository.save(state.present);
		const restored = repository.load();

		expect(restored.routineRules).toEqual(state.present.routineRules);
		expect(restored.simulation.actualLocationByCharacter).toEqual({});
	});
});
