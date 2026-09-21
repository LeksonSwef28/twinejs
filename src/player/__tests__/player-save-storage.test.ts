import {
	compileNarrativeRuntimeArtifact,
	NarrativeRuntimeArtifactV1
} from '../../application/narrative/export-compiler';
import {executeNarrativePlayerWait} from '../../application/narrative/player-wait';
import {materializeNarrativePlayerSession} from '../../application/narrative/player-runtime';
import {bootstrapNarrativePlayerWorldStart} from '../../application/narrative/player-world-start';
import {create93DaysEverydaySystemsProject} from '../../domain/narrative/content/93-days-everyday-systems';
import {
	narrativePlayerSaveStorageKey,
	narrativePlayerStoredSaveExists,
	restoreNarrativePlayerSaveFromStorage,
	storeNarrativePlayerSave
} from '../player-save-storage';

class MemoryStorage {
	private values = new Map<string, string>();

	getItem(key: string) {
		return this.values.get(key) ?? null;
	}

	setItem(key: string, value: string) {
		this.values.set(key, value);
	}
}

function startSession(artifact: NarrativeRuntimeArtifactV1) {
	const materialized = materializeNarrativePlayerSession(artifact);
	if (materialized.status !== 'ready') {
		throw new Error(materialized.summary);
	}
	const started = bootstrapNarrativePlayerWorldStart(materialized.session);
	if (started.status === 'rejected') {
		throw new Error(started.summary);
	}
	return started.session;
}

function compileAt(updatedAt: string) {
	const project = create93DaysEverydaySystemsProject();
	project.updatedAt = updatedAt;
	const compiled = compileNarrativeRuntimeArtifact(project);
	if (compiled.status !== 'compiled') {
		throw new Error('Expected A59 save-storage fixture to compile.');
	}
	return compiled.artifact;
}

describe('A59 Player browser save adapter', () => {
	test('stores the canonical runtime-only save and restores it over a fresh matching artifact session', () => {
		const artifact = compileAt('2026-09-21T00:00:00.000Z');
		const storage = new MemoryStorage();
		let session = startSession(artifact);
		const waited = executeNarrativePlayerWait(session, 15);
		expect(waited.status).toBe('applied');
		if (waited.status !== 'applied') {
			throw new Error(waited.summary);
		}
		session = waited.session;

		expect(narrativePlayerStoredSaveExists(storage, session)).toBe(false);
		expect(storeNarrativePlayerSave(storage, session)).toEqual({status: 'stored'});
		expect(narrativePlayerStoredSaveExists(storage, session)).toBe(true);
		expect(storage.getItem(narrativePlayerSaveStorageKey(session))).toContain(
			'narrative-player-save'
		);

		const fresh = startSession(artifact);
		expect(fresh.currentProject.simulation.minuteOfDay).toBe(6 * 60);
		const restored = restoreNarrativePlayerSaveFromStorage(storage, fresh);
		expect(restored.status).toBe('restored');
		if (restored.status !== 'restored') {
			throw new Error(restored.summary);
		}
		expect(restored.session.currentProject.simulation.minuteOfDay).toBe(
			6 * 60 + 15
		);
	});

	test('finds the same storage slot but rejects a save from a different authored build', () => {
		const storage = new MemoryStorage();
		const oldSession = startSession(
			compileAt('2026-09-21T00:00:00.000Z')
		);
		expect(storeNarrativePlayerSave(storage, oldSession).status).toBe('stored');

		const newSession = startSession(
			compileAt('2026-09-22T00:00:00.000Z')
		);
		expect(narrativePlayerSaveStorageKey(newSession)).toBe(
			narrativePlayerSaveStorageKey(oldSession)
		);
		const restored = restoreNarrativePlayerSaveFromStorage(storage, newSession);
		expect(restored).toEqual({
			status: 'rejected',
			session: newSession,
			summary: 'Сохранение относится к другой версии этой игры.'
		});
	});

	test('reports missing or unavailable storage without mutating the session', () => {
		const session = startSession(
			compileAt('2026-09-21T00:00:00.000Z')
		);
		const storage = new MemoryStorage();

		expect(restoreNarrativePlayerSaveFromStorage(storage, session)).toEqual({
			status: 'missing',
			session,
			summary: 'Сохранение для этой игры не найдено.'
		});
		expect(restoreNarrativePlayerSaveFromStorage(undefined, session)).toEqual({
			status: 'unavailable',
			session,
			summary: 'Хранилище браузера недоступно.'
		});
	});
});
