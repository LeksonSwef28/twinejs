import {NarrativeProject} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {Story} from '../../../store/stories';
import {
	serializeNarrativeRuntimeArtifact
} from '../export-compiler';
import {
	narrativeRuntimeArtifactPassageName,
	narrativeRuntimeArtifactPassageTag,
	prepareNarrativeStoryExport
} from '../export-story-adapter';

function project() {
	const value = createNarrativeProject(
		'host-story',
		'Canonical Narrative Project',
		ninetyThreeDaysTemplate
	);
	value.projectId = 'project-fixed';
	return value;
}

function hostStory(): Story {
	return {
		id: 'host-story',
		ifid: 'IFID-FIXED',
		lastUpdate: new Date('2026-09-18T00:00:00.000Z'),
		name: 'Legacy outer Story name',
		passages: [
			{
				id: 'legacy-passage',
				story: 'host-story',
				name: 'Legacy passage',
				tags: ['legacy-passage-tag'],
				text: 'THIS LEGACY PASSAGE MUST NOT ENTER NARRATIVE EXPORT',
				top: 77,
				left: 88,
				width: 222,
				height: 111,
				selected: true,
				highlighted: true
			}
		],
		script: 'window.__legacyStoryScript = true;',
		selected: true,
		snapToGrid: true,
		startPassage: 'legacy-passage',
		storyFormat: 'SugarCube',
		storyFormatVersion: '2.37.3',
		stylesheet: '.legacy { display: block; }',
		tags: ['legacy-story-tag'],
		tagColors: {'legacy-story-tag': 'red'},
		zoom: 1.7
	};
}

function ready(value: NarrativeProject = project(), host: Story = hostStory()) {
	const result = prepareNarrativeStoryExport(value, host);
	if (result.status !== 'ready') {
		throw new Error('Expected ready Narrative export preparation');
	}
	return result;
}

describe('A52 transient Narrative Story export adapter', () => {
	test('creates one deterministic artifact passage and discards legacy host narrative content', () => {
		const result = ready();
		const passage = result.story.passages[0];

		expect(result.story.passages).toHaveLength(1);
		expect(passage).toEqual({
			id: 'narrative-runtime-artifact:project-fixed',
			story: 'host-story',
			name: narrativeRuntimeArtifactPassageName,
			tags: [narrativeRuntimeArtifactPassageTag],
			text: serializeNarrativeRuntimeArtifact(result.artifact),
			top: 0,
			left: 0,
			width: 100,
			height: 100,
			selected: false,
			highlighted: false
		});
		expect(passage.text).not.toContain(
			'THIS LEGACY PASSAGE MUST NOT ENTER NARRATIVE EXPORT'
		);
	});

	test('preserves only allowed host packaging identity and uses neutral transient Story fields', () => {
		const result = ready();

		expect(result.story).toEqual(
			expect.objectContaining({
				id: 'host-story',
				ifid: 'IFID-FIXED',
				name: 'Canonical Narrative Project',
				storyFormat: 'SugarCube',
				storyFormatVersion: '2.37.3',
				script: '',
				stylesheet: '',
				tags: [],
				tagColors: {},
				selected: false,
				snapToGrid: false,
				zoom: 1,
				lastUpdate: new Date(0)
			})
		);
		expect(result.story.startPassage).toBe(
			'narrative-runtime-artifact:project-fixed'
		);
	});

	test('repeated preparation is structurally deterministic', () => {
		const value = project();
		const host = hostStory();
		const first = ready(value, host);
		const second = ready(value, host);

		expect(second.story).toEqual(first.story);
		expect(second.artifact).toEqual(first.artifact);
		expect(second.diagnostics).toEqual(first.diagnostics);
	});

	test('does not mutate Narrative Project or host Story', () => {
		const value = project();
		const host = hostStory();
		const projectBefore = JSON.stringify(value);
		const hostBefore = JSON.stringify(host);

		ready(value, host);

		expect(JSON.stringify(value)).toBe(projectBefore);
		expect(JSON.stringify(host)).toBe(hostBefore);
	});

	test('blocks a mismatched host Story before compilation output is created', () => {
		const value = project();
		const host = {...hostStory(), id: 'different-story'};
		const result = prepareNarrativeStoryExport(value, host);

		expect(result).toEqual({
			status: 'blocked',
			diagnostics: [
				expect.objectContaining({
					source: 'adapter',
					disposition: 'blocker',
					code: 'host-story-mismatch'
				})
			]
		});
		expect('story' in result).toBe(false);
		expect('artifact' in result).toBe(false);
	});

	test('passes compiler blockers through without creating a transient Story', () => {
		const value = project();
		value.template = {...value.template, periods: []};
		const result = prepareNarrativeStoryExport(value, hostStory());

		expect(result.status).toBe('blocked');
		expect(
			result.diagnostics.some(
				diagnostic =>
					diagnostic.source === 'compiler' &&
					diagnostic.disposition === 'blocker' &&
					diagnostic.code === 'missing-template-period'
			)
		).toBe(true);
		expect('story' in result).toBe(false);
	});

	test('keeps Story Brain advisory diagnostics while remaining export-ready', () => {
		const value = project();
		value.storyNodes = [
			{
				id: 'terminal',
				kind: 'event',
				title: 'Current ending',
				participantIds: [],
				activationState: 'available'
			}
		];
		const result = prepareNarrativeStoryExport(value, hostStory());

		expect(result.status).toBe('ready');
		if (result.status !== 'ready') {
			throw new Error('Expected ready export');
		}
		expect(
			result.diagnostics.some(
				diagnostic =>
					diagnostic.source === 'story-brain' &&
					diagnostic.disposition === 'advisory' &&
					diagnostic.finding.kind === 'terminal-story-node'
			)
		).toBe(true);
	});
});
