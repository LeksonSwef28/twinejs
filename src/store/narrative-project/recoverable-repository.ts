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

type PayloadKind = 'current' | 'v2' | 'v1';

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function storageKey(hostStoryId: string, version: number) {
	return `twine:narrative-project:v${version}:${hostStoryId}`;
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

function isRecognizedProjectPayload(
	value: unknown,
	hostStoryId: string,
	schemaVersion: number
) {
	if (!isRecord(value)) {
		return false;
	}
	if (value.format === narrativeProjectPersistenceFormat) {
		const authored = value.authored;
		return (
			value.schemaVersion === schemaVersion &&
			isRecord(authored) &&
			isRecord(value.editor) &&
			isRecord(value.runtime) &&
			requiredProjectIdentityAndArraysExist(authored, hostStoryId)
		);
	}
	return (
		value.schemaVersion === schemaVersion &&
		requiredProjectIdentityAndArraysExist(value, hostStoryId)
	);
}

function isRecognizedV1Payload(value: unknown, hostStoryId: string) {
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
	kind: PayloadKind
): PayloadInspection {
	if (raw === null) {
		return {recognized: false, validJson: false};
	}
	try {
		const parsed: unknown = JSON.parse(raw);
		return {
			recognized:
				kind === 'current'
					? isRecognizedProjectPayload(
							parsed,
							hostStoryId,
							narrativeProjectSchemaVersion
						)
					: kind === 'v2'
						? isRecognizedProjectPayload(parsed, hostStoryId, 2)
						: isRecognizedV1Payload(parsed, hostStoryId),
			validJson: true
		};
	} catch {
		return {recognized: false, validJson: false};
	}
}

function backupRawPayload(hostStoryId: string, kind: PayloadKind, raw: string) {
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
 * failure mode. v3 is the current format; recognized v2 and v1 slots remain
 * readable migration sources. Unknown or damaged payloads are copied aside,
 * while any recognized older source keeps the project loadable and writable.
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

		const sources = [
			{
				kind: 'current' as const,
				key: storageKey(hostStoryId, narrativeProjectSchemaVersion)
			},
			{kind: 'v2' as const, key: storageKey(hostStoryId, 2)},
			{kind: 'v1' as const, key: storageKey(hostStoryId, 1)}
		].map(source => {
			const raw = window.localStorage.getItem(source.key);
			return {
				...source,
				raw,
				inspection: inspectPayload(raw, hostStoryId, source.kind)
			};
		});
		const recoveryBackupKeys: string[] = [];

		for (const source of sources) {
			if (source.raw !== null && !source.inspection.recognized) {
				const backupKey = backupRawPayload(hostStoryId, source.kind, source.raw);
				if (backupKey) {
					recoveryBackupKeys.push(backupKey);
				}
			}
		}

		const hasStoredPayload = sources.some(source => source.raw !== null);
		const hasRecognizedSource = sources.some(
			source => source.inspection.recognized
		);
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
