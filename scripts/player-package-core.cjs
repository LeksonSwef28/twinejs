'use strict';

const ARTIFACT_SCRIPT_ID = 'narrative-runtime-artifact';

function embedNarrativeArtifact(templateHtml, serializedArtifact) {
	JSON.parse(serializedArtifact);
	const marker = `id="${ARTIFACT_SCRIPT_ID}"`;
	const markerIndex = templateHtml.indexOf(marker);
	if (markerIndex < 0) {
		throw new Error('Player HTML is missing the runtime artifact script marker.');
	}
	const contentStart = templateHtml.indexOf('>', markerIndex);
	const contentEnd = templateHtml.indexOf('</script>', contentStart + 1);
	if (contentStart < 0 || contentEnd < 0) {
		throw new Error('Player HTML runtime artifact script marker is malformed.');
	}
	const escaped = JSON.stringify(JSON.parse(serializedArtifact)).replace(
		/<\\/script/gi,
		'<\\\\/script'
	);
	return (
		templateHtml.slice(0, contentStart + 1) +
		escaped +
		templateHtml.slice(contentEnd)
	);
}

module.exports = {ARTIFACT_SCRIPT_ID, embedNarrativeArtifact};
