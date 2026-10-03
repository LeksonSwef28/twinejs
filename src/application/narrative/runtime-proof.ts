import {NarrativeProject} from '../../domain/narrative/project';
import {Story} from '../../store/stories';
import {AppInfo} from '../../util/app-info';
import {publishStoryWithFormat} from '../../util/publish';
import {
	NarrativePreparedExportDiagnostic,
	prepareNarrativeStoryExport
} from './export-story-adapter';
import {NarrativeRuntimeArtifactV1} from './export-compiler';

export const narrativeRuntimeProofStoryFormatName = '93 Days Compiler Proof';
export const narrativeRuntimeProofStoryFormatVersion = '1.0.0';
export const narrativeRuntimeProofFilenameExtension = '.compiler-proof.html';

export const narrativeRuntimeProofStoryFormatSource = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{{STORY_NAME}} · Compiler Proof</title>
<style>
:root { color-scheme: light dark; font-family: system-ui, sans-serif; }
body { margin: 0; padding: 32px; background: Canvas; color: CanvasText; }
main { max-width: 760px; margin: 0 auto; }
h1 { margin: 4px 0 18px; }
[data-status="loading"] #narrative-runtime-proof-status { opacity: .65; }
[data-status="error"] #narrative-runtime-proof-status { font-weight: 700; }
dl { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
dl > div { padding: 10px; border: 1px solid color-mix(in srgb, CanvasText 20%, transparent); border-radius: 8px; }
dt { font-size: 11px; opacity: .65; text-transform: uppercase; }
dd { margin: 4px 0 0; font-weight: 700; overflow-wrap: anywhere; }
small { display: block; margin-top: 18px; opacity: .65; line-height: 1.45; }
tw-storydata { display: none !important; }
</style>
</head>
<body>
<main id="narrative-runtime-proof" data-status="loading">
<p>93 Days · A52 compiler validation</p>
<h1>{{STORY_NAME}}</h1>
<p id="narrative-runtime-proof-status" role="status">Loading runtime artifact…</p>
<dl>
<div><dt>Artifact</dt><dd id="narrative-runtime-proof-artifact">—</dd></div>
<div><dt>Project</dt><dd id="narrative-runtime-proof-project">—</dd></div>
<div><dt>Source schema</dt><dd id="narrative-runtime-proof-schema">—</dd></div>
<div><dt>Initial moment</dt><dd id="narrative-runtime-proof-moment">—</dd></div>
<div><dt>Characters</dt><dd id="narrative-runtime-proof-characters">—</dd></div>
<div><dt>Story nodes</dt><dd id="narrative-runtime-proof-story-nodes">—</dd></div>
<div><dt>Narrative Moves</dt><dd id="narrative-runtime-proof-moves">—</dd></div>
</dl>
<small>Validation-only shell. It parses and displays the compiled artifact but does not execute Guards, Moves, Outcomes, effects or simulation.</small>
</main>
{{STORY_DATA}}
<script data-narrative-runtime-proof-bootstrap>
(function () {
	'use strict';
	var root = document.getElementById('narrative-runtime-proof');
	var status = document.getElementById('narrative-runtime-proof-status');
	if (!root || !status) {
		return;
	}
	function fail(message) {
		root.setAttribute('data-status', 'error');
		status.textContent = message;
	}
	function setText(id, value) {
		var element = document.getElementById(id);
		if (element) {
			element.textContent = String(value);
		}
	}
	function integer(value) {
		return typeof value === 'number' && isFinite(value) && Math.floor(value) === value;
	}
	var passage = document.querySelector('tw-passagedata[tags~="93-days-runtime-artifact"]');
	if (!passage) {
		fail('Runtime artifact Passage is missing.');
		return;
	}
	var artifact;
	try {
		artifact = JSON.parse(passage.textContent || '');
	} catch (error) {
		fail('Runtime artifact JSON is malformed.');
		return;
	}
	if (!artifact || typeof artifact !== 'object') {
		fail('Runtime artifact payload is invalid.');
		return;
	}
	if (artifact.format !== 'narrative-runtime-artifact') {
		fail('Unsupported runtime artifact format.');
		return;
	}
	if (artifact.version !== 1) {
		fail('Unsupported runtime artifact version.');
		return;
	}
	var authored = artifact.authored;
	var runtime = artifact.initialRuntime;
	var simulation = runtime && runtime.simulation;
	if (!authored || typeof authored !== 'object' || !simulation || typeof simulation !== 'object') {
		fail('Runtime artifact start state is missing.');
		return;
	}
	if (
		!integer(simulation.day) ||
		simulation.day < 1 ||
		!integer(simulation.minuteOfDay) ||
		simulation.minuteOfDay < 0 ||
		simulation.minuteOfDay >= 1440
	) {
		fail('Runtime artifact initial moment is invalid.');
		return;
	}
	setText('narrative-runtime-proof-artifact', artifact.format + ' v' + artifact.version);
	setText(
		'narrative-runtime-proof-project',
		typeof authored.name === 'string' ? authored.name : '—'
	);
	setText(
		'narrative-runtime-proof-schema',
		integer(artifact.sourceSchemaVersion) ? artifact.sourceSchemaVersion : '—'
	);
	setText(
		'narrative-runtime-proof-moment',
		'Day ' + simulation.day + ' · minute ' + simulation.minuteOfDay
	);
	setText(
		'narrative-runtime-proof-characters',
		Array.isArray(authored.characters) ? authored.characters.length : 0
	);
	setText(
		'narrative-runtime-proof-story-nodes',
		Array.isArray(authored.storyNodes) ? authored.storyNodes.length : 0
	);
	setText(
		'narrative-runtime-proof-moves',
		Array.isArray(authored.narrativeMoves) ? authored.narrativeMoves.length : 0
	);
	root.setAttribute('data-status', 'ready');
	status.textContent = 'Runtime artifact v1 loaded.';
})();
</script>
</body>
</html>
`;

export type NarrativeRuntimeProofPreparation =
	| {
			status: 'blocked';
			diagnostics: NarrativePreparedExportDiagnostic[];
	  }
	| {
			status: 'ready';
			artifact: NarrativeRuntimeArtifactV1;
			diagnostics: NarrativePreparedExportDiagnostic[];
			html: string;
			story: Story;
	  };

function proofPackagingStory(story: Story): Story {
	return {
		...story,
		storyFormat: narrativeRuntimeProofStoryFormatName,
		storyFormatVersion: narrativeRuntimeProofStoryFormatVersion
	};
}

/**
 * A52-S4 validation-only proof. The browser shell consumes the versioned
 * artifact as inert JSON and deliberately contains no narrative evaluators.
 */
export function prepareNarrativeRuntimeProof(
	project: NarrativeProject,
	hostStory: Story,
	appInfo: AppInfo
): NarrativeRuntimeProofPreparation {
	const prepared = prepareNarrativeStoryExport(project, hostStory);
	if (prepared.status === 'blocked') {
		return prepared;
	}

	const story = proofPackagingStory(prepared.story);
	return {
		status: 'ready',
		artifact: prepared.artifact,
		diagnostics: prepared.diagnostics,
		story,
		html: publishStoryWithFormat(
			story,
			narrativeRuntimeProofStoryFormatSource,
			appInfo
		)
	};
}
