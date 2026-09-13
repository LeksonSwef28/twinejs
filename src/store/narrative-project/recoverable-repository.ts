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

interface PayloadInspection {
	recognized: boolean;
	validJson: boolean;
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

function requiredProjectIdentityAndArraysExist(
	value: Record<string, unknown>,
	hostStoryId: string
) {
	return (
		typeof value.projectId === 'string' &&
		value.hostStoryId === hostStoryId &&
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
		const authored = value.authored;
		return (
			value.schemaVersion === narrativeProjectSchemaVersion &&
			isRecord(authored) &&
			isRecord(value.editor) &&
			isRecord(value.runtime) &&
			requiredProjectIdentityAndArraysExist(authored, hostStoryId)
		);
	}

	return (
		value.schemaVersion === narrativeProjectSchemaVersion &&
		requiredProjectIdentityAndArraysExist(value, hostStoryId)
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

function inspectPayload(
	raw: string | null,
	hostStoryId: string,
	kind: 'current' | 'legacy'
): PayloadInspection {
	if (raw === null) {
		return {recognized: false, validJson: false};
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		return {
			recognized:
				kind === 'current'
					? isRecognizedCurrentPayload(parsed, hostStoryId)
					: isRecognizedLegacyPayload(parsed, hostStoryId),
			validJson: true
		};
	} catch {
		return {recognized: false, validJson: false};
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

		const currentKey = currentStorageKey(hostStoryId);
		const legacyKey = legacyStorageKey(hostStoryId);
		const currentRaw = window.localStorage.getItem(currentKey);
		const legacyRaw = window.localStorage.getItem(legacyKey);
		const current = inspectPayload(currentRaw, hostStoryId, 'current');
		const legacy = inspectPayload(legacyRaw, hostStoryId, 'legacy');
		const recoveryBackupKeys: string[] = [];

		if (currentRaw !== null && !current.recognized) {
			const backupKey = backupRawPayload(hostStoryId, 'current', currentRaw);
			if (backupKey) {
				recoveryBackupKeys.push(backupKey);
			}
		}
		if (!current.recognized && legacyRaw !== null && !legacy.recognized) {
			const backupKey = backupRawPayload(hostStoryId, 'legacy', legacyRaw);
			if (backupKey) {
				recoveryBackupKeys.push(backupKey);
			}
		}

		// The legacy loader lives inside one try/catch with current JSON parsing.
		// A malformed current JSON string would otherwise prevent a valid v1
		// fallback from being reached at all. It is safe to clear only after the
		// raw value has been copied to a recovery key.
		let malformedCurrentClearedForLegacy = false;
		if (
			currentRaw !== null &&
			!current.validJson &&
			legacy.recognized &&
			recoveryBackupKeys.length > 0
		) {
			try {
				window.localStorage.removeItem(currentKey);
				malformedCurrentClearedForLegacy = true;
			} catch {
				malformedCurrentClearedForLegacy = false;
			}
		}

		const hasStoredPayload = currentRaw !== null || legacyRaw !== null;
		const legacyIsReachable =
			legacy.recognized &&
			(currentRaw === null || current.validJson || malformedCurrentClearedForLegacy);
		const hasRecognizedSource = current.recognized || legacyIsReachable;
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
