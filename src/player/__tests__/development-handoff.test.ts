import {createNarrativeProject} from '../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../domain/narrative/templates/93-days';
import {
	NarrativeRuntimeArtifactV1,
	compileNarrativeRuntimeArtifact,
	serializeNarrativeRuntimeArtifact
} from '../../application/narrative/export-compiler';
import {narrativePlayerDevelopmentHandoffKey} from '../artifact-source';
import {
	launchNarrativePlayerDevelopment,
	narrativePlayerDevelopmentUrl
} from '../development-handoff';

function artifact(): NarrativeRuntimeArtifactV1 {
	const project = createNarrativeProject(
		'a54-handoff-story',
		'A54 Handoff',
		ninetyThreeDaysTemplate
	);
	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected development handoff fixture to compile.');
	}
	return compiled.artifact;
}

function storageHarness() {
	const values = new Map<string, string>();
	return {
		values,
		storage: {
			setItem: jest.fn((key: string, value: string) => values.set(key, value)),
			removeItem: jest.fn((key: string) => values.delete(key))
		}
	};
}

describe('A54 development player handoff', () => {
	test('stores exact serialized artifact and opens the dedicated player entry', () => {
		const source = artifact();
		const {storage, values} = storageHarness();
		const openWindow = jest.fn(() => ({}));

		expect(
			launchNarrativePlayerDevelopment(source, {storage, openWindow})
		).toEqual({
			status: 'launched',
			url: narrativePlayerDevelopmentUrl
		});
		expect(values.get(narrativePlayerDevelopmentHandoffKey)).toBe(
			serializeNarrativeRuntimeArtifact(source)
		);
		expect(openWindow).toHaveBeenCalledWith(
			narrativePlayerDevelopmentUrl,
			'_blank'
		);
	});

	test('cleans temporary handoff when the browser blocks the player window', () => {
		const {storage, values} = storageHarness();
		const result = launchNarrativePlayerDevelopment(artifact(), {
			storage,
			openWindow: () => null
		});

		expect(result.status).toBe('rejected');
		expect(values.has(narrativePlayerDevelopmentHandoffKey)).toBe(false);
		expect(storage.removeItem).toHaveBeenCalledWith(
			narrativePlayerDevelopmentHandoffKey
		);
	});
});
