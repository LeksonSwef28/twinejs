import {
	NarrativeRuntimeArtifactV1,
	serializeNarrativeRuntimeArtifact
} from './export-compiler';

export const narrativePlayerArtifactScriptId = 'narrative-runtime-artifact';

function escapedArtifactJson(artifact: NarrativeRuntimeArtifactV1) {
	return serializeNarrativeRuntimeArtifact(artifact).replace(
		/<\/script/gi,
		'<\\/script'
	);
}

/**
 * Embeds exact canonical artifact data into the dedicated player HTML shell.
 * Runtime code remains in the player bundle assets; this function never emits
 * gameplay semantics.
 */
export function embedNarrativeRuntimeArtifactInPlayerHtml(
	templateHtml: string,
	artifact: NarrativeRuntimeArtifactV1
) {
	const marker = `id="${narrativePlayerArtifactScriptId}"`;
	const markerIndex = templateHtml.indexOf(marker);
	if (markerIndex < 0) {
		throw new Error('Player HTML is missing the runtime artifact script marker.');
	}
	const scriptStart = templateHtml.lastIndexOf('<script', markerIndex);
	const contentStart = templateHtml.indexOf('>', markerIndex);
	const contentEnd = templateHtml.indexOf('</script>', contentStart + 1);
	if (scriptStart < 0 || contentStart < 0 || contentEnd < 0) {
		throw new Error('Player HTML runtime artifact script marker is malformed.');
	}

	return (
		templateHtml.slice(0, contentStart + 1) +
		escapedArtifactJson(artifact) +
		templateHtml.slice(contentEnd)
	);
}
