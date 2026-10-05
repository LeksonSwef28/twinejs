import {
	appendNarrativeRuntimeOccurrence,
	applyStoryNodeStateOverride,
	effectiveRuntimeStoryNodes,
	narrativeRuntimeOccurrenceIsValid
} from '../runtime-story';

describe('A41 runtime Story state', () => {
	test('projects runtime activation state without mutating authored Story definitions', () => {
		const authored = [
			{
				id: 'story-a',
				kind: 'event' as const,
				title: 'A',
				participantIds: [],
				activationState: 'available' as const
			}
		];
		const authoredBefore = JSON.stringify(authored);
		const overrides = applyStoryNodeStateOverride({}, 'story-a', 'completed');
		const runtime = effectiveRuntimeStoryNodes(authored, overrides);

		expect(runtime[0].activationState).toBe('completed');
		expect(JSON.stringify(authored)).toBe(authoredBefore);
		expect(authored[0].activationState).toBe('available');
	});

	test('appends deterministic occurrence ids and preserves exact provenance', () => {
		const first = appendNarrativeRuntimeOccurrence([], {
			type: 'move-outcome',
			storyNodeId: 'story-a',
			moveId: 'move-a',
			outcomeId: 'outcome-a',
			effectIds: ['effect-b', 'effect-a'],
			moment: {day: 4, minuteOfDay: 620}
		});
		const second = appendNarrativeRuntimeOccurrence(first.history, {
			type: 'move-outcome',
			storyNodeId: 'story-a',
			moveId: 'move-a',
			outcomeId: 'outcome-a',
			effectIds: ['effect-b', 'effect-a'],
			moment: {day: 4, minuteOfDay: 620}
		});

		expect(first.occurrence.id).toBe(
			'occurrence:move-a:outcome-a:4:620:1'
		);
		expect(second.occurrence.id).toBe(
			'occurrence:move-a:outcome-a:4:620:2'
		);
		expect(second.occurrence.effectIds).toEqual(['effect-b', 'effect-a']);
		expect(second.history).toHaveLength(2);
		expect(narrativeRuntimeOccurrenceIsValid(second.occurrence)).toBe(true);
	});

	test('rejects malformed occurrence moments and effect ids', () => {
		expect(
			narrativeRuntimeOccurrenceIsValid({
				id: 'bad',
				type: 'move-outcome',
				storyNodeId: 'story-a',
				moveId: 'move-a',
				outcomeId: 'outcome-a',
				effectIds: ['ok', 3],
				moment: {day: 0, minuteOfDay: 1600}
			})
		).toBe(false);
	});
});
