import {MemoryTrace} from '../cognition';
import {
	createOrReinforceMemory,
	memorySalienceAt,
	salientMemoriesForCharacter
} from '../memory';

describe('Memory foundation and salience', () => {
	test('creates then reinforces one stable MemoryTrace without duplicating it', () => {
		const first = createOrReinforceMemory([], {
			id: 'memory-effect:katya',
			characterId: 'katya',
			summary: 'Андрей соврал про ключ.',
			importance: 0.8,
			baseStrength: 0.7,
			tags: ['lie', 'key'],
			relatedEntityIds: ['move-lie', 'claim-key'],
			source: {type: 'narrative-move', moveId: 'move-lie', outcomeId: 'failure'},
			moment: {day: 10, minuteOfDay: 600}
		});
		const reinforced = createOrReinforceMemory(first.memories, {
			id: 'memory-effect:katya',
			characterId: 'katya',
			summary: 'Андрей соврал про ключ.',
			importance: 0.8,
			baseStrength: 0.7,
			tags: ['betrayal'],
			relatedEntityIds: ['move-lie'],
			source: {type: 'narrative-move', moveId: 'move-lie', outcomeId: 'failure'},
			moment: {day: 12, minuteOfDay: 720}
		});

		expect(first.created).toBe(true);
		expect(reinforced.created).toBe(false);
		expect(reinforced.memories).toHaveLength(1);
		expect(reinforced.memory.reinforcementCount).toBe(1);
		expect(reinforced.memory.lastReinforcedAtDay).toBe(12);
		expect(reinforced.memory.tags).toEqual(
			expect.arrayContaining(['lie', 'key', 'betrayal'])
		);
		expect(first.memories[0].reinforcementCount).toBe(0);
	});

	test('salience decays with age but does not delete or rewrite the memory', () => {
		const memory: MemoryTrace = {
			id: 'memory-a',
			characterId: 'katya',
			summary: 'Важный разговор',
			createdAtDay: 1,
			createdAtMinute: 600,
			importance: 0.4,
			baseStrength: 1,
			tags: ['conversation'],
			relatedEntityIds: ['story-a'],
			source: {type: 'story-node', storyNodeId: 'story-a'},
			reinforcementCount: 0
		};
		const early = memorySalienceAt(memory, {day: 1, minuteOfDay: 600});
		const later = memorySalienceAt(memory, {day: 22, minuteOfDay: 600});

		expect(early.salience).toBeGreaterThan(later.salience);
		expect(later.decayedStrength).toBeLessThan(early.decayedStrength);
		expect(memory.createdAtDay).toBe(1);
		expect(memory.relatedEntityIds).toEqual(['story-a']);
	});

	test('reinforcement raises current salience and resets the recency anchor', () => {
		const base: MemoryTrace = {
			id: 'memory-a',
			characterId: 'katya',
			summary: 'Ссора',
			createdAtDay: 1,
			createdAtMinute: 600,
			importance: 0.5,
			baseStrength: 0.8,
			tags: ['conflict'],
			relatedEntityIds: [],
			reinforcementCount: 0
		};
		const reinforced: MemoryTrace = {
			...base,
			reinforcementCount: 3,
			lastReinforcedAtDay: 20,
			lastReinforcedAtMinute: 600
		};
		const moment = {day: 21, minuteOfDay: 600};

		expect(memorySalienceAt(reinforced, moment).salience).toBeGreaterThan(
			memorySalienceAt(base, moment).salience
		);
	});

	test('salient memory query filters per character without destroying weak history', () => {
		const memories: MemoryTrace[] = [
			{
				id: 'recent',
				characterId: 'katya',
				summary: 'Недавнее',
				createdAtDay: 30,
				createdAtMinute: 600,
				importance: 0.8,
				baseStrength: 0.9,
				tags: [],
				relatedEntityIds: []
			},
			{
				id: 'old',
				characterId: 'katya',
				summary: 'Старое',
				createdAtDay: 1,
				createdAtMinute: 600,
				importance: 0.05,
				baseStrength: 0.1,
				tags: [],
				relatedEntityIds: []
			},
			{
				id: 'other',
				characterId: 'andrey',
				summary: 'Чужое',
				createdAtDay: 30,
				createdAtMinute: 600,
				importance: 1,
				baseStrength: 1,
				tags: [],
				relatedEntityIds: []
			}
		];
		const result = salientMemoriesForCharacter(
			memories,
			'katya',
			{day: 31, minuteOfDay: 600},
			0.25
		);

		expect(result.map(item => item.memory.id)).toEqual(['recent']);
		expect(memories).toHaveLength(3);
	});
});
