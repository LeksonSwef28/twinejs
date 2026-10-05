import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {advanceNarrativeProjectSimulation} from '../simulation';
import {
	consumeNarrativeStoryWork,
	interruptNarrativeStoryExecution
} from '../story-execution';

function projectWithStoryWork() {
	const project = createNarrativeProject(
		'a42-story-execution',
		'A42 Story execution',
		ninetyThreeDaysTemplate
	);
	project.characters = [
		{
			id: 'player',
			name: 'Player',
			cognitionTier: 'full',
			defaultBehaviorProfileId: 'default'
		}
	];
	const start = project.simulation.minuteOfDay;
	project.storyNodes = [
		{
			id: 'meeting',
			kind: 'event',
			title: 'Meeting',
			participantIds: ['player'],
			placement: {day: 1, minuteOfDay: start + 5},
			activationState: 'available',
			runtimePolicy: {durationMinutes: 10, occurrenceMode: 'one-shot'}
		},
		{
			id: 'repeatable-call',
			kind: 'event',
			title: 'Repeatable call',
			participantIds: [],
			placement: {day: 1, minuteOfDay: start + 5},
			activationState: 'available',
			runtimePolicy: {durationMinutes: 0, occurrenceMode: 'repeatable'}
		},
		{
			id: 'expiring',
			kind: 'event',
			title: 'Expiring event',
			participantIds: [],
			placement: {day: 1, minuteOfDay: start + 5},
			activationState: 'available',
			runtimePolicy: {durationMinutes: 0, missAfterMinutes: 3}
		}
	];
	return project;
}

describe('A42 explicit Story work execution', () => {
	test('due work stays declarative until explicitly started, then completes on exact Playhead time', () => {
		const project = projectWithStoryWork();
		const authoredBefore = JSON.stringify(project.storyNodes);
		const due = advanceNarrativeProjectSimulation(project, 5);

		expect(due.dueWork.map(work => work.id)).toContain('story-node:meeting');
		expect(due.project.activeStoryExecutions).toEqual([]);
		expect(
			due.project.runtimeOccurrences.filter(occurrence => occurrence.type === 'story-work')
		).toEqual([]);

		const started = consumeNarrativeStoryWork(due.project, 'story-node:meeting', {
			decision: 'execute'
		});
		expect(started.trace.status).toBe('started');
		expect(started.project.activeStoryExecutions).toHaveLength(1);
		expect(started.project.storyNodeStateOverrides.meeting).toBe('active');

		const after9 = advanceNarrativeProjectSimulation(started.project, 9);
		expect(after9.storyExecutionTraces).toEqual([]);
		expect(after9.project.activeStoryExecutions).toHaveLength(1);

		const after10 = advanceNarrativeProjectSimulation(after9.project, 1);
		expect(after10.storyExecutionTraces).toHaveLength(1);
		expect(after10.project.activeStoryExecutions).toEqual([]);
		expect(after10.project.storyNodeStateOverrides.meeting).toBe('completed');
		expect(after10.project.runtimeOccurrences).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'story-work',
					workId: 'story-node:meeting',
					storyNodeId: 'meeting',
					result: 'executed',
					plannedDurationMinutes: 10,
					elapsedMinutes: 10
				})
			])
		);
		expect(JSON.stringify(after10.project.storyNodes)).toBe(authoredBefore);

		const duplicate = consumeNarrativeStoryWork(
			after10.project,
			'story-node:meeting',
			{decision: 'execute'}
		);
		expect(duplicate.trace.status).toBe('already-consumed');
		expect(duplicate.project).toBe(after10.project);
	});

	test('repeatable zero-duration work can execute again without becoming authored-completed', () => {
		let project = advanceNarrativeProjectSimulation(projectWithStoryWork(), 5).project;
		const first = consumeNarrativeStoryWork(project, 'story-node:repeatable-call', {
			decision: 'execute'
		});
		expect(first.trace.status).toBe('completed');
		expect(first.project.storyNodeStateOverrides['repeatable-call']).toBe('available');
		project = first.project;

		const second = consumeNarrativeStoryWork(project, 'story-node:repeatable-call', {
			decision: 'execute'
		});
		expect(second.trace.status).toBe('completed');
		expect(
			second.project.runtimeOccurrences.filter(
				occurrence =>
					occurrence.type === 'story-work' &&
					occurrence.workId === 'story-node:repeatable-call'
			)
		).toHaveLength(2);
	});

	test('authored miss window records one deterministic miss after expiry', () => {
		const late = advanceNarrativeProjectSimulation(projectWithStoryWork(), 9).project;
		const expired = consumeNarrativeStoryWork(late, 'story-node:expiring', {
			decision: 'execute'
		});
		expect(expired.trace.status).toBe('expired');
		expect(expired.project.storyNodeStateOverrides.expiring).toBe('blocked');
		expect(expired.project.runtimeOccurrences).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'story-work',
					workId: 'story-node:expiring',
					result: 'missed'
				})
			])
		);

		const repeated = consumeNarrativeStoryWork(
			expired.project,
			'story-node:expiring',
			{decision: 'execute'}
		);
		expect(repeated.trace.status).toBe('already-consumed');
		expect(repeated.project.runtimeOccurrences).toHaveLength(
			expired.project.runtimeOccurrences.length
		);
	});

	test('participant conflicts require explicit preemption and locked work cannot be preempted', () => {
		let project = projectWithStoryWork();
		const start = project.simulation.minuteOfDay;
		project.storyNodes = [
			{
				id: 'locked-work',
				kind: 'event',
				title: 'Locked',
				participantIds: ['player'],
				placement: {day: 1, minuteOfDay: start + 1},
				activationState: 'available',
				runtimePolicy: {
					durationMinutes: 20,
					interruption: 'locked'
				}
			},
			{
				id: 'new-work',
				kind: 'event',
				title: 'New',
				participantIds: ['player'],
				placement: {day: 1, minuteOfDay: start + 1},
				activationState: 'available',
				runtimePolicy: {durationMinutes: 5}
			}
		];
		project = advanceNarrativeProjectSimulation(project, 1).project;
		const first = consumeNarrativeStoryWork(project, 'story-node:locked-work', {
			decision: 'execute'
		});
		const executionId = first.project.activeStoryExecutions[0].id;

		const conflict = consumeNarrativeStoryWork(first.project, 'story-node:new-work', {
			decision: 'execute'
		});
		expect(conflict.trace.status).toBe('conflict');

		const blocked = consumeNarrativeStoryWork(first.project, 'story-node:new-work', {
			decision: 'execute',
			preemptExecutionIds: [executionId]
		});
		expect(blocked.trace.status).toBe('preemption-blocked');
		expect(blocked.project).toBe(first.project);

		const interruption = interruptNarrativeStoryExecution(first.project, executionId);
		expect(interruption.trace.status).toBe('locked');
		expect(interruption.project).toBe(first.project);
	});

	test('explicit preemption interrupts interruptible work before starting the replacement', () => {
		let project = projectWithStoryWork();
		const start = project.simulation.minuteOfDay;
		project.storyNodes = [
			{
				id: 'old-work',
				kind: 'event',
				title: 'Old',
				participantIds: ['player'],
				placement: {day: 1, minuteOfDay: start + 1},
				activationState: 'available',
				runtimePolicy: {durationMinutes: 20, interruption: 'interruptible'}
			},
			{
				id: 'replacement',
				kind: 'event',
				title: 'Replacement',
				participantIds: ['player'],
				placement: {day: 1, minuteOfDay: start + 1},
				activationState: 'available',
				runtimePolicy: {durationMinutes: 5}
			}
		];
		project = advanceNarrativeProjectSimulation(project, 1).project;
		const first = consumeNarrativeStoryWork(project, 'story-node:old-work', {
			decision: 'execute'
		});
		const oldExecutionId = first.project.activeStoryExecutions[0].id;

		const replacement = consumeNarrativeStoryWork(
			first.project,
			'story-node:replacement',
			{decision: 'execute', preemptExecutionIds: [oldExecutionId]}
		);
		expect(replacement.trace.status).toBe('started');
		expect(replacement.trace.preemptedExecutionIds).toEqual([oldExecutionId]);
		expect(replacement.project.activeStoryExecutions).toHaveLength(1);
		expect(replacement.project.activeStoryExecutions[0].storyNodeId).toBe(
			'replacement'
		);
		expect(replacement.project.storyNodeStateOverrides['old-work']).toBe('available');
		expect(replacement.project.runtimeOccurrences).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					type: 'story-work',
					storyNodeId: 'old-work',
					result: 'interrupted'
				})
			])
		);
	});
});
