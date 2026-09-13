import {narrativeProjectSchemaVersion} from '../../../domain/narrative/project';
import {createNarrativeProject} from '../../../domain/narrative/project-factory';
import {ninetyThreeDaysTemplate} from '../../../domain/narrative/templates/93-days';
import {
	isNarrativeProjectPersistenceEnvelope,
	narrativeProjectPersistenceFormat,
	projectNarrativePersistence
} from '../persistence-projection';
import {createLocalStorageNarrativeProjectRepository} from '../repository';

const hostStoryId = 'projection-split';
const storageKey = `twine:narrative-project:v${narrativeProjectSchemaVersion}:${hostStoryId}`;

describe('A35 persistence projections', () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	test('persists authored, editor and runtime state in separate physical sections', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Projection split',
			ninetyThreeDaysTemplate
		);
		project.storyNodes = [
			{
				id: 'story-a',
				kind: 'event',
				title: 'Story A',
				participantIds: [],
				activationState: 'draft'
			}
		];
		project.editor.selectedDay = 7;
		project.simulation.day = 4;
		project.memories = [
			{
				id: 'memory-a',
				characterId: 'katya',
				summary: 'Помнит разговор.',
				createdAtDay: 2,
				createdAtMinute: 600,
				importance: 0.8,
				baseStrength: 0.7,
				tags: ['conversation'],
				relatedEntityIds: ['story-a']
			}
		];

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Projection split',
			ninetyThreeDaysTemplate
		);
		repository.save(project);

		const raw = JSON.parse(window.localStorage.getItem(storageKey)!);
		expect(raw.format).toBe(narrativeProjectPersistenceFormat);
		expect(raw.authored.storyNodes).toEqual(project.storyNodes);
		expect(raw.authored.editor).toBeUndefined();
		expect(raw.authored.simulation).toBeUndefined();
		expect(raw.authored.memories).toBeUndefined();
		expect(raw.editor.selectedDay).toBe(7);
		expect(raw.runtime.simulation.day).toBe(4);
		expect(raw.runtime.memories).toHaveLength(1);
	});

	test('loads legacy flat schema-v2 data and rewrites it into the projection envelope', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Legacy flat v2',
			ninetyThreeDaysTemplate
		);
		project.editor.selectedDay = 9;
		project.simulation.day = 3;
		window.localStorage.setItem(storageKey, JSON.stringify(project));

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Legacy flat v2',
			ninetyThreeDaysTemplate
		);
		const loaded = repository.load();

		expect(loaded.projectId).toBe(project.projectId);
		expect(loaded.editor.selectedDay).toBe(9);
		expect(loaded.simulation.day).toBe(3);
		const rewritten = JSON.parse(window.localStorage.getItem(storageKey)!);
		expect(isNarrativeProjectPersistenceEnvelope(rewritten)).toBe(true);
	});

	test('rejects malformed runtime collections without discarding authored data', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Runtime validation',
			ninetyThreeDaysTemplate
		);
		project.storyNodes = [
			{
				id: 'authored-story',
				kind: 'event',
				title: 'Сохранённая история',
				participantIds: [],
				activationState: 'draft'
			}
		];
		const envelope = projectNarrativePersistence(project) as any;
		envelope.runtime.memories = [{id: 'broken-memory'}];
		envelope.runtime.relationships = [{fromCharacterId: 'a'}];
		envelope.runtime.pendingReactions = [{id: 'broken-reaction'}];
		envelope.runtime.mindStates = [{characterId: 'katya'}];
		envelope.runtime.simulation = {
			day: 0,
			minuteOfDay: 9000,
			activeBehaviorProfileByCharacter: {katya: 123},
			actualLocationByCharacter: {katya: false},
			characterKnowledge: [{id: 'broken-knowledge'}]
		};
		window.localStorage.setItem(storageKey, JSON.stringify(envelope));

		const repository = createLocalStorageNarrativeProjectRepository(
			hostStoryId,
			'Runtime validation',
			ninetyThreeDaysTemplate
		);
		const loaded = repository.load();
		const fresh = createNarrativeProject(
			hostStoryId,
			'Runtime validation',
			ninetyThreeDaysTemplate
		);

		expect(loaded.storyNodes[0].id).toBe('authored-story');
		expect(loaded.memories).toEqual([]);
		expect(loaded.relationships).toEqual([]);
		expect(loaded.pendingReactions).toEqual([]);
		expect(loaded.mindStates).toEqual([]);
		expect(loaded.simulation.day).toBe(fresh.simulation.day);
		expect(loaded.simulation.minuteOfDay).toBe(fresh.simulation.minuteOfDay);
		expect(loaded.simulation.activeBehaviorProfileByCharacter).toEqual({});
		expect(loaded.simulation.actualLocationByCharacter).toEqual({});
		expect(loaded.simulation.characterKnowledge).toEqual([]);
	});

	test('runtime projection changes do not alter the authored projection', () => {
		const project = createNarrativeProject(
			hostStoryId,
			'Runtime isolation',
			ninetyThreeDaysTemplate
		);
		project.storyNodes = [
			{
				id: 'story-stable',
				kind: 'event',
				title: 'Стабильная история',
				participantIds: [],
				activationState: 'draft'
			}
		];
		const envelope = projectNarrativePersistence(project);
		const authoredBefore = JSON.stringify(envelope.authored);

		envelope.runtime.memories = [];
		envelope.runtime.simulation = {
			...envelope.runtime.simulation,
			day: 22,
			minuteOfDay: 1234
		};

		expect(JSON.stringify(envelope.authored)).toBe(authoredBefore);
		expect(envelope.authored.storyNodes[0].id).toBe('story-stable');
	});
});
