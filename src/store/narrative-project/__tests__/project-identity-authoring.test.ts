import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {NarrativeProjectHistoryState} from '../reducer';
import {narrativeProjectAuthoringReducer} from '../routine-authoring';

describe('project identity authoring', () => {
	test('renames project through authoring history and supports undo', () => {
		const state: NarrativeProjectHistoryState = {
			past: [],
			present: createNarrativeProject(
				'project-identity',
				'Черновик истории',
				ninetyThreeDaysTemplate
			),
			future: []
		};
		const renamed = narrativeProjectAuthoringReducer(state, {
			type: 'execute',
			command: {type: 'project/rename', name: 'Лето в большом городе'}
		});
		expect(renamed.present.name).toBe('Лето в большом городе');
		expect(renamed.past).toHaveLength(1);
		const undone = narrativeProjectAuthoringReducer(renamed, {type: 'undo'});
		expect(undone.present.name).toBe('Черновик истории');
	});
});
