import {minutesPerDay} from '../../../domain/narrative/calendar';
import {MemoryTrace} from '../../../domain/narrative/cognition';
import {
	evaluateReactionCandidateSet,
	ReactionCandidateSetDefinition
} from '../../../domain/narrative/reaction';
import {scheduledStoryWork} from '../../../domain/narrative/simulation-kernel';
import {routineWindowForDay} from '../../../domain/narrative/world-time';
import {
	restoreNarrativeRuntimeSnapshotJson,
	serializeNarrativeRuntimeSnapshot
} from '../../../store/narrative-project/runtime-snapshot';
import {advanceNarrativeProjectSimulation} from '../simulation';
import {
	createNinetyThreeDayScaleFixture,
	scaleFixtureCharacterCount,
	scaleFixtureDayCount,
	scaleFixtureStorySlotsPerDay
} from '../test-fixtures/scale-fixture';

jest.setTimeout(15000);

const generousCiBudgetMs = 3000;

function utf8ByteLength(value: string) {
	let bytes = 0;
	for (const character of value) {
		const codePoint = character.codePointAt(0) ?? 0;
		bytes +=
			codePoint <= 0x7f
				? 1
				: codePoint <= 0x7ff
					? 2
					: codePoint <= 0xffff
						? 3
						: 4;
	}
	return bytes;
}

function scaleMemories(count: number): MemoryTrace[] {
	return Array.from({length: count}, (_, index) => ({
		id: `memory-${index}`,
		characterId: `character-${index % scaleFixtureCharacterCount}`,
		summary: `Воспоминание ${index}`,
		createdAtDay: (index % scaleFixtureDayCount) + 1,
		createdAtMinute: (index * 17) % minutesPerDay,
		importance: 0.6,
		baseStrength: 0.72,
		tags: [`tag-${index % 25}`, index % 7 === 0 ? 'important' : 'ordinary'],
		relatedEntityIds: [`character-${(index + 1) % scaleFixtureCharacterCount}`]
	}));
}

describe('A45 93-day scale and performance gates', () => {
	test('a complete-summer long step matches deterministic daily batching', () => {
		const source = createNinetyThreeDayScaleFixture();
		const startAbsolute =
			(source.simulation.day - 1) * minutesPerDay + source.simulation.minuteOfDay;
		const finalAbsolute = source.template.dayCount * minutesPerDay - 1;
		const totalDelta = finalAbsolute - startAbsolute;

		const longStep = advanceNarrativeProjectSimulation(source, totalDelta);
		let batchedProject = source;
		let remaining = totalDelta;
		const batchedDueIds: string[] = [];
		while (remaining > 0) {
			const requested = Math.min(minutesPerDay, remaining);
			const batch = advanceNarrativeProjectSimulation(batchedProject, requested);
			batchedDueIds.push(...batch.dueWork.map(work => work.id));
			batchedProject = batch.project;
			remaining -= batch.trace.appliedMinutes;
		}

		expect(batchedProject.simulation.day).toBe(longStep.project.simulation.day);
		expect(batchedProject.simulation.minuteOfDay).toBe(
			longStep.project.simulation.minuteOfDay
		);
		expect(batchedDueIds).toEqual(longStep.dueWork.map(work => work.id));
		expect(batchedProject.storyNodes).toBe(source.storyNodes);
		expect(batchedProject.storyConnections).toBe(source.storyConnections);

		const longBody = longStep.project.simulation.bodyByCharacter['character-0'];
		const batchedBody = batchedProject.simulation.bodyByCharacter['character-0'];
		expect(batchedBody.fatigue).toBeCloseTo(longBody.fatigue, 8);
		expect(batchedBody.sleepDebtMinutes).toBeCloseTo(
			longBody.sleepDebtMinutes,
			8
		);
		expect(batchedBody.satiety).toBeCloseTo(longBody.satiety, 8);
	});

	test('large Story and scheduled-character fixtures stay within coarse CI gates', () => {
		const project = createNinetyThreeDayScaleFixture();
		const started = Date.now();
		const work = scheduledStoryWork(project.storyNodes);
		let routineWindowCount = 0;
		for (const rule of project.routineRules) {
			for (let day = 1; day <= project.template.dayCount; day++) {
				if (
					routineWindowForDay(
						rule,
						day,
						project.template.periods,
						project.template.day1Weekday
					)
				) {
					routineWindowCount++;
				}
			}
		}
		const elapsed = Date.now() - started;

		expect(project.storyNodes).toHaveLength(
			scaleFixtureDayCount * scaleFixtureStorySlotsPerDay
		);
		expect(project.storyConnections).toHaveLength(project.storyNodes.length - 1);
		expect(work).toHaveLength(project.storyNodes.length);
		expect(routineWindowCount).toBe(
			scaleFixtureCharacterCount * scaleFixtureDayCount
		);
		expect(elapsed).toBeLessThan(generousCiBudgetMs);
	});

	test('memory-aware reaction ranking stays inside the regression budget', () => {
		const memories = scaleMemories(3000);
		const candidateCount = 80;
		const set: ReactionCandidateSetDefinition = {
			id: 'a45-reaction-set',
			storyNodeId: 'a45-scene',
			reactingCharacterId: 'character-0',
			candidates: Array.from({length: candidateCount}, (_, index) => ({
				id: `candidate-${index.toString().padStart(3, '0')}`,
				moveId: `move-${index.toString().padStart(3, '0')}`,
				valence: 'neutral' as const,
				baseScore: index % 5,
				guards: [],
				considerations: [
					{
						id: `memory-consideration-${index}`,
						type: 'memory-tag' as const,
						tag: `tag-${index % 25}`,
						minimumSalience: 0.01,
						weight: 1
					}
				]
			}))
		};

		const started = Date.now();
		const result = evaluateReactionCandidateSet(set, {
			characterKnowledge: [],
			itemInstances: [],
			relationships: [],
			storyNodes: [],
			actualLocationByCharacter: {},
			mindStates: [],
			memories,
			memoryMoment: {day: 93, minuteOfDay: 20 * 60}
		});
		const elapsed = Date.now() - started;

		expect(result.candidates).toHaveLength(candidateCount);
		expect(result.candidates[0].availability).toBe('available');
		expect(elapsed).toBeLessThan(generousCiBudgetMs);
	});

	test('runtime snapshot remains bounded and restores a dense runtime payload', () => {
		const project = createNinetyThreeDayScaleFixture();
		project.memories = scaleMemories(3000);
		project.mindStates = project.characters.map(character => ({
			characterId: character.id,
			mood: 'neutral',
			activeMemoryIds: [],
			pendingReactionIds: []
		}));
		project.relationships = project.characters.slice(1).map(character => ({
			fromCharacterId: 'character-0',
			toCharacterId: character.id,
			values: {trust: 0, warmth: 0}
		}));

		const serialized = serializeNarrativeRuntimeSnapshot(project);
		const sizeBytes = utf8ByteLength(serialized);
		const started = Date.now();
		const restored = restoreNarrativeRuntimeSnapshotJson(project, serialized);
		const elapsed = Date.now() - started;

		expect(sizeBytes).toBeLessThan(3 * 1024 * 1024);
		expect(restored.status).toBe('restored');
		expect(restored.project.memories).toHaveLength(3000);
		expect(restored.project.storyNodes).toBe(project.storyNodes);
		expect(restored.project.storyConnections).toBe(project.storyConnections);
		expect(elapsed).toBeLessThan(generousCiBudgetMs);
	});
});
