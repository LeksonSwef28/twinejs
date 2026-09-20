import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {arrivalCorridorIds, create93DaysArrivalCorridorProject} from '../../../domain/narrative/content/93-days-arrival-corridor';
import {advanceNarrativeProjectSimulation} from '../simulation';
import {
	compileNarrativeRuntimeArtifact,
	serializeNarrativeRuntimeArtifact
} from '../export-compiler';
import {bootstrapNarrativePlayerHost} from '../player-host';

function serializedArtifact() {
	const project = createNarrativeProject(
		'a54-host-story',
		'A54 Player Host',
		ninetyThreeDaysTemplate
	);
	project.projectId = 'a54-player-project';
	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A54 host fixture to compile.');
	}
	return serializeNarrativeRuntimeArtifact(compiled.artifact);
}

describe('A54 player host bootstrap', () => {
	test('boots the exact serialized A52 artifact into an A53 player session', () => {
		const source = serializedArtifact();
		const result = bootstrapNarrativePlayerHost(source);

		expect(result.status).toBe('ready');
		if (result.status !== 'ready') {
			throw new Error('Expected player host to be ready.');
		}
		expect(result.session.identity.projectId).toBe('a54-player-project');
		expect(result.session.identity.hostStoryId).toBe('a54-host-story');

		const before = result.session.currentProject.simulation;
		const probe = advanceNarrativeProjectSimulation(
			result.session.currentProject,
			0
		);
		expect(probe.trace.appliedMinutes).toBe(0);
		expect(probe.project.simulation.day).toBe(before.day);
		expect(probe.project.simulation.minuteOfDay).toBe(before.minuteOfDay);
		expect(result.session.currentProject.simulation).toBe(before);
	});

	test('rejects missing and malformed transport input before materialization', () => {
		expect(bootstrapNarrativePlayerHost(undefined)).toEqual({
			status: 'rejected',
			code: 'missing-artifact',
			summary: expect.any(String)
		});
		expect(bootstrapNarrativePlayerHost('{broken')).toEqual({
			status: 'rejected',
			code: 'invalid-artifact-json',
			summary: expect.any(String)
		});
	});

	test('surfaces A53 compatibility rejection instead of creating a partial session', () => {
		const source = JSON.parse(serializedArtifact());
		source.format = 'other-runtime-artifact';

		expect(bootstrapNarrativePlayerHost(JSON.stringify(source))).toEqual({
			status: 'rejected',
			code: 'unsupported-artifact-format',
			summary: expect.any(String)
		});
	});
});
