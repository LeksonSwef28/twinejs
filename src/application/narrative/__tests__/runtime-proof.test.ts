import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {Story} from '../../../store/stories';
import {fakeAppInfo} from '../../../test-util';
import {
	narrativeRuntimeArtifactPassageTag
} from '../export-story-adapter';
import {
	narrativeRuntimeProofStoryFormatName,
	narrativeRuntimeProofStoryFormatSource,
	narrativeRuntimeProofStoryFormatVersion,
	prepareNarrativeRuntimeProof
} from '../runtime-proof';

function project(name = 'Runnable proof') {
	const value = createNarrativeProject(
		'proof-host',
		name,
		ninetyThreeDaysTemplate
	);
	value.projectId = 'proof-project';
	value.characters = [
		{
			id: 'hero',
			name: 'Герой',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'hero-default'
		}
	];
	value.behaviorProfiles = [
		{id: 'hero-default', characterId: 'hero', name: 'Default'}
	];
	value.storyNodes = [
		{
			id: 'opening',
			kind: 'event',
			title: 'Opening',
			participantIds: ['hero'],
			activationState: 'available'
		}
	];
	return value;
}

function hostStory(): Story {
	return {
		id: 'proof-host',
		ifid: 'IFID-PROOF',
		lastUpdate: new Date('2026-09-18T00:00:00.000Z'),
		name: 'Legacy host',
		passages: [],
		script: 'legacy-script',
		selected: false,
		snapToGrid: true,
		startPassage: '',
		storyFormat: 'SugarCube',
		storyFormatVersion: '2.37.3',
		stylesheet: 'legacy-style',
		tags: ['legacy'],
		tagColors: {legacy: 'red'},
		zoom: 1
	};
}

function ready(name?: string) {
	const result = prepareNarrativeRuntimeProof(
		project(name),
		hostStory(),
		fakeAppInfo({name: 'Twine', version: '2.12.0'})
	);
	if (result.status !== 'ready') {
		throw new Error('Expected ready compiler proof');
	}
	return result;
}

function writeAndExecute(
	html: string,
	mutate?: (document: Document) => void
) {
	document.open();
	document.write(html);
	document.close();
	mutate?.(document);
	const script = document.querySelector(
		'script[data-narrative-runtime-proof-bootstrap]'
	);
	if (!script?.textContent) {
		throw new Error('Proof bootstrap script is missing');
	}
	window.eval(script.textContent);
	return document;
}

function artifactPassage(document: Document) {
	const passage = document.querySelector(
		`tw-passagedata[tags~="${narrativeRuntimeArtifactPassageTag}"]`
	);
	if (!passage) {
		throw new Error('Artifact Passage is missing');
	}
	return passage;
}

describe('A52 runtime compiler proof', () => {
	test('binds one exact artifact Passage through the dedicated proof Story Format identity', () => {
		const result = ready();
		const parsed = new DOMParser().parseFromString(result.html, 'text/html');
		const storyData = parsed.querySelector('tw-storydata');

		expect(
			parsed.querySelectorAll(
				`tw-passagedata[tags~="${narrativeRuntimeArtifactPassageTag}"]`
			)
		).toHaveLength(1);
		expect(storyData?.getAttribute('format')).toBe(
			narrativeRuntimeProofStoryFormatName
		);
		expect(storyData?.getAttribute('format-version')).toBe(
			narrativeRuntimeProofStoryFormatVersion
		);
		expect(result.story.storyFormat).toBe(narrativeRuntimeProofStoryFormatName);
		expect(result.story.storyFormatVersion).toBe(
			narrativeRuntimeProofStoryFormatVersion
		);
	});

	test('executes the exact proof bootstrap and renders artifact identity plus fresh start state', () => {
		const result = ready();
		const proofDocument = writeAndExecute(result.html);
		const root = proofDocument.getElementById('narrative-runtime-proof');

		expect(root).toHaveAttribute('data-status', 'ready');
		expect(
			proofDocument.getElementById('narrative-runtime-proof-status')
		).toHaveTextContent('Runtime artifact v1 loaded.');
		expect(
			proofDocument.getElementById('narrative-runtime-proof-artifact')
		).toHaveTextContent('narrative-runtime-artifact v1');
		expect(
			proofDocument.getElementById('narrative-runtime-proof-project')
		).toHaveTextContent('Runnable proof');
		expect(
			proofDocument.getElementById('narrative-runtime-proof-moment')
		).toHaveTextContent(
			`Day 1 · minute ${ninetyThreeDaysTemplate.periods[0].startMinute}`
		);
		expect(
			proofDocument.getElementById('narrative-runtime-proof-characters')
		).toHaveTextContent('1');
		expect(
			proofDocument.getElementById('narrative-runtime-proof-story-nodes')
		).toHaveTextContent('1');
	});

	test.each([
		[
			'missing artifact Passage',
			(document: Document) => artifactPassage(document).remove(),
			'Runtime artifact Passage is missing.'
		],
		[
			'malformed JSON',
			(document: Document) => {
				artifactPassage(document).textContent = '{';
			},
			'Runtime artifact JSON is malformed.'
		],
		[
			'wrong artifact format',
			(document: Document) => {
				const passage = artifactPassage(document);
				const artifact = JSON.parse(passage.textContent ?? '');
				artifact.format = 'other-artifact';
				passage.textContent = JSON.stringify(artifact);
			},
			'Unsupported runtime artifact format.'
		],
		[
			'unsupported artifact version',
			(document: Document) => {
				const passage = artifactPassage(document);
				const artifact = JSON.parse(passage.textContent ?? '');
				artifact.version = 2;
				passage.textContent = JSON.stringify(artifact);
			},
			'Unsupported runtime artifact version.'
		],
		[
			'invalid initial moment',
			(document: Document) => {
				const passage = artifactPassage(document);
				const artifact = JSON.parse(passage.textContent ?? '');
				artifact.initialRuntime.simulation.minuteOfDay = 1440;
				passage.textContent = JSON.stringify(artifact);
			},
			'Runtime artifact initial moment is invalid.'
		]
	])('fails visibly for %s', (_label, mutate, expectedMessage) => {
		const proofDocument = writeAndExecute(ready().html, mutate);
		expect(
			proofDocument.getElementById('narrative-runtime-proof')
		).toHaveAttribute('data-status', 'error');
		expect(
			proofDocument.getElementById('narrative-runtime-proof-status')
		).toHaveTextContent(expectedMessage as string);
	});

	test('keeps script-like project content inert when rendered from the artifact', () => {
		const attack =
			'<img src=x onerror="document.body.dataset.compromised=\'yes\'"><script>document.body.dataset.script=\'yes\'</script>';
		const proofDocument = writeAndExecute(ready(attack).html);

		expect(
			proofDocument.getElementById('narrative-runtime-proof-project')
		).toHaveTextContent(attack);
		expect(
			proofDocument.querySelector('#narrative-runtime-proof-project img')
		).toBeNull();
		expect(document.body.dataset.compromised).toBeUndefined();
		expect(document.body.dataset.script).toBeUndefined();
	});

	test('proof source contains no dynamic-code or canonical runtime evaluator implementation hooks', () => {
		expect(narrativeRuntimeProofStoryFormatSource).not.toMatch(/\beval\s*\(/);
		expect(narrativeRuntimeProofStoryFormatSource).not.toContain('new Function');
		expect(narrativeRuntimeProofStoryFormatSource).not.toContain('Math.random');
		expect(narrativeRuntimeProofStoryFormatSource).not.toContain(
			'evaluateNarrativeGuards'
		);
		expect(narrativeRuntimeProofStoryFormatSource).not.toContain(
			'applyNarrativeOutcomeEffects'
		);
		expect(narrativeRuntimeProofStoryFormatSource).not.toContain(
			'advanceActiveStoryExecutions'
		);
	});

	test('is deterministic and does not mutate Narrative Project or host Story', () => {
		const value = project();
		const host = hostStory();
		const projectBefore = JSON.stringify(value);
		const hostBefore = JSON.stringify(host);
		const appInfo = fakeAppInfo({name: 'Twine', version: '2.12.0'});
		const first = prepareNarrativeRuntimeProof(value, host, appInfo);
		const second = prepareNarrativeRuntimeProof(value, host, appInfo);

		expect(first).toEqual(second);
		expect(JSON.stringify(value)).toBe(projectBefore);
		expect(JSON.stringify(host)).toBe(hostBefore);
		expect(host.storyFormat).toBe('SugarCube');
		expect(host.storyFormatVersion).toBe('2.37.3');
	});

	test('passes compiler blockers through without producing proof HTML', () => {
		const value = project();
		value.template = {...value.template, periods: []};
		const result = prepareNarrativeRuntimeProof(
			value,
			hostStory(),
			fakeAppInfo()
		);

		expect(result.status).toBe('blocked');
		expect('html' in result).toBe(false);
		expect(
			result.diagnostics.some(
				diagnostic =>
					diagnostic.source === 'compiler' &&
					diagnostic.code === 'missing-template-period'
			)
		).toBe(true);
	});
});
