import {
	compileNarrativeRuntimeArtifact,
	serializeNarrativeRuntimeArtifact
} from '../export-compiler';
import {
	queryStoryBrainProjectDiagnostics
} from '../story-brain-query';
import {
	create93DaysPhoneSocialLoopProject,
	phoneSocialLoopIds
} from '../../../domain/narrative/content/93-days-phone-social-loop';
import {dayOneNarrativeIds} from '../../../domain/narrative/content/93-days-day-one-day-two';
import {
	composeNarrativeProjectPersistence,
	projectNarrativePersistence
} from '../../../store/narrative-project/persistence-projection';

describe('A60-S2 Story communication metadata', () => {
	test('preserves optional communication metadata deterministically through persistence and compile', () => {
		const project = create93DaysPhoneSocialLoopProject();
		const sms = project.storyNodes.find(
			node => node.id === phoneSocialLoopIds.story.incomingSms
		);
		const call = project.storyNodes.find(
			node => node.id === dayOneNarrativeIds.story.callContact
		);
		expect(sms?.communication).toEqual({channel: 'sms'});
		expect(call?.communication).toEqual({channel: 'phone-call'});

		const restored = composeNarrativeProjectPersistence(
			projectNarrativePersistence(project)
		);
		expect(
			restored.storyNodes.find(
				node => node.id === phoneSocialLoopIds.story.incomingSms
			)?.communication
		).toEqual({channel: 'sms'});

		const first = compileNarrativeRuntimeArtifact(project);
		const second = compileNarrativeRuntimeArtifact(
			create93DaysPhoneSocialLoopProject()
		);
		expect(first.status).toBe('compiled');
		expect(second.status).toBe('compiled');
		if (first.status !== 'compiled' || second.status !== 'compiled') {
			throw new Error('Expected valid A60 communication metadata to compile.');
		}
		expect(
			first.artifact.authored.storyNodes.find(
				node => node.id === phoneSocialLoopIds.story.incomingSms
			)?.communication
		).toEqual({channel: 'sms'});
		expect(serializeNarrativeRuntimeArtifact(first.artifact)).toBe(
			serializeNarrativeRuntimeArtifact(second.artifact)
		);
	});

	test('does not require physical scheduled presence for a locationless communication Story', () => {
		const project = create93DaysPhoneSocialLoopProject();
		const diagnostics = queryStoryBrainProjectDiagnostics(project);

		expect(
			diagnostics.findings.filter(
				finding =>
					finding.storyNodeId === phoneSocialLoopIds.story.incomingSms &&
					(finding.kind === 'story-participant-schedule-gap' ||
						finding.kind === 'story-schedule-location-conflict')
			)
		).toEqual([]);
	});

	test('reports and blocks malformed persisted communication metadata', () => {
		const project = create93DaysPhoneSocialLoopProject();
		const sms = project.storyNodes.find(
			node => node.id === phoneSocialLoopIds.story.incomingSms
		);
		if (!sms) {
			throw new Error('Expected A60 incoming SMS Story node.');
		}
		(sms as typeof sms & {communication: {channel: string}}).communication = {
			channel: 'email'
		};

		const diagnostics = queryStoryBrainProjectDiagnostics(project);
		expect(diagnostics.findings).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					kind: 'invalid-story-communication',
					storyNodeId: phoneSocialLoopIds.story.incomingSms
				})
			])
		);

		const compiled = compileNarrativeRuntimeArtifact(project);
		expect(compiled.status).toBe('blocked');
		if (compiled.status !== 'blocked') {
			throw new Error('Malformed A60 communication metadata must block compile.');
		}
		expect(compiled.diagnostics).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					source: 'story-brain',
					disposition: 'blocker',
					finding: expect.objectContaining({
						kind: 'invalid-story-communication',
						storyNodeId: phoneSocialLoopIds.story.incomingSms
					})
				})
			])
		);
	});
});
