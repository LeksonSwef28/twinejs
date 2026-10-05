import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	composeNarrativeProjectPersistence,
	projectNarrativePersistence
} from '../persistence-projection';

describe('A42 active Story execution persistence projection', () => {
	test('keeps active Story work in runtime and out of authored definitions', () => {
		const project = createNarrativeProject(
			'a42-projection',
			'A42 projection',
			ninetyThreeDaysTemplate
		);
		project.activeStoryExecutions = [
			{
				id: 'execution:story-node:event:1:600:1',
				workId: 'story-node:event',
				storyNodeId: 'event',
				participantIds: ['player'],
				scheduledMoment: {day: 1, minuteOfDay: 600},
				startedAt: {day: 1, minuteOfDay: 600},
				completesAt: {day: 1, minuteOfDay: 620},
				durationMinutes: 20,
				occurrenceMode: 'one-shot',
				interruption: 'interruptible'
			}
		];

		const envelope = projectNarrativePersistence(project);
		expect((envelope.authored as any).activeStoryExecutions).toBeUndefined();
		expect(envelope.runtime.activeStoryExecutions).toEqual(
			project.activeStoryExecutions
		);
	});

	test('drops malformed active execution data while composing an envelope', () => {
		const project = createNarrativeProject(
			'a42-projection-invalid',
			'A42 projection invalid',
			ninetyThreeDaysTemplate
		);
		const envelope = projectNarrativePersistence(project) as any;
		envelope.runtime.activeStoryExecutions = [{id: 'broken'}];

		const composed = composeNarrativeProjectPersistence(envelope);
		expect(composed.activeStoryExecutions).toEqual([]);
	});
});
