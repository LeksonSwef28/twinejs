import {
	NarrativeRuntimeArtifactV1,
	serializeNarrativeRuntimeArtifact
} from '../application/narrative/export-compiler';
import {narrativePlayerDevelopmentHandoffKey} from './artifact-source';

export const narrativePlayerDevelopmentUrl =
	'player.html#handoff=development';

export type NarrativePlayerDevelopmentLaunchResult =
	| {status: 'launched'; url: string}
	| {status: 'rejected'; summary: string};

export interface NarrativePlayerDevelopmentLaunchOptions {
	storage?: Pick<Storage, 'setItem' | 'removeItem'>;
	openWindow?: (url: string, target: string) => unknown | null;
	playerUrl?: string;
}

function removeHandoff(
	storage: Pick<Storage, 'setItem' | 'removeItem'>
) {
	try {
		storage.removeItem(narrativePlayerDevelopmentHandoffKey);
	} catch {
		// Best-effort cleanup only. The rejected result remains authoritative.
	}
}

/**
 * Development-only editor -> player transport. This is not a player save and
 * creates no Story/Passage/editor state. localStorage is used only as a
 * same-origin cross-window mailbox; the player consumes and deletes the value
 * on first successful read.
 */
export function launchNarrativePlayerDevelopment(
	artifact: NarrativeRuntimeArtifactV1,
	options: NarrativePlayerDevelopmentLaunchOptions = {}
): NarrativePlayerDevelopmentLaunchResult {
	const storage = options.storage ?? window.localStorage;
	const openWindow =
		options.openWindow ?? ((url, target) => window.open(url, target));
	const playerUrl = options.playerUrl ?? narrativePlayerDevelopmentUrl;

	try {
		storage.setItem(
			narrativePlayerDevelopmentHandoffKey,
			serializeNarrativeRuntimeArtifact(artifact)
		);
	} catch {
		return {
			status: 'rejected',
			summary: 'Не удалось подготовить временный artifact handoff для Player.'
		};
	}

	let opened: unknown | null;
	try {
		opened = openWindow(playerUrl, '_blank');
	} catch {
		removeHandoff(storage);
		return {
			status: 'rejected',
			summary: 'Не удалось открыть окно Canonical Player.'
		};
	}

	if (!opened) {
		removeHandoff(storage);
		return {
			status: 'rejected',
			summary: 'Окно Canonical Player было заблокировано браузером.'
		};
	}

	return {status: 'launched', url: playerUrl};
}
