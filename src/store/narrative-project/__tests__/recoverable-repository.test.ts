import {narrativeProjectSchemaVersion} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {projectNarrativePersistence} from '../persistence-projection';
import {createRecoverableLocalStorageNarrativeProjectRepository} from '../recoverable-repository';

const hostStoryId = 'recovery-story';
const storageKey = `twine:narrative-project:v${narrativeProjectSchemaVersion}:${hostStoryId}`;

function recoveryKeys() {
	return Object.keys(window.localStorage).filter(key =>
		key.startsWith(`twine:narrative-project:recovery:${hostStoryId}:`)
	);
}

describe('recoverable narrative project repository', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('loads a recognized persisted project normally', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Healthy project',
			ninetyThreeDaysTemplate
		);
		window.localStorage.setItem(
			storageKey,
			JSON.stringify(projectNarrativePersistence(project))
		);

		const repository = createRecoverableLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Healthy project',
			ninetyThreeDaysTemplate
		);
		const result = repository.loadResult();

		expect(result.status).toBe('loaded');
		expect(result.project.projectId).toBe(project.projectId);
		expect(result.recoveryBackupKeys).toEqual([]);
		expect(recoveryKeys()).toEqual([]);
	});

	test('backs up malformed JSON and blocks writes until reset is acknowledged', () => {
		const damaged = '{"schemaVersion":2,"projectId":';
		window.localStorage.setItem(storageKey, damaged);

		const repository = createRecoverableLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Recovered project',
			ninetyThreeDaysTemplate
		);
		const result = repository.loadResult();

		expect(result.status).toBe('recovery');
		expect(result.recoveryBackupKeys).toHaveLength(1);
		expect(window.localStorage.getItem(result.recoveryBackupKeys[0])).toBe(damaged);
		expect(window.localStorage.getItem(storageKey)).toBe(damaged);
		expect(() => repository.save(result.project)).toThrow(/blocked/i);
		expect(window.localStorage.getItem(storageKey)).toBe(damaged);

		repository.acknowledgeRecoveryReset();
		repository.save(result.project);
		expect(window.localStorage.getItem(storageKey)).not.toBe(damaged);
		expect(window.localStorage.getItem(result.recoveryBackupKeys[0])).toBe(damaged);
	});

	test('backs up an unrecognized current payload before a valid v1 fallback migrates', () => {
		const damagedCurrent = JSON.stringify({schemaVersion: 999, hostStoryId});
		window.localStorage.setItem(storageKey, damagedCurrent);

		const legacyProject = createNarrativeProject(
			hostStoryId,
			'Legacy fallback',
			ninetyThreeDaysTemplate
		);
		const legacyPayload = {
			...legacyProject,
			schemaVersion: 1,
			storyNodes: undefined,
			storyConnections: undefined
		};
		window.localStorage.setItem(
			`twine:narrative-project:v1:${hostStoryId}`,
			JSON.stringify(legacyPayload)
		);

		const repository = createRecoverableLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Legacy fallback',
			ninetyThreeDaysTemplate
		);
		const result = repository.loadResult();

		expect(result.status).toBe('loaded');
		expect(result.recoveryBackupKeys).toHaveLength(1);
		expect(window.localStorage.getItem(result.recoveryBackupKeys[0])).toBe(
			damagedCurrent
		);
		expect(result.project.hostStoryId).toBe(hostStoryId);
	});
});
