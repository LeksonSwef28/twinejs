import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	createLocalStorageNarrativeRuntimeSnapshotRepository,
	createNarrativeRuntimeSnapshot,
	narrativeRuntimeSnapshotFormat,
	restoreNarrativeRuntimeSnapshot,
	restoreNarrativeRuntimeSnapshotJson,
	serializeNarrativeRuntimeSnapshot
} from '../runtime-snapshot';

const hostStoryId = 'runtime-snapshot-story';

function projectWithRuntime() {
	const project = createNarrativeProject(
		hostStoryId,
		'Runtime snapshot',
		ninetyThreeDaysTemplate
	);
	project.storyNodes = [
		{
			id: 'story-authored',
			kind: 'event',
			title: 'Авторское событие',
			participantIds: ['katya'],
			activationState: 'draft'
		}
	];
	project.editor.selectedDay = 8;
	project.memories = [
		{
			id: 'memory:katya:station',
			characterId: 'katya',
			summary: 'Помнит встречу на станции.',
			createdAtDay: 3,
			createdAtMinute: 615,
			importance: 0.9,
			baseStrength: 0.8,
			tags: ['station', 'meeting'],
			relatedEntityIds: ['story-authored'],
			source: {type: 'story-node', storyNodeId: 'story-authored'},
			reinforcementCount: 1,
			lastReinforcedAtDay: 4,
			lastReinforcedAtMinute: 700
		}
	];
	project.relationships = [
		{
			fromCharacterId: 'katya',
			toCharacterId: 'andrey',
			values: {trust: 2, warmth: 1}
		}
	];
	project.pendingReactions = [
		{
			id: 'pending-1',
			characterId: 'katya',
			reactionType: 'reply',
			priority: 4,
			conditions: ['memory:station']
		}
	];
	project.mindStates = [
		{
			characterId: 'katya',
			mood: 'hopeful',
			activeMemoryIds: ['memory:katya:station'],
			pendingReactionIds: ['pending-1']
		}
	];
	project.simulation = {
		day: 12,
		minuteOfDay: 755,
		activeBehaviorProfileByCharacter: {katya: 'school-day'},
		actualLocationByCharacter: {katya: 'station'},
		characterKnowledge: [
			{
				id: 'knowledge:katya:claim-a',
				characterId: 'katya',
				claimId: 'claim-a',
				attitude: 'believes',
				confidence: 0.7,
				source: {type: 'told', sourceCharacterId: 'andrey'},
				learnedAt: {day: 4, minuteOfDay: 620},
				lastReinforcedAt: {day: 5, minuteOfDay: 700},
				timesHeard: 2
			}
		],
		bodyByCharacter: {
			katya: {
				characterId: 'katya',
				fatigue: 0.8,
				sleepDebtMinutes: 90,
				satiety: 0.35,
				digestionRemainingMinutes: 12,
				sleepRemainingMinutes: 0
			}
		}
	};
	return project;
}

function withoutRuntime(source: ReturnType<typeof projectWithRuntime>) {
	const initial = createNarrativeProject(
		hostStoryId,
		source.name,
		ninetyThreeDaysTemplate
	);
	return {
		...source,
		memories: [],
		relationships: [],
		pendingReactions: [],
		mindStates: [],
		simulation: initial.simulation
	};
}

describe('A36/A38 runtime snapshots', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('round-trips runtime deterministically without changing authored/editor data', () => {
		const source = projectWithRuntime();
		const serialized = serializeNarrativeRuntimeSnapshot(source);
		const target = withoutRuntime(source);
		const authoredBefore = JSON.stringify(target.storyNodes);
		const editorBefore = JSON.stringify(target.editor);

		const restored = restoreNarrativeRuntimeSnapshotJson(target, serialized);

		expect(restored.status).toBe('restored');
		expect(restored.project.memories).toEqual(source.memories);
		expect(restored.project.relationships).toEqual(source.relationships);
		expect(restored.project.pendingReactions).toEqual(source.pendingReactions);
		expect(restored.project.mindStates).toEqual(source.mindStates);
		expect(restored.project.simulation).toEqual(source.simulation);
		expect(JSON.stringify(restored.project.storyNodes)).toBe(authoredBefore);
		expect(JSON.stringify(restored.project.editor)).toBe(editorBefore);
		expect(serializeNarrativeRuntimeSnapshot(restored.project)).toBe(serialized);
	});

	test('saves and resumes time, cognition, body and actual world presence from localStorage', () => {
		const source = projectWithRuntime();
		const repository = createLocalStorageNarrativeRuntimeSnapshotRepository(
			source.projectId
		);
		repository.save(source);

		const restored = repository.load(withoutRuntime(source));
		expect(restored.status).toBe('restored');
		expect(restored.project.simulation.day).toBe(12);
		expect(restored.project.simulation.minuteOfDay).toBe(755);
		expect(restored.project.simulation.actualLocationByCharacter.katya).toBe(
			'station'
		);
		expect(restored.project.simulation.characterKnowledge[0].claimId).toBe(
			'claim-a'
		);
		expect(restored.project.simulation.bodyByCharacter.katya.sleepDebtMinutes).toBe(
			90
		);
		expect(restored.project.memories[0].id).toBe('memory:katya:station');

		repository.clear();
		expect(repository.load(withoutRuntime(source)).status).toBe('missing');
	});

	test('migrates the explicit legacy v0 runtime shape to v1', () => {
		const source = projectWithRuntime();
		const current = createNarrativeRuntimeSnapshot(source);
		const legacy = {
			format: narrativeRuntimeSnapshotFormat,
			version: 0,
			projectId: current.projectId,
			hostStoryId: current.hostStoryId,
			state: current.runtime
		};

		const restored = restoreNarrativeRuntimeSnapshot(withoutRuntime(source), legacy);
		expect(restored.status).toBe('migrated');
		expect(restored.migratedFromVersion).toBe(0);
		expect(restored.project.simulation).toEqual(source.simulation);
		expect(restored.project.memories).toEqual(source.memories);
	});

	test('accepts pre-A38 v1 snapshots without body state and fills an empty body map', () => {
		const source = projectWithRuntime();
		const current = createNarrativeRuntimeSnapshot(source);
		const simulation = {...current.runtime.simulation} as typeof current.runtime.simulation & {
			bodyByCharacter?: typeof current.runtime.simulation.bodyByCharacter;
		};
		delete simulation.bodyByCharacter;
		const oldV1 = {
			...current,
			runtime: {...current.runtime, simulation}
		};

		const restored = restoreNarrativeRuntimeSnapshot(withoutRuntime(source), oldV1);
		expect(restored.status).toBe('restored');
		expect(restored.project.simulation.bodyByCharacter).toEqual({});
	});

	test('rejects invalid or partial runtime data without touching the project', () => {
		const project = projectWithRuntime();
		const partial = {
			format: narrativeRuntimeSnapshotFormat,
			version: 1,
			projectId: project.projectId,
			hostStoryId: project.hostStoryId,
			runtime: {simulation: {day: 12}}
		};

		const rejected = restoreNarrativeRuntimeSnapshot(project, partial);
		expect(rejected.status).toBe('rejected');
		expect(rejected.reason).toBe('invalid-runtime');
		expect(rejected.project).toBe(project);
		expect(rejected.project.storyNodes[0].id).toBe('story-authored');

		const invalidJson = restoreNarrativeRuntimeSnapshotJson(project, '{broken');
		expect(invalidJson.status).toBe('rejected');
		expect(invalidJson.project).toBe(project);
	});

	test('rejects a valid snapshot belonging to another project', () => {
		const source = projectWithRuntime();
		const snapshot = createNarrativeRuntimeSnapshot(source);
		const target = {...withoutRuntime(source), projectId: 'another-project'};

		const restored = restoreNarrativeRuntimeSnapshot(target, snapshot);
		expect(restored.status).toBe('rejected');
		expect(restored.reason).toBe('identity-mismatch');
		expect(restored.project).toBe(target);
	});
});
