import {
	createNarrativeRuntimeSnapshot,
	narrativeRuntimeSnapshotFormat,
	narrativeRuntimeSnapshotVersion,
	NarrativeRuntimeSnapshotV1,
	restoreNarrativeRuntimeSnapshot
} from '../../store/narrative-project/runtime-snapshot';
import {
	narrativeRuntimeArtifactFormat,
	narrativeRuntimeArtifactVersion
} from './export-compiler';
import {
	NarrativePlayerSession,
	replaceNarrativePlayerSessionProject
} from './player-runtime';

export const narrativePlayerSaveFormat = 'narrative-player-save';
export const narrativePlayerSaveVersion = 1 as const;

export interface NarrativePlayerSaveIdentityV1 {
	artifactFormat: typeof narrativeRuntimeArtifactFormat;
	artifactVersion: typeof narrativeRuntimeArtifactVersion;
	sourceSchemaVersion: number;
	projectId: string;
	hostStoryId: string;
	/** Authored build marker carried by the compiled artifact. */
	sourceUpdatedAt: string;
}

export interface NarrativePlayerSaveV1 {
	format: typeof narrativePlayerSaveFormat;
	version: typeof narrativePlayerSaveVersion;
	identity: NarrativePlayerSaveIdentityV1;
	runtime: NarrativeRuntimeSnapshotV1['runtime'];
}

export type NarrativePlayerSaveRestoreReason =
	| 'invalid-save'
	| 'unsupported-save-format'
	| 'unsupported-save-version'
	| 'artifact-mismatch'
	| 'invalid-runtime';

export type NarrativePlayerSaveRestoreResult =
	| {status: 'restored'; session: NarrativePlayerSession}
	| {
			status: 'rejected';
			reason: NarrativePlayerSaveRestoreReason;
			session: NarrativePlayerSession;
	  };

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function identityLooksUsable(value: unknown): value is NarrativePlayerSaveIdentityV1 {
	if (!isRecord(value)) {
		return false;
	}
	return (
		value.artifactFormat === narrativeRuntimeArtifactFormat &&
		value.artifactVersion === narrativeRuntimeArtifactVersion &&
		Number.isInteger(value.sourceSchemaVersion) &&
		typeof value.projectId === 'string' &&
		typeof value.hostStoryId === 'string' &&
		typeof value.sourceUpdatedAt === 'string'
	);
}

function identityMatchesSession(
	identity: NarrativePlayerSaveIdentityV1,
	session: NarrativePlayerSession
) {
	return (
		identity.artifactFormat === session.identity.artifactFormat &&
		identity.artifactVersion === session.identity.artifactVersion &&
		identity.sourceSchemaVersion === session.identity.sourceSchemaVersion &&
		identity.projectId === session.identity.projectId &&
		identity.hostStoryId === session.identity.hostStoryId &&
		identity.sourceUpdatedAt === session.currentProject.updatedAt
	);
}

/**
 * Creates a player save from mutable runtime state only. Authored definitions
 * and editor compatibility metadata remain owned by the compiled artifact.
 */
export function createNarrativePlayerSave(
	session: NarrativePlayerSession
): NarrativePlayerSaveV1 {
	const snapshot = createNarrativeRuntimeSnapshot(session.currentProject);
	return {
		format: narrativePlayerSaveFormat,
		version: narrativePlayerSaveVersion,
		identity: {
			artifactFormat: session.identity.artifactFormat,
			artifactVersion: session.identity.artifactVersion,
			sourceSchemaVersion: session.identity.sourceSchemaVersion,
			projectId: session.identity.projectId,
			hostStoryId: session.identity.hostStoryId,
			sourceUpdatedAt: session.currentProject.updatedAt
		},
		runtime: snapshot.runtime
	};
}

export function serializeNarrativePlayerSave(session: NarrativePlayerSession) {
	return JSON.stringify(createNarrativePlayerSave(session));
}

/**
 * Restores only mutable runtime state over the current artifact materialization.
 * Any malformed or incompatible save is rejected atomically and returns the
 * original session object.
 */
export function restoreNarrativePlayerSave(
	session: NarrativePlayerSession,
	value: unknown
): NarrativePlayerSaveRestoreResult {
	if (!isRecord(value)) {
		return {status: 'rejected', reason: 'invalid-save', session};
	}
	if (value.format !== narrativePlayerSaveFormat) {
		return {status: 'rejected', reason: 'unsupported-save-format', session};
	}
	if (value.version !== narrativePlayerSaveVersion) {
		return {status: 'rejected', reason: 'unsupported-save-version', session};
	}
	if (!identityLooksUsable(value.identity)) {
		return {status: 'rejected', reason: 'invalid-save', session};
	}
	if (!identityMatchesSession(value.identity, session)) {
		return {status: 'rejected', reason: 'artifact-mismatch', session};
	}

	const restored = restoreNarrativeRuntimeSnapshot(session.currentProject, {
		format: narrativeRuntimeSnapshotFormat,
		version: narrativeRuntimeSnapshotVersion,
		projectId: value.identity.projectId,
		hostStoryId: value.identity.hostStoryId,
		runtime: value.runtime
	});
	if (restored.status === 'rejected' || restored.status === 'missing') {
		return {status: 'rejected', reason: 'invalid-runtime', session};
	}

	const replaced = replaceNarrativePlayerSessionProject(
		session,
		restored.project
	);
	if (replaced.status !== 'updated') {
		return {status: 'rejected', reason: 'artifact-mismatch', session};
	}
	return {status: 'restored', session: replaced.session};
}

export function restoreNarrativePlayerSaveJson(
	session: NarrativePlayerSession,
	serialized: string
): NarrativePlayerSaveRestoreResult {
	try {
		return restoreNarrativePlayerSave(session, JSON.parse(serialized));
	} catch {
		return {status: 'rejected', reason: 'invalid-save', session};
	}
}
