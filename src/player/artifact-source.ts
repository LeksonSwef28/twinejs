import {narrativePlayerArtifactScriptId} from '../application/narrative/player-package';

export const narrativePlayerDevelopmentHandoffKey =
	'93-days:narrative-player-artifact';

export type NarrativePlayerArtifactSource =
	| {
			status: 'found';
			source: 'inline' | 'development-handoff';
			serializedArtifact: string;
	  }
	| {status: 'missing'; summary: string};

export interface NarrativePlayerArtifactSourceOptions {
	documentRef?: Document;
	locationRef?: Location;
	storage?: Pick<Storage, 'getItem' | 'removeItem'>;
}

export function readNarrativePlayerArtifactSource(
	options: NarrativePlayerArtifactSourceOptions = {}
): NarrativePlayerArtifactSource {
	const documentRef = options.documentRef ?? document;
	const locationRef = options.locationRef ?? window.location;
	const embedded = documentRef
		.getElementById(narrativePlayerArtifactScriptId)
		?.textContent?.trim();

	if (embedded) {
		return {
			status: 'found',
			source: 'inline',
			serializedArtifact: embedded
		};
	}

	const hash = new URLSearchParams(locationRef.hash.replace(/^#/, ''));
	if (hash.get('handoff') !== 'development') {
		return {
			status: 'missing',
			summary:
				'No embedded artifact is present and no development handoff was requested.'
		};
	}

	const storage = options.storage ?? window.localStorage;
	try {
		const handedOff = storage.getItem(narrativePlayerDevelopmentHandoffKey);
		if (!handedOff?.trim()) {
			return {
				status: 'missing',
				summary: 'Development artifact handoff did not contain an artifact.'
			};
		}

		storage.removeItem(narrativePlayerDevelopmentHandoffKey);
		return {
			status: 'found',
			source: 'development-handoff',
			serializedArtifact: handedOff
		};
	} catch {
		return {
			status: 'missing',
			summary:
				'Development artifact handoff storage is unavailable or could not be consumed.'
		};
	}
}
