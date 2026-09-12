import {narrativeProjectSchemaVersion} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {createLocalStorageNarrativeProjectRepository} from '../repository';

const hostStoryId = 'story-edge-migration';
const storageKey = `twine:narrative-project:v${narrativeProjectSchemaVersion}:${hostStoryId}`;

describe('narrative project repository Story edge migration', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('migrates ambiguous legacy flow edges to reference mode', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Legacy flow',
			ninetyThreeDaysTemplate
		);
		const payload = {
			...project,
			storyConnections: [
				{
					id: 'legacy-flow',
					sourceNodeId: 'a',
					targetNodeId: 'b',
					kind: 'flow',
					sourcePortId: 'flow-out',
					targetPortId: 'flow-in'
				}
			]
		};
		window.localStorage.setItem(storageKey, JSON.stringify(payload));

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Legacy flow',
			ninetyThreeDaysTemplate
		);
		expect(repository.load().storyConnections[0].mode).toBe('reference');
	});

	test('preserves unambiguous legacy TRUE/FALSE branches as executable', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Legacy condition',
			ninetyThreeDaysTemplate
		);
		const payload = {
			...project,
			storyConnections: [
				{
					id: 'legacy-true',
					sourceNodeId: 'condition',
					targetNodeId: 'success',
					kind: 'condition-true',
					sourcePortId: 'true',
					targetPortId: 'flow-in'
				}
			]
		};
		window.localStorage.setItem(storageKey, JSON.stringify(payload));

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Legacy condition',
			ninetyThreeDaysTemplate
		);
		expect(repository.load().storyConnections[0].mode).toBe('executable');
	});

	test('downgrades malformed explicit executable edges to reference mode', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Malformed executable',
			ninetyThreeDaysTemplate
		);
		const payload = {
			...project,
			storyConnections: [
				{
					id: 'bad-semantic',
					sourceNodeId: 'a',
					targetNodeId: 'b',
					kind: 'semantic',
					mode: 'executable',
					sourcePortId: 'out',
					targetPortId: 'in'
				},
				{
					id: 'bad-flow',
					sourceNodeId: 'a',
					targetNodeId: 'b',
					kind: 'flow',
					mode: 'executable'
				}
			]
		};
		window.localStorage.setItem(storageKey, JSON.stringify(payload));

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Malformed executable',
			ninetyThreeDaysTemplate
		);
		expect(repository.load().storyConnections.map(edge => edge.mode)).toEqual([
			'reference',
			'reference'
		]);
	});
});
