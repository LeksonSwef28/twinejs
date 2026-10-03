import {NarrativeProject} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	compileNarrativeRuntimeArtifact,
	narrativeRuntimeArtifactFormat,
	narrativeRuntimeArtifactVersion,
	serializeNarrativeRuntimeArtifact
} from '../export-compiler';

function validProject() {
	const project = createNarrativeProject(
		'a52-export',
		'A52 export compiler',
		ninetyThreeDaysTemplate
	);
	project.characters = [
		{
			id: 'hero',
			name: 'Герой',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'hero-profile'
		}
	];
	project.behaviorProfiles = [
		{id: 'hero-profile', characterId: 'hero', name: 'Default'}
	];
	project.claims = [
		{
			id: 'claim-start',
			text: 'Лето только начинается.',
			stance: 'unresolved',
			tags: []
		},
		{
			id: 'claim-second',
			text: 'Второе утверждение.',
			stance: 'unresolved',
			tags: []
		}
	];
	project.initialKnowledge = [
		{
			id: 'seed-start',
			characterId: 'hero',
			claimId: 'claim-start',
			attitude: 'believes',
			confidence: 0.8,
			source: {type: 'authored'}
		}
	];
	project.storyNodes = [
		{
			id: 'opening',
			kind: 'event',
			title: 'Начало',
			participantIds: ['hero'],
			activationState: 'available'
		}
	];
	return project;
}

function compiled(project: NarrativeProject) {
	const result = compileNarrativeRuntimeArtifact(project);
	if (result.status !== 'compiled') {
		throw new Error(
			`Expected compiled artifact, got blockers: ${result.diagnostics
				.map(diagnostic =>
					diagnostic.source === 'story-brain'
						? diagnostic.finding.kind
						: diagnostic.code
				)
				.join(', ')}`
		);
	}
	return result;
}

describe('A52 runtime artifact compiler', () => {
	test('builds versioned artifact from authored projection and fresh initial runtime', () => {
		const project = validProject();
		project.editor.selectedDay = 44;
		project.simulation.day = 22;
		project.simulation.minuteOfDay = 1234;
		project.simulation.actualLocationByCharacter = {hero: 'runtime-only'};
		project.simulation.characterKnowledge = [
			{
				id: 'knowledge:hero:claim-start',
				characterId: 'hero',
				claimId: 'claim-start',
				attitude: 'disbelieves',
				confidence: 0.1,
				source: {type: 'authored'},
				timesHeard: 7
			}
		];
		project.memories = [
			{
				id: 'runtime-memory',
				characterId: 'hero',
				summary: 'Runtime only',
				createdAtDay: 3,
				createdAtMinute: 500,
				importance: 0.5,
				baseStrength: 0.5,
				tags: [],
				relatedEntityIds: []
			}
		];
		project.storyNodeStateOverrides = {opening: 'completed'};
		project.runtimeOccurrences = [
			{
				id: 'occurrence:runtime-only',
				type: 'move-outcome',
				storyNodeId: 'opening',
				moveId: 'runtime-move',
				outcomeId: 'runtime-outcome',
				effectIds: [],
				moment: {day: 22, minuteOfDay: 1234}
			}
		];

		const result = compiled(project);
		const {artifact} = result;

		expect(artifact.format).toBe(narrativeRuntimeArtifactFormat);
		expect(artifact.version).toBe(narrativeRuntimeArtifactVersion);
		expect(artifact.sourceSchemaVersion).toBe(project.schemaVersion);
		expect((artifact.authored as any).editor).toBeUndefined();
		expect((artifact.authored as any).simulation).toBeUndefined();
		expect((artifact.authored as any).memories).toBeUndefined();
		expect(artifact.initialRuntime).toEqual(
			expect.objectContaining({
				memories: [],
				relationships: [],
				pendingReactions: [],
				mindStates: [],
				injuriesByCharacter: {},
				itemPlacementOverrides: {},
				storyNodeStateOverrides: {},
				runtimeOccurrences: [],
				activeStoryExecutions: []
			})
		);
		expect(artifact.initialRuntime.simulation).toEqual({
			day: 1,
			minuteOfDay: ninetyThreeDaysTemplate.periods[0].startMinute,
			activeBehaviorProfileByCharacter: {},
			actualLocationByCharacter: {},
			characterKnowledge: [
				{
					id: 'knowledge:hero:claim-start',
					characterId: 'hero',
					claimId: 'claim-start',
					attitude: 'believes',
					confidence: 0.8,
					source: {type: 'authored'},
					timesHeard: 1
				}
			],
			bodyByCharacter: {}
		});
	});

	test('ignores editor/live runtime mutations but changes when authored input changes', () => {
		const project = validProject();
		const first = serializeNarrativeRuntimeArtifact(compiled(project).artifact);

		project.editor.selectedDay = 90;
		project.editor.workspaceMode = 'world-time';
		project.simulation.day = 40;
		project.simulation.minuteOfDay = 999;
		project.simulation.actualLocationByCharacter.hero = 'runtime-location';
		project.memories = [
			{
				id: 'runtime-memory',
				characterId: 'hero',
				summary: 'Ignored runtime memory',
				createdAtDay: 4,
				createdAtMinute: 600,
				importance: 0.4,
				baseStrength: 0.4,
				tags: [],
				relatedEntityIds: []
			}
		];
		const afterRuntime = serializeNarrativeRuntimeArtifact(compiled(project).artifact);
		expect(afterRuntime).toBe(first);

		project.claims[0].text = 'Автор изменил исходное утверждение.';
		const afterAuthoring = serializeNarrativeRuntimeArtifact(compiled(project).artifact);
		expect(afterAuthoring).not.toBe(first);
		expect(afterAuthoring).toContain('Автор изменил исходное утверждение.');
	});

	test('canonical serialization sorts object keys while preserving authored array order', () => {
		const artifact = compiled(validProject()).artifact;
		const serialized = serializeNarrativeRuntimeArtifact(artifact);
		const parsed = JSON.parse(serialized);

		expect(Object.keys(parsed)).toEqual([
			'authored',
			'format',
			'initialRuntime',
			'sourceSchemaVersion',
			'version'
		]);
		expect(Object.keys(parsed.authored)).toEqual(
			[...Object.keys(parsed.authored)].sort()
		);
		expect(parsed.authored.claims.map((claim: {id: string}) => claim.id)).toEqual([
			'claim-start',
			'claim-second'
		]);
		expect(serializeNarrativeRuntimeArtifact(artifact)).toBe(serialized);
	});

	test('returns Story Brain blockers atomically and keeps advisory findings visible', () => {
		const advisoryProject = validProject();
		const advisory = compileNarrativeRuntimeArtifact(advisoryProject);
		expect(advisory.status).toBe('compiled');
		expect(
			advisory.diagnostics.some(
				diagnostic =>
					diagnostic.source === 'story-brain' &&
					diagnostic.disposition === 'advisory' &&
					diagnostic.finding.kind === 'terminal-story-node'
			)
		).toBe(true);

		const blockedProject = validProject();
		blockedProject.storyNodes[0].participantIds = ['hero', 'missing'];
		const before = JSON.stringify(blockedProject);
		const blocked = compileNarrativeRuntimeArtifact(blockedProject);

		expect(blocked.status).toBe('blocked');
		expect('artifact' in blocked).toBe(false);
		expect(
			blocked.diagnostics.some(
				diagnostic =>
					diagnostic.source === 'story-brain' &&
					diagnostic.disposition === 'blocker' &&
					diagnostic.finding.kind === 'broken-authored-reference'
			)
		).toBe(true);
		expect(JSON.stringify(blockedProject)).toBe(before);
	});

	test('blocks invalid authored initial runtime with typed compiler diagnostic', () => {
		const project = validProject();
		project.initialKnowledge[0].confidence = 2;
		const before = JSON.stringify(project);
		const result = compileNarrativeRuntimeArtifact(project);

		expect(result.status).toBe('blocked');
		expect('artifact' in result).toBe(false);
		expect(result.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'compiler',
					disposition: 'blocker',
					code: 'invalid-initial-runtime'
				})
			])
		);
		expect(JSON.stringify(project)).toBe(before);
	});

	test('blocks a template without a first period instead of producing a partial artifact', () => {
		const project = validProject();
		project.template = {...project.template, periods: []};
		const result = compileNarrativeRuntimeArtifact(project);

		expect(result.status).toBe('blocked');
		expect('artifact' in result).toBe(false);
		expect(result.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'compiler',
					disposition: 'blocker',
					code: 'missing-template-period'
				})
			])
		);
	});

	test('compiled artifact owns defensive copies of authored and initial-state data', () => {
		const project = validProject();
		const result = compiled(project);
		const serialized = serializeNarrativeRuntimeArtifact(result.artifact);

		project.claims[0].text = 'Caller mutation';
		project.initialKnowledge[0].source = {type: 'observed'};

		expect(serializeNarrativeRuntimeArtifact(result.artifact)).toBe(serialized);
		expect(result.artifact.authored.claims[0].text).toBe('Лето только начинается.');
		expect(result.artifact.initialRuntime.simulation.characterKnowledge[0].source).toEqual({
			type: 'authored'
		});
	});
});
