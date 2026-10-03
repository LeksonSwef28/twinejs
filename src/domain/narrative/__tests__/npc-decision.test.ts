import {
	NpcDecisionOpportunityEvaluation,
	selectNpcDecisionAction
} from '../npc-decision';

function evaluation(
	id: string,
	priority: number,
	score: number,	overrides: Partial<NpcDecisionOpportunityEvaluation['candidateRuntime'][string]> = {}
): NpcDecisionOpportunityEvaluation {
	const candidateId = `${id}:candidate`;
	const moveId = `${id}:move`;
	return {
		opportunity: {
			id,
			characterId: 'npc',
			reactionSetId: `${id}:set`,
			source: {type: 'reaction-set'},
			priority,
			budgetMinutes: 10,
			actionPolicyByMoveId: {[moveId]: {timeCostMinutes: 5}}
		},
		reactionEvaluation: {
			setId: `${id}:set`,
			reactingCharacterId: 'npc',
			candidates: [
				{
					candidateId,
					moveId,
					valence: 'neutral',
					availability: 'available',
					baseScore: score,
					score,
					guardTraces: [],
					considerationTraces: []
				}
			]
		},
		candidateRuntime: {
			[candidateId]: {
				moveId,
				actorCharacterId: 'npc',
				timeCostMinutes: 5,
				mayInterruptScheduleIntent: true,
				hasScheduleIntent: false,
				hasConflictingActiveExecution: false,
				fitsProjectTime: true,
				...overrides
			}
		}
	};
}

describe('A43 NPC decision selector', () => {
	test('selects by opportunity priority, then score, then stable ids', () => {
		const selected = selectNpcDecisionAction([
			evaluation('low-priority', 1, 100),
			evaluation('high-priority', 5, 1)
		]);
		expect(selected.selectedOpportunityId).toBe('high-priority');
		expect(selected.randomnessUsed).toBe(false);
	});

	test('uses explicit random draw only for an exact top tie', () => {
		const deterministic = selectNpcDecisionAction([
			evaluation('a', 2, 4),
			evaluation('b', 2, 4)
		]);
		expect(deterministic.selectedOpportunityId).toBe('a');

		const injected = selectNpcDecisionAction(
			[evaluation('a', 2, 4), evaluation('b', 2, 4)],
			0.75
		);
		expect(injected.selectedOpportunityId).toBe('b');
		expect(injected.randomnessUsed).toBe(true);
		expect(injected.randomDraw).toBe(0.75);
	});

	test('rejects hidden or invalid randomness', () => {
		expect(() => selectNpcDecisionAction([evaluation('a', 0, 0)], 1)).toThrow(
			'randomDraw'
		);
		expect(() => selectNpcDecisionAction([evaluation('a', 0, 0)], -0.01)).toThrow(
			'randomDraw'
		);
	});

	test('explains budget, schedule and active-execution blockers', () => {
		const budget = evaluation('budget', 0, 10, {timeCostMinutes: 11});
		const schedule = evaluation('schedule', 0, 9, {
			hasScheduleIntent: true,
			mayInterruptScheduleIntent: false
		});
		const busy = evaluation('busy', 0, 8, {
			hasConflictingActiveExecution: true
		});
		const selection = selectNpcDecisionAction([budget, schedule, busy]);
		expect(selection.selectedMoveId).toBeUndefined();
		expect(
			selection.candidateTraces.flatMap(trace => trace.blockers.map(blocker => blocker.code))
		).toEqual(
			expect.arrayContaining([
				'budget-exceeded',
				'schedule-intent-conflict',
				'active-execution-conflict'
			])
		);
	});

	test('blocks actor mismatch and project-end overflow', () => {
		const mismatch = evaluation('mismatch', 0, 3, {actorCharacterId: 'other'});
		const end = evaluation('end', 0, 2, {fitsProjectTime: false});
		const selection = selectNpcDecisionAction([mismatch, end]);
		expect(selection.selectedCandidateId).toBeUndefined();
		expect(selection.candidateTraces[0].blockers.length).toBeGreaterThan(0);
	});
});
