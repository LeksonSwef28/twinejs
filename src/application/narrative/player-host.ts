import {
	NarrativePlayerBootstrapErrorCode,
	NarrativePlayerSession,
	materializeNarrativePlayerSession
} from './player-runtime';

export type NarrativePlayerHostErrorCode =
	| 'missing-artifact'
	| 'invalid-artifact-json'
	| NarrativePlayerBootstrapErrorCode;

export type NarrativePlayerHostBootstrapResult =
	| {status: 'ready'; session: NarrativePlayerSession}
	| {
			status: 'rejected';
			code: NarrativePlayerHostErrorCode;
			summary: string;
	  };

/**
 * A54 host bootstrap boundary. It owns transport-level JSON parsing only;
 * artifact compatibility and canonical project materialization remain owned by
 * A53.
 */
export function bootstrapNarrativePlayerHost(
	serializedArtifact: string | null | undefined
): NarrativePlayerHostBootstrapResult {
	if (!serializedArtifact?.trim()) {
		return {
			status: 'rejected',
			code: 'missing-artifact',
			summary: 'No Narrative runtime artifact was supplied to the player host.'
		};
	}

	let value: unknown;
	try {
		value = JSON.parse(serializedArtifact);
	} catch {
		return {
			status: 'rejected',
			code: 'invalid-artifact-json',
			summary: 'Narrative runtime artifact is not valid JSON.'
		};
	}

	const materialized = materializeNarrativePlayerSession(value);
	if (materialized.status === 'rejected') {
		return {
			status: 'rejected',
			code: materialized.code,
			summary: materialized.summary
		};
	}
	return materialized;
}
