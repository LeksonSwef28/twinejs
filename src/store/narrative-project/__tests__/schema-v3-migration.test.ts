import {NarrativeProject} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {projectNarrativePersistence} from '../persistence-projection';
import {createRecoverableLocalStorageNarrativeProjectRepository} from '../recoverable-repository';

const hostStoryId = 'schema-v3-story';
const v3Key = `twine:narrative-project:v3:${hostStoryId}`;
const v2Key = `twine:narrative-project:v2:${hostStoryId}`;

function v2Raw(name = 'Migrated v2 project') {
	const project = {
		...createNarrativeProject(hostStoryId, name, ninetyThreeDaysTemplate),
		schemaVersion: 2
	} as NarrativeProject;
	return JSON.stringify(projectNarrativePersistence(project));
}

function recoveryKeys() {
	return Object.keys(window.localStorage).filter(key =>
		key.startsWith(`twine:narrative-project:recovery:${hostStoryId}:`)
	);
}

describe('narrative project schema v3 migration', () => {
	beforeEach(() => window.localStorage.clear());

	test('loads v2 from its legacy slot, writes v3, and preserves the v2 fallback', () => {
		const raw = v2Raw();
		window.localStorage.setItem(v2Key, raw);
		const repository = createRecoverableLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Migrated v2 project',
			ninetyThreeDaysTemplate
		);

		const result = repository.loadResult();

		expect(result.status).toBe('loaded');
		expect(result.project.schemaVersion).toBe(3);
		expect(result.project.name).toBe('Migrated v2 project');
		expect(window.localStorage.getItem(v3Key)).not.toBeNull();
		expect(window.localStorage.getItem(v2Key)).toBe(raw);
		expect(recoveryKeys()).toEqual([]);
	});

	test('backs up damaged v3 and still migrates a recognized v2 fallback', () => {
		const damagedV3 = '{"schemaVersion":3,"projectId":';
		const rawV2 = v2Raw('Fallback v2');
		window.localStorage.setItem(v3Key, damagedV3);
		window.localStorage.setItem(v2Key, rawV2);
		const repository = createRecoverableLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Fallback v2',
			ninetyThreeDaysTemplate
		);

		const result = repository.loadResult();

		expect(result.status).toBe('loaded');
		expect(result.project.schemaVersion).toBe(3);
		expect(result.project.name).toBe('Fallback v2');
		expect(result.recoveryBackupKeys).toHaveLength(1);
		expect(window.localStorage.getItem(result.recoveryBackupKeys[0])).toBe(
			damagedV3
		);
		expect(window.localStorage.getItem(v2Key)).toBe(rawV2);
		expect(window.localStorage.getItem(v3Key)).not.toBe(damagedV3);
	});

	test('treats an unknown future current payload as recovery data', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Future project',
			ninetyThreeDaysTemplate
		);
		const futureRaw = JSON.stringify({
			...projectNarrativePersistence(project),
			schemaVersion: 4
		});
		window.localStorage.setItem(v3Key, futureRaw);
		const repository = createRecoverableLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Future project',
			ninetyThreeDaysTemplate
		);

		const result = repository.loadResult();

		expect(result.status).toBe('recovery');
		expect(result.recoveryBackupKeys).toHaveLength(1);
		expect(() => repository.save(result.project)).toThrow(/blocked/i);
		expect(window.localStorage.getItem(v3Key)).toBe(futureRaw);
	});
});
