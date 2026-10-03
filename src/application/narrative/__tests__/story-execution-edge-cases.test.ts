import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {consumeNarrativeStoryWork} from '../story-execution';

describe('A42 Story execution edge cases', () => {
	test('explicit miss consumes the scheduled opportunity without starting an action', () => {
		const project = createNarrativeProject(
			'a42-explicit-miss',
			'A42 explicit miss',
			ninetyThreeDaysTemplate
		);
		project.storyNodes = [
			{
				id: 'optional-event',
				kind: 'event',
				title: 'Optional',
				participantIds: [],
				placement: {
					day: 1,
					minuteOfDay: project.simulation.minuteOfDay
				},
				activationState: 'available',
				runtimePolicy: {missAfterMinutes: 30}
			}
		];

		const missed = consumeNarrativeStoryWork(project, 'story-node:optional-event', {
			decision: 'miss'
		});
		expect(missed.trace.status).toBe('missed');
		expect(missed.project.activeStoryExecutions).toEqual([]);
		expect(missed.project.storyNodeStateOverrides['optional-event']).toBe('blocked');
		expect(missed.project.runtimeOccurrences[0]).toEqual(
			expect.objectContaining({
				type: 'story-work',
				workId: 'story-node:optional-event',
				result: 'missed'
			})
		);
	});

	test('rejects work whose duration would cross the end of day 93', () => {
		const project = createNarrativeProject(
			'a42-project-end',
			'A42 project end',
			ninetyThreeDaysTemplate
		);
		project.simulation.day = ninetyThreeDaysTemplate.dayCount;
		project.simulation.minuteOfDay = 24 * 60 - 2;
		project.storyNodes = [
			{
				id: 'too-long',
				kind: 'event',
				title: 'Too long',
				participantIds: [],
				placement: {
					day: ninetyThreeDaysTemplate.dayCount,
					minuteOfDay: 24 * 60 - 2
				},
				activationState: 'available',
				runtimePolicy: {durationMinutes: 5}
			}
		];

		const result = consumeNarrativeStoryWork(project, 'story-node:too-long', {
			decision: 'execute'
		});
		expect(result.trace.status).toBe('insufficient-time');
		expect(result.project).toBe(project);
		expect(result.project.runtimeOccurrences).toEqual([]);
	});
});
