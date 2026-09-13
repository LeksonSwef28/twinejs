import {
	NarrativeProject,
	narrativeProjectSchemaVersion
} from '../../domain/narrative/project';
import {NarrativeProjectTemplate} from '../../domain/narrative/template';
import {narrativeProjectPersistenceFormat} from './persistence-projection';
import {
	createLocalStorageNarrativeProjectRepository,
	NarrativeProjectRepository
} from './repository';

export type NarrativeProjectLoadStatus = 'loaded' | 'new' | 'recovery';

export interface NarrativeProjectLoadResult {
	project: NarrativeProject;
	status: NarrativeProjectLoadStatus;
	recoveryBackupKeys: string[];
}

export interface RecoverableNarrativeProjectRepository
	extends NarrativeProjectRepository {
	load(): NarrativeProject;
	loadResult(): NarrativeProjectLoadResult;
	acknowledgeRecoveryReset(): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function currentStorageKey(hostStoryId: string) {
	return `twine:narrative-project:v${narrativeProjectSchemaVersion}:${hostStoryId}`;
}

function legacyStorageKey(hostStoryId: string) {
	return `twine:narrative-project:v1:${hostStoryId}`;
}

function requiredProjectArraysExist(value: Record<string, unknown>) {
	return (
		Array.isArray(value.locations) &&
		Array.isArray(value.characters) &&
		Array.isArray(value.storyNodes) &&
		Array.isArray(value.storyConnections)
	);
}

function isRecognizedCurrentPayload(value: unknown, hostStoryId: string) {
	if (!isRecord(value)) {
		return false;
	}

	if (value.format === narrativeProjectPersistenceFormat) {
		if (
			value.schemaVersion !== narrativeProjectSchemaVersion ||
			!isRecord(value.authored) ||
			value.authored.hostStoryId !== hostStoryId
		) {
			return false;
		}
		return requiredProjectArraysExist(value.authored);
	}

	return (
		value.schemaVersion === narrativeProjectSchemaVersion &&
		value.hostStoryId === hostStoryId &&
		requiredProjectArraysExist(value)
	);
}

function isRecognizedLegacyPayload(value: unknown, hostStoryId: string) {
	if (!isRecord(value)) {
		return false;
	}
	return (
		value.schemaVersion === 1 &&
		value.hostStoryId === hostStoryId &&
		Array.isArray(value.locations) &&
		Array.isArray(value.characters)
	);
}

function payloadIsRecognized(
	raw: string,
	hostStoryId: string,
	kind: 'current' | 'legacy'
) {
	try {
		const parsed: unknown = JSON.parse(raw);
		return kind === 'current'
			? isRecognizedCurrentPayload(parsed, hostStoryId)
			: isRecognizedLegacyPayload(parsed, hostStoryId);
	} catch {
		return false;
	}
}

function backupRawPayload(
	hostStoryId: string,
	kind: 'current' | 'legacy',
	raw: string
) {
	const key = `twine:narrative-project:recovery:${hostStoryId}:${kind}:${Date.now()}`;
	try {
		window.localStorage.setItem(key, raw);
		return key;
	} catch {
		return undefined;
	}
}

/**
 * Protects author data from the "failed load -> fresh project -> autosave"
 * failure mode. Unknown or damaged payloads are copied aside before the normal
 * repository attempts hydration. When no recognized fallback exists, writes
 * remain blocked until the editor explicitly acknowledges starting from the
 * fresh project returned by the normal repository.
 */
export function createRecoverableLocalStorageNarrativeProjectRepository(
	hostStoryId: string,
	projectName: string,
	template: NarrativeProjectTemplate
): RecoverableNarrativeProjectRepository {
	const repository = createLocalStorageNarrativeProjectRepository(
		hostStoryId,
		projectName,
		template
	);
	let cachedResult: NarrativeProjectLoadResult | undefined;
	let recoveryBlocked = false;

	function inspectAndLoad(): NarrativeProjectLoadResult {
		if (cachedResult) {
			return cachedResult;
		}
		if (typeof window === 'undefined') {
			cachedResult = {
				project: repository.load(),
				status: 'new',
				recoveryBackupKeys: []
			};
			return cachedResult;
		}

		const currentRaw = window.localStorage.getItem(currentStorageKey(hostStoryId));
		const legacyRaw = window.localStorage.getItem(legacyStorageKey(hostStoryId));
		const currentRecognized =
			currentRaw !== null &&
			payloadIsRecognized(currentRaw, hostStoryId, 'current');
		const legacyRecognized =
			legacyRaw !== null &&
			payloadIsRecognized(legacyRaw, hostStoryId, 'legacy');
		const recoveryBackupKeys: string[] = [];

		if (currentRaw !== null && !currentRecognized) {
			const backupKey = backupRawPayload(hostStoryId, 'current', currentRaw);
			if (backupKey) {
				recoveryBackupKeys.push(backupKey);
			}
		}
		if (
			!currentRecognized &&
			legacyRaw !== null &&
			!legacyRecognized
		) {
			const backupKey = backupRawPayload(hostStoryId, 'legacy', legacyRaw);
			if (backupKey) {
				recoveryBackupKeys.push(backupKey);
			}
		}

		const hasStoredPayload = currentRaw !== null || legacyRaw !== null;
		const hasRecognizedSource = currentRecognized || legacyRecognized;
		const status: NarrativeProjectLoadStatus = !hasStoredPayload
			? 'new'
			: hasRecognizedSource
				? 'loaded'
				: 'recovery';
		recoveryBlocked = status === 'recovery';
		cachedResult = {
			project: repository.load(),
			status,
			recoveryBackupKeys
		};
		return cachedResult;
	}

	return {
		load() {
			return inspectAndLoad().project;
		},
		loadResult: inspectAndLoad,
		save(project) {
			if (recoveryBlocked) {
				throw new Error(
					'Narrative project save is blocked until recovery reset is acknowledged.'
				);
			}
			repository.save(project);
		},
		acknowledgeRecoveryReset() {
			recoveryBlocked = false;
			if (cachedResult?.status === 'recovery') {
				cachedResult = {...cachedResult, status: 'new'};
			}
		}
	};
}
