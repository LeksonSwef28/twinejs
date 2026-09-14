import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {advanceNarrativeProjectSimulation} from '../../../application/narrative/simulation';
import {consumeNarrativeStoryWork} from '../../../application/narrative/story-execution';
import {createLocalStorageNarrativeProjectRepository} from '../repository';
import {
	createNarrativeRuntimeSnapshot,
	restoreNarrativeRuntimeSnapshot,
	serializeNarrativeRuntimeSnapshot,
	restoreNarrativeRuntimeSnapshotJson
} from '../runtime-snapshot';

function startedProject() {
	let project = createNarrativeProject(
		'a42-persistence',
		'A42 persistence',
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
			id: 'long-scene',
			kind: 'event',
			title: 'Long scene',
			participantIds: ['player'],
			placement: {day: 1, minuteOfDay: start + 1},
			activationState: 'available',
			runtimePolicy: {durationMinutes: 20, interruption: 'interruptible'}
		}
	];
	project = advanceNarrativeProjectSimulation(project, 1).project;
	project = consumeNarrativeStoryWork(project, 'story-node:long-scene', {
		decision: 'execute'
	}).project;
	return project;
}

describe('A42 Story execution persistence', () => {
	beforeEach(() => window.localStorage.clear());

	test('runtime snapshot resumes an in-progress Story execution deterministically', () => {
		const source = advanceNarrativeProjectSimulation(startedProject(), 7).project;
		const serialized = serializeNarrativeRuntimeSnapshot(source);
		const target = {...source, activeStoryExecutions: []};
		const restored = restoreNarrativeRuntimeSnapshotJson(target, serialized);

		expect(restored.status).toBe('restored');
		expect(restored.project.activeStoryExecutions).toEqual(
			source.activeStoryExecutions
		);
		expect(restored.project.storyNodeStateOverrides['long-scene']).toBe('active');

		const completed = advanceNarrativeProjectSimulation(restored.project, 13);
		expect(completed.project.activeStoryExecutions).toEqual([]);
		expect(completed.project.storyNodeStateOverrides['long-scene']).toBe('completed');
		expect(completed.storyExecutionTraces).toHaveLength(1);
	});

	test('project repository keeps active execution in runtime projection', () => {
		const source = startedProject();
		const repository = createLocalStorageNarrativeProjectRepository(
			source.hostStoryId,
			source.name,
			ninetyThreeDaysTemplate
		);
		repository.save(source);
		const loaded = repository.load();

		expect(loaded.activeStoryExecutions).toEqual(source.activeStoryExecutions);
		expect(loaded.storyNodes).toEqual(source.storyNodes);
	});

	test('pre-A42 v1 runtime snapshot without active executions remains readable', () => {
		const source = startedProject();
		const current = createNarrativeRuntimeSnapshot(source);
		const runtime = {...current.runtime} as Omit<
			typeof current.runtime,
			'activeStoryExecutions'
		> & {
			activeStoryExecutions?: typeof current.runtime.activeStoryExecutions;
		};
		delete runtime.activeStoryExecutions;
		const restored = restoreNarrativeRuntimeSnapshot(
			{...source, activeStoryExecutions: []},
			{...current, runtime}
		);

		expect(restored.status).toBe('restored');
		expect(restored.project.activeStoryExecutions).toEqual([]);
	});

	test('malformed active execution makes a runtime snapshot fail safely', () => {
		const source = startedProject();
		const snapshot = createNarrativeRuntimeSnapshot(source) as any;
		snapshot.runtime.activeStoryExecutions = [{id: 'broken'}];
		const restored = restoreNarrativeRuntimeSnapshot(source, snapshot);

		expect(restored.status).toBe('rejected');
		expect(restored.reason).toBe('invalid-runtime');
		expect(restored.project).toBe(source);
	});
});
