import {NarrativeSimulationState} from '../project';
import {
	scheduledStoryWork,
	simulationKernelAbsoluteMinute,
	stepNarrativeSimulation,
	tickNarrativeSimulation
} from '../simulation-kernel';
import {StoryNodeDefinition} from '../story';

function simulation(
	patch: Partial<NarrativeSimulationState> = {}
): NarrativeSimulationState {
	return {
		day: 1,
		minuteOfDay: 0,
		activeBehaviorProfileByCharacter: {},
		actualLocationByCharacter: {},
		characterKnowledge: [],
		bodyByCharacter: {},
		...patch,
		bodyByCharacter: patch.bodyByCharacter ?? {}
	};
}

describe('A37 simulation kernel', () => {
	test('advances the canonical Simulation Playhead across midnight', () => {
		const result = stepNarrativeSimulation(
			simulation({day: 1, minuteOfDay: 23 * 60 + 58}),
			5,
			93
		);

		expect(result.state.day).toBe(2);
		expect(result.state.minuteOfDay).toBe(3);
		expect(result.trace).toMatchObject({
			from: {day: 1, minuteOfDay: 1438},
			to: {day: 2, minuteOfDay: 3},
			requestedMinutes: 5,
			appliedMinutes: 5,
			clampedAtProjectEnd: false,
			actualPresenceChanged: false
		});
	});

	test('clamps progression at the final project minute with an explicit trace', () => {
		const result = stepNarrativeSimulation(
			simulation({day: 93, minuteOfDay: 1437}),
			10,
			93
		);

		expect(result.state.day).toBe(93);
		expect(result.state.minuteOfDay).toBe(1439);
		expect(result.trace.appliedMinutes).toBe(2);
		expect(result.trace.clampedAtProjectEnd).toBe(true);
	});

	test('returns due work in deterministic time/id order without executing it', () => {
		const initial = simulation({
			day: 2,
			minuteOfDay: 100,
			activeBehaviorProfileByCharacter: {katya: 'school'},
			actualLocationByCharacter: {katya: 'home'}
		});
		const result = stepNarrativeSimulation(initial, 30, 93, [
			{id: 'b', moment: {day: 2, minuteOfDay: 110}, kind: 'story-node'},
			{id: 'c', moment: {day: 2, minuteOfDay: 120}, kind: 'reaction-check'},
			{id: 'a', moment: {day: 2, minuteOfDay: 110}, kind: 'story-node'},
			{id: 'past', moment: {day: 2, minuteOfDay: 90}, kind: 'story-node'}
		]);

		expect(result.dueWork.map(work => work.id)).toEqual(['a', 'b', 'c']);
		expect(result.trace.dueWorkIds).toEqual(['a', 'b', 'c']);
		expect(result.state.actualLocationByCharacter).toEqual({katya: 'home'});
		expect(result.state.activeBehaviorProfileByCharacter).toEqual({katya: 'school'});
		expect(initial.actualLocationByCharacter).toEqual({katya: 'home'});
	});

	test('turns only exact Story placements into scheduled work and does not imply presence', () => {
		const nodes: StoryNodeDefinition[] = [
			{
				id: 'station-meeting',
				kind: 'event',
				title: 'Встреча',
				participantIds: ['katya'],
				placement: {day: 4, minuteOfDay: 600, locationId: 'station'},
				activationState: 'available'
			},
			{
				id: 'date-only',
				kind: 'beat',
				title: 'Черновик',
				participantIds: [],
				placement: {day: 4},
				activationState: 'draft'
			}
		];
		const work = scheduledStoryWork(nodes);

		expect(work).toEqual([
			{
				id: 'story-node:station-meeting',
				moment: {day: 4, minuteOfDay: 600},
				kind: 'story-node',
				sourceEntityId: 'station-meeting'
			}
		]);

		const result = stepNarrativeSimulation(
			simulation({
				day: 4,
				minuteOfDay: 590,
				actualLocationByCharacter: {katya: 'park'}
			}),
			20,
			93,
			work
		);
		expect(result.dueWork[0].sourceEntityId).toBe('station-meeting');
		expect(result.state.actualLocationByCharacter.katya).toBe('park');
	});

	test('tick is exactly one minute and zero-minute steps do not replay current work', () => {
		const current = simulation({day: 7, minuteOfDay: 300});
		const work = [
			{id: 'now', moment: {day: 7, minuteOfDay: 300}, kind: 'story-node'},
			{id: 'next', moment: {day: 7, minuteOfDay: 301}, kind: 'story-node'}
		];

		const zero = stepNarrativeSimulation(current, 0, 93, work);
		expect(zero.dueWork).toEqual([]);
		expect(zero.state).toEqual(current);

		const tick = tickNarrativeSimulation(current, 93, work);
		expect(tick.state.minuteOfDay).toBe(301);
		expect(tick.dueWork.map(item => item.id)).toEqual(['next']);
	});

	test('uses canonical absolute-minute math and rejects backwards stepping', () => {
		expect(simulationKernelAbsoluteMinute({day: 2, minuteOfDay: 5})).toBe(
			24 * 60 + 5
		);
		expect(() => stepNarrativeSimulation(simulation(), -1, 93)).toThrow(
			'deltaMinutes must be a non-negative integer'
		);
	});
});
