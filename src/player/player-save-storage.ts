import {
	restoreNarrativePlayerSaveJson,
	serializeNarrativePlayerSave
} from '../application/narrative/player-save';
import {NarrativePlayerSession} from '../application/narrative/player-runtime';

export const narrativePlayerSaveStoragePrefix = 'narrative-player-save:v1';

export interface NarrativePlayerSaveStorage {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
}

export type NarrativePlayerStoredSaveResult =
	| {
			status: 'restored';
			session: NarrativePlayerSession;
	  }
	| {
			status: 'missing' | 'unavailable' | 'rejected';
			session: NarrativePlayerSession;
			summary: string;
	  };

export function narrativePlayerSaveStorageKey(session: NarrativePlayerSession) {
	return [
		narrativePlayerSaveStoragePrefix,
		encodeURIComponent(session.identity.projectId),
		encodeURIComponent(session.identity.hostStoryId)
	].join(':');
}

export function narrativePlayerStoredSaveExists(
	storage: NarrativePlayerSaveStorage | undefined,
	session: NarrativePlayerSession
) {
	if (!storage) {
		return false;
	}
	try {
		return storage.getItem(narrativePlayerSaveStorageKey(session)) !== null;
	} catch {
		return false;
	}
}

export function storeNarrativePlayerSave(
	storage: NarrativePlayerSaveStorage | undefined,
	session: NarrativePlayerSession
): {status: 'stored'} | {status: 'unavailable'; summary: string} {
	if (!storage) {
		return {
			status: 'unavailable',
			summary: 'Хранилище браузера недоступно.'
		};
	}
	try {
		storage.setItem(
			narrativePlayerSaveStorageKey(session),
			serializeNarrativePlayerSave(session)
		);
		return {status: 'stored'};
	} catch {
		return {
			status: 'unavailable',
			summary: 'Не удалось записать сохранение в хранилище браузера.'
		};
	}
}

export function restoreNarrativePlayerSaveFromStorage(
	storage: NarrativePlayerSaveStorage | undefined,
	session: NarrativePlayerSession
): NarrativePlayerStoredSaveResult {
	if (!storage) {
		return {
			status: 'unavailable',
			session,
			summary: 'Хранилище браузера недоступно.'
		};
	}
	let serialized: string | null;
	try {
		serialized = storage.getItem(narrativePlayerSaveStorageKey(session));
	} catch {
		return {
			status: 'unavailable',
			session,
			summary: 'Не удалось прочитать сохранение из хранилища браузера.'
		};
	}
	if (serialized === null) {
		return {
			status: 'missing',
			session,
			summary: 'Сохранение для этой игры не найдено.'
		};
	}
	const restored = restoreNarrativePlayerSaveJson(session, serialized);
	if (restored.status !== 'restored') {
		return {
			status: 'rejected',
			session,
			summary:
				restored.reason === 'artifact-mismatch'
					? 'Сохранение относится к другой версии этой игры.'
					: 'Сохранение повреждено или несовместимо.'
		};
	}
	return {status: 'restored', session: restored.session};
}
